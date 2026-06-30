# Custom Number Input Component

A specialized number input component for forms with advanced formatting and validation features.

## Features

- **Number Type Support**: Choose between integer and decimal number types
- **Auto-Formatting**: Format numbers as they are typed with various display formats
- **Validation**: Built-in validation for minimum/maximum values
- **Negative Number Control**: Option to allow or disallow negative numbers
- **Currency Formatting**: Support for various currency formats including INR (₹)
- **Percentage Formatting**: Format numbers as percentages
- **Custom Error Messages**: Configurable error messages for validation failures

## Usage

### Basic Implementation

To use the custom number input component in your form:

1. Include the component in your form definition:

```json
{
  "id": "custom-numberinput-123",
  "fieldType": "number-input",
  "name": "amount",
  "visible": true,
  "type": "number",
  "required": true,
  "placeholder": "Enter amount",
  "default": 1000,
  "properties": {
    "fd:viewType": "custom-number-input"
  }
}
```

2. Configure the component with additional properties:

```json
{
  "id": "custom-numberinput-123",
  "fieldType": "number-input",
  "name": "amount",
  "visible": true,
  "type": "number",
  "required": true,
  "placeholder": "Enter amount",
  "default": 1000,
  "minimum": 100,
  "maximum": 10000,
  "displayFormat": "₹#,##0.00",
  "enableFormatting": true,
  "allowNegative": false,
  "properties": {
    "fd:viewType": "custom-number-input"
  }
}
```

## Configuration Options

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `type` | string | Number type: 'integer' or 'number' (decimal) | 'number' |
| `required` | boolean | Whether the field is required | false |
| `placeholder` | string | Placeholder text for the input | '' |
| `default` | number | Default value for the field | null |
| `minimum` | number | Minimum allowed value | undefined |
| `maximum` | number | Maximum allowed value | undefined |
| `displayFormat` | string | Format pattern for displaying the number | '' |
| `enableFormatting` | boolean | Whether to enable auto-formatting | true |
| `allowNegative` | boolean | Whether to allow negative numbers | true |

## Display Format Options

The component supports the following display formats:

| Format | Example | Description |
|--------|---------|-------------|
| `¤#,##0.00` | $1,234.21 | US Dollar with thousands separator and 2 decimal places |
| `¤####0.00` | $1234.21 | US Dollar without thousands separator |
| `#,###,##0.000` | 1,234.210 | Number with thousands separator and 3 decimal places |
| `#,###,##0%` | 123,421% | Percentage with thousands separator |
| `₹#,##0.00` | ₹1,234.21 | Indian Rupee with thousands separator and 2 decimal places |

## Validation

The component provides built-in validation for:

- Required fields
- Minimum and maximum values
- Integer vs. decimal validation
- Negative number validation

## Custom Error Messages

You can customize error messages for validation failures:

```json
{
  "constraintMessages": {
    "required": "This field is required",
    "minimum": "Value must be at least {0}",
    "maximum": "Value must be at most {0}"
  }
}
```

## Example

See the test file at `test/unit/fixtures/components/custom-number-input/custom-number-input.html` for a working example of the component.

## Implementation Details

The component is implemented with the following files:

- `_custom-number-input.json`: Component definition
- `custom-number-input.js`: Component implementation
- `README.md`: Documentation
- Test files in `test/unit/fixtures/components/custom-number-input/`
