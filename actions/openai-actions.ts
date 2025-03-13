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
 * Simple logger function for OpenAI requests
 */
function logOpenAIRequest(
  type: 'request' | 'response' | 'error',
  batchInfo: { batchNumber?: number, batchSize?: number, totalBatches?: number } = {},
  details?: any,
  startTime?: number
) {
  const timestamp = new Date().toISOString();
  const timeElapsed = startTime ? `(${Date.now() - startTime}ms)` : '';
  
  switch (type) {
    case 'request':
      console.log(`[${timestamp}] 🚀 OpenAI Request - Batch ${batchInfo.batchNumber}/${batchInfo.totalBatches} (${batchInfo.batchSize} rows)`);
      if (process.env.NODE_ENV === 'development' && details) {
        console.log('Request details:', {
          model: details.model,
          promptLength: details.promptLength,
          examplesCount: details.examplesCount
        });
      }
      break;
    case 'response':
      console.log(`[${timestamp}] ✅ OpenAI Response received ${timeElapsed} - Batch ${batchInfo.batchNumber}/${batchInfo.totalBatches}`);
      if (process.env.NODE_ENV === 'development' && details) {
        console.log('Response details:', {
          finishReason: details.finishReason,
          matchesCount: details.matchesCount,
          promptTokens: details.usage?.prompt_tokens,
          completionTokens: details.usage?.completion_tokens,
          totalTokens: details.usage?.total_tokens
        });
      }
      break;
    case 'error':
      console.error(`[${timestamp}] ❌ OpenAI Error ${timeElapsed} - Batch ${batchInfo.batchNumber}/${batchInfo.totalBatches}`, details);
      break;
  }
}

/**
 * Server action to match emission factors using OpenAI
 * 
 * @param data The data containing headers, descriptions and rows to process
 * @returns ActionState containing the matched emission factors
 */
export async function matchEmissionFactorsAction(
  data: MatchEmissionFactorsRequest,
  batchInfo?: { batchNumber: number, totalBatches: number }
): Promise<ActionState<EmissionFactorMatch[]>> {
  const startTime = Date.now();
  
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
    
    // Log the request
    logOpenAIRequest('request', {
      batchNumber: batchInfo?.batchNumber || 1,
      totalBatches: batchInfo?.totalBatches || 1,
      batchSize: rows.length
    }, {
      model: "o3-mini-2025-01-31",
      promptLength: systemMessage.length + userMessage.length,
      examplesCount: customExamples?.length || 0
    }, startTime);
    
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
    
    // Log the response
    logOpenAIRequest('response', {
      batchNumber: batchInfo?.batchNumber || 1,
      totalBatches: batchInfo?.totalBatches || 1
    }, {
      finishReason: response.choices[0].finish_reason,
      matchesCount: rows.length,
      usage: response.usage
    }, startTime);
    
    // Check for refusal
    if (response.choices[0].message.refusal) {
      logOpenAIRequest('error', {
        batchNumber: batchInfo?.batchNumber || 1,
        totalBatches: batchInfo?.totalBatches || 1
      }, {
        type: 'refusal',
        details: response.choices[0].message.refusal
      }, startTime);
      
      return {
        isSuccess: false,
        message: "The model refused to process this request. This might be due to content policy restrictions."
      };
    }
    
    // Check finish reason
    if (response.choices[0].finish_reason === "length") {
      logOpenAIRequest('error', {
        batchNumber: batchInfo?.batchNumber || 1,
        totalBatches: batchInfo?.totalBatches || 1
      }, {
        type: 'length_limit',
        details: 'Response truncated due to length constraints'
      }, startTime);
      
      return {
        isSuccess: false,
        message: "The response was truncated due to length constraints. Try processing fewer rows at once."
      };
    }

    if (response.choices[0].finish_reason === "content_filter") {
      logOpenAIRequest('error', {
        batchNumber: batchInfo?.batchNumber || 1,
        totalBatches: batchInfo?.totalBatches || 1
      }, {
        type: 'content_filter',
        details: 'Response filtered due to content policy'
      }, startTime);
      
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
        logOpenAIRequest('error', {
          batchNumber: batchInfo?.batchNumber || 1,
          totalBatches: batchInfo?.totalBatches || 1
        }, {
          type: 'invalid_format',
          details: 'Response is not a valid object',
          response: responseContent
        }, startTime);
        
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
          logOpenAIRequest('error', {
            batchNumber: batchInfo?.batchNumber || 1,
            totalBatches: batchInfo?.totalBatches || 1
          }, {
            type: 'no_matches',
            details: 'Could not find matches array in response',
            response: parsedResponse
          }, startTime);
          
          return {
            isSuccess: false,
            message: "Failed to find matches in the response"
          };
        }
      }
      
      // Ensure we have matches for each row
      if (matches.length === 0) {
        logOpenAIRequest('error', {
          batchNumber: batchInfo?.batchNumber || 1,
          totalBatches: batchInfo?.totalBatches || 1
        }, {
          type: 'empty_matches',
          details: 'Empty matches array in response'
        }, startTime);
        
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
      
      // Log successful completion with timing
      const totalTime = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ✨ Batch ${batchInfo?.batchNumber || 1}/${batchInfo?.totalBatches || 1} completed in ${totalTime}ms - ${matches.length} matches processed`);
      
      return {
        isSuccess: true,
        message: "Successfully matched emission factors",
        data: matches
      };
    } catch (error) {
      logOpenAIRequest('error', {
        batchNumber: batchInfo?.batchNumber || 1,
        totalBatches: batchInfo?.totalBatches || 1
      }, {
        type: 'parse_error',
        details: error,
        response: responseContent
      }, startTime);
      
      return {
        isSuccess: false,
        message: "Failed to parse the API response"
      };
    }
  } catch (error) {
    logOpenAIRequest('error', {
      batchNumber: batchInfo?.batchNumber || 1,
      totalBatches: batchInfo?.totalBatches || 1
    }, {
      type: 'general_error',
      details: error
    }, startTime);
    
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to match emission factors"
    };
  }
}

/**
 * Process multiple batches of emission factor matching requests in parallel
 */
export async function matchEmissionFactorsParallelAction(
  data: MatchEmissionFactorsRequest,
  batchSize: number = 50
): Promise<ActionState<EmissionFactorMatch[]>> {
  try {
    const { headers, headerDescriptions, rows, customExamples } = data;
    
    // Split rows into batches
    const batches: Record<string, any>[][] = [];
    for (let i = 0; i < rows.length; i += batchSize) {
      batches.push(rows.slice(i, i + batchSize));
    }
    
    const totalBatches = batches.length;
    console.log(`[${new Date().toISOString()}] 🎯 Starting parallel processing of ${totalBatches} batches`);
    
    // Process all batches in parallel
    const batchPromises = batches.map((batchRows, index) => {
      const batchData: MatchEmissionFactorsRequest = {
        headers,
        headerDescriptions,
        rows: batchRows,
        customExamples
      };
      
      return matchEmissionFactorsAction(batchData, {
        batchNumber: index + 1,
        totalBatches
      });
    });
    
    // Wait for all batches to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Check if any batch failed
    const failedBatches = batchResults.filter(result => !result.isSuccess);
    if (failedBatches.length > 0) {
      const errorMessages = failedBatches
        .map(batch => batch.message)
        .join("; ");
      
      return {
        isSuccess: false,
        message: `Failed to process ${failedBatches.length} batch(es): ${errorMessages}`
      };
    }
    
    // Combine all successful results
    const allMatches = batchResults.reduce<EmissionFactorMatch[]>(
      (acc, result) => [...acc, ...(result.data || [])],
      []
    );
    
    console.log(`[${new Date().toISOString()}] ✨ Completed parallel processing - ${allMatches.length} total matches`);
    
    return {
      isSuccess: true,
      message: `Successfully processed ${totalBatches} batches with ${allMatches.length} matches`,
      data: allMatches
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error in parallel processing:`, error);
    return {
      isSuccess: false,
      message: error instanceof Error ? error.message : "Failed to process batches in parallel"
    };
  }
} 