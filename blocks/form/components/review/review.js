/* eslint-disable no-use-before-define */
import { subscribe } from '../../rules/index.js';
import { generateFormRendition } from '../../form.js';

const panelRenderers = {
  default: replaceInputs,
  singleAccountCard: createAccountVariantReview,
  multiAccountCard: createAccountVariantReview,
  accountChoiceField: createAccountVariantReview,
  'image-upload': createFileUploadReview,
  passportPanel: createDocumentReview,
  address_proof: createFileUploadReview,
  drivinglicensepanel: createDocumentReview,
  voterIdPanel: createDocumentReview,
  addressProofPanel: createFileUploadReview,
  selfiePanel: createFileUploadReview,
  personalDetailsPanel: createPersonalDetailsReview,
  contactDetails: createContactDetailsReview,
  nomineePanel: createNomineeDetailsReview,
  financialDetailsPanel: createFinancialDetailsReview,
  verifyEmailPanel: createEmailReview,
  otherInfoPanel: createOtherInfoReview,
  branchDetails: createBranchDetailsReview,
  familySelectionPanel: createFamilyGroupDetailsReview,
  familygroupdetails: createFamilyGroupDetailsPanelReview,
};

function replaceInputs(element, model) {
  function processItem(item) {
    if (item.isContainer) {
      item.items?.forEach(processItem);
      return;
    }

    if (!item.value) {
      element.querySelector(`[data-id="${item.id}"]`)?.remove(); // empty fields need not be rendered
      return;
    }

    const {
      id, value, name, fieldType, enumNames, displayValue
    } = item;
    if (id) {
      const divElement = document.createElement('div');
      divElement.className = `review-field-value ${name}`;
      if (fieldType === 'radio-group' || fieldType === 'checkbox-group' || fieldType === 'drop-down') {
        const index = item?.enum?.indexOf(value);
        if (index !== -1) {
          if (enumNames.length > 0) {
            divElement.textContent = enumNames[index];
          } else {
            divElement.textContent = item?.enum?.[index] || value;
          }
        }
      } else {
        divElement.textContent = displayValue || value || '';
      }

      if (fieldType === 'radio-group' || fieldType === 'checkbox-group') {
        const radioOrCheckboxGroup = element.querySelector(`fieldset[data-id="${id}"]`);
        if (radioOrCheckboxGroup) {
          const wrappers = radioOrCheckboxGroup.querySelectorAll('.radio-wrapper') || radioOrCheckboxGroup.querySelectorAll('.checkbox-wrapper');
          wrappers.forEach((wrapper) => wrapper.remove());
          radioOrCheckboxGroup.appendChild(divElement);
        }
      } else if (fieldType === 'checkbox') {
        const inputElement = element.querySelector(`input[id="${id}"]`);
        if (inputElement) {
          const label = inputElement.parentNode.querySelector('label');
          inputElement.parentNode.insertBefore(divElement, label.nextSibling);
          inputElement.remove();
        }
      } else {
        const inputElement = element.querySelector(`input[id="${id}"], select[id="${id}"], textarea[id="${id}"]`);
        if (inputElement) {
          inputElement.parentNode.replaceChild(divElement, inputElement);
        }
      }
    }

    // Special case for dynamic dropdowns that has an additional input field
    const dynamicDropdown = element.querySelectorAll('.dynamic-dropdown-wrapper');
    dynamicDropdown?.forEach((wrapper) => wrapper.remove());

    const customDatePickers = element.querySelectorAll('.custom-date-inputs');
    customDatePickers?.forEach((picker) => picker.remove());
  }
  model.items?.forEach(processItem);
  return element;
}

async function createPersonalDetailsReview(element, model) {
  const familyDetailsQN = '$form.wizard.yourDetailsPanel.yourDetailsSubPanel.yourDetailsFragment.yourDetailsTabLayout.familyDetails.familyDetailsFragment.familyDetails';
  const form = model?.form;
  const familyDetails = form.resolveQualifiedName(familyDetailsQN);
  const familyDetailsWrapper = document.createElement('div');
  await generateFormRendition(familyDetails.getState(), familyDetailsWrapper, form?.id);
  const familyDetailsReview = replaceInputs(familyDetailsWrapper, familyDetails);
  const personalDetailsReview = replaceInputs(element, model);
  const familyDetailsTitle = personalDetailsReview.children[0].cloneNode(true);
  familyDetailsTitle.classList.add('field-familydetailstitle');
  familyDetailsTitle.innerHTML = '<p><p><strong>Family Details</strong></p></p>';
  familyDetailsReview.prepend(familyDetailsTitle);
  const maritalDetailsWrapper = familyDetailsReview.querySelector('.field-maritalstatus');
  maritalDetailsWrapper?.classList.add('col-4', 'text-wrapper');
  maritalDetailsWrapper?.classList.remove('radio-group-wrapper');
  const maritalDetailsLabel = document.createElement('label');
  maritalDetailsLabel.textContent = 'Marital Status';
  maritalDetailsLabel.classList.add('field-maritalstatustitle');
  maritalDetailsLabel.setAttribute('for', 'maritalstatus');
  const maritalDetailsLegend = maritalDetailsWrapper?.querySelector('legend');
  maritalDetailsLegend?.replaceWith(maritalDetailsLabel);
  Array.from(familyDetailsReview.children).forEach((child) => {
    personalDetailsReview.appendChild(child);
  });
  const titleDiv = document.createElement('div');
  titleDiv.className = 'review-section-title';
  titleDiv.textContent = 'Personal Details';
  personalDetailsReview.prepend(titleDiv);
  return personalDetailsReview;
}

function createContactDetailsReview(element, model) {
  const { form } = model;
  if (form.properties.existingCustomer === 'Y') {
    return null;
  }
  // updateing the data here since per requirement in OVD flow it is to be shown per aadhar flow
  const excludeElements = ['addressline1', 'addressline2', 'addressline3', 'pincode', 'city', 'state', 'country'];
  excludeElements.forEach((elementName) => {
    element.querySelector(`.field-${elementName}`)?.remove();
  });
  const contactDetailsReview = replaceInputs(element, model);
  const addressLabel = contactDetailsReview.querySelector('.field-contactdetailssubtext');
  const addressSummary = contactDetailsReview.querySelector('.field-permanentaddresstext');
  const addressWrapper = document.createElement('div');
  addressWrapper.classList.add('col-4', 'field-wrapper', 'text-wrapper');
  const label = document.createElement('label');
  label.classList.add('field-label');
  label.innerHTML = addressLabel?.innerHTML;
  const divElement = document.createElement('div');
  divElement.className = 'review-field-value';
  divElement.innerHTML = addressSummary?.innerHTML;
  addressWrapper.appendChild(label);
  addressWrapper.appendChild(divElement);
  addressLabel.remove();
  addressSummary?.replaceWith(addressWrapper);
  const titleDiv = document.createElement('div');
  titleDiv.className = 'review-section-title';
  titleDiv.textContent = 'Contact Details';
  contactDetailsReview.prepend(titleDiv);
  return contactDetailsReview;
}

function createBranchDetailsReview(element, model) {
  const branchDetailsReview = replaceInputs(element, model);
  const titleDiv = document.createElement('div');
  element.querySelector('.field-addressdetailssubtext')?.remove();
  element.querySelector('.field-branchdetailssubtext')?.remove();
  titleDiv.className = 'review-section-title';
  titleDiv.textContent = 'Branch Details';
  branchDetailsReview.prepend(titleDiv);
  return branchDetailsReview;
}

function createFamilyGroupDetailsReview(element, model) {
  const { form } = model;
  if (form?.properties?.isSalaryFamilyJourney !== 'Y') {
    return null;
  }
  const familyGroupReview = replaceInputs(element, model);

  // Remove marketing/feature content (GIF, Zero Balance title, feature panels)
  familyGroupReview.querySelector('.field-familygroupfeatures')?.remove();

  const memberListing = familyGroupReview.querySelector('.field-familymemberlisting');
  const familyGroupPanel = memberListing?.querySelector('.field-family-group-panel');
  if (!familyGroupPanel) {
    const titleDiv = document.createElement('div');
    titleDiv.className = 'review-section-title';
    titleDiv.textContent = 'Family Group Details';
    familyGroupReview.prepend(titleDiv);
    return familyGroupReview;
  }

  // Remove intro copy; keep only the 10-day info banner
  familyGroupPanel.querySelector('.field-familygroupheading')?.remove();
  familyGroupPanel.querySelector('.field-family-text')?.remove();

  // Replace info banner text and restyle for review
  const infoBanner = familyGroupPanel.querySelector('.field-zeroballink');
  if (infoBanner) {
    infoBanner.classList.add('review-family-info-banner');
    infoBanner.innerHTML = '<p><p>Please request your family members to complete the account opening or conversion process within 10 days and join your Family Group.</p></p>';
  }

  // Replace member listing with clean "Member 1", "Member 2" summary (only when membercheckbox is on)
  const listingPanel = familyGroupPanel.querySelector('.field-familylistingpanel');
  if (listingPanel) {
    const repeatableItems = listingPanel.querySelectorAll('fieldset[data-repeatable="true"]');
    const members = [];
    repeatableItems.forEach((item) => {
      const innerPanel = item.querySelector('.field-familylistinginnerpanel');
      if (!innerPanel) return;
      const checkboxEl = innerPanel.querySelector('.field-membercheckbox .review-field-value');
      const checkedVal = checkboxEl?.textContent?.trim().toLowerCase() || '';
      const isSelected = ['on', 'y', 'yes', 'true', '1'].includes(checkedVal);
      if (!isSelected) return;
      const nameEl = innerPanel.querySelector('.field-prefillmembername .review-field-value');
      const relationEl = innerPanel.querySelector('.field-prefillmemberrelation .review-field-value');
      const dobEl = innerPanel.querySelector('.field-prefillmemberdob .review-field-value');
      const name = nameEl?.textContent?.trim() || '';
      const relation = relationEl?.textContent?.trim() || '';
      const dob = dobEl?.textContent?.trim() || '';
      if (!name && !relation) return;
      members.push({ name, relation, dob });
    });

    listingPanel.innerHTML = '';
    members.forEach((member, index) => {
      const memberBlock = document.createElement('div');
      memberBlock.className = 'review-family-member-block';

      const heading = document.createElement('div');
      heading.className = 'review-family-member-heading';
      heading.textContent = `Member ${index + 1}`;
      memberBlock.appendChild(heading);

      const formatDobForDisplay = (dobStr) => {
        if (!dobStr || typeof dobStr !== 'string') return dobStr;
        const m = dobStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) return `${m[3]} / ${m[2]} / ${m[1]}`;
        return dobStr;
      };

      const addFieldWrapper = (labelText, value, fieldClass, options = {}) => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('text-wrapper', fieldClass, 'field-wrapper', 'col-4');
        const label = document.createElement('label');
        label.classList.add('field-label');
        label.textContent = labelText;
        const valueDiv = document.createElement('div');
        valueDiv.className = 'review-field-value';
        if (options.nowrap) valueDiv.classList.add('review-field-value-nowrap');
        valueDiv.textContent = value;
        wrapper.appendChild(label);
        wrapper.appendChild(valueDiv);
        return wrapper;
      };

      memberBlock.appendChild(addFieldWrapper('Full Name', member.name, 'field-membername'));
      memberBlock.appendChild(addFieldWrapper('Member is My', member.relation, 'field-memberrelation'));
      if (member.dob) {
        memberBlock.appendChild(addFieldWrapper('Date of Birth', formatDobForDisplay(member.dob), 'field-memberdob', { nowrap: true }));
      }

      listingPanel.appendChild(memberBlock);
    });
  }

  // Remove modals, error panel, and consent from review view
  familyGroupPanel.querySelector('.field-addnewmemermodal')?.remove();
  familyGroupPanel.querySelector('.field-familyselectionerrorpanel')?.remove();
  familyGroupPanel.querySelector('.field-agreeconsent')?.remove();

  const titleDiv = document.createElement('div');
  titleDiv.className = 'review-section-title';
  titleDiv.textContent = 'Family Group Details';
  familyGroupReview.prepend(titleDiv);
  return familyGroupReview;
}

function formatDobForDisplay(dobStr) {
  if (!dobStr || typeof dobStr !== 'string') return dobStr;
  const m = dobStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]} / ${m[2]} / ${m[1]}`;
  return dobStr;
}

function addFieldRow(parent, labelText, value, fieldClass = '', options = {}) {
  const { hideIfEmpty } = options;
  if (hideIfEmpty && (value === undefined || value === null || String(value).trim() === '')) {
    return null;
  }
  const wrapper = document.createElement('div');
  wrapper.classList.add('text-wrapper', 'field-wrapper', 'col-4');
  if (fieldClass) wrapper.classList.add(fieldClass);
  const label = document.createElement('label');
  label.classList.add('field-label');
  label.textContent = labelText;
  const valueDiv = document.createElement('div');
  valueDiv.className = 'review-field-value';
  valueDiv.textContent = value ?? '';
  wrapper.appendChild(label);
  wrapper.appendChild(valueDiv);
  parent.appendChild(wrapper);
  return wrapper;
}

function addSubsectionHeading(parent, text) {
  const heading = document.createElement('div');
  heading.className = 'review-grouping-subsection-heading';
  heading.textContent = text;
  parent.appendChild(heading);
}

function resolveNomineeRelationshipDisplay(code, enumsConfig) {
  if (code == null || code === '' || !enumsConfig) return '';
  const enums = enumsConfig.enums || [];
  const enumNames = enumsConfig.enumNames || [];
  const idx = enums.indexOf(String(code));
  return idx >= 0 && enumNames[idx] !== undefined ? enumNames[idx] : code;
}

function createFamilyGroupDetailsPanelReview(element, model) {
  const { form } = model;
  if (form?.properties?.pjid === '' || form?.properties?.pjid === null || form?.properties?.pjid === undefined) {
    return null;
  }
  const review = replaceInputs(element, model);
  const formProps = form?.properties || {};
  const parentLastStateInfo = formProps.parentLastStateInfo || {};

  const primaryPanel = review.querySelector('.field-primarymemberdetailspanel');
  const currentPanel = review.querySelector('.field-currentmemberpanel');

  const getValue = (container, fieldName) => container?.querySelector(`.field-${fieldName} .review-field-value`)?.textContent?.trim() ?? '';

  const primaryName = primaryPanel ? getValue(primaryPanel, 'primarymember') : '';
  const currentName = currentPanel ? getValue(currentPanel, 'currentmember') : '';

  const primaryDobRaw = parentLastStateInfo.DateOfBirth ?? (primaryPanel ? getValue(primaryPanel, 'dateofbirth') : '');
  const currentDobRaw = formProps.dateOfBirth ?? (currentPanel ? getValue(currentPanel, 'dateofbirth') : '');
  const primaryDob = formatDobForDisplay(primaryDobRaw);
  const currentDob = formatDobForDisplay(currentDobRaw);

  const nomineeRelationshipCode = parentLastStateInfo.nomineeRelationship;
  const relationshipEnums = formProps.originalNomineeRelationshipEnums;
  const requestorIsMy = resolveNomineeRelationshipDisplay(nomineeRelationshipCode, relationshipEnums)
    || (currentPanel ? getValue(currentPanel, 'requesterrelationship') : '');

  const familyMembersLength = formProps.familyMembersLength;
  const showFamilySummary = familyMembersLength != null && Number(familyMembersLength) > 0;
  const familyMembersText = showFamilySummary ? `+${familyMembersLength} family members` : '';

  review.innerHTML = '';

  // ===== Wrapper 1: Request Raised By =====
const requestWrapper = document.createElement('div');
requestWrapper.className = 'review-request-wrapper';

addSubsectionHeading(requestWrapper, 'Request Raised By');
addFieldRow(requestWrapper, 'Full Name', primaryName, 'field-primarymember');
addFieldRow(requestWrapper, 'Date of Birth', primaryDob, 'field-primarymemberdob', { hideIfEmpty: true });

// ===== Wrapper 2: Your Details =====
const yourDetailsWrapper = document.createElement('div');
yourDetailsWrapper.className = 'review-yourdetails-wrapper';

addSubsectionHeading(yourDetailsWrapper, 'Your Details');
addFieldRow(yourDetailsWrapper, 'Full Name', currentName, 'field-currentmember');
addFieldRow(yourDetailsWrapper, 'Requestor is My', requestorIsMy, 'field-requesterrelationship', { hideIfEmpty: true });
addFieldRow(yourDetailsWrapper, 'Date of Birth', currentDob, 'field-currentmemberdob', { hideIfEmpty: true });


// Append wrappers to review
review.appendChild(requestWrapper);
review.appendChild(yourDetailsWrapper);

/*   addSubsectionHeading(review, 'Request Raised By');
  addFieldRow(review, 'Full Name', primaryName, 'field-primarymember');
  addFieldRow(review, 'Date of Birth', primaryDob, 'field-primarymemberdob', { hideIfEmpty: true });

  addSubsectionHeading(review, 'Your Details');
  addFieldRow(review, 'Full Name', currentName, 'field-currentmember');
  addFieldRow(review, 'Requestor is My', requestorIsMy, 'field-requesterrelationship', { hideIfEmpty: true });
  addFieldRow(review, 'Date of Birth', currentDob, 'field-currentmemberdob', { hideIfEmpty: true }); */

  if (familyMembersText) {
    const summaryEl = document.createElement('div');
    summaryEl.className = 'review-grouping-family-summary field-familymemberslength';
    summaryEl.textContent = familyMembersText;
    review.appendChild(summaryEl);
  }

  const titleDiv = document.createElement('div');
  titleDiv.className = 'review-section-title';
  titleDiv.textContent = 'Grouping Details';
  review.prepend(titleDiv);
  return review;
}

function createNomineeDetailsReview(element, model) {
  const { form } = model;
  if (form.properties.existingCustomer === 'Y' || form.properties.declareNominee !== 'Yes') {
    return null;
  }
  const nomineeDetailsReview = replaceInputs(element, model);
  const excludeElements = ['sameaspermanentaddrguardian', 'addnomineecheckbox', 'nomineedob', 'sameaspermanentaddr', 'nomineeaddresstitle', 'nomineeaddressdetailsradio','selectnomineeheading','nomineedetailspanel'];
  excludeElements.forEach((elementName) => {
    nomineeDetailsReview.querySelector(`.field-${elementName}`)?.remove();
  });

  const addressLabel = nomineeDetailsReview.querySelector('.field-sameaddressdetailsnomineetext');
  const addressSummary = nomineeDetailsReview.querySelector('.field-samenomineeadrdetails');
  const addressWrapper = document.createElement('div');
  addressWrapper.classList.add('col-4', 'field-wrapper', 'text-wrapper');
  const label = document.createElement('label');
  label.classList.add('field-label');
  label.innerHTML = addressLabel?.innerHTML;
  const divElement = document.createElement('div');
  divElement.className = 'review-field-value';
  divElement.innerHTML = addressSummary?.innerHTML;
  addressWrapper.appendChild(label);
  addressWrapper.appendChild(divElement);
  addressLabel.remove();

  addressSummary?.replaceWith(addressWrapper);
  const titleDiv = document.createElement('div');
  titleDiv.className = 'review-section-title';
  titleDiv.textContent = 'Nominee Details';
  nomineeDetailsReview.prepend(titleDiv);
  return nomineeDetailsReview;
}

function createFinancialDetailsReview(element, model) {
  const financialDetailsReview = replaceInputs(element, model);
  const excludeElements = ['dobdeclarationcheck', 'selfemployeddurationhelptext'];
  excludeElements.forEach((elementName) => {
    financialDetailsReview.querySelector(`.field-${elementName}`)?.remove();
  });
  const titleDiv = document.createElement('div');
  titleDiv.className = 'review-section-title';
  titleDiv.textContent = 'Information about your financial profile';
  financialDetailsReview.prepend(titleDiv);
  return financialDetailsReview;
}

function createEmailReview(element, model) {
  const { form } = model;
  if (form.properties.existingCustomer === 'Y') {
    return null;
  }
  const emailReview = replaceInputs(element, model);
  const excludeElements = ['verifybutton'];
  excludeElements.forEach((elementName) => {
    emailReview.querySelector(`.field-${elementName}`)?.remove();
  });
  emailReview.querySelector('.field-description')?.remove();
  const titleDiv = document.createElement('div');
  titleDiv.className = 'review-section-title';
  titleDiv.textContent = 'Your email ID';
  emailReview.prepend(titleDiv);
  return emailReview;
}

function createOtherInfoReview(element, model) {
  const otherInfoReview = replaceInputs(element, model);
  otherInfoReview.querySelectorAll('.switch').forEach((switchElement) => {
    switchElement.classList.remove('switch');
  });
  const excludeElements = ['pepdeclarationtext'];
  excludeElements.forEach((elementName) => {
    otherInfoReview.querySelector(`.field-${elementName}`)?.remove();
  });
  const titleDiv = document.createElement('div');
  titleDiv.className = 'review-section-title';
  titleDiv.textContent = 'Other Information';
  otherInfoReview.prepend(titleDiv);
  return otherInfoReview;
}

function createAccountVariantReview(element, model) {
  const value = model?.value;
  if (!value || typeof value !== 'object') return;

  // Keys to filter out
    const filterKeys = [
      'Account',
      'Link',
      'Required Consent',
      'Optional Consent',
      'Product Codes',
      'Sub Product Codes',
      'AMB_URBAN',
      'AMB_RURAL',
      'AMB_SEMIURBAN',
      'AMB_METROPOLITAN',
      'Parent_Product_Category',
      'Account_Category',
      'Is_BaaS_Account',
      'Manage_Program_Applicable'
    ];

  // Clear the element
  element.innerHTML = '';

  // Section title
  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'review-section-title';
  sectionTitle.textContent = 'Account Variant';
  if (model?.form?.properties?.createFamilyGroupFlow === 'true') sectionTitle.textContent = 'Account Variant for Family Group';
  element.appendChild(sectionTitle);

  // Parent div for title and features
  const detailsDiv = document.createElement('div');
  detailsDiv.className = 'review-account-details';
  // Initially collapsed

  // Title from 'Account' key
  const titleDiv = document.createElement('div');
  titleDiv.className = 'review-account-title';
  titleDiv.textContent = value.Account || '';

  // Wrapper div for features and button
  const featuresWrapper = document.createElement('div');
  featuresWrapper.className = 'review-account-features-wrapper';
  featuresWrapper.appendChild(titleDiv);
  featuresWrapper.classList.add('collapsed');
  // Bullet points for the rest
  const ul = document.createElement('ul');
  ul.className = 'review-account-features';
  Object.entries(value).forEach(([key, val]) => {
    if (
      filterKeys.includes(key)
      || val === ''
      || val === '-'
      || val == null
    ) return;
    const li = document.createElement('li');
    li.textContent = `${key} ${val}`;
    ul.appendChild(li);
  });
  featuresWrapper.appendChild(ul);

  // 'More Benefits' as a button
  const moreBenefitsBtn = document.createElement('button');
  moreBenefitsBtn.type = 'button';
  moreBenefitsBtn.textContent = 'More Benefits';
  moreBenefitsBtn.className = 'review-account-more-benefits';
  moreBenefitsBtn.addEventListener('click', () => {
    const isExpanded = featuresWrapper.classList.toggle('expand');
    featuresWrapper.classList.toggle('collapsed', !isExpanded);
    moreBenefitsBtn.textContent = isExpanded
      ? 'Less Benefits'
      : 'More Benefits';
  });


  detailsDiv.appendChild(featuresWrapper);
  element.appendChild(detailsDiv);
  detailsDiv.appendChild(moreBenefitsBtn);
  // eslint-disable-next-line consistent-return
  return element;
}

function createFileUploadReview(element, model) {
  const { form } = model;
  if (form.properties.existingCustomer === 'Y' || form.properties.ovdFlag !== 'Y') {
    return null;
  }
  // Remove all children except all div.file-wrapper
  const fileWrapperDivs = Array.from(element.querySelectorAll('div.file-wrapper'));

  // Check if any file input has a value
  let hasFileValue = false;
  fileWrapperDivs.forEach((div) => {
    const fileInput = div.querySelector('input[type="file"]');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      hasFileValue = true;
    }
  });

  // If no file values, return null to skip this panel
  if (!hasFileValue) {
    return null;
  }

  element.innerHTML = '';
  fileWrapperDivs.forEach((div) => {
    const fileInput = div.querySelector('input[type="file"]');
    // Only append the div if it has a file input with a file value
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      
      // Remove .field-description if it exists
      const desc = div.querySelector('.field-description');
      if (desc) {
        desc.remove();
      }
      // Remove label if it exists
      const label = div.querySelector('label');
      if (label) {
        label.remove();
      }
      element.appendChild(div);
    }
  });

  // Create and prepend a new title div
  const sectionTitle = document.createElement('div');
  sectionTitle.className = "review-section-title";
  if (model?.name === "image-upload" || model?.name === "selfiePanel") {
    sectionTitle.textContent = "Your Selfie";
  } else if (model?.name === "address_proof") {
    sectionTitle.textContent = "Your Id Proof";
  } else {
    sectionTitle.textContent = "Your Address Proof";
  }
  element.prepend(sectionTitle);

  // Find and disable all file inputs inside the wrappers
  fileWrapperDivs.forEach((div) => {
    const fileInput = div.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.disabled = true;
    }
  });

  return element;
}

function createDocumentReview(element, model) {
  const { form } = model;
  const docTypeMap = {
    dl: ['drivinglicensepanel'],
    voterid: ['voterIdPanel'],
    passport: ['passportPanel'],
  };

  // Conditions to skip
  if (
    form.properties.existingCustomer === 'Y' ||
    form.properties.ovdFlag !== 'Y'
  ) {
    return null;
  }

  const [panelName] = docTypeMap[form.properties.documentType] || [];
  if (model.name !== panelName) {
    return null;
  }

  const wrappers = [...element.querySelectorAll('div.file-wrapper')];
  const chosenWrappers = wrappers.filter(
    (div) => div.querySelector('input[type="file"]')?.files?.length
  );

  if (chosenWrappers.length === 0) {
    return null;
  }

  // Rebuild element with only chosen wrappers
  element.innerHTML = '';
  chosenWrappers.forEach((chosen) => {
    chosen.querySelector('.field-description')?.remove();
    chosen.querySelector('label')?.remove();
    const input = chosen.querySelector('input[type="file"]');
    if (input) input.disabled = true;
    element.appendChild(chosen);
  });

  // Add title
  const sectionTitle = Object.assign(document.createElement('div'), {
    className: 'review-section-title',
    textContent: 'Your Address Proof',
  });
  element.prepend(sectionTitle);

  return element;
}

function addEditAction(element, model) {
  // Skip adding edit button for specific panels
  const skipEditPanels = ['image-upload', 'passportPanel', 'voterIdPanel', 'drivinglicensepanel', 'selfiePanel', 'address_proof'];
  const skipEditPanelsSalFam = ['singleAccountCard', 'multiAccountCard', 'accountChoiceField'];
  if (skipEditPanels.includes(model.name) || (model?.form?.properties?.createFamilyGroupFlow === 'true' && skipEditPanelsSalFam.includes(model.name))) {
    return;
  }

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'review-panel-edit';
  const form = model?.form;
  editButton.addEventListener('click', () => {
    // Remove the rendered attribute when edit button is clicked

    // If we're returning to a certain page in the journey, we can move back and forward to any page from there, and modify information. And then return to the review page.
    // So we need to remove the rendered attribute from all review containers so that the review page is re-rendered and the new information is shown.
    document.querySelectorAll('.review-container[data-rendered]').forEach(container => {
      container.removeAttribute('data-rendered');
    });

    form.setFocus(model);
    // Map panel names to their corresponding parent in the heirarchy that needs to be made visible
    const panelQualifiedNames = {
      personalDetailsPanel: '$form.wizard.yourDetailsPanel.yourDetailsSubPanel',
      branchDetails: '$form.wizard.yourDetailsPanel.yourDetailsSubPanel',
      contactDetails: '$form.wizard.yourDetailsPanel.yourDetailsSubPanel',
      multiAccountCard: '$form.wizard.yourDetailsPanel.selectAccountVariant',
      singleAccountCard: '$form.wizard.yourDetailsPanel.selectAccountVariant',
      accountChoiceField: '$form.wizard.yourDetailsPanel.selectAccountVariant',
      nomineePanel: '$form.wizard.yourDetailsPanel.yourDetailsSubPanel',
      financialDetailsPanel: '$form.wizard.yourDetailsPanel.yourDetailsSubPanel',
      verifyEmailPanel: '$form.wizard.yourDetailsPanel.yourDetailsSubPanel',
      otherInfoPanel: '$form.wizard.yourDetailsPanel.yourDetailsSubPanel',
      familySelectionPanel: '$form.wizard.yourDetailsPanel.selectAccountVariant',
      familygroupdetails: '$form.wizard.yourDetailsPanel.selectAccountVariant',
    };

    const qualifiedName = panelQualifiedNames[model.name];
    if (qualifiedName) {
      const section = form.resolveQualifiedName(qualifiedName);
      if (section) section.visible = true;

      // TODO : This is a temporary fix to show the family selection panel when user clicks edit on family group details panel. We need to revisit this logic once sal fam code is merged with bundled journey.
      if (model.name === 'familySelectionPanel') {
        const familySelectionSection = form.resolveQualifiedName('$form.wizard.yourDetailsPanel.selectAccountVariant.familySelectionPanel');
        if (familySelectionSection) familySelectionSection.visible = true;
      }

      // TODO : This is a temporary fix to show the select account variant screen when user clicks edit on account variant panel. We need to revisit this logic once sal fam code is merged with bundled journey.
      if (model.name === 'singleAccountCard') {
        const queryParams = new URLSearchParams(window.location.search);
        const journeyType = queryParams.get('journeytype');
        const isSecondaryJourneyFlow = queryParams.get('pid');

        const isExistingCustomer = form?.properties?.existingCustomer === 'Y';
        const shouldShowSingleAccountVariant = journeyType === 'salfam' && !isSecondaryJourneyFlow && !isExistingCustomer;

        if (shouldShowSingleAccountVariant) {
          const singleAccountCard = form.resolveQualifiedName(
            '$form.wizard.yourDetailsPanel.selectAccountVariant.singleAccountCard'
          );
          const dynamicConsents = form.resolveQualifiedName(
            '$form.wizard.yourDetailsPanel.selectAccountVariant.dynamicConsents'
          );
          const backButtonOnAccountVariant = form.resolveQualifiedName(
            '$form.wizard.yourDetailsPanel.selectAccountVariant.back'
          );
          const continueButtonOnAccountVariant = form.resolveQualifiedName(
            '$form.wizard.yourDetailsPanel.selectAccountVariant.accountVariantContinue'
          );

          [
            singleAccountCard,
            dynamicConsents,
            backButtonOnAccountVariant,
            continueButtonOnAccountVariant
          ].forEach((section) => {
            if (section) section.visible = true;
          })
        }
      }
    }
  });
  element.prepend(editButton);
}

function render(element, fd, model) {
  // Check if already rendered - if so, don't re-render
  if (element.hasAttribute('data-rendered')) {
    return;
  }
  // Rendering logic for the review component
  if (!model) return;
  const { form } = model;
  const { properties } = fd;
  const panelModels = [];
  if (properties && form) {
    const { panelNames } = properties;
    form.visit((field) => {
      if (panelNames?.includes(field.name)) {
        panelModels.push(field);
      }
    });

    element.innerHTML = '';
    // Render each panel
    panelModels?.forEach(async (field) => {
      if (!field.isContainer && !field.value) return;

      if (field.name === 'financialDetailsPanel' && field.fragment.split('.').pop() === 'vrmFinancialFragment') {
        return;
      }
      // Family Group Details panel only when journeytype=salfam
      if (field.name === 'familySelectionPanel' && (form.properties.isSalaryFamilyJourney !== 'Y' || form.properties.isFamilyGroupAdded !== 'Y')) {
        element.setAttribute('data-visible', 'false');
        return;
      }
      if (field.name === 'familygroupdetails' && (form.properties.pjid === '' || form.properties.pjid === null || form.properties.pjid === undefined)) {
        element.setAttribute('data-visible', 'false');
        return;
      }

      //Remove these fields incase of Create Family Group Flow for ETB Salary
      const hiddenPanelsFamilyGroupFlow = ['personalDetailsPanel', 'branchDetails', 'financialDetailsPanel', 'otherInfoPanel'];
      const hideForFamilyGroup = form.properties.createFamilyGroupFlow === 'true' && hiddenPanelsFamilyGroupFlow.includes(field.name);
      if (hideForFamilyGroup) {
        element.setAttribute('data-visible', 'false');
        return;
      }

      if (form.properties.existingCustomer === 'Y' && (field.name === 'contactDetails' || field.name === 'nomineePanel' || field.name === 'verifyEmailPanel')) {
        element.setAttribute('data-visible', 'false');
        return;
      } else if (field.name === 'nomineePanel') {
        if (form.properties.declareNominee !== 'Yes') {
          element.setAttribute('data-visible', 'false');
          return;
        } else {
          element.removeAttribute('data-visible');
        }
      }
          
      const panelWrapper = document.createElement('div');
      panelWrapper.className = `review-panel-wrapper ${field.name}`;
      await generateFormRendition(field.getState(), panelWrapper, form?.id);
      const decorator = panelRenderers[field.name] || panelRenderers.default;
      const decoratedPanel = await decorator(panelWrapper, field);

      // Skip this panel if decorator returns null
      if (!decoratedPanel) return;

      // Ensure the edit button exists
      if (
        !(
          form.properties?.existingCustomer === 'Y' &&
          field.name === 'personalDetailsPanel'
        )
      ) {
        addEditAction(decoratedPanel, field);
      }

      // Find the review-section-title and review-panel-edit button
      const sectionTitle = decoratedPanel.querySelector('.review-section-title');
      const editButton = decoratedPanel.querySelector('.review-panel-edit');
      if (sectionTitle && editButton) {
        // Create review-header div and move sectionTitle and editButton inside it
        const reviewHeader = document.createElement('div');
        reviewHeader.className = 'review-section-header';
        reviewHeader.appendChild(sectionTitle);
        reviewHeader.appendChild(editButton);
        decoratedPanel.prepend(reviewHeader);
      } else if (sectionTitle) {
        // If no edit button, still create a header with only the title
        const reviewHeader = document.createElement('div');
        reviewHeader.className = 'review-section-header';
        reviewHeader.appendChild(sectionTitle);
        decoratedPanel.prepend(reviewHeader);
      }


      element.appendChild(panelWrapper);
    });

    // Mark as rendered after successful rendering
    element.setAttribute('data-rendered', 'true');
  }
}

export default function decorate(element, fd, container, formId, globals) {
  element.classList.add('review-container');
  let fieldModel;
  subscribe(element, formId, (_element, model) => {
    fieldModel = model;
    fieldModel.subscribe(() => {
      // having this event as user can click on back button and change any data so we are re-rendering all data again and again.
      // We are throuwing a dispatch event "reviewBackButtonClicked" from form and setting on any review panel this will trigger this subscribe and remove all data-rendered attributes.
      document.querySelectorAll('.review-container[data-rendered]').forEach(container => {
        container.removeAttribute('data-rendered');
        container.setAttribute('data-visible', 'true');
      });    
    }, 'reviewBackButtonClicked');
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        render(element, fd, fieldModel);
      } else {
        // element.innerHTML = '';
      }
    });
  }, {
    threshold: 0.1,
  });
  observer.observe(element);
  return element;
}
