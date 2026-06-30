# Date of Birth (DOB) Custom Component

This folder contains the custom **Date of Birth** field for forms, implemented as a custom component that extends the standard `date-input` (date picker) component.

## What it Extends
- **Base component:** `date-input` (date picker)

## Features Added
- **Age-based validation:**
  - Authors specify `minAge` and `maxAge` (e.g., 18 and 100).
  - The component automatically calculates the valid date range based on the current date and these age limits.
- **Custom error messages:**
  - `minimumErrorMessage`: Message shown if the entered date is below the minimum age.
  - `maximumErrorMessage`: Message shown if the entered date is above the maximum age.
- **Standard validation integration:**
  - Inherits all standard validation options (required, mandatory message, etc.) by referencing shared validation fields.
- **Consistent authoring experience:**
  - Appears in the form builder with a familiar interface, but with age-specific configuration options.

## How to Configure
- In the JSON definition (`_dob-input.json`), set the following properties in the validation container:
  - `minAge`: Minimum age allowed (number)
  - `maxAge`: Maximum age allowed (number)
  - `minimumErrorMessage`: Error message for underage
  - `maximumErrorMessage`: Error message for overage
- Standard validation fields (like `required`) are included automatically via references.

## Implementation Notes
- The decorator (`dob-input.js`) calculates the min/max date for the input based on the configured ages.
- The min/max attributes are set on the input element, and the same values are set in the field model for validation.
- Validation and help fields are reused via references for maintainability.
- By reusing the same names for error messages property, the existing logic in the code is reused.