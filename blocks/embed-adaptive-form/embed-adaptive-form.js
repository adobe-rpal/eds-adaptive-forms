import { loadFragment } from '../fragment/fragment.js';

/**
 * Synchronizes field values from a section back to the global window.selectedCustomer object.
 * @param {HTMLElement} section The section containing the inputs to sync.
 */
function syncSectionDataToGlobal(section) {
  if (!window.selectedCustomer) return;

  const syncMapping = {
    full_name: 'full_name',
    full_name_as_per_aadhaar: 'full_name',
    first_name: 'customerFirstName',
    middle_name: 'customerMiddleName',
    last_name: 'customerLastName',
    mobile_number: 'customerMobileNo',
    email_id: 'emailAddress',
    primary_email_id: 'emailAddress',
    work_email_id: 'emailAddress',
    pan_number: 'customerID',
    pan: 'customerID',
    loan_amount_inr: 'offerAmount',
    loan_tenure_months: 'tenure',
    residence_type: 'residenceType',
    monthly_net_income_salary: 'monthlyIncome',
    date_of_birth: 'dateOfBirth',
  };

  section.querySelectorAll('input, select, textarea').forEach((input) => {
    const name = Object.keys(syncMapping).find((k) => input.name === k || input.name.endsWith(`_${k}`));
    if (name) {
      const key = syncMapping[name];
      let val = input.value;

      if ((input.type === 'radio' || input.type === 'checkbox') && !input.checked) return;

      if (name === 'date_of_birth' && val.includes('-')) {
        const [y, m, d] = val.split('-');
        val = `${d}-${m}-${y}`;
      }

      if (key === 'full_name') {
        const parts = val.trim().split(/\s+/);
        window.selectedCustomer.customerFirstName = parts[0] || '';
        if (parts.length > 2) {
          window.selectedCustomer.customerMiddleName = parts[1];
          window.selectedCustomer.customerLastName = parts.slice(2).join(' ');
        } else {
          window.selectedCustomer.customerMiddleName = '';
          window.selectedCustomer.customerLastName = parts.slice(1).join(' ') || '';
        }
      } else {
        window.selectedCustomer[key] = val;
      }
    }
  });

  document.querySelectorAll('form[data-selected-customer]').forEach((f) => {
    f.dataset.selectedCustomer = JSON.stringify(window.selectedCustomer);
  });
}

function initializeStepper() {
  const getSections = () => [...document.querySelectorAll('main > .embed-adaptive-form-container, main > .form-container')];
  const sections = getSections();

  if (!sections.length) return;

  // Hide all except first, only if no section is already active
  if (!sections.some((s) => s.classList.contains('active-step'))) {
    sections.forEach((section, index) => {
      if (index === 0) section.classList.add('active-step');
    });
  }

  sections.forEach((section) => {
    const buttons = section.querySelectorAll('button:not([data-stepper-init])');

    buttons.forEach((button) => {
      button.dataset.stepperInit = 'true';
      button.addEventListener('click', async (e) => {
        const currentSections = getSections();
        const currentIndex = currentSections.indexOf(section);

        const syncButtons = ['view_loan_eligibility', 'submit_otp', 'submit_otp_button', 'confirm_button', 'Continue', 'continue', 'proceed_button', 'Confirm'];

        if (syncButtons.includes(button.name)) {
          e.preventDefault();
          syncSectionDataToGlobal(section);
        }

        // Handle Requirement 1: view_loan_eligibility internal panel switch
        if (button.name === 'view_loan_eligibility') {
          const personalPanel = section.querySelector('.field-personal-loan-offer-panel');
          const otpPanel = section.querySelector('.field-enter-otp-panel');
          if (personalPanel && otpPanel) {
            personalPanel.dataset.visible = 'false';
            personalPanel.style.display = 'none';
            otpPanel.dataset.visible = 'true';
            otpPanel.style.display = 'grid';
            return; // Prevent top-level section transition
          }
        }

        // Handle Requirement: Back button inside field-loan-application-summary (internal switch)
        if (button.name === 'Back' && button.closest('.field-loan-application-summary')) {
          e.preventDefault();
          const summaryPanel = section.querySelector('.field-loan-application-summary');
          if (summaryPanel) {
            summaryPanel.dataset.visible = 'false';
            summaryPanel.style.display = 'none';
            [
              '.field-loan-details',
              '.field-personal-details',
              '.field-salary-account-details',
              '.field-office-address-panel',
            ].forEach((sel) => {
              const panel = section.querySelector(sel);
              if (panel) {
                panel.dataset.visible = 'true';
                panel.style.display = panel.tagName === 'FIELDSET' ? 'grid' : 'block';
              }
            });
            section.querySelector('.field-loan-details')?.scrollIntoView({ behavior: 'smooth' });
            return; // Prevent top-level section transition
          }
        }

        // Handle Requirement: Back button inside field-income-verification-panel (internal switch)
        if (button.name === 'Back' && button.closest('.field-income-verification-panel')) {
          e.preventDefault();
          const loanTypePanel = section.querySelector('.field-loan-type-selection');
          if (loanTypePanel) {
            loanTypePanel.dataset.visible = 'false';
            loanTypePanel.style.display = 'none';
            [
              '.field-customer-details-panel',
              '.field-full-name-as-per-pan',
              '.field-personal-details-panel',
              '.field-address-details',
              '.field-employer-details-panel',
              '.field-work-email-id-panel',
              '.field-type-of-loan-panel',
            ].forEach((sel) => {
              const panel = section.querySelector(sel);
              if (panel) {
                panel.dataset.visible = 'true';
                panel.style.display = panel.tagName === 'FIELDSET' ? 'grid' : 'block';
              }
            });
            section.querySelector('.field-customer-details-panel')?.scrollIntoView({ behavior: 'smooth' });
            return; // Prevent top-level section transition
          }
        }

        // Handle Requirement: Back button inside field-office-address-panel (internal switch)
        if (button.name === 'Back' && button.closest('.field-office-address-panel')) {
          e.preventDefault();
          const offerPanel = section.querySelector('.field-loan-offer-declared-income');
          if (offerPanel) {
            [
              '.field-loan-details',
              '.field-personal-details',
              '.field-salary-account-details',
              '.field-office-address-panel',
            ].forEach((sel) => {
              const panel = section.querySelector(sel);
              if (panel) {
                panel.dataset.visible = 'false';
                panel.style.display = 'none';
              }
            });
            offerPanel.dataset.visible = 'true';
            offerPanel.style.display = 'grid';
            offerPanel.scrollIntoView({ behavior: 'smooth' });
            return; // Prevent top-level section transition
          }
        }

        // Handle Requirement: Back button inside field-loan-offer-declared-income (internal switch)
        if (button.name === 'Back' && button.closest('.field-loan-offer-declared-income')) {
          e.preventDefault();
          const offerPanel = section.querySelector('.field-loan-offer-declared-income');
          const loanTypePanel = section.querySelector('.field-loan-type-selection');
          if (offerPanel && loanTypePanel) {
            offerPanel.dataset.visible = 'false';
            offerPanel.style.display = 'none';
            loanTypePanel.dataset.visible = 'true';
            loanTypePanel.style.display = 'grid';
            loanTypePanel.scrollIntoView({ behavior: 'smooth' });
            return; // Prevent top-level section transition
          }
        }

        // Handle Requirement 2: Back button inside OTP panel (internal switch)
        if (button.name === 'Back' && button.closest('.field-enter-otp-panel')) {
          e.preventDefault();
          const otpPanel = section.querySelector('.field-enter-otp-panel');
          const personalPanel = section.querySelector('.field-personal-loan-offer-panel');
          if (otpPanel && personalPanel) {
            otpPanel.dataset.visible = 'false';
            otpPanel.style.display = 'none';
            personalPanel.dataset.visible = 'true';
            personalPanel.style.display = 'grid';
            return; // Prevent top-level section transition
          }
        }

        // Handle Requirement: back_button inside field-type-of-loan-panel (internal switch)
        if (button.name === 'back_button' && button.closest('.field-type-of-loan-panel')) {
          e.preventDefault();
          const otpPanel = section.querySelector('.field-enter-otp-panel');
          if (otpPanel) {
            [
              '.field-customer-details-panel',
              '.field-full-name-as-per-pan',
              '.field-personal-details-panel',
              '.field-address-details',
              '.field-employer-details-panel',
              '.field-work-email-id-panel',
              '.field-type-of-loan-panel',
            ].forEach((sel) => {
              const panel = section.querySelector(sel);
              if (panel) {
                panel.dataset.visible = 'false';
                panel.style.display = 'none';
              }
            });
            otpPanel.dataset.visible = 'true';
            otpPanel.style.display = 'grid';
            otpPanel.scrollIntoView({ behavior: 'smooth' });
            return; // Prevent top-level section transition
          }
        }

        // Handle Requirements 3, 4, and 5: Top-level section navigation
        // Note: Req 3 (submit_otp) is added to isBack to trigger previous section navigation
        const isBack = ['back_button', 'Back', 'Back_button'].includes(button.name);
        const targetSection = isBack ? currentSections[currentIndex - 1] : currentSections[currentIndex + 1];

        if (!targetSection || currentIndex === -1) return;

        const navButtons = ['confirm_cutomer_details_button', 'continue', 'Continue', 'proceed', 'proceed_button', 'confirm_button', 'Confirm', 'back_button', 'Back', 'Back_button', 'submit_otp', 'submit_otp_button'];
        if (!navButtons.includes(button.name)) return;

        e.preventDefault();

        // Remove active-step from current section and its ancestors
        [section, ...currentSections].forEach((s) => s.classList.remove('active-step'));

        // Add active-step to target section
        targetSection.classList.add('active-step');

        // Handle specific requirement: When going back to the first container, show the OTP panel
        if (isBack && currentSections.indexOf(targetSection) === 0) {
          const personalPanel = targetSection.querySelector('.field-personal-loan-offer-panel');
          const otpPanel = targetSection.querySelector('.field-enter-otp-panel');
          if (personalPanel && otpPanel) {
            personalPanel.dataset.visible = 'false';
            personalPanel.style.display = 'none';
            otpPanel.dataset.visible = 'true';
            otpPanel.style.display = 'block';
          }
        }

        // Propagate active-step to all ancestor sections to ensure visibility
        let ancestor = targetSection.parentElement?.closest('.section');
        while (ancestor) {
          ancestor.classList.add('active-step');
          ancestor.style.display = 'block';
          ancestor = ancestor.parentElement?.closest('.section');
        }
      });
    });
  });
}

export default async function decorate(block) {
  // Remove IntersectionObserver as it conflicts with 'display: none' in CSS
  // Load fragments immediately to initialize the stepper flow
  const links = [...block.querySelectorAll('a[href]')];

  const fragments = await Promise.all(
    links.map(async (link) => {
      const url = new URL(link.href);
      return loadFragment(url.pathname);
    }),
  );

  block.textContent = '';

  fragments.forEach((fragment) => {
    if (!fragment) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'embedded-form-wrapper';

    [...fragment.children].forEach((child) => {
      if (child.classList.contains('section')) {
        child.classList.add('form-container');
      }
      wrapper.append(child);
    });

    block.append(wrapper);
  });

  // Remove column classes on mobile to ensure they stack correctly
  if (window.matchMedia('(width <= 900px)').matches) {
    const journeySelectors = [
      '.field-step-mobile-phone',
      '.field-step-pan-card',
      '.field-step-date-of-birth',
      '.field-step-cheque-bank-details',
      '.field-full-name',
      '.field-mobile-number',
      '.field-date-of-birth',
      '.field-pan-card',
      '.field-pan',
      '.field-current-address',
      '.field-residence-type',
      '.field-loan-amount',
      '.field-emi-amount',
      '.field-tenure',
      '.field-processing-fee',
      '.field-rate-of-interest',
      '.field-employer-name',
      '.field-schedule-of-charges',
      '.field-type-of-loan',
      '.field-otp-attempts-info',
      '.field-submit-otp',
      '.field-resend',
      '.field-back'
    ];
    journeySelectors.forEach((sel) => {
      block.querySelectorAll(sel).forEach((field) => field.classList.remove('col-3'));
    });

    const col4Selectors = [
      '.field-income-source',
      '.field-date-of-birth',
      '.field-pan-card',
      '.field-mobile-number',
      '.field-salary-bank-dropdown',
      '.field-salary-ac-number',
      '.field-ifsc',
      '.field-bank-name',
    ];
    col4Selectors.forEach((sel) => {
      block.querySelectorAll(sel).forEach((field) => field.classList.replace('col-4', 'col-12'));
    });

    const stackSelectors = [
      '[class*="field-first-name"]',
      '[class*="field-middle-name"]',
      '[class*="field-last-name"]',
      '[class*="field-employer-company-name-dropdown"]',
      '[class*="field-employer-company-name-text"]',
      '[class*="field-industry-type"]',
      '[class*="field-monthly-net-income-salary"]',
      '[class*="field-ongoing-emis-if-any"]',
      '.field-gender',
      '.field-pan-number',
      '.field-primary-email-panel',
      '.field-work-email-panel',
      '.field-loan-application-number',
      '.field-loan-application-number-value',
      '.field-contact-note',
      '.field-xpress-personal-loan-summary-panel',

    ];
    stackSelectors.forEach((sel) => {
      block.querySelectorAll(sel).forEach((field) => {
        const colClass = [...field.classList].find((c) => c.startsWith('col-'));
        if (colClass) field.classList.remove(colClass);
      });
    });

  }

  // Ensure the stepper is initialized after the fragments are added to the DOM
  requestAnimationFrame(() => {
    initializeStepper();
  });
}