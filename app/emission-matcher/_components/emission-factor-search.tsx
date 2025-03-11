import { useMemo } from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { CheckIcon, ChevronsUpDown } from "lucide-react"

interface EmissionFactorSearchProps {
  availableEmissionFactors: { code: string; name: string }[]
  selectedFactor: { code: string; name: string } | null
  onSelect: (factor: { code: string; name: string }) => void
}

// Define a type for our debug info
interface DebugInfo {
  matchType: string
  matchedIn: string[]
}

export function EmissionFactorSearch({
  availableEmissionFactors,
  selectedFactor,
  onSelect
}: EmissionFactorSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [comboboxOpen, setComboboxOpen] = useState(false)

  // Enhanced filter with multi-term search and scoring
  const filteredEmissionFactors = useMemo(() => {
    if (!searchQuery.trim()) return availableEmissionFactors

    // Debug: Log our input
    console.log("Search Query:", searchQuery)
    console.log(
      "Available Factors Sample:",
      availableEmissionFactors.slice(0, 3)
    )

    // Split query into individual terms for multi-term search
    const queryTerms = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0)

    console.log("Search Terms:", queryTerms)

    // Calculate match score and filter results
    const results = availableEmissionFactors.map(factor => {
      const codeText = factor.code.toLowerCase()
      const nameText = factor.name ? factor.name.toLowerCase() : ""

      // Debug: Check if name is undefined or empty
      if (!factor.name) {
        console.warn("Factor without name:", factor)
        return {
          factor,
          score: 0,
          matches: false,
          debug: { matchType: "no-name", matchedIn: [] } as DebugInfo
        }
      }

      const nameWords = nameText.split(/\s+/) // Split name into individual words

      // Initialize score
      let score = 0
      let matchedTerms = 0
      const debugInfo: DebugInfo = { matchType: "none", matchedIn: [] }

      // Check each search term
      for (const term of queryTerms) {
        let termMatched = false

        // Check for code match
        if (codeText.includes(term)) {
          termMatched = true
          debugInfo.matchedIn.push("code")
          // Exact matches get higher score
          if (codeText === term) {
            score += 100
            debugInfo.matchType = "exact-code"
            // Code starts with term
          } else if (codeText.startsWith(term)) {
            score += 75
            debugInfo.matchType = "starts-code"
            // Contains term
          } else {
            score += 50
            debugInfo.matchType = "contains-code"
          }
        }

        // Check for name match - either in the full name or as part of any word
        if (nameText.includes(term)) {
          termMatched = true
          debugInfo.matchedIn.push("name-full")
          // Name starts with term
          if (nameText.startsWith(term)) {
            score += 25
            if (!debugInfo.matchType || debugInfo.matchType === "none") {
              debugInfo.matchType = "starts-name"
            }
            // Contains term
          } else {
            score += 15
            if (!debugInfo.matchType || debugInfo.matchType === "none") {
              debugInfo.matchType = "contains-name"
            }
          }
        } else {
          // Check if term is a prefix of any word in the name
          for (const word of nameWords) {
            if (word.startsWith(term)) {
              termMatched = true
              debugInfo.matchedIn.push("name-word")
              score += 10 // Lower score for partial word match
              if (!debugInfo.matchType || debugInfo.matchType === "none") {
                debugInfo.matchType = "word-prefix"
              }
              break
            }
          }
        }

        if (termMatched) {
          matchedTerms++
        }
      }

      // Factor matches if at least one term matches
      const matches = matchedTerms > 0

      // Bonus points if all terms match
      if (matches && matchedTerms === queryTerms.length) {
        score += 30
        if (debugInfo.matchType !== "none") {
          debugInfo.matchType = "all-" + debugInfo.matchType
        }
      }

      return { factor, score, matches, debug: debugInfo }
    })

    // Debug: Log some statistics about the matches
    const matchCount = results.filter(r => r.matches).length
    const codeMatches = results.filter(r =>
      r.debug.matchedIn.includes("code")
    ).length
    const nameFullMatches = results.filter(r =>
      r.debug.matchedIn.includes("name-full")
    ).length
    const nameWordMatches = results.filter(r =>
      r.debug.matchedIn.includes("name-word")
    ).length

    console.log("Match Stats:", {
      total: matchCount,
      codeMatches,
      nameFullMatches,
      nameWordMatches,
      noMatches: results.length - matchCount
    })

    // Log first 3 matches and non-matches for inspection
    console.log(
      "Sample Matches:",
      results
        .filter(r => r.matches)
        .slice(0, 3)
        .map(r => ({
          factor: { code: r.factor.code, name: r.factor.name },
          score: r.score,
          debug: r.debug
        }))
    )

    console.log(
      "Sample Non-Matches:",
      results
        .filter(r => !r.matches)
        .slice(0, 3)
        .map(r => ({
          factor: { code: r.factor.code, name: r.factor.name },
          debug: r.debug
        }))
    )

    return results
      .filter(item => item.matches) // Only include results with matches
      .sort((a, b) => b.score - a.score) // Sort by score (highest first)
      .map(item => item.factor) // Return just the factor objects
  }, [availableEmissionFactors, searchQuery])

  return (
    <div className="space-y-1">
      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={comboboxOpen}
            className="h-auto w-full justify-between py-3"
          >
            {selectedFactor
              ? `${selectedFactor.code} - ${selectedFactor.name}`
              : "-- Select an emission factor --"}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <Command
            filter={(value, search) => {
              // Disable the built-in filtering since we're doing our own filtering
              // This ensures all our filtered results are shown
              return 1
            }}
          >
            <CommandInput
              placeholder="Search emission factors..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-9"
            />
            {filteredEmissionFactors.length > 0 ? (
              <CommandList>
                <CommandGroup>
                  {filteredEmissionFactors.map(factor => (
                    <CommandItem
                      key={factor.code}
                      value={factor.code}
                      onSelect={() => {
                        onSelect(factor)
                        setComboboxOpen(false)
                      }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex-1 truncate">
                        <span className="font-medium">{factor.code}</span> -{" "}
                        {factor.name}
                      </div>
                      {selectedFactor?.code === factor.code && (
                        <CheckIcon className="ml-2 size-4 shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            ) : (
              <div className="text-muted-foreground py-6 text-center text-sm">
                No emission factors found
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>

      {selectedFactor && (
        <div className="mt-2 rounded border border-green-200 bg-green-50 p-2 text-sm">
          <div className="font-semibold">Selected: {selectedFactor.code}</div>
          <div>{selectedFactor.name}</div>
        </div>
      )}
    </div>
  )
}
