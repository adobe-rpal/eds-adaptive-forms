import { loadFragment } from '../fragment/fragment.js';

export default function decorate(block) {
  // Create observer to load form when block enters viewport
  const observer = new IntersectionObserver(async (entries) => {
    const [entry] = entries;
    if (entry.isIntersecting) {
      // Disconnect observer after loading to prevent multiple loads
      observer.disconnect();

      const links = [...block.querySelectorAll('a[href]')];
      const fragments = await Promise.all(links.map(async (link) => {
        const url = new URL(link.href);
        return loadFragment(url.pathname);
      }));

      block.textContent = '';
      fragments.forEach((fragment) => {
        if (fragment) {
          const wrapper = document.createElement('div');
          wrapper.className = 'embedded-form-wrapper';
          wrapper.append(...fragment.children);
          block.append(wrapper);
        }
      });
    }
  });

  // Start observing the block
  observer.observe(block);
}
