"use server"

import OpenAI from "openai"
import { ActionState } from "@/types"
import { 
  emissionFactorMatchingSystemPrompt, 
  generateEmissionFactorMatchingUserPrompt 
} from "@/lib/prompts"

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface EmissionFactorMatch {
  EmissionFactorCode: string;
  EmissionFactorName: string;
}

export interface MatchEmissionFactorsRequest {
  headers: string[];
  headerDescriptions: Record<string, string>;
  rows: Record<string, any>[];
  customExamples?: {
    rowData: string;
    EmissionFactorCode: string;
    EmissionFactorName: string;
  }[];
}

/**
 * Server action to match emission factors using OpenAI
 * 
 * @param data The data containing headers, descriptions and rows to process
 * @returns ActionState containing the matched emission factors
 */
export async function matchEmissionFactorsAction(
  data: MatchEmissionFactorsRequest 
): Promise<ActionState<EmissionFactorMatch[]>> {
  try {
    const { headers, headerDescriptions, rows, customExamples } = data;
    
    // Format the header descriptions for the prompt
    const headerInfoText = headers
      .map(header => `${header}: ${headerDescriptions[header] || 'No description provided'}`)
      .join("\n");
    
    // Format row data for the prompt
    const rowDataText = rows.map((row, index) => {
      return `Row ${index + 1}: ${headers
        .map(header => `${header}: ${row[header] || 'N/A'}`)
        .join(", ")}`;
    }).join("\n");
    
    // Use the imported prompts
    const systemMessage = emissionFactorMatchingSystemPrompt;
    const userMessage = generateEmissionFactorMatchingUserPrompt(
      headerInfoText,
      rowDataText,
      rows.length,
      customExamples // Pass custom examples if available
    );
    
    // Call OpenAI API with o3-mini model
    const response = await openai.chat.completions.create({
      model: "o3-mini-2025-01-31",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      reasoning_effort: "medium",
      response_format: { 
        type: "json_object"
      }
    });
    
    // Check for refusal
    if (response.choices[0].message.refusal) {
      console.error("Model refused to generate response:", response.choices[0].message.refusal);
      return {
        isSuccess: false,
        message: "The model refused to process this request. This might be due to content policy restrictions."
      };
    }
    
    // Check finish reason
    if (response.choices[0].finish_reason === "length") {
      return {
        isSuccess: false,
        message: "The response was truncated due to length constraints. Try processing fewer rows at once."
      };
    }

    if (response.choices[0].finish_reason === "content_filter") {
      return {
        isSuccess: false,
        message: "The response was filtered due to content policy. Try adjusting your input data."
      };
    }
    
    // Extract and parse the response
    const responseContent = response.choices[0]?.message?.content || "";
    
    try {
      const parsedResponse = JSON.parse(responseContent);
      
      // Ensure parsedResponse is an object
      if (!parsedResponse || typeof parsedResponse !== 'object') {
        console.error("Invalid response format - not an object:", responseContent);
        return {
          isSuccess: false,
          message: "Failed to parse response: invalid format"
        };
      }
      
      // Extract matches array from the response
      let matches: EmissionFactorMatch[];
      
      // Check different possible response formats
      if (parsedResponse.matches && Array.isArray(parsedResponse.matches)) {
        matches = parsedResponse.matches;
      } else if (parsedResponse.results && Array.isArray(parsedResponse.results)) {
        matches = parsedResponse.results;
      } else if (Array.isArray(parsedResponse)) {
        // If the response itself is an array
        matches = parsedResponse;
      } else {
        // Last resort: try to find any array in the response
        const arrayKey = Object.keys(parsedResponse).find(key => 
          Array.isArray(parsedResponse[key]) && 
          parsedResponse[key].length > 0
        );
        
        if (arrayKey) {
          matches = parsedResponse[arrayKey];
        } else {
          console.error("Could not find matches array in response:", parsedResponse);
          return {
            isSuccess: false,
            message: "Failed to find matches in the response"
          };
        }
      }
      
      // Ensure we have matches for each row
      if (matches.length === 0) {
        console.error("Empty matches array in response");
        return {
          isSuccess: false,
          message: "No matches returned in the response"
        };
      }
      
      if (matches.length < rows.length) {
        console.warn(`Received fewer matches (${matches.length}) than rows (${rows.length})`);
        // Pad the array with placeholders
        const placeholders = Array(rows.length - matches.length).fill({
          EmissionFactorCode: "MISSING",
          EmissionFactorName: "Match not provided"
        });
        matches = [...matches, ...placeholders];
      } else if (matches.length > rows.length) {
        console.warn(`Received more matches (${matches.length}) than rows (${rows.length})`);
        // Truncate extra matches
        matches = matches.slice(0, rows.length);
      }
      
      // Validate and standardize the structure of each match
      matches = matches.map((match, index) => {
        // Use any type to handle different possible response formats
        const matchAny = match as any;
        
        // Ensure we have the expected properties, or provide fallbacks
        const code = matchAny.EmissionFactorCode || 
                     matchAny.code || 
                     matchAny.factorCode || 
                     "UNKNOWN";
                     
        const name = matchAny.EmissionFactorName || 
                     matchAny.name || 
                     matchAny.factorName || 
                     "Unknown emission factor";
        
        return {
          EmissionFactorCode: code,
          EmissionFactorName: name
        };
      });
      
      return {
        isSuccess: true,
        message: "Successfully matched emission factors",
        data: matches
      };
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      console.error("Raw response:", responseContent);
      return {
        isSuccess: false,
        message: "Failed to parse the API response"
      };
    }
  } catch (error) {
    console.error("Error in matchEmissionFactorsAction:", error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to match emission factors"
    };
  }
} 