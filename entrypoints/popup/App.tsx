import { AutoExportStatusItem } from '@/components/popup/auto-export-status-item'
import { ExportSection } from '@/components/popup/export-section'
import { PopupFooter } from '@/components/popup/footer'
import { ImportSection } from '@/components/popup/import-section'
import { Separator } from '@/components/ui/separator'

export default function App() {
  return (
    <div data-testid="popup-frame" className="flex w-80 flex-col gap-3 p-3">
      <ExportSection />
      <Separator />
      <ImportSection />
      <Separator />
      <AutoExportStatusItem />
      <PopupFooter />
    </div>
  )
}
