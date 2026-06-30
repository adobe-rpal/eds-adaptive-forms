import { subscribe } from '../../rules/index.js';

/**
 * Health Member Selector Component
 * Allows selection of health insurance members with validation for max 2 children
 */
export default function decorate(element, fd, container, formId) {
  const {
    myselfLabel = 'Myself',
    spouseLabel = 'Spouse',
    sonLabel = 'Son',
    daughterLabel = 'Daughter',
    maxChildren = 2,
    maxAdults = 2,
    maxChildrenErrorMessage = 'Maximum 2 children can be selected'
  } = fd?.properties || {};

  // State management
  let state = {
    myself: true,
    spouse: false,
    son: { selected: false, count: 0 },
    daughter: { selected: false, count: 0 }
  };

  /**
   * Create the member selection UI
   */
  function createMemberUI() {
    const wrapper = document.createElement('div');
    wrapper.className = 'health-member-selector';

    // Container for member cards
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'health-member-cards';

    // Create member cards
    cardsContainer.appendChild(createMyselfCard());
    cardsContainer.appendChild(createSpouseCard());
    cardsContainer.appendChild(createChildCard('son', sonLabel));
    cardsContainer.appendChild(createChildCard('daughter', daughterLabel));

    wrapper.appendChild(cardsContainer);
    return wrapper;
  }

  /**
   * Create Myself card (always selected, disabled)
   */
  function createMyselfCard() {
    const card = document.createElement('div');
    card.className = 'health-member-card health-member-selected';
    card.dataset.member = 'myself';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${fd.id}-myself`;
    checkbox.checked = true;
    checkbox.disabled = true;
    checkbox.className = 'health-member-checkbox';

    const label = document.createElement('label');
    label.htmlFor = `${fd.id}-myself`;
    label.textContent = myselfLabel;
    label.className = 'health-member-label';

    const checkIcon = document.createElement('span');
    checkIcon.className = 'health-member-check-icon';

    card.appendChild(checkbox);
    card.appendChild(checkIcon);
    card.appendChild(label);

    return card;
  }

  /**
   * Create Spouse card (optional selection)
   */
  function createSpouseCard() {
    const card = document.createElement('div');
    card.className = 'health-member-card';
    card.dataset.member = 'spouse';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${fd.id}-spouse`;
    checkbox.checked = false;
    checkbox.className = 'health-member-checkbox';

    const label = document.createElement('label');
    label.htmlFor = `${fd.id}-spouse`;
    label.textContent = spouseLabel;
    label.className = 'health-member-label';

    const checkIcon = document.createElement('span');
    checkIcon.className = 'health-member-check-icon';

    card.appendChild(checkbox);
    card.appendChild(checkIcon);
    card.appendChild(label);

    // Add event listener for spouse selection
    checkbox.addEventListener('change', () => {
      state.spouse = checkbox.checked;
      updateCardSelection(card, checkbox.checked);
      updateFieldValue();
    });

    // Add click handler to card for better UX (since checkbox is hidden)
    card.addEventListener('click', (e) => {
      // Prevent double-firing if checkbox itself is clicked
      if (e.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    });

    return card;
  }

  /**
   * Create Child card (Son/Daughter with counter controls)
   */
  function createChildCard(type, label) {
    const card = document.createElement('div');
    card.className = 'health-member-card health-member-child-card';
    card.dataset.member = type;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${fd.id}-${type}`;
    checkbox.checked = false;
    checkbox.className = 'health-member-checkbox';

    const labelElement = document.createElement('label');
    labelElement.htmlFor = `${fd.id}-${type}`;
    labelElement.textContent = label;
    labelElement.className = 'health-member-label';

    const checkIcon = document.createElement('span');
    checkIcon.className = 'health-member-check-icon';

    // Counter controls container
    const counterContainer = document.createElement('div');
    counterContainer.className = 'health-member-counter';

    // Decrement button
    const decrementBtn = document.createElement('button');
    decrementBtn.type = 'button';
    decrementBtn.className = 'health-member-counter-btn health-member-decrement';
    decrementBtn.innerHTML = '−';
    decrementBtn.disabled = true;

    // Counter display
    const counterDisplay = document.createElement('span');
    counterDisplay.className = 'health-member-counter-display';
    counterDisplay.textContent = '0';

    // Increment button
    const incrementBtn = document.createElement('button');
    incrementBtn.type = 'button';
    incrementBtn.className = 'health-member-counter-btn health-member-increment';
    incrementBtn.innerHTML = '+';

    counterContainer.appendChild(decrementBtn);
    counterContainer.appendChild(counterDisplay);
    counterContainer.appendChild(incrementBtn);

    card.appendChild(checkbox);
    card.appendChild(checkIcon);
    card.appendChild(labelElement);
    card.appendChild(counterContainer);

    // Event listeners for counter buttons
    incrementBtn.addEventListener('click', () => {
      handleCounterChange(type, 'increment', card, checkbox, counterDisplay, incrementBtn, decrementBtn);
    });

    decrementBtn.addEventListener('click', () => {
      handleCounterChange(type, 'decrement', card, checkbox, counterDisplay, incrementBtn, decrementBtn);
    });

    // Checkbox change handler
    checkbox.addEventListener('change', () => {
      if (!checkbox.checked) {
        // Reset count when unchecked
        state[type].count = 0;
        state[type].selected = false;
        counterDisplay.textContent = '0';
        decrementBtn.disabled = true;
        updateCardSelection(card, false);
        updateControlStates();
        updateFieldValue();
      }
    });

    return card;
  }

  /**
   * Handle counter increment/decrement
   */
  function handleCounterChange(type, action, card, checkbox, counterDisplay, incrementBtn, decrementBtn) {
    const currentCount = state[type].count;
    const otherType = type === 'son' ? 'daughter' : 'son';
    const otherCount = state[otherType].count;
    const totalChildren = currentCount + otherCount;

    if (action === 'increment') {
      // Check if we can increment
      if (totalChildren >= maxChildren) {
        // Show error message
        showError(maxChildrenErrorMessage);
        return;
      }

      state[type].count += 1;
      state[type].selected = true;
      checkbox.checked = true;
      updateCardSelection(card, true);
    } else if (action === 'decrement') {
      if (currentCount > 0) {
        state[type].count -= 1;
        if (state[type].count === 0) {
          state[type].selected = false;
          checkbox.checked = false;
          updateCardSelection(card, false);
        }
      }
    }

    // Update display
    counterDisplay.textContent = state[type].count;

    // Update button states
    decrementBtn.disabled = state[type].count === 0;

    // Update control states for both children
    updateControlStates();
    updateFieldValue();
  }

  /**
   * Update control states based on validation rules
   * NEW LOGIC: Only disable increment buttons and other child's card, never disable card with count > 0
   */
  function updateControlStates() {
    const sonCount = state.son.count;
    const daughterCount = state.daughter.count;
    const totalChildren = sonCount + daughterCount;

    const sonCard = element.querySelector('[data-member="son"]');
    const daughterCard = element.querySelector('[data-member="daughter"]');

    if (!sonCard || !daughterCard) return;

    const sonIncrement = sonCard.querySelector('.health-member-increment');
    const daughterIncrement = daughterCard.querySelector('.health-member-increment');
    const sonCheckbox = sonCard.querySelector('.health-member-checkbox');
    const daughterCheckbox = daughterCard.querySelector('.health-member-checkbox');

    // Reset all states first
    sonCard.classList.remove('health-member-disabled');
    daughterCard.classList.remove('health-member-disabled');
    sonIncrement.disabled = false;
    daughterIncrement.disabled = false;
    sonCheckbox.disabled = false;
    daughterCheckbox.disabled = false;

    // Rule 1: If son count = 2
    // - Keep son card enabled (allow decrement)
    // - Disable son increment button
    // - Disable daughter card completely (can't add daughters)
    if (sonCount === 2) {
      sonIncrement.disabled = true;
      daughterCard.classList.add('health-member-disabled');
      daughterIncrement.disabled = true;
      daughterCheckbox.disabled = true;
      return;
    }

    // Rule 2: If daughter count = 2
    // - Keep daughter card enabled (allow decrement)
    // - Disable daughter increment button
    // - Disable son card completely (can't add sons)
    if (daughterCount === 2) {
      daughterIncrement.disabled = true;
      sonCard.classList.add('health-member-disabled');
      sonIncrement.disabled = true;
      sonCheckbox.disabled = true;
      return;
    }

    // Rule 3: If son = 1 AND daughter = 1 (total = 2)
    // - Keep both cards enabled
    // - Disable both increment buttons (can't add more)
    // - Decrement buttons remain enabled
    if (sonCount === 1 && daughterCount === 1) {
      sonIncrement.disabled = true;
      daughterIncrement.disabled = true;
      return;
    }

    // If we reach here, no special rules apply
    // All controls should remain enabled (already reset above)
  }

  /**
   * Update card selection visual state
   */
  function updateCardSelection(card, isSelected) {
    if (isSelected) {
      card.classList.add('health-member-selected');
    } else {
      card.classList.remove('health-member-selected');
    }
  }

  /**
   * Update field value with current state
   */
  function updateFieldValue() {
    const selectedMembers = [];
    const memberDetails = {
      myself: state.myself,
      spouse: state.spouse,
      children: []
    };

    if (state.myself) selectedMembers.push('myself');
    if (state.spouse) selectedMembers.push('spouse');

    if (state.son.selected && state.son.count > 0) {
      selectedMembers.push('son');
      for (let i = 0; i < state.son.count; i++) {
        memberDetails.children.push({ type: 'son', index: i + 1 });
      }
    }

    if (state.daughter.selected && state.daughter.count > 0) {
      selectedMembers.push('daughter');
      for (let i = 0; i < state.daughter.count; i++) {
        memberDetails.children.push({ type: 'daughter', index: i + 1 });
      }
    }

    // Calculate totals
    const totalMembers = 1 + (state.spouse ? 1 : 0) + state.son.count + state.daughter.count;
    const totalChildren = state.son.count + state.daughter.count;
    const totalAdults = 1 + (state.spouse ? 1 : 0);

    // Create value object
    const value = {
      members: selectedMembers,
      memberDetails: memberDetails,
      counts: {
        son: state.son.count,
        daughter: state.daughter.count,
        totalChildren: totalChildren,
        totalAdults: totalAdults,
        totalMembers: totalMembers
      },
      insuranceType: (totalAdults > 1 || totalChildren > 0) ? 'family-floater' : 'individual-floater'
    };

    // Store the value in a hidden input or update the field model
    const valueStr = JSON.stringify(value);
    let hiddenInput = element.querySelector('input[type="hidden"]');
    if (!hiddenInput) {
      hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = fd.name;
      element.appendChild(hiddenInput);
    }
    hiddenInput.value = valueStr;

    // Trigger change event
    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Show error message
   */
  function showError(message) {
    let errorElement = element.querySelector('.health-member-error');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'health-member-error';
      element.appendChild(errorElement);
    }
    errorElement.textContent = message;
    errorElement.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 3000);
  }

  // Initialize the component
  const memberUI = createMemberUI();
  element.innerHTML = '';
  element.appendChild(memberUI);

  // Set initial field value
  updateFieldValue();

  // Subscribe to field changes if needed
  subscribe(element, formId, (_element, fieldModel) => {
    // Listen for any external changes to the field
    fieldModel.subscribe((e) => {
      // Handle external updates if needed
    }, 'change');
  });

  return element;
}
