# File Input V2 Component

A modern, feature-rich file upload component for Adaptive Forms that supports file preview, drag-and-drop, and robust validation.

## Overview

The File Input V2 component provides an enhanced file upload experience with the following features:
- File type validation (MIME type and extesion)
- File size validation
- Preview support for images and PDFs
- Drag and drop functionality
- Custom labels and descriptions
- Document type specific uploads
- Success/failure tracking

## Configuration Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `allowedExtensions` | Array | List of allowed file extensions (e.g., [".jpg", ".jpeg", ".png", ".pdf"]) | [".jpg", ".jpeg", ".png", ".pdf"] |
| `hideDefaultLabels` | Boolean | Hide the default label and description | false |
| `documentType` | String | Type of document being uploaded (e.g., "passport", "aadhaar") | "" |
| `documentSide` | String | Side of the document (e.g., "front", "back") | "" |
| `maxFileSize` | String | Maximum allowed file size with unit | "5MB" |
| `accept` | String | Comma-separated list of accepted MIME types | "image/jpeg,image/png,application/pdf" |
| `description` | String | Description text shown below the label | "Only JPEG/PNG with file size less than 5MB" |
| `fd:buttonText` | String | Text for the upload button | "Browse and upload" |

## Example Configurations

### Basic Usage
```json
{
  "fieldType": "file-input",
  "name": "documentUpload",
  "id": "document-upload-1",
  "label": {
    "value": "Upload Document"
  },
  "properties": {
    "variant": "file-input-v2",
    "maxFileSize": "5MB",
    "accept": "image/jpeg,image/png,application/pdf"
  }
}
```

### Custom Extensions and Hidden Labels
```json
{
  "fieldType": "file-input",
  "name": "documentUpload",
  "id": "document-upload-2",
  "label": {
    "value": "Upload Document"
  },
  "properties": {
    "variant": "file-input-v2",
    "allowedExtensions": [".jpg", ".jpeg", ".png"],
    "hideDefaultLabels": true,
    "maxFileSize": "2MB",
    "accept": "image/jpeg,image/png"
  }
}
```

### Document Type Specific
```json
{
  "fieldType": "file-input",
  "name": "passportFront",
  "id": "passport-front-upload",
  "label": {
    "value": "Upload Passport Front"
  },
  "properties": {
    "variant": "file-input-v2",
    "documentType": "passport",
    "documentSide": "front",
    "description": "Only JPEG/PNG with file size less than 5MB",
    "maxFileSize": "5MB",
    "accept": "image/jpeg,image/png,application/pdf"
  }
}
```

## Validation Rules

### File Type Validation
- Files must match both MIME type (specified in `accept`) and file extension (specified in `allowedExtensions`)
- Validation occurs before file preview or upload
- Custom error messages can be provided through `constraintMessages`

### File Size Validation
- Files must not exceed the specified `maxFileSize`
- Supports various units: B, KB, MB, GB, TB
- Size is validated before upload

### Error Messages
```json
{
  "constraintMessages": {
    "accept": "Please upload a valid document type (JPEG/PNG/PDF only)",
    "maxFileSize": "File size exceeds the maximum allowed size of 5MB",
    "required": "Please upload a document"
  }
}
```

## Related Fields

The component automatically manages two hidden fields:

### isDocUploadSuccess
```json
{
  "fieldType": "checkbox",
  "name": "isDocUploadSuccess",
  "hidden": true,
  "value": "off"
}
```
- Tracks successful file uploads
- Updated to "on" when file passes validation
- Updated to "off" when file fails validation or is removed

### doccount
```json
{
  "fieldType": "number",
  "name": "doccount",
  "hidden": true,
  "value": 0
}
```
- Tracks number of successfully uploaded documents
- Incremented when a valid file is uploaded
- Used for tracking upload progress

## UI States

### Initial State
- Shows upload icon
- Displays label (if not hidden)
- Shows description (if not hidden)
- Displays upload button with customizable text

### Upload State
- Shows file preview (for images/PDFs)
- Displays file name and size
- Shows re-upload button
- Maintains document type context in labels

### Error State
- Shows validation error message
- Maintains initial upload UI
- Allows retry with correct file type

## Best Practices

1. File Types
   - Specify both MIME types and extensions for robust validation
   - Use common file types that users are likely to have
   - Consider file type requirements for your use case

2. File Size
   - Set reasonable size limits based on your requirements
   - Consider network conditions and server limitations
   - Provide clear size requirements in the description

3. Labels and Descriptions
   - Use clear, concise labels
   - Specify file type requirements in description
   - Include size limitations in description

4. Error Handling
   - Provide specific error messages for each validation type
   - Use user-friendly language in error messages
   - Include guidance on how to resolve the error

5. Document Types
   - Use consistent naming for document types
   - Specify both document type and side when applicable
   - Use clear labels that match your business terminology

## Events

The component dispatches custom events that you can listen to:

### fileValidationStatus
```javascript
{
  detail: {
    isValid: boolean,
    constraint: string,
    errorMessage: string
  }
}
```
- Fired when file validation occurs
- Provides validation status and error details
- Can be used for custom handling of validation results

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Fallback to basic file input on unsupported browsers
- Drag and drop may not work on older browsers
