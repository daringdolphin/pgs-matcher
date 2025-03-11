"use client"

import * as XLSX from "xlsx"
import Papa from "papaparse"

export interface ParsedFileResult {
  headers: string[]
  rows: Record<string, any>[]
  rowCount: number
}

/**
 * Checks if a file is CSV based on its extension
 */
function isCSV(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv")
}

/**
 * Checks if a file is Excel based on its extension
 */
function isExcel(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith(".xlsx") || name.endsWith(".xls")
}

/**
 * Parses a CSV file using Papaparse
 */
async function parseCSV(file: File): Promise<ParsedFileResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, any>>) => {
        // Extract headers from the first object's keys
        const headers = results.meta.fields || []

        // Ensure all data is serializable
        const serializedData = results.data.map(row => {
          const serializedRow: Record<string, any> = {}

          for (const [key, value] of Object.entries(row)) {
            // Handle potential Date objects or other non-serializable values
            if (value instanceof Date) {
              serializedRow[key] = value.toISOString()
            } else if (typeof value === "object" && value !== null) {
              // Stringify other objects
              serializedRow[key] = JSON.stringify(value)
            } else {
              serializedRow[key] = value
            }
          }

          return serializedRow
        })

        resolve({
          headers,
          rows: serializedData,
          rowCount: serializedData.length
        })
      },
      error: (error: Error, file: Papa.LocalFile) => {
        reject(new Error(`CSV parsing error: ${error.message}`))
      }
    })
  })
}

/**
 * Parses an Excel file using xlsx library
 */
async function parseExcel(file: File): Promise<ParsedFileResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = e => {
      try {
        if (!e.target?.result) {
          throw new Error("Failed to read file")
        }

        // Parse the Excel file
        const data = new Uint8Array(e.target.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })

        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Convert to JSON with headers and handle date formats
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(
          worksheet,
          {
            raw: false, // This makes dates come as strings in the standard format
            dateNF: "yyyy-mm-dd" // Optional date format if needed
          }
        )

        // Extract headers from the first object's keys
        const headers =
          rawData.length > 0 ? Object.keys(rawData[0] as object) : []

        // Ensure all data is serializable
        const jsonData = rawData.map(row => {
          const serializedRow: Record<string, any> = {}

          for (const [key, value] of Object.entries(row)) {
            // Handle potential Date objects or other non-serializable values
            if (value instanceof Date) {
              serializedRow[key] = value.toISOString()
            } else if (typeof value === "object" && value !== null) {
              // Stringify other objects
              serializedRow[key] = JSON.stringify(value)
            } else {
              serializedRow[key] = value
            }
          }

          return serializedRow
        })

        resolve({
          headers,
          rows: jsonData,
          rowCount: jsonData.length
        })
      } catch (error) {
        reject(
          new Error(
            `Excel parsing error: ${error instanceof Error ? error.message : String(error)}`
          )
        )
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Main function to parse a file (either CSV or Excel)
 * Returns headers, rows and row count
 */
export async function parseFile(file: File): Promise<ParsedFileResult> {
  if (!file) {
    throw new Error("No file provided")
  }

  if (isCSV(file)) {
    return parseCSV(file)
  } else if (isExcel(file)) {
    return parseExcel(file)
  } else {
    throw new Error(
      "Unsupported file format. Please upload a CSV or Excel file (.csv, .xlsx, .xls)"
    )
  }
}

/**
 * Converts rows of data to an Excel file and triggers download
 */
export function generateExcelFile(
  rows: Record<string, any>[],
  filename = "download.xlsx"
): void {
  // Ensure all data is properly serialized
  const processedRows = rows.map(row => {
    const processed: Record<string, any> = {}

    for (const [key, value] of Object.entries(row)) {
      // If the value is a Date, convert it to a format Excel can understand
      if (value instanceof Date) {
        processed[key] = value // XLSX library handles Date objects properly
      } else if (value === null || value === undefined) {
        processed[key] = "" // Replace null/undefined with empty string
      } else {
        processed[key] = value
      }
    }

    return processed
  })

  // Create a new workbook
  const workbook = XLSX.utils.book_new()

  // Convert rows to worksheet
  const worksheet = XLSX.utils.json_to_sheet(processedRows)

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")

  // Generate and download the file
  XLSX.writeFile(workbook, filename)
}

/**
 * Splits array into chunks of the specified size
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize))
  }
  return result
}
