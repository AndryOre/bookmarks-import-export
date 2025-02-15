import logo from "data-base64:assets/icon.png"
import { BookmarkPlus, FileJson, FileSpreadsheet, FileText, Languages, Settings, Star } from "lucide-react"

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
        alt={chrome.i18n.getMessage("extensionLogoAlt")}
        className="plasmo-w-24 plasmo-h-24"
      />
      <h1 className="plasmo-text-4xl plasmo-font-bold plasmo-text-center">
        {chrome.i18n.getMessage("welcome")}
      </h1>
      <p className="plasmo-text-xl plasmo-text-center">
        {chrome.i18n.getMessage("welcomeDescription")}
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
        {chrome.i18n.getMessage("gettingStarted")}
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
        title={chrome.i18n.getMessage("exportToJSON")}
        description={chrome.i18n.getMessage("exportToJSONDescription")}
      />
      <FeatureCard
        icon={FileText}
        title={chrome.i18n.getMessage("exportToHTML")}
        description={chrome.i18n.getMessage("exportToHTMLDescription")}
      />
      <FeatureCard
        icon={FileSpreadsheet}
        title={chrome.i18n.getMessage("exportToCSV")}
        description={chrome.i18n.getMessage("exportToCSVDescription")}
      />
      <FeatureCard
        icon={BookmarkPlus}
        title={chrome.i18n.getMessage("importBookmarks")}
        description={chrome.i18n.getMessage("importBookmarksDescription")}
      />
      <FeatureCard
        icon={Settings}
        title={chrome.i18n.getMessage("advancedOptions")}
        description={chrome.i18n.getMessage("advancedOptionsDescription")}
      />
      <FeatureCard
        icon={Languages}
        title={chrome.i18n.getMessage("multiLanguageSupport")}
        description={chrome.i18n.getMessage("multiLanguageSupportDescription")}
      />
      <p className="plasmo-text-center plasmo-text-muted-foreground plasmo-col-span-2">
        {chrome.i18n.getMessage("compatibleBrowsers")}
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
      {chrome.i18n.getMessage("feedbackLink")}
    </a>
  )

  /**
   * Renders the footer with author and source code information.
   * @returns {JSX.Element} Footer section with links to author's X profile and GitHub repository
   */
  const renderFooter = (): JSX.Element => (
    <div className="plasmo-text-center plasmo-text-sm plasmo-text-muted-foreground">
      <p>
        {chrome.i18n.getMessage("builtBy")} {" "}
        <a
          href="https://x.com/andryore"
          target="_blank"
          rel="noopener noreferrer"
          className="plasmo-text-primary plasmo-font-semibold plasmo-inline-flex plasmo-items-center hover:plasmo-underline">
          @AndryOre
        </a>
        . {chrome.i18n.getMessage("sourceCode")} {" "}
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
