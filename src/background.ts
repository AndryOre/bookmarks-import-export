import { Storage } from "@plasmohq/storage"

import { exportToCSV, exportToHTML, exportToJSON } from "~common/lib"
import type { AutoExportConfig } from "~common/types"
import { EXPORT_INTERVALS } from "~common/types"

const storage = new Storage()

const SETTINGS = {
  AUTO_EXPORT: "autoExport",
  NEXT_EXPORT_DATE: "nextExportDate"
} as const

const ALARM_NAME = "autoExportBookmarks"

function getNextExportDate(interval: number, preferredTime: string): number {
  const now = new Date()
  const [hours, minutes] = preferredTime.split(":").map(Number)
  const nextExport = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0,
    0
  )

  // If we're past today's preferred time, move to next interval
  if (now > nextExport) {
    if (interval < EXPORT_INTERVALS.DAYS_1) {
      nextExport.setTime(nextExport.getTime() + interval)
    } else {
      nextExport.setDate(nextExport.getDate() + 1)
    }
  }

  // For intervals >= 1 day, add full days
  if (interval >= EXPORT_INTERVALS.DAYS_1) {
    const intervalDays = interval / (24 * 60 * 60 * 1000)
    nextExport.setDate(nextExport.getDate() + intervalDays - 1)
  }

  return nextExport.getTime()
}

async function autoExportBookmarks() {
  try {
    const config = await storage.get<AutoExportConfig>(SETTINGS.AUTO_EXPORT)
    if (!config?.enabled) return

    const bookmarks = await chrome.bookmarks.getTree()
    const timestamp = new Date().toISOString().split("T")[0]
    const downloads = []

    if (config.formats.includes("html")) {
      const htmlContent = await exportToHTML(bookmarks)
      downloads.push(
        chrome.downloads.download({
          url: createDataUrl(htmlContent, "text/html"),
          filename: `${config.path}bookmarks-${timestamp}.html`,
          saveAs: false
        })
      )
    }

    if (config.formats.includes("json")) {
      const jsonData = await exportToJSON(bookmarks)
      downloads.push(
        chrome.downloads.download({
          url: createDataUrl(
            JSON.stringify(jsonData, null, 2),
            "application/json"
          ),
          filename: `${config.path}bookmarks-${timestamp}.json`,
          saveAs: false
        })
      )
    }

    if (config.formats.includes("csv")) {
      const csvData = await exportToCSV(bookmarks)
      downloads.push(
        chrome.downloads.download({
          url: createDataUrl(csvData, "text/csv"),
          filename: `${config.path}bookmarks-${timestamp}.csv`,
          saveAs: false
        })
      )
    }

    await Promise.all(downloads)

    const nextExportDate = getNextExportDate(
      config.interval,
      config.preferredTime
    )
    await storage.set(SETTINGS.NEXT_EXPORT_DATE, nextExportDate)

    console.log(
      "Auto export completed successfully, next export at:",
      new Date(nextExportDate).toLocaleString()
    )
  } catch (error) {
    console.error("Auto export failed:", error)
  }
}

function createDataUrl(content: string, mimeType: string): string {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`
}

async function setupAlarm() {
  const config = await storage.get<AutoExportConfig>(SETTINGS.AUTO_EXPORT)
  if (!config?.enabled) {
    chrome.alarms.clear(ALARM_NAME)
    return
  }

  const nextExportDate = getNextExportDate(
    config.interval,
    config.preferredTime
  )
  await storage.set(SETTINGS.NEXT_EXPORT_DATE, nextExportDate)

  const minutesUntilNextExport = Math.ceil(
    (nextExportDate - Date.now()) / (60 * 1000)
  )

  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: minutesUntilNextExport,
    periodInMinutes: config.interval / (60 * 1000)
  })

  console.log(
    "Next export scheduled for:",
    new Date(nextExportDate).toLocaleString()
  )
}

async function checkMissedExports() {
  const config = await storage.get<AutoExportConfig>(SETTINGS.AUTO_EXPORT)
  if (!config?.enabled) return

  const nextExportDate = await storage.get<number>(SETTINGS.NEXT_EXPORT_DATE)
  if (!nextExportDate) return

  if (Date.now() >= nextExportDate) {
    console.log("Detected missed export, running now...")
    await autoExportBookmarks()
  }
}

checkMissedExports().then(setupAlarm)

storage.watch({
  [SETTINGS.AUTO_EXPORT]: () => {
    setupAlarm()
  }
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    autoExportBookmarks()
  }
})

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log(chrome.i18n.getMessage("extensionInstalled"))
    chrome.tabs.create({ url: "tabs/welcome.html" })
  } else if (details.reason === "update") {
    const currentVersion = chrome.runtime.getManifest().version
    console.log(chrome.i18n.getMessage("extensionUpdated", [currentVersion]))
    chrome.tabs.create({ url: "tabs/update.html" })
  }
})
