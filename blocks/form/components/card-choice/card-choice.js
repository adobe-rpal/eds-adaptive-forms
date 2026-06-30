import { subscribe } from '../../rules/index.js';
import { isArray, isValidJsonString } from '../../../../liabilities/insta_savings_journey/functions.js';

export default function decorate(element, fieldJson, container, formId) {
  let currentCarouselPosition = 0;
  let totalCards = 0;
  const { expandButtonLabel, collapseButtonLabel } = fieldJson.properties;

  function updateBaasEtbData(filteredEtbAccountData) {
    // Create a container for the cards
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'card-choice-container baas-etb-container';

    // Create a radio group name
    const radioName = `card-choice-group-${Math.random().toString(36).substr(2, 9)}`;

    // Create account cards based on filteredEtbAccountData
    filteredEtbAccountData.forEach((account, idx) => {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'card-choice-card baas-etb-card';

      // Create radio button
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = radioName;
      radio.dataset.fieldType = 'radio-group';
      radio.dataset.index = idx;
      radio.className = 'card-choice-radio baas-etb-radio';
      // Select first account by default
      if (idx === 0) {
        radio.checked = true;
      }
      cardDiv.appendChild(radio);

      // Create account info container
      const accountInfoDiv = document.createElement('div');
      accountInfoDiv.className = 'baas-etb-account-info';

      // Account type
      const accountType = document.createElement('div');
      accountType.className = 'baas-etb-account-type';
      accountType.textContent = account.accountTypeEtb || '';
      accountInfoDiv.appendChild(accountType);

      // Account number
      const accountNumber = document.createElement('div');
      accountNumber.className = 'baas-etb-account-number';
      accountNumber.textContent = `A/c No.: ${account.maskedAccountNumber || ''}`;
      accountInfoDiv.appendChild(accountNumber);

      cardDiv.appendChild(accountInfoDiv);

      // Add icon/image if available
      const defaultIcon = document.createElement('div');
      defaultIcon.className = 'baas-etb-default-icon';
      cardDiv.appendChild(defaultIcon);
      cardsContainer.appendChild(cardDiv);
    });

    // Clear and append
    element.innerHTML = '';
    element.appendChild(cardsContainer);
  }

  /**
   * Handle BaaS ETB card choice field
   * @param {Object} fieldModel - The field model
   */
  function handleCardChoiceBaasEtb(fieldModel) {
    const { filteredEtbAccountData } = fieldModel.form.properties || {};
    if (isArray(filteredEtbAccountData)) {
      // Set the filteredEtbAccountData as the enum for the field
      fieldModel.enum = filteredEtbAccountData;
      fieldModel.enumNames = filteredEtbAccountData;
      // Update the UI with the data
      updateBaasEtbData(filteredEtbAccountData);
      // Set the default value to the first account
      if (filteredEtbAccountData.length > 0) {
        fieldModel.value = filteredEtbAccountData[0];
      }
    }
  }

  /**
   * Handle regular account choice field
   * @param {Object} fieldModel - The field model
   * @param {Array} currentValue - The current enum values
   */
  function handleAccountChoiceField(fieldModel, currentValue) {
    const { returnJourneyCheck, returnJourneyStateInfo } = fieldModel.form.properties;
    const stateInfo = returnJourneyStateInfo ? returnJourneyStateInfo.stateInfo : '';
    const isValidStateInfo = isValidJsonString(stateInfo);
    const parsedStateInfo = isValidStateInfo ? JSON.parse(stateInfo) : null;
    const hasAccountChoiceField = parsedStateInfo?.accountChoiceField;
    // In case of return journey, accountChoiceField from the stateInfo to be set.
    if (returnJourneyCheck === 'true' && stateInfo && isValidStateInfo && hasAccountChoiceField) {
      fieldModel.value = parsedStateInfo.accountChoiceField;
      // Re-populate cards with the selected value to update visual selection
      populateCards(currentValue, parsedStateInfo.accountChoiceField);
    } else {
      fieldModel.value = fieldModel.enum?.[0]; // set the first value as the default value
      populateCards(currentValue);
    }
  }

  function updateCarouselPosition(direction) {
    const cardsContainer = element.querySelector('.card-choice-container');
    if (!cardsContainer) return;
    const stepSize = 3;
    // Calculate the new position
    let newPosition = currentCarouselPosition + direction * stepSize;
    newPosition = Math.max(0, Math.min(newPosition, totalCards - 1));
    currentCarouselPosition = newPosition;
    // Apply transform to slide cards
    const translateX = -currentCarouselPosition * (100 / totalCards);
    cardsContainer.style.transform = `translateX(${translateX}%)`;
    // Show/hide arrow buttons
    const leftButton = element.querySelector('.card-choice-carousel-left');
    const rightButton = element.querySelector('.card-choice-carousel-right');
    if (leftButton) leftButton.style.display = currentCarouselPosition > 0 ? 'inline-block' : 'none';
    if (rightButton) rightButton.style.display = currentCarouselPosition < totalCards - 1 ? 'inline-block' : 'none';
  }

  function populateCards(cardsData, selectedValue = null) {
    const blacklist = ['Link', 'consent', 'Product Codes', 'Sub Product Codes', 'Required Consent', 'Optional Consent', 'Parent_Product_Category', 'AMB_URBAN', 'AMB_RURAL', 'AMB_SEMIURBAN', 'AMB_METROPOLITAN', 'Account_Category', 'Is_BaaS_Account', 'Manage_Program_Applicable'];
    // Create a container for the cards
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'card-choice-container collapse';
    const features = document.querySelector('fieldset.field-featureswrapper');

    // Reset carousel position
    currentCarouselPosition = 0;
    totalCards = cardsData.length;

    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'card-choice-toggle';
    toggleButton.textContent = expandButtonLabel || 'View More Details';
    toggleButton.type = 'button';


    const backBtn = document.querySelector(".field-selectaccountvariant .field-back")

    // Create cards carousel navigation buttons
    const leftButton = document.createElement('button');
    leftButton.className = 'card-choice-carousel-left';
    leftButton.textContent = '←';
    leftButton.type = 'button';
    leftButton.style.display = 'none';
    const rightButton = document.createElement('button');
    rightButton.className = 'card-choice-carousel-right';
    rightButton.textContent = '→';
    rightButton.type = 'button';
    rightButton.style.display = totalCards > 1 ? 'inline-block' : 'none';
    // Add click event to toggle classes
    function toggleCards() {
      if (cardsContainer.classList.contains('expand')) {
        cardsContainer.classList.remove('expand');
        cardsContainer.classList.add('collapse');
        features?.classList.remove('expand');
        features?.classList.add('collapse');
        toggleButton.textContent = expandButtonLabel || 'View More Details';
      } else {
        cardsContainer.classList.remove('collapse');
        cardsContainer.classList.add('expand');
        features?.classList.remove('collapse');
        features?.classList.add('expand');
        toggleButton.textContent = collapseButtonLabel || 'View Less';
      }
    }

    toggleButton.addEventListener('click', toggleCards);
    backBtn?.addEventListener('click', toggleCards);

    // Add click events to carousel buttons
    leftButton.addEventListener('click', () => updateCarouselPosition(-1));
    rightButton.addEventListener('click', () => updateCarouselPosition(1));

    // Create a radio group name
    const radioName = `card-choice-group-${Math.random().toString(36).substr(2, 9)}`;

    cardsData.forEach((card, idx) => {
      const cardDiv = document.createElement('div');
      cardDiv.className = 'card-choice-card';
      if (card.recommended) cardDiv.classList.add('recommended');

      // top titleWrapper of card
      const titleWrapper = document.createElement('div');
      titleWrapper.className = 'card-choice-title-wrapper';
      cardDiv.appendChild(titleWrapper);

      // Radio input
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = radioName;
      radio.dataset.fieldType = 'radio-group';
      radio.dataset.index = idx;
      radio.className = 'card-choice-radio';
      // Check if this card should be selected based on selectedValue or default to first card
      if (selectedValue && card.Account === selectedValue.Account) {
        radio.checked = true;
      } else if (!selectedValue && idx === 0) {
        radio.checked = true;
      }
      titleWrapper.appendChild(radio);

      // Recommended badge
      if (card.recommended) {
        const badge = document.createElement('div');
        badge.className = 'card-choice-recommended';
        badge.textContent = 'Recommended';
        titleWrapper.appendChild(badge);
      }

      // Card title (if present)
      if (card.Account) {
        const title = document.createElement('div');
        title.className = 'card-choice-title';
        title.textContent = card.Account;
        titleWrapper.appendChild(title);
      }

      // Card features
      const featuresList = document.createElement('ul');
      featuresList.className = 'card-choice-features';
      Object.entries(card).forEach(([key, value]) => {

        //Pick Balance Requriement based on branch classification
        if (key.toLowerCase() === "balance requirement") {
          const lines = value.split('\n');
          const balanceReqMap = {};

          for (const line of lines) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
              const cleanedKey = key.trim().toLowerCase();
              const cleanedValue = valueParts.join('=').trim();
              balanceReqMap[cleanedKey] = cleanedValue;
            }
          }
          const branchClassification = myForm.properties.classification.toLowerCase();
          value = balanceReqMap[branchClassification] || balanceReqMap["default"] || "-";

        }

        //End of balance requriment

        if (!blacklist.includes(key) && key !== 'Account') {
          const feature = document.createElement('li');
          feature.className = 'card-choice-feature';

          // checking if value contains "-"
          if (value.includes('-')) {
            feature.classList.add('card-choice-empty-value');
            feature.classList.add('card-choice-hide-feature-row');
          }

          feature.innerHTML = `</span> <span class='feature-value'>${value}</span>`;
          featuresList.appendChild(feature);
        }
      });
      cardDiv.appendChild(featuresList);

      cardsContainer.appendChild(cardDiv);
    });

    const allFeatureLists = cardsContainer.querySelectorAll('.card-choice-features');
    if (allFeatureLists.length >= 3) {
      const maxRows = Math.max(...Array.from(allFeatureLists).map(ul => ul.children.length));

      for (let i = 0; i < maxRows; i++) {
        const allHidden = Array.from(allFeatureLists).every(ul => {
          const li = ul.children[i];
          return li && li.classList.contains('card-choice-hide-feature-row');
        });

        if (allHidden) {
          allFeatureLists.forEach(ul => {
            const li = ul.children[i];
            if (li) {
              li.classList.add('hide-feature-row-globally');
            }
          });
        }
      }
    }


    // Clear and append
    element.innerHTML = '';
    element.appendChild(cardsContainer);
    element.appendChild(toggleButton);
    element.appendChild(leftButton);
    element.appendChild(rightButton);
    // Initialize arrow button visibility
    leftButton.style.display = 'none';
    rightButton.style.display = totalCards > 1 ? 'inline-block' : 'none';
  }

  subscribe(element, formId, (fieldDiv, fieldModel) => {
    fieldModel.subscribe((e) => {
      const { payload } = e;
      payload?.changes?.forEach((change) => {
        const { propertyName, currentValue } = change;
        if (propertyName === 'enum') {
          // Using switch case instead of if-else
          switch (fieldModel.name) {
            case 'cardChoiceBaasEtb':
              handleCardChoiceBaasEtb(fieldModel);
              break;

            case 'accountChoiceField':
              handleAccountChoiceField(fieldModel, currentValue);
              break;

            default:
              break;
          }
        }
      });
    });

    element.addEventListener('change', (e) => {
      e.stopPropagation();
      const value = fieldModel.enum?.[parseInt(e.target.dataset.index, 10)];
      fieldModel.value = value;
    });
  });
  return element;
}
