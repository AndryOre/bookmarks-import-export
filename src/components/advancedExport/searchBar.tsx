import { Search } from "lucide-react"
import { useCallback } from "react"

import { Input } from "~components/ui/input"

/**
 * Props for the SearchBar component
 */
interface SearchBarProps {
  /** The current search term */
  searchTerm: string
  /** Callback function to handle changes in the search term */
  onSearchChange: (term: string) => void
}

/**
 * SearchBar component for filtering bookmarks
 *
 * This component renders an input field with a search icon,
 * allowing users to enter a search term to filter bookmarks.
 *
 * @param {SearchBarProps} props - The component props
 * @returns {JSX.Element} The rendered SearchBar component
 */
export function SearchBar({
  searchTerm,
  onSearchChange
}: SearchBarProps): JSX.Element {
  /**
   * Handle changes in the input field
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value)
    },
    [onSearchChange]
  )

  return (
    <div className="plasmo-relative plasmo-flex-grow">
      <Search
        className="plasmo-absolute plasmo-left-2 plasmo-top-1/2 plasmo-transform -plasmo-translate-y-1/2 plasmo-opacity-50"
        aria-hidden="true"
      />
      <Input
        type="text"
        placeholder="Search bookmarks..."
        value={searchTerm}
        onChange={handleInputChange}
        className="plasmo-pl-9"
        aria-label="Search bookmarks"
      />
    </div>
  )
}
