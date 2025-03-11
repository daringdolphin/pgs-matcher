"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { generateExcelFile } from "@/lib/excel-utils"

interface ResultsDownloaderProps {
  results: Record<string, any>[]
  originalFileName?: string
  disabled?: boolean
  className?: string
}

export function ResultsDownloader({
  results,
  originalFileName,
  disabled = false,
  className = ""
}: ResultsDownloaderProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (results.length === 0) {
      toast.error("No results to download")
      return
    }

    try {
      setIsDownloading(true)

      // Generate filename based on original file
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const baseName = originalFileName?.split(".")[0] || "emission-factors"
      const filename = `${baseName}-matched-${timestamp}.xlsx`

      // Generate and download the Excel file
      generateExcelFile(results, filename)
      toast.success("File downloaded successfully")
    } catch (error) {
      console.error("Error downloading results:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to download results"
      )
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={disabled || isDownloading || results.length === 0}
      variant="secondary"
      className={`gap-2 ${className}`}
    >
      <Download className="size-4" />
      {isDownloading ? "Preparing..." : "Download Results"}
    </Button>
  )
}
