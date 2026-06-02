import { loadFragment } from '../fragment/fragment.js';

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
      button.addEventListener('click', async () => {
        const currentSections = getSections();
        const currentIndex = currentSections.indexOf(section);
        const isBack = ['back_button', 'Back', 'Back_button'].includes(button.name);
        const targetSection = isBack ? currentSections[currentIndex - 1] : currentSections[currentIndex + 1];

        if (!targetSection || currentIndex === -1) return;

        const navButtons = ['view_loan_eligibility', 'confirm_cutomer_details_button', 'continue', 'Continue', 'proceed', 'proceed_button', 'confirm_button', 'Confirm', 'back_button', 'Back', 'Back_button', 'submit_otp'];
        if (!navButtons.includes(button.name)) return;

        if (button.name === 'view_loan_eligibility') {
          try {
            const response = await fetch('https://mocki.io/v1/52531fa2-1899-4761-9e96-58fda44733c8');
            if (!response.ok) {
              throw new Error('Eligibility check failed');
            }
          } catch (error) {
            return; // Stop the transition if the API call is not successful
          }
        }

        // Remove active-step from current section and its ancestors
        [section, ...currentSections].forEach((s) => s.classList.remove('active-step'));

        // Add active-step to target section
        targetSection.classList.add('active-step');

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

  // Decorate Income Verification field cards
  const ivField = block.querySelector('.field-income-verification-method');
  if (ivField && ivField.dataset.description) {
    const descriptions = ivField.dataset.description.split('|').map((s) => s.trim());

    ivField.querySelectorAll('.radio-wrapper').forEach((wrapper, index) => {
      const input = wrapper.querySelector('input');
      const label = wrapper.querySelector('label');
      const descText = descriptions[index];

      const header = document.createElement('div');
      header.className = 'iv-card-header';
      input.name = 'income_verification_method'; // Normalize name as per request
      header.append(input, label);

      const desc = document.createElement('p');
      desc.className = 'iv-card-desc';
      desc.textContent = descText || '';

      wrapper.replaceChildren(header, desc);
      if (index === 0) {
        const badge = document.createElement('span');
        badge.className = 'iv-recommended';
        badge.textContent = 'Recommended';
        wrapper.append(badge);
      }
    });
  }

  // Remove column classes on mobile to ensure they stack correctly
  if (window.matchMedia('(width <= 900px)').matches) {
    const journeySelectors = [
      '.field-step-mobile-phone',
      '.field-step-pan-card',
      '.field-step-date-of-birth',
      '.field-step-cheque-bank-details',
    ];
    journeySelectors.forEach((sel) => {
      block.querySelectorAll(sel).forEach((field) => field.classList.remove('col-3'));
    });

    const col4Selectors = [
      '.field-income-source',
      '.field-date-of-birth',
      '.field-mobile-number',
      'field-salary-bank-dropdown',
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