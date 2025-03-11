"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface ResultsPreviewProps {
  results: Record<string, any>[]
  visible?: boolean
  maxPreviewRows?: number
}

export function ResultsPreview({
  results,
  visible = true,
  maxPreviewRows = 10
}: ResultsPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  if (!results.length || !visible) {
    return null
  }

  // Determine what rows to display
  const rowsToDisplay = isExpanded
    ? results.slice(
        currentPage * maxPreviewRows,
        (currentPage + 1) * maxPreviewRows
      )
    : results.slice(0, maxPreviewRows)

  // Get all unique column names from the results
  const allColumns = new Set<string>()
  results.forEach(row => {
    Object.keys(row).forEach(key => allColumns.add(key))
  })

  // Convert to array and prioritize certain columns
  const priorityColumns = [
    "EmissionFactorCode",
    "EmissionFactorName",
    "Date",
    "Location",
    "Memo/Description",
    "Name"
  ]
  const remainingColumns = Array.from(allColumns)
    .filter(col => !priorityColumns.includes(col))
    .sort()

  const columns = [
    ...priorityColumns.filter(col => allColumns.has(col)),
    ...remainingColumns
  ]

  // Calculate pagination info
  const totalPages = isExpanded ? Math.ceil(results.length / maxPreviewRows) : 1

  // Toggle expanded view
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
    setCurrentPage(0) // Reset to first page when toggling
  }

  // Format cell content based on type
  const formatCellContent = (value: any): string => {
    if (value === undefined || value === null) return ""

    if (typeof value === "string") {
      // Format dates that look like dates
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        return value // Already in correct format
      }
    }

    return String(value)
  }

  return (
    <Card className="mt-6">
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Results Preview</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleExpanded}
            className="gap-2"
          >
            {isExpanded ? (
              <>
                <EyeOff className="size-4" />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <Eye className="size-4" />
                <span>Show More</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Table with horizontal scrolling */}
        <div className="rounded-md border">
          {/* This overflow-auto is critical for horizontal scrolling */}
          <div className="overflow-auto">
            <Table className="w-auto min-w-full">
              <TableHeader>
                <TableRow>
                  {columns.map(column => (
                    <TableHead
                      key={column}
                      className="bg-muted/50 whitespace-nowrap px-4 py-3 text-sm font-medium"
                    >
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsToDisplay.map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    className={rowIndex % 2 === 0 ? "bg-white" : "bg-muted/20"}
                  >
                    {columns.map(column => {
                      const value = row[column]
                      const formattedValue = formatCellContent(value)

                      // Determine column width strategy based on column type
                      const columnWidth =
                        column === "Name" || column === "Memo/Description"
                          ? "min-w-[200px]"
                          : "min-w-[120px]"

                      return (
                        <TableCell
                          key={`${rowIndex}-${column}`}
                          className={cn(
                            "px-4 py-3 align-middle",
                            column === "EmissionFactorCode"
                              ? "font-medium"
                              : "",
                            columnWidth
                          )}
                        >
                          {value !== undefined ? (
                            <div className="w-full" title={formattedValue}>
                              {formattedValue || (
                                <span className="text-muted-foreground italic">
                                  Empty
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">
                              N/A
                            </span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {isExpanded && totalPages > 1 && (
          <div className="flex items-center justify-between p-4">
            <div className="text-muted-foreground text-sm">
              Showing {currentPage * maxPreviewRows + 1}-
              {Math.min((currentPage + 1) * maxPreviewRows, results.length)} of{" "}
              {results.length} results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
                }
                disabled={currentPage === totalPages - 1}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
