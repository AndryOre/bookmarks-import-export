import { i18n } from '#i18n'
import {
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  SearchIcon,
} from 'lucide-react'
import type { RefObject } from 'react'

import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import type { CheckedState } from '@/lib/types'

interface ExportToolbarProperties {
  searchTerm: string
  onSearchChange: (value: string) => void
  searchInputReference: RefObject<HTMLInputElement | null>
  masterChecked: CheckedState
  onMasterChange: () => void
  onExpandAll: () => void
  onCollapseAll: () => void
}

/**
 * The Export page toolbar: a search field with a "/" shortcut hint, an
 * Expand all / Collapse all button group, and a master checkbox that selects
 * or clears every bookmark (indeterminate when the selection is partial).
 * @param properties The toolbar props.
 * @param properties.searchTerm The current search term.
 * @param properties.onSearchChange Called with the new term as the user types.
 * @param properties.searchInputReference Ref to the search input, so the page can focus it.
 * @param properties.masterChecked The aggregate selection state.
 * @param properties.onMasterChange Called when the master checkbox is toggled.
 * @param properties.onExpandAll Expands every folder.
 * @param properties.onCollapseAll Collapses every folder.
 * @returns The toolbar markup.
 */
export function ExportToolbar({
  searchTerm,
  onSearchChange,
  searchInputReference,
  masterChecked,
  onMasterChange,
  onExpandAll,
  onCollapseAll,
}: ExportToolbarProperties) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b p-2">
      <Checkbox
        checked={masterChecked}
        onCheckedChange={onMasterChange}
        aria-label={i18n.t('exportPage_selectAllLabel')}
      />
      <InputGroup className="min-w-40 flex-1">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          ref={searchInputReference}
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={i18n.t('searchBookmarks')}
          aria-label={i18n.t('searchBookmarks')}
          aria-keyshortcuts="/"
        />
        <InputGroupAddon align="inline-end">
          <Kbd>/</Kbd>
        </InputGroupAddon>
      </InputGroup>
      <ButtonGroup>
        <Button variant="outline" size="sm" onClick={onExpandAll}>
          <ChevronsUpDownIcon data-icon="inline-start" />
          {i18n.t('exportPage_expandAll')}
        </Button>
        <Button variant="outline" size="sm" onClick={onCollapseAll}>
          <ChevronsDownUpIcon data-icon="inline-start" />
          {i18n.t('exportPage_collapseAll')}
        </Button>
      </ButtonGroup>
    </div>
  )
}
