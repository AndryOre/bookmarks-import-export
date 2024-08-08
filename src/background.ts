/**
 * This file contains the background script for the Bookmark Import/Export extension.
 * Currently, it only logs a message when the extension is installed or updated.
 * Future background processes can be added here as needed.
 */

export {}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Bookmark Import/Export extension installed")
  } else if (details.reason === "update") {
    console.log(
      `Bookmark Import/Export extension updated to version ${chrome.runtime.getManifest().version}`
    )
  }
})
