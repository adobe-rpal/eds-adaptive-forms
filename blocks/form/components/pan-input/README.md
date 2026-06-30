# PAN Input Component

A custom form component that validates and formats Indian PAN (Permanent Account Number) input with a configurable fourth character.

## Features
- Real-time validation of PAN format
- Configurable fourth character (default is 'P')
- Automatic uppercase conversion
- Position-specific character validation:
  - First 5 characters: Letters (with 4th being configurable)
  - Next 4 characters: Numbers
  - Last character: Letter
- Handles paste events with auto-formatting
- Visual feedback with monospace font and letter spacing
- Custom error messages for different validation scenarios

## Format
PAN follows this format:
```
AAAPX1234Y where:
- First 3 chars: Letters (A-Z)
- 4th char: Configurable letter (default P)
- 5th char: Letter (A-Z)
- Next 4 chars: Numbers (0-9)
- Last char: Letter (A-Z)
```

## Usage

### Basic Setup
```json
{
  "fieldType": "text-input",
  "fd:viewType": "pan-input",
  "properties": {
    "fourthChar": "P"  // Optional, defaults to 'P'
  }
}
```

### Configuration Options
1. **Fourth Character** (`fourthChar`)
   - Type: String (single uppercase letter)
   - Default: "P"
   - Description: The allowed letter for the fourth position
   - Example values: "P", "H", "C", etc.

2. Standard text input properties are also supported:
   - label
   - placeholder
   - required
   - help text
   - etc.

### Example
```json
{
  "fieldType": "text-input",
  "fd:viewType": "pan-input",
  "label": "PAN Number",
  "name": "panNumber",
  "required": true,
  "placeholder": "Enter PAN number",
  "properties": {
    "fourthChar": "H"
  },
  "help": {
    "message": "Please enter a valid PAN number"
  }
}
```

## Validation
The component performs several validations:
1. **Format Validation**
   - Ensures each character is in the correct position
   - Validates against the configured fourth character
   - Shows error message for invalid format

2. **Length Validation**
   - Ensures exactly 10 characters
   - Shows error message if incomplete

3. **Character Type Validation**
   - Letters only in positions 1-3, 5, and 10
   - Numbers only in positions 6-9
   - Configured letter in position 4

## Error Messages
- "PAN must be 10 characters long" - When length is incorrect
- "Invalid PAN format. Fourth character must be [X]" - When format doesn't match
- Custom error messages can be configured through standard validation properties

## Styling
The component includes built-in styles for better user experience:
- Uppercase display
- Monospace font for consistent character width
- Letter spacing for improved readability
- Placeholder text in normal font for better legibility

## Best Practices
1. Always set a meaningful placeholder text
2. Include help text explaining the PAN format
3. Consider making the field required
4. Use appropriate label text
5. Configure custom error messages if needed
