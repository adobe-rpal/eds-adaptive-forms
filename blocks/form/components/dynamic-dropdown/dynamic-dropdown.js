import { subscribe } from '../../rules/index.js';

/**
 * Creates an editable dropdown that allows both selection from options and custom text input
 * @param {HTMLElement} fieldDiv - Container for the field
 * @param {Object} fieldJson - Field configuration data
 * @param {HTMLElement} container - Parent container
 * @param {string} formId - ID of the form
 */
const getEnumName = (value, model) => {
  if (!model?.enum || !Array.isArray(model.enum)) {
    return undefined;
  }

  const normalize = (v) =>
    typeof v === "string" ? v.trim().toLowerCase() : v;

  const searchValue = normalize(value);

  const index = model.enum.findIndex((item) => normalize(item) === searchValue);

  if (index !== -1) {
    if (model.enumNames?.[index] !== undefined) {
      return model.enumNames[index];
    }
    if (model.enum?.[index] !== undefined) {
      return model.enum[index];
    }
  }

  return undefined;
};

const getEnum = (value, model) => {
  if (!model?.enum || !Array.isArray(model.enum)) {
    return undefined;
  }

  const normalize = (v) =>
    typeof v === "string" ? v.trim().toLowerCase() : v;

  const searchValue = normalize(value);

  const index = model.enum.findIndex((item) => normalize(item) === searchValue);

  if (index !== -1) {
    if (model.enum?.[index] !== undefined) {
      model.valid = true;
      model.errorMessage='';
      return model.enum[index];
    }
  }

  return undefined;
};


export default function decorate(fieldDiv, fieldJson, container, formId) {
  // Get the existing select element
  const select = fieldDiv.querySelector('select');

  if (!select) {
    return fieldDiv;
  }

  // Create a wrapper to hold both the input and custom dropdown
  const wrapper = document.createElement('div');
  wrapper.className = 'dynamic-dropdown-wrapper';

  // Create text input for user entry
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'dynamic-dropdown-input';
  input.placeholder = fieldJson.placeholder || '';
  // Set disabled
  if (fieldJson.enabled === false) {
    input.disabled = true; // Setting input to disabled if fieldJson contains enabled as false.
  }

  // Create custom dropdown container
  const dropdownList = document.createElement('div');
  dropdownList.className = 'dynamic-dropdown-list';

  // Add elements to wrapper
  wrapper.appendChild(input);
  wrapper.appendChild(dropdownList);

  // Hide the original select
  select.style.display = 'none';

  // Add the wrapper to fieldDiv
  fieldDiv.appendChild(wrapper);

  // State management variables for placeholder handling
  let hasUserInput = false;
  let isFromSelection = false;

  // Helper function to check if input has actual user content
  const hasActualContent = () => {
    return input.value.trim() !== '' && hasUserInput;
  };

  // Helper function to get filter text (excluding placeholder)
  const getFilterText = () => {
    return hasActualContent() ? input.value.trim() : '';
  };

  // Helper function to update field state classes
  const updateFieldState = () => {
    const hasContent = hasActualContent();
    wrapper.classList.toggle('has-content', hasContent);
    wrapper.classList.toggle('is-empty', !hasContent);
  };

  // Function to populate dropdown options
  const populateDropdown = (filterText = '') => {
    dropdownList.innerHTML = '';
    const options = Array.from(select.options);

    // Filter out placeholder options (empty value or matches placeholder text)
    const validOptions = options.filter((opt) => {
      return opt.value !== '' &&
             opt.text !== fieldJson.placeholder &&
             opt.text.trim() !== '' &&
             !opt.disabled;
    });

    const filteredOptions = filterText.trim() !== ''
      ? validOptions.filter((opt) => opt.text.toLowerCase().includes(filterText.toLowerCase()))
      : validOptions;

    if (filteredOptions.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'dropdown-no-results';
      noResults.textContent = 'No matching options';
      dropdownList.appendChild(noResults);
    } else {
      filteredOptions.forEach((option) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'dropdown-option';
        optionElement.textContent = option.text;

        // Select option on click
        optionElement.addEventListener('mousedown', (e) => {
          e.preventDefault(); // Prevent input from losing focus

          // Mark as selection (not user input)
          isFromSelection = true;
          hasUserInput = true; // This is now valid content

          input.value = option.text;
          select.value = option.value;

          // Update field state
          updateFieldState();

          // Trigger change event on select
          select.dispatchEvent(new Event('change', { bubbles: true }));

          // Hide dropdown
          dropdownList.style.display = 'none';

          // Reset selection flag after brief delay
          setTimeout(() => {
            isFromSelection = false;
          }, 10);
        });

        dropdownList.appendChild(optionElement);
      });
    }
  };

  // Sync input with select's selected option. Prefer enum name over option text when fieldModel has
  // enumNames (createDropdownUsingEnum can set option.text = enum value when lengths don't match).
  const syncInputWithSelect = (fieldModel) => {
    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption &&
        selectedOption.value !== '' &&
        selectedOption.text !== fieldJson.placeholder &&
        selectedOption.text.trim() !== '' &&
        !selectedOption.disabled) {
      isFromSelection = true;
      hasUserInput = true;
      const displayText = (fieldModel && getEnumName(select.value, fieldModel)) ?? selectedOption.text;
      input.value = displayText;
      updateFieldState();
      setTimeout(() => {
        isFromSelection = false;
      }, 10);
    } else {
      // Clear state if no valid selection
      hasUserInput = false;
      input.value = '';
      updateFieldState();
    }
  };

  // Initial sync (no model yet)
  syncInputWithSelect(null);

  let model = null;
  subscribe(fieldDiv, formId, (_fieldDiv, fieldModel) => {
    model = fieldModel;
    const skipFields = ['city', 'state', 'branchstate', 'branchname', 'branchcity'];
    // Restore/prefill: resolve value to display name above subscribe so it runs before change handler.
    // Set model.value to the enum value (e.g. MUMBAI) when prefill has different case (e.g. Mumbai)
    // so case-insensitive match is normalized and component stays valid.
    if (model.value != null && model.value !== '' && !skipFields.includes(model?.name?.toLowerCase())) {
      const enumName = getEnumName(model.value, model);
      const val = getEnum(model.value, model);
      if (enumName !== undefined && val !== undefined && model.name) {
        isFromSelection = true;
        hasUserInput = true;
        input.value = enumName;
        model.value = val;
        select.value = val;
        model.valid = true;
        updateFieldState();
        setTimeout(() => {
          isFromSelection = false;
        }, 10);
      }
    }
    if(skipFields.includes(model?.name?.toLowerCase())){
      model.value = undefined;
    }
    fieldModel.subscribe((e) => {
      const { payload } = e;
      payload?.changes?.forEach((change) => {
        if (change?.propertyName === 'enumNames') {
          populateDropdown();
          if (document.activeElement === input) {
            dropdownList.style.display = 'block';
          }
          // Handling case during prefill where value is set before enum and enumNames are set.
          const enumName = getEnumName(model.value, model);
          if (enumName !== undefined) {
            input.value = enumName;
          }
        }else if (change?.propertyName === 'enum') {
          populateDropdown();
          if (document.activeElement === input) {
            dropdownList.style.display = 'block';
          }
          // Handling case during prefill where value is set before enum and enumNames are set.
          const enumName = getEnumName(model.value, model);
          if (enumName !== undefined) {
            input.value = enumName;
          }
        } else if (change?.propertyName === 'value') {
          // Handle value being set to null/empty (e.g., by form rules or dependencies)
          if (change.currentValue === null || change.currentValue === '') {
            hasUserInput = false;
            input.value = '';
            select.value = '';
            updateFieldState();
          } else if (model.enumNames && typeof model.enumNames === 'object' && model.enumNames.length > 0) {
            const index = model.enum.indexOf(change.currentValue);
            if (index !== -1 &&
                model.enumNames[index] !== fieldJson.placeholder &&
                model.enumNames[index].trim() !== '' &&
                change.currentValue !== '') {
              isFromSelection = true;
              hasUserInput = true;
              input.value = model.enumNames[index];
              updateFieldState();
              setTimeout(() => {
                isFromSelection = false;
              }, 10);
            }
          }
        }
      });
    }, 'change');
  });

  // Event listeners
  input.addEventListener('focus', () => {
    wrapper.classList.add('is-focused');
    const filterText = getFilterText();
    populateDropdown(filterText);
    dropdownList.style.display = 'block';
  });

  input.addEventListener('blur', (event) => {
    if (model.value !== null && model.value !== '' && model.valid === false) {
      const errorMessage = (model._jsonModel && model._jsonModel.constraintMessages && model._jsonModel.constraintMessages.validationExpression)
                           ? model._jsonModel.constraintMessages.validationExpression
                           : 'Please select a valid option';
        model.markAsInvalid(errorMessage);
    } else {
        model.markAsInvalid('');
    }
  });

  input.addEventListener('input', (e) => {
    e.stopPropagation();

    // Only mark as user input if not coming from selection
    if (!isFromSelection) {
      const inputHasContent = input.value.trim() !== '';
      hasUserInput = inputHasContent;

      // If input becomes empty, clear model value
      if (!inputHasContent && model) {
        model.value = null;
        select.value = ''; // Clear underlying select as well
      }
    }

    const filterText = getFilterText();
    populateDropdown(filterText);
    dropdownList.style.display = 'block';
    updateFieldState();

    if (model && hasActualContent()) {
      model.value = input.value;
    }
  });

  input.addEventListener('blur', () => {
    wrapper.classList.remove('is-focused');

    // Small delay to allow option clicks to register
    setTimeout(() => {
      dropdownList.style.display = 'none';

      // If input is empty after blur, reset state completely
      if (input.value.trim() === '') {
        hasUserInput = false;
        input.value = ''; // Ensure input is actually empty
        select.value = ''; // Clear underlying select
        updateFieldState();

        // Clear model value if available
        if (model) {
          model.value = null;
        }
      }
    }, 150);
  });

  // When select changes programmatically, update the input
  select.addEventListener('change', () => {
    syncInputWithSelect(model);
  });

  // When user clicks outside, close dropdown
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      dropdownList.style.display = 'none';
      wrapper.classList.remove('is-focused');
    }
  });

  input.addEventListener('change', (e) => {
    e.stopPropagation(); // this need not be propagated to the form
  });

  return fieldDiv;
}