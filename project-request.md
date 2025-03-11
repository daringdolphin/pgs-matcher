# Project Name
LLM-Driven Emission Factor Matcher

## Project Description
A client-side web application that assists sustainability managers in matching emission factors for Purchased Goods and Services (Scope 3 Category 1). Users upload an Excel or CSV file, the app extracts headers and presents them in a modal for users to provide text descriptions. The app processes data in batches (default 100 rows per batch, hidden from the user) by sending combined header information, descriptions, and row values to OpenAI with structured output instructions. The response containing Emission Factor Code and Name is appended as new columns to the original file, which users can download.

## Target Audience
- Sustainability managers
- Environmental data analysts
- Corporate sustainability teams

## Desired Features
### File Upload & Processing
- [ ] Support for Excel (.xlsx) and CSV file uploads.
- [ ] Extraction of headers from the first row.
- [ ] Modal display showing extracted headers with text boxes for user-provided descriptions.

### Data Processing & LLM Integration
- [ ] Batch processing of rows (default 100 rows per batch, hidden from the user).
- [ ] Compile headers, descriptions, and row values for each batch.
- [ ] Send data to OpenAI API with structured output instructions to enforce schema adherence.
- [ ] Receive structured response containing Emission Factor Code and Emission Factor Name.

### Output Generation
- [ ] Append the emission factor codes and names as new columns in the original file.
- [ ] Provide a downloadable Excel file with the appended data.

### User Experience & Feedback
- [ ] Implement a simple progress tracker to indicate processing status and track errors.

## Design Requests
- [ ] Simple, minimalist UI built with Next.js 15 app router.
- [ ] Use shadcn and Tailwind CSS for design.
- [ ] Clean interface for file uploads and modal-based header description input.
- [ ] Visual feedback through a progress tracker during batch processing.

## Other Notes
- Use OpenAI API for LLM processing with structured outputs.
- No validation for file formatting required at this stage.
- This is a client-side app, so advanced data encryption and compliance are not prioritized.
- Focus on handling potential technical challenges with batching and ensuring structured LLM outputs.
