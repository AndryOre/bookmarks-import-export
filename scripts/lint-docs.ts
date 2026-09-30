/**
 * Local equivalent of `.github/workflows/lint-docs.yml`'s `check-links` job,
 * which runs the upstream `lycheeverse/lychee-action` — this script drives
 * the same `lychee` binary directly instead, so `bun run lint:docs` catches
 * broken markdown links before a PR burns GitHub Actions minutes finding
 * them.
 *
 * `LYCHEE_VERSION` is pinned to `v0.24.2` because that's
 * `lycheeverse/lychee-action@v2.9.0`'s own default `lycheeVersion` (see that
 * action's `action.yml`) — the exact version the workflow actually runs.
 * Bump both together.
 *
 * The binary is cached at `<git-common-dir>/lychee/<version>/lychee`,
 * resolved via {@link resolveLockDirectory} from `./locks` (the same
 * `git rev-parse --git-common-dir` anchor point that module's locks use) so
 * every `/forge` worktree of this repo shares one download instead of each
 * one re-fetching the release archive. A cache hit never touches the network.
 *
 * `scripts/lint-docs.test.ts` parses the workflow's own `args:` block and
 * asserts it matches {@link LYCHEE_ARGS} byte-for-byte, so the two can't
 * silently drift apart — see that file for why the args stay duplicated
 * instead of moving to a shared `lychee.toml`.
 */
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { acquireLock, releaseLock, resolveLockDirectory } from './locks'

export const LYCHEE_VERSION = 'v0.24.2'

/**
 * The `lycheeverse/lychee-action` version this repo's workflow pins (the
 * `# vX.Y.Z` comment on its `uses:` line in
 * `.github/workflows/lint-docs.yml`) — `LYCHEE_VERSION` above is only a
 * correct mirror of what CI runs while the workflow stays pinned to the
 * action version whose own default `lycheeVersion` is `v0.24.2`.
 * `lint-docs.test.ts` asserts the workflow's pinned action version still
 * matches this constant, so a Renovate bump of the action fails that test
 * until someone re-checks the new action's default `lycheeVersion` and
 * updates {@link LYCHEE_VERSION} to match — otherwise `lint:docs` would keep
 * passing while silently linting with a different lychee version than CI.
 */
export const EXPECTED_LYCHEE_ACTION_VERSION = 'v2.9.0'

/**
 * Bounded wait for a sibling `/forge` worktree already downloading lychee.
 */
const LYCHEE_LOCK_TIMEOUT_MS = 60_000
const LYCHEE_LOCK_POLL_INTERVAL_MS = 500

export function buildLycheeLockRelativePath(version: string): string {
  return `lychee-${version}.lock`
}

/**
 * Byte-identical to the quoted `args:` list in
 * `.github/workflows/lint-docs.yml` — as an argv array rather than a shell
 * string, since {@link main} passes it straight to `Bun.spawn` with no shell
 * in between, so the globs (`docs/**\/*.md`, `.github/*.md`) reach lychee
 * unexpanded exactly like the workflow's quoting does.
 */
export const LYCHEE_ARGS = [
  '--offline',
  '--include-fragments=anchor-only',
  '--no-progress',
  'README.md',
  'PRIVACY_POLICY.md',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'AGENTS.md',
  'CONTEXT.md',
  'docs/**/*.md',
  '.github/*.md',
] as const

/**
 * Lychee only publishes Linux release assets for these two architectures.
 * Defaults to `process.platform`/`process.arch` but takes them as parameters
 * so it's a pure, directly testable function.
 * @param arch The Node.js architecture to map.
 * @param platform The Node.js platform to validate.
 * @returns The matching lychee release architecture string.
 */
export function resolveLycheeArch(
  arch: NodeJS.Architecture = process.arch,
  platform: NodeJS.Platform = process.platform,
): 'aarch64' | 'x86_64' {
  if (platform !== 'linux') {
    throw new Error(
      `lint-docs: unsupported platform "${platform}" — lychee's prebuilt ` +
        'release binaries are Linux-only. Install lychee manually (see ' +
        'https://github.com/lycheeverse/lychee#installation).',
    )
  }
  if (arch === 'arm64') return 'aarch64'
  if (arch === 'x64') return 'x86_64'
  throw new Error(
    `lint-docs: unsupported architecture "${arch}" — lychee only publishes ` +
      'Linux release binaries for x64 (x86_64) and arm64 (aarch64). Install ' +
      'lychee manually (see https://github.com/lycheeverse/lychee#installation).',
  )
}

export function buildLycheeDownloadUrl(version: string, arch: string): string {
  return `https://github.com/lycheeverse/lychee/releases/download/lychee-${version}/lychee-${arch}-unknown-linux-gnu.tar.gz`
}

/**
 * The `resolveLockDirectory`-relative path a cached binary lives at, split
 * out as its own pure function so `scripts/lint-docs.test.ts` can assert on
 * it without a real git invocation.
 * @param version The pinned lychee version.
 * @returns The relative cache path for that version's binary.
 */
export function buildLycheeCacheRelativePath(version: string): string {
  return path.join('lychee', version, 'lychee')
}

/**
 * Recursively finds a file literally named `lychee` under `rootDirectory`,
 * up to `maxDepth` levels deep. Lychee's own release tarballs nest the
 * binary one folder in (e.g. `lychee-x86_64-unknown-linux-gnu/lychee`) —
 * verified against the real `v0.24.2` asset — and the upstream action's own
 * install script has to do the same kind of search since that nesting isn't
 * guaranteed to stay put across releases.
 * @param rootDirectory The directory to search from.
 * @param maxDepth How many nested directory levels to descend into.
 * @returns The found binary's path, or `undefined` if none was found.
 */
function findBinaryRecursively(
  rootDirectory: string,
  maxDepth: number,
): string | undefined {
  const entries = readdirSync(rootDirectory, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(rootDirectory, entry.name)
    if (entry.isFile() && entry.name === 'lychee') return entryPath
    if (!entry.isDirectory() || maxDepth <= 0) continue
    const found = findBinaryRecursively(entryPath, maxDepth - 1)
    if (found) return found
  }
  return undefined
}

/**
 * Downloads and extracts the pinned lychee release into a temporary
 * directory, then moves just the binary into place at `destinationPath`.
 * The move is a `copyFileSync` into a sibling temp file **inside
 * `destinationPath`'s own directory**, followed by a same-directory
 * `renameSync` — `rename` is atomic within one filesystem, so a reader can
 * never observe a partially-written binary, and unlike renaming straight out
 * of the `os.tmpdir()` working directory above, a same-directory temp file is
 * guaranteed to share a filesystem with the destination (no `EXDEV`). Throws
 * with the download URL and a manual-install hint on any network or
 * archive-layout failure — a silent skip here would make `lint:docs` quietly
 * pass without ever having linted anything.
 * @param version The lychee release version to download.
 * @param destinationPath Where the extracted binary is moved to.
 * @returns Resolves once the binary is in place at `destinationPath`.
 */
async function downloadLycheeBinary(
  version: string,
  destinationPath: string,
): Promise<void> {
  const arch = resolveLycheeArch()
  const url = buildLycheeDownloadUrl(version, arch)
  const manualInstallHint = `Install lychee ${version} manually (see https://github.com/lycheeverse/lychee#installation) and place the binary at ${destinationPath}, or check your network connection and retry.`

  let response: Response
  try {
    response = await fetch(url)
  } catch (error: unknown) {
    throw new Error(
      `lint-docs: failed to download lychee from ${url}: ${error instanceof Error ? error.message : String(error)}. ${manualInstallHint}`,
    )
  }
  if (!response.ok) {
    throw new Error(
      `lint-docs: failed to download lychee from ${url} (HTTP ${response.status}). ${manualInstallHint}`,
    )
  }

  const workingDirectory = mkdtempSync(path.join(tmpdir(), 'lint-docs-lychee-'))
  try {
    const archivePath = path.join(workingDirectory, 'lychee.tar.gz')
    await Bun.write(archivePath, response)

    const extractedDirectory = path.join(workingDirectory, 'extracted')
    mkdirSync(extractedDirectory)
    const tarProcess = Bun.spawn({
      cmd: ['tar', '-xzf', archivePath, '-C', extractedDirectory],
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    const [tarExitCode, tarStderr] = await Promise.all([
      tarProcess.exited,
      new Response(tarProcess.stderr).text(),
    ])
    if (tarExitCode !== 0) {
      throw new Error(
        `lint-docs: failed to extract the lychee archive downloaded from ${url} (tar exit ${tarExitCode}): ${tarStderr}. ${manualInstallHint}`,
      )
    }

    const extractedBinaryPath = findBinaryRecursively(extractedDirectory, 2)
    if (!extractedBinaryPath) {
      throw new Error(
        `lint-docs: could not find a "lychee" binary inside the archive downloaded from ${url} — its layout may have changed. ${manualInstallHint}`,
      )
    }

    mkdirSync(path.dirname(destinationPath), { recursive: true })
    const temporaryDestinationPath = `${destinationPath}.tmp-${process.pid}-${Date.now()}`
    copyFileSync(extractedBinaryPath, temporaryDestinationPath)
    chmodSync(temporaryDestinationPath, 0o755)
    renameSync(temporaryDestinationPath, destinationPath)
  } finally {
    rmSync(workingDirectory, { recursive: true, force: true })
  }
}

/**
 * Returns the path to a locally cached, executable lychee binary —
 * downloading and extracting it first if this is the first run against this
 * `--git-common-dir`. The download itself is guarded by a directory lock
 * (same primitive `scripts/locks.ts`'s callers use) keyed on `version`, so
 * two `/forge` worktrees racing a cold cache don't `copyFileSync` into the
 * same destination concurrently — the second one to reach the lock
 * re-checks `existsSync` first and finds the first one already finished,
 * rather than downloading a second time.
 * @param version The pinned lychee version to ensure is cached.
 * @returns The cached binary's absolute path.
 */
export async function ensureLycheeBinary(version: string): Promise<string> {
  const binaryPath = await resolveLockDirectory(
    buildLycheeCacheRelativePath(version),
  )
  if (existsSync(binaryPath)) return binaryPath

  const lockDirectory = await resolveLockDirectory(
    buildLycheeLockRelativePath(version),
  )
  await acquireLock(
    lockDirectory,
    () => ({
      pid: process.pid,
      worktree: process.cwd(),
      acquiredAt: Date.now(),
    }),
    {
      timeoutMs: LYCHEE_LOCK_TIMEOUT_MS,
      pollIntervalMs: LYCHEE_LOCK_POLL_INTERVAL_MS,
      maxAgeMs: LYCHEE_LOCK_TIMEOUT_MS,
      logLabel: 'lint-docs',
    },
  )
  try {
    if (existsSync(binaryPath)) return binaryPath
    console.log(`lint-docs: lychee ${version} not cached, downloading...`)
    await downloadLycheeBinary(version, binaryPath)
    console.log(`lint-docs: cached lychee ${version} at ${binaryPath}.`)
    return binaryPath
  } finally {
    releaseLock(lockDirectory)
  }
}

async function main(): Promise<void> {
  const binaryPath = await ensureLycheeBinary(LYCHEE_VERSION)
  const extraArguments = process.argv.slice(2)
  const child = Bun.spawn({
    cmd: [binaryPath, ...LYCHEE_ARGS, ...extraArguments],
    stdio: ['inherit', 'inherit', 'inherit'],
  })
  process.exitCode = await child.exited
}

/**
 * Guarded by `import.meta.main` so `scripts/lint-docs.test.ts` can import
 * {@link resolveLycheeArch}, {@link buildLycheeDownloadUrl}, and
 * {@link buildLycheeCacheRelativePath} without triggering a real download or
 * lychee run as a side effect of that import.
 */
if (import.meta.main) {
  try {
    await main()
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
