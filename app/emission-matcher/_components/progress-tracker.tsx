"use client"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface ProgressTrackerProps {
  currentBatch: number
  totalBatches: number
  processedRows: number
  totalRows: number
  className?: string
}

export function ProgressTracker({
  currentBatch,
  totalBatches,
  processedRows,
  totalRows,
  className
}: ProgressTrackerProps) {
  // Calculate progress percentage
  const percentComplete =
    totalBatches > 0 ? Math.round((currentBatch / totalBatches) * 100) : 0

  // Format row numbers with commas
  const formattedProcessedRows = processedRows.toLocaleString()
  const formattedTotalRows = totalRows.toLocaleString()

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="font-medium">Batch {currentBatch}</span> of{" "}
          {totalBatches}
        </div>
        <div>{percentComplete}% complete</div>
      </div>

      <Progress value={percentComplete} className="h-2" />

      <div className="text-muted-foreground flex justify-between text-sm">
        <div>
          Processing rows: {formattedProcessedRows} of {formattedTotalRows}
        </div>
        <div>
          {totalBatches - currentBatch}{" "}
          {totalBatches - currentBatch === 1 ? "batch" : "batches"} remaining
        </div>
      </div>
    </div>
  )
}
