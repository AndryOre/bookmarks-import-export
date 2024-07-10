import { ExportBookmarksButton, ImportBookmarksButton } from "~components"

import "~style.css"

function IndexPopup() {
  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-px-5 plasmo-py-4 plasmo-w-56 plasmo-gap-3">
      <h1 className="plasmo-font-bold plasmo-text-base plasmo-text-center">
        Bookmarks Exporter
      </h1>
      <div className="plasmo-flex plasmo-justify-center plasmo-flex-col plasmo-gap-2">
        <ExportBookmarksButton />
        <ImportBookmarksButton />
      </div>
    </div>
  )
}

export default IndexPopup
