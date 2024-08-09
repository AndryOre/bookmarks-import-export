import logo from "data-base64:assets/icon.png"
import { Star } from "lucide-react"

import "~style.css"

interface ChangelogEntry {
  version: string
  date: string
  changes: Array<{
    description: string
    link?: {
      text: string
      url: string
    }
  }>
}

const changelog: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "August 5, 2024",
    changes: [
      {
        description:
          "Added new Advanced Export feature for more control over your bookmarks.",
        link: {
          text: "Try advanced export",
          url: "tabs/advanced-export.html"
        }
      },
      {
        description:
          "Introduced welcome and update pages to keep you informed about new features."
      },
      { description: "Improved overall performance for a smoother experience." }
    ]
  },
  {
    version: "0.1.1",
    date: "August 4, 2024",
    changes: [
      {
        description:
          "Fixed a critical bug that affected users with non-English browser languages."
      },
      {
        description:
          "Improved reliability for both import and export functions."
      }
    ]
  },
  {
    version: "0.1.0",
    date: "August 3, 2024",
    changes: [
      { description: "Initial release of Bookmark Import/Export extension." },
      {
        description:
          "Basic functionality for exporting bookmarks to HTML and JSON formats."
      },
      { description: "Simple import feature for HTML and JSON files." }
    ]
  }
]

/**
 * UpdatePage component that serves as the changelog page for updated extensions.
 * It displays a list of changes for each version of the Bookmark Import/Export extension.
 *
 * @returns {JSX.Element} Rendered UpdatePage component
 */
export default function UpdatePage(): JSX.Element {
  const currentVersion = chrome.runtime.getManifest().version

  /**
   * Renders the header section of the update page.
   * @returns {JSX.Element} Header section with logo, title, and description
   */
  const renderHeader = (): JSX.Element => (
    <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-gap-2">
      <img
        src={logo}
        alt="Bookmark Import/Export Logo"
        className="plasmo-w-24 plasmo-h-24"
      />
      <h1 className="plasmo-text-4xl plasmo-font-bold plasmo-text-center">
        Bookmark Import/Export has been updated!
      </h1>
      <p className="plasmo-text-xl plasmo-text-center">
        You're now using version {currentVersion}. Check out what's new below.
      </p>
    </div>
  )

  /**
   * Renders the feedback link.
   * @returns {JSX.Element} Feedback link with star icon
   */
  const renderFeedbackLink = (): JSX.Element => (
    <a
      href="https://chromewebstore.google.com/detail/bookmark-importexport/gdhpeilfkeeajillmcncaelnppiakjhn"
      target="_blank"
      rel="noopener noreferrer"
      className="plasmo-inline-flex plasmo-items-center plasmo-text-lg plasmo-font-medium hover:plasmo-underline">
      <Star className="plasmo-w-6 plasmo-h-6 plasmo-mr-2 plasmo-text-yellow-500" />
      Enjoying the updates? We'd love your feedback!
    </a>
  )

  /**
   * Renders a single changelog entry.
   * @param {ChangelogEntry} entry - The changelog entry to render
   * @returns {JSX.Element} Rendered changelog entry
   */
  const renderChangelogEntry = (entry: ChangelogEntry): JSX.Element => (
    <div key={entry.version} className="plasmo-mb-10">
      <h2 className="plasmo-text-3xl plasmo-font-bold plasmo-mb-4">
        Version {entry.version}
        <span className="plasmo-text-xl plasmo-font-normal plasmo-text-gray-500 plasmo-ml-3">
          {entry.date}
        </span>
      </h2>
      <ul className="plasmo-list-disc plasmo-list-outside plasmo-space-y-4 plasmo-pl-6">
        {entry.changes.map((change, index) => (
          <li key={index} className="plasmo-text-lg plasmo-leading-relaxed">
            {change.description}
            {change.link && (
              <a
                href={chrome.runtime.getURL(change.link.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="plasmo-text-primary plasmo-font-semibold plasmo-ml-2 hover:plasmo-underline">
                {change.link.text}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )

  /**
   * Renders the changelog section.
   * @returns {JSX.Element} Rendered changelog
   */
  const renderChangelog = (): JSX.Element => (
    <div className="plasmo-w-full plasmo-max-w-3xl">
      {changelog.map(renderChangelogEntry)}
    </div>
  )

  /**
   * Renders the footer with author and source code information.
   * @returns {JSX.Element} Footer section with links to author's X profile and GitHub repository
   */
  const renderFooter = (): JSX.Element => (
    <div className="plasmo-text-center plasmo-text-sm plasmo-text-muted-foreground">
      <p>
        Built by{" "}
        <a
          href="https://x.com/andryore"
          target="_blank"
          rel="noopener noreferrer"
          className="plasmo-text-primary plasmo-font-semibold plasmo-inline-flex plasmo-items-center hover:plasmo-underline">
          @AndryOre
        </a>
        . The source code is available on{" "}
        <a
          href="https://github.com/AndryOre/bookmarks-import-export"
          target="_blank"
          rel="noopener noreferrer"
          className="plasmo-text-primary plasmo-font-semibold plasmo-inline-flex plasmo-items-center hover:plasmo-underline">
          GitHub
        </a>
        .
      </p>
    </div>
  )

  return (
    <main className="plasmo-flex plasmo-p-6 plasmo-flex-col plasmo-min-h-screen plasmo-overflow-auto plasmo-items-center plasmo-justify-center plasmo-gap-6">
      {renderHeader()}
      {renderFeedbackLink()}
      {renderChangelog()}
      {renderFooter()}
    </main>
  )
}
