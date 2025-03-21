import { zodResolver } from "@hookform/resolvers/zod"
import logo from "data-base64:assets/icon.png"
import { Check, FolderIcon, Loader2Icon, SaveIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { useStorage } from "@plasmohq/storage/hook"

import {
  EXPORT_FORMATS,
  EXPORT_INTERVALS,
  type AutoExportConfig
} from "~common/types"
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  Checkbox,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  RadioGroup,
  RadioGroupItem,
  Separator,
  Switch,
  ThemeProvider,
  TimePicker
} from "~components"

import "~style.css"

const autoExportSchema = z
  .object({
    enabled: z.boolean(),
    interval: z
      .number()
      .refine(
        (value): value is AutoExportConfig["interval"] =>
          Object.values(EXPORT_INTERVALS).includes(value),
        "Invalid interval value"
      ),
    path: z.string().min(1, "Export path is required"),
    formats: z
      .array(z.enum(EXPORT_FORMATS))
      .min(1, "You have to select at least one format."),
    preferredTime: z
      .string()
      .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)")
  })
  .strict()

export default function AutoExportPage() {
  const [config, setConfig] = useStorage<AutoExportConfig>("autoExport", {
    enabled: false,
    interval: EXPORT_INTERVALS.DAYS_1,
    path: "bookmarks-backup/",
    formats: ["html"],
    preferredTime: "12:00"
  })

  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  const autoExportForm = useForm<z.infer<typeof autoExportSchema>>({
    resolver: zodResolver(autoExportSchema),
    defaultValues: config
  })

  useEffect(() => {
    autoExportForm.reset(config)
  }, [config])

  async function onSubmit(values: z.infer<typeof autoExportSchema>) {
    setIsSaving(true)
    setShowSaved(false)
    try {
      await setConfig({
        enabled: values.enabled,
        interval: values.interval,
        path: values.path,
        formats: values.formats,
        preferredTime: values.preferredTime
      })
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)
    } catch (error) {
      console.error("Failed to save auto-export settings:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ThemeProvider storageKey="vite-ui-theme">
      <div className="plasmo-min-h-screen plasmo-bg-background">
        <div className="plasmo-container plasmo-mx-auto plasmo-max-w-2xl plasmo-p-8">
          {/* Header */}
          <div className="plasmo-mb-8 plasmo-flex plasmo-items-center plasmo-gap-4">
            <img
              src={logo}
              alt={chrome.i18n.getMessage("extensionLogoAlt")}
              className="plasmo-w-12 plasmo-h-12"
            />
            <div className="plasmo-flex plasmo-flex-col">
              <h1 className="plasmo-text-2xl plasmo-font-bold plasmo-leading-tight plasmo-tracking-tight">
                {chrome.i18n.getMessage("extensionName")}
              </h1>
              <h2 className="plasmo-text-lg plasmo-font-medium plasmo-text-muted-foreground">
                {chrome.i18n.getMessage("autoExport")}
              </h2>
            </div>
          </div>

          {/* Main Card */}
          <Card>
            <Form {...autoExportForm}>
              <form onSubmit={autoExportForm.handleSubmit(onSubmit)}>
                <CardContent className="plasmo-pt-6 plasmo-space-y-4">
                  {/* Enable/Disable Switch */}
                  <FormField
                    control={autoExportForm.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="plasmo-flex plasmo-flex-row plasmo-items-center plasmo-justify-between">
                        <div className="plasmo-space-y-0.5">
                          <FormLabel>
                            {chrome.i18n.getMessage("enableAutoExport")}
                          </FormLabel>
                          <FormDescription>
                            Automatically export your bookmarks to HTML, JSON,
                            and CSV formats.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-label={chrome.i18n.getMessage(
                              "enableAutoExport"
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator className="plasmo-my-6" />

                  {/* Export Interval */}
                  <FormField
                    control={autoExportForm.control}
                    name="interval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className={
                            !autoExportForm.watch("enabled")
                              ? "plasmo-opacity-50"
                              : ""
                          }>
                          {chrome.i18n.getMessage("exportInterval")}
                        </FormLabel>
                        <FormDescription
                          className={
                            !autoExportForm.watch("enabled")
                              ? "plasmo-opacity-50"
                              : ""
                          }>
                          Select export interval
                        </FormDescription>
                        <FormControl>
                          <RadioGroup
                            disabled={!autoExportForm.watch("enabled")}
                            value={field.value.toString()}
                            onValueChange={(value) =>
                              field.onChange(parseInt(value))
                            }
                            className="plasmo-grid plasmo-grid-cols-2 plasmo-gap-2 group">
                            {[
                              {
                                value: EXPORT_INTERVALS.HOURS_12.toString(),
                                label: chrome.i18n.getMessage("every12Hours")
                              },
                              {
                                value: EXPORT_INTERVALS.DAYS_1.toString(),
                                label: chrome.i18n.getMessage("everyDay")
                              },
                              {
                                value: EXPORT_INTERVALS.DAYS_3.toString(),
                                label: chrome.i18n.getMessage("every3Days")
                              },
                              {
                                value: EXPORT_INTERVALS.DAYS_7.toString(),
                                label: chrome.i18n.getMessage("every7Days")
                              }
                            ].map(({ value, label }) => {
                              const radioRef = useRef<HTMLButtonElement>(null)
                              return (
                                <FormItem
                                  key={value}
                                  className={`
                                    plasmo-flex plasmo-items-center plasmo-justify-between
                                    plasmo-rounded-md plasmo-border
                                    plasmo-transition-all plasmo-duration-200 plasmo-px-2 plasmo-py-3 border-input plasmo-cursor-pointer
                                    plasmo-space-y-0
                                    group-disabled:plasmo-opacity-50
                                    ${!autoExportForm.watch("enabled") ? "plasmo-cursor-not-allowed" : ""}
                                     ${
                                       field.value.toString() === value
                                         ? "plasmo-border-ring plasmo-text-primary focus-within:plasmo-ring-ring/50 focus-within:plasmo-ring-2 plasmo-transition-[color,box-shadow]"
                                         : ""
                                     }
                                  `}>
                                  <FormLabel
                                    className={
                                      !autoExportForm.watch("enabled")
                                        ? "plasmo-opacity-50"
                                        : ""
                                    }>
                                    {label}
                                  </FormLabel>
                                  <FormControl>
                                    <RadioGroupItem
                                      ref={radioRef}
                                      value={value}
                                      className={
                                        !autoExportForm.watch("enabled")
                                          ? "plasmo-opacity-50"
                                          : ""
                                      }
                                    />
                                  </FormControl>
                                </FormItem>
                              )
                            })}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Preferred Time - Only show for intervals >= 24h */}
                  <FormField
                    control={autoExportForm.control}
                    name="preferredTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className={
                            !autoExportForm.watch("enabled") ||
                            autoExportForm.watch("interval") <
                              EXPORT_INTERVALS.DAYS_1
                              ? "plasmo-opacity-50"
                              : ""
                          }>
                          Preferred Export Time
                        </FormLabel>
                        <FormDescription
                          className={
                            !autoExportForm.watch("enabled") ||
                            autoExportForm.watch("interval") <
                              EXPORT_INTERVALS.DAYS_1
                              ? "plasmo-opacity-50"
                              : ""
                          }>
                          {autoExportForm.watch("interval") <
                          EXPORT_INTERVALS.DAYS_1
                            ? "Time selection only available for intervals of 24 hours or more"
                            : "Select your preferred time for auto exports"}
                        </FormDescription>
                        <FormControl>
                          <TimePicker
                            time={field.value}
                            setTime={field.onChange}
                            disabled={
                              !autoExportForm.watch("enabled") ||
                              autoExportForm.watch("interval") <
                                EXPORT_INTERVALS.DAYS_1
                            }
                            className={
                              !autoExportForm.watch("enabled") ||
                              autoExportForm.watch("interval") <
                                EXPORT_INTERVALS.DAYS_1
                                ? "plasmo-opacity-50"
                                : ""
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Export Path */}
                  <FormField
                    control={autoExportForm.control}
                    name="path"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className={
                            !autoExportForm.watch("enabled")
                              ? "plasmo-opacity-50"
                              : ""
                          }>
                          {chrome.i18n.getMessage("exportPath")}
                        </FormLabel>
                        <FormDescription
                          className={
                            !autoExportForm.watch("enabled")
                              ? "plasmo-opacity-50"
                              : ""
                          }>
                          {chrome.i18n.getMessage("exportPathDescription")}
                        </FormDescription>
                        <FormControl>
                          <div className="plasmo-relative">
                            <Input
                              {...field}
                              disabled={!autoExportForm.watch("enabled")}
                              className="plasmo-peer plasmo-ps-9"
                              placeholder={chrome.i18n.getMessage(
                                "exportPathPlaceholder"
                              )}
                            />
                            <div className="plasmo-pointer-events-none plasmo-absolute plasmo-inset-y-0 plasmo-start-0 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-ps-3 plasmo-text-muted-foreground/80 plasmo-peer-disabled:opacity-50">
                              <FolderIcon
                                className="plasmo-h-4 plasmo-w-4"
                                aria-hidden="true"
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Export Formats */}
                  <FormField
                    control={autoExportForm.control}
                    name="formats"
                    render={() => (
                      <FormItem>
                        <FormLabel
                          className={
                            !autoExportForm.watch("enabled")
                              ? "plasmo-opacity-50"
                              : ""
                          }>
                          {chrome.i18n.getMessage("exportFormats")}
                        </FormLabel>
                        <FormDescription
                          className={
                            !autoExportForm.watch("enabled")
                              ? "plasmo-opacity-50"
                              : ""
                          }>
                          {chrome.i18n.getMessage("exportFormatsDescription")}
                        </FormDescription>
                        <div className="plasmo-grid plasmo-grid-cols-3 plasmo-gap-2">
                          {EXPORT_FORMATS.map((format) => (
                            <FormField
                              key={format}
                              control={autoExportForm.control}
                              name="formats"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={format}
                                    className={`
                                      plasmo-flex plasmo-justify-between plasmo-items-center plasmo-rounded-md plasmo-border plasmo-border-input plasmo-outline-none
                                      plasmo-transition-all plasmo-duration-200 plasmo-px-2 plasmo-py-3 plasmo-space-y-0 plasmo-relative
                                      ${!autoExportForm.watch("enabled") ? "plasmo-cursor-not-allowed" : ""}
                                      ${
                                        field.value?.includes(format)
                                          ? "plasmo-border-ring"
                                          : ""
                                      }
                                    `}>
                                    <FormLabel
                                      className={
                                        !autoExportForm.watch("enabled")
                                          ? "plasmo-opacity-50"
                                          : ""
                                      }>
                                      {format.toUpperCase()}
                                    </FormLabel>
                                    <FormControl>
                                      <Checkbox
                                        disabled={
                                          !autoExportForm.watch("enabled")
                                        }
                                        checked={field.value?.includes(format)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([
                                                ...field.value,
                                                format
                                              ])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== format
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>

                <CardFooter>
                  <Button
                    type="submit"
                    size="lg"
                    className="plasmo-w-full"
                    disabled={isSaving}>
                    {isSaving ? (
                      <Loader2Icon className="plasmo-animate-spin" />
                    ) : showSaved ? (
                      <Check />
                    ) : (
                      <SaveIcon />
                    )}
                    {isSaving
                      ? "Saving..."
                      : showSaved
                        ? "Settings saved successfully!"
                        : chrome.i18n.getMessage("saveSettings")}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>

          {/* Footer */}
          <footer className="plasmo-mt-8 plasmo-text-center plasmo-text-sm plasmo-text-muted-foreground">
            <div className="plasmo-space-y-2">
              <p>
                {chrome.i18n.getMessage("builtBy")}{" "}
                <a
                  href="https://x.com/andryore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="plasmo-text-primary plasmo-font-semibold plasmo-inline-flex plasmo-items-center hover:plasmo-underline">
                  @AndryOre
                </a>
              </p>
              <p>
                {chrome.i18n.getMessage("sourceCode")}{" "}
                <a
                  href="https://github.com/AndryOre/bookmarks-import-export"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="plasmo-text-primary plasmo-font-semibold plasmo-inline-flex plasmo-items-center hover:plasmo-underline">
                  GitHub
                </a>{" "}
              </p>
            </div>
          </footer>
        </div>
      </div>
    </ThemeProvider>
  )
}
