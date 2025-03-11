/**
 * Utility functions for working with OpenAI prompts
 */

/**
 * Format a structured prompt with consistent indentation and spacing
 *
 * @param strings Raw string sections of the template literal
 * @param values Values to interpolate into the template
 * @returns Formatted prompt string with consistent indentation
 */
export function formatPrompt(
  strings: TemplateStringsArray,
  ...values: any[]
): string {
  // Combine the strings and values
  let result = ""
  for (let i = 0; i < strings.length; i++) {
    result += strings[i]
    if (i < values.length) {
      result += values[i]
    }
  }

  // Split into lines for processing
  const lines = result.split("\n")

  // Find the minimum indentation (excluding empty lines)
  let minIndent = Infinity
  for (const line of lines) {
    if (line.trim() === "") continue
    const indent = line.match(/^\s*/)?.[0].length || 0
    minIndent = Math.min(minIndent, indent)
  }

  // If we couldn't determine a minimum indent, default to 0
  if (minIndent === Infinity) minIndent = 0

  // Remove the common indentation from all lines
  const trimmedLines = lines.map(line => {
    if (line.trim() === "") return ""
    return line.substring(minIndent)
  })

  // Join the lines back together
  return trimmedLines.join("\n").trim()
}

/**
 * A tagged template literal function that formats OpenAI prompts
 * with consistent indentation and spacing
 *
 * @example
 * ```
 * const prompt = openaiPrompt`
 *   This is a prompt with
 *   consistent indentation.
 *
 *   The indentation at the start of each line
 *   will be removed.
 *
 *   Variables like ${someVar} are preserved.
 * `;
 * ```
 */
export function openaiPrompt(
  strings: TemplateStringsArray,
  ...values: any[]
): string {
  return formatPrompt(strings, ...values)
}
