/* eslint-disable linebreak-style */
import { updateOrCreateInvalidMsg, setConstraints } from '../../util.js';
import { subscribe } from '../../rules/index.js';

/**
 * Filters input to allow only digits, with optional leading zero restriction
 * @param {string} input - The input string to filter
 * @param {boolean} noLeadingZero - Whether to prevent leading zeros
 * @returns {string} Filtered string containing only digits
 */
function filterDigitsOnly(input, noLeadingZero = false) {
  // Remove all non-digit characters
  let filtered = input.replace(/\D/g, '');
  
  // Handle leading zero restriction
  if (noLeadingZero && filtered.length > 1 && filtered[0] === '0') {
    filtered = filtered.replace(/^0+/, '');
  }
  
  return filtered;
}
// To add the functionality of leading zero restriction, someone had made the change of adding pinCode, panAcknowledgementNumber, agriculturalIncome, otherIncome
// json. filterDigitsOnly function was missed, so I've added it here, for quick bug resolution. This is in backlog. There should be a property for leading zero restriction instead.

/**
 * Validates input against a regex pattern and prevents invalid characters
 * @param {HTMLElement} input - The input element to validate
 * @param {string} regexPattern - The regex pattern to validate against
 * @param {string} errorMessage - The error message to display when validation fails
 * @param {number} minLength - Minimum length required for the input
 * @param {string} minLengthErrorMessage - Message to display when minimum length is not met
 * @param {boolean} required - Whether the field is required
 */
function setupRegexValidation(input, regexPattern, errorMessage, init=false) {
  if (!regexPattern) return; // Skip if no regex pattern provided

  // Create a RegExp object from the pattern string
  let regex;
  try {
    regex = new RegExp(regexPattern, 'i');
  } catch (e) {
    console.error('Invalid regex pattern:', regexPattern, e);
    return;
  }

  
  // Handle input events to filter out invalid characters
input.addEventListener('input', (e) => {
  const raw = e.target.value;
  let temp = '';
  const name = input.getAttribute('name');

  const fieldRules = {
  pinCode: {
    allowDigitsOnly: true,
    noLeadingZero: true,
  },
  // panAcknowledgementNumber: {
  //   allowDigitsOnly: true,
  //   noLeadingZero: false, // leading zero is allowed
  // },
  agriculturalIncome: {
    allowDigitsOnly: true,
    noLeadingZero: true,
  },
  otherIncome: {
    allowDigitsOnly: true,
    noLeadingZero: false, // leading zero is allowed
  }
};

  const rules = fieldRules[name];
  if (rules && rules.allowDigitsOnly) {
    temp = filterDigitsOnly(raw, rules.noLeadingZero);
  } else {
    // Default rule for other fields using regex
    temp = '';
    raw.split('').forEach((char) => {
      if (regex.test(char)) temp += char;
    });
  }

  // Update input with filtered value
  // Adding logic to exclude 6 character check from father & mother name, will be added backlog to fix it
  if (name === 'pinCode' && temp === '100000') {
    updateOrCreateInvalidMsg(input, errorMessage); //Edge Case - Show error for invalid pin code
  } else if (temp !== raw) {
    e.target.value = temp;
    updateOrCreateInvalidMsg(input, errorMessage);
  } else if (!(name === 'fatherName' || name === 'motherName') && (temp.length === 6 && !regex.test(temp))) {
    updateOrCreateInvalidMsg(input, errorMessage);
  } else {
    updateOrCreateInvalidMsg(input, '');
  }
});

  // Checks for minLength on blur event using minLength and minLengthErrorMessage
  input.addEventListener('blur', () => {
    const name = input.getAttribute('name');
    const minLength = Number(input.getAttribute('minlength')) || 0;
    const required = input.hasAttribute('required');
    const isPinCodeInvalid = name === 'pinCode' && input.value === '100000';
    const isParentName = name === 'fatherName' || name === 'motherName';
    const isParentNameInvalid = isParentName  && !regex.test(input.value);
    const fieldWrapper = input.closest('.field-wrapper');
    if(fieldWrapper?.classList?.contains('field-invalid')){
      return;
    }
    if(isPinCodeInvalid) {
      updateOrCreateInvalidMsg(input, errorMessage);
    } else if (isParentNameInvalid) {
      updateOrCreateInvalidMsg(input, 'Name contains invalid characters or restricted words.');
    } else if (!input.value && required && minLength === 0) {
      updateOrCreateInvalidMsg(input, `Please fill this field`);
    } else if ((!input.value && required) || (input.value && input.value.length < minLength)) {
      updateOrCreateInvalidMsg(input, `Minimum ${minLength} characters required`);
    } else {
      updateOrCreateInvalidMsg(input, '');
    }
  });

  // Validate on blur for complete validation
  input.addEventListener('blur', validateInput);

  // Initial validation
  if (!init) {
    validateInput();
  }
}

export default function decorate(fieldDiv, fieldJson, container, formId) {
  // Use case example - Full Name as per Pan needs to have a
  // green tick at a specific time in the journey.
  // Dispatch the event on this field, to add the class, for css.
  subscribe(fieldDiv, formId, (_fieldDiv, fieldModel) => {
    // Subscribe to field validated - To add a class
    fieldModel.subscribe(() => {
      _fieldDiv.classList.add('fieldValidated');
    }, 'fieldValidated');

    // Subscribe to field validated - To remove a class
    fieldModel.subscribe(() => {
      _fieldDiv.classList.remove('fieldValidated');
    }, 'removeFieldValidatedProperty');
  });

  // Get the regex pattern and error message from the field properties
  const { regexPattern, regexErrorMessage } = fieldJson?.properties || {};

  // Find the input element within the field div
  const input = fieldDiv.querySelector('input');

  if (input) {
    // Set up min/max length constraints using the built-in setConstraints utility
    setConstraints(input, fieldJson);

    // Set up regex validation if pattern is provided
    if (regexPattern) {
      setupRegexValidation(input, regexPattern, regexErrorMessage, true);
    }
  }
}
