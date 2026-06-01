import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';

  const fragment = await loadFragment(navPath);

  block.textContent = '';

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';

  const pictures = fragment.querySelectorAll('picture');

  const logo = document.createElement('div');
  logo.className = 'nav-logo';

  const secure = document.createElement('div');
  secure.className = 'nav-secure';

  if (pictures[0]) {
    logo.append(pictures[0].cloneNode(true));
  }

  if (pictures[1]) {
    secure.append(pictures[1].cloneNode(true));
  }

  navWrapper.append(logo, secure);
  block.append(navWrapper);
}