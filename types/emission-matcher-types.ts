/*
Contains types for the emission matcher functionality.
*/

export interface HeaderDescription {
  header: string
  description: string
}

export interface EmissionFactorMatch {
  EmissionFactorCode: string
  EmissionFactorName: string
}

export interface ProcessingStats {
  currentBatch: number
  totalBatches: number
  processedRows: number
  totalRows: number
}
