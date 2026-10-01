# Share web fonts across origins

Large icon fonts, emoji fonts, and fonts with extensive Unicode coverage are downloaded across an enormous number of unrelated sites every day, even though most visitors already hold an identical copy from some other site that referenced the same font. The Cross-Origin Storage (COS) API reaches CSS through a new `cross-origin-storage()` request-url-modifier, used alongside the existing `integrity()` modifier inside an `@font-face` `src: url(...)` descriptor. This is the recommended path for shared web fonts, since the imperative JavaScript API is not a natural fit for resources referenced purely from CSS.

## How to implement

1. **Get the font's integrity hash.** `cross-origin-storage()` always pairs with `integrity()`; the integrity hash is what identifies the font file in COS.
2. **Add `cross-origin-storage()` to the `url()`.** Place it alongside `integrity()` inside the same `url()` function in the `src` descriptor.
3. **Choose the sharing scope.** Pick it from the font's real distribution, as described in the "Sharing scope" section.
4. **List the COS-enhanced source first, with a plain fallback after it.** `src` is a prioritized list; a browser uses the first alternative it can parse and load. Putting the plain `url()` first would mean it is always used and the COS-enhanced source is never tried.

## Example code

```css
@font-face {
  font-family: 'Shared Emoji Font';
  src:
    /* MANDATORY: List the COS-enhanced source first, then the plain fallback. */
    url('/fonts/shared-emoji.woff2' integrity('sha256-example-only-hash') cross-origin-storage(*)) format('woff2'),
    url('/fonts/shared-emoji.woff2') format('woff2');
}
```

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

- **DO** keep the plain fallback `url()` pointing at the font's real, working network location, since a COS lookup that doesn't succeed falls back to fetching from that URL exactly like ordinary `integrity`-checked font loads do.
- **DO NOT** confuse the HTML `crossoriginstorage` attribute with the unrelated `crossorigin` attribute. `crossorigin` sets the CORS request mode, and both can coexist on the same element.
- **DO NOT** confuse the CSS `cross-origin-storage()` modifier with the unrelated CSS `cross-origin()` modifier, which also sets the CORS request mode.

## Fallback strategy

Cross-Origin Storage (COS) is being implemented in Chromium and is not yet natively supported by any major browser. Until it ships, the Cross-Origin Storage browser extension adds it to Chrome and other Chromium-based browsers (from the Chrome Web Store), Firefox on desktop and Android (from Firefox Add-ons), and Safari on macOS, iOS, and iPadOS (from the App Store). The extension supports the literal syntax of the `navigator.crossOriginStorage` API, the HTML `crossoriginstorage` attribute, and the CSS `cross-origin-storage()` modifier. It does not support the literal `crossOriginStorage` import attribute, since import attribute syntax can't be polyfilled.

CSS's forgiving handling of comma-separated values means a browser that doesn't recognize `cross-origin-storage()`/`integrity()` drops only that one list item, not the whole declaration, so a plain fallback `url()` listed afterward still applies. No extra feature detection is required in CSS; the fallback source is always present as a later item in the same `src` list.
