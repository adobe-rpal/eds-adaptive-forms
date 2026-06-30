import { subscribe } from '../../rules/index.js';
import { updateOrCreateInvalidMsg } from '../../util.js';

/**
 * Validates and formats PAN input
 * @param {HTMLElement} input - The input element
 * @param {object} fieldJson - The field json.
 * @param {string} fourthChar - The allowed fourth character (defaults to 'P')
 */
function setupPANValidation(input, fieldJson, fourthChar = 'P') {
  // PAN format: First 5 chars are letters, next 4 are numbers, last char is letter
  // The fourth character is configurable (P, H, or any letter)
  const createPANRegex = (char) => new RegExp(`^[A-Z]{3}${char}[A-Z]\\d{4}[A-Z]$`);

  const formatPAN = (inputValue) => {
    // Convert to uppercase and remove non-alphanumeric characters
    const cleanValue = inputValue.toUpperCase().replace(/[^A-Z0-9]/g, '');

     const chars = cleanValue.split('');

         const formatted = chars.map((char, index) => {

           // first 3 characters alphabets only
           if (index < 3) {
             return /[A-Z]/.test(char) ? char : '';
           }

           // 4th character must be specific letter (P)
           if (index === 3) {
             return char === fourthChar ? char : '';
           }

           // 5th character alphabet only
           if (index === 4) {
             return /[A-Z]/.test(char) ? char : '';
           }

           // 6-9 numeric only
           if (index >= 5 && index <= 8) {
             return /[0-9]/.test(char) ? char : '';
           }

           // last character alphabet only
           if (index === 9) {
             return /[A-Z]/.test(char) ? char : '';
           }

           return '';

         }).join('');

         return formatted.slice(0, 10);
       };

  const validatePAN = (value) => {
    const regex = createPANRegex(fourthChar);
    return regex.test(value);
  };

  const handleValidation = (value) => {
      if (value.length === 10) {
        if (!validatePAN(value)) {
          updateOrCreateInvalidMsg(input, `Invalid PAN format. Fourth character must be ${fourthChar}`);
        } else {
          updateOrCreateInvalidMsg(input, '');
        }
      } else if (value.length > 0) {
        updateOrCreateInvalidMsg(input, 'PAN must be 10 characters long');
      } else {
        updateOrCreateInvalidMsg(input, '');
      }
    };

  // Handle input events
  input.addEventListener('input', (e, fieldJson) => {
    const formattedValue = formatPAN(e.target.value);
    if (formattedValue !== e.target.value) {
      e.target.value = formattedValue;
    }
   handleValidation(formattedValue);
  });

  input.addEventListener('blur', (e) => {
      const formattedValue = formatPAN(e.target.value);
      if(formattedValue === ''){
      e.target.value = '';
      }
      handleValidation(formattedValue);
  });

  // // Handle paste events
  // input.addEventListener('paste', (e) => {
  //   e.preventDefault();
  //   const pastedText = (e.clipboardData || window.clipboardData).getData('text');
  //   const formattedValue = formatPAN(pastedText);
  //   if (formattedValue !== e.target.value) {
  //     e.target.value = formattedValue;
  //   }

  //   // Directly run the validation logic (do not dispatch 'input' event)
  //   if (formattedValue.length === 10) {
  //     if (!validatePAN(formattedValue)) {
  //       updateOrCreateInvalidMsg(input, `Invalid PAN format. Fourth character must be ${fourthChar}`);
  //     } else {
  //       updateOrCreateInvalidMsg(input, '');
  //     }
  //   } else if (formattedValue.length > 0) {
  //     updateOrCreateInvalidMsg(input, 'PAN must be 10 characters long');
  //   } else {
  //     updateOrCreateInvalidMsg(input, '');
  //   }
  // });
}

export default function decorate(fieldDiv, fieldJson, container, formId) {
  const input = fieldDiv.querySelector('input');
  const { properties: { fourthChar = 'P' } = {} } = fieldJson || {};

  if (input) {
    // Set maxlength attribute
    input.setAttribute('maxlength', '10');

    // Initialize PAN validation
    setupPANValidation(input, fieldJson, fourthChar);

    subscribe(fieldDiv, formId, (_fieldDiv, fieldModel) => {
     const panCheckbox = document.querySelector('input[name="panNotAvailableCheckbox"]');
       if (panCheckbox) {
         panCheckbox.addEventListener('change', () => {
          if (panCheckbox.checked) {
            updateOrCreateInvalidMsg(input, '');
          }
        });
       }
       // Subscribe to field validated - To add a class
      fieldModel.subscribe(() => {
        _fieldDiv.classList.add('fieldValidated');
      }, 'fieldValidated');

       // Subscribe to field validated - To remove a class
      fieldModel.subscribe(() => {
        _fieldDiv.classList.remove('fieldValidated');
      }, 'removeFieldValidatedProperty');
    });
  }
}
