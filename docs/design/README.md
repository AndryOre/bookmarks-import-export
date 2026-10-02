# Design canvases

Living design canvases for this extension's UI-facing features. Each row is one
canvas — a plain single-page HTML artifact with one artboard per screen plus its
empty/error/loading states. A product area gets exactly one canvas; new screens
for the same area are appended to it rather than creating a new one.

| Canvas                | Area                                                                                                    | URL                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `App.dc.html`         | The single App: shell, sidebar, every page, popup; Snug palette, sidebar header and Welcome hero boards | https://claude.ai/artifact/AYJ4YaSAT3rG5QeBXfoKHf |
| `ImportModes.dc.html` | Import mode selection (popup + Advanced Import)                                                         | https://claude.ai/artifact/VDALZbJQZxQBfsp6GfQMsB |
| `AutoExport.dc.html`  | Auto-export status + Export now (Settings, popup)                                                       | https://claude.ai/artifact/FUY8y42Ck4yczPXwTEbEFk |

**Superseded:** `ImportModes.dc.html` (Advanced Import page, settings dialog)
and `AutoExport.dc.html` (settings-dialog tab) predate the App redesign and
describe screens that no longer exist; `App.dc.html` is the current reference
for the Import page, Auto-export page and popup.
