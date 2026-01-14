# Bill PDF Column Selector Feature

## Overview
This feature allows users to dynamically select which columns to include in the bill PDF generation. The implementation is organized across multiple files for maintainability and clean code separation.

## File Structure

### 1. `print-column-selector.js` - UI Component
**Purpose**: Provides the user interface for selecting columns

**Key Features**:
- Interactive dropdown panel with checkboxes for each column
- Shows selected column count in button
- Quick actions: "Select All" and "Default" buttons
- Required columns (S.No, GR No, Freight, Total) cannot be deselected
- Visual feedback with color coding for selected items

**Exports**:
- `PrintColumnSelector` - React component
- `AVAILABLE_COLUMNS` - Array of all available columns with metadata
- `DEFAULT_SELECTED_COLUMNS` - Default column selection

### 2. `pdf-column-builder.js` - Business Logic
**Purpose**: Transforms column selections into PDF generation configuration

**Key Functions**:
- `buildColumnConfig()` - Builds column configuration for PDF
  - Calculates proportional column widths
  - Creates headers array
  - Generates data accessor functions for each column
  - Creates total calculator functions
  
- `calculateBillTotals()` - Calculates all totals from bill details
  - Returns object with freight, labour, bill charge, toll, dd, pf, other, total, packages, weight, paid, toPay

**Benefits**:
- Separation of concerns
- Reusable logic
- Dynamic column rendering

### 3. `bill-master-pdf-generator.js` - PDF Generation
**Purpose**: Generates the PDF document using jsPDF

**Updates**:
- Now accepts `selectedColumns` parameter
- Uses `buildColumnConfig()` to get dynamic column configuration
- Renders table headers and data dynamically based on selection
- Automatically adjusts column widths proportionally

### 4. `page.js` (Bill Edit Page)
**Purpose**: Main page component that ties everything together

**Changes**:
- Imports `PrintColumnSelector` and `DEFAULT_SELECTED_COLUMNS`
- Manages `selectedColumns` state
- Passes column selection to PDF generator
- Replaced old PF toggle with flexible column selector

## How It Works

### User Flow
1. User clicks "Columns (N)" button → Dropdown opens
2. User checks/unchecks columns → Selection updates
3. User clicks "Apply" → Selection is saved
4. User clicks "Print Bill" → PDF generates with selected columns

### Technical Flow
```
selectedColumns (array of IDs)
    ↓
buildColumnConfig()
    ↓
{
  columnWidths: [...],    // Proportional widths
  headers: [...],         // Column labels
  dataAccessors: [...],   // Functions to extract data
  totalCalculators: [...] // Functions to calculate totals
}
    ↓
PDF Generation
    - Headers rendered dynamically
    - Data rows rendered using accessors
    - Total row rendered using calculators
```

## Column Configuration

Each column in `AVAILABLE_COLUMNS` has:
```javascript
{
  id: 'freight',          // Unique identifier
  label: 'Freight',       // Display name
  width: 0.07,            // Proportional width (0-1)
  required: true          // Whether it can be deselected
}
```

## Adding New Columns

To add a new column:

1. Add to `AVAILABLE_COLUMNS` in `print-column-selector.js`:
```javascript
{ id: 'newColumn', label: 'New Column', width: 0.05, required: false }
```

2. Add data accessor in `pdf-column-builder.js`:
```javascript
case 'newColumn':
  return (detail) => detail.new_field || 'N/A';
```

3. Add total calculator in `pdf-column-builder.js`:
```javascript
case 'newColumn':
  return (details) => details.reduce((sum, d) => sum + parseFloat(d.new_field || 0), 0).toString();
```

## Benefits of This Architecture

1. **Separation of Concerns**: UI, logic, and rendering are in separate files
2. **Maintainability**: Easy to add/modify columns
3. **Reusability**: Column builder can be used for other reports
4. **Flexibility**: Users control what they see
5. **Performance**: Only selected columns are processed
6. **Type Safety**: Clear data flow and interfaces

## Default Columns

By default, these columns are selected:
- S.No, Date, GR No, Consignor, Consignee, City
- Packages, Weight, Pay Mode
- Freight, Labour, Bill Charge, Toll, DD, Total

Users can customize this by checking/unchecking columns.
