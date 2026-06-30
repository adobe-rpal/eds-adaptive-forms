import { subscribe } from '../../rules/index.js';

export default function decorate(element, fd, container, formId) {
  subscribe(element, formId, (_element, fieldModel) => {
    // eslint-disable-next-line no-underscore-dangle
    const jsonModel = fieldModel?._jsonModel;
    const {
      constraintMessages,
      minLength,
      maxLength,
      required,
    } = jsonModel;

    const inputField = element.querySelector('input[type="text"]');

    inputField.addEventListener('input', () => {
      inputField.dispatchEvent(new Event('change', { bubbles: true }));
    });

  });
  return element;
}
