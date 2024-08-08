/**
 * This file contains the background script for the Bookmark Import/Export extension.
 * It handles the extension installation, update, and opens a welcome page on first install.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Bookmark Import/Export extension installed")

    // Open the welcome page
    chrome.tabs.create({ url: "tabs/welcome.html" })
  } else if (details.reason === "update") {
    console.log(
      `Bookmark Import/Export extension updated to version ${chrome.runtime.getManifest().version}`
    )
  }
})
