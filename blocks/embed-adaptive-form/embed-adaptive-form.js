import { loadFragment } from '../fragment/fragment.js';

function initializeStepper() {
  const sections = document.querySelectorAll(
    'main .embed-adaptive-form-container, main .form-container',
  );

  if (!sections.length) return;

  // Hide all except first
  sections.forEach((section, index) => {
    section.classList.toggle('active-step', index === 0);
  });

  sections.forEach((section, index) => {
    const buttons = section.querySelectorAll('button');

    buttons.forEach((button) => {
      button.addEventListener('click', async () => {
        const nextSection = sections[index + 1];
        if (!nextSection) return;

        if (button.name === 'view_loan_eligibility') {
          await fetch('https://mocki.io/v1/52531fa2-1899-4761-9e96-58fda44733c8');
        }

        section.classList.remove('active-step');
        nextSection.classList.add('active-step');

        nextSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
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

    wrapper.append(...fragment.children);

    block.append(wrapper);
  });

  // Ensure the stepper is initialized after the fragments are added to the DOM
  requestAnimationFrame(() => {
    initializeStepper();
  });
}