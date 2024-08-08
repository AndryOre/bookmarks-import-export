import logo from "data-base64:assets/icon.png"
import { BookmarkPlus, FileJson, FileText, Settings, Star } from "lucide-react"

import { Card, CardHeader, FeatureCard } from "~components"

import "~style.css"

/**
 * WelcomePage component that serves as the landing page for newly installed extensions.
 * It introduces the main features of the Bookmark Import/Export extension and provides links to social media.
 *
 * @returns {JSX.Element} Rendered WelcomePage component
 */
export default function WelcomePage(): JSX.Element {
  /**
   * Renders the header section of the welcome page.
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
        Welcome to Bookmark Import/Export
      </h1>
      <p className="plasmo-text-xl plasmo-text-center">
        Easily import and export your bookmarks across browsers!
      </p>
    </div>
  )

  /**
   * Renders the getting started card.
   * @returns {JSX.Element} Card with instructions to start using the extension
   */
  const renderGettingStarted = (): JSX.Element => (
    <Card>
      <CardHeader className="plasmo-flex plasmo-items-center plasmo-bg-secondary plasmo-text-secondary-foreground plasmo-font-semibold plasmo-text-base">
        To get started, click on the extension icon in your browser toolbar.
      </CardHeader>
    </Card>
  )

  /**
   * Renders the features section with FeatureCard components.
   * @returns {JSX.Element} Grid of feature cards and compatibility information
   */
  const renderFeatures = (): JSX.Element => (
    <div className="plasmo-grid plasmo-grid-cols-2 plasmo-gap-4">
      <FeatureCard
        icon={FileJson}
        title="Export to JSON"
        description="Export your bookmarks to JSON format for easy data manipulation and backup."
      />
      <FeatureCard
        icon={FileText}
        title="Export to HTML"
        description="Create an HTML file of your bookmarks, compatible with most browsers."
      />
      <FeatureCard
        icon={BookmarkPlus}
        title="Import Bookmarks"
        description="Easily import bookmarks from JSON or HTML files to restore or transfer your data."
      />
      <FeatureCard
        icon={Settings}
        title="Advanced Options"
        description="Fine-tune your exports with advanced settings and selective bookmark choosing."
      />
      <p className="plasmo-text-center plasmo-text-muted-foreground plasmo-col-span-2">
        Compatible with all Chromium-based browsers, including Google Chrome,
        Microsoft Edge, Opera, and Brave.
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
      <Star className="plasmo-w-5 plasmo-h-5 plasmo-mr-2 plasmo-text-yellow-500" />
      Enjoying the extension? We'd love your feedback!
    </a>
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
      {renderGettingStarted()}
      {renderFeatures()}
      {renderFeedbackLink()}
      {renderFooter()}
    </main>
  )
}
