/**
 * This file contains the background script for the Bookmark Import/Export extension.
 * It handles the extension installation, update, and opens appropriate pages based on the action.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log(chrome.i18n.getMessage("extensionInstalled"))

    // Open the welcome page
    chrome.tabs.create({ url: "tabs/welcome.html" })
  } else if (details.reason === "update") {
    const currentVersion = chrome.runtime.getManifest().version
    console.log(chrome.i18n.getMessage("extensionUpdated", [currentVersion]))

    // Open the update page
    chrome.tabs.create({ url: "tabs/update.html" })
  }
})
