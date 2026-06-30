import { subscribe } from '../../rules/index.js';

export default function decorate(element, fd, container, formId) {
  subscribe(element, formId, (_element, fieldModel) => {

    const pad = (n) => String(n).padStart(2, '0');
    const formatDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    if (fd.name === 'expiry_date' || fd.name === 'date_of_expiry') {
      const today = new Date();
      today.setDate(today.getDate() + 1); // Set to tomorrow
      fieldModel.minimum = formatDate(today);
      const maxDate = new Date();
      maxDate.setFullYear(Math.min(maxDate.getFullYear() + 100, 9999)); // Max 100 years from now, capped at 9999
      fieldModel.maximum = formatDate(maxDate);

    } else if (fd.name === 'dateOfAcknowledgement') {
      const today = new Date();
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - 90); // 90 days before today
      fieldModel.minimum = formatDate(pastDate);
      fieldModel.maximum = formatDate(today);

    } else {
      // Calculate minDate (today - maxAge) and maxDate (today - minAge)
      const today = new Date();
      // Default DOB logic
      const minAge = Number(fd.properties.minAge) || 18;
      const maxAge = Number(fd.properties.maxAge) || 100;

      const minDate = new Date(today.getFullYear() - maxAge, today.getMonth(), today.getDate());
      const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());

      fieldModel.minimum = formatDate(minDate);
      fieldModel.maximum = formatDate(maxDate);
    }
    _element.classList.remove('field-valid');
  });
}