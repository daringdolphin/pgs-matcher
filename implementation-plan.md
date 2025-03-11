# Implementation Plan

## 1. Preliminary Setup & Dependencies

- [x] **Step 1: Install Required Client-Side Packages (XLSX, Papaparse, openai library)**
  - **Task**: 
    - Install `xlsx` (or a similar package) and optionally `papaparse` for reading CSV/XLSX files in the browser.
    - Install the official OpenAI JS SDK or whichever approach you prefer (`openai` npm package or direct fetch calls).
    - Update `.env.example` with any needed environment variables (e.g. `OPENAI_API_KEY`).
  - **Files**: 
    - *No code files changed here.* Only the package installations and `.env.example` as needed.
  - **Step Dependencies**: None
  - **User Instructions**: 
    - Run: 
      ```bash
      npm install xlsx papaparse openai
      ```
    - Add `OPENAI_API_KEY` to `.env.local` (and `.env.example`).

## 2. Create Emission Matcher Route & Basic Page

- [x] **Step 2: Initialize `emission-matcher` Route with Basic Page**
  - **Task**:
    - Create a new folder `app/emission-matcher` with `page.tsx`.
    - Render a placeholder UI that says "Emission Factor Matcher" to confirm the route is active.
  - **Files**:
    1. `app/emission-matcher/page.tsx`: Create a server page file with a basic placeholder markup.
  - **Step Dependencies**: Step 1
  - **User Instructions**: None

## 3. Client-Side Utilities for File Parsing

- [x] **Step 3: Implement Excel & CSV Parsing Helpers**
  - **Task**:
    - Create a utility file in `lib/excel-utils.ts` (or similar) that:
      1. Checks file extension (csv or xlsx).
      2. Uses `xlsx` or `papaparse` to parse the file in the browser.
      3. Returns data rows, headers, and row count for subsequent processing.
    - Make sure to handle potential parsing errors.
  - **Files**:
    1. `lib/excel-utils.ts`: New file exporting functions like `parseFile(file: File)`.
  - **Step Dependencies**: Steps 1-2
  - **User Instructions**: None

## 4. UI Components for Header Description & Progress

- [x] **Step 4: Create a Modal to Gather Header Descriptions**
  - **Task**:
    - Implement a client component `header-description-modal.tsx` inside `app/emission-matcher/_components`.
    - The modal displays each header from the uploaded file and provides text fields for user-supplied descriptions.
    - On form submit, return the user inputs to the parent component.
  - **Files**:
    1. `app/emission-matcher/_components/header-description-modal.tsx`
  - **Step Dependencies**: Steps 1-3
  - **User Instructions**: None

- [x] **Step 5: Create a Progress Tracker UI**
  - **Task**:
    - Implement a client component `progress-tracker.tsx` that:
      1. Accepts props like `currentBatch`, `totalBatches`.
      2. Displays a progress bar or textual progress indicator ("Processing batch X of Y").
  - **Files**:
    1. `app/emission-matcher/_components/progress-tracker.tsx`
  - **Step Dependencies**: Steps 1-4
  - **User Instructions**: None

## 5. Main Page Flow & File Upload

- [x] **Step 6: Implement File Upload & Header Description Flow**
  - **Task**:
    - In `page.tsx` (client or server component, but must handle user interactions in a client component):
      1. Provide a file input for uploading `.csv` or `.xlsx`.
      2. Use the parsing utility from Step 3 to extract headers.
      3. Show the `HeaderDescriptionModal` from Step 4 once the file is parsed.
      4. Store user-supplied header descriptions in local state.
    - Add error handling for invalid file formats or parse errors.
  - **Files**:
    1. `app/emission-matcher/page.tsx`: Expand existing placeholder to handle file input, parse file, open modal, store descriptions.
  - **Step Dependencies**: Steps 2-5
  - **User Instructions**: None

## 6. Chunking Data & LLM Integration (OpenAI `o3-mini-2025-01-31`)

- [x] **Step 7: Create a Server Action or API Route for OpenAI Calls**
  - **Task**:
    - If you wish to protect the API key, create `actions/openai-actions.ts` or `app/api/openai/route.ts`.
    - Accept data with row values, header descriptions, etc.
    - Construct a prompt for the `o3-mini-2025-01-31` model (similar to GPT usage).
    - Return structured JSON with `[{"EmissionFactorCode": "...", "EmissionFactorName": "..."}, ... ]`.
    - Handle error cases (response timeouts, invalid JSON, etc.).
  - **Files**:
    1. `actions/openai-actions.ts` or `app/api/openai/route.ts`: New file handling LLM calls.
  - **Step Dependencies**: Steps 1-6
  - **User Instructions**: 
    - Place your `OPENAI_API_KEY` in `.env.local`.
    - Verify you can call the `o3-mini-2025-01-31` model from your OpenAI account.

- [x] **Step 8: Add Chunking & Batch Processing in the Client**
  - **Task**:
    - In `page.tsx`, after user provides descriptions:
      1. Split rows into batches of ~100.
      2. For each batch, call the server action/route from Step 7 with the relevant chunk.
      3. Display progress with `ProgressTracker`.
      4. Collect all Emission Factor results into a final array that aligns with the original data order.
      5. Handle partial failures or retry logic as needed.
  - **Files**:
    1. `app/emission-matcher/page.tsx`: Add chunking logic, calls to LLM route, progress updates, error handling.
  - **Step Dependencies**: Steps 6-7
  - **User Instructions**: None

## 7. Append Results & Generate Downloadable File

- [x] **Step 9: Implement Final File Generation & Download**
  - **Task**:
    - Use the `xlsx` library to create a new workbook from the original data plus two new columns: `Emission Factor Code` and `Emission Factor Name`.
    - Provide a "Download Results" button that triggers a file download.
    - Optionally, create a separate client component `results-downloader.tsx` to handle this logic.
  - **Files**:
    1. `app/emission-matcher/_components/results-downloader.tsx` (optional)
    2. `app/emission-matcher/page.tsx`: Integrate the new columns, build final workbook, and enable user download.
  - **Step Dependencies**: Steps 1-8
  - **User Instructions**: None

## 8. Error Handling, Edge Cases, & Testing

- [ ] **Step 10: Add Error Handling & Edge Case Checks**
  - **Task**:
    - In `page.tsx` and related components:
      1. Validate if no file is selected or if it's empty.
      2. Handle large file sizes gracefully.
      3. Handle timeouts or JSON parse errors from the LLM response.
      4. Display user-friendly error messages with toast notifications or inline alerts.
  - **Files**:
    1. `app/emission-matcher/page.tsx`
    2. `lib/excel-utils.ts`
    3. `actions/openai-actions.ts` (or the server route)
  - **Step Dependencies**: Steps 1-9
  - **User Instructions**: None

- [ ] **Step 11: Write Integration & Unit Tests**
  - **Task**:
    - Add simple unit tests for:
      1. The `parseFile` function (using sample CSV/XLSX).
      2. Chunking logic.
      3. OpenAI response parsing (mocking the server calls).
      4. Generating the final file with appended columns.
    - If desired, add integration tests for the entire workflow (upload -> describe headers -> get results -> download).
  - **Files**:
    1. `__tests__/lib/excel-utils.test.ts` (example)
    2. `__tests__/app/emission-matcher/page.test.tsx` (example)
    3. Others as needed, under 20 files total.
  - **Step Dependencies**: Steps 1-10
  - **User Instructions**: 
    - `npm install --save-dev jest @types/jest` or use your preferred testing setup.
    - Configure `jest.config.js` or similar if not already present.

## 9. Wrap-Up & Deployment

- [ ] **Step 12: Final Clean-Up & Deployment Readiness**
  - **Task**:
    - Review code for consistency and best practices.
    - Document environment variables or any service-specific instructions (for example, how to set up the `o3-mini-2025-01-31` model).
    - Test the application locally and confirm correct file uploads, LLM calls, appended columns, and final downloads.
  - **Files**: 
    - *No direct code changes unless you discover final fixes.* Possibly a `README.md` or a `docs/` file for usage instructions.
  - **Step Dependencies**: Steps 1-11
  - **User Instructions**:
    - Deploy to Vercel or your chosen platform.
    - Ensure environment variables (`OPENAI_API_KEY`, etc.) are set in the production environment.

---

### Summary

This plan now uses the `o3-mini-2025-01-31` model from OpenAI instead of Gemini. We install and configure OpenAI's SDK, create a server action or API route that calls `o3-mini-2025-01-31`, and handle chunked batch requests for emission factor lookup. Finally, we append the resulting Emission Factor columns to the original spreadsheet and let the user download the updated file. Error handling, testing, and deployment steps remain the same.
