# Avoid redundant large asset downloads

Large shared assets such as AI model weights, Wasm modules, game engine cores, or fully-bundled JavaScript libraries are often identical across many unrelated sites. Without a shared cache, each origin downloads and stores its own copy, even when the visitor's browser already holds the exact same bytes from a different site. The Cross-Origin Storage (COS) API, exposed via `navigator.crossOriginStorage`, lets origins store and retrieve such files by content hash instead of by URL, so one on-device copy can serve every site that needs it.

## How to implement

1. **Compute the asset's hash when you build or publish your site.** Hash the exact bytes of the large asset you serve (for example, a model file, a Wasm binary, or a third-party library such as three.js) with `crypto.subtle.digest()`, and include the result as a lowercase hex string in your built code. The hash is what identifies the file in COS, and computing it on page load would require downloading the file first.
2. **Feature-detect before use, then fall back immediately if it's absent.** Check `navigator.crossOriginStorage?.requestFileHandle` once up front. If COS isn't implemented in this browser, skip straight to a normal network fetch.
3. **Once support is confirmed, still call every method defensively.** Wrap each COS call in `try`/`catch`, as described in the "Handle rejections" section.
4. **Check COS before fetching from the network.** Call `requestFileHandle(hash)` first. If it resolves, read the file with `handle.getFile()` and skip the network entirely.
5. **Fall back to the network on any rejection.** A `NotFoundError` is a cache miss that never proves the file is absent.
6. **Store what you fetch.** After a network fetch, request a writable handle with `{ create: true }`, write the complete file, and close the stream, so the next origin that asks for the same hash can skip the download.
7. **Choose the `origins` scope deliberately.** Pick it from the resource's real distribution, as described in the "Sharing scope" section.

## Example code

At build time, compute the hash once and inline it into your code:

```javascript
// build-hash.js (Node.js)
import { readFile } from 'node:fs/promises';

const bytes = await readFile('dist/assets/shared-library.js');
const digest = await crypto.subtle.digest('SHA-256', bytes);
const hex = Array.from(new Uint8Array(digest), (byte) =>
  byte.toString(16).padStart(2, '0'),
).join('');
```

At runtime, load every large shared asset through one reusable helper that looks the file up by that hash:

```javascript
/**
 * Loads a large shared asset from COS when available, otherwise from the
 * network, and stores network responses in COS for the next origin.
 * @param {string} url The asset's real, working network URL.
 * @param {{algorithm: string, value: string}} hash The build-time hash.
 * @param {'*' | string[]} [origins] Sharing scope; omit for same-site only.
 * @returns {Promise<Blob>}
 */
async function loadAsset(url, hash, origins) {
  // Feature-detect once, up front, and fall back to the network
  // immediately if COS isn't implemented in this browser.
  const supportsCOS = !!navigator.crossOriginStorage?.requestFileHandle;
  // Set when Permissions Policy blocks COS in this context, since every
  // further COS call here rejects the same way.
  let blocked = false;

  if (supportsCOS) {
    try {
      // Check COS first. If another origin already stored this exact
      // hash, this resolves with no network request at all.
      const handle = await navigator.crossOriginStorage.requestFileHandle(hash);
      return await handle.getFile();
    } catch (err) {
      // A NotFoundError does not prove the file is absent from COS. Fall
      // back to the network either way; never treat it as fatal.
      blocked = err.name === 'NotAllowedError';
    }
  }

  const response = await fetch(url);
  const fileBlob = await response.blob();

  if (supportsCOS && !blocked) {
    // Write back to the cache.
    try {
      const handle = await navigator.crossOriginStorage.requestFileHandle(hash, {
        create: true,
        // Only pass `origins` when the caller chose a scope, so omitting it
        // keeps the same-site-only default.
        ...(origins && { origins }),
      });
      const writable = await handle.createWritable();
      await writable.write(fileBlob);
      await writable.close();
      // Never call getFile() on this handle before write()/close() has
      // resolved; use the blob already in hand instead.
    } catch {
      // Storing is a nice-to-have for future visitors, not required for
      // this page to work.
    }
  }

  return fileBlob;
}

const library = await loadAsset(
  '/assets/shared-library.js',
  {
    algorithm: 'SHA-256',
    // Example-only hash value; use the hex string from your build step.
    value: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
  },
  // MANDATORY: origins: '*' is only appropriate for genuinely popular,
  // non-proprietary resources.
  '*',
);
```

## Handle rejections

A browser that implements COS can still reject any call, so a passed feature-detection check never guarantees success. Fall back to the network on every rejection, and read the error name to decide what else to do:

- **`NotFoundError` from `requestFileHandle(hash)`:** an ordinary cache miss that never proves the file is absent. The file may not exist, your origin may be outside its sharing scope, a globally shared file may not be on the browser's list of popular hashes yet, or the browser may deliberately report a stored file as missing to protect privacy (GREASE'ing). Store the file after the network fetch as usual.
- **`NotAllowedError` from `requestFileHandle()`:** Permissions Policy blocks COS in this context, for example in a cross-origin iframe whose embedder didn't grant the `cross-origin-storage` feature (its default allowlist is `self`). Every further COS call in this context rejects the same way, so skip the write-back too.
- **`NotAllowedError` from `getFile()`:** you called it on a handle obtained with `{ create: true }` before your own write completed, which applies even when another origin already stored the file. Use the blob you already have.

## Sharing scope

Every Cross-Origin Storage (COS) surface takes a sharing scope that controls which origins can later retrieve the stored file. Pick the scope that matches the resource's real distribution:

- **Same-site only (default):** for resources that only your own site uses.
- **Explicit origin list:** for a small, trusted set of origins, for example proprietary assets shared between your own properties.
- **Global (`*`):** **MANDATORY:** only for genuinely popular, non-proprietary resources, such as open-weight AI models or widely used open-source libraries.

| Surface | Same-site only | Origin list | Global |
|---|---|---|---|
| `requestFileHandle()` `origins` option | Omit `origins` | Array of origin strings | `'*'` |
| HTML `crossoriginstorage` attribute | Valueless attribute | Space-separated origins | `"*"` |
| `crossOriginStorage` import attribute | Empty string (`''`) | Space-separated origins | `'*'` |
| CSS `cross-origin-storage()` modifier | No arguments | Comma-separated origin strings | `*` |

**MANDATORY:** An origin list only takes effect for origins that a `Cross-Origin-Storage-Allow-Origin` response header also names, for example `Cross-Origin-Storage-Allow-Origin: https://a.example, https://b.example`. The header comes from whoever supplies the bytes: the response of the page that calls `requestFileHandle()`, or the response of the fetched resource itself (the script, stylesheet, module, or font) for the HTML, import attribute, and CSS forms. Origins the header doesn't name are dropped, and if none remain, the file is stored with the same-site default. The same-site default and `*` need no header.

## Best practices

- **DO** write the complete file with `createWritable()` / `write()` / `close()` (or `pipeTo()`) every time you store, even if the file might already exist in COS.
- **DO** use `Promise.all()` over individual `requestFileHandle()` calls to look up several distinct hashes concurrently, since each call takes exactly one hash.

## Fallback strategy

Cross-Origin Storage (COS) is being implemented in Chromium and is not yet natively supported by any major browser. Until it ships, the Cross-Origin Storage browser extension adds it to Chrome and other Chromium-based browsers (from the Chrome Web Store), Firefox on desktop and Android (from Firefox Add-ons), and Safari on macOS, iOS, and iPadOS (from the App Store). The extension supports the literal syntax of the `navigator.crossOriginStorage` API, the HTML `crossoriginstorage` attribute, and the CSS `cross-origin-storage()` modifier. It does not support the literal `crossOriginStorage` import attribute, since import attribute syntax can't be polyfilled.

The COS API is a progressive enhancement over a normal network fetch. Guard every access to `navigator.crossOriginStorage` with a single up-front feature-detection check, and always keep a working network-fetch path as the fallback for browsers without COS support.
