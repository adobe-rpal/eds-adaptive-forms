import { subscribe } from '../../rules/index.js';

function searchAndReplace(fieldDiv, key, value) {
  // Start with the original HTML for each update
  let html = fieldDiv.dataset.originalHtml;
  // Check for property keys in the format ${key} and replace them
  const placeholder = `\${${key}}`;
  if (html.includes(placeholder)) {
    html = html.replaceAll(placeholder, value || '');
  }
  // Update the HTML content
  fieldDiv.innerHTML = html;
}

export default function decorate(fieldDiv, fieldJson, container, formId) {
  // Store the original HTML content when first decorated
  if (!fieldDiv.dataset.originalHtml) {
    fieldDiv.dataset.originalHtml = fieldDiv.innerHTML;
  }

  // eslint-disable-next-line no-shadow
  subscribe(fieldDiv, formId, (fieldDiv, fieldModel) => {
    fieldModel.subscribe((e) => {
      const { payload } = e;
      payload?.changes?.forEach((change) => {
        if (change?.propertyName.includes('properties')) {
          const { currentValue } = change;
          const key = change.propertyName.split('properties.')[1];
          if (currentValue && key) {
            searchAndReplace(fieldDiv, key, currentValue);
          }
        }
      });
    }, 'change');
  });
}