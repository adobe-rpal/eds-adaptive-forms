import { loadFragment } from '../fragment/fragment.js';

export default async function decorate(block) {
  const fragment = await loadFragment('/footer');

  block.textContent = '';

  const footerWrapper = document.createElement('div');
  footerWrapper.className = 'footer-wrapper';

  while (fragment.firstElementChild) {
    footerWrapper.append(fragment.firstElementChild);
  }

  block.append(footerWrapper);
}