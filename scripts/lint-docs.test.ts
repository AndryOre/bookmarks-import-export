import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

import {
  buildLycheeCacheRelativePath,
  buildLycheeDownloadUrl,
  buildLycheeLockRelativePath,
  EXPECTED_LYCHEE_ACTION_VERSION,
  LYCHEE_ARGS,
  LYCHEE_VERSION,
  resolveLycheeArch,
} from './lint-docs'

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const WORKFLOW_PATH = path.join(REPO_ROOT, '.github/workflows/lint-docs.yml')

/**
 * Splits a folded-scalar-joined argument string into tokens, treating a
 * `'single quoted'` run as one token (quotes stripped) the way a shell would
 * — mirrors how the workflow's quoting keeps `docs/**\/*.md` and
 * `.github/*.md` from being glob-expanded before lychee sees them.
 */
function tokenizeShellLikeArguments(input: string): string[] {
  const tokens: string[] = []
  const pattern = /'([^']*)'|(\S+)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(input)) !== null) {
    const token = match[1] ?? match[2]
    if (token === undefined) {
      throw new Error(
        `tokenizeShellLikeArguments: neither alternation group matched for "${match[0]}" — this should be unreachable.`,
      )
    }
    tokens.push(token)
  }
  return tokens
}

/**
 * Pulls the `lycheeverse/lychee-action`'s `args:` YAML folded scalar
 * (`>-`) out of the workflow file and tokenizes it, without depending on a
 * full YAML parser — the block's shape is simple and stable enough (a fixed
 * indentation, no nested structures) that a small anchor-based extraction is
 * both sufficient and easier to audit than a parser dependency would be.
 */
function extractLycheeArgumentsFromWorkflow(workflowYaml: string): string[] {
  const blockMatch = /args:\s*>-\s*\n([\s\S]*?)\n\s*fail:/.exec(workflowYaml)
  const capturedBlock = blockMatch?.[1]
  if (capturedBlock === undefined) {
    throw new Error(
      'lint-docs.test: could not find the lychee-action "args:" block in ' +
        `${WORKFLOW_PATH} — has the workflow's format changed?`,
    )
  }
  const joinedLines = capturedBlock
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ')
  return tokenizeShellLikeArguments(joinedLines)
}

describe('LYCHEE_ARGS parity with .github/workflows/lint-docs.yml', () => {
  test('the script args match the lychee-action args byte-for-byte', () => {
    const workflowYaml = readFileSync(WORKFLOW_PATH, 'utf8')
    expect(extractLycheeArgumentsFromWorkflow(workflowYaml)).toEqual([
      ...LYCHEE_ARGS,
    ])
  })
})

describe('resolveLycheeArch', () => {
  test('maps arm64 to the aarch64 release asset arch', () => {
    expect(resolveLycheeArch('arm64', 'linux')).toBe('aarch64')
  })

  test('maps x64 to the x86_64 release asset arch', () => {
    expect(resolveLycheeArch('x64', 'linux')).toBe('x86_64')
  })

  test('throws for an architecture lychee does not publish a Linux binary for', () => {
    expect(() => resolveLycheeArch('ia32', 'linux')).toThrow(
      /unsupported architecture/,
    )
  })

  test('throws for a non-Linux platform, regardless of arch', () => {
    expect(() => resolveLycheeArch('arm64', 'darwin')).toThrow(
      /unsupported platform/,
    )
    expect(() => resolveLycheeArch('x64', 'win32')).toThrow(
      /unsupported platform/,
    )
  })
})

describe('EXPECTED_LYCHEE_ACTION_VERSION parity with .github/workflows/lint-docs.yml', () => {
  test('the workflow still pins the lychee-action version LYCHEE_VERSION assumes', () => {
    const workflowYaml = readFileSync(WORKFLOW_PATH, 'utf8')
    const match = /uses:\s*lycheeverse\/lychee-action@\S+\s*#\s*(v[\d.]+)/.exec(
      workflowYaml,
    )
    const pinnedVersion = match?.[1]
    if (pinnedVersion === undefined) {
      throw new Error(
        'lint-docs.test: could not find the pinned lychee-action version ' +
          `comment in ${WORKFLOW_PATH} — has the workflow's format changed?`,
      )
    }
    expect(pinnedVersion).toBe(EXPECTED_LYCHEE_ACTION_VERSION)
  })
})

describe('buildLycheeDownloadUrl', () => {
  test('builds the pinned version release asset URL for an arch', () => {
    expect(buildLycheeDownloadUrl(LYCHEE_VERSION, 'x86_64')).toBe(
      `https://github.com/lycheeverse/lychee/releases/download/lychee-${LYCHEE_VERSION}/lychee-x86_64-unknown-linux-gnu.tar.gz`,
    )
  })
})

describe('buildLycheeCacheRelativePath', () => {
  test('nests the cached binary under lychee/<version>/lychee', () => {
    expect(buildLycheeCacheRelativePath('v0.24.2')).toBe(
      path.join('lychee', 'v0.24.2', 'lychee'),
    )
  })
})

describe('buildLycheeLockRelativePath', () => {
  test('is a flat name distinct from the binary cache path, one level under --git-common-dir', () => {
    expect(buildLycheeLockRelativePath('v0.24.2')).toBe('lychee-v0.24.2.lock')
  })
})
