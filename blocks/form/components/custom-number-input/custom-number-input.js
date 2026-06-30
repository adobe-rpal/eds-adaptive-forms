import { subscribe } from '../../rules/index.js';

/**
 * Format a number according to the specified format pattern
 * @param {number} value - The number to format
 * @param {string} format - The format pattern
 * @param {boolean} allowNegative - Whether to allow negative numbers
 * @returns {string} - The formatted number
 */
function formatNumber(value, format, allowNegative = true) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // Handle negative numbers
  const isNegative = value < 0;
  let absValue = Math.abs(value);
  
  if (isNegative && !allowNegative) {
    absValue = Math.abs(value);
    value = absValue;
  }

  // If no format is specified, return the number as is
  if (!format) {
    return isNegative && allowNegative ? `-${absValue}` : `${absValue}`;
  }

  try {
    // Basic formatting patterns
    switch (format) {
      case '¤#,##0.00': // $1,234.21
        return `${isNegative && allowNegative ? '-' : ''}$${absValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      case '¤####0.00': // $1234.21
        return `${isNegative && allowNegative ? '-' : ''}$${absValue.toFixed(2)}`;
      
      case '#,###,##0.000': // 1,234.210
        return `${isNegative && allowNegative ? '-' : ''}${absValue.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
      
      case '#,###,##0%': // 123,421%
        return `${isNegative && allowNegative ? '-' : ''}${(absValue * 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}%`;
      
      case '₹#,##0.00': // ₹1,234.21 (INR)
        return `${isNegative && allowNegative ? '-' : ''}₹${absValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      
      default:
        return isNegative && allowNegative ? `-${absValue}` : `${absValue}`;
    }
  } catch (error) {
    console.error('Error formatting number:', error);
    return `${value}`;
  }
}

/**
 * Parse a formatted number string back to a number
 * @param {string} formattedValue - The formatted number string
 * @returns {number} - The parsed number
 */
function parseFormattedNumber(formattedValue) {
  if (!formattedValue) return '';
  
  // Remove currency symbols, commas, and percentage signs
  const cleanValue = formattedValue.replace(/[₹$,]/g, '').replace(/%/g, '');
  
  // Parse the clean value as a number
  const parsedValue = parseFloat(cleanValue);
  
  // If the original value had a percentage sign, divide by 100
  if (formattedValue.includes('%')) {
    return parsedValue / 100;
  }
  
  return isNaN(parsedValue) ? '' : parsedValue;
}

/**
 * Validate if a value is a valid number according to the specified type
 * @param {string} value - The value to validate
 * @param {string} type - The number type ('integer' or 'number')
 * @returns {boolean} - Whether the value is valid
 */
function isValidNumber(value, type) {
  if (value === null || value === undefined || value === '') {
    return true; // Empty values are valid (unless required, which is handled separately)
  }
  
  const parsedValue = parseFloat(value);
  
  if (isNaN(parsedValue)) {
    return false;
  }
  
  if (type === 'integer') {
    return Number.isInteger(parsedValue);
  }
  
  return true; // Any number is valid for type 'number'
}

export default function decorate(element, fd, container, formId) {
  subscribe(element, formId, (_element, fieldModel) => {
    // eslint-disable-next-line no-underscore-dangle
    const jsonModel = fieldModel?._jsonModel;
    if (!jsonModel) return;

    const {
      constraintMessages,
      minimum,
      maximum,
      required,
      type = 'number',
      displayFormat = '',
      enableFormatting = true,
      allowNegative = true
    } = jsonModel;
    
    const inputField = element.querySelector('input[type="text"]');
    if (!inputField) return;

    // Store the actual numeric value
    let numericValue = parseFloat(inputField.value) || '';

    // Apply initial formatting if needed
    if (enableFormatting && numericValue !== '' && displayFormat) {
      inputField.value = formatNumber(numericValue, displayFormat, allowNegative);
    }

    // Handle focus event - show unformatted value for editing
    inputField.addEventListener('focus', () => {
      if (enableFormatting && numericValue !== '') {
        inputField.value = numericValue;
      }
    });

    // Handle blur event - format the value
    inputField.addEventListener('blur', () => {
      if (!inputField.value) {
        numericValue = '';
        return;
      }

      const parsedValue = parseFloat(inputField.value);
      
      if (isNaN(parsedValue)) {
        // Invalid number, revert to previous value
        inputField.value = numericValue !== '' ? numericValue : '';
        return;
      }

      // Apply constraints
      let validatedValue = parsedValue;
      
      // Check if negative numbers are allowed
      if (!allowNegative && parsedValue < 0) {
        validatedValue = Math.abs(parsedValue);
      }
      
      // Check minimum/maximum constraints
      if (minimum !== undefined && validatedValue < minimum) {
        validatedValue = minimum;
      }
      
      if (maximum !== undefined && validatedValue > maximum) {
        validatedValue = maximum;
      }
      
      // Update the numeric value
      numericValue = validatedValue;
      
      // Format the value if formatting is enabled
      if (enableFormatting && displayFormat) {
        inputField.value = formatNumber(validatedValue, displayFormat, allowNegative);
      } else {
        inputField.value = validatedValue;
      }
      
      // Trigger change event to update the model
      inputField.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Handle input event
    inputField.addEventListener('input', (event) => {
      const currentValue = event.target.value;
      
      // If formatting is not enabled, just validate the input
      if (!enableFormatting) {
        if (type === 'integer' && currentValue !== '') {
          // For integer type, only allow digits and minus sign
          const isValid = /^-?\d*$/.test(currentValue);
          if (!isValid) {
            event.target.value = numericValue !== '' ? numericValue : '';
            return;
          }
        }
        
        numericValue = currentValue !== '' ? parseFloat(currentValue) : '';
        inputField.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      
      // For formatted input, we need to parse the value
      const parsedValue = parseFormattedNumber(currentValue);
      
      if (currentValue === '' || parsedValue !== '') {
        numericValue = parsedValue;
        
        // For integer type, ensure the value is an integer
        if (type === 'integer' && numericValue !== '' && !Number.isInteger(numericValue)) {
          numericValue = Math.floor(numericValue);
        }
        
        // Trigger change event to update the model
        inputField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Add custom validation
    inputField.addEventListener('invalid', (event) => {
      event.preventDefault();
      
      // Check if the field is required but empty
      if (required && !inputField.value) {
        inputField.setCustomValidity(constraintMessages?.required || 'This field is required');
        return;
      }
      
      // Check if the value is a valid number
      if (inputField.value && !isValidNumber(numericValue, type)) {
        inputField.setCustomValidity(
          type === 'integer' 
            ? 'Please enter a valid integer' 
            : 'Please enter a valid number'
        );
        return;
      }
      
      // Check minimum constraint
      if (minimum !== undefined && numericValue < minimum) {
        inputField.setCustomValidity(
          constraintMessages?.minimum || `Value must be at least ${minimum}`
        );
        return;
      }
      
      // Check maximum constraint
      if (maximum !== undefined && numericValue > maximum) {
        inputField.setCustomValidity(
          constraintMessages?.maximum || `Value must be at most ${maximum}`
        );
        return;
      }
      
      // Clear any validation message if all checks pass
      inputField.setCustomValidity('');
    });
  });
  
  return element;
}
