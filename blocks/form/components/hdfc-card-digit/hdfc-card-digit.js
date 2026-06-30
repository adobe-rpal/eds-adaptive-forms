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

    inputField.addEventListener('input', (e) => {
      e.preventDefault();
      const cleaned = e.target.value.replace(/\D/g, ''); // remove non-digits
      e.target.value = cleaned;
    });

    inputField.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      const cleaned = pasted.replace(/\D/g, '');
      const { selectionStart, selectionEnd, value: currentValue } = e.target;
      // eslint-disable-next-line max-len
      const finalValue = (String(currentValue.substring(0, selectionStart) + cleaned + currentValue.substring(selectionEnd)))?.slice(0, maxLength);
      e.target.value = finalValue;
      // blur eveny required to make validation for copy paste event
      inputField.addEventListener('blur', (blurEvent) => {
        blurEvent.preventDefault();
        fieldModel.value = blurEvent.target.value;
      });
    });

    inputField.addEventListener('change', (e) => {
      e.preventDefault();
      const fieldLength = (String(e.target.value)?.length);
      // eslint-disable-next-line max-len
      const isValid = !(!fieldLength && required) && !(fieldLength < minLength) && !(fieldLength > maxLength);
      if (isValid) {
        fieldModel.markAsInvalid('');
      } else if (!fieldLength && required) {
        [' ', constraintMessages?.required].forEach((el) => fieldModel.markAsInvalid(el));
      } else if (fieldLength < minLength) {
        [' ', constraintMessages?.minLength].forEach((el) => fieldModel.markAsInvalid(el));
      } else if (fieldLength > maxLength) {
        [' ', constraintMessages?.maxLength].forEach((el) => fieldModel.markAsInvalid(el));
      }
    });
  });
  return element;
}
