# Regex Text Input Component

<<<<<<< HEAD
A custom form component that validates user input against a regex pattern in real time, filters out non-matching characters, and provides additional validation features like minimum length and required field checks.

## Features
- Note: At the moment this component does not support positional Regex - It validates the entire regex pattern, so for cases like PAN where each position needs to be a certain type of character, this will not work. Refer to the PAN component instead for the same.
- Real-time validation against a configurable regex pattern
- Automatic filtering of invalid characters during typing and pasting
- Minimum length validation
- Required field validation
- Customizable error messages for different validation scenarios
=======
A custom form component that validates user input against a regex pattern in real time and prevents users from entering characters that don't match the pattern.

## Features

- Real-time validation against a configurable regex pattern
- Prevents invalid characters from being entered
- Displays customizable error messages
>>>>>>> f9fa286ac5e731ab51db157b275554260db2bbeb
- Extends the standard text input component

## Usage

<<<<<<< HEAD
This component extends the standard text input component and adds advanced validation capabilities. It can be used anywhere a regular text input would be used, with the added benefit of enforcing input patterns and validation rules.
=======
This component extends the standard text input component and adds regex validation capabilities. It can be used anywhere a regular text input would be used, with the added benefit of enforcing input patterns.
>>>>>>> f9fa286ac5e731ab51db157b275554260db2bbeb

### Configuration Options

In the Universal Editor's property sheet, you can configure:

<<<<<<< HEAD
1. **Regex Pattern** (`regexPattern`) - The regular expression pattern to validate against (e.g., `^[A-Za-z0-9]+$` for alphanumeric characters only)
2. **Error Message** (`errorMessage`) - Custom message to display when input doesn't match the pattern
3. **Minimum Length** (`minLength`) - The minimum number of characters required (defaults to 0)
4. **Minimum Length Error Message** (`minLengthMessage`) - Custom message to display when minimum length is not met
5. **Required** (`required`) - Boolean flag to mark the field as required (defaults to false)

### Example Use Cases

- **Username fields** - Restrict to alphanumeric characters:
  ```json
  {
    "regexPattern": "^[A-Za-z0-9]+$",
    "minLength": 3,
    "required": true
  }
  ```
- **Phone numbers** - Enforce numeric format:
  ```json
  {
    "regexPattern": "^[0-9]+$",
    "minLength": 10,
    "errorMessage": "Please enter numbers only"
  }
  ```
=======
1. **Regex Pattern** - The regular expression pattern to validate against (e.g., `^[A-Za-z0-9]+$` for alphanumeric characters only)
2. **Error Message** - Custom message to display when input doesn't match the pattern

### Example Use Cases

- **Username fields** - Restrict to alphanumeric characters: `^[A-Za-z0-9]+$`
- **Phone numbers** - Enforce numeric format: `^[0-9]+$`
>>>>>>> f9fa286ac5e731ab51db157b275554260db2bbeb
- **Custom formats** - Any pattern that can be expressed as a regular expression

## How It Works

<<<<<<< HEAD
The component implements several layers of validation and character filtering:

1. **Real-time Character Filtering**
   - As users type or paste content, the component automatically filters out characters that don't match the regex pattern
   - Invalid characters are removed immediately, keeping only valid characters
   - Example: If pattern is `^[A-Za-z0-9]+$` and user pastes "AB*C**D", it becomes "ABCD"

2. **Validation Triggers**
   - **On Input**: Filters invalid characters and shows/hides error message
   - **On Blur**: Checks for:
     - Required field validation (if enabled)
     - Minimum length validation
     - Shows appropriate error message based on validation results

3. **Error Message Handling**
   - Error messages are displayed inline below the input field
   - Different messages for:
     - Pattern mismatch
     - Minimum length requirement
     - Required field validation
   - Messages are cleared when input becomes valid

## Implementation Details

- Built on top of the standard text input component
- Uses JavaScript's RegExp object for pattern matching
- Implements efficient character filtering using array operations
- Error messages are managed through a dedicated error message element
- Validation state is maintained and updated based on user interactions

## Best Practices

1. **Regex Patterns**
   - Keep patterns simple and focused
   - Test patterns thoroughly with edge cases
   - Consider using common patterns from the pattern library

2. **Error Messages**
   - Make messages clear and actionable
   - Provide specific guidance on expected format
   - Consider internationalization requirements

3. **Validation Rules**
   - Set appropriate minimum lengths based on use case
   - Consider combining with other validation types
   - Test validation behavior with various input methods (typing, pasting, etc.)
=======
The component attaches event listeners to the input field that:

1. Check each character as it's typed against the provided regex pattern
2. Remove characters that don't match the pattern
3. Display an error message when invalid input is detected
4. Validate the entire input on blur

## Implementation Details

- The component is built on top of the standard text input component
- It uses JavaScript's RegExp object for pattern matching
- Error messages are displayed inline below the input field
- CSS animations provide visual feedback when validation occurs
>>>>>>> f9fa286ac5e731ab51db157b275554260db2bbeb
