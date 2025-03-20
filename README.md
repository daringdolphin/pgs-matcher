# PG&S EF matcher

Upload PG&S accounting data and match items with appropriate USEPA NAICS Supply Chain emission factors.

## How It Works

1. **Upload your data** - Drag and drop your purchase records as a spreadsheet or CSV file
2. **Map your columns** - Identify what information each column contains
3. **Enhance with examples** (optional) - Provide sample mappings to improve accuracy
4. **AI-powered matching** - System analyzes and matches items with appropriate emission factors
5. **Download results** - Get an Excel report with your data enriched with emission factors and calculated emissions

## Tips for Best Results

1. **Prepare your file properly**

   - Keep headers in the first row
   - Include only columns relevant for emission factor matching (e.g., Vendor Name, Description, Category)

- **Example of file cleanup:**
  - Original headers: `Index, Date, Transaction Type, No., Vendor Name, Memo/Description, Amount (in SGD), Amount (in USD), Location, Class, Class description, EF Code, EF Name, EF Value, Emissions (kgco2e)`
  - Cleaned headers: `Index, Vendor Name, Memo/Description, Class description`

2. **Maintain an index column** to track which emission factors match to which original transactions

3. **Process in batches** of 500-1000 rows for optimal performance

4. **Remove irrelevant data** that won't help determine emission factors (dates, transaction numbers, etc.)
