/* eslint-disable no-unused-vars */
import { subscribe } from '../../rules/index.js';
import { updateOrCreateInvalidMsg } from '../../util.js';

/**
 * CustomDatePickerComponent - A class-based implementation of a
 * custom-date-picker component extending Date Input.
 * This component replaces the native date picker with three separate
 * keyboard inputs for day, month, and year to provide a better mobile experience.
 */
class CustomDatePickerComponent {
  /**
   * Creates an instance of CustomDatePickerComponent
   * @param {HTMLElement} fieldDiv - The DOM element containing the field wrapper
   * @param {Object} fieldJson - The form json object for the component
   * @param {HTMLElement} parentElement - The parent element of the field
   * @param {string} formId - The unique identifier of the form
   */
  constructor(fieldDiv, fieldJson, parentElement, formId) {
    this.fieldDiv = fieldDiv;
    this.fieldJson = fieldJson;
    this.parentElement = parentElement;
    this.formId = formId;
    this.fieldModel = null;

    // Configuration properties
    this.propertyChanges = ['value', 'enabled', 'readOnly', 'visible', 'validationMessage'];
    this.customEvent = '';

    // Store references to the input elements
    this.dayInput = null;
    this.monthInput = null;
    this.yearInput = null;
    this.hiddenInput = null;
    this.calendarButton = null;
    this.pickerInput = null;

    // Track state for proper picker input management
    this.isDisabled = false;
    this.isReadOnly = false;
    this.placeholderElement = null;

    // Track if user has interacted (touched) the field
    this.touched = false;
  }

  /**
   * Creates the keyboard date picker inputs
   */
  createKeyboardInputs() {
    // Find the native date input
    const nativeDateInput = this.fieldDiv.querySelector('input');
    if (!nativeDateInput) return;

    // Get the field ID and name
    const fieldId = nativeDateInput.id;
    const fieldName = nativeDateInput.name;

    // Create container for the three inputs
    const inputContainer = document.createElement('div');
    inputContainer.className = 'custom-date-inputs';

    // Create day input
    this.dayInput = document.createElement('input');
    this.dayInput.type = 'tel';
    this.dayInput.inputMode = 'numeric';
    this.dayInput.pattern = '[0-9]*';
    this.dayInput.maxLength = 2;
    this.dayInput.placeholder = 'DD';
    this.dayInput.setAttribute('aria-label', 'Day');
    this.dayInput.className = 'date-input day-input';

    // Create month input
    this.monthInput = document.createElement('input');
    this.monthInput.type = 'tel';
    this.monthInput.inputMode = 'numeric';
    this.monthInput.pattern = '[0-9]*';
    this.monthInput.maxLength = 2;
    this.monthInput.placeholder = 'MM';
    this.monthInput.setAttribute('aria-label', 'Month');
    this.monthInput.className = 'date-input month-input';

    // Create year input
    this.yearInput = document.createElement('input');
    this.yearInput.type = 'tel';
    this.yearInput.inputMode = 'numeric';
    this.yearInput.pattern = '[0-9]*';
    this.yearInput.maxLength = 4;
    this.yearInput.placeholder = 'YYYY';
    this.yearInput.setAttribute('aria-label', 'Year');
    this.yearInput.className = 'date-input year-input';

    // Create separators
    const separator1 = document.createElement('span');
    separator1.className = 'date-separator';
    separator1.textContent = '/';

    const separator2 = document.createElement('span');
    separator2.className = 'date-separator';
    separator2.textContent = '/';

    // Append inputs and separators
    inputContainer.appendChild(this.dayInput);
    inputContainer.appendChild(separator1);
    inputContainer.appendChild(this.monthInput);
    inputContainer.appendChild(separator2);
    inputContainer.appendChild(this.yearInput);

    // Create calendar icon button (decorative, actual interaction is on pickerInput)
    const calendarButton = document.createElement('button');
    calendarButton.type = 'button';
    calendarButton.className = 'calendar-icon-btn';
    // Hide from screen readers since the actual input above it is accessible
    calendarButton.setAttribute('aria-hidden', 'true');
    calendarButton.setAttribute('tabindex', '-1');
    calendarButton.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    `;

    // Store reference to calendar button
    this.calendarButton = calendarButton;

    // Add calendar button to the container
    inputContainer.appendChild(calendarButton);

    // Create a separate date input specifically for the picker
    const pickerInput = document.createElement('input');
    pickerInput.type = 'date';
    pickerInput.className = 'date-picker-input';
    // Accessible label for screen readers
    pickerInput.setAttribute('aria-label', 'Select date from calendar');
    // Keep in normal tab order for keyboard accessibility
    pickerInput.setAttribute('tabindex', '0');

    // Position the picker input directly over the calendar button
    // This allows native clicks to work on mobile Safari without showPicker()
    pickerInput.style.position = 'absolute';
    pickerInput.style.left = '4px';
    pickerInput.style.top = '50%';
    pickerInput.style.transform = 'translateY(-50%)';
    pickerInput.style.width = '32px'; // Cover the button area
    pickerInput.style.height = '32px'; // Cover the button area
    pickerInput.style.opacity = '0.01'; // Nearly invisible but not 0 (iOS requirement)
    pickerInput.style.cursor = 'pointer';
    pickerInput.style.border = 'none';
    pickerInput.style.padding = '0';
    pickerInput.style.margin = '0';
    pickerInput.style.zIndex = '1'; // Above the calendar button
    pickerInput.style.visibility = 'hidden';

    // Store reference
    this.pickerInput = pickerInput;

    this.pickerInput.addEventListener('change', (e) => {
      e.stopPropagation();
    });

    // Add picker input to the container
    inputContainer.appendChild(pickerInput);
    // Create placeholder overlay (add last so it's on top in DOM order)
    const placeholder = document.createElement('div');
    placeholder.className = 'date-placeholder';
    const placeholderText = this.fieldJson.placeholder;
    placeholder.textContent = placeholderText;
    this.placeholderElement = placeholder;

    // Add placeholder to container
    inputContainer.appendChild(placeholder);

    // Hide the original native input (used for form submission only)
    nativeDateInput.style.position = 'absolute';
    nativeDateInput.style.left = '-9999px';
    nativeDateInput.style.width = '1px';
    nativeDateInput.style.height = '1px';
    nativeDateInput.style.opacity = '0';
    nativeDateInput.setAttribute('tabindex', '-1');
    this.hiddenInput = nativeDateInput;

    // this.hiddenInput.addEventListener('change', (e) => {
    //   e.stopPropagation();
    // });
    // Handle focus on the picker input
    pickerInput.addEventListener('focus', (e) => {
      // On mobile Safari, focus may trigger the picker automatically
      // For other browsers, we'll handle it in the click event
    });

    // Handle clicks on the picker input to open the calendar
    pickerInput.addEventListener('click', (e) => {
      e.stopPropagation();

      // Don't open calendar if disabled
      if (pickerInput.disabled) {
        e.preventDefault();
        return;
      }

      // Ensure input is focused first (important for mobile)
      if (document.activeElement !== pickerInput) {
        pickerInput.focus();
      }

      // Try showPicker for desktop browsers
      if (pickerInput.showPicker) {
        try {
          pickerInput.showPicker();
        } catch (error) {
          // showPicker not supported or failed
          // Mobile Safari should open naturally on click/focus
        }
      }
    });

    // Handle keyboard interaction (Enter/Space) on the picker input
    pickerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (pickerInput.showPicker) {
          try {
            pickerInput.showPicker();
          } catch (error) {
            // Fallback to click
            pickerInput.click();
          }
        } else {
          pickerInput.click();
        }
      }
    });

    // Handle clicks on the decorative button - delegate to pickerInput
    calendarButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Trigger click on the picker input
      pickerInput.click();
      pickerInput.focus();
    });

    // Listen to changes on the picker input (from calendar selection)
    pickerInput.addEventListener('change', () => {
      const { value } = pickerInput;
      if (value) {
        // Update the visible keyboard inputs
        this.updateInputsFromValue(value);

        // Update the hidden form submission input
        if (this.hiddenInput) {
          this.hiddenInput.value = value;
          this.hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Update the field model
        if (this.fieldModel) {
          this.fieldModel.value = value;
        }
        // Update placeholder visibility
        this.updatePlaceholderVisibility();
      } else {
        // Clear was clicked in the calendar - clear all inputs
        if (this.dayInput) this.dayInput.value = '';
        if (this.monthInput) this.monthInput.value = '';
        if (this.yearInput) this.yearInput.value = '';

        // Clear the hidden form submission input
        if (this.hiddenInput) {
          this.hiddenInput.value = '';
          this.hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Clear the field model
        if (this.fieldModel) {
          this.fieldModel.value = '';
        }
        // Update placeholder visibility
        this.updatePlaceholderVisibility();
      }
    });

    // Insert the keyboard inputs before the native input
    nativeDateInput.parentNode.insertBefore(inputContainer, nativeDateInput);

    // Set up event listeners for the inputs
    this.setupInputEventListeners();
    // Update placeholder visibility after everything is set up
    this.updatePlaceholderVisibility();
  }

  /**
   * Updates placeholder visibility based on whether inputs have values
   */
  updatePlaceholderVisibility() {
    if (!this.placeholderElement) return;

    const hasValue = this.dayInput?.value || this.monthInput?.value || this.yearInput?.value;
    const showPlaceholder = !hasValue;

    // Toggle placeholder visibility
    this.placeholderElement.style.opacity = showPlaceholder ? '1' : '0';

    // Toggle inputs and separators visibility
    if (this.dayInput) this.dayInput.style.opacity = showPlaceholder ? '0' : '1';
    if (this.monthInput) this.monthInput.style.opacity = showPlaceholder ? '0' : '1';
    if (this.yearInput) this.yearInput.style.opacity = showPlaceholder ? '0' : '1';

    // Hide separators when placeholder is visible
    const separators = this.dayInput?.parentElement?.querySelectorAll('.date-separator');
    if (separators) {
      separators.forEach((separator) => {
        separator.style.opacity = showPlaceholder ? '0' : '1';
      });
    }
  }

  /**
   * Shows the inputs and hides the placeholder (when user focuses on input)
   */
  showInputs() {
    if (this.placeholderElement) {
      this.placeholderElement.style.opacity = '0';
    }
    if (this.dayInput) this.dayInput.style.opacity = '1';
    if (this.monthInput) this.monthInput.style.opacity = '1';
    if (this.yearInput) this.yearInput.style.opacity = '1';

    const separators = this.dayInput?.parentElement?.querySelectorAll('.date-separator');
    if (separators) {
      separators.forEach((separator) => {
        separator.style.opacity = '1';
      });
    }
  }

  /**
   * Sets up event listeners for the keyboard inputs
   */
  setupInputEventListeners() {
    // Helper to clear all fields and update model/placeholder
    const clearAllFields = () => {
      this.dayInput.value = '';
      this.monthInput.value = '';
      this.yearInput.value = '';
      this.updateModelValue();
      this.updatePlaceholderVisibility();
    };

    function getMaxDay(month, year) {
      if (!month) return 31;
      return new Date(year || 2000, month, 0).getDate();
    }
    const validateDayAgainstMonthYear = () => {
      const day = parseInt(this.dayInput.value, 10);
      const month = parseInt(this.monthInput.value, 10);
      const year = parseInt(this.yearInput.value, 10);

      if (!day || !month) return false;

      const maxDay = getMaxDay(month, year);
      return day < 1 || day > maxDay;
    };
    // Block non-numeric keys on all inputs
    [this.dayInput, this.monthInput, this.yearInput].forEach((input) => {
      input.addEventListener('keydown', (e) => {
        // Allow: 0-9, Backspace, Delete, Tab, Arrow keys, Home, End
        const isNumber = e.key >= '0' && e.key <= '9';
        const isControl = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key);
        if (!isNumber && !isControl) {
          e.preventDefault();
        }
      });
      // Show inputs when any field receives focus and handle floating labels
      input.addEventListener('focus', () => {
        this.showInputs();
        // Floating label support: set data-active on focus and add class
        this.fieldDiv.dataset.active = 'true';
        this.fieldDiv.classList.add('floating-label-active');
        this.updateFloatingLabelEmpty();
      });
      // Floating label support: remove data-active on blur (if focus leaves the component)
      input.addEventListener('blur', () => {
        // Delay to check if focus moved within the component
        setTimeout(() => {
          if (!this.fieldDiv.contains(document.activeElement)) {
            delete this.fieldDiv.dataset.active;
            this.fieldDiv.classList.remove('floating-label-active');
            // Mark as touched when user leaves the field
            this.touched = true;
            // Show inline error if date is incomplete (some fields filled but not all)
            const hasDay = !!this.dayInput?.value;
            const hasMonth = !!this.monthInput?.value;
            const hasYear = !!this.yearInput?.value;
            const anyFilled = hasDay || hasMonth || hasYear;
            const allFilled = hasDay && hasMonth && hasYear && this.yearInput.value.length === 4;
            if (anyFilled && !allFilled) {
              updateOrCreateInvalidMsg(this.fieldDiv, 'Please enter a complete date (DD/MM/YYYY).');
            } else if (this.fieldModel) {
              this.updateView(this.fieldModel.getState());
            }
          }
          this.updateFloatingLabelEmpty();
        }, 0);
      });
    });

    // Auto-advance to next field on valid input

    this.dayInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length === 2 && value === '00') {
        value = '01';
      } else if (value.length === 2) {
        const numValue = parseInt(value, 10);
        if (numValue > 31 || numValue < 1) {
          value = value.slice(0, -1);
        }
      }

      e.target.value = value;
      if (value.length === 2) {
        e.target.value = value.padStart(2, '0');
        if (validateDayAgainstMonthYear()) {
          clearAllFields();
          return;
        }
        this.monthInput.focus();
      }
      this.updateModelValue();
      this.updatePlaceholderVisibility();
    });

    this.monthInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      // If user enters 00, auto-correct to 01 when moving to year
      if (value.length === 2 && value === '00') {
        value = '01';
      } else if (value.length === 2) {
        const numValue = parseInt(value, 10);
        if (numValue > 12 || numValue < 1) {
          // Remove the last character that made it invalid
          value = value.slice(0, -1);
        }
      }
      e.target.value = value;
      if (value.length === 2) {
        e.target.value = value.padStart(2, '0');
        if (validateDayAgainstMonthYear()) {
          clearAllFields();
          return;
        }
        this.yearInput.focus();
      }
      this.updateModelValue();
      this.updatePlaceholderVisibility();
    });

    this.yearInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      // If user enters 0000, auto-correct to 0001
      if (value.length === 4 && value === '0000') {
        value = '0001';
      } else if (value.length === 4 && validateDayAgainstMonthYear()) {
      // keep inputs, validation will show error instead
      this.updateModelValue();
      return;
      }
      e.target.value = value;
      this.updateModelValue();
      this.updatePlaceholderVisibility();
    });

    // Prevent the form level change handler from being triggered
    this.dayInput.addEventListener('change', (e) => {
      e.stopPropagation();
    });

    this.monthInput.addEventListener('change', (e) => {
      e.stopPropagation();
    });

    this.yearInput.addEventListener('change', (e) => {
      e.stopPropagation();
    });

    // Handle backspace navigation
    this.monthInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && e.target.value === '') {
        this.dayInput.focus();
        // Select all text in day input for easy editing
        setTimeout(() => this.dayInput.select(), 0);
      }
    });

    this.yearInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && e.target.value === '') {
        this.monthInput.focus();
        // Select all text in month input for easy editing
        setTimeout(() => this.monthInput.select(), 0);
      }
    });

    // Validate and format only on blur (when leaving the entire component)
    [this.dayInput, this.monthInput, this.yearInput].forEach((input) => {
      input.addEventListener('blur', (e) => {
        // Auto-correct single '0' to '01' for day and month on blur
        if (e.target === this.dayInput && e.target.value === '0') {
          e.target.value = '01';
        }
        if (e.target === this.monthInput && e.target.value === '0') {
          e.target.value = '01';
        }
        // Auto-correct year input: if '0', '00', '000', or '0000', set to '0001'
        if (e.target === this.yearInput && (/^0{1,4}$/.test(e.target.value))) {
          e.target.value = '0001';
        }

        // Only format if the user has finished with this field
        // Don't format if they're just moving between fields within the component
        setTimeout(() => {
          // Check if focus moved outside the date input component
          if (!this.fieldDiv.contains(document.activeElement)) {
            this.validateAndFormat();
            // Update placeholder visibility when focus leaves the component
            this.updatePlaceholderVisibility();
          }
        }, 0);
      });
    });
  }

  /**
   * Validates and formats the input values
   */
  validateAndFormat() {
    // Pad day and month with leading zeros if needed
    if (this.dayInput.value && this.dayInput.value.length === 1) {
      this.dayInput.value = this.dayInput.value.padStart(2, '0');
    }
    if (this.monthInput.value && this.monthInput.value.length === 1) {
      this.monthInput.value = this.monthInput.value.padStart(2, '0');
    }

    // Sync model — updateModelValue handles both the complete and incomplete cases:
    // complete → sets model value; incomplete → clears model value so validation fires.
    // Do NOT clear the DOM inputs here; leave partial values visible so the user
    // can see what they entered and the inline validation error is meaningful.
    this.updateModelValue();
    this.updatePlaceholderVisibility();
  }
  /**
     * Updates the floating label empty state based on whether any input has a value
     */
    updateFloatingLabelEmpty() {
      const hasValue = this.dayInput?.value || this.monthInput?.value || this.yearInput?.value;
      this.fieldDiv.dataset.empty = !hasValue;
    }

  /**
   * Updates the picker input value (calendar widget)
   * @param {string} value - Date string in YYYY-MM-DD format or empty string
   */
  updatePickerInput(value) {
    if (this.pickerInput) {
      this.pickerInput.value = value;
    }
  }

  /**
   * Updates the picker input and calendar button disabled state
   * Should be disabled if field is disabled OR readonly
   */
  updatePickerDisabledState() {
    const shouldBeDisabled = this.isDisabled || this.isReadOnly;
    if (this.pickerInput) {
      this.pickerInput.disabled = shouldBeDisabled;
      this.pickerInput.style.pointerEvents = shouldBeDisabled ? 'none' : 'auto';
    }
    if (this.calendarButton) {
      this.calendarButton.disabled = shouldBeDisabled;
    }
  }

  /**
   * Updates the model value based on the keyboard inputs
   */
updateModelValue() {
  const day = this.dayInput.value.padStart(2, '0');
  const month = this.monthInput.value.padStart(2, '0');
  const year = this.yearInput.value;

  // Update floating label state
  this.updateFloatingLabelEmpty();

  // Only proceed when full date exists
  if (day.length === 2 && month.length === 2 && year.length === 4) {
    const dateString = `${year}-${month}-${day}`;
    const date = new Date(dateString);

    if (!Number.isNaN(date.getTime())) {
      this.updatePickerInput(dateString);

      if (this.hiddenInput) {
        this.hiddenInput.value = dateString;
        this.hiddenInput.dispatchEvent(new Event('change', { bubbles: false }));
      }

      if (this.fieldModel) {
        this.fieldModel.value = dateString;
      }
    }
  } else {
    // Date is incomplete — clear the model so that blur/mouseout does not
    // restore the previous value via updateView()
    this.updatePickerInput('');

    if (this.hiddenInput) {
      this.hiddenInput.value = '';
      this.hiddenInput.dispatchEvent(new Event('change', { bubbles: false }));
    }

    if (this.fieldModel) {
      this.fieldModel.value = '';
    }
  }
}

  /**
   * Updates the keyboard inputs based on the model value
   */
  updateInputsFromValue(value) {
   if (!this.dayInput || !this.monthInput || !this.yearInput) {
       return;
   }
  if (!value) {
      // Clear all inputs if value is empty
      this.dayInput.value = '';
      this.monthInput.value = '';
      this.yearInput.value = '';
      this.updatePickerInput('');
      this.updateFloatingLabelEmpty();
      return;
    }

    // Parse the date value (expected format: YYYY-MM-DD)
    const dateParts = value.split('-');
    if (dateParts.length === 3) {
      const [year, month, day] = dateParts;
      this.yearInput.value = year;
      this.monthInput.value = month;
      this.dayInput.value = day;
      // set the picker when value is set from the model
      this.updatePickerInput(value);
      // Update placeholder visibility
      this.updatePlaceholderVisibility();
    }
     // Update floating label state
      this.updateFloatingLabelEmpty();
  }

  /**
   * Updates the form field HTML based on current state
   */
  updateView(state) {
    if (!state) return;

    // Only sync model → DOM inputs when the model holds a real date value.
    // When state.value is empty (incomplete entry cleared by updateModelValue),
    // leave the DOM inputs as-is so partial values (e.g. DD/MM without YYYY)
    // stay visible and the inline validation error is meaningful.
    // Also skip if the user is still actively editing inside the component.
    if (state.value && !this.fieldDiv.contains(document.activeElement)) {
      this.updateInputsFromValue(state.value);
    }

    // Handle enabled state
    if (state.enabled !== undefined) {
      const disabled = !state.enabled;
      this.isDisabled = disabled;
      if (this.dayInput) this.dayInput.disabled = disabled;
      if (this.monthInput) this.monthInput.disabled = disabled;
      if (this.yearInput) this.yearInput.disabled = disabled;
      // Update picker and calendar button based on both disabled and readonly states
      this.updatePickerDisabledState();
    }

    // Handle readOnly state
    if (state.readOnly !== undefined) {
      this.isReadOnly = state.readOnly;
      if (this.dayInput) this.dayInput.readOnly = state.readOnly;
      if (this.monthInput) this.monthInput.readOnly = state.readOnly;
      if (this.yearInput) this.yearInput.readOnly = state.readOnly;
      // Update picker and calendar button based on both disabled and readonly states
      this.updatePickerDisabledState();
    }

    // Handle visibility
    if (state.visible !== undefined && this.fieldDiv) {
      this.fieldDiv.style.display = state.visible ? '' : 'none';
    }

    if (state.validationMessage && this.touched) {
      // Replace the generic AEM model format-violation message with a proper one
      const updatedMsg = state.validationMessage.toLowerCase().includes('allowed format')
        ? 'Please Enter Valid Date.'
        : state.validationMessage;
      updateOrCreateInvalidMsg(this.fieldDiv, updatedMsg);
    } else {
      // Clear error if not touched
      updateOrCreateInvalidMsg(this.fieldDiv, '');
    }
  }

  /**
   * Clears all date input fields and resets the component state
   * This method is used when the field value is programmatically set to null,
   * ensuring a complete reset of the date picker component.
   * 
   * @param {boolean} resetTouched - 
   * Whether to reset the touched state (default: true)
   * When true, the field returns to pristine state and won't
   * show validation errors until the user interacts again.
   * Set to false if you want to keep validation errors visible.
   */
  clearDateInputs(resetTouched = true) {
    this.updateInputsFromValue('');
    if (this.hiddenInput) {
        this.hiddenInput.value = '';
    }
    updateOrCreateInvalidMsg(this.fieldDiv, '');
    if (resetTouched) {
        this.touched = false;
    }
    this.updatePlaceholderVisibility();
    this.updateFloatingLabelEmpty();
}

  /**
   * Attaches event listeners to the form model
   * Listens to property changes and custom events and updates the view accordingly
   */
  attachEventListeners() {
    if (!this.fieldModel) {
      return;
    }

    // Listen for property changes
    this.fieldModel.subscribe((event) => {
      event?.payload?.changes?.forEach((change) => {

        if (change?.propertyName === 'value' && change?.currentValue == null) {
          this.clearDateInputs();
        }
        
        if (this.propertyChanges.includes(change?.propertyName)) {
          this.updateView(this.fieldModel.getState());
        }
      });
    }, 'change');

    // Listen for custom events
    if (this.customEvent) {
      this.fieldModel.subscribe(() => {
        this.updateView(this.fieldModel.getState());
      }, this.customEvent);
    }
  }

  /**
   * Sets the minimum and maximum age based on the field properties
   */
  setMinMaxAgeConstraints() {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formatDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    if (this.fieldJson?.name === 'dateOfAcknowledgement') {
      const maxDate = new Date(today); // today
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() - 90); // today - 90 days

      this.fieldModel.maximum = formatDate(maxDate);
      this.fieldModel.minimum = formatDate(minDate);
      return;
    }

    if (this.fieldJson.properties?.minAge !== undefined) {
      const minAge = Number(this.fieldJson.properties.minAge);
      const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
      this.fieldModel.maximum = formatDate(maxDate);
    }

    if (this.fieldJson.properties?.maxAge !== undefined) {
      const maxAge = Number(this.fieldJson.properties.maxAge);
      const minDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
      this.fieldModel.minimum = formatDate(minDate);
    }
  }

  /**
   * Initializes the form field component
   * Sets up the initial view and subscribes to form model changes
   */
  async initialize() {
    // Create the keyboard inputs
    this.createKeyboardInputs();

    // Update the view with initial data
    this.updateView(this.fieldJson);

  // Set initial floating label state
    this.updateFloatingLabelEmpty();

    // Subscribe to form model changes
    subscribe(this.fieldDiv, this.formId, (element, model) => {
      this.fieldModel = model;
      this.attachEventListeners();
      this.setMinMaxAgeConstraints();
      // Update view with current model state
      this.updateView(model.getState());
    });
  }
}

/**
 * Decorates a custom form field component
 * @param {HTMLElement} fieldDiv - The DOM element containing the field wrapper
 * @param {Object} fieldJson - The form json object for the component
 * @param {HTMLElement} parentElement - The parent element of the field
 * @param {string} formId - The unique identifier of the form
 */
export default async function decorate(fieldDiv, fieldJson, parentElement, formId) {
  const field = new CustomDatePickerComponent(fieldDiv, fieldJson, parentElement, formId);
  await field.initialize();
}
