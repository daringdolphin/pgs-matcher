"use client"

import { useState, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ChevronsUpDown,
  Search
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { EmissionFactorMatch } from "@/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { EmissionFactorSearch } from "./emission-factor-search"

interface ExampleCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (examples: ExampleMatch[]) => void
  exampleRows: ExampleRow[]
  availableEmissionFactors: { code: string; name: string }[]
}

interface ExampleRow {
  rowIndex: number
  rowData: string
}

interface ParsedRowData {
  [key: string]: string
  raw: string
}

export interface ExampleMatch {
  rowData: string
  EmissionFactorCode: string
  EmissionFactorName: string
}

// Helper function to parse row data into structured format
function parseRowData(rowData: string): ParsedRowData {
  const result: ParsedRowData = { raw: rowData }

  // Split by commas and extract key-value pairs
  const pairs = rowData.split(", ")

  for (const pair of pairs) {
    const colonIndex = pair.indexOf(":")
    if (colonIndex > 0) {
      const key = pair.substring(0, colonIndex).trim()
      const value = pair.substring(colonIndex + 1).trim()
      result[key] = value
    }
  }

  return result
}

export function ExampleCollectionModal({
  isOpen,
  onClose,
  onSubmit,
  exampleRows,
  availableEmissionFactors
}: ExampleCollectionModalProps) {
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0)
  const [selectedFactors, setSelectedFactors] = useState<
    Record<number, { code: string; name: string } | null>
  >(
    exampleRows.reduce<Record<number, { code: string; name: string } | null>>(
      (acc, row) => {
        acc[row.rowIndex] = null
        return acc
      },
      {}
    )
  )
  const [showWarning, setShowWarning] = useState(false)

  // Create form schema based on the example rows
  const formSchema = z.object(
    exampleRows.reduce<Record<string, z.ZodString>>((acc, row) => {
      acc[`row_${row.rowIndex}_code`] = z.string().min(1, {
        message: "Please provide an emission factor code for this row."
      })
      return acc
    }, {})
  )

  type FormValues = z.infer<typeof formSchema>

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: exampleRows.reduce<Record<string, string>>((acc, row) => {
      acc[`row_${row.rowIndex}_code`] = ""
      return acc
    }, {})
  })

  const handleFactorSelect = (
    rowIndex: number,
    factor: { code: string; name: string }
  ) => {
    setSelectedFactors(prev => ({
      ...prev,
      [rowIndex]: factor
    }))
    setShowWarning(false)
  }

  const handleSubmit = () => {
    // Check if any rows have a selected factor
    const anyFactorsSelected = Object.values(selectedFactors).some(
      factor => factor !== null
    )

    if (!anyFactorsSelected) {
      setShowWarning(true)
      return
    }

    // Transform the selected factors into the expected format, only including matched examples
    const examples: ExampleMatch[] = exampleRows
      .filter(row => selectedFactors[row.rowIndex] !== null)
      .map(row => ({
        rowData: row.rowData,
        EmissionFactorCode: selectedFactors[row.rowIndex]?.code || "",
        EmissionFactorName: selectedFactors[row.rowIndex]?.name || ""
      }))

    onSubmit(examples)
  }

  // Handle dialog close attempt
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      // Simply close the dialog without showing warnings
      onClose()
    }
  }

  // Skip examples and close the modal
  const handleSkipExamples = () => {
    onSubmit([]) // Submit empty array for examples
  }

  // Navigation functions
  const goToPreviousExample = () => {
    setCurrentExampleIndex(prev => Math.max(0, prev - 1))
  }

  const goToNextExample = () => {
    setCurrentExampleIndex(prev => Math.min(exampleRows.length - 1, prev + 1))
  }

  // Get current example
  const currentExample = exampleRows[currentExampleIndex]

  // Parse the current example row data
  const parsedRowData = useMemo(
    () => (currentExample ? parseRowData(currentExample.rowData) : null),
    [currentExample]
  )

  // Calculate how many examples are matched
  const matchedCount = Object.values(selectedFactors).filter(
    f => f !== null
  ).length

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Provide Example Matches (Optional)</DialogTitle>
          <DialogDescription>
            Matching sample rows with appropriate emission factors will improve
            the AI's accuracy in matching your data. You can provide examples
            for some, all, or none of the rows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {showWarning && (
            <Alert variant="default" className="border-blue-200 bg-blue-50">
              <AlertCircle className="size-4 text-blue-500" />
              <AlertTitle>No Examples Selected</AlertTitle>
              <AlertDescription>
                You haven't provided any examples yet. Examples help improve
                matching accuracy. Would you like to provide at least one
                example or skip this step?
              </AlertDescription>
            </Alert>
          )}

          {currentExample && (
            <div className="space-y-4 rounded-md border p-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-medium">
                  Example {currentExampleIndex + 1} of {exampleRows.length}
                </div>
              </div>

              {parsedRowData && (
                <div className="bg-muted rounded-md p-4">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">
                      Row {currentExample.rowIndex + 1}
                    </div>
                    {Object.entries(parsedRowData)
                      .filter(([key]) => key !== "raw") // Exclude the raw field
                      .map(([key, value], index) => (
                        <div key={index} className="grid grid-cols-12 gap-2">
                          <div className="col-span-3 text-sm font-medium">
                            {key}:
                          </div>
                          <div className="col-span-9 break-words text-sm">
                            {value}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-1">
                <label className="text-sm font-medium">
                  Select Emission Factor:
                </label>

                <EmissionFactorSearch
                  availableEmissionFactors={availableEmissionFactors}
                  selectedFactor={selectedFactors[currentExample.rowIndex]}
                  onSelect={factor =>
                    handleFactorSelect(currentExample.rowIndex, factor)
                  }
                />
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousExample}
                    disabled={currentExampleIndex === 0}
                    className="w-28"
                  >
                    <ChevronLeft className="mr-1 size-4" />
                    Previous
                  </Button>

                  <div className="text-muted-foreground mx-2 text-sm">
                    {currentExampleIndex + 1} of {exampleRows.length}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextExample}
                    disabled={currentExampleIndex === exampleRows.length - 1}
                    className="w-28"
                  >
                    Next
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 flex flex-col space-y-2 border-t pt-4 sm:flex-row sm:justify-between sm:space-y-0">
            <div className="text-muted-foreground text-sm">
              {matchedCount} of {exampleRows.length} examples matched
              {matchedCount > 0 && (
                <span className="font-medium text-green-500">
                  {" "}
                  (will use matched examples only)
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkipExamples}
                className="text-gray-500"
              >
                Skip Examples
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!matchedCount}
                className="bg-green-600 hover:bg-green-700"
              >
                {matchedCount > 0 ? "Use These Examples" : "Continue"}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
