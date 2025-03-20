"use client"

import { useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Play,
  RefreshCw
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

import { parseFile, chunkArray, generateExcelFile } from "@/lib/excel-utils"
import { ProgressTracker } from "./emission-matcher/_components/progress-tracker"
import { ResultsDownloader } from "./emission-matcher/_components/results-downloader"
import { ResultsPreview } from "./emission-matcher/_components/results-preview"
import {
  ExampleCollectionModal,
  ExampleMatch
} from "./emission-matcher/_components/example-collection-modal"
import {
  matchEmissionFactorsAction,
  matchEmissionFactorsParallelAction
} from "@/actions/openai-actions"
import {
  HeaderDescription,
  EmissionFactorMatch,
  ProcessingStats
} from "@/types"
import { availableEmissionFactors } from "@/lib/prompts/prompt-inputs"

const DEFAULT_BATCH_SIZE = 25

export default function EmissionMatcherPage() {
  // File and parsing state
  const [file, setFile] = useState<File | null>(null)
  const [fileData, setFileData] = useState<{
    headers: string[]
    rows: Record<string, any>[]
    rowCount: number
  } | null>(null)

  // Header description state
  const [headerDescriptions, setHeaderDescriptions] = useState<
    Record<string, string>
  >({})

  // Example collection state
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false)
  const [exampleRows, setExampleRows] = useState<
    { rowIndex: number; rowData: string }[]
  >([])
  const [userExamples, setUserExamples] = useState<ExampleMatch[] | null>(null)
  const [examplesSubmitted, setExamplesSubmitted] = useState(false)

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    currentBatch: 0,
    totalBatches: 0,
    processedRows: 0,
    totalRows: 0
  })

  // Results state
  const [matchedResults, setMatchedResults] = useState<Record<string, any>[]>(
    []
  )
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset function to clear all state and allow uploading a new file
  const handleReset = useCallback(() => {
    setFile(null)
    setFileData(null)
    setHeaderDescriptions({})
    setIsExampleModalOpen(false)
    setExampleRows([])
    setUserExamples(null)
    setExamplesSubmitted(false)
    setIsProcessing(false)
    setProcessingStats({
      currentBatch: 0,
      totalBatches: 0,
      processedRows: 0,
      totalRows: 0
    })
    setMatchedResults([])
    setIsComplete(false)
    setError(null)

    // Reset the file input element
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    if (fileInput) fileInput.value = ""

    toast.info("Reset complete. You can now upload a new file.")
  }, [])

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null)
      setExamplesSubmitted(false)
      setIsComplete(false)
      setMatchedResults([])

      if (!e.target.files || e.target.files.length === 0) {
        return
      }

      const selectedFile = e.target.files[0]
      setFile(selectedFile)

      // Parse the file
      toast.info("Parsing file, please wait...")
      const parsed = await parseFile(selectedFile)

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        toast.error("The file appears to be empty or has no valid data")
        return
      }

      setFileData(parsed)

      // Initialize header descriptions with empty strings
      const initialDescriptions = parsed.headers.reduce<Record<string, string>>(
        (acc, header) => {
          acc[header] = ""
          return acc
        },
        {}
      )
      setHeaderDescriptions(initialDescriptions)

      toast.success(`File parsed successfully: ${parsed.rowCount} rows found`)
    } catch (error) {
      console.error("Error handling file:", error)
      setError(error instanceof Error ? error.message : "Failed to parse file")
      toast.error(
        error instanceof Error ? error.message : "Failed to parse file"
      )
    }
  }

  // Handle header description change
  const handleDescriptionChange = (header: string, description: string) => {
    setHeaderDescriptions(prev => ({
      ...prev,
      [header]: description
    }))
  }

  // Generate example rows after header descriptions are provided
  const generateExampleRows = useCallback(() => {
    if (!fileData || !fileData.rows.length) {
      return
    }

    // Check if all headers have descriptions
    const missingDescriptions = Object.entries(headerDescriptions)
      .filter(([_, description]) => !description.trim())
      .map(([header]) => header)

    if (missingDescriptions.length > 0) {
      toast.error(
        `Please provide descriptions for all headers: ${missingDescriptions.join(", ")}`
      )
      return
    }

    // Get 5 random rows from the data
    const totalRows = fileData.rows.length
    const sampleSize = Math.min(5, totalRows)
    const selectedIndices = new Set<number>()

    // Ensure we get unique random indices
    while (selectedIndices.size < sampleSize) {
      const randomIndex = Math.floor(Math.random() * totalRows)
      selectedIndices.add(randomIndex)
    }

    // Format the selected rows
    const formattedExampleRows = Array.from(selectedIndices).map(index => {
      const row = fileData.rows[index]
      const rowData = fileData.headers
        .map(header => `${header}: ${row[header] || "N/A"}`)
        .join(", ")

      return {
        rowIndex: index,
        rowData
      }
    })

    setExampleRows(formattedExampleRows)
    setIsExampleModalOpen(true)
  }, [fileData, headerDescriptions])

  // Handle example submission
  const handleExampleSubmit = (examples: ExampleMatch[]) => {
    setUserExamples(examples)
    setIsExampleModalOpen(false)
    setExamplesSubmitted(true)
    toast.success(
      examples.length > 0
        ? "Example matches saved! Click 'Process Data' when you're ready to continue."
        : "Proceeding without examples. Click 'Process Data' when you're ready to continue."
    )
  }

  // Update the modal close handler to simply close the modal without warnings
  const handleModalClose = () => {
    setIsExampleModalOpen(false)
  }

  // Process the data in parallel batches
  const processData = useCallback(async () => {
    if (!fileData || !fileData.rows.length) {
      toast.error("No data to process")
      return
    }

    // Check if all headers have descriptions
    const missingDescriptions = Object.entries(headerDescriptions)
      .filter(([_, description]) => !description.trim())
      .map(([header]) => header)

    if (missingDescriptions.length > 0) {
      toast.error(
        `Please provide descriptions for all headers: ${missingDescriptions.join(", ")}`
      )
      return
    }

    // Ensure examples collection has been completed (even if no examples were provided)
    if (!examplesSubmitted) {
      toast.info("Please complete the examples step first")
      setIsExampleModalOpen(true)
      return
    }

    try {
      setIsProcessing(true)
      setIsComplete(false)
      setMatchedResults([])
      setError(null)

      // Convert rows to serializable format to avoid Date object issues
      const serializableRows = fileData.rows.map(row => {
        const serializedRow: Record<string, string | number | boolean | null> =
          {}

        // Convert each field to a serializable primitive
        for (const [key, value] of Object.entries(row)) {
          if (value instanceof Date) {
            // Convert Date objects to ISO strings
            serializedRow[key] = value.toISOString()
          } else if (value === null || value === undefined) {
            serializedRow[key] = null
          } else if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          ) {
            serializedRow[key] = value
          } else {
            // Convert any other non-primitive types to strings
            serializedRow[key] = String(value)
          }
        }

        return serializedRow
      })

      // Calculate total batches for progress tracking
      const totalBatches = Math.ceil(
        serializableRows.length / DEFAULT_BATCH_SIZE
      )

      setProcessingStats({
        currentBatch: 0,
        totalBatches,
        processedRows: 0,
        totalRows: fileData.rows.length
      })

      // Process all data in parallel batches
      const result = await matchEmissionFactorsParallelAction(
        {
          headers: fileData.headers,
          headerDescriptions,
          rows: serializableRows,
          customExamples:
            userExamples && userExamples.length > 0 ? userExamples : undefined
        },
        DEFAULT_BATCH_SIZE
      )

      if (!result.isSuccess || !result.data) {
        setError(result.message)
        toast.error(result.message)

        // Create placeholder results for all rows
        const placeholderResults = serializableRows.map(row => ({
          ...row,
          EmissionFactorCode: "ERROR",
          EmissionFactorName: `Failed: ${result.message}`
        }))

        setMatchedResults(placeholderResults)
      } else {
        // Combine the original row data with the matched emission factors
        const processedResults = serializableRows.map((row, index) => {
          const match = result.data[index] || {
            EmissionFactorCode: "ERROR",
            EmissionFactorName: "Failed to match"
          }

          return {
            ...row,
            EmissionFactorCode: match.EmissionFactorCode,
            EmissionFactorName: match.EmissionFactorName
          }
        })

        setMatchedResults(processedResults)
        toast.success("Processing complete! You can now download the results.")
      }

      // Update final stats
      setProcessingStats(prev => ({
        ...prev,
        currentBatch: prev.totalBatches,
        processedRows: fileData.rows.length
      }))

      setIsComplete(true)
      setExamplesSubmitted(false)
    } catch (error) {
      console.error("Error processing data:", error)
      setError(
        error instanceof Error ? error.message : "Failed to process data"
      )
      toast.error(
        error instanceof Error ? error.message : "Failed to process data"
      )
    } finally {
      setIsProcessing(false)
    }
  }, [fileData, headerDescriptions, userExamples, examplesSubmitted])

  return (
    <div className="container mx-auto py-10">
      <Card className="mx-auto w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl">Emission Factor Matcher</CardTitle>
          <CardDescription>
            Upload your data file to match emission factors for Purchased Goods
            and Services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="flex-1"
              />

              {(file || fileData) && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  <RefreshCw className="size-4" />
                  Start Over
                </Button>
              )}
            </div>

            {file && (
              <div className="text-muted-foreground text-sm">
                Selected file: <span className="font-medium">{file.name}</span>
                {fileData && (
                  <>
                    {" "}
                    ({fileData.rowCount} rows, {fileData.headers.length}{" "}
                    columns)
                  </>
                )}
              </div>
            )}
          </div>

          {/* Header Descriptions */}
          {fileData && (
            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-medium">Data Headers</h3>
              <p className="text-muted-foreground text-sm">
                Please provide a description for each column header to help with
                matching.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4">
                {fileData.headers.map(header => (
                  <div key={header} className="flex items-start gap-4">
                    <div className="w-1/3">
                      <Label htmlFor={`desc-${header}`} className="font-medium">
                        {header}
                      </Label>
                    </div>
                    <div className="w-2/3">
                      <Textarea
                        id={`desc-${header}`}
                        placeholder={`What does "${header}" represent?`}
                        value={headerDescriptions[header] || ""}
                        onChange={e =>
                          handleDescriptionChange(header, e.target.value)
                        }
                        className="h-20"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={generateExampleRows}
                  disabled={
                    isProcessing ||
                    Object.values(headerDescriptions).some(desc => !desc.trim())
                  }
                >
                  Continue to Examples
                </Button>
              </div>
            </div>
          )}

          {/* Example Collection Modal */}
          {exampleRows.length > 0 && (
            <ExampleCollectionModal
              isOpen={isExampleModalOpen}
              onClose={handleModalClose}
              onSubmit={handleExampleSubmit}
              exampleRows={exampleRows}
              availableEmissionFactors={Object.entries(
                availableEmissionFactors
              ).map(([code, name]) => ({
                code,
                name
              }))}
            />
          )}

          {/* Examples Submitted Notification */}
          {examplesSubmitted && !isProcessing && !isComplete && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTitle className="flex items-center gap-2 text-blue-800">
                <Play className="size-4" />
                Ready to Process
              </AlertTitle>
              <AlertDescription className="text-blue-700">
                Example matches have been saved. Click the "Process Data" button
                below when you're ready to analyze your data.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Progress Tracker */}
          {(isProcessing || processingStats.totalBatches > 0) && (
            <div className="py-4">
              <ProgressTracker
                currentBatch={processingStats.currentBatch}
                totalBatches={processingStats.totalBatches}
                processedRows={processingStats.processedRows}
                totalRows={processingStats.totalRows}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            {examplesSubmitted && !isProcessing && !isComplete ? (
              <Button
                onClick={processData}
                disabled={!fileData || isProcessing}
                className="gap-2 bg-blue-600 px-6 font-medium text-white hover:bg-blue-700"
                size="lg"
              >
                <Play className="size-5" />
                Process Data Now
              </Button>
            ) : (
              <Button
                onClick={processData}
                disabled={!fileData || isProcessing || !examplesSubmitted}
                className="gap-2"
              >
                <FileSpreadsheet className="size-4" />
                Process Data
              </Button>
            )}

            <ResultsDownloader
              results={matchedResults}
              originalFileName={file?.name}
              disabled={!isComplete || isProcessing}
            />
          </div>

          {/* Results Summary */}
          {isComplete && matchedResults.length > 0 && (
            <div className="bg-muted mt-6 rounded-md p-4">
              <h3 className="mb-2 font-medium">Processing Complete</h3>
              <p className="text-muted-foreground text-sm">
                Successfully matched {matchedResults.length} rows with emission
                factors. Click the Download button above to save your results.
              </p>
            </div>
          )}

          {/* Results Preview */}
          {isComplete && matchedResults.length > 0 && (
            <ResultsPreview results={matchedResults} visible={!isProcessing} />
          )}

          {/* New File Button */}
          {isComplete && matchedResults.length > 0 && (
            <div className="flex justify-center pt-6">
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2"
                size="lg"
              >
                <RefreshCw className="size-4" />
                Process Another File
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
