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
    // Check if all rows have a selected factor
    const allFactorsSelected = Object.values(selectedFactors).every(
      factor => factor !== null
    )

    if (!allFactorsSelected) {
      setShowWarning(true)
      return
    }

    // Transform the selected factors into the expected format
    const examples: ExampleMatch[] = exampleRows.map(row => ({
      rowData: row.rowData,
      EmissionFactorCode: selectedFactors[row.rowIndex]?.code || "",
      EmissionFactorName: selectedFactors[row.rowIndex]?.name || ""
    }))

    onSubmit(examples)
  }

  // Handle dialog close attempt
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      // Trying to close the dialog
      const allFactorsSelected = Object.values(selectedFactors).every(
        factor => factor !== null
      )

      if (!allFactorsSelected) {
        setShowWarning(true)
        // Don't allow closing the dialog if examples are not matched
        return
      }

      // If all factors are selected, allow dialog to close and call onClose
      onClose()
    }
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
  const allMatched = matchedCount === exampleRows.length

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Provide Example Matches (Required)</DialogTitle>
          <DialogDescription>
            You must match all sample rows with appropriate emission factors.
            These examples are required and will help improve the AI's accuracy
            in matching the remaining rows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {showWarning && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Examples Required</AlertTitle>
              <AlertDescription>
                You must provide matches for all {exampleRows.length} examples
                before continuing.
                {matchedCount > 0
                  ? ` (${matchedCount} of ${exampleRows.length} matched so far)`
                  : ""}
              </AlertDescription>
            </Alert>
          )}

          {currentExample && (
            <div className="space-y-4 rounded-md border p-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-medium">
                  Example {currentExampleIndex + 1} of {exampleRows.length}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousExample}
                    disabled={currentExampleIndex === 0}
                  >
                    <ChevronLeft className="mr-1 size-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextExample}
                    disabled={currentExampleIndex === exampleRows.length - 1}
                  >
                    Next
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>

              {parsedRowData && (
                <div className="bg-muted grid grid-cols-2 gap-4 rounded-md p-4">
                  <div className="col-span-2 space-y-2">
                    <div className="text-sm font-semibold">
                      Row {currentExample.rowIndex + 1}
                    </div>
                    {Object.entries(parsedRowData)
                      .filter(([key]) => key !== "raw") // Exclude the raw field
                      .map(([key, value], index) => (
                        <div key={index} className="grid grid-cols-3 gap-2">
                          <div className="text-sm font-medium">{key}:</div>
                          <div className="col-span-2 break-words text-sm">
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
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <div className="text-muted-foreground text-sm">
              {matchedCount} of {exampleRows.length} examples matched
              {!allMatched && (
                <span className="font-medium text-red-500">
                  {" "}
                  (all required)
                </span>
              )}
            </div>
            <Button type="button" onClick={handleSubmit} disabled={!allMatched}>
              Use These Examples
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
