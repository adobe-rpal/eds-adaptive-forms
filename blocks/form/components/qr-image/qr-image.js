import { subscribe } from '../../rules/index.js';

export default function decorate(fieldDiv, fieldJson, container, formId) {
  // Create QR image element
  const qrImage = document.createElement('img');
  qrImage.classList.add('qr-image');
  qrImage.setAttribute('alt', 'QR Code');
  qrImage.setAttribute('role', 'img');

  // Create container
  const qrContainer = document.createElement('div');
  qrContainer.classList.add('qr-image-container');
  qrContainer.appendChild(qrImage);

  // Replace any existing content and add QR container
  fieldDiv.innerHTML = '';
  fieldDiv.appendChild(qrContainer);

  // Subscribe to field value changes
  subscribe(fieldDiv, formId, (_fieldDiv, fieldModel) => {
    // Subscribe to showQR event
    fieldModel.subscribe(() => {
      console.log('[QRImage] Showing QR code for form:', formId);
      const qrValue = myForm.properties.qrString;
      if (qrValue) {
        qrImage.src = `data:image/png;base64,${qrValue}`;
      }
    }, 'showQR');
  });

  return fieldDiv;
}
