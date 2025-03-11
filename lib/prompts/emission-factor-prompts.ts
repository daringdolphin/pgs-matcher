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
      "Product: Soybeans, Quantity: 1000 kg, Description: Raw soybeans for processing",
    EmissionFactorCode: "111110",
    EmissionFactorName: "Soybean Farming"
  },
  {
    rowData: "Product: Corn, Quantity: 2000 kg, Description: Feed corn",
    EmissionFactorCode: "111150",
    EmissionFactorName: "Corn Farming"
  },
  {
    rowData: "Product: Apples, Quantity: 500 kg, Description: Fresh apples",
    EmissionFactorCode: "111331",
    EmissionFactorName: "Apple Orchards"
  },
  {
    rowData: "Product: Rice, Quantity: 1500 kg, Description: Raw rice grain",
    EmissionFactorCode: "111160",
    EmissionFactorName: "Rice Farming"
  },
  {
    rowData: "Product: Wheat, Quantity: 3000 kg, Description: Wheat grain",
    EmissionFactorCode: "111140",
    EmissionFactorName: "Wheat Farming"
  }
]

export const emissionFactorMatchingSystemPrompt = openaiPrompt`
  You are an expert sustainability consultant specializing in emission factor matching.
  Your task is to analyze data about purchased goods and services and suggest the most appropriate 
  emission factor code and name for each row of data.
  
  You will receive:
  1. Headers with descriptions explaining what each column represents
  2. Row data that needs emission factor matching
  
  For each row, analyze the data and determine the most appropriate emission factor.
  
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

  The emission factor code must be a valid code from the list of available emission factors.
  ${JSON.stringify(availableEmissionFactors)}
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
    
    Follow these steps for each entry:
    1. Think critically about the context of the descriptions provided
    2. Consider the possible category of spending or activity
    3. Analyze any additional context like location, industry, or timeframe
    4. Match to the most appropriate emission factor from the database provided
    
    Your response MUST be formatted as JSON with a structure like:
    {
      "matches": [
        {
          "EmissionFactorCode": "561210",
          "EmissionFactorName": "Facilities Support Services",
          "reasoning": "This purchase is relating to supply of labour for cleaning and maintenance services"
        },
        ... one object for each input row ...
      ]
    }

    Here are some examples of row data and their corresponding emission factors:
    ${JSON.stringify(examples)}
    
    Ensure you have exactly ${rowCount} items in the matches array, one for each input row in the same order.
    Include a brief reasoning for each match to justify your selection.
  `
}
