import { loadFragment } from '../fragment/fragment.js';

function initializeStepper() {
  const getSections = () => [...document.querySelectorAll('main .embed-adaptive-form-container, main .form-container')];
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
        const nextSection = currentSections[currentIndex + 1];

        if (!nextSection) return;

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

        // Hide the current step
        section.classList.remove('active-step');
        // Show the next step
        nextSection.classList.add('active-step');

        // Ensure all ancestor sections are visible to support the nested structure
        let parent = nextSection.parentElement?.closest('.section');
        while (parent) {
          parent.style.display = 'block';
          parent = parent.parentElement?.closest('.section');
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

  // Ensure the stepper is initialized after the fragments are added to the DOM
  requestAnimationFrame(() => {
    initializeStepper();
  });
}