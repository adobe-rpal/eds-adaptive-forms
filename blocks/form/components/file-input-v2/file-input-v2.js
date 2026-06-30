import { updateOrCreateInvalidMsg, stripTags } from '../../util.js';
import { fileAttachmentText, dragDropText, defaultErrorMessages } from '../../constant.js';

const fileSizeRegex = /^(\d*\.?\d+)(\\?(?=[KMGT])([KMGT])(?:i?B)?|B?)$/i;

/**
 * converts a string of the form "10MB" to bytes. If the string is malformed 0 is returned
 * @param {string} str - Size string with unit (e.g., "10MB")
 * @returns {number} Size in bytes
 */
function getSizeInBytes(str) {
  const sizes = {
    KB: 1, MB: 2, GB: 3, TB: 4,
  };
  let sizeLimit = 0;
  const matches = fileSizeRegex.exec(str.trim());
  if (matches != null) {
    const symbol = matches[2] || 'kb';
    const size = parseFloat(matches[1]);
    const i = 1024 ** sizes[symbol.toUpperCase()];
    sizeLimit = Math.round(size * i);
  }
  return sizeLimit;
}

/**
 * matches the given mediaType with the accepted mediaTypes
 * @param {string} mediaType - mediaType of the file to match
 * @param {Array} accepts - accepted mediaTypes
 * @returns {boolean} false if the mediaType is not accepted
 */
function matchMediaType(mediaType, accepts, fileName, allowedExtensions) {
  if (!mediaType || !accepts?.length || !fileName) return false;

  const mediaTypeLC = mediaType.toLowerCase();
  const fileNameLC = fileName.toLowerCase();
  const dotIndex = fileNameLC.lastIndexOf('.');
  const fileExt = dotIndex !== -1 ? fileNameLC.slice(dotIndex + 1) : '';

  const normalizeExt = (ext) => ext.startsWith('.') ? ext.slice(1).toLowerCase() : ext.toLowerCase();

  const mimeTypeValid = accepts.some((accept) => {
    const acc = accept.trim().toLowerCase();

    if (acc.includes('/')) {
      return acc.includes('*')
        ? mediaTypeLC.startsWith(acc.split('/')[0] + '/')
        : mediaTypeLC === acc;
    }

    return fileExt === normalizeExt(acc);
  });

  const extValid = !allowedExtensions?.length || allowedExtensions.some((ext) => {
    const extLC = ext.toLowerCase();
    return (
      extLC === fileExt ||         // e.g., 'png'
      extLC === mediaTypeLC        // e.g., 'image/png'
    );
  });

  return mimeTypeValid && extValid;
}


/**
 * checks whether the size of the files in the array is within the maxFileSize or not
 * @param {string|number} maxFileSize - maxFileSize in bytes or string with the unit
 * @param {File[]} files - array of File objects
 * @returns {boolean} false if any file is larger than the maxFileSize
 */
function checkMaxFileSize(maxFileSize, files) {
  const sizeLimit = typeof maxFileSize === 'string' ? getSizeInBytes(maxFileSize) : maxFileSize;
  return Array.from(files).find((file) => file.size > sizeLimit) === undefined;
}

/**
 * checks whether the mediaType of the files in the array are accepted or not
 * @param {Array} acceptedMediaTypes - Array of accepted media types
 * @param {File[]} files - Array of File objects
 * @returns {boolean} false if the mediaType of any file is not accepted
 */
function checkAccept(acceptedMediaTypes, files, allowedExtensions) {
  if ((!acceptedMediaTypes || acceptedMediaTypes.length === 0) && (!allowedExtensions || allowedExtensions.length === 0) || !files.length) {
    return true;
  }
  const invalidFile = Array.from(files)
    .some((file) => !matchMediaType(file.type, acceptedMediaTypes, file.name, allowedExtensions));
  return !invalidFile;
}

/**
 * triggers file Validation for the given input element and updates the error message
 * @param {HTMLInputElement} input - File input element
 * @param {FileList} files - List of files to validate
 * @param {boolean} hasIncrementedDocCount - Flag to track if this instance has already incremented doccount
 * @returns {boolean} Whether doccount was incremented
 */
function fileValidation(input, files, hasIncrementedDocCount, field) {
  const multiple = input.hasAttribute('multiple');
  const acceptedFile = (input.getAttribute('accept') || '').split(',');
  const minItems = (parseInt(input.dataset.minItems, 10) || 1);
  const maxItems = (parseInt(input.dataset.maxItems, 10) || -1);
  const fileSize = (field && field.properties && field.properties.maxFileSize) || '2MB';
  const allowedExtensions = (field && field.properties && field.properties.allowedExtensions) || [];
  let constraint = '';
  let errorMessage = '';
  const wrapper = input.closest('.field-wrapper');
  const form = input.closest('form');
  
  if (!checkAccept(acceptedFile, files, allowedExtensions)) {
    constraint = 'accept';
  } else if (!checkMaxFileSize(fileSize, files)) {
    constraint = 'maxFileSize';
    errorMessage = defaultErrorMessages.maxFileSize?.replace(/\$0/, fileSize) || `File size should not exceed ${fileSize}`;
  } else if (multiple && maxItems !== -1 && files.length > maxItems) {
    constraint = 'maxItems';
    errorMessage = defaultErrorMessages.maxItems.replace(/\$0/, maxItems);
  } else if (multiple && minItems !== 1 && files.length < minItems) {
    constraint = 'minItems';
    errorMessage = defaultErrorMessages.minItems.replace(/\$0/, minItems);
  }
  
  // Find the upload success checkbox
  const uploadSuccessCheckbox = form && form.querySelector('input[name="isDocUploadSuccess"]');
  
  if (constraint.length) {
    const finalMessage = wrapper.dataset[constraint]
    || errorMessage
    || defaultErrorMessages[constraint];
    input.setCustomValidity(finalMessage);
    updateOrCreateInvalidMsg(
      input,
      finalMessage,
    );
    
    // Update checkbox and dispatch events when file is invalid
    if (uploadSuccessCheckbox) {
      uploadSuccessCheckbox.checked = false;
      uploadSuccessCheckbox.value = 'off';
      
      // Dispatch change event
      const changeEvent = new Event('change', { bubbles: true });
      uploadSuccessCheckbox.dispatchEvent(changeEvent);
      
      // Dispatch custom event for validation status
      const validationEvent = new CustomEvent('fileValidationStatus', {
        bubbles: true,
        detail: {
          isValid: false,
          constraint,
          errorMessage: finalMessage
        }
      });
      uploadSuccessCheckbox.dispatchEvent(validationEvent);
      
      // Log checkbox value
      console.log('isDocUploadSuccess value after invalid file:', {
        checked: uploadSuccessCheckbox.checked,
        value: uploadSuccessCheckbox.value
      });
    }
    return false;
  } else {
    input.setCustomValidity('');
    updateOrCreateInvalidMsg(input, '');
    
    // Set checkbox to on when file is valid
    if (uploadSuccessCheckbox) {
      uploadSuccessCheckbox.checked = true;
      uploadSuccessCheckbox.value = 'on';
      
      // Dispatch change event
      const changeEvent = new Event('change', { bubbles: true });
      uploadSuccessCheckbox.dispatchEvent(changeEvent);
      
      // Increment doccount field only once per instance
      if (!hasIncrementedDocCount) {
        const doccountField = form && form.querySelector('input[name="doccount"]');
        if (doccountField) {
          const currentCount = parseInt(doccountField.value, 10) || 0;
          doccountField.value = currentCount + 1;
          
          // Dispatch change event for doccount
          const doccountEvent = new Event('change', { bubbles: true });
          doccountField.dispatchEvent(doccountEvent);
          
          // Log doccount value
          console.log('doccount value after valid upload:', doccountField.value);
          return true;
        }
      }
      
      // Dispatch custom event for validation status
      const validationEvent = new CustomEvent('fileValidationStatus', {
        bubbles: true,
        detail: {
          isValid: true,
          constraint: null,
          errorMessage: null
        }
      });
      uploadSuccessCheckbox.dispatchEvent(validationEvent);
      
      // Log checkbox value
      console.log('isDocUploadSuccess value after valid file:', {
        checked: uploadSuccessCheckbox.checked,
        value: uploadSuccessCheckbox.value
      });
    }
    return false;
  }
}

/**
 * Formats bytes into a human-readable string with appropriate unit
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatBytes(bytes) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(0))} ${sizes[i]}`;
}

/**
 * Updates the index attribute for a collection of elements
 * @param {Array} elements - Array of DOM elements
 */
function updateButtonIndex(elements = []) {
  elements.forEach((element, index) => {
    element.dataset.index = index;
  });
}

/**
 * Dispatches a change event on the input element
 * @param {HTMLInputElement} input - File input element
 * @param {Array} files - Array of files
 */
function dispatchChangeEvent(input, files) {
  if (!files.length) {
    input.value = null;
  }
  const options = { bubbles: true, detail: { files, deletion: true } };
  const changeEvent = new CustomEvent('change', options);
  input.dispatchEvent(changeEvent);
}

/**
 * Creates an HTML element for the attached file with document preview
 * @param {File} file - File object
 * @param {number} index - Index of the file
 * @returns {HTMLElement} File description element
 */
function fileElement(file, index) {
  const el = document.createElement('div');
  el.dataset.index = index;
  el.classList.add('file-input-v2-file');
  
  // Create the file preview container
  const previewContainer = document.createElement('div');
  previewContainer.classList.add('file-input-v2-preview-container');
  
  // Add file preview (could be an icon or actual preview)
  const preview = document.createElement('div');
  preview.classList.add('file-input-v2-preview');
  
  // Create preview based on file type
  if (file.type.startsWith('image/')) {
    // Image preview
    const img = document.createElement('img');
    img.classList.add('file-input-v2-preview-img');
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
    };
    preview.appendChild(img);
  } else if (file.type === 'application/pdf') {
    // PDF preview
    const embed = document.createElement('embed');
    embed.classList.add('file-input-v2-preview-pdf');
    const objectUrl = URL.createObjectURL(file);
    embed.src = objectUrl;
    embed.type = 'application/pdf';
    preview.appendChild(embed);
    
    // Add PDF icon overlay
    const pdfIcon = document.createElement('div');
    pdfIcon.classList.add('file-input-v2-preview-pdf-icon');
    preview.appendChild(pdfIcon);
  } else {
    // Default document icon for other file types
    preview.classList.add('file-input-v2-preview-document');
  }
  
  previewContainer.appendChild(preview);
  
  // Create file info container
  const fileInfo = document.createElement('div');
  fileInfo.classList.add('file-input-v2-file-info');
  
  // Add file name
  const fileName = document.createElement('span');
  fileName.classList.add('file-input-v2-file-name');
  fileName.textContent = file.name;
  fileInfo.appendChild(fileName);
  
  // Add file size
  const fileSize = document.createElement('span');
  fileSize.classList.add('file-input-v2-file-size');
  fileSize.textContent = formatBytes(file.size);
  fileInfo.appendChild(fileSize);
  
  // Assemble the components
  el.appendChild(previewContainer);
  el.appendChild(fileInfo);
  
  return el;
}

/**
 * Generates a consistent label with document type and side
 * @param {string} prefix - The prefix for the label (e.g., "Upload" or "Re-upload")
 * @param {string} documentType - The type of document
 * @param {string} sideOfDocument - The side of the document
 * @returns {string} The generated label
 */
function generateLabel(prefix, documentType, sideOfDocument) {
  let label = prefix;
  if (documentType) label += ` ${documentType}`;
  if (sideOfDocument) label += ` ${sideOfDocument}`;
  return label.trim();
}

/**
 * Creates the initial upload UI with icon, label, description and CTA
 * @param {HTMLElement} wrapper - Wrapper element
 * @param {Object} field - Field configuration object
 * @returns {HTMLElement} Upload UI container
 */
function createInitialUploadUI(wrapper, field) {
  const input = wrapper.querySelector('input');
  console.log('Field properties:', field && field.properties);
  const documentType = wrapper.closest('.file-input-v2-component').dataset.documentType || '';
  const sideOfDocument = wrapper.closest('.file-input-v2-component').dataset.sideOfDocument || '';
  const hideDefaultLabels = (field && field.properties && field.properties.hideDefaultLabels) || false;
  
  console.log('Document type:', documentType);
  console.log('Side of document:', sideOfDocument);
  
  const uploadUI = document.createElement('div');
  uploadUI.className = 'file-input-v2-initial';
  
  // Create icon
  const icon = document.createElement('div');
  icon.className = 'file-input-v2-icon';
  uploadUI.appendChild(icon);

  // Create CTA button text
  const ctaText = (field && field.properties && field.properties.buttonText) || 'Browse and upload.';
  
  if (!hideDefaultLabels) {
    // Prefer field.label.value (stripped) so dynamic month labels show inside the box;
    // fall back to documentType-based label if no field label is set.
    const fieldLabelText = field && field.label && field.label.value
      ? stripTags(field.label.value).trim()
      : '';
    const labelText = fieldLabelText || generateLabel('Upload', documentType, sideOfDocument);

    // Create label — mark with data attribute so it can be updated reactively

    // Create label
    const label = document.createElement('div');
    label.className = 'file-input-v2-label';
    label.dataset.dynamicLabel = 'true';
    label.textContent = labelText;
    uploadUI.appendChild(label);
    
    // Create description text
    const descriptionText = (field && field.properties && field.properties.description) || 'Only JPEG/JPG/PNG/PDF with file size less than 2MB';
    
    // Create description
    const description = document.createElement('div');
    description.className = 'file-input-v2-description';
    description.textContent = descriptionText;
    uploadUI.appendChild(description);
  }
  
  // Create CTA link button
  const cta = document.createElement('a');
  cta.className = 'file-input-v2-cta';
  cta.href = '#';
  cta.textContent = ctaText;
  cta.addEventListener('click', (e) => {
    e.preventDefault();
    // Find and update the checkbox
    const form = wrapper.closest('form');
    const uploadSuccessCheckbox = form && form.querySelector('input[name="isDocUploadSuccess"]');
    if (uploadSuccessCheckbox) {
      uploadSuccessCheckbox.checked = false;
      uploadSuccessCheckbox.value = 'off';
      
      // Dispatch change event
      const changeEvent = new Event('change', { bubbles: true });
      uploadSuccessCheckbox.dispatchEvent(changeEvent);
    }
    
    // Trigger file input click
    input.click();
  });
  uploadUI.appendChild(cta);
  
  // Hide the original input
  input.style.display = 'none';
  
  // Add the upload UI to the wrapper
  wrapper.appendChild(uploadUI);
  
  return uploadUI;
}

/**
 * Creates the uploaded state UI with document preview and re-upload button
 * @param {HTMLElement} wrapper - Wrapper element
 * @param {Object} field - Field configuration object
 * @param {File} file - Uploaded file
 * @returns {HTMLElement} Uploaded state UI container
 */
function createUploadedStateUI(wrapper, field, file) {
  const input = wrapper.querySelector('input');
  console.log('Field properties (re-upload):', field && field.properties);
  const documentType = wrapper.closest('.file-input-v2-component').dataset.documentType || '';
  const sideOfDocument = wrapper.closest('.file-input-v2-component').dataset.sideOfDocument || '';
  
  console.log('Document type (re-upload):', documentType);
  console.log('Side of document (re-upload):', sideOfDocument);
  
  // Create re-upload button text using helper function
  const reUploadText = generateLabel('Re-upload', documentType, sideOfDocument);
  console.log('Generated re-upload label:', reUploadText);
  
  const uploadedUI = document.createElement('div');
  uploadedUI.className = 'file-input-v2-uploaded';
  
  // Create file element (preview + info)
  const fileEl = fileElement(file, 0);
  uploadedUI.appendChild(fileEl);
  
  // Create re-upload link button
  const reUploadBtn = document.createElement('a');
  reUploadBtn.className = 'file-input-v2-reupload-btn';
  reUploadBtn.href = '#';
  reUploadBtn.textContent = reUploadText;
  reUploadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // Find and update the checkbox
    const form = wrapper.closest('form');
    const uploadSuccessCheckbox = form && form.querySelector('input[name="isDocUploadSuccess"]');
    if (uploadSuccessCheckbox) {
      uploadSuccessCheckbox.checked = false;
      uploadSuccessCheckbox.value = 'off';
      
      // Dispatch change event
      const changeEvent = new Event('change', { bubbles: true });
      uploadSuccessCheckbox.dispatchEvent(changeEvent);
    }
    
    // Trigger file input click
    input.click();
  });
  uploadedUI.appendChild(reUploadBtn);
  
  return uploadedUI;
}

/**
 * Creates a file handler object with methods for managing files
 * @param {Array} allFiles - Array to store all files
 * @param {HTMLInputElement} input - File input element
 * @param {Object} field - Field configuration object
 * @param {boolean} hasIncrementedDocCount - Flag to track if this instance has already incremented doccount
 * @returns {Object} File handler object with methods
 */
function createFileHandler(allFiles, input, field, hasIncrementedDocCount) {
  const wrapper = input.closest('.field-wrapper');
  
  return {
    removeFile: (index) => {
      allFiles.splice(index, 1);
      
      // Remove the uploaded state UI
      const uploadedUI = wrapper.querySelector('.file-input-v2-uploaded');
      if (uploadedUI) {
        uploadedUI.remove();
      }
      
      // Show the initial upload UI
      const initialUI = wrapper.querySelector('.file-input-v2-initial');
      if (initialUI) {
        initialUI.style.display = 'flex';
      } else {
        createInitialUploadUI(wrapper, field);
      }
      
      fileValidation(input, allFiles, hasIncrementedDocCount, field);
      dispatchChangeEvent(input, allFiles);
    },

    attachFiles: (inputEl, files) => {
      const multiple = inputEl.hasAttribute('multiple');
      let newFiles = Array.from(files);
      
      if (!multiple) {
        newFiles = [newFiles[0]];
      }

      // Validate files before proceeding
      const acceptedFile = (inputEl.getAttribute('accept') || '').split(',');
      const allowedExtensions = (field && field.properties && field.properties.allowedExtensions) || [];
      
      // Get max file size from field properties
      const fileSize = (field && field.properties && field.properties.maxFileSize) || '2MB';

      // Check if files are valid (both type and size)
      if (!checkAccept(acceptedFile, newFiles, allowedExtensions)) {
        // Show error message for invalid file type
        const wrapper = inputEl.closest('.field-wrapper');
        const errorMessage = wrapper.dataset.accept || defaultErrorMessages.accept || "The specified file type not supported.";
        
        // Set validation message
        inputEl.setCustomValidity(errorMessage);
        updateOrCreateInvalidMsg(inputEl, errorMessage);
        
        // Reset file input and clear files array
        allFiles.splice(0, allFiles.length);
        inputEl.value = null;
        
        // Show the initial upload UI
        const initialUI = wrapper.querySelector('.file-input-v2-initial');
        if (initialUI) {
          initialUI.style.display = 'flex';
        }
        
        // Remove any existing uploaded state UI
        const existingUploadedUI = wrapper.querySelector('.file-input-v2-uploaded');
        if (existingUploadedUI) {
          existingUploadedUI.remove();
        }
        
        // Update checkbox and dispatch events
        const form = wrapper.closest('form');
        const uploadSuccessCheckbox = form && form.querySelector('input[name="isDocUploadSuccess"]');
        if (uploadSuccessCheckbox) {
          uploadSuccessCheckbox.checked = false;
          uploadSuccessCheckbox.value = 'off';
          
          // Dispatch change event
          const changeEvent = new Event('change', { bubbles: true });
          uploadSuccessCheckbox.dispatchEvent(changeEvent);
          
          // Dispatch validation status event
          const validationEvent = new CustomEvent('fileValidationStatus', {
            bubbles: true,
            detail: {
              isValid: false,
              constraint: 'accept',
              errorMessage: errorMessage
            }
          });
          uploadSuccessCheckbox.dispatchEvent(validationEvent);
        }
        
        // Dispatch change event to notify of file removal
        dispatchChangeEvent(inputEl, []);
        return;
      } else if (!checkMaxFileSize(fileSize, newFiles)) {
        // Show error message for invalid file size
        const wrapper = inputEl.closest('.field-wrapper');
        const errorMessage = defaultErrorMessages.maxFileSize?.replace(/\$0/, fileSize) || `File size should not exceed ${fileSize}.`;
        
        // Set validation message
        inputEl.setCustomValidity(errorMessage);
        updateOrCreateInvalidMsg(inputEl, errorMessage);
        
        // Reset file input and clear files array
        updateOrCreateInvalidMsg(inputEl, errorMessage);
        inputEl.value = null;
        
        // Show the initial upload UI
        const initialUI = wrapper.querySelector('.file-input-v2-initial');
        if (initialUI) {
          initialUI.style.display = 'flex';
        }
        
        // Remove any existing uploaded state UI
        const existingUploadedUI = wrapper.querySelector('.file-input-v2-uploaded');
        if (existingUploadedUI) {
          existingUploadedUI.remove();
        }
        
        // Update checkbox and dispatch events
        const form = wrapper.closest('form');
        const uploadSuccessCheckbox = form && form.querySelector('input[name="isDocUploadSuccess"]');
        if (uploadSuccessCheckbox) {
          uploadSuccessCheckbox.checked = false;
          uploadSuccessCheckbox.value = 'off';
          
          // Dispatch change event
          const changeEvent = new Event('change', { bubbles: true });
          uploadSuccessCheckbox.dispatchEvent(changeEvent);
          
          // Dispatch validation status event
          const validationEvent = new CustomEvent('fileValidationStatus', {
            bubbles: true,
            detail: {
              isValid: false,
              constraint: 'maxFileSize',
              errorMessage: errorMessage
            }
          });
          uploadSuccessCheckbox.dispatchEvent(validationEvent);
        }
        
        // Dispatch change event to notify of file removal
        dispatchChangeEvent(inputEl, []);
        return;
      }
      
      // Clear any previous validation message
      inputEl.setCustomValidity('');
      updateOrCreateInvalidMsg(inputEl, '');
      
      // Clear existing files if not multiple
      if (!multiple) {
        allFiles.splice(0, allFiles.length);
      }
      
      allFiles.push(...newFiles);
      
      // Hide the initial upload UI
      const initialUI = wrapper.querySelector('.file-input-v2-initial');
      if (initialUI) {
        initialUI.style.display = 'none';
      }
      
      // Remove any existing uploaded state UI
      const existingUploadedUI = wrapper.querySelector('.file-input-v2-uploaded');
      if (existingUploadedUI) {
        existingUploadedUI.remove();
      }
      
      // Get the component root element
      const componentRoot = wrapper.closest('.file-input-v2-component');
      
      // Create and show the uploaded state UI with document properties
      const uploadedUI = createUploadedStateUI(wrapper, {
        properties: {
          documentType: componentRoot.dataset.documentType,
          documentSide: componentRoot.dataset.sideOfDocument
        }
      }, newFiles[0]);
      wrapper.appendChild(uploadedUI);
      
      // Update hasIncrementedDocCount based on validation result
      if (fileValidation(inputEl, allFiles, hasIncrementedDocCount, field)) {
        hasIncrementedDocCount = true;
      }
      dispatchChangeEvent(input, allFiles);
    },

    previewFile: (index) => {
      const file = allFiles[index];
      let url = file.data || window.URL.createObjectURL(file);
      if (file.data) {
        const lastIndex = url.lastIndexOf('/');
        /* added check for query param since sas url contains query params &
          does not have file name, encoding is not required in this case
        */
        if (lastIndex >= 0 && url.indexOf('?') === -1) {
          // encode the filename after last slash to ensure the handling of special characters
          url = `${url.substr(0, lastIndex)}/${encodeURIComponent(url.substr(lastIndex + 1))}`;
        }
      }
      window.open(url, '', 'scrollbars=no,menubar=no,height=600,width=800,resizable=yes,toolbar=no,status=no');
    },
  };
}

/**
 * Decorates the file-input-v2 component
 * @param {HTMLElement} fieldDiv - Field container element
 * @param {Object} field - Field configuration object
 * @param {HTMLFormElement} htmlForm - Form element
 * @returns {HTMLElement} Decorated field element
 */
export default async function decorate(fieldDiv, field, htmlForm) {
  const allFiles = [];
  const input = fieldDiv.querySelector('input');
  let hasIncrementedDocCount = false;
  
  // Store properties in data attributes
  fieldDiv.dataset.documentType = (field && field.properties && field.properties.documentType) || '';
  fieldDiv.dataset.sideOfDocument = (field && field.properties && field.properties.documentSide) || '';
  
  // Set default accept attribute if not present
  if (!input.hasAttribute('accept')) {
    input.setAttribute('accept', 'image/jpeg,image/png,application/pdf');
  }
  
  fieldDiv.classList.add('decorated', 'file-input-v2-component');
  
  // Create the initial upload UI
  const initialUI = createInitialUploadUI(fieldDiv, field);
  
  // Create file handler
  const fileHandler = createFileHandler(allFiles, input, field, hasIncrementedDocCount);
  
  // Set up event listeners
  input.addEventListener('change', (event) => {
    if (!(event && event.detail && event.detail.deletion)) {
        event.stopPropagation();
        fileHandler.attachFiles(input, event.target.files);
      }
  });
  
  // Handle drag and drop
  fieldDiv.addEventListener('dragover', (event) => {
    event.preventDefault();
    fieldDiv.classList.add('file-input-v2-dragover');
  });
  
  fieldDiv.addEventListener('dragleave', () => {
    fieldDiv.classList.remove('file-input-v2-dragover');
  });
  
  fieldDiv.addEventListener('drop', (event) => {
    event.preventDefault();
    fieldDiv.classList.remove('file-input-v2-dragover');
    fileHandler.attachFiles(input, (event && event.dataTransfer && event.dataTransfer.files) || []);
  });
  
  // Handle file preview click
  fieldDiv.addEventListener('click', (e) => {
    const input = fieldDiv.querySelector('input');
    // Only allow preview if there are no validation errors
    if (!input.validationMessage && 
        (e.target.closest('.file-input-v2-preview-container') || 
         e.target.closest('.file-input-v2-file-info'))) {
      const fileElement = e.target.closest('.file-input-v2-file');
      if (fileElement) {
        fileHandler.previewFile(fileElement.dataset.index);
      }
    }
  });
  
  // Pre-fill file attachment if value exists
  if (field.value) {
    const preFillFiles = Array.isArray(field.value) ? field.value : [field.value];
    const dataTransfer = new DataTransfer();
    const file = new File([preFillFiles[0].data], preFillFiles[0].name, { ...preFillFiles[0] });
    dataTransfer.items.add(file);
    // Pre-fill input field to mark it as a valid field
    input.files = dataTransfer.files;
    fileHandler.attachFiles(input, [preFillFiles[0].data]);
  }
  
  return fieldDiv;
}
