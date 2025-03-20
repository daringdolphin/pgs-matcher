/**
 * Prompt templates for emission factor matching
 */
import { openaiPrompt } from "./openai-utils"
import { availableEmissionFactors } from "./prompt-inputs"
/**
 * System prompt for the emission factor matching model
 */
export const exampleEmissionFactors: {
  rowData: string
  EmissionFactorCode: string
  EmissionFactorName: string
}[] = [
  {
    rowData:
      "SUPPLY 2 CLEANERS AT DERBY ROOM TOILET ON 24/03/2024 FROM 4PM TO 10PM (PO NO. 4500014312)-CS/23753/04",
    EmissionFactorCode: "561720",
    EmissionFactorName: "Janitorial Services"
  },
  {
    rowData:
      "RENTAL OF RC SCRUBBER MACHINE FOR CROSS STREET EXCHANGE -JUN 2024 (CS/23885/06)",
    EmissionFactorCode: "532490",
    EmissionFactorName:
      "Other Commercial and Industrial Machinery and Equipment Rental and Leasing"
  },
  {
    rowData:
      "PEST CONTROL FOR GENERAL BOOKLICE AT LEVEL 17 & 20, 8 CROSS STREET (FM/39488/07)",
    EmissionFactorCode: "561710",
    EmissionFactorName: "Exterminating and Pest Control Services"
  },
  {
    rowData:
      "SECURITY SERVICES AT F1 PIT BUILDING FROM 01/08/2024 TO 15/08/2024",
    EmissionFactorCode: "561612",
    EmissionFactorName: "Security Guards and Patrol Services"
  },
  {
    rowData: "LIFT MAINTENANCE AT F1 PIT BUILDING-SEP 2024 (FM/41245/10)",
    EmissionFactorCode: "238290",
    EmissionFactorName: "Other Building Equipment Contractors"
  }
]

export const emissionFactorMatchingSystemPrompt = openaiPrompt`
  You are a sustainability expert selecting an emission factor for an activity under the purchased goods and services category.
  Your task is to analyze invoice data about purchased goods and services and categorize them to the most appropriate 
  emission factor code and name for each row of data, based on North American Industry Classification System (NAICS) classification.
  
  You will receive:
  1. Headers with descriptions explaining what each column represents
  2. Row data that needs emission factor matching
  
  For every single row, take a deep breath and think about the context of the descriptions 
  before selecting the most appropriate emission factor code and name.

  If there are vendor names provided, try to infer the type of goods or services being purchased from the name, and use that to guide your selection.

  Your response MUST be valid JSON with this structure:
  {
    "matches": [
      {
        "EmissionFactorCode": "string identifier for the emission factor",
        "EmissionFactorName": "descriptive name for the emission factor"
      },
      ...one object for each input row in the same order
    ]
  }
`

/**
 * Generates a user prompt for emission factor matching
 *
 * @param headerInfoText Formatted header information with descriptions
 * @param rowDataText Formatted row data to match
 * @param rowCount Number of rows to ensure proper response formatting
 * @param customExamples Optional custom examples provided by the user
 * @returns Formatted user prompt
 */
export function generateEmissionFactorMatchingUserPrompt(
  headerInfoText: string,
  rowDataText: string,
  rowCount: number,
  customExamples?: {
    rowData: string
    EmissionFactorCode: string
    EmissionFactorName: string
  }[]
): string {
  // Use custom examples if provided, otherwise use defaults
  const examples = customExamples || exampleEmissionFactors

  return openaiPrompt`
    === HEADER INFORMATION ===
    ${headerInfoText}
    
    === ROW DATA TO MATCH ===
    ${rowDataText}
    
    Based on this data, determine the most appropriate emission factor code and name for each row.
    
    Follow these steps for every single row of data:
    1. Think deeply about the context of the descriptions provided and try to infer what type of good or service was being purchased.
    2. See if the company or vendor name provides any clues about the type of goods or services provided
    3. Match to the most appropriate emission factor from the database provided
    
    Your response MUST be formatted as JSON with a structure like:
    {
      "matches": [
        {
          "EmissionFactorCode": "561210",
          "EmissionFactorName": "Facilities Support Services",
        },
        ... one object for each input row ...
      ]
    }

    Here are some examples of row data and their corresponding emission factors:
    ${JSON.stringify(examples)}
    
    Ensure you have exactly ${rowCount} items in the matches array, one for each input row in the same order.
  `
}
