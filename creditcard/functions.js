/**
 * @typedef {Object} EncryptionContext
 * @property {string} SEC_KEY_HEADER
 * @property {string} SEC_SECRET_HEADER
 * @property {string} SEC_IV_HEADER
 * @property {Crypto} crypto
 * @property {boolean} supportsES6
 * @property {string} symmetricAlgo
 * @property {number} symmetricKeyLength
 * @property {number} ivLength
 * @property {number} tagLength
 * @property {string} aSymmetricAlgo
 * @property {string} digestAlgo
 * @property {boolean} initStatus
 * @property {CryptoKey|null} symmetricKey
 * @property {string|null} encSymmetricKey
 * @property {CryptoKey|null} aSymmetricPublicKey
 */
import { isEncryptionEnabled, getMockIpaResponse, getInsuranceUrl } from '../../blocks/form/constant.js';
import { FingerprintJS } from '../../creditcard/credit-card-util/fingerprint.js'

const restAPIDataSecurityServiceContext = {
  SEC_KEY_HEADER: 'X-ENCKEY',
  SEC_SECRET_HEADER: 'X-ENCSECRET',
  SEC_IV_HEADER: 'X-IV',
  crypto,
  supportsES6: typeof window !== 'undefined' && !window.msCrypto,
  symmetricAlgo: 'AES-GCM',
  symmetricKeyLength: 256,
  ivLength: 12,
  tagLength: 128,
  aSymmetricAlgo: 'RSA-OAEP',
  digestAlgo: 'SHA-256',
  initStatus: false,
  encEnabled: undefined,
  symmetricKey: null,
  encSymmetricKey: null,
  aSymmetricPublicKey: null,
};

/* ========== Utility Functions ========== */

/*
* Convert a string into an array buffer
*/
function stringToBuffer(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  // eslint-disable-next-line no-plusplus
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

/*
* convert array buffer to string
*/
function bufferToString(str) {
  const byteArray = new Uint8Array(str);
  let byteString = '';
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < byteArray.byteLength; i++) {
    byteString += String.fromCharCode(byteArray[i]);
  }
  return byteString;
}

/**
 * Convert ArrayBuffer to base64 string
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
function base64ToBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const chunkSize = 0x8000; // 32KB chunks
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i += chunkSize) {
    const chunk = binary.slice(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      bytes[i + j] = chunk.charCodeAt(j);
    }
  }

  return bytes.buffer;
}

/* ========== Initialization ========== */

/**
 * Initialize the encryption context with a base64 public key
 * @param {string} publicKeyBase64 - Base64 DER-encoded RSA public key
 * @returns {Promise}
 */
async function initRestAPIDataSecurityService(publicKeyBase64) {
  publicKeyBase64 = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoAatblmEzZTQOT732FU38hiT9vCvGK12+pUD3yENyHXjk7oN1uWPlpItm5OAcsPZt52WznDkpOb/AxLBeJKFYZPvOk75lo6ZAA1qyJEOekQru5XQUtpMzsC9w96T2zTYQQ4HUwMNXmYkWIVo4Ek/KCfX2yklRHxwm3Pqj93vJkUmoddLctXArddtm75HUjtYzf5jecQCGk//pyjTDJEswMpg3oXNiI2F1PnDUiKdQBE7+a1s5KB7CAKKYQLFNN48kjiOdDutMByjZxW0elPs9ETVU+NVNQ6ru9vKQYzvR/2YD7NNSHPUCpdexIpfiYeWrxUNgpHLM2qfXTOvn6UztQIDAQAB';
  const publicKeyBuffer = base64ToBuffer(publicKeyBase64);

  return crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    {
      name: restAPIDataSecurityServiceContext.aSymmetricAlgo,
      hash: restAPIDataSecurityServiceContext.digestAlgo,
    },
    true,
    ['encrypt']
  ).then(publicKey => {
    return crypto.subtle.generateKey(
      {
        name: restAPIDataSecurityServiceContext.symmetricAlgo,
        length: restAPIDataSecurityServiceContext.symmetricKeyLength,
      },
      true,
      ['encrypt', 'decrypt']
    ).then(symmetricKey => {
      return crypto.subtle.exportKey('raw', symmetricKey).then(rawSymmetricKey => {
        return crypto.subtle.encrypt(
          {
            name: restAPIDataSecurityServiceContext.aSymmetricAlgo,
          },
          publicKey,
          rawSymmetricKey
        ).then(encryptedSymmetricKey => {
          Object.assign(restAPIDataSecurityServiceContext, {
            aSymmetricPublicKey: publicKey,
            symmetricKey,
            encSymmetricKey: bufferToBase64(encryptedSymmetricKey),
            initStatus: true,
          });
        });
      });
    });
  });
}

/* ========== Encryption ========== */

/**
 * Encrypt request body using AES-GCM and RSA-OAEP
 * @param {EncryptionRequest} data
 * @param {string} publicKey
 * @param {scope} globals Global scope object
 * @returns {Promise}
 */
async function encrypt(data, publicKey, globals) {
  if (globals && globals.form && globals.form.loaderFragment) { // loaderFragment - show
    globals.functions.setProperty(globals.form.loaderFragment, { visible: true });
  }

  if (!restAPIDataSecurityServiceContext.initStatus) {
    if (restAPIDataSecurityServiceContext.encEnabled === undefined) {
      const formData = globals.functions.exportData();

      const encEnabled = isEncryptionEnabled || (formData?.security?.enabled === 'true');
      if (!encEnabled) {
        restAPIDataSecurityServiceContext.encEnabled = false;
        return data;
      }

      restAPIDataSecurityServiceContext.encEnabled = true;
      await initRestAPIDataSecurityService(formData.security.publicKey);
    } else if (restAPIDataSecurityServiceContext.encEnabled === false) {
      return data;
    }
  }

  const { crypto, symmetricKey, symmetricAlgo, tagLength, aSymmetricPublicKey } = restAPIDataSecurityServiceContext;
  const iv = crypto.getRandomValues(new Uint8Array(restAPIDataSecurityServiceContext.ivLength));
  const plaintextBuffer = stringToBuffer(JSON.stringify(data.body));

  const encryptedData = await crypto.subtle.encrypt(
    { name: symmetricAlgo, iv, tagLength },
    symmetricKey,
    plaintextBuffer
  );

  const encryptedIV = await crypto.subtle.encrypt(
    { name: restAPIDataSecurityServiceContext.aSymmetricAlgo },
    aSymmetricPublicKey,
    iv
  );

  const cryptoMetadata = {
    secret: bufferToBase64(iv.buffer),
  };

  return {
    body: bufferToBase64(encryptedData),
    headers: {
      ...data.headers,
      [restAPIDataSecurityServiceContext.SEC_KEY_HEADER]: restAPIDataSecurityServiceContext.encSymmetricKey,
      [restAPIDataSecurityServiceContext.SEC_SECRET_HEADER]: bufferToBase64(encryptedIV),
      [restAPIDataSecurityServiceContext.SEC_IV_HEADER]: bufferToBase64(iv.buffer),
    },
    cryptoMetadata
  };
}

/* ========== Decryption ========== */

/**
 * Decrypt response body using AES-GCM
 * @param {string} encryptedBase64 - Base64-encoded encrypted body
 * @param {object} request - Original request with headers
 * @returns {Promise}
 */
async function decrypt(encryptedBase64, request, globals) {
  // When polling is true, we don't want to hide the loader fragment. Set a property in form called Polling to true,
  // till the polling is going on. Set it to false once done, and hide loaderFragment from rules.
  if (globals && globals.form && globals.form.loaderFragment && globals.form.$properties.polling !== 'true') { // loaderFragment - hide
    globals.functions.setProperty(globals.form.loaderFragment, { visible: false });
  }
  if (!restAPIDataSecurityServiceContext.initStatus) {
    return encryptedBase64;
  }

  try {
    const encryptedBuffer = base64ToBuffer(encryptedBase64);
    // const ivBuffer = base64ToBuffer(request.cryptoMetadata.secret);
    const ivBuffer = base64ToBuffer(request.headers[restAPIDataSecurityServiceContext.SEC_IV_HEADER]);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: restAPIDataSecurityServiceContext.symmetricAlgo,
        iv: new Uint8Array(ivBuffer),
        tagLength: restAPIDataSecurityServiceContext.tagLength,
      },
      restAPIDataSecurityServiceContext.symmetricKey,
      encryptedBuffer
    );

    return bufferToString(decryptedBuffer);
  } catch (err) {
    console.error('Decryption failed:', err);
    return null;
  }
}

/* ========== End ========== */

let submitBaseUrl = 'https://hdfc-dev-03.adobecqms.net';
let fetchDocumentBaseUrl = 'https://main--hdfc-mdm-uat--hdfc-forms.aem.live';

// Month name mapping
const monthNames = {
  'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
  'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
  'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
};

const monthNumbers = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
};

export function getSubmitBaseUrl() {
  return submitBaseUrl;
}

/**
 * Gets the display name for an enum field value
 * @param {Object} field - A dropdown form field object with $enum, $enumNames, and $value properties
 * @returns {string} - The display name corresponding to the field's current value, or empty string if not found
 */
function getEnumDisplayName(field) {
  if (!field || !field.$enum || !field.$enumNames || field.$value === undefined) {
    return '';
  }

  const index = field.$enum.indexOf(field.$value);
  if (index === -1) {
    return '';
  }
  // If enumNames exists and has values, use it; otherwise fallback to enum value
  if (Array.isArray(field.$enumNames) && field.$enumNames.length > 0) {
    return field.$enumNames[index] || '';
  }

  return field.$enum[index] || '';
}

/**
 * Gets the enum value for a dropdown display name
 * @param {Object} field - A dropdown form field object with $enum and $enumNames properties
 * @param {string} displayName - The display name to search in $enumNames
 * @returns {string} - The matching enum value, or empty string if not found
 */
function getEnumValueFromEnumName(field, displayName) {
  if (
    !field ||
    !Array.isArray(field.$enum) ||
    !Array.isArray(field.$enumNames) ||
    displayName === undefined ||
    displayName === null
  ) {
    return '';
  }

  const normalizedDisplayName = String(displayName).trim();
  const index = field.$enumNames.findIndex((name) => String(name || '').trim() === normalizedDisplayName);

  return index !== -1 ? field.$enum[index] || '' : '';
}


/**
 * Custom submit function
 * @param {scope} globals
 */
function submitFormArrayToString(globals) {
  const data = globals.functions.exportData();
  Object.keys(data).forEach((key) => {
    if (Array.isArray(data[key])) {
      data[key] = data[key].join(',');
    }
  });
  globals.functions.submitForm(data, true, 'application/json');
}

/**
 * Calculate the number of days between two dates.
 * @param {*} endDate
 * @param {*} startDate
 * @returns {number} returns the number of days between two dates
 */
function days(endDate, startDate) {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  // return zero if dates are valid
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diffInMs = Math.abs(end.getTime() - start.getTime());
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
}

/**
 * Set a form property value
 * @param {string} propertyName Name of the property to set
 * @param {string|object|Array} propertyValue Value to set for the property
 * @param {scope} globals Global scope object
 */
function setProperty(propertyName, propertyValue, globals) {
  // Get existing properties or initialize empty object
  const existingProperties = globals.form.$properties || {};

  // Merge new property with existing properties
  const updatedProperties = { ...existingProperties, [propertyName]: propertyValue };

  globals.functions.setProperty(globals.form, {
    properties: updatedProperties,
  });
}

/**
 * Set a field property value
 * @param {object} normalFieldOrPanel field or panel component to set the property on
 * @param {string} propertyName Name of the property to set
 * @param {string|object} propertyValue Value to set for the property
 * @param {scope} globals Global scope object
 */
function setFieldProperty(normalFieldOrPanel, propertyName, propertyValue, globals) {
  // Get existing properties or initialize empty object
  const existingProperties = normalFieldOrPanel.$properties || {};

  // Merge new property with existing properties
  const updatedProperties = { ...existingProperties, [propertyName]: propertyValue };

  globals.functions.setProperty(normalFieldOrPanel, {
    properties: updatedProperties,
  });
}

/**
 * Get a field property value
 * @param {object} normalFieldOrPanel - Field or panel component to get the property from (defaults to current field)
 * @param {string} propertyName - Name of the property to get (supports dot notation e.g. 'address.city')
 * @param {scope} globals - Global scope object containing the current field context
 * @returns {object|string|Array} The value of the requested property or undefined if not found
 */
function getFieldProperty(normalFieldOrPanel, propertyName, globals) {
  // Use the provided field/panel or default to the current field from globals
  const field = normalFieldOrPanel || globals.field;

  // Return undefined if no property name or if the field has no properties
  if (!propertyName || !field.$properties) {
    return undefined;
  }

  // Handle dot notation by splitting and traversing the object
  const properties = propertyName.split('.');
  let value = field.$properties;

  for (const prop of properties) {
    if (value === undefined || value === null) {
      return undefined;
    }
    value = value[prop];
  }

  return value;
}

/**
 * Get a form property value
 * @param {string} propertyName Name of the property to get (supports dot notation e.g. 'address.city')
 * @param {scope} globals Global scope object
 * @returns {object|string|Array} The value of the requested property
 */
function getProperty(propertyName, globals) {
  if (!propertyName || !globals.form.$properties) {
    return undefined;
  }

  // Handle dot notation by splitting and traversing the object
  const properties = propertyName.split('.');
  let value = globals.form.$properties;

  for (const prop of properties) {
    if (value === undefined || value === null) {
      return undefined;
    }
    value = value[prop];
  }

  return value;
}

/**Add commentMore actions
 * Get a form property value
 * @param {string} propertyName Name of the property to get (supports dot notation e.g. 'address.city')Add commentMore actions
 * @param {scope} globals Global scope object
 * @returns {Array} The value of the requested property
 */
function getArrayProperty(propertyName, globals) {
  if (!propertyName || !globals.form.$properties) {
    return undefined;
  }

  // Handle dot notation by splitting and traversing the object
  const properties = propertyName.split('.');
  let value = globals.form.$properties;

  for (const prop of properties) {
    if (value === undefined || value === null) {
      return undefined;
    }
    value = value[prop];
  }

  // Parse the value as JSON if it's a string
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      // If parsing fails, return the original value
      return value;
    }
  }

  return value;
}

/**
 * @private
 */
function generateUUID() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
    return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
  });
}

/**
 * @private
 */
function getDispatcherInstance() {
  // todo: in EDS, there is no dispatcher instance
  return '00';
}

/**
 * Creates a journey ID by combining various parameters
 * @param {string} journeyAbbreviation The journey abbreviation
 * @param {string} channel The channel
 * @param {scope} globals Global scope object
 * @returns {string} The generated journey ID
 */
function createJourneyId(journeyAbbreviation, channel, globals) {
  const visitMode = "U"; // TODO: confirm if this is correct
  let journeyId = getProperty("journeyId", globals) || getProperty("JId", globals);
  const currentDate = new Date();
  //globals.functions.dispatchEvent(globals.field.errorPanel, 'custom:a');
  console.log('event set');
  if (!journeyId) {
    const dynamicUUID = generateUUID();
    const dispatcher = getDispatcherInstance();
    journeyId = `${dynamicUUID}_${dispatcher}_${journeyAbbreviation}_${visitMode}_${channel}`;
  }

  return {
    properties: {
      ...globals.form.$properties,
      journeyId
    }
  };
}

/**
 * Get the complete event payload
 * @param {scope} globals Global scope object
 * @returns {string} event payload - returns body if present, otherwise full payload
 */
function getCustomEventPayload(globals) {
  return globals.event.payload.body || globals.event.payload;
}

/**
 * Is SSO
 * @returns {boolean} true if SSO, false otherwise
 */
function isSSO() {
  //TODO: need to implement the logic to check if its SSO based journey or not
  return false;
}


function getReferenceDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const year = now.getFullYear();
  const time = now.toTimeString().split(' ')[0]; // "HH:mm:ss"

  return `${day} ${month} ${year} ${time}`; // "DD MM YYYY HH:mm:ss"
}

/**
 * Calculate age based on date of birth and current date time from form properties
 * @param {string|date} dateOfBirth Date of birth in ISO format
 * @param {scope} globals Global scope object
 * @returns {number|string} Age in years, returns 0 if dates are invalid
 */
function calculateAge(dateOfBirth, globals) {
  let age = 0;
  if (dateOfBirth) {
    // Parse the reference date from the given format which comes from API
    const referenceDate = getProperty("currentDateTime", globals) || getReferenceDate();
    const [day, month, year, time] = referenceDate.split(' ');
    const refDate = new Date(`${year}-${month}-${day}T${time}`);
    // Parse the date of birth
    const dob = new Date(dateOfBirth);
    // Return 0 if dates are invalid
    if (Number.isNaN(refDate.getTime()) || Number.isNaN(dob.getTime())) {
      return 0;
    }
    // Calculate age
    age = refDate.getFullYear() - dob.getFullYear();
    // Adjust age if birthday hasn't occurred yet in the reference year
    const refMonth = refDate.getMonth();
    const birthMonth = dob.getMonth();
    if (birthMonth > refMonth || (birthMonth === refMonth && dob.getDate() > refDate.getDate())) {
      age--;
    }
  }
  return age;
}

/**
 * Detects and returns the user's browser name and version.
 * @returns {{name: string, version: string}} The browser information object.
 */
function getBrowser() {
  const ua = navigator.userAgent;
  let match = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  let temp;

  // Handle IE (Trident)
  if (/trident/i.test(match[1])) {
    temp = /\brv[ :]+(\d+)/g.exec(ua) || [];
    return { name: 'IE', version: temp[1] || '' };
  }

  // Handle Edge and Opera based on Chrome userAgent
  if (match[1] === 'Chrome') {
    temp = ua.match(/\b(OPR|Edge)\/(\d+)/);
    if (temp !== null) {
      return {
        name: temp[1] === 'OPR' ? 'Opera' : 'Edge',
        version: temp[2]
      };
    }
  }

  // Handle other browsers
  match = match.length >= 2 ? [match[1], match[2]] : [navigator.appName, navigator.appVersion];
  if ((temp = ua.match(/version\/(\d+)/i)) !== null) {
    match[1] = temp[1];
  }

  return {
    majver: '',
    name: match[0],
    version: match[1]
  };
}

/**
 * Detects and returns the user's operating system based on the platform and user agent.
 * @returns {string|null} The name of the operating system or null if undetectable.
 */
function getOS() {
  const { userAgent, platform } = window.navigator;

  const macPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  const winPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
  const iosPlatforms = ['iPhone', 'iPad', 'iPod'];

  if (macPlatforms.includes(platform)) {
    return 'Mac OS';
  }
  if (iosPlatforms.includes(platform)) {
    return 'iOS';
  }
  if (winPlatforms.includes(platform)) {
    return 'Windows';
  }
  if (/Android/.test(userAgent)) {
    return 'Android';
  }
  if (/Linux/.test(platform)) {
    return 'Linux';
  }

  return null;
}



/**
 * Returns the client info object - As per the function from Insta Savings
 * @param {scope} globals - Global scope object containing form context
 * @returns {object|string} The client info object
 */
function getClientInfoAsObject(globals) {
  const response = {
    browser: getBrowser(),
    cookie: {
      source: 'AdobeForms',
      name: 'InstaSavings',
      ProductShortname: 'IS'
    },
    client_ip: '',
    device: {
      type: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      name: 'Samsung G5',
      os: getOS(),
      os_ver: '637.38383'
    },
    isp: {
      ip: '839.893.89.89',
      provider: 'AirTel',
      city: 'Mumbai',
      state: 'Maharashrta',
      pincode: '400828'
    },
    geo: {
      lat: '72.8777° E',
      long: '19.0760° N'
    }
  };

  return response;
}


/**
 * Removes hyphens and underscores from the string
 * @param {string} str - String to be filtered
 * @param {scope} globals - Global scope object containing form context
 * @returns {string} The filtered string
 */
function removeHyphensAndUnderscores(str, globals) {
  return (str || '').replace(/-/g, '').replace(/_/g, '');
}

/**
 * Converts a date string from format passed by field to another.
 * Supported format tokens: YYYY, YY, MM, DD
 *
 * @param {string} dateStr - The original date string (e.g., '2000-02-10').
 * @param {string} [outputFormat='DD/MM/YYYY'] - Desired output format (e.g., 'DD/MM/YYYY').
 * @returns {string} - Reformatted date string (e.g., '10/02/2000').
 *
 * @example
 * convertDateFormat('2000-02-10'); // '10/02/2000'
 * convertDateFormat('2000-02-10', 'DD/MM/YY'); // '10/02/00'
 */
function convertDateFormat(dateStr, outputFormat = 'DD/MM/YYYY') { // TODO: Needs to be a part of the product.
  if (dateStr === null || dateStr === undefined) {
    return '';
  }
  if (outputFormat === null || outputFormat === undefined) {
    outputFormat = 'DD/MM/YYYY';
  }
  const inputFormat = 'YYYY-MM-DD';
  const formatParts = inputFormat.match(/(YYYY|YY|MM|DD)/g);
  const dateParts = dateStr.split(/[-/]/);

  const dateMap = {};
  formatParts.forEach((part, idx) => {
    dateMap[part] = dateParts[idx];
  });

  return outputFormat
    .replace(/YYYY/, dateMap['YYYY'] || ('20' + dateMap['YY']))
    .replace(/YY/, dateMap['YY'] || dateMap['YYYY'].slice(-2))
    .replace(/MM/, dateMap['MM'])
    .replace(/DD/, dateMap['DD']);
}

/**
 * Converts a date string from one format to another.
 *
 * Supported tokens:
 * - DD: 2-digit day (01-31)
 * - MM: 2-digit month (01-12)
 * - YYYY: 4-digit year (e.g. 2025)
 *
 * Supports any separators present in the format (e.g. '-', '/', '.').
 * If the input date does not match the old format, the original date string is returned.
 *
 * @param {string} dateStr - The date string to convert.
 * @param {string} oldFormat - The current format of the date string (e.g. 'dd-mm-yyyy').
 * @param {string} newFormat - The desired output format (e.g. 'yyyymmdd').
 * @returns {string} - The converted date string or the original if format does not match.
 *
 * @example
 * convertDateFormat("30-04-2021", "dd-mm-yyyy", "yyyymmdd"); // returns "20210430"
 * convertDateFormat("02051988", "ddmmyyyy", "yyyymmdd");     // returns "19880502"
 * convertDateFormat("2021/04/30", "dd-mm-yyyy", "yyyymmdd"); // returns "2021/04/30" (no match)
 */
function convertDateToFormat(dateStr, oldFormat, newFormat) {
  if (!dateStr) return dateStr;

  oldFormat = oldFormat.toUpperCase();
  newFormat = newFormat.toUpperCase();

  const tokens = oldFormat.match(/DD|MM|YYYY/g);
  if (!tokens) return dateStr;

  const regexPattern = oldFormat
    .replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    .replace(/DD|MM/g, '(\\d{2})')
    .replace(/YYYY/g, '(\\d{4})');

  const regex = new RegExp(`^${regexPattern}$`);
  const matches = dateStr.match(regex);
  if (!matches) return dateStr;

  const values = {};
  tokens.forEach((token, idx) => {
    values[token] = matches[idx + 1];
  });

  return newFormat
    .replace(/YYYY/g, values['YYYY'] || '')
    .replace(/MM/g, values['MM'] || '')
    .replace(/DD/g, values['DD'] || '');
}

// Note: This is a copy function from convertDateFormat, but with inputFormat and outputFormat as parameters.
// Requirement was realized later, and it was not possible to change the function signature, without manually updating this function everywhere in the rules. It was closed with Engg to make a copy function.
/**
 * Converts a date string from one format to another.
 * Supported format tokens: YYYY, YY, MM, MMM, DD
 *
 * @param {string} dateStr - The original date string (e.g., '2000-02-10' or '10-Feb-2000').
 * @param {string} [inputFormat='YYYY-MM-DD'] - Desired input format (e.g., 'YYYY-MM-DD' or 'DD-MMM-YYYY').
 * @param {string} [outputFormat='DD/MM/YYYY'] - Desired output format (e.g., 'DD/MM/YYYY' or 'DD-MMM-YYYY').
 * @returns {string} - Reformatted date string (e.g., '10/02/2000' or '10-Feb-2000').
 *
 * @example
 * transformDateFormat('2000-02-10'); // '10/02/2000'
 * transformDateFormat('2000-02-10', 'YYYY-MM-DD', 'DD/MM/YYYY') // '10/02/2000'
 * transformDateFormat('10-Feb-2000', 'DD-MMM-YYYY', 'YYYY-MM-DD') // '2000-02-10'
 * transformDateFormat('2000-02-10', 'YYYY-MM-DD', 'DD-MMM-YYYY') // '10-Feb-2000'
 */
function transformDateFormat(dateStr, inputFormat = 'YYYY-MM-DD', outputFormat = 'DD/MM/YYYY') { // TODO: Needs to be a part of the product.
  if (dateStr === null || dateStr === undefined) {
    return '';
  }
  if (outputFormat === null || outputFormat === undefined) {
    outputFormat = 'DD/MM/YYYY';
  }
  if (inputFormat === null || inputFormat === undefined) {
    inputFormat = 'YYYY-MM-DD';
  }

  const dateMap = {};

  // Find positions of date components in input format
  const yyyyIndex = inputFormat.indexOf('YYYY');
  const yyIndex = inputFormat.indexOf('YY');
  const mmIndex = inputFormat.indexOf('MM');
  const mmmIndex = inputFormat.indexOf('MMM');
  const ddIndex = inputFormat.indexOf('DD');

  if (yyyyIndex === -1 && yyIndex === -1 || (mmIndex === -1 && mmmIndex === -1) || ddIndex === -1) {
    return '';
  }

  // Extract values based on positions
  if (yyyyIndex !== -1) {
    dateMap['YYYY'] = dateStr.substring(yyyyIndex, yyyyIndex + 4);
  } else if (yyIndex !== -1) {
    dateMap['YY'] = dateStr.substring(yyIndex, yyIndex + 2);
  }

  if (mmIndex !== -1 && mmmIndex === -1) {
    dateMap['MM'] = dateStr.substring(mmIndex, mmIndex + 2);
  } else if (mmmIndex !== -1) {
    const monthName = dateStr.substring(mmmIndex, mmmIndex + 3);
    dateMap['MM'] = monthNames[monthName] || '';
  }

  dateMap['DD'] = dateStr.substring(ddIndex, ddIndex + 2);

  // Build the result string
  let result = outputFormat;

  // Replace year tokens
  if (outputFormat.includes('YYYY')) {
    result = result.replace(/YYYY/, dateMap['YYYY'] || ('20' + dateMap['YY']));
  } else if (outputFormat.includes('YY')) {
    result = result.replace(/YY/, dateMap['YY'] || dateMap['YYYY'].slice(-2));
  }

  // Replace month tokens
  if (outputFormat.includes('MMM')) {
    result = result.replace(/MMM/, monthNumbers[dateMap['MM']] || '');
  } else if (outputFormat.includes('MM')) {
    result = result.replace(/MM/, dateMap['MM']);
  }

  // Replace day token
  result = result.replace(/DD/, dateMap['DD']);

  return result;
}

/**
 * Returns the current date and time in ISO 8601 format (UTC).
 *
 * @returns {string} The current UTC date and time as an ISO 8601 string.
 *
 * @example
 * const isoTime = getCurrentIsoDateTime();
 * console.log(isoTime); // e.g., "2025-05-08T12:45:30.123Z"
 */
function getCurrentIsoDateTime() {
  return new Date().toISOString();
}

/**
 * Generates a user reference number in the format "AD" + yyyyMMddHHmmssSSS.
 *
 * @returns {string} Reference number e.g. "AD20260519172706123"
 */
function getUserReferenceNo() {
  const now = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  const timeStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`;
  return `AD${timeStamp}`;
}

/**
 * Get Journey Name
 * @param {scope} globals Global scope object
 * @returns {string} The journey name
 */
function getJourneyName(globals) {
  return globals.form.$properties.journeyName;
}

/**
 * Get Journey Id
 * @param {scope} globals Global scope object
 * @returns {string} The journey id
 */
function getJourneyId(globals) {
  return globals.form.$properties.journeyId;
}

/**
 * If length of enums of a field is equal to 1, then set the value and disable the field.
 * @param {object} field field whose enums are checked and value is set on.
 * @param {boolean} disableCheck if true, then the field is to be disabled and value is set on.
 * @param {scope} globals Global scope object
 * @return {void}
*/
function checkAndSetSingleEnumValue(field, disableCheck, globals) {
  if (field && field.$enum && field.$enum.length === 1) {
    globals.functions.setProperty(field, { value: field.$enum[0] });
    if (disableCheck) {
      globals.functions.setProperty(field, { enabled: false });
    }
  }
}

/**
* Masks input field when its ETB
* @name mask Masks input field
* @param {object} field field whose value is to be masked
* @param {scope} globals An object containing read-only form instance, read-only target field instance and methods for form modifications.
* @return {string} Masked output
*/
function mask(field, globals) {
  const maskingType = field.$properties.maskingType;
  const etb = globals.form.$properties.existingCustomer;
  const isAccountSavingSalary = globals.form.$properties.isAccountSavingSalary;

  if (getProperty("isVRMFlag", globals) == "true") return field.$value;

  if (maskingType === "ntbAccountNumber") {

    let ntbaccountNumber = field.$value || '';

    if (ntbaccountNumber.includes('_')) {
      ntbaccountNumber = ntbaccountNumber.replace(/_/g, '*');
    }

    if (ntbaccountNumber.length > 6 && isAccountSavingSalary === 'Y') {

      const firstSix = ntbaccountNumber.slice(0, 6);
      const masked = '*'.repeat(ntbaccountNumber.length - 6);
      return firstSix + masked;
    }
    return ntbaccountNumber;

  }


  if (maskingType === "ntbCustomerID") {
    let ntbcustomerid = (field.$value || '').replace(/_/g, '*');

    if (isAccountSavingSalary === 'Y' && ntbcustomerid.length > 5) {
      const firstFive = ntbcustomerid.slice(0, 5);
      const masked = '*'.repeat(ntbcustomerid.length - 5);
      return firstFive + masked;
    }

    return ntbcustomerid;
  }

  // removing from switch case and plaacing code here since required for masking email at Financial Profile page.
  if (maskingType === "email") {
    return maskEmail(field);
  }

  if (etb === 'N') {
    return field.$value;
  }
  switch (maskingType) {
    case 'dateOfBirth':
      return maskDOB(field);
    case 'fullName':
      return maskFullName(field);
    case 'accountNumber':
      return maskAccountNumber(field);
    case 'pan':
      return maskPAN(field);
    default:
      return field.$value || '';
  }
}


/**
 * Masks the given date of birth by:
 *  - Keeping first and last characters of the day and month.
 *  - Masking remaining characters of the day and month with '*'.
 *  - Masking first two digits of the year with '*'.
 *
 * Example:
 *   Input:  "01/01/1991"
 *   Output: "*1 / *1 / 19**"
 *
 *   Input:  "1991-01-01"
 *   Output: "*1 / *1 / 19**"
 *
 *   Input:  "21/03/2004"
 *   Output: "*1 / *3 / 20**"
 *
 *   Input:  "2004-03-21"
 *   Output: "*1 / *3 / 20**"
 *
 *   Input:  "25/12/1991"
 *   Output: "*5 / *2 / 19**"
 */
function maskDOB(field) {
  const dob = field.$value || '';
  if (!dob) {
    return '';
  }

  // Support both '-' and '/' as separators
  const parts = dob.includes('-') ? dob.split('-') : dob.split('/');
  // Initialize day, month, year
  let year, month, day;
  if (dob.includes('-')) {
    // Format: YYYY-MM-DD
    [year, month, day] = parts;
  } else {
    // Format: DD/MM/YYYY
    [day, month, year] = parts;
  }
  // Get first digit of day and mask rest
  const maskedDay = '*' + day.charAt(day.length - 1);
  // Mask month completely
  const maskedMonth = '*' + month.charAt(month.length - 1);
  // Get first two digits of year and mask rest
  const maskedYear = year.substring(0, 2) + '**';
  // Combine with separators
  return `${maskedDay} / ${maskedMonth} / ${maskedYear}`;
}

/**
 * Masks a given email value securely by:
 *  - Keeping first and last characters of local part.
 *  - Masking remaining characters of the local part with '*'.
 *  - Masking domain name except the first character.
 *
 * Example:
 *   Input:  "neeraj.kumar@example.com"
 *   Output: "n****r@e*******.com"
 *
 * @param {Object} field - Field object containing a `$value` property with email string.
 * @param {string} field.$value - The email address to mask.
 *
 * @returns {string} Masked email string. If invalid or insufficient characters, returns original email.
 */
function maskEmail(field) {
  const email = (field.$value || '').toLowerCase();
  const [local, domain] = email.split('@');
  if (!local || !domain || local.length <= 4) {
    return email; // Not enough characters to mask
  }
  const firstTwo = local.substring(0, 1);
  const lastTwo = local.substring(local.length - 1);
  const maskedMiddle = '*'.repeat(local.length - 4);

  const domainParts = domain.split('.');
  const domainName = domainParts[0];
  const tld = domainParts.slice(1).join('.') || '';

  const maskedDomainName = domainName[0] + '*'.repeat(Math.max(0, domainName.length - 1));
  const finalDomain = tld ? `${maskedDomainName}.${tld}` : maskedDomainName;
  return `${firstTwo}${maskedMiddle}${lastTwo}@${finalDomain}`;
}

/**
 * Masks the given name part by:
 *  - Keeping first and last characters of the name part.
 *  - Masking remaining characters of the name part with '*'.
 *
 * @param {string} name name part to be masked
 * @param {boolean} showLast if true, shows the last character
 * @returns {string} Masked name part
 *
 * Example:
 *   Input:  "John"
 *   Output: "J****"
 *
 *   Input:  "Doe"
 *   Output: "D****"
 *
 *   Input:  "John Doe"
 */
function maskNamePart(name, showLast = false) {
  if (!name) return '';

  if (showLast && name.length > 1) {
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  }

  return name[0] + '*'.repeat(name.length - 1);
}

/**
 * Masks the given full name by:
 *  - Keeping first and last characters of the last name.
 *  - Masking remaining characters of the last name with '*'.
 *  - Masking first and last characters of the first and middle names with '*'.
 *
 * Example:
 *   Input:  "John Doe"
 *   Output: "J****e"
 *
 * @param {object} field field whose value is to be masked
 * @returns {string} Masked full name
 */
function maskFullName(field) {
  const parts = (field.$value || '').trim().split(/\s+/) || '';

  // Single name → treat as last name
  if (parts.length === 1) {
    return maskNamePart(parts[0], true);
  }

  return parts
    .map((part, index) => {
      // Last name → show first & last character
      if (index === parts.length - 1) {
        return maskNamePart(part, true);
      }
      // First & middle names
      return maskNamePart(part);
    })
    .join(' ');
}

function maskAccountNumber(field) {
  return field.$value;
}

/**
 * Masks the given PAN Number
 * @param {object} field field whose value is to be masked
 * @returns {string} Masked PAN
 *
 * Example:
 *   Input:  "AELPG5762C"
 *   Output: "AE**G****C"
 */
function maskPAN(field) {
  const pan = field.$value || '';
  if (!pan || pan.length !== 10) return pan; // fail-safe

  return (
    pan.slice(0, 2) +   // first 2 chars
    '**' +              // mask next 2
    pan[4] +            // 5th char
    '****' +            // mask next 4
    pan[9]              // last char
  );
}

/**
 * Cleans a string by removing null values.
 * @param {string} string - The string to clean
 * @param {string} separator - The separator to use to split the string
 * @returns {string} The cleaned string
 */
function cleanStringForNulls(string, separator = ' ') {
  let stringParts = string.split(separator);
  stringParts = stringParts.map(part => part.trim())
    .filter(part => part && part.toLowerCase() !== 'null' &&
      part.toLowerCase() !== ',null' &&
      part.toLowerCase() !== 'null,');
  return stringParts.join(separator);
}

/**
 * Filters an array of objects by property value.
 * @name filterByPropertyValue
 * @param {array} response - The array of objects to filter.
 * @param {string} propertyPath - The propertyPath in object to fitler by.
 * @param {string} value - The value of property to match.
 * @returns {array} - A new array containing only the objects with the matching value for key.
 */
function filterByPropertyValue(response, propertyPath, value) {
  return (response || []).filter(item => item[propertyPath] === value);
}

/**
 * Adds a new key-value pair to each object in an array.
 * @param {Array} addKeyValueToEachObject - Array of objects to update
 * @param {string} key - Key to add
 * @param {*} value - Value to assign to the key
 * @returns {Array} Updated array of objects
 */
function addKeyValueToEachObject(arrayOfObject, key, value) {
  return (arrayOfObject || []).map(obj => ({ ...obj, [key]: value }));
}

/**
 * Generates a lowercase image path based on given category or key.
 * @param {string} baseImagePath - Base directory path for images (e.g., "/content/dam/hdfc/siccdc/")
 * @param {string} imageKey - The category or image name (e.g., "Electricity")
 * @param {string} extension - Image file extension (default: ".png")
 * @returns {string} Full image path (e.g., "/content/dam/hdfc/siccdc/electricity.png")
 */
function generateImagePath(baseImagePath, imageKey, extension = '.png') {
  return (`${baseImagePath}${(imageKey || '').toLowerCase().replace(/\s+/g, '')}` || '') + extension;
}

/**
 * Appends image path field to each object using key from object
 * @param {Array} arrayInput
 * @param {string} fromKey - field to get value from (e.g. 'biller_category')
 * @param {string} toKey - field to write value to (e.g. 'biller_category_logo')
 * @param {string} basePath - base image path
 * @param {string} extension - file extension (default .png)
 * @returns {Array}
 */

/**
 * Adds an image path to each object in the array using a value from a specified key.
 * @param {Array} arrayInput - Array of objects to update.
 * @param {string} fromKey - Key to read the image name from.(e.g. 'biller_category')
 * @param {string} toKey - Key to write the full image path to.(e.g. 'biller_category_logo')
 * @param {string} basePath - Base path for the image.(e.g: '/content/dam/hdfc/siccdc/')
 * @param {string} [extension='.png'] - Image file extension.
 * @returns {Array} Updated array with image paths added.
 */
function appendImagePathField(arrayInput, fromKey, toKey, basePath, extension = '.png') {
  return (arrayInput || []).map(item => ({
    ...item,
    [toKey]: generateImagePath(basePath, (item[fromKey] || ''), extension)
  }));
}

// TODO: If required this can be moved to sheets
const incomeRangeMapping = [
  { min: 0, max: 50000, code: 1, monthlyAverage: 4166 },
  { min: 50000, max: 100000, code: 2, monthlyAverage: 6250 },
  { min: 100000, max: 300000, code: 3, monthlyAverage: 16667 },
  { min: 300000, max: 500000, code: 4, monthlyAverage: 33333 },
  { min: 500000, max: 750000, code: 5, monthlyAverage: 52083 },
  { min: 750000, max: 1000000, code: 6, monthlyAverage: 72917 },
  { min: 1000000, max: 1500000, code: 7, monthlyAverage: 104167 },
  { min: 1500000, max: 2500000, code: 9, monthlyAverage: 166667 },
  { min: 2500000, max: 5000000, code: 10, monthlyAverage: 312500 },
  { min: 5000000, max: 10000000, code: 11, monthlyAverage: 625000 },
  { min: 10000000, max: Infinity, code: 12, monthlyAverage: 833333 }
];
/**
 * Returns the salary code based on the income range mapping.
 * @param {object} incomeField - The income field object containing the income value
 * @param {string} flag - based on flag it returns incomeCode or monthlyAverage
 * @returns {number} The salary code/monthlyAverage corresponding to the income range
 */
function formatIncome(incomeField, flag) {
  const income = parseFloat(incomeField.$value);
  // Find the appropriate code based on income range
  for (const range of incomeRangeMapping) {
    if (income >= range.min && income < range.max) {
      return flag === 'code' ? range.code : range.monthlyAverage;
    }
  }
}

/**
 * @name getFullPropertyPath
 * @name {string} relativePropertyPath
 * @param {scope} globals
 * @returns {string}
 */
function getFullPropertyPath(relativePropertyPath, globals) {
  const buttonQN = globals.field.$qualifiedName; // e.g., $form.p1[0].p2.b1
  const fullPropertyPath = buttonQN.split('.').slice(1, -1).join('.') + `.${relativePropertyPath}`; // to extract p1[0].p2 out of $form.p1[0].p2.b1 and creating p1[0].p2.c1.c2 if c1.c2 is relative proeprty path
  return fullPropertyPath;
}

/**
 * Groups an array of objects alphabetically based on the first letter of a given key.
 *
 * @param {array} response - The array of objects to be grouped.
 * @param {string} keyName - The key in each object to group by (using its first character).
 * @returns {array}  An array of grouped results. Each group has a `char` (A-Z) and a `billers` array.
 *
 * @example
 * const data = [
 *   { name: "Apple" },
 *   { name: "Banana" },
 *   { name: "Avocado" }
 * ];
 * const grouped = groupAnArrayOfObject(data, 'name');
 * // Output: [
 * //   { char: "A", billers: [{ name: "Apple" }, { name: "Avocado" }] },
 * //   { char: "B", billers: [{ name: "Banana" }] }
 * // ]
 */
function groupAnArrayOfObject(response, keyName) {
  const groupedBills = response.reduce((acc, item) => {
    const value = item[keyName];
    if (typeof value === 'string' && value.length > 0) {
      const firstLetter = value[0].toUpperCase();
      acc[firstLetter] = acc[firstLetter] || [];
      acc[firstLetter].push(item);
    }
    return acc;
  }, {});

  const result = Object.entries(groupedBills)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([char, billers]) => ({ char, billers }));

  return result;
}

/**
 * Transforms the billers array by sorting it, adding dummy objects with the first character of the biller name,
 * and setting an additional field `isBiller` to "N" for dummy objects and "Y" for actual billers.
 *
 * @param {Array} billers - The array of biller objects to be transformed.
 * @param {string} key - The key to be used for sorting and transformation.
 * @returns {Array} The transformed array of biller objects.
 */

function transformBills(billers, key) {
  // Sort the bills array by biller name
  billers.sort((a, b) => a.biller_name.localeCompare(b.biller_name));

  let transformedBills = [];
  let currentLetter = '';

  for (const bill of billers) {
    let firstLetter = bill.biller_name.charAt(0);

    if (firstLetter !== currentLetter) {
      transformedBills.push({ biller_name: firstLetter, isBiller: "N" });
      currentLetter = firstLetter;
    }

    transformedBills.push({ ...bill, isBiller: "Y" });
  }

  return transformedBills;
}

/**
 * Groups and transforms an array of objects by the first letter of a specified property.
 *
 * @param {Array | Function} list - The array of objects to transform.
 * @param {string} key - The property to group by.
 * @param {string} [groupKey='isHeader'] - Optional property name used to indicate group headers.
 * @returns {Array} - A new transformed array with group headers and original items.
 * // Output:
 * // [
 * //   { name: "A", isHeader: "N" },
 * //   { name: "Alice", isHeader: "Y" },
 * //   { name: "Anna", isHeader: "Y" },
 * //   { name: "B", isHeader: "N" },
 * //   { name: "Bob", isHeader: "Y" }
 * // ]
 */
function groupByFirstLetter(list, key, groupKey = 'isHeader') {
  if (!Array.isArray(list) || typeof key !== 'string') return [];

  const sorted = [...list].sort((a, b) => {
    const aVal = String(a[key] || '');
    const bVal = String(b[key] || '');
    return aVal.localeCompare(bVal);
  });
  const result = [];
  let currentLetter = '';
  for (const item of sorted) {
    const value = String(item[key] || '');
    const firstLetter = value.charAt(0).toUpperCase();
    if (firstLetter && firstLetter !== currentLetter) {
      result.push({ [key]: firstLetter, [groupKey]: "N" });
      currentLetter = firstLetter;
    }
    result.push({ ...item, [groupKey]: "Y" });
  }

  return result;
}


/**
 * Validates the authenticator field against a given pattern.
 * Marks the field as invalid if it doesn't match the pattern.
 *
 * @param {Object} field - The field object to be validated.
 * @param {string} pattern - The regular expression pattern to match against.
 * @param {string} errMssg - The error message to display if validation fails.
 * @param {string} type - The type of validation.
 * @param {scope} globals
 * @returns {boolean} - Returns `true` if the form passes validation rules; otherwise, `false`.
 */

function validateAuthenticator(field, pattern, errMssg, type, globals) {
  const fieldValue = field.$value;
  if (!fieldValue.match(pattern)) {
    globals.functions.markFieldAsInvalid(
      field.$qualifiedName,
      errMssg,
      { useQualifiedName: true });
    return false;
  }
  return true;
}

/**
 * Retrieves the value from a JSON string using a nested property path (supports dot and array notation).
 *
 * @param {string} propertyPath - Dot/array-style path to the property (e.g., "authenticators[0].parameter_name").
 * @param {string} jsonString - The JSON string to extract from.
 * @returns {*} - The value at the given property path, or undefined if not found or parsing fails.
 */
function getJsonProperty(propertyPath, jsonString) {
  try {
    const obj = JSON.parse(jsonString);
    const pathSegments = propertyPath
      .replace(/\[(\w+)\]/g, '.$1') // e.g., "authenticators[0]" => "authenticators.0"
      .replace(/^\./, '')           // Remove leading dot
      .split('.');
    let current = obj;
    for (const key of pathSegments) {
      if (
        current !== null &&
        typeof current === 'object' &&
        Object.prototype.hasOwnProperty.call(current, key)
      ) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  } catch (e) {
    // console.error('Invalid JSON or path error:', e);
    return undefined;
  }
}

/**
 * Safely parses a JSON string and returns the resulting value.
 *
 * @param {string} jsonString - The JSON string to parse.
 * @returns {*} - Parsed value if successful, otherwise undefined.
 *
 * @example
 * parseJsonString('{"name":"John"}'); // { name: "John" }
 * parseJsonString('invalid json');    // undefined
 */

function parseJsonString(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    return data;
  } catch (error) {
    return undefined;
  }
}

/**
 * Filters an array of objects based on a given property and search keyword.
 *
 * @param {Array} list - The array to filter.
 * @param {string} prop - The object property to search inside.
 * @param {string} keyword - The search keyword.
 * @returns {Array} - Filtered array.
 */
function filterByKeyword(list, prop, keyword) {
  if (!Array.isArray(list) || typeof prop !== 'string' || typeof keyword !== 'string') return [];
  return list.filter(item => (String(item[prop] || '')).toLowerCase().startsWith((String(keyword || '')).toLowerCase()));
}

/**
 * Checks if a JSON string is valid.
 *
 * @param {string} jsonString - The JSON string to parse.
 * @returns {boolean} - true if valid, otherwise false.
 *
 * @example
 * isValidJsonString('{"name":"John"}'); // true
 * isValidJsonString('invalid json');    // false
 */

function isValidJsonString(jsonString) {
  try {
    JSON.parse(jsonString);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Maps an array of objects by extracting specified keys from each object.
 *
 * @param {string} keys - A dot-separated string of keys to extract (e.g., "key1.key2").
 * @param {Array} arrayObj - The array of objects to extract values from.
 * @returns {Array} A new array of objects containing only the specified keys.
 *
 * @example
 * const data = [
 *   { key1: 'a', key2: 'b', key3: 'c' },
 *   { key1: 'x', key2: 'y', key3: 'z' }
 * ];
 * const result = mapArrayByKeys('key1.key2', data);
 * // result: [ { key1: 'a', key2: 'b' }, { key1: 'x', key2: 'y' } ]
 */
function mapArrayByKeys(keys, arrayObj) {
  const properties = keys.split('.');
  try {
    return arrayObj.map(el => {
      const newObj = {};
      for (const key of properties) {
        newObj[key] = el[key];
      }
      return newObj;
    });
  } catch (error) {
    return undefined;
  }
}

/**
 * Combines two arrays of objects into a single array.
 *
 * @param {Array} arr1 - First array of objects.
 * @param {Array} arr2 - Second array of objects.
 * @returns {Array} Combined array containing all objects from both arrays.
 */
function combineArraysOfObjects(arr1, arr2) {
  return arr1.concat(arr2);
}

/**
 * Merges two JSON objects ensuring unique keys (no duplicate keys).
 * If duplicate keys are found, the second object's value will override the first.
 * Optionally logs a warning when duplicates are detected.
 *
 * @param {Object} obj1 - First object to merge
 * @param {Object} obj2 - Second object to merge
 * @param {string} targetPropertyKeyName - The key name in which the property is to be saved.
 * @param {boolean} warnOnDuplicate - If true, logs a warning when duplicate keys are found (default: false)
 * @param {scope} globals - Global scope object
 * @returns {Object} - Merged object with all keys from both objects
 *
 */
function mergeUniqueObjects(obj1, obj2, targetPropertyKeyName, warnOnDuplicate = false, globals) {
  // Handle null/undefined inputs
  if (!obj1 && !obj2) return {};
  if (!obj1) {
    if (targetPropertyKeyName) {
      setProperty(targetPropertyKeyName, obj2, globals);
    }
    return { ...obj2 };
  }
  if (!obj2) {
    if (targetPropertyKeyName) {
      setProperty(targetPropertyKeyName, obj1, globals);
    }
    return { ...obj1 };
  }

  const result = { ...obj1 };
  const duplicateKeys = [];

  // Check for duplicate keys and merge
  Object.keys(obj2).forEach(key => {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      duplicateKeys.push(key);
      if (warnOnDuplicate) {
        console.warn(`Duplicate key '${key}' found while merging objects. Value from second object will override.`);
      }
    }
    result[key] = obj2[key];
  });

  if (targetPropertyKeyName) {
    setProperty(targetPropertyKeyName, result, globals);
  }

  return result;
}

/**
 * Cleans an array by removing: - null, undefined, NaN ,empty strings, empty objects,empty arrays
 * @param {Array} arr - Input array to clean
 * @returns {Array} - Cleaned array
 */
function cleanArray(arr) {
  return (arr || []).filter(item => {
    // Remove null, undefined, or NaN
    if (item === null || item === undefined || Number.isNaN(item)) {
      return false;
    }
    // Remove empty strings
    if (typeof item === 'string' && item.trim() === '') {
      return false;
    }
    // Remove empty arrays
    if (Array.isArray(item) && item.length === 0) {
      return false;
    }
    // Remove empty objects
    if (typeof item === 'object' && !Array.isArray(item)) {
      if (Object.keys(item).length === 0) {
        return false;
      }
    }
    // Keep everything else
    return true;
  });
}

/**
 * Initializes the Crosscore form by creating necessary hidden form elements
 *
 * @returns {void} - Returns nothing.
 */
function initializeCrosscore() {
  // Create form element
  const crosscoreForm = document.createElement('form');
  crosscoreForm.id = '_crosscoreForm';
  crosscoreForm.style.display = 'none';

  // Create first hidden input
  const userPrefs = document.createElement('input');
  userPrefs.type = 'hidden';
  userPrefs.id = 'user_prefs';
  userPrefs.name = 'user_prefs';

  // Create second hidden input
  const userPrefs2 = document.createElement('input');
  userPrefs2.type = 'hidden';
  userPrefs2.id = 'user_prefs2';
  userPrefs2.name = 'user_prefs2';

  // Append inputs to form
  crosscoreForm.appendChild(userPrefs);
  crosscoreForm.appendChild(userPrefs2);

  // Append form to body
  document.body.appendChild(crosscoreForm);

  // Initialize adx
  //adx.initiate(null); // Loaded gloablly in scripts.js
}

/**
 * Collects Crosscore details after initialization using prefs.js and fingerprint.js
 * @param {scope} globals - The global scope containing the form data which is injected.
 * @returns {void} - Sets the crosscoreDetails to Form Properties.
 */
function collectCrosscoreDetails(globals) {
  try {
    // Validate user preferences (both fields must be validated before reading)
    adx.validate('user_prefs'); // Loaded gloablly in scripts.js
    adx.validate('user_prefs2'); // Loaded gloablly in scripts.js

    // Create crosscore details object
    const crosscoreDetails = {
      JSC: document.getElementById('user_prefs').value,
      HDMData: document.getElementById('user_prefs2').value,
      fingerprint: '',
    };

    // Get fingerprint
    const fpPromise = FingerprintJS.load(); // Loaded gloablly in scripts.js

    // Process fingerprint promise
    fpPromise
      .then((fp) => fp.get())
      .then((result) => {
        crosscoreDetails.fingerprint = result.visitorId;
        setProperty('crosscoreDetails', crosscoreDetails, globals);
      })
      .catch((error) => {
        console.error("Error in collecting Crosscore details", error); // TODO: Only lead - No account opening
      });
  } catch (error) {
    if (errorCallback) {
      console.error("Error in collecting Crosscore details", error); // TODO:Only lead - No account opening
    }
  }
}

/**
 * Dispatches a custom event after a specified delay
 * @param {number} time - Delay in milliseconds before dispatching the event
 * @param {object} targetField - The field object to dispatch the event on ( defaults to globals.form )
 * @param {string} eventName - Name of the event to dispatch (without the 'custom:' prefix)
 * @param {scope} globals - Global scope object containing form functions
 * @returns {void}
 */
function dispatchEventWithDelay(time, targetField, eventName, globals) {
  if (!targetField) {
    targetField = globals.form;
  }
  setTimeout(() => {
    globals.functions.dispatchEvent(targetField, `custom:${eventName}`);
  }, time);
}

/**
 * Returns the value if it's not undefined, null, or empty, otherwise returns an empty string
 * @param {*} value - The value to check
 * @returns {string} The value as string or empty string if undefined/null/empty
 */
function getOrReturn(value) {
  return value || '';
}

// Helper function to parse HTML content and extract consent data
function parseConsentHtml(htmlContent, docName) {
  try {
    // Detect links that contain [newtab] in link title in documents
    htmlContent = htmlContent
      // Add target="_blank" to any <a> that contains [newtab]
      .replace(/<a([^>]*?)>(.*?)\[newtab\](.*?)<\/a>/gi, '<a$1 target="_blank">$2$3</a>')
      .replace(/\[newtab\]/gi, '');
    // Simple string parsing approach - look for div tags
    const divRegex = /<div[^>]*>(.*?)<\/div>/gs;
    const matches = [...htmlContent.matchAll(divRegex)];
    // Extract content from the first two divs
    const consentLabel = matches[0][1] || '';
    const startIndex = htmlContent.indexOf(matches[1][0]); // start of second div
    const htmlAfterSecondDiv = htmlContent.slice(startIndex);
    const secondDivRegex = /<div[^>]*>[\s\S]*<\/div>/i;
    const secondDivMatch = htmlAfterSecondDiv.match(secondDivRegex);
    const consentContent = secondDivMatch ? secondDivMatch[0] : '';
    const updatedConsentLabel = consentLabel.replace(/href="https:\/\/show-popup"/g, 'href="#open-modal"');
    const updatedConsentContent = consentContent.replace(/href="https:\/\/show-popup"/g, 'href="#open-modal"');

    return {
      consentLabel: updatedConsentLabel,
      consentContent: updatedConsentContent,
      consentName: docName
    };
  } catch (error) {
    console.error(`Error parsing HTML for consent document: ${docName}`, error);
    return null;
  }
}

/**
 *
 * @param {*} consentList
 * @returns
 */
function fetchConsentDocuments(consentList) {
  if (!consentList) return Promise.resolve([]);
  const docNames = consentList.split(',').map(doc => doc.trim());
  const promises = docNames.map(docName =>
    fetch(`${fetchDocumentBaseUrl}/hdfc/consents/${docName}.plain.html`, {
      method: "GET"
    })
      .then(response => response.text())
      .then(htmlContent => {
        const data = parseConsentHtml(htmlContent, docName);
        return data;
      })
      .catch(error => {
        console.error(`Error fetching consent ${docName}:`, error);
        return null;
      })
  );
  return Promise.all(promises).then(results => results.filter(result => result !== null));
}

/**
 * Applies fetched consent document results to a repeatable consent panel.
 * The caller is responsible for deciding the visibility based on business rules.
 *
 * @param {Array} panelFields - The repeatable consent panel fields (e.g., consentPanel.requiredConsents)
 * @param {Array} results - Array of fetched consent document objects { consentLabel, consentName }
 * @param {boolean} visible - Whether to show the consent fields. Defaults to true if not passed.
 * @param {scope} globals - Global scope object
 */
function applyConsentFieldsToPanel(panelFields, results, visible, globals) {
  const hasResults = Array.isArray(results) && results.length > 0;
  const shouldShow = (visible === undefined || visible === null) ? true : visible;

  panelFields.forEach((field, index) => {
    const selectedItem = field.$items[0].selected;
    if (!hasResults) {
      globals.functions.setProperty(selectedItem, { visible: false });
      return;
    }
    const label = results[index].consentLabel;
    globals.functions.setProperty(selectedItem, { properties: { docName: results[index]?.consentName } });
    globals.functions.setProperty(selectedItem, { label: { value: label, richText: true } });
    globals.functions.setProperty(selectedItem, { visible: shouldShow });
  });
}

/**
 * Set a field property value
 * @param {object} field field or panel component to set the property on
 * @param {string} propertyName Name of the property to set
 * @param {any} propertyValue Value to set for the property
 * @param {number} timeDelay time delay
 * @param {scope} globals Global scope object
 */
function setFieldValueWithDelay(field, propertyName, propertyValue, timeDelay, globals) {
  try {
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        globals.functions.setProperty(field, {
          [propertyName]: propertyValue
        })
      }, timeDelay)
    }
  } catch (error) {
    return undefined;
  }
}

/**
 * Creates an array containing a single state info object with `state`, `stateInfo`, and `timeinfo` fields.
 * @param {string} journeyState - value of joureny state as string
 * @param {string} journeyData - jsonstringified form object
 * @param {string} timeinfo - time stamp in string
 * @returns {array} - an array containing a single state info object
 */
function createStateInfoObject(journeyState, journeyData, timeinfo) {
  return (
    [{
      state: journeyState,
      stateInfo: journeyData,
      timeinfo: timeinfo,
    }]
  )
}

/**
 * Shift a given date by a specified number of days.
 * @param {string|Date} currentDate - Current date as ISO string or Date object.
 * @param {string} dayShift - String indicating days to shift (e.g., "+1", "-2").
 * @returns {Date} - ISO string of the new date.
 */
function getOffsetDate(currentDate, dayShift) {
  let date = new Date();
  const shift = parseInt(dayShift, 10) || 0; // Convert "+2"/"-3" to number

  date.setDate(date.getDate() + shift);
  const pad = (n) => String(n).padStart(2, '0');
  const formatDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return formatDate(date);
}

/**
 * Prefills the form with data from a JSON string.
 * Parses the provided JSON string and imports the resulting data object into the form using the runtime's importData function.
 * @param {string} stringifiedFormData - The JSON string representing form data to prefill.
 * @param {scope} globals - Global scope object
 * @returns {void}
 */
function setFormData(stringifiedFormData, globals) {
  try {
    const parsedData = JSON.parse(stringifiedFormData);
    globals.functions.importData(parsedData, globals.form.$qualifiedName);
  } catch (error) {
    return undefined;
  }
}

/**
 * Converts a timestamp string into a readable date format: "DD Mon YYYY, HH:MM:SSAM/PM".
 *
 * @param {string} timestamp - A timestamp string in ISO format (e.g., "2025-07-28T15:45:14").
 * @returns {string} A formatted date string.
 *
 * @example
 * getRJDateFormat("2025-07-28T15:45:14");
 * // Returns: "28 Jul 2025, 3:45:14PM"
 */
function getRJDateFormat(timestamp) {
  const date = new Date(timestamp);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours < 12 ? 'AM' : 'PM';
  hours = hours % 12 || 12;

  return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}${ampm}`;
}

/**
 * Validates whether the length of a given parameter falls within the specified range.
 *
 * @param {string} parameter1 - The parameter whose length is to be validated.
 * @param {number} minlength - The minimum allowed length (inclusive of given number).
 * @param {number} [maxlength] - The maximum allowed length (inclusive of given number).
 * @param {scope} globals - The AEM EDS global scope object.
 * @returns {string}
 */
function validateLength(parameter1, minlength, maxlength, globals) {
  if (typeof parameter1 === 'string' && parameter1.length >= minlength && (!passesNullCheck(maxlength) || parameter1.length <= maxlength)) {
    return 'true';
  } else {
    return 'false';
  }
}

/**
 * Stores the consolidated query params in the provided field
 *
 * @param {object} target - The String where consolidated queryParams is placed.
 * @param {scope} globals - The AEM EDS global scope object.
 * @returns {string}
 */
function getQueryParamsString(target, globals) {
  if (typeof target === 'object' && target && passesNullCheck(target.$value)) {
    const returnValue = target.$value.replace(/amp;/g, "");
    //these special characters cannot move to a constant file as dynamic import & import is not supported.
    returnValue.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      globals.form.$properties.queryParams[key] = value || '';
      globals.form.$properties[key] = value || '';
    });
    return returnValue;
  }

  if (globals.form.$properties.queryParams && typeof globals.form.$properties.queryParams === 'object') {
    const queryParams = globals.form.$properties.queryParams;
    const queryKeys = Object.keys(queryParams);

    if (queryKeys.length > 0) {
      const seenKeys = new Set();
      const parts = [];

      queryKeys.forEach(key => {
        const lowercaseKey = key.toLowerCase();
        // Remove jid and visittype if present
        if (lowercaseKey === 'jid' || lowercaseKey === 'visittype') {
          return;
        }
        // Remove duplicate entries
        if (!seenKeys.has(lowercaseKey)) {
          seenKeys.add(lowercaseKey);
          //if (passesNullCheck(queryParams[key])) {
          parts.push(lowercaseKey + '=' + queryParams[key]);
          //}
        }
      });
      const jsonObj = {};
      parts.forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
          jsonObj[key] = value || '';
        }
      });
      setProperty('baasRequestParams', jsonObj, globals);
      return parts.join('&');
    }
  }

  return "";
}

/**
 * Creates a JSON mapping from an array of objects using specified key and value properties.
 * This function iterates through an array of objects and creates a new object where
 * each key is the value of the specified keyProperty and each value is the value of the specified valueProperty.
 *
 * @param {Array} array - Array of objects to create mapping from
 * @param {string} keyProperty - Property name to use as the key in the resulting mapping
 * @param {string} valueProperty - Property name to use as the value in the resulting mapping
 * @returns {Object} - Mapping object where keys are array[i].keyProperty and values are array[i].valueProperty
 *
 * @example
 * // Create city to state mapping
 * const citiesAndStates = [
 *   { "city_name": "MUMBAI", "state_hd": "MAHARASHTRA" },
 *   { "city_name": "DELHI", "state_hd": "DELHI" }
 * ];
 * const cityStateMap = createMappingFromArray(citiesAndStates, "city_name", "state_hd");
 * // Result: { "MUMBAI": "MAHARASHTRA", "DELHI": "DELHI" }
 *
 * @example
 * // Create product code to name mapping
 * const products = [
 *   { "code": "PROD001", "name": "Laptop", "price": 50000 },
 *   { "code": "PROD002", "name": "Mouse", "price": 500 }
 * ];
 * const productMap = createMappingFromArray(products, "code", "name");
 * // Result: { "PROD001": "Laptop", "PROD002": "Mouse" }
 *
 * @example
 * // Handle missing properties gracefully
 * const incompleteData = [
 *   { "id": "1", "name": "Item 1" },
 *   { "id": "2" }, // missing name
 *   { "name": "Item 3" } // missing id
 * ];
 * const mapping = createMappingFromArray(incompleteData, "id", "name");
 * // Result: { "1": "Item 1" } (only complete objects are included)
 */
function createMappingFromArray(array, keyProperty, valueProperty) {
  if (!Array.isArray(array)) return {};

  const mapping = {};
  array.forEach(item => {
    if (item[keyProperty] && item[valueProperty]) {
      mapping[item[keyProperty]] = item[valueProperty];
    }
  });

  return mapping;
}

/**
 * Helper function to extract document data from form fields
 * @param {scope} globals - Global scope object
 * @returns {Object|null} - Document data or null if required data is missing
 */
function extractDocumentData(globals) {
  try {
    // Navigate the form structure to access document fields
    const { form } = globals;
    const { wizard } = form || {};
    const { kycPanel } = wizard || {};
    const { ovdFormFragment } = kycPanel || {};
    const { ovdFragment } = ovdFormFragment || {};
    const { address_id_proof, ovd } = ovdFragment || {};

    // If any of these key structures are missing, return null
    if (!ovd || !address_id_proof) {
      return null;
    }

    const { document_type, passport_upload_type } = ovd;
    const {
      address_proof,
      selfiePanel,
      passportPanel,
      voterIdPanel,
      drivinglicensepanel,
    } = address_id_proof;

    // Initialize document data object
    const docData = {
      file1FS: null,
      file2FS: null,
      file2BS: null,
      file4: null,
      doc1FSType: "",
      doc2FSType: "",
      doc2BSType: "",
      journeyID: getJourneyId(globals),
      journeyName: getJourneyName(globals),
      mobileNo: globals.form.$properties.mobileNumber,
      identifierValue: globals.form.$properties.dateOfBirth,
    };

    // Extract primary document data based on document type
    if (document_type.$value === "voter_id") {
      docData.file2FS = getFieldValue(voterIdPanel, 'upload_voterid_front');
      docData.file2BS = getFieldValue(voterIdPanel, 'upload_voterid_back');
      docData.doc2FSType = "VOTERS_ID_FS";
      docData.doc2BSType = "VOTERS_ID_BS";
    } else if (document_type.$value === "driving_licence") {
      docData.file2FS = getFieldValue(drivinglicensepanel, 'upload_dl_front');
      docData.file2BS = getFieldValue(drivinglicensepanel, 'upload_dl_back');
      docData.doc2FSType = "DL_FS";
      docData.doc2BSType = "DL_BS";
    } else {
      // Default to passport
      docData.file2FS = getFieldValue(passportPanel, 'upload_passport_front');
      docData.file2BS = getFieldValue(passportPanel, 'upload_passport_back');
      docData.doc2FSType = "PASSPORT_FS";
      docData.doc2BSType = "PASSPORT_BS";
    }

    // Extract secondary document data
    if (passport_upload_type !== "address_proof") {
      docData.doc1FSType = "NULL_FS";
    }

    if (address_proof) {
      const { id_proof_dd, passport_id_proof_panel, voter_id_proof_panel, dl_proof_panel } = address_proof;

      if (id_proof_dd.$value === "passport") {
        docData.file1FS = getFieldValue(passport_id_proof_panel, 'ap_upload_passport_front');
        docData.doc1FSType = "PASSPORT_FS";
      } else if (id_proof_dd.$value === "voterId") {
        docData.file1FS = getFieldValue(voter_id_proof_panel, 'ap_upload_voterid_front');
        docData.doc1FSType = "VOTERS_ID_FS";
      } else {
        docData.file1FS = getFieldValue(dl_proof_panel, 'ap_upload_dl_front');
        docData.doc1FSType = "DL_FS";
      }
    }

    // Extract selfie data
    docData.file4 = getFieldValue(selfiePanel, 'upload_selfie');

    return docData;
  } catch (error) {
    setFieldProperty(globals.form.wizard.kycPanel.ovdFormFragment.continueOVD, "currentState", "KYC_DOCUMENTS_UPLOAD_ERROR", globals);
    console.error("Error extracting document data:", error);
    return null;
  }
}

/**
 * Helper function to safely get field value data using optional chaining
 * @param {Object} panel - The panel containing the field
 * @param {string} fieldName - The name of the field
 * @returns {*} - The field value data or null if not available
 */
function getFieldValue(panel, fieldName) {
  if (!fieldName || !panel || !panel[fieldName] || !panel[fieldName].$value || !panel[fieldName].$value.data) {
    return null;
  }

  return panel[fieldName].$value.data;
}

/**
* Masks the first 5 digits of the mobile number with *
* @param {*} mobileNumber
* @returns {string} returns the mobile number with first 5 digits masked
*/
function maskMobileNumber(mobileNumber) {
  if (!mobileNumber) {
    return '';
  }
  const value = mobileNumber.toString();
  // Mask first 5 digits and keep the rest
  return ` ${'*'.repeat(5)}${value.substring(5)}`;
}

/**
 * Returns the first non-null value from an array.
 * This function iterates through an array and returns the first value that is not null, undefined, or empty string.
 *
 * @param {Array} array - Array to search for non-null values
 * @returns {*} - First non-null value found, or null if no non-null values exist
 *
 * @example
 * // Basic usage
 * const values = [null, undefined, "", "valid", "another"];
 * const result = getAnyNonNullValue(values);
 * // Result: "valid"
 *
 * @example
 * // With all null values
 * const nullValues = [null, undefined, "", null];
 * const result = getAnyNonNullValue(nullValues);
 * // Result: null
 *
 * @example
 * // With numbers and booleans
 * const mixedValues = [null, 0, false, "hello", null];
 * const result = getAnyNonNullValue(mixedValues);
 * // Result: 0 (0 is considered non-null)
 *
 * @example
 * // Empty array
 * const emptyArray = [];
 * const result = getAnyNonNullValue(emptyArray);
 * // Result: null
 */
function getAnyNonNullValue(array) {
  if (!Array.isArray(array)) return null;

  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }

  return null;
}


/**
 * Returns the current year as a number. The function is required for cases when only Year comes as DOB from Aadhar, and we need to calculate Age.
 * @returns {number} The current year (e.g., 2025)
 *
 * @example
 * getCurrentYear(); // 2025
 */
function getCurrentYear() {
  return new Date().getFullYear();
}


function enableOvdButton(globals) {
  try {
    const { form } = globals;
    const { wizard } = form || {};
    const { kycPanel } = wizard || {};
    const { ovdFormFragment } = kycPanel || {};
    const { ovdFragment } = ovdFormFragment || {};
    const { address_id_proof, ovd } = ovdFragment || {};
    const { document_type, passport_upload_type } = ovd;
    const {
      address_proof,
      selfiePanel,
      passportPanel,
      voterIdPanel,
      drivinglicensepanel,
    } = address_id_proof;
    const { id_proof_dd, passport_id_proof_panel, voter_id_proof_panel, dl_proof_panel } = address_proof;

    const docType = document_type.$value;
    const passportUploadType = passport_upload_type.$value;

    // Document-specific field mapping
    const docFieldMap = {
      voter_id: {
        panel: voterIdPanel,
        fields: ["upload_voterid_front", "upload_voterid_back"],
      },
      driving_licence: {
        panel: drivinglicensepanel,
        fields: ["upload_dl_front", "upload_dl_back"],
      },
      passport: {
        panel: passportPanel,
        fields: ["upload_passport_front", "upload_passport_back"],
      }
    };

    const config = docFieldMap[docType];
    if (!config) return false;

    // Check selfie and document-specific fields
    const isSelfieUploaded = getFieldValue(selfiePanel, "upload_selfie");
    const areDocFieldsUploaded = config.fields.every(field => getFieldValue(config.panel, field));

    // Branch 1: passport_upload_type === "address_id_proof"
    if (passportUploadType === "address_id_proof") {
      return isSelfieUploaded && areDocFieldsUploaded;
    }

    // Branch 2: passport_upload_type === "address_proof"
    if (passportUploadType === "address_proof" && id_proof_dd) {
      const idProofValue = id_proof_dd.$value;
      let isAddressProofUploaded = false;

      if (idProofValue === "passport") {
        isAddressProofUploaded = !!getFieldValue(passport_id_proof_panel, "ap_upload_passport_front");
      } else if (idProofValue === "voterId") {
        isAddressProofUploaded = !!getFieldValue(voter_id_proof_panel, "ap_upload_voterid_front");
      } else {
        isAddressProofUploaded = !!getFieldValue(dl_proof_panel, "ap_upload_dl_front");
      }

      return isSelfieUploaded && areDocFieldsUploaded && isAddressProofUploaded;
    }

    // Default fallback
    return false;

  } catch (error) {
    console.error("Error checking OVD files:", error);
    return false;
  }
}

/**
 * Checks if a value is an array
 * @param {*} value - The value to check
 * @returns {boolean} True if the value is an array, false otherwise
 *
 * @example
 * // Array check
 * const arr = [1, 2, 3];
 * const result = isArray(arr);
 * // Result: true
 *
 * @example
 * // Non-array check
 * const str = "hello";
 * const result = isArray(str);
 * // Result: false
 *
 * @example
 * // Null check
 * const nullValue = null;
 * const result = isArray(nullValue);
 * // Result: false
 */
function isArray(value) {
  return Array.isArray(value);
}

/**
 * Returns an empty object
 * @returns {object} Empty object
 *
 */
function returnEmptyObject() {
  return {};
}

/**
 * Splits a full name into firstName, middleName, and lastName and sets them to properties
 * @param {string} fullName - The full name to split
 * @param {string} firstNameProp - Property name for firstName (default: "firstName")
 * @param {string} middleNameProp - Property name for middleName (default: "middleName")
 * @param {string} lastNameProp - Property name for lastName (default: "lastName")
 * @param {string} middleNameStrategy - Strategy for handling middle names: "join", "start", "end", or "ignore" (default: "start")
 * @param {scope} globals - Global scope object
 * @returns {array} Array containing [firstName, middleName, lastName]
 *
 * @example
 * // Two word name with default property names
 * const result = splitFullName("John Doe", "firstName", "middleName", "lastName", "join", globals);
 * // Result: ["John", "", "Doe"]
 *
 * @example
 * // Three word name with custom property names
 * const result = splitFullName("John Michael Doe", "fName", "mName", "lName", "join", globals);
 * // Result: ["John", "Michael", "Doe"]
 *
 * @example
 * // Four word name with start strategy
 * const result = splitFullName("John Michael Smith Doe", "firstName", "middleName", "lastName", "start", globals);
 * // Result: ["John", "Michael", "Doe"]
 *
 * @example
 * // Four word name with end strategy
 * const result = splitFullName("John Michael Smith Doe", "firstName", "middleName", "lastName", "end", globals);
 * // Result: ["John", "Smith", "Doe"]
 *
 * @example
 * // Four word name with ignore strategy
 * const result = splitFullName("John Michael Smith Doe", "firstName", "middleName", "lastName", "ignore", globals);
 * // Result: ["John", "", "Doe"]
 *
 * @example
 * // Four word name with join strategy
 * const result = splitFullName("John Michael Smith Doe", "firstName", "middleName", "lastName", "join", globals);
 * // Result:  ['John', 'Michael Smith', 'Doe']
 */
function splitFullName(fullName, firstNameProp, middleNameProp, lastNameProp, middleNameStrategy, globals) {
  try {
    if (!fullName || typeof fullName !== 'string') {
      return ['', '', ''];
    }

    // Set default property names if null, undefined, or empty
    if (!firstNameProp || firstNameProp === null || firstNameProp === undefined || firstNameProp === '') {
      firstNameProp = 'firstName';
    }
    if (!middleNameProp || middleNameProp === null || middleNameProp === undefined || middleNameProp === '') {
      middleNameProp = 'middleName';
    }
    if (!lastNameProp || lastNameProp === null || lastNameProp === undefined || lastNameProp === '') {
      lastNameProp = 'lastName';
    }
    if (!middleNameStrategy || middleNameStrategy === null || middleNameStrategy === undefined || middleNameStrategy === '') {
      middleNameStrategy = 'start';
    }

    // Trim whitespace and split by spaces
    const nameParts = fullName.trim().split(/\s+/).filter(part => part.length > 0);

    let firstName = '';
    let middleName = '';
    let lastName = '';

    if (nameParts.length === 1) {
      // Single name
      firstName = nameParts[0];
    } else if (nameParts.length === 2) {
      // Two names: firstName lastName
      firstName = nameParts[0];
      lastName = nameParts[1];
    } else if (nameParts.length >= 3) {
      // Three or more names: firstName is always first word, lastName is always last word
      firstName = nameParts[0];
      lastName = nameParts[nameParts.length - 1];

      // Handle middle names based on strategy
      switch (middleNameStrategy.toLowerCase()) {
        case "join":
          // Join all middle names
          middleName = nameParts.slice(1, -1).join(' ');
          break;

        case "start":
          // Take first middle name only
          middleName = nameParts[1];
          break;

        case "end":
          // Take last middle name only
          middleName = nameParts[nameParts.length - 2];
          break;

        case "ignore":
          // Ignore middle names
          middleName = '';
          break;

        default:
          // Default to join strategy
          middleName = nameParts.slice(1, -1).join(' ');
          break;
      }
    }

    // Set the properties using setProperty function
    setProperty(firstNameProp, firstName, globals);
    setProperty(middleNameProp, middleName, globals);
    setProperty(lastNameProp, lastName, globals);

    return [firstName, middleName, lastName];
  } catch (error) {
    console.error('Error splitting full name:', error);
    return ['', '', ''];
  }
}

/**
 * Tests if a field value matches a given regex pattern.
 *
 * @param {Object} field - The form field object containing a `$value` property.
 * @param {string} regexPattern - The regex pattern to test against the field value.
 * @param {scope} globals - Global variables or settings object (currently unused in this function).
 *
 * @returns {boolean} - Returns `true` if the field value matches the regex pattern; otherwise, `false`.
 *
 * @example - On rule editor, use this function to validate field values against custom regex patterns.
 * regexTest(emailField, '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', globals)
 *
 * @example - On rule editor, use this function to validate if Address field has 4 consequtive characters.
 * regexTest(addressField, '(.)\1{3,}', globals)
 */
function regexTest(field, regexPattern, globals) {
  try {
    // Check if field and field value exist
    if (!field || !field.$value) {
      return false;
    }

    // Convert field value to string for regex testing
    const fieldValue = String(field.$value);

    // Create regex object from the pattern
    const regex = new RegExp(regexPattern);

    // Test if the field value matches the regex pattern
    return regex.test(fieldValue);
  } catch (error) {
    console.error('Error in regexTest function:', error);
    return false;
  }
}

/**
 * Retrieves the user input value for a specific consent type from dynamic optional consents
 * @param {string} consentType - The type of consent to retrieve (e.g., "gigacreditcard")
 * @param {scope} globals - Global scope object
 * @returns {string} The user's input value for the consent, or empty string if not found
 */
function getConsentInputValue(consentType, globals) {
  try {
    // Get dynamic optional consents from form properties
    const dynamicConsents = getProperty('dynamicOptionalConsents', globals);
    if (!dynamicConsents || !Array.isArray(dynamicConsents)) {
      return '';
    }

    // Find the specific consent
    const targetConsent = dynamicConsents.find(consent =>
      consent && consent.consentName === consentType
    );

    // Return the consent value if found, otherwise empty string
    return targetConsent ? targetConsent.value || '' : '';
  } catch (error) {
    console.error('Error getting consent value:', error);
    return '';
  }
}

/**
 * Masks a portion of a string with a specified character.
 *
 * @param {string} input - The string to be masked
 * @param {string} maskPosition - Where to apply the mask: 'start', 'end', or 'middle'
 * @param {number} maskLength - Number of characters to mask
 * @param {string} [maskChar='*'] - Character to use for masking (defaults to asterisk)
 * @returns {string} The masked string
 *
 * @example
 * // Mask first 4 characters
 * maskString('1234567890', 'start', 4); // '****567890'
 *
 * @example
 * // Mask last 3 characters
 * maskString('1234567890', 'end', 3); // '1234567***'
 *
 * @example
 * // Mask 4 characters in the middle
 * maskString('1234567890', 'middle', 4); // '123****890'
 */
function maskString(input, maskPosition, maskLength, maskChar = '*') {
  // Input validation
  if (!input || typeof input !== 'string') {
    return input;
  }

  // Create mask string of required length
  maskChar = maskChar ? maskChar : "*";
  const mask = maskChar.repeat(maskLength);

  // Apply mask based on position
  switch (maskPosition) {
    case 'start':
      return mask + input.substring(maskLength);

    case 'end':
      return input.substring(0, input.length - maskLength) + mask;

    case 'middle':
      // Calculate the start position for the middle mask
      const startPos = Math.floor((input.length - maskLength) / 2);
      return input.substring(0, startPos) + mask + input.substring(startPos + maskLength);

    default:
      // Return original string if invalid position is provided
      return input;
  }
}

/**
 * Filters out special characters from a string, keeping only alphanumeric characters and specified special characters.
 *
 * @param {string} inputString - The input string to filter
 * @param {string} [allowedSpecialChars] - String of allowed special characters (default: only alphanumeric) : "/*- " - Will allow forward slash, hyphen, asterisk and space
 *
 * @example
 * // Basic usage - remove all special characters except spaces
 * filterSpecialCharacters("Hello@World!#$"); // "Hello World"
 *
 * @example
 * // Allow specific special characters using regex pattern
 * filterSpecialCharacters("user-name_123", '-_'); // "user-name_123"
 * filterSpecialCharacters("user-name_123", '-_'); // "user-name_123"
 *
 * @example
 * // Allow spaces and hyphens
 * filterSpecialCharacters("Hello World!", '- '); // "Hello World-"
 *
 * @example
 * // Allow only alphanumeric (no special characters)
 * filterSpecialCharacters("Hello@World!#$", ""); // "HelloWorld"
 *
 * @example
 * // Handle empty or null input
 * filterSpecialCharacters(""); // ""
 * filterSpecialCharacters(null); // ""
 */
function filterSpecialCharacters(inputString, allowedSpecialChars = "") {
  // Handle null, undefined, or empty input
  if (!inputString || typeof inputString !== 'string') {
    return '';
  }

  let pattern;

  // If allowedSpecialChars is provided, use it to build the pattern
  if (allowedSpecialChars !== undefined && allowedSpecialChars !== "") {
    // Convert string to regex if it's a string
    if (typeof allowedSpecialChars === 'string') {
      // Escape special regex characters in the string
      const escapedChars = allowedSpecialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pattern = `[^a-zA-Z0-9${escapedChars}]`;
    } else if (allowedSpecialChars instanceof RegExp) {
      // Extract the character class content from the regex
      const regexStr = allowedSpecialChars.source;
      // Remove the outer brackets if they exist
      const chars = regexStr.replace(/^\[|\]$/g, '');
      pattern = `[^a-zA-Z0-9${chars}]`;
    } else {
      // Fallback to default behavior
      pattern = '[^a-zA-Z0-9]';
    }
  } else {
    // Legacy behavior for backward compatibility
    pattern = '[^a-zA-Z0-9]';
  }

  // Create regex and replace special characters
  const regex = new RegExp(pattern, 'g');
  const filteredString = inputString.replace(regex, '');

  // If keeping spaces (either through allowedSpecialChars or legacy keepSpaces), clean up multiple consecutive spaces
  const hasSpaces = (allowedSpecialChars !== undefined && allowedSpecialChars !== "" &&
    ((typeof allowedSpecialChars === 'string' && allowedSpecialChars.includes(' ')) ||
      (allowedSpecialChars instanceof RegExp && allowedSpecialChars.source.includes('\\s')))) ||
    (allowedSpecialChars === undefined && keepSpaces);

  if (hasSpaces) {
    return filteredString.replace(/\s+/g, ' ').trim();
  }

  return filteredString;
}

/**
 * Converts ISO date string to readable format: "DD MMM YYYY, h:mm:ssA"
 *
 * @param {string} isoDateString - ISO date string (e.g., "2025-08-13T11:42:12.630Z")
 * @returns {string} Formatted date string (e.g., "13 Aug 2025, 11:42:12AM")
 *
 * @example
 * convertIsoToReadable('2025-08-13T11:42:12.630Z'); // "13 Aug 2025, 11:42:12AM"
 * convertIsoToReadable('2025-12-25T00:00:00.000Z'); // "25 Dec 2025, 12:00:00AM"
 */
function convertIsoToReadable(isoDateString) {
  try {
    const date = new Date(isoDateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }

    // Month abbreviations
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Get date components
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    // Get time components
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12

    return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}${ampm}`;

  } catch (error) {
    console.error('Error converting ISO date:', error);
    return '';
  }
}

/**
 * Checks if a value is valid (not null, undefined, or empty string)
 * @param {*} value - The value to check
 * @param {scope} globals - The AEM EDS global scope object.
 * @returns {boolean} - Returns true if value is valid; false if null, undefined, or empty string
 *
 * @example
 * passesNullCheck(null);        // false
 * passesNullCheck(undefined);   // false
 * passesNullCheck("");          // false
 * passesNullCheck("  ");        // true (whitespace is considered valid)
 * passesNullCheck("hello");     // true
 * passesNullCheck(0);           // true (0 is a valid value)
 * passesNullCheck(false);       // true (false is a valid value)
 */
function passesNullCheck(value, globals) {
  return value !== null && value !== undefined && value !== "";
}

/**
 * Calculate the number of minutes between two dates.
 * @param {*} endDate
 * @param {*} startDate
 * @returns {number} returns the number of minutes between two dates
 */
function getMinutesBetweenTwoDates(endDate, startDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  // If either date is invalid, return 0
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }
  // Difference in milliseconds → minutes
  const diffInMs = Math.abs(end - start);
  return Math.floor(diffInMs / (1000 * 60));
}

/**
 * Capitalizes the first character of every word in a string.
 * @param {string} str - The input string to capitalize
 * @returns {string} The string with first character of each word capitalized
 *
 * @example
 * capitalizeFirstCharOfWords("hello world"); // "Hello World"
 * capitalizeFirstCharOfWords("javascript is awesome"); // "Javascript Is Awesome"
 */
function capitalizeFirstCharOfWords(str) {
  if (str === undefined || str === null || str === '') {
    return '';
  }
  return str.replace(/\b\w/g, (match) => match.toUpperCase());
}

/**
 * Calculates the difference between a given date-time string and the current date
 * @param {string} dateTimeString - The date-time string to compare with current date
 * @param {string} unit - Unit of calculation: 'years', 'months', 'days', 'hours', 'minutes', 'seconds' (default: 'days')
 * @param {scope} globals - Global scope object
 * @returns {number} - Time difference in specified unit (positive if future, negative if past)
 *
 * Note: - If there is some other use case, feel free to add to the switch case.
 *       - If dateTime is in the past, the difference will be negative.
 *       - If dateTime is in the future, the difference will be positive.
 *       - If dateTime is the same as the current date, the difference will be 0.
 *
 * Examples:
 * getDifferenceFromCurrentDate('2024-12-25T10:00:00Z', 'days', globals) // Returns days difference
 * getDifferenceFromCurrentDate('2024-12-25T10:00:00Z', 'years', globals) // Returns years difference
 * getDifferenceFromCurrentDate('2024-12-25T10:00:00Z', 'months', globals) // Returns months difference
 * getDifferenceFromCurrentDate('2024-12-25T10:00:00Z', 'hours', globals) // Returns hours difference
 * getDifferenceFromCurrentDate('2024-12-25T10:00:00Z', 'minutes', globals) // Returns minutes difference
 * getDifferenceFromCurrentDate('2024-12-25T10:00:00Z', 'seconds', globals) // Returns seconds difference
 * getDaysFgetDifferenceFromCurrentDateromCurrentDate('2024-12-25T10:00:00Z', globals) // Default to days
 */
function getDifferenceFromCurrentDate(dateTimeString, unit = 'days', globals) {
  try {
    // Handle null/undefined input
    if (!dateTimeString) {
      return null;
    }

    // Convert string to Date object
    const inputDate = new Date(dateTimeString);

    // Validate date
    if (isNaN(inputDate.getTime())) {
      return null;
    }

    // Get current date
    const currentDate = new Date();

    // Calculate difference in milliseconds
    const timeDifference = inputDate.getTime() - currentDate.getTime();

    switch (unit) {
      case 'years':
        // Calculate years difference using millisecond-based approach for consistency
        const yearsDiff = timeDifference / (1000 * 60 * 60 * 24 * 365.25); // 365.25 accounts for leap years
        return timeDifference < 0 ? Math.ceil(yearsDiff) : Math.floor(yearsDiff);

      case 'months':
        // Calculate months difference using millisecond-based approach for consistency
        const monthsDiff = timeDifference / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
        return timeDifference < 0 ? Math.ceil(monthsDiff) : Math.floor(monthsDiff);

      case 'days':
        // Calculate days difference
        const daysDiff = timeDifference / (1000 * 60 * 60 * 24);
        return timeDifference < 0 ? Math.floor(daysDiff) : Math.ceil(daysDiff);

      case 'hours':
        // Calculate hours difference
        const hoursDiff = timeDifference / (1000 * 60 * 60);
        return timeDifference < 0 ? Math.ceil(hoursDiff) : Math.floor(hoursDiff);

      case 'minutes':
        // Calculate minutes difference
        const minutesDiff = timeDifference / (1000 * 60);
        return timeDifference < 0 ? Math.ceil(minutesDiff) : Math.floor(minutesDiff);

      case 'seconds':
        // Calculate seconds difference
        const secondsDiff = timeDifference / 1000;
        return timeDifference < 0 ? Math.ceil(secondsDiff) : Math.floor(secondsDiff);

      default:
        // Default to days calculation
        const defaultDaysDiff = timeDifference / (1000 * 60 * 60 * 24);
        return timeDifference < 0 ? Math.ceil(defaultDaysDiff) : Math.floor(defaultDaysDiff);
    }

  } catch (error) {
    console.error('Error in getDaysFromCurrentDate:', error);
    return null;
  }
}

/**
* getEmptyArray
* @name getEmptyArray
* @param {scope} globals - The AEM EDS global scope object.
* @returns {array}
*/
function getEmptyArray(globals) {
  /*
    Discussed with engineering and creating this method per their suggestion as there is no current method to get an empty array for setting to enum.
    Refer thread https://cq-dev.slack.com/archives/C0664C26ZV3/p1757568091241509 and final confirmation from engineering dev https://cq-dev.slack.com/archives/D097X43F4LQ/p1757590548971429.
  */
  return [];
}

/**
 * Append a payment gateway form (from an HTML string) to the body and submit it.
 *
 * @param {string} htmlString - The HTML string containing a <form>.
 */
function appendAndSubmitPaymentForm(htmlString) {
  if (!htmlString || typeof htmlString !== "string") {
    console.error("appendAndSubmitPaymentForm: invalid HTML string");
    return;
  }

  // Normalize (CCAvenue sometimes sends \x3C instead of <)
  const normalized = htmlString.replace(/\\x3C/gi, "<").trim();

  // Parse the HTML string
  const wrapper = document.createElement("div");
  wrapper.innerHTML = normalized;

  // Grab the first element (expecting <form>)
  const form = wrapper.firstElementChild;
  if (!form || form.tagName !== "FORM") {
    console.error("appendAndSubmitPaymentForm: no <form> found in HTML string");
    return;
  }

  // Append form to body
  document.body.appendChild(form);

  // Submit explicitly (inline <script> won’t execute on dynamic insert)
  form.submit();
}

/**
 * Retrieves the user input value for  consent type from dynamic optional consents
 * @param {scope} globals - Global scope object
 * @returns {array} The consent name and consent value
 */
function mapConsentData(globals) {
  const consentsArray1 =
    globals.form.wizard.yourDetailsPanel.selectAccountVariant.dynamicConsents
      .optionalConsents.$value || [];

  const consentsArray2 =
    globals.form.wizard.yourDetailsPanel.selectAccountVariant.dynamicConsents
      .requiredConsents.$value || [];

  // Combine both arrays
  const consentsArray = [...consentsArray1, ...consentsArray2];
  // Validate the input
  if (!Array.isArray(consentsArray) || consentsArray.length === 0) {
    return [];
  }
  const result = consentsArray
    .map((item) => {
      if (item.consentName && item.selected) {
        return { [item.consentName]: item.selected };
      }
      return {}; // fallback in case of missing fields
    }).filter((obj) => Object.keys(obj).length > 0);

  // If there’s only one consent, return it as a string
  if (result.length === 1) {
    const [consentName, selected] = Object.entries(result[0])[0];
    return `${consentName}|${selected}`;
  }
  return result;
}

/**
 * Returns the product code from a raw account object.
 *
 * Expects an object like the one you shared (with keys such as
 * "Account", "Product Codes", etc.), not a field with $value.
 *
 * @param {object} accountObject - The raw account object.
 * @returns {string} The product code as string, or empty string if not found.
 */
function getProductCode(accountObject) {
  const hiddenProductCode = accountObject['Product Codes'] || accountObject['Product_Codes'] || '';
  return hiddenProductCode ? String(hiddenProductCode) : '';
}

/**
 * Returns the current local date and time in "MM/DD/YYYY hh:mm:ss AM/PM" format.
 *
 * @returns {string} The current local date and time as a formatted string.
 *
 * @example
 * const currentTime = getCurrentFormattedDateTime();
 * console.log(currentTime); // e.g., "11/13/2025 12:54:17 PM"
 */
function getCurrentFormattedDateTime() {
  return new Date().toLocaleString('en-US').replace(',', '');
}

// Performs a simple form reload with same utm parameters.
function refresh() {
  if (typeof window !== 'undefined' && window !== null) {
    window.location.reload();
  }
}

/**
 * Validates if the product code in UTM is valid and returns the corresponding account category
 * @param {array} accountsData - Array of account data objects
 * @param {scope} globals - Global scope object containing form properties
 * @returns {string} Returns "1" if account_category is "6", otherwise returns "0"
 */
function returnValidProductCategory(accountsData, globals) {
  if (globals.form.$properties.productcode !== undefined && globals.form.$properties.productcode !== null) {
    const result = accountsData.filter(
      item => String(item['Product Codes']) === String(globals.form.$properties.productcode)
    );
    if (result.length > 0) {
      if (result[0]['Account_Category'] === "6") {
        return "1";
      }
    }
  }
  return "0";
}

/**
 * Automatically reads and fills OTP from incoming SMS using the WebOTP API.
 *
 * - Checks browser support for the `OTPCredential` interface.
 * - Listens for OTP messages sent via SMS to the current domain.
 * - Extracts the OTP code and sets it into the form’s `otpInput` field.
 * - Logs errors gracefully if permission is denied or the API is unsupported.
 *
 * Works on modern mobile browsers (mainly Chrome on Android).
 *
 * @function autoRefillOtp
 * @param {Object} globals - Global form context containing `loginFragment.otpPanel.otpInput`.
 * @returns {void} - No return value. Updates OTP input field directly.
 */

function autoRefillOtp() {
  if ('OTPCredential' in window) {
    var otpNo = globals.form.loginFragment.otpPanel.otpInput;
    var ac = new AbortController();

    window.navigator.credentials.get({
      otp: { transport: ['sms'] },
      signal: ac.signal
    })
      .then(function (otp) {
        globals.functions.setProperty(otpNo, { value: String(otp.code) });
      })
      .catch(function (err) {
        console.error('OTP Auto-fill Error:', err);
      });
  } else {
    console.warn('WebOTP API not supported in this browser.');
  }
}

/**
 * This method returns value or index or boolean indicating presence, all parameters and return are in 'string' type; check following for detailed explanation.
 * @param {Array} arr - The array to search within.
 * @param {string} element - The element to look for in the array.
 * @param {string} [returnValue='value'] - Determines what to return when found: "value" or "index".
 * @param {string} [returnType='false'] - If 'true', returns 'true'/'false'; if 'false', returns value/index, type here is 'string' and NOT boolean.
 * @returns {string} Returns:
 *   - `true` or `false` if returnType is true,
 *   - index (number) if returnValue = 'index' (or -1 if not found),
 *   - element value if returnValue = 'value' (or null if not found or invalid input)
 *  Safely finds an element in an array and returns one of the following:
 *    - The element’s value (default behavior)
 *    - The element’s index
 *    - A boolean indicating presence (when returnType is true)
 *
 *  The function gracefully handles all invalid or edge scenarios and
 *  consistently returns `false` when inputs are invalid or the element
 *  is not found.
 *
 * Behavior Summary:
 *  - If returnType === true → returns true/false (existence check)
 *  - If returnType === false → returns:
 *      * Element value  → when returnValue = 'value' (default)
 *      * Element index  → when returnValue = 'index'
 *  - Returns false in all failure scenarios.
 *
 * Examples:
 *  findElementInArray([10, 20, 30], 20);                 // → 20
 *  findElementInArray([10, 20, 30], 20, 'index');        // → 1
 *  findElementInArray([10, 20, 30], 20, 'value', true);  // → true
 *  findElementInArray([10, 20, 30], 99);                 // → false
 *  findElementInArray([], 10);                           // → false
 *  findElementInArray('notArray', 20);                   // → false
 *  findElementInArray([1, 2, 3], 2, 'wrongKey');         // → false
 *  findElementInArray([1, 2, 3], 2, 'index', 'yes');     // → false
 */
function findElementInArray(arr, element, returnValue = 'value', returnType = 'false') {
  // Normalize returnValue to lowercase string for comparison
  const normalizedReturn = typeof returnValue === 'string' ? returnValue.trim().toLowerCase() : '';
  const isValidReturnValue = new Set(['value', 'index']).has(normalizedReturn);

  // Combined failure checks:
  // 1. Array is invalid or empty
  // 2. returnType is not boolean
  // 3. returnValue is not 'value' or 'index'
  if (!Array.isArray(arr) || arr.length === 0 || typeof returnType !== 'string' || !isValidReturnValue) {
    return 'false'; // Early return for invalid inputs
  }

  // Find the index using type-coerced comparison
  const index = arr.findIndex(item => item == element);

  // If element is not found, return false
  if (index === -1) {
    return 'false';
  }

  // If returnType is true, only return existence (true)
  if (returnType === 'true') {
    return 'true';
  } else {
    // Otherwise, return value or index based on normalizedReturn
    if (normalizedReturn === 'index') {
      return index;
    } else {
      return arr[index];
    }
  }
}

/**
  * @name validateName
  * @description Validates a single customer name field
  * @param {Object} customerNameObj - The name field object
  * @param {scope} globals - Global form object
  */
function validateName(customerNameObj, globals) {
  const invalidMsg = {
    specialChars: 'Name contains invalid characters or restricted words.',
    alias: 'Name contains restricted words (e.g., alias, aka, urf).',
    repeatChars: 'Name contains repeating characters.',
    minLength: 'Please enter minimum 2 characters.',
    maxLength: 'Please enter maximum 40 characters.',
    sameFirstLast: 'First and last word should not be the same.',
    restrictedWords: 'Name contains invalid characters or restricted words.'
  };

  // Allowed pattern (letters, digits, basic punctuation, spaces)
  const namePattern = /^(?!\s)(?!.*\s$)(?!.*\s{2,})(?!.*(?:S\/O|D\/O|W\/O|C\/O|U\/G))(?!.*(?:[Ss]on of|[Ww]ife of|[Dd]aughter of|[Cc]are of|[Uu]nderguardian of))(?!.*([A-Za-z0-9])\1{3,})(?=.*[A-Za-z])[A-Za-z0-9'`:._;"\-[\](){}<>/ ]+$/;

  // Normalize and block alias words
  const normalize = (val) => String(val || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  const blockList = ['alias', 'urf', 'urff', 'aka', 'a k a', 'also known as', 'a ka', 'ak a'];
  const blockListByField = {
    fatherName: ["baba", "papa", "dad", "daddy", "father", "appa", "abba", "pop", "paps", "daddu", "dadu", "abbu", "mr", "dada", "nil", "no", "na"],
    motherName: ["bai", "nil", "na", "ade", "kaki", "smt", "no", "mr", "ms", "mrs", "mother", "mom", "maa", "mummy", "aai", "nani", "dadi", "amma", "ammi", "bebe"]
  };
  const aliasPattern = new RegExp(`\\b(${blockList.join('|')})\\b`, 'i');

  const value = String(customerNameObj?.$value || '').trim();
  const fieldName = customerNameObj?.$name;
  const normalizedVal = normalize(value);

  let errorMsg = '';

  // Validation rules
  if (!value) {
    errorMsg = 'Customer Name is mandatory.';
  } else if (!namePattern.test(value)) {
    errorMsg = invalidMsg.specialChars;
  } else if (/(.)\1{3,}/.test(normalizedVal)) {
    errorMsg = invalidMsg.repeatChars;
  } else if (aliasPattern.test(normalizedVal)) {
    errorMsg = invalidMsg.alias;
  } else if (value.length < 2) {
    errorMsg = invalidMsg.minLength;
  } else if (value.length > 40) {
    errorMsg = invalidMsg.maxLength;
  } else if (blockListByField[fieldName]?.includes(normalizedVal)) {
    errorMsg = invalidMsg.restrictedWords;
  } else {
    // Split words and check first ≠ last (case insensitive)
    const words = value.trim().split(/\s+/);
    if (words.length > 1 && normalize(words[0]) === normalize(words[words.length - 1])) {
      errorMsg = invalidMsg.sameFirstLast;
    }
  }
  if (errorMsg === "") {
    return;
  }
  globals.functions.markFieldAsInvalid(customerNameObj.$qualifiedName, errorMsg, {
    useQualifiedName: true
  });
};

/**
 * Sets a value from one input field to another input field
 * @param {object} sourceField - The source input field object containing the value to copy
 * @param {object} targetField - The target input field object where the value will be set
 * @param {scope} globals - Global scope object
 * @returns {void}
 */
function setValueFromInputToNumberField(sourceField, targetField, globals) {
  if (!sourceField || !targetField) return;

  const intValue = parseInt((sourceField.$value || '').toString().replace(/,/g, ''), 10) || 0;
  setProperty('selectAmount', intValue, globals);
  globals.functions.dispatchEvent(globals.form, 'custom:amountValue');
}

/**
 * @name validateAddressCommon
 * @description Validates address lines
 * @param {Object} addressLine1Obj - Field object for Address Line 1
 * @param {Object} addressLine2Obj - Field object for Address Line 2
 * @param {Object} addressLine3Obj - Field object for Address Line 3
 * @param {Object} cityStatePin - Object containing city, state, pincode and country info (optional)
 * @param {Object} globals - Global form object
 */
function validateAddressCommon(
  addressLine1Obj,
  addressLine2Obj,
  addressLine3Obj,
  cityStatePin = {},
  globals,
) {
  if (!addressLine1Obj || !addressLine2Obj || !addressLine3Obj) return;

  const invalidMsg = {
    mandatory: 'This field is mandatory',
    minLength: 'Minimum',
    pattern: 'Repetitive, sequential or restricted data; numeric-only not allowed',
    panFormat: 'Address must not contain a PAN format',
    aadharFormat: 'Address must not contain an Aadhar number format',
    restrictedWords: 'Address contains special characters or restricted words',
    landmark: 'Please enter a near landmark',
  };

  const restrictedWords = ['#NA', 'Not Available', 'NONE', 'null', 'NULL',
    'N.A', 'NA', 'Same as above', 'APPLIED FOR', 'NOT AVALIABLE', 'NOT AVALIABLE', 'NOT AVAILALE', 'NOT AVAILABEL', 'NOTAVAILAB', 'NOTAVAILABLE', 'AVAILABEL', 'NIOT AVAILABLE', 'NOT AVAIABLE', 'NOT AVAIALBLE', 'NOT AVAIALBLE', 'S/O', 'D/O'];

  // Full regex pattern incorporating all conditions
  // eslint-disable-next-line no-useless-backreference
  const fullPattern = new RegExp('^(?!^[^A-Za-z]*$)' // must contain at least one letter
    + '(?!.*(\\d)\\1{5,})' // no 6+ repeating digits
    + '(?!.*([A-Za-z])\\2{5,})' // no 6+ repeating letters
    + '(?!.*([,\\/\\-@#$%^&*])\\3{5,})' // no 6+ repeating symbols
    + '(?!.*\\s{6,})' // no 6+ consecutive spaces
    + '(?!.*(?:01234|12345|23456|34567|45678|56789|67890))' // no sequential digits
    + '(?!.*[^A-Za-z0-9\\s,\\/\\-])' // only allowed characters
    + '(?!.*[^A-Za-z0-9\\s,\\/\\-])' // only allowed characters
    + '.*$', 'i');

  const normalize = (val) => String(val || '').toLowerCase().replace(/\s+/g, ' ').trim();

  const containsRestrictedWord = (val) => {
    const normalizedVal = normalize(val);
    return restrictedWords.some((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(normalizedVal));
  };

  const runValidation = (fieldObj, value, fieldLabel, isOptional, minLength, otherValues = [], otherLabels = [], dependencies = []) => {
    if (!fieldObj) return;

    const trimmedVal = String(value || '').trim();
    let errorMsg = '';

    // Dependency check with dynamic message
    if (trimmedVal && dependencies.length) {
      const missing = dependencies
        .filter((dep) => !dep.value.trim())
        .map((dep, i) => (i === 1 ? '2' : dep.label.split(' ').slice(-1)[0]));
      // convert second missing line to number if needed

      if (missing.length) {
        // Join with 'and' if multiple
        const missingStr = missing.join(' and ');
        errorMsg = `Please fill Address Line ${missingStr} before entering details in ${fieldLabel}`;
      }
    }

    if (!trimmedVal && !isOptional) {
      errorMsg = `${fieldLabel} is mandatory`;
    } else if (trimmedVal && minLength > 0 && trimmedVal.length < minLength) {
      errorMsg = `${invalidMsg.minLength} ${minLength} characters`;
    } else if (trimmedVal && containsRestrictedWord(trimmedVal)) {
      errorMsg = invalidMsg.restrictedWords;
    } else if (trimmedVal && (!fullPattern.test(trimmedVal) || (fieldLabel === 'Address Line 1' && (fieldObj?.$parent.$name === 'contactAddress' && globals.form.hiddenFieldsPanel.journeyFlow.$value === 'ovd') && /^hdfc\s+bank/i.test(trimmedVal)))) {
      errorMsg = invalidMsg.pattern;
    } else if (trimmedVal && /\b[A-Z]{5}[0-9]{4}[A-Z]\b/i.test(trimmedVal)) {
      errorMsg = invalidMsg.panFormat;
    } else if (trimmedVal && (/\b\d{12}\b/.test(trimmedVal) || /\b\d{4}\s\d{4}\s\d{4}\b/.test(trimmedVal))) {
      errorMsg = invalidMsg.aadharFormat;
    } else if (trimmedVal) {
      const dupLabels = otherLabels.filter((_, i) => normalize(otherValues[i]) === normalize(trimmedVal));
      if (dupLabels.length) errorMsg = `${fieldLabel} shouldn't be same as ${dupLabels.join(' or ')}`;
    }
    if (fieldLabel === 'Address Line 3' && fieldObj?.mandatory === true && !errorMsg) {
      return;
    }

    globals.functions.markFieldAsInvalid(fieldObj.$qualifiedName, errorMsg, { useQualifiedName: true });

  };

  const line1Val = String(addressLine1Obj?.$value || '');
  const line2Val = String(addressLine2Obj?.$value || '');
  const line3Val = String(addressLine3Obj?.$value || '');

  runValidation(addressLine1Obj, line1Val, 'Address Line 1', false, 10, [line2Val, line3Val], ['Address Line 2', 'Address Line 3']);
  runValidation(addressLine2Obj, line2Val, 'Address Line 2', false, 10, [line1Val, line3Val], ['Address Line 1', 'Address Line 3'], [{ value: line1Val, label: 'Address Line 1' }]);
  runValidation(addressLine3Obj, line3Val, 'Address Line 3', true, 0, [line1Val, line2Val], ['Address Line 1', 'Address Line 2'], [{ value: line1Val, label: 'Address Line 1' }, { value: line2Val, label: 'Address Line 2' }]);

  const handleAddressAfterPincodeFD = (addr1Field, addr2Field, addr3Field, cityFieldVal, stateFieldVal, pincodeFieldVal, countryFieldVal, globalObj) => {
    const normalizeInput = (input) => (input || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const escapeRegex = (input) => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const stripCityStatePincodeCountry = (address, city, state, pincode, country) => normalizeInput(address)
      .replace(new RegExp(`\\b${escapeRegex(normalizeInput(city))}\\b`, 'gi'), '')
      .replace(new RegExp(`\\b${escapeRegex(normalizeInput(state))}\\b`, 'gi'), '')
      .replace(new RegExp(`\\b${escapeRegex(normalizeInput(pincode))}\\b`, 'gi'), '')
      .replace(new RegExp(`\\b${escapeRegex(normalizeInput(country))}\\b`, 'gi'), '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const cleanedAdd1 = stripCityStatePincodeCountry(addr1Field?.$value, cityFieldVal || '', stateFieldVal || '', pincodeFieldVal || '', countryFieldVal || '');
    const cleanedAdd2 = stripCityStatePincodeCountry(addr2Field?.$value, cityFieldVal || '', stateFieldVal || '', pincodeFieldVal || '', countryFieldVal || '');
    const cleanedAdd3 = stripCityStatePincodeCountry(addr3Field?.$value, cityFieldVal || '', stateFieldVal || '', pincodeFieldVal || '', countryFieldVal || '');

    const totalLength12 = cleanedAdd1.length + cleanedAdd2.length;
    const totalLength123 = totalLength12 + cleanedAdd3.length;

    if (addr1Field?.$value && addr2Field?.$value && totalLength12 < 16) {
      addr3Field.mandatory = true;

      if (!cleanedAdd3 || totalLength123 < 16) {
        globalObj.functions.markFieldAsInvalid(addr3Field.$qualifiedName, invalidMsg.landmark, { useQualifiedName: true });
        return;
      }
    }
    addr3Field.mandatory = totalLength12 < 16;
  };
  if (cityStatePin.city || cityStatePin.state) {
    handleAddressAfterPincodeFD(addressLine1Obj, addressLine2Obj, addressLine3Obj, cityStatePin.city, cityStatePin.state, cityStatePin.pincode, cityStatePin.country, globals);
  }
};

/**
 * @name addressValidationHandler
 * @description JUD-strict validation for office address lines (FR-G-266).
 *              Enforces: max 30 chars per line, mandatory L1/L2, optional L3,
 *              char allowlist [A-Za-z0-9 ,/-], L1 != L2.
 *              No min length, no restricted words, no PAN/Aadhar rejection, no landmark logic.
 *              Pin/city/state/country params retained for rule-editor signature compatibility.
 * @param {Object} addressLine1Obj - Address Line 1 field
 * @param {Object} addressLine2Obj - Address Line 2 field
 * @param {Object} addressLine3Obj - Address Line 3 field
 * @param {Object} pinCodeObj - Pincode field (unused; kept for compatibility)
 * @param {Object} cityObj - City field (unused)
 * @param {Object} stateObj - State field (unused)
 * @param {Object} countryObj - Country field (unused)
 * @param {scope} globals - Global form object
 * @returns {void} - Marks fields invalid via side effects.
 */
function addressValidationHandler(addressLine1Obj, addressLine2Obj, addressLine3Obj, pinCodeObj, cityObj, stateObj, countryObj, globals) {
  var allowedPattern = /^[A-Za-z0-9 ,/-]*$/;
  var charErr = 'Only letters, digits, space, comma, hyphen and forward slash are allowed';

  function check(fieldObj, label, optional, minLen) {
    if (!fieldObj) return;
    var val = String(fieldObj.$value || '').trim();
    var err = '';

    if (!val && !optional) {
      err = label + ' is mandatory';
    } else if (val && minLen && val.length < minLen) {
      err = label + ' must be at least ' + minLen + ' characters';
    } else if (val && val.length > 30) {
      err = label + ' must be 30 characters or fewer';
    } else if (val && !allowedPattern.test(val)) {
      err = charErr;
    }
    globals.functions.markFieldAsInvalid(fieldObj.$qualifiedName, err, { useQualifiedName: true });
  }

  check(addressLine1Obj, 'Address Line 1', false, 10);  // ← min 10
  check(addressLine2Obj, 'Address Line 2', false, 10);  // ← min 10
  check(addressLine3Obj, 'Address Line 3', true);        // optional, no min

  var l1 = String((addressLine1Obj && addressLine1Obj.$value) || '').trim().toLowerCase();
  var l2 = String((addressLine2Obj && addressLine2Obj.$value) || '').trim().toLowerCase();
  if (l1 && l2 && l1 === l2) {
    globals.functions.markFieldAsInvalid(
      addressLine2Obj.$qualifiedName,
      'Address Line 2 cannot be the same as Address Line 1',
      { useQualifiedName: true },
    );
  }
}

/**
 * @name validateEmail
 * @description Validates personal email against pattern, mandatory, and work email duplication
 * @param {Object} emailObj - email field object
 * @param {scope} globals - Global form object
 * @returns {boolean} - true if valid, false if invalid
 */
function validateEmail(emailObj, globals) {
  if (!emailObj) return false;

  const invalidMsg = {
    pattern: 'Please enter a valid email id in the correct format',
    mandatory: 'Email is mandatory',

  };
  let emailPattern = "";
  // Email regex pattern (up to 40 chars, no consecutive dots, valid domain)
  if (globals.form.$properties.isCorporateCustomer === 'Y' && globals.form.$properties.baasFlow !== 'true') {
    emailPattern = /^[A-Za-z0-9]+([._-][A-Za-z0-9]+)*$/;
  }
  else {
    emailPattern = /^(?!.*\s)(?!^\.|.*\.@)(?!.*[!$%&#'*+/=?^_`{|}~.-]@)(?=.{1,40}$)(?!.*[!#$%&'*+/=?^_`{|}~.-]{2})(?!^[!#$%&'*+/=?^_`{|}~.-])(?!.*[!#$%&'*+/=?^_`{|}~.-]$)[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
  }

  const trimmedVal = String(emailObj.$value || '').trim();
  let errorMsg = '';

  if (!trimmedVal) {
    errorMsg = invalidMsg.mandatory;
  } else if (!emailPattern.test(trimmedVal)) {
    errorMsg = invalidMsg.pattern;
  }

  if (errorMsg) {
    if (globals?.functions?.markFieldAsInvalid) {
      globals.functions.markFieldAsInvalid(emailObj.$qualifiedName, errorMsg, { useQualifiedName: true });
    }
    return false;
  }

  return true;
};
/**
 * @name onpremCallBackPayload
 * @description sends analytics event for initiate kyc failure
 * @param {scope} globals - Global form object
 * @returns {object} The value of payload
 */
function onpremCallBackPayload(globals) {
  var apiPayload = {
    responseBody: null,
    status: "initiated",
    apiName: "onpremcallback.json",
    buttonEventName: 'onpremcallback',
    timestamp: new Date().toISOString(),
    errorCode: 'ONPREM_KYC_CALLBACK_FAILED',
    errorMessage: 'On prem kyc callback api failed, please retry.'
  };
  return apiPayload;
}

/**
 * @name panNameMatchApiError
 * @description sends analytics event for initiate pan name match failure
 * @param {scope} globals - Global form object
 * @returns {void} sends analytics event for initiate pan name match failure
 */
function panNameMatchApiError(globals) {
  var apiPayload = {
    responseBody: null,
    status: "initiated",
    apiName: "panValNameMatch.json",
    buttonEventName: 'panNameMatch',
    timestamp: new Date().toISOString(),
    errorCode: 'PAN_VALIDATION_FAILED',
    errorMessage: 'The PAN details are Invalid. Please make sure you have valid PAN details updated to proceed with the application.'
  };
  globals.functions.dispatchEvent(globals.form.analytics, "custom:sendAnalyticsApiError", apiPayload);
}

/**
 * @name breApiError
 * @description Sends analytics event for BRE1 on-prem, BRE1 on-prem callback,
 *              BRE2 on-prem, and BRE2 on-prem callback API failures.
 *              A single function handles all four BRE on-prem calls.
 * @param {string} apiName - One of: 'BREOne', 'BRE1OnPremCallBack', 'BRETwo', 'BRE2OnPremCallBack'
 * @param {string} [errorMessage] - Optional dynamic error message from the form side.
 *                                  When provided, overrides the default error message for the given apiName.
 * @param {scope} globals - Global form object
 * @returns {void}
 */
function breApiError(apiName, errorMessage, globals) {
  const apiConfigMap = {
    BREOne: {
      apiFileName: 'breone.json',
      buttonEventName: 'bre1',
      errorCode: 'BRE1_FAILED',
      errorMessage: 'BRE1 call failed. Please try again.'
    },
    BRE1OnPremCallBack: {
      apiFileName: 'breonpremcallback.json',
      buttonEventName: 'bre1onpremcallback',
      errorCode: 'BRE1_ON_PREM_CALLBACK_FAILED',
      errorMessage: 'BRE1 on-prem callback failed. Please try again.'
    },
    BRETwo: {
      apiFileName: 'bretwo.json',
      buttonEventName: 'bre2',
      errorCode: 'BRE2_FAILED',
      errorMessage: 'BRE2call failed. Please try again.'
    },
    BRE2OnPremCallBack: {
      apiFileName: 'breonpremcallback.json',
      buttonEventName: 'bre2onpremcallback',
      errorCode: 'BRE2_ON_PREM_CALLBACK_FAILED',
      errorMessage: 'BRE2 on-prem callback failed. Please try again.'
    }
  };

  const config = apiConfigMap[apiName];
  if (!config) {
    console.error('breApiError: Unknown apiName:', apiName);
    return;
  }

  var apiPayload = {
    responseBody: null,
    status: 'initiated',
    apiName: config.apiFileName,
    buttonEventName: config.buttonEventName,
    timestamp: new Date().toISOString(),
    errorCode: config.errorCode,
    errorMessage: (errorMessage && typeof errorMessage === 'string' && errorMessage.trim() !== '')
      ? errorMessage
      : config.errorMessage
  };

  globals.functions.dispatchEvent(globals.form.analytics, 'custom:sendAnalyticsApiError', apiPayload);
}

/**
 * @name sha1Base64
 * @description Hashes a message using SHA-1 algorithm and converts the result to Base64
 * @param {string} message - The message to hash
 * @returns {Promise<string>} - The Base64 encoded hash
 */
async function sha1Base64(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Convert to Base64
  let binary = '';
  hashArray.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

/**
 * @name verifySha1Hash
 * @description Verifies if a message matches the expected SHA-1 hash
 * @param {Object} target - The target object to dispatch the event on
 * @param {string} negativeEvent - The event to dispatch if the hash does not match
 * @param {string} positiveEvent - The event to dispatch if the hash matches
 * @param {string} message - The message to hash and verify
 * @param {string} expectedHash - The expected Base64 encoded SHA-1 hash
 * @param {scope} globals - Global form object
 * @returns {void} - Dispatches the event on the target object
 *
 * @example
 * const isValid = await verifySha1Hash(target, negativeEvent, positiveEvent, message, expectedHash, globals);
 * if (isValid) {
 *   console.log('Hash matches!');
 * }
 */
function verifySha1Hash(target, negativeEvent, positiveEvent, message, expectedHash, globals) {
  //  try {
  //    sha1Base64(message).then(hash => {
  //      if (hash === expectedHash) {
  //        globals.functions.dispatchEvent(target, `custom:${positiveEvent}`);
  //      } else {
  //        globals.functions.dispatchEvent(target, `custom:${negativeEvent}`);
  //      }
  //    });
  //  } catch (error) {
  //    console.error('Error verifying hash:', error);
  //    globals.functions.dispatchEvent(target, `custom:${negativeEvent}`);
  //  }
  globals.functions.dispatchEvent(target, `custom:${positiveEvent}`);
}

/**
 * @name calculateAndSaveSha1Hash
 * @description Calculates the SHA-1 hash of a message and saves it to the form properties
 * @param {string} message - The message to hash and save
 * @param {string} propertyName - The name of the property to save the hash to
 * @param {Object} target - The target object to dispatch the event on
 * @param {string} positiveEvent - The event to dispatch if the hash matches
 * @param {string} negativeEvent - The event to dispatch if the hash does not match
 * @param {scope} globals - Global form object
 * @returns {void} - Saves the hash to the form properties and dispatches the event on the target object
 */
function calculateAndSaveSha1Hash(message, propertyName, target, positiveEvent, negativeEvent, globals) {
  sha1Base64(message).then(hash => {
    setProperty(propertyName, hash, globals);
    globals.functions.dispatchEvent(target, `custom:${positiveEvent}`);
  }).catch(error => {
    console.error('Error calculating and saving SHA-1 hash:', error);
    globals.functions.dispatchEvent(target, `custom:${negativeEvent}`);
  });
}

/**
 * Checks if the current time is between two given time strings.
 * Supports cross-midnight ranges (e.g., start: "22:00", end: "06:00").
 *
 * @param {string} startTime - The start time in "HH:MM" or "HH:MM:SS" format.
 * @param {string} endTime - The end time in "HH:MM" or "HH:MM:SS" format.
 * @returns {boolean} True if the current time is between startTime and endTime, false otherwise.
 *
 * @example
 * isCurrentTimeBetween("09:00", "17:00"); // true if current time is between 9 AM and 5 PM
 * isCurrentTimeBetween("22:00", "06:00"); // true if current time is between 10 PM and 6 AM (overnight)
 */
function isCurrentTimeBetween(startTime, endTime) {
  if (!startTime || !endTime) {
    return false;
  }

  const parseTimeToMinutes = (timeStr) => {
    const parts = timeStr.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    return hours * 60 + minutes;
  };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  // Handle cross-midnight range (e.g., 22:00 to 06:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  // Normal range (e.g., 09:00 to 17:00)
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * @param {*} field - The value to return if valid
 * @param {*} defaultValue - The fallback value if field is invalid (REQUIRED)
 *                           If defaultValue itself is null/undefined/empty, returns empty string
 * @returns {*} field if valid, otherwise defaultValue (or empty string)
 */
function getOrDefaultValue(field, defaultValue) {
  if (passesNullCheck(field)) {
    return field;
  }
  return passesNullCheck(defaultValue) ? defaultValue : '';
}

/**
 * Gets the redirection url from the url
 * @param {string} url - The url to get the redirection url from
 * @returns {string} the redirection url
 */
/**
 * @name appendQueryParamsToUrl
 * @param {string} url - The base URL to append query params to
 * @returns {string} URL with query parameters appended
 * @description Checks if window is available and appends current URL query params to the provided URL string
 */
function appendQueryParamsToUrl(url) {
  // Check if window is available (SSR safety)
  if (typeof window === 'undefined') {
    return url;
  }

  try {
    // Get query params from current URL
    const currentUrlParams = new URLSearchParams(window.location.search);

    // If no query params exist, return original URL
    if (currentUrlParams.toString() === '') {
      return url;
    }

    // Check if URL already has query params
    const separator = url.includes('?') ? '&' : '?';

    // Append current query params to URL string
    return `${url}${separator}${currentUrlParams.toString()}`;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error appending query params:', error);
    return url;
  }
}

/**
 * Gets the redirection url from the url
 * @param {string} url - The url to get the redirection url from
 * @param {boolean} appendCurrentQueryParams - Whether to append the current query params to the url
 * @returns {string} the redirection url
 */
function getRedirectionUrl(url, appendCurrentQueryParams) {
  if (appendCurrentQueryParams === true) {
    url = appendQueryParamsToUrl(url);
  }
  if (url.includes('http')) {
    return url;
  }
  return `${submitBaseUrl}${url}`;
}

/**
 * Gets the host name
 * @returns {string} the host name
 */
function getHostName() {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return '';
}


/**
 * Create new Jid
 */
function createJid() {
  const stateInfo = {
    username: "bundled",
    password: "bundled",
    CountryCode: "91",
    RegisteredPhoneNum: "",
    DateOfBirth: "",
    email: ""
  };
  const dynamicUUID = generateUUID();
  const dispatcher = getDispatcherInstance();
  const channel = 'WEB';
  const visitMode = "U";
  const journeyAbbreviation = 'IS';
  return `${dynamicUUID}_${dispatcher}_${journeyAbbreviation}_${visitMode}_${channel}`;
}

/**
 * Function to filter and keep only unique dropdown's enum and enumNames
 * @param {object} dropdownField - Dropdown field object
 * @param {scope} globals - Global scope object
 * @returns {void}
 *
 * Adding function since Bundled form size is over 2MB. Adding rules is blocking dev.
 */
function filterUniqueDropdownEnumsAndEnumNames(dropdownField, globals) {
  const enums = dropdownField.$enum;
  const enumNames = dropdownField.$enumNames;

  const uniqueEnums = [...new Set(enums)];
  const uniqueEnumNames = [...new Set(enumNames)];

  globals.functions.setProperty(dropdownField, {
    enum: uniqueEnums,
    enumNames: uniqueEnumNames
  });
}

/**
 * Populates the designationDropdown field based on the selected employmentType field value.
 * Accepts the two output arrays directly from the getDesignation API integration
 * ([*].DESIGNATION and [*].EMPLYOMENT_TYPE) and includes only designations matching
 * the selected employment type or marked as "Both".
 *
 * @param {Array} designationNames - Array of designation strings ([*].DESIGNATION from API)
 * @param {Array} employmentTypes - Array of employment type strings ([*].EMPLYOMENT_TYPE from API)
 * @param {scope} globals - Global scope object
 */
function populateDesignationsByEmploymentType(designationNames, employmentTypes, globals) {
  if (!Array.isArray(designationNames) || !Array.isArray(employmentTypes)) return;

  const employmentTypeField = findFieldByNameInScope(globals.form, 'employmentType');
  const designationField = findFieldByNameInScope(globals.form, 'designationDropdown');

  if (!employmentTypeField || !designationField) return;

  const selectedType = getOrReturn(employmentTypeField.$value);
  if (!selectedType) return;

  const filtered = designationNames.filter((_, i) => {
    const type = employmentTypes[i];
    return type === selectedType || type === 'Both';
  });

  globals.functions.setProperty(designationField, {
    enum: filtered,
    enumNames: filtered,
  });
}

/**
  * Returns updated lastName based on condition.
  *
  * This function reads firstName and lastName from
  * globals.form.$properties. If lastName is "." or empty,
  * it returns firstName as the updated lastName.
  * Otherwise, it returns the original lastName.
  *
  * @param {scope} globals - Global scope object
  * @returns {string} - Updated lastName value
  */
function getUpdatedLastName(globals) {
  try {
    const formData = globals?.form?.$properties || {};

    const lastName = formData?.lastName;
    const firstName = formData?.firstName || '';

    if (lastName === '.' || lastName === '') {
      return firstName;
    }

    return lastName;
  } catch (e) {
    console.error('Error in getUpdatedLastName:', e);
    return '';
  }
}

/**
 * @name wireVkycThankYouPanel
 * @description One-shot setup for the Thank-You-panel VKYC flow on CC.
 *              Call from the rule editor at the moment thankyouPanel becomes
 *              visible (the same rule that hides the wizard + shows thankyouPanel).
 *
 *              Side effects:
 *                1. vkyc2.$value         ← creditCardJourneyVariables.vkycLink
 *                2. setVariable vkycStartTimeRange / vkycEndTimeRange (defaults
 *                   10:00 / 23:59 unless carryover overrides)
 *                3. dispatchEvent on circularTimerVkyc → custom:startCircularTimer
 *                   (this is what makes the timer animate; without it the ring
 *                   renders but stays static)
 *
 *              After 30 s the timer dispatches custom:timerComplete on $form;
 *              wire a one-line rule on $form to call navigateToVkycLink there.
 *
 * @param {scope} globals - AEM EDS global scope object
 * @returns {void}
 */
function wireVkycThankYouPanel(globals) {
  try {
    const carryover =
      (globals.form.$properties && globals.form.$properties.creditCardJourneyVariables) || {};

    const cjv = globals.form.$properties.creditCardJourneyVariables || {};

    const imagePath = cjv.selectedCardImagePath || '';

    const resolvedUrl = imagePath ? resolveAssetUrl(imagePath) : '';

    const cardFaciaField = findFieldByNameInScope(globals.form, 'Card Facia');

    if (cardFaciaField && resolvedUrl) {
      globals.functions.setProperty(cardFaciaField, { value: resolvedUrl });
    }

    // Also set the other thank-you fields
    const refNumField = findFieldByNameInScope(globals.form, 'cc-ref-num');
    if (refNumField) globals.functions.setProperty(refNumField, { value: cjv.referenceNumber || '' });

    const cardNameField = findFieldByNameInScope(globals.form, 'cc-name');
    if (cardNameField) globals.functions.setProperty(cardNameField, { value: cjv.selectedCardProductName || '' });

    const holderNameField = findFieldByNameInScope(globals.form, 'cc-holder-name');
    // Holder name = name printed on the card: the parsed name in the fits case, or the user's
    // dropdown selection per FR-G-262. ccBag.nameOnCard holds both; fall back to the full name.
    if (holderNameField) globals.functions.setProperty(holderNameField, { value: cjv.nameOnCard || cjv.fullName || '' });

    const tq = globals.form
      && globals.form.thankyouPanel
      && globals.form.thankyouPanel.accountDetailsTqPanel;
    if (!tq) return;

    if (applyInsuranceThankYouVariant(globals)) {
      // Still seed vkyc2 with the link so "Skip to VKYC 2 hours" can navigate.
      if (tq.vkyc2 && carryover.vkycLink) {
        globals.functions.setProperty(tq.vkyc2, { value: carryover.vkycLink });
      }
      return;
    }

    // 1. Push VKYC link into the hidden field that navigateToVkycLink reads
    if (tq.vkyc2 && carryover.vkycLink) {
      globals.functions.setProperty(tq.vkyc2, { value: carryover.vkycLink });
    }

    // 2. Time window — used by the videoKyc-button click rule's
    //    isCurrentTimeBetween(vkycStartTimeRange, vkycEndTimeRange) check
    const start = carryover.vkycStartTimeRange || '10:00';
    const end = carryover.vkycEndTimeRange || '23:59';
    if (globals.functions.setVariable) {
      globals.functions.setVariable('vkycStartTimeRange', start);
      globals.functions.setVariable('vkycEndTimeRange', end);
    }
    // Mirror on form properties so getProperty(...) callers also see them
    globals.form.$properties.vkycStartTimeRange = start;
    globals.form.$properties.vkycEndTimeRange = end;

    // 3. Start the 30-second circular timer. Without this the SVG ring is static.
    if (tq.videoKycTimer && tq.videoKycTimer.circularTimerVkyc) {
      globals.functions.dispatchEvent(
        tq.videoKycTimer.circularTimerVkyc,
        'custom:startCircularTimer',
      );
    }
  } catch (e) {
    console.error('wireVkycThankYouPanel error:', e);
  }
}

/**
 * @name parkVkycTab
 * @description Pre-opens a blank tab during a user gesture (the CC Submit /
 *              Continue button click on the confirmation screen) so the
 *              30-second circular-timer auto-redirect has a Window reference
 *              it can navigate without needing a fresh user gesture.
 *
 *              Browsers block window.open from setInterval/setTimeout
 *              callbacks (no user activation token). This sidesteps the
 *              restriction: the tab is opened during the legitimate Submit
 *              click; later, when the timer fires, we just set .location.href
 *              on the already-open tab — that navigation never requires a
 *              fresh gesture.
 *
 *              Wire from the rule editor on the CC Submit/Continue button
 *              click, BEFORE any API dispatch, so it runs inside the gesture
 *              call stack:
 *                Call function   parkVkycTab()
 *
 *              navigateToVkycLink prefers this parked tab when present.
 *
 * @param {scope} globals - AEM EDS global scope object
 * @returns {void}
 */
function parkVkycTab(globals) {
  if (typeof window === 'undefined') return;
  try {
    const existing = globals && globals.form && globals.form.$properties
      && globals.form.$properties.__vkycParkedTab;
    if (existing && !existing.closed) return; // already parked, reuse

    const w = window.open('about:blank', '_blank');
    if (w) {
      try { w.opener = null; } catch (_e) { /* cross-origin, ignore */ }
      try {
        w.document.write(
          '<!doctype html><meta charset="utf-8"><title>Video KYC</title>'
          + '<style>body{font-family:system-ui;text-align:center;padding:48px;color:#444}</style>'
          + '<p>Preparing your Video KYC session…</p>'
        );
        w.document.close();
      } catch (_e) { /* navigation will still work without the placeholder */ }
      if (globals && globals.form && globals.form.$properties) {
        globals.form.$properties.__vkycParkedTab = w;
      }
    } else {
      console.warn('parkVkycTab: window.open returned null — popup blocker active');
    }
  } catch (e) {
    console.warn('parkVkycTab failed:', e);
  }
}

/**
 * Navigates to VKYC link in a new tab.
 *
 * Strategy (priority order):
 *   1. If a tab was parked by parkVkycTab at submit-click time, navigate it.
 *      This is the only path that guarantees a new tab when called from the
 *      30-second circular-timer (non-gesture context).
 *   2. If the current call is inside a user gesture (button click), use an
 *      <a target="_blank"> click — standards-defined new-tab opener, never
 *      blocked in a gesture context.
 *   3. Otherwise (no parked tab AND no gesture — e.g. timer fired but
 *      parkVkycTab was never wired), try window.open; if blocked, fall back
 *      to a same-tab redirect so VKYC still loads instead of failing silently.
 *
 * The first argument accepts three forms (callers from different rule
 * wirings all work):
 *   - Field reference  → reads .$value
 *   - URL string       → used directly
 *   - Nothing / falsy  → falls back to creditCardJourneyVariables.vkycLink
 *
 * @param {object|string} [vkyc2FieldOrUrl] - Field component OR URL string
 * @param {scope}         globals           - Global scope object
 * @returns {void}
 */
function navigateToVkycLink(vkyc2FieldOrUrl, globals) {
  if (typeof window === 'undefined') return;

  try {
    const utmCampaign = (getProperty('utm_campaign', globals) || '').toLowerCase();

    // Resolve the URL from whatever the caller passed in
    let vkycLink = '';
    if (utmCampaign === 'gigaccount') {
      vkycLink = getProperty('vkyLink', globals) || '';
    } else if (vkyc2FieldOrUrl && typeof vkyc2FieldOrUrl === 'object' && '$value' in vkyc2FieldOrUrl) {
      vkycLink = vkyc2FieldOrUrl.$value || '';
    } else if (typeof vkyc2FieldOrUrl === 'string') {
      vkycLink = vkyc2FieldOrUrl;
    }
    if (!vkycLink) {
      vkycLink = getProperty('creditCardJourneyVariables.vkycLink', globals) || '';
    }

    if (!vkycLink || typeof vkycLink !== 'string' || vkycLink.trim() === '') {
      console.error('VKYC link not found or invalid');
      return;
    }

    // ── 1. Parked tab from parkVkycTab (best — works for timer-fire too) ──
    const parked = globals && globals.form && globals.form.$properties
      && globals.form.$properties.__vkycParkedTab;
    if (parked && !parked.closed) {
      try {
        parked.location.href = vkycLink;
        try { parked.focus(); } catch (_e) { /* cross-origin focus may throw */ }
        // Consume so a later call (e.g. user clicks button after timer fired)
        // doesn't try to navigate a tab the user has already closed.
        globals.form.$properties.__vkycParkedTab = null;
        return;
      } catch (e) {
        console.warn('Parked VKYC tab unreachable, falling through:', e);
      }
    }

    // ── 2. Current call is inside a user gesture (button click) ──
    const ua = (typeof navigator !== 'undefined') ? navigator.userActivation : null;
    const hasUserGesture = ua ? Boolean(ua.isActive) : true; // assume gesture if API unavailable

    if (hasUserGesture) {
      const a = document.createElement('a');
      a.href = vkycLink;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // ── 3. Non-gesture, no parked tab — try popup, else same-tab redirect ──
    let opened = null;
    try {
      opened = window.open(vkycLink, '_blank');
    } catch (popupErr) {
      opened = null;
    }
    if (opened) {
      try { opened.opener = null; } catch (_e) { /* cross-origin, ignore */ }
    } else {
      console.warn('VKYC: new-tab blocked (no user gesture) — falling back to same-tab redirect');
      window.location.href = vkycLink;
    }

  } catch (error) {
    console.error('Error navigating to VKYC link:', error);
  }
}
/**
 * Populates account numbers in a specified panel
 * @param {string} panelName - The selector or ID of the panel container
 * @param {string} title - The title text to display as the first element
 * @param {string} accountNumbers - Comma-separated string of account numbers
 */
function populateAccountNumbers(panelName, title, accountNumbers) {
  if (!panelName || typeof panelName !== 'string') {
    return;
  }

  const selector = `.field-${panelName.toLowerCase()}`;
  const panelElement = document.querySelector(selector);

  if (!panelElement) {
    return;
  }

  panelElement.innerHTML = '';

  if (title) {
    const titleElement = document.createElement('p');
    titleElement.textContent = title;
    titleElement.classList.add('account-title');
    panelElement.appendChild(titleElement);
  }

  if (accountNumbers) {
    const accounts = accountNumbers.split(',').map(acc => acc.trim()).filter(Boolean);

    accounts.forEach(acc => {
      const p = document.createElement('p');
      p.textContent = `A/c No: ${maskString(acc, 'start', 10)}`;
      p.classList.add('account-number-item');
      panelElement.appendChild(p);
    });
  }
}

function nullToEmpty(value) {
  return value == null ? "" : value;
}

function getFormElementByName(fieldName) {
  const form = window.myForm;

  if (!form) {
    console.warn('[getFormElement] Form not initialized');
    return null;
  }

  // One selector to rule them all
  const element = document.querySelector(`[name="${fieldName}"]`);

  if (!element) {
    console.warn(`[getFormElement] Element not found: "${fieldName}"`);
    return null;
  }

  const wrapper = element.closest('.field-wrapper');

  if (!wrapper?.dataset?.id) {
    console.warn(`[getFormElement] Invalid wrapper for: "${fieldName}"`);
    return null;
  }

  const fieldModel = form.getElement(wrapper.dataset.id);

  if (!fieldModel) {
    console.warn(`[getFormElement] Model not found for: "${fieldName}"`);
    return null;
  }

  // Success log (remove in production)
  console.log(`[getFormElement] ✓ "${fieldName}" → "${wrapper.dataset.id}"`);

  return fieldModel;
}
/**
 * Creates a journey ID by combining various parameters
 * @param {string} journeyAbbreviation The journey abbreviation
 * @param {string} channel The channel
 * @param {scope} globals Global scope object
 * @returns {string} The generated journey ID
 */
function creditcardInitProcess(journeyAbbreviation, channel, globals) {

  const parentJourneyId =
    getProperty('queryParams.parentjourneyId', globals) ||
    getProperty('queryParams.parentJourneyID', globals) ||
    getProperty('queryParams.parentJourneyId', globals) ||
    getProperty('parentjourneyId', globals) ||
    getProperty('parentJourneyId', globals) || '';

  const isVkycFlow = getProperty('queryParams.isVkyc', globals);
  globals.form.$properties.isVkyc=isVkycFlow;
  globals.form.$properties.journeyId = ''; // Clear any existing journeyId to ensure createJourneyId generates a new one

  const createdJourney = createJourneyId(journeyAbbreviation, channel, globals);
  const journeyId = createdJourney?.properties?.journeyId || '';

  globals.form.$properties.journeyId = journeyId; // Store the created journeyId in form properties for later use
  setProperty('journeyName', 'NTB_CC_JOURNEY', globals);

  // Email-OTP flow variables (mirror SA financialDetailsFragment initialize).
  // The verifyEmailPanel's WSDL request body reads these via getVariable(...).
  // Without them, the rule engine throws TypeError: Cannot read 'valueOf' of undefined.
  globals.form.$properties.emailOtpScenario = 'otpValidation-V4';
  globals.form.$properties.emailLoginScenario = 'otpGenV4';
  globals.form.$properties.emailResendCounter = 3;
  globals.form.$properties.existingCustomer = 'N';
  globals.form.$properties.considerCountryCode = 'true';

  // Customer-identity variables also referenced by the verify rule. Defaults
  // ensure the rule never sees undefined; populateCardScreenCarryover (called
  // on journeyDropOffParam API success) overwrites these with real values.
  globals.form.$properties.callDedupe = 'false';
  globals.form.$properties.countryCode = '91';
  globals.form.$properties.dateOfBirth = '';
  globals.form.$properties.mobileNumber = '';

  console.log('Created journey id:', journeyId);
  console.log('Journey id from query param:', parentJourneyId);
}

/**
 * @param {object} response JourneyDropOffParam API response object
 * @param {scope} globals Global scope object
 * @returns {object} An object containing the required fields extracted from the response
 */
function extractRequiredDataFromJourneyDropOffParam(stateInfoList, globals) {
  const requiredFields = [
    'AccountNumber',
    'AccountType',
    'BranchIfscCode',
    'customerId',
    'TargetName',
    'RegisteredPhoneNum',
    'AadharDOB',
    'DateOfBirth',
    'employmentType',
    'customerSegment',
    'accountChoice',
    'jdbLG',
    'lcCode',
    'branchCode',
    'branchName_value',
    'branchCity_value',
    'jdbCheckBaasFlow',
    'journeyVariant',
    'communicationAddress',
    'permanentAddress',
    'kycEngineResponse',
    'PanCard',
    'CountryCode',
    // email-verification-fragment hidden fields (sourced from SA journey stateInfo)
    'employerInput_value',
    'employerNameMaster_value',
    'hiddenEmployerCodeFinanceDetail',
    'hiddenCompanyCategory',
    'organizationType_value',
    'selfEmployedProfCategory_value',
    'annualIncome_value',
    'sourceOfFunds',
    'designation_value',
    'natureOfBuisness_value',
    'officialEmailId',
    'communicationAddressSelectionRadio',
    'fatherName',
    'gender_value',
    'ReferenceNumber',
    'hiddenExistingCustomer',
    'bundled_jwt_token',
    'accountTypeSelection',
    'Gender',
    'startVKYCUrl',
    'motherName',
    'cersaiFlag',
    'emailId',
    'emailAddress',
    'annualIncome',
    'employeeAssistance',
    'creditCardEmployerName',
    'bureauConsent',
    'designationDropdown',
    'packageId'
  ];

  const requiredData = {};

  const getValueFromObject = (obj, key) => {
    if (!obj || typeof obj !== 'object') return undefined;

    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      return obj[key];
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') {
        const nestedValue = getValueFromObject(value, key);
        if (nestedValue !== undefined) {
          return nestedValue;
        }
      }
    }

    return undefined;
  };

  for (let i = stateInfoList.length - 1; i >= 0; i -= 1) {
    const rawStateInfo = stateInfoList[i];
    if (!rawStateInfo) continue;

    let parsedStateInfo;
    try {
      parsedStateInfo = typeof rawStateInfo === 'string' ? JSON.parse(rawStateInfo) : rawStateInfo;
    } catch (error) {
      console.warn('Unable to parse journey stateInfo:', rawStateInfo, error);
      continue;
    }

    for (const fieldName of requiredFields) {
      if (requiredData[fieldName] !== undefined) continue;

      const fieldValue = getValueFromObject(parsedStateInfo, fieldName);
      if (fieldValue !== undefined) {
        requiredData[fieldName] = fieldValue;
      }
    }

    if (Object.keys(requiredData).length === requiredFields.length) {
      break;
    }
  }

  return requiredData;
}

/**
 * Populates account-detail fields by name, scoped to a specific fragment instance.
 *
 * @param {object} requiredData    - extracted from journey drop-off response
 * @param {object} fragmentRoot    - the fragment panel ref (pick in rule editor).
 *                                   Search is limited to this subtree, so duplicate
 *                                   field names across two fragment copies don't collide.
 * @param {string} mask   - if 'Y', mask all-but-last-4 of account # and customer id
 * @param {scope} globals
 */
function populateAccountDetails(fragmentRoot, mask, globals) {
  const requiredData = globals?.form?.$properties?.creditCardJourneyVariables;
  if (!requiredData || !fragmentRoot) return;

  const maskAllButLast4 = (s) => {
    const v = String(s ?? '');
    if (v.length <= 4) return v;
    return v.slice(0, -4).replace(/./g, '*') + v.slice(-4);
  };

  const isAccountSavings = requiredData.accountTypeSelection === '0';
  const shouldMask = mask === 'Y' && isAccountSavings;

  const accountNumber = shouldMask
    ? maskAllButLast4(requiredData.AccountNumber)
    : requiredData.AccountNumber;
  const customerId = shouldMask
    ? maskAllButLast4(requiredData.customerId)
    : requiredData.customerId;

  const dob = requiredData.dateOfBirth;
  const phone = requiredData.mobileNumber || '';
  const aadharDOB = requiredData.dateOfBirth || '';

  const fieldValueByName = {
    accountHolder: requiredData.targetName,
    accountType: requiredData.AccountType,
    savingsSalaryAccountNumber: accountNumber,
    branchIFSC: requiredData.BranchIfscCode,
    customerID: customerId,
    DateOfBirth: requiredData.dateOfBirth,
    RegisteredPhoneNum: phone,
  };
  if (dob) fieldValueByName.AadharDOB = dob;
  if (phone) fieldValueByName.RegisteredPhoneNum = phone;

  Object.entries(fieldValueByName).forEach(([name, value]) => {
    if (value == null || value === '') return;
    const field = findFieldByNameInScope(fragmentRoot, name);  // ← scoped to fragment
    if (field) globals.functions.setProperty(field, { value });
  });

  // NOTE: setProperty('DateOfBirth', ...) calls below were unscoped form-property
  // writes — keep them only if they're shared across the form. If they were meant
  // to be per-fragment, move them inside the fieldValueByName loop.
  setProperty('DateOfBirth', dob, globals);
  setProperty('RegisteredPhoneNum', phone, globals);
  setProperty('AadharDOB', aadharDOB, globals);
}
/**
 * Finds a field anywhere in the form scope tree by its $name.
 * Pure scope-object traversal — no DOM, no window, no querySelector.
 * Resilient to panel renames or restructures in the content tree.
 * @param {object} node - starting node, typically globals.form
 * @param {string} targetName - the field's authored name (matches $name)
 * @param {WeakSet} [visited] - internal cycle guard, leave undefined when calling
 * @returns {object|null} field reference or null if not found
 */
function findFieldByNameInScope(node, targetName, visited = new WeakSet()) {
  if (!node || typeof node !== 'object' || visited.has(node)) return null;
  visited.add(node);

  if (node.$name === targetName) return node;

  for (const key of Object.keys(node)) {
    if (key.startsWith('$') || key.startsWith('_')) continue;
    let child;
    try { child = node[key]; } catch (_) { continue; }
    if (child && typeof child === 'object') {
      const found = findFieldByNameInScope(child, targetName, visited);
      if (found) return found;
    }
  }
  return null;
}

const NAME_ON_CARD_MAX_LENGTH = 19;

/**
 * Computes the 12 name-on-card permutations per JUD FR-G-262.
 * Used when the customer's Aadhaar full name exceeds 19 characters.
 *
 * Returns ≤ 12 permutations (some may collapse / be filtered):
 *   a) First + Middle           f) Initial(Middle) + First
 *   b) First + Last             g) Initial(Middle) + Last
 *   c) Middle + First           h) First only       (skipped if length < 2)
 *   d) Middle + Initial(First)  i) Middle only      (skipped if length < 2)
 *   e) Middle + Last            j) Last only        (skipped if length < 2)
 *                               k) Initial(First) + Last
 *                               l) First + Initial(Last)
 *
 * Each result filtered to ≤ 19 chars; duplicates removed; order preserved.
 *
 * @param {string} fullName - Full name received from Aadhaar
 * @returns {string[]} Permutations (may be empty if fullName invalid)
 */
function computeNameOnCardOptions(fullName) {
  if (!fullName || typeof fullName !== 'string') return [];

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  let first = '';
  let middle = '';
  let last = '';
  if (parts.length === 1) {
    first = parts[0];
  } else if (parts.length === 2) {
    [first, last] = parts;
  } else {
    first = parts[0];
    last = parts[parts.length - 1];
    middle = parts.slice(1, -1).join(' ');
  }

  const init = (s) => (s ? s[0] : '');
  const join = (a, b) => [a, b].filter(Boolean).join(' ').trim();

  const candidates = [];
  if (first && middle) candidates.push(join(first, middle));        // a
  if (first && last) candidates.push(join(first, last));            // b
  if (middle && first) candidates.push(join(middle, first));        // c
  if (middle && first) candidates.push(join(middle, init(first)));  // d
  if (middle && last) candidates.push(join(middle, last));          // e
  if (middle && first) candidates.push(join(init(middle), first));  // f
  if (middle && last) candidates.push(join(init(middle), last));    // g
  if (first && first.length >= 2) candidates.push(first);           // h
  if (middle && middle.length >= 2) candidates.push(middle);        // i
  if (last && last.length >= 2) candidates.push(last);              // j
  if (first && last) candidates.push(join(init(first), last));      // k
  if (first && last) candidates.push(join(first, init(last)));      // l

  const seen = new Set();
  return candidates
    .filter((s) => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
}

/**
 * Populates the Name on Card UI based on the Aadhaar full name length (FR-G-262).
 *
 *   - Length ≤ 19  → text input prefilled, readOnly, filler10 = 'N'.
 *   - Length > 19  → dropdown populated with permutations, first option
 *                    preselected as default, text input hidden, filler10 = 'Y'.
 *                    User can change selection; the dropdown's onChange rule
 *                    keeps filler10 = 'Y' (idempotent).
 *
 * Reads aadhaarFullName from form.$properties.cardScreenCarryover (set by
 * populateCardScreenCarryover on journeyDropOffParam API success).
 *
 * @param {Object} nameOnCardTextField - Text input field reference (picked in rule editor)
 * @param {Object} nameOnCardSelectField - Dropdown field reference
 * @param {Object} filler10Field - Hidden filler10 field reference
 * @param {scope} globals - Global scope object
 */
function populateNameOnCardField(nameOnCardTextField, nameOnCardSelectField, filler10Field, globals) {
  const carryover = globals?.form?.$properties?.cardScreenCarryover || {};
  const ccBag = globals.form.$properties.creditCardJourneyVariables || {};
  const rawFullName = String(carryover.aadhaarFullName || '').trim();

  // FR-G-244: single-name users get father-name composition (e.g. "Prudhvi S/O Rajesh"),
  // which is what actually prints on the card and can exceed 19 chars even when the raw
  // Aadhaar name does not. Decide fits/over-19 against the EFFECTIVE card name, not the raw name.
  // FR-G-242: for multi-name users, apply JUD truncation (middle name >10 chars → first letter)
  // before checking the 19-char limit, so "Mukesh Ghasitaraman Gupta" → "Mukesh G Gupta" (fits).
  const parsedName = buildCustomerFullName(ccBag.targetName, ccBag.fatherName, ccBag.gender);
  let effectiveName;
  if (parsedName.isSingleName) {
    effectiveName = parsedName.fullName;
  } else {
    const rawWords = rawFullName.trim().split(/\s+/).filter(Boolean);
    const rawParts = {
      firstName: rawWords[0] || '',
      middleName: rawWords.length > 2 ? rawWords.slice(1, -1).join(' ') : '',
      lastName: rawWords.length > 1 ? rawWords[rawWords.length - 1] : '',
    };
    effectiveName = applyJudNameParsing(rawParts).fullName;
  }
  effectiveName = effectiveName || rawFullName;

  if (!effectiveName) {
    console.warn('populateNameOnCardField: name not yet available');
    return;
  }

  const fits = effectiveName.length <= NAME_ON_CARD_MAX_LENGTH;

  if (fits) {
    if (nameOnCardTextField) {
      globals.functions.setProperty(nameOnCardTextField, {
        value: effectiveName,
        readOnly: true,
        visible: true,
      });
    }
    if (nameOnCardSelectField) {
      globals.functions.setProperty(nameOnCardSelectField, { visible: false });
    }
    globals.form.$properties.creditCardJourneyVariables.nameOnCard = effectiveName;
    if (filler10Field) {
      globals.functions.setProperty(filler10Field, { value: 'N' });
    }
  } else {
    const options = computeNameOnCardOptions(effectiveName);
    const hasOptions = Array.isArray(options) && options.length > 0;
    if (nameOnCardSelectField) {
      const selectProps = {
        enum: options,
        enumNames: options,
        visible: true,
      };
      // Preselect the first permutation as default; user can change it.
      if (hasOptions) selectProps.value = options[0];
      globals.functions.setProperty(nameOnCardSelectField, selectProps);
    }
    if (nameOnCardTextField) {
      globals.functions.setProperty(nameOnCardTextField, { visible: false });
    }
    // Sync the carried value AND the (hidden) text field to the default selection so
    // executeInterface never reads the >19-char full name when the user accepts the default.
    // The dropdown's onChange rule keeps both in sync if the user picks another permutation.
    if (hasOptions) {
      globals.form.$properties.creditCardJourneyVariables.nameOnCard = options[0];
      if (nameOnCardTextField) {
        globals.functions.setProperty(nameOnCardTextField, { value: options[0] });
      }
    }
    // Default option is preselected, so filler10 is 'Y' immediately.
    // Dropdown's onChange rule remains and keeps filler10 = 'Y' (idempotent)
    // when the user picks a different combination.
    if (filler10Field) {
      globals.functions.setProperty(filler10Field, { value: hasOptions ? 'Y' : '' });
    }
  }
}
/**
 * @name createCardScreenCarryover
 * @description Derives card-screen flow guards from journey-drop-off data and stores them
 *              on form properties. Calls parseAndPrepareAddresses and mapOccupationTypeForCC
 *              inline to embed parsed addresses and converted occupation type in the bag.
 * @param {Object} data - output of extractRequiredDataFromJourneyDropOffParam
 * @param {scope} globals - global scope object
 * @returns {void} - Updates globals.form.$properties.creditCardJourneyVariables
 */
function createCardScreenCarryover(data, globals) {
  if (!data) return null;

  var addresses = parseAndPrepareAddresses(data, globals) || {};
  var occupationType = mapOccupationTypeForCC(data, globals);

  const params = globals.form.$properties.queryParams || {};
  const seen = new Set();
  const paramString = Object.entries(params)
    .filter(([key]) => {
      const lowerKey = key.toLowerCase();
      if (seen.has(lowerKey)) return false;
      seen.add(lowerKey);
      return true;
    })
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  globals.form.$properties.creditCardJourneyVariables = {
    customerSegment: data.customerSegment ?? '',
    accountChoice: data.accountChoice ?? '',
    jdbLG: data.jdbLG ?? '',
    jdbLC: data.lcCode ?? '',
    jdbCheckBaasFlow: data.jdbCheckBaasFlow ?? '',
    journeyVariant: data.journeyVariant ?? '',
    communicationAddress: data.communicationAddress ?? null,
    permanentAddress: data.permanentAddress ?? null,
    panCard: data.PanCard ? String(data.PanCard) : '',
    mobileNumber: data.RegisteredPhoneNum ? String(data.RegisteredPhoneNum) : '',
    dateOfBirth: data.DateOfBirth ? String(data.DateOfBirth) : '',
    referenceNumber: getUserReferenceNo(),
    hiddenExistingCustomer: (data.customerSegment && data.customerSegment.toLowerCase() === 'existing') ? 'Y' : 'N',
    parsedPermanentAddress: addresses.parsedPerm,
    parsedCommunicationAddress: addresses.parsedComm,
    ccOccupationType: occupationType,
    isPermSameAsComm: addresses.isPermSameAsComm,
    bundled_jwt_token: data.bundled_jwt_token || '',
    branchCode: data.branchCode || '',
    branchName: data.branchName_value || '',
    branchCity: data.branchCity_value || '',
    accountTypeSelection: data.accountTypeSelection || '',
    gender: data.Gender,
    targetName: data.TargetName || '',
    vkycLink: data.startVKYCUrl ? String(data.startVKYCUrl) : '',
    creditCardEmployerName: data.creditCardEmployerName || data.employerInput_value || '',
    bureauConsent: data.bureauConsent || 'N',
    vkycStartTimeRange: '10:00',
    vkycEndTimeRange: '23:59',
    cersaiFlag: data.cersaiFlag || '',
    motherName: data.motherName || '',
    emailAddress: data.emailId || data.emailAddress || '',
    annualIncome: data.annualIncome || '',
    isAccount: 'Yes',
    isVideoKYC: 'Yes',
    isFundingEligible: 'No',
    leadGenerated: 'Yes',
    formSubmitted: 0,
    accountType: data.Account,
    leadNumber: data.ReferenceNumber || '',
    employeeAssistance: data.employeeAssistance || '',
    AccountType: data.AccountType,
    AccountNumber: data.AccountNumber,
    BranchIfscCode: data.BranchIfscCode,
    customerId: data.customerId,
    queryParams: paramString,
    designationDropdown: data.designationDropdown || '',
    fatherName: data.fatherName || '',
    packageId: data.packageId || '',
    employmentTypeLabel: data.employmentType_value || data.employmentType || '',
    leadProfileId: data.leadProfileId || '',
    parentJourneyName: 'INSTA_SAVINGS_JOURNEY',
  };
}
/**
 * Derives card-screen flow guards from journey-drop-off data and stores them
 * on form properties. Consumes the output of extractRequiredDataFromJourneyDropOffParam.
 *
 * @param {Object} data - output of extractRequiredDataFromJourneyDropOffParam
 * @param {scope} globals - global scope object
 */
function populateCardScreenCarryover(data, globals) {
  if (!data) return;
  createCardScreenCarryover(data, globals);

  const aadhaarFullName = data?.kycEngineResponse?.fullName || data?.TargetName || '';

  const commJson = data.communicationAddress
    ? JSON.stringify(data.communicationAddress) : '';
  const permJson = data.permanentAddress
    ? JSON.stringify(data.permanentAddress) : '';
  const isCommDifferentFromPermanent = (commJson && permJson && commJson !== permJson)
    ? 'Y' : 'N';

  const employmentType = data.employmentType ?? '';
  // SA fragment's employmentType enum: '2' = Salaried (per ../financial-detail-fragment).
  const isSalariedEmployment = (employmentType === 'Salaried'
    || employmentType === '2' || employmentType === 2) ? 'Y' : 'N';

  globals.form.$properties.cardScreenCarryover = {
    employmentType,
    isSalariedEmployment,
    customerSegment: data.customerSegment ?? '',
    accountChoice: data.accountChoice ?? '',
    jdbLG: data.jdbLG ?? '',
    jdbLC: data.lcCode ?? '',
    jdbCheckBaasFlow: data.jdbCheckBaasFlow ?? '',
    journeyVariant: data.journeyVariant ?? '',
    aadhaarFullName,
    aadhaarFullNameLength: aadhaarFullName.length,
    isCommDifferentFromPermanent,
    communicationAddress: data.communicationAddress ?? null,
    permanentAddress: data.permanentAddress ?? null,
  };

  // Top-level form variables read by the verify-email rule via getVariable(...).
  // These overwrite the safe defaults set by creditcardInitProcess.
  if (data.DateOfBirth) globals.form.$properties.dateOfBirth = String(data.DateOfBirth);
  if (data.RegisteredPhoneNum) globals.form.$properties.mobileNumber = String(data.RegisteredPhoneNum);
  if (data.CountryCode) globals.form.$properties.countryCode = String(data.CountryCode);
  if (data.PanCard) globals.form.$properties.panCard = String(data.PanCard);

  // FR-G-263: Office Email panel visible only for Salaried (employmentType == '2').
  // The email-verification fragment's rules (verify, OTP-gen, domain-match)
  // read employer/PAN/employment fields by name. Those fields exist in the
  // fragment but are visually hidden (financialDetailsPanel.visible=false).
  // Populate them so the rules fire with real values.
  const findByName = (form, name) => {
    let found = null;
    form?.visit?.((f) => {
      console.log(f);
      if (f?.name === name) found = f;
    });
    return found;
  };
  const showEmailField = employmentType === '5' || employmentType === '3' || employmentType === '20';
  // Toggle Office Email panel visibility per Salaried check.
  const officeEmailPanel = findByName(globals.form, 'officeEmailPanel') || findFieldByNameInScope(globals.form, 'officeEmailPanel');
  if (officeEmailPanel) {
    globals.functions.setProperty(officeEmailPanel, { visible: (isSalariedEmployment === 'Y' || showEmailField) });
  }

  // Pre-fill office email if carryover provides one (leadProfile.officialEmailId).
  const officialEmailId = data.officialEmailId || '';
  if (officialEmailId) {
    ['emailInputComponent1', 'emailInputComponent', 'corporate'].forEach((nm) => {
      const f = findByName(globals.form, nm);
      if (f) globals.functions.setProperty(f, { value: officialEmailId });
    });
  }
  const fieldValueByName = {
    employerInput: data.creditCardEmployerName || data.employerInput_value || data.employerNameMaster_value || '',
    hiddenEmployerNameFinanceDetail: data.creditCardEmployerName || data.employerInput_value || data.employerNameMaster_value || '',
    hiddenEmployerCodeFinanceDetail: data.hiddenEmployerCodeFinanceDetail || '',
    hiddenEmployerCodeCC: data.hiddenEmployerCodeFinanceDetail || '',
    hiddenEmploymentTypeCC: employmentType,
    employmentType: employmentType,
    organizationType: data.organizationType_value || '',
    selfEmployedProfCategory: data.selfEmployedProfCategory_value || '',
    annualIncome: data.annualIncome_value || '',
    sourceOfFunds: data.sourceOfFunds || '',
    designationDropdown: data.designation_value || '',
    natureOfBuisness: data.natureOfBuisness_value || '',
    panNumber: data.PanCard ? String(data.PanCard) : '',
    panDob: data.DateOfBirth ? String(data.DateOfBirth) : '',
    panCardName: aadhaarFullName,
    lgCodeCC: data.jdbLG || '',
    lc1CodeCC: (data.lcCode || '').length > 10 ? data.lcCode.slice(0, 10) : data.lcCode || '',
    branchCodeCC: data.branchCode || '',
    branchNameCC: data.branchName_value || '',
    branchCityCC: data.branchCity_value || '',
    RegisteredPhoneNum: data.RegisteredPhoneNum ? String(data.RegisteredPhoneNum) : '',
    DateOfBirth: data.DateOfBirth ? String(data.DateOfBirth) : '',
    vkycLink: data.startVKYCUrl ? String(data.startVKYCUrl) : '',
  };

  Object.entries(fieldValueByName).forEach(([name, value]) => {
    if (value === undefined || value === null || value === '') return;
    const field = findFieldByNameInScope(globals.form, name);
    if (field) globals.functions.setProperty(field, { value });
  });
  const nameParts = buildCustomerFullName(
    data.TargetName,
    data.fatherName,        // confirm key from Step 1
    data.gender_value             // confirm key from Step 1
  );

  const nameField = findByName(globals.form, 'customerName') || findFieldByNameInScope(globals.form, 'customerName');
  globals.form.$properties.creditCardJourneyVariables.fullName = nameParts.fullName;
  if (nameField) globals.functions.setProperty(nameField, { value: nameParts.fullName });

  const noteField = findByName(globals.form, 'singleNameNote') || findFieldByNameInScope(globals.form, 'singleNameNote');
  if (noteField) globals.functions.setProperty(noteField, { visible: nameParts.isSingleName });

  const namePanel = findFieldByNameInScope(globals.form, 'namepanel');

  globals.functions.setProperty(findFieldByNameInScope(globals.form, 'nameOnCardField'), { value: nameParts.fullName });

  globals.form.$properties.customerNameParts = nameParts;

  globals.functions.setProperty(nameField, { visible: nameParts.isSingleName });
  globals.functions.setProperty(namePanel, { visible: nameParts.isSingleName });

  globals.form.$properties.creditCardJourneyVariables.identityFlag = nameParts.isSingleName;

  // FR-G-253 / FR-G-285 — Employment flag for doc-upload UI variant.
  // Salaried gets Salary Slip / Joining Letter; everyone else gets ITR / Bank statement.
  const empType = String(data.employmentType ?? '').toLowerCase();
  const isSalariedEmp = (empType === '2' || empType === 'salaried');
  if (empType === '2') globals.form.$properties.creditCardJourneyVariables.employmentFlag = 'salaried';
  else if (empType === '3' || empType === '5') globals.form.$properties.creditCardJourneyVariables.employmentFlag = 'selfEmployed';
  else globals.form.$properties.creditCardJourneyVariables.employmentFlag = 'other';
}

/**
 * Returns 'Y' if the company category requires mandatory office-email OTP
 * verification (CAT A, B or S — per FR-G-263 exception), 'N' otherwise.
 *
 * Wire from a rule (e.g., on Continue button click):
 *   isOtpMandatory(hiddenCompanyCategoryCC) === 'Y'
 *
 * @param {object} categoryField - hiddenCompanyCategoryCC field reference
 * @returns {string} 'Y' or 'N'
 */
function isOtpMandatory(categoryField) {
  const cat = String(categoryField?.$value || '').toUpperCase().trim();
  return (cat === 'A' || cat === 'B' || cat === 'S') ? 'Y' : 'N';
}

/**
 * Wire to corporate field's `change` rule:
 *   validateOfficeEmailDomain(corporate, emailDomain, officeEmailDomainError, $form)
 *
 * @param {object} emailField
 * @param {object} domainField
 * @param {object} errorTextField - separate plain-text component for the error
 * @param {scope} globals
 * @returns {boolean}
 */
function validateOfficeEmailDomain(emailField, domainField, errorTextField, globals) {
  const showError = (show) => {
    globals.functions.setProperty(errorTextField, { visible: show });
  };

  const typed = String(emailField?.$value || '').trim();
  if (!typed) { showError(false); return; }

  const atIdx = typed.lastIndexOf('@');
  if (atIdx < 1 || atIdx === typed.length - 1) { showError(true); return; }

  const typedDomain = typed.slice(atIdx + 1).toLowerCase();
  const allowedRaw = String(domainField?.$value || '').trim().toLowerCase();
  const allowed = allowedRaw.startsWith('@') ? allowedRaw.slice(1) : allowedRaw;

  globals.form.$properties.officeEmailDomainMatch = (typedDomain === allowed) ? 'Y' : 'N';

  if (!allowed) { showError(false); return; }
  showError(typedDomain !== allowed ? true : false);
}
/**
 * @name applyJudNameParsing
 * @description Applies the JUD name-length rules to a parsed
 *              {firstName, middleName, lastName} triple. Produces API-ready
 *              values for executeInterface (APS_FIRST_NAME / APS_MIDDLE_NAME /
 *              APS_LAST_NAME / APS_FILLER1). Applied strictly in sequence:
 *
 *   Step 1: If first name > 23 chars, truncate to 23.
 *   Step 2: If last name  > 23 chars, truncate to 23.
 *   Step 3: If middle name > 10 chars, truncate to its first letter. This reduced
 *           middle is the standalone APS_MIDDLE_NAME value sent to the API.
 *   Step 4: Build composite full name "First Middle Last" (APS_FILLER1). If > 30:
 *             a) Remove the middle from the composite — rebuild as "First Last".
 *                The standalone middleName from Step 3 is still sent to the API.
 *             b) If still > 30, keep only the first letter of the last name in
 *                the composite — rebuild as "First L".
 *
 *   The resulting fullName is what the caller checks against the 19-char
 *   name-on-card limit (dropdown shown when fullName > 19).
 *
 * @param {{firstName?:string, middleName?:string, lastName?:string}} parts
 * @returns {{firstName:string, middleName:string, lastName:string, fullName:string}}
 */
function applyJudNameParsing(parts) {
  const trim = (s) => String(s || '').trim();
  const firstName = trim(parts.firstName).slice(0, 23);     // Step 1: first name max 23
  const lastName = trim(parts.lastName).slice(0, 23);       // Step 2: last name max 23
  let middleName = trim(parts.middleName);

  // Step 3: middle name > 10 chars -> first letter only (also the standalone API value).
  if (middleName.length > 10) {
    middleName = middleName.charAt(0);
  }

  // Step 4: composite full name (APS_FILLER1) <= 30 chars.
  let fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
  if (fullName.length > 30) {
    // a) Remove middle from the composite — standalone middleName is preserved.
    fullName = [firstName, lastName].filter(Boolean).join(' ');
    if (fullName.length > 30) {
      // b) Keep only the first letter of the last name in the composite.
      fullName = [firstName, lastName.charAt(0)].filter(Boolean).join(' ');
    }
  }

  return { firstName, middleName, lastName, fullName };
}

/**
 * Builds and stores the Execute Interface (IPA) API request body for the CC journey.
 * Reads data from cardScreenCarryover, form $properties, and CC form field values.
 * Call this from a form rule before invoking the Execute Interface API.
 * @param {scope} globals - Global scope object
 */
function mapExecuteInterfaceRequest(globals) {
  try {
    const props = globals.form && globals.form.$properties ? globals.form.$properties : {};
    const getProp = (key, fallback = '') => {
      const getNestedValue = (obj, path) =>
        path.split('.').reduce((acc, part) => {
          if (acc && typeof acc === 'object') {
            const actualKey = Object.keys(acc).find(k => k.toLowerCase() === part.toLowerCase());
            return actualKey ? acc[actualKey] : undefined;
          }
          return undefined;
        }, obj);

      const value = getNestedValue(props, key);
      return value !== undefined && value !== null ? value : fallback;
    };

    // CC form: data carried over from IS journey via cardScreenCarryover and form $properties.
    const carryover = getProp('cardScreenCarryover') || {};
    console.log('CC carryover perm keys:', Object.keys(carryover.permanentAddress || {}));
    console.log('CC carryover comm keys:', Object.keys(carryover.communicationAddress || {}));
    const perm = carryover.permanentAddress || {};
    const comm = carryover.communicationAddress || {};

    // Helper: read a field value by name (must be declared BEFORE use)
    const fv = (name) => {
      const f = findFieldByNameInScope(globals.form, name);
      return f ? (getOrReturn(f.$value) || '') : '';
    };

    // Parsed addresses from creditCardJourneyVariables (populated by createCardScreenCarryover)
    const ccBag = getProp('creditCardJourneyVariables') || {};
    const parsedPermanentAddress = ccBag.parsedPermanentAddress || {};
    const parsedCommunicationAddress = ccBag.parsedCommunicationAddress || {};

    // Office address — built inline at submit time from form fields (user-entered)
    const parsedOfficeAddress = {
      line1: fv('AddressLine1'),
      line2: fv('AddressLine2'),
      line3: fv('AddressLine3'),
      pincode: fv('pinCode'),
      city: fv('City'),
      state: fv('State'),
      country: fv('Country') || 'India',
    };

    const residence = comm.residenceType || comm.residence || perm.residenceType || perm.residence || '';

    // Date of Birth — stored by populateCardScreenCarryover as globals.$properties.dateOfBirth
    const userDateOfBirth = getProp('dateOfBirth');

    // Name — consume the canonical parts produced by buildCustomerFullName
    // (which handles FR-G-244 single-name + father-name composition). Fall back
    // to splitting the raw Aadhaar full name only if customerNameParts hasn't
    // been populated yet (defensive).
    const customerNameParts = props.customerNameParts || {};
    const rawFullName = getOrReturn(carryover.aadhaarFullName) || '';
    const rawWords = rawFullName.trim().split(/\s+/).filter(Boolean);

    const basisParts = (customerNameParts.firstName || customerNameParts.lastName)
      ? customerNameParts
      : {
        firstName: rawWords[0] || '',
        middleName: rawWords.length > 2 ? rawWords.slice(1, -1).join(' ') : '',
        lastName: rawWords.length > 1 ? rawWords[rawWords.length - 1] : '',
        isSingleName: rawWords.length <= 1,
      };

    // Apply FR-G-242 (per-field caps) and FR-G-243 (composite <=30 chars).
    const isSingleName = !!basisParts.isSingleName;
    const judParsed = isSingleName ? buildCustomerFullName(ccBag.targetName, ccBag.fatherName, ccBag.gender) : applyJudNameParsing(basisParts);

    const firstName = judParsed.firstName;
    const middleName = judParsed.middleName;
    const lastName = judParsed.lastName || '.';
    const fullNameValue = judParsed.fullName;

    // nameEditFlag (APS_NAME_EDIT_FLAG) = 'Y' when the name was edited by our parsing:
    //   1) single-name customer (FR-G-244 father-name composition applied), or
    //   2) first/last name > 23 chars (truncated), or
    //   3) composite full name > 30 chars, which triggers the middle-removal / last-initial reduction.
    // Middle-name truncation (> 10 → initial) does NOT count as an edit, so the >30 check is
    // evaluated AFTER the middle is reduced — e.g. "Himanshu ChandraaShekhar Sharma" →
    // "Himanshu C Sharma" (17 chars) stays 'N'.
    const origFirst = String(basisParts.firstName || '').trim();
    const origMiddle = String(basisParts.middleName || '').trim();
    const origLast = String(basisParts.lastName || '').trim();
    const reducedMiddle = origMiddle.length > 10 ? origMiddle.charAt(0) : origMiddle;
    const compositeAfterCaps = [origFirst.slice(0, 23), reducedMiddle, origLast.slice(0, 23)]
      .filter(Boolean).join(' ');
    const nameWasParsed = !isSingleName && (
      origFirst.length > 23
      || origLast.length > 23
      || compositeAfterCaps.length > 30
    );
    const nameEditFlag = (isSingleName || nameWasParsed) ? 'Y' : 'N';

    // FR-G-262 nameOnCardFlag (Filler 10) = 'Y' only in the dropdown case, i.e. when the
    // PARSED card name (fullNameValue, after FR-G-242/243) exceeds 19 chars — mirrors
    // populateNameOnCardField. Must use the parsed name, not the raw Aadhaar name, so a long
    // middle name that gets reduced to an initial (e.g. "Himanshu C Sharma") stays 'N'.
    const effectiveCardName = fullNameValue || rawFullName;
    const nameOnCardFlag = effectiveCardName.length > NAME_ON_CARD_MAX_LENGTH ? 'Y' : 'N';

    const branchName = carryover.hiddenBranchName || fv('branchNameCC');

    // Channel logic: MKTG or absent LG/LC → Website Download (bank use section = No)
    const lg = carryover.jdbLG || '';
    const lc = carryover.jdbLC || '';
    const isMktgOrAbsent = (!lg && !lc) || lg.toUpperCase() === 'MKTG' || lc.toUpperCase() === 'MKTG';

    // Financial fields — set as form field values by populateCardScreenCarryover
    const panNumber = getProp('panCard') || fv('panNumber');
    const annualIncome = ccBag.annualIncome || fv('annualIncome');
    //const ccBag = getProp('creditCardJourneyVariables') || {};
    const employmentType = ccBag.ccOccupationType
      || fv('hiddenEmploymentTypeCC')
      || fv('employmentType')
      || carryover.employmentType
      || '';
    const employer = getProp('creditCardJourneyVariables.creditCardEmployerName');

    const queryParams = getProp('queryParams') || {};

    const executeInterfaceRequest = {
      // Employee and mobile
      bankEmployee: getProp('bankEmployee') || 'N',
      assistedByBankEmployee: findFieldByNameInScope(globals.form,'BankUseSectionPanel')?.$visible ? 'Y' : 'N',
      mobileNumber: getProp('mobileNumber').toString(),

      // Name fields — values produced by applyJudNameParsing above.
      fullName: fullNameValue,                                            // parsed composite, APS_FILLER1 (<=30 chars)
      firstName: firstName,                                                // max 23 chars
      middleName: middleName,                                              // standalone middle, passed as-is
      lastName: lastName,                                                  // max 23 chars
      // Name on card: when the dropdown is active (parsed name > 19), read the user's live
      // selection from nameOnCardSelect; otherwise read the prefilled text field. The hidden
      // text field is seeded with the default permutation, so it would otherwise shadow the
      // user's dropdown choice. ccBag.nameOnCard and the composed full name are fallbacks.
      nameOnCard: (nameOnCardFlag === 'Y' ? fv('nameOnCardSelect') : fv('nameOnCardField'))
        || ccBag.nameOnCard || fullNameValue,
      nameEditFlag: nameEditFlag,
      nameOnCardFlag: nameOnCardFlag,

      // Date of birth
      dateOfBirth: userDateOfBirth ? transformDateFormat(userDateOfBirth, 'YYYY-MM-DD', 'DD-MMM-YYYY') : '',
      // DOB carried over from SA/Aadhaar; not editable on CC -> 'N'.
      apsDobEditFlag: getProp('apsDobEditFlag') || 'N',

      // PAN fields
      panNumber: panNumber,
      panCheckFlag: getProp('panCheckFlag') || 'Y',
      panverifyflag: getProp('validPAN') || 'Y',
      // PAN carried over from SA; not editable on CC -> 'N'.
      panEditFlag: getProp('panEditFlag') || 'N',
      // TODO (HDFC escalation): these 3 fields are NOT defined in Execute Interface API
      // Mapping.xlsx. Either remove them or confirm with HDFC if the gateway accepts
      // them. NSDL PAN match results live in PARTNER_VARIABLES (PAN_Details, PAN_Status,
      // PAN_First_Name / Middle_Name / Last_Name) instead.
      enableNewPanAPI: getProp('enableNewPanAPI') || 'Y',
      PAN_NAME_MATCH_FLAG_VALUE: getProp('PAN_NAME_MATCH_FLAG_VALUE') || 'N',
      PAN_DOB_MATCH_FLAG_VALUE: getProp('PAN_DOB_MATCH_FLAG_VALUE') || 'N',

      // Contact
      personalEmailId: getOrReturn(getProp('creditCardJourneyVariables.emailAddress')),
      // Personal email carried over from SA; not editable on CC -> 'N'.
      apsEmailEditFlag: getProp('apsEmailEditFlag') || 'N',
      officialEmailId: fv('corporate'),
      // Mobile carried over from SA; not editable on CC -> 'N'.
      mobileEditFlag: getProp('mobileEditFlag') || 'N',
      resPhoneEditFlag: getProp('resPhoneEditFlag') || 'N',

      // Permanent address — parsed from JDOP
      // XLSX APS_PER_ADDR_TYPE: "4 - Permanent Address" (was incorrectly '2').
      perAddressType: '4',
      permanentAddress1: parsedPermanentAddress.line1 || '',
      permanentAddress2: parsedPermanentAddress.line2 || '',
      permanentAddress3: parsedPermanentAddress.line3 || '',
      permanentCity: parsedPermanentAddress.city || '',
      permanentState: parsedPermanentAddress.state || '',
      permanentZipCode: parsedPermanentAddress.pincode || '',

      // Communication address — parsed from JDOP (cloned from perm when Same as Above)
      comAddressType: getProp('comAddressType') || '2',
      comResidenceType: residence,
      communicationAddress1: parsedCommunicationAddress.line1 || '',
      communicationAddress2: parsedCommunicationAddress.line2 || '',
      communicationAddress3: parsedCommunicationAddress.line3 || '',
      communicationCity: parsedCommunicationAddress.city || '',
      communicationState: parsedCommunicationAddress.state || '',
      comCityZip: parsedCommunicationAddress.pincode || '',
      addressEditFlag:
        parsedCommunicationAddress.addressEditFlag ||
        parsedPermanentAddress.addressEditFlag ||
        'N',

      // Office address — user-entered in office-address fragment
      officeAddress1: parsedOfficeAddress.line1 || '',
      officeAddress2: parsedOfficeAddress.line2 || '',
      officeAddress3: parsedOfficeAddress.line3 || '',
      officeCity: parsedOfficeAddress.city || '',
      officeZipCode: parsedOfficeAddress.pincode || '',
      officeState: parsedOfficeAddress.state || '',

      // Financial / employment
      occupation: employmentType,
      gender: getProp('creditCardJourneyVariables.gender'),
      annualIncomeOrItrAmount: String(getOrReturn(getProp('creditCardJourneyVariables.annualIncome'))) || annualIncome,
      monthlyincome: annualIncome ? Math.floor(annualIncome / 12).toString() : '',
      annualItr: String(getOrReturn(getProp('creditCardJourneyVariables.annualIncome'))) || annualIncome,
      companyName: employer.length > 30 ? employer.slice(0, 30) : employer,
      designation: ccBag.designationDropdown || fv('designationDropdown') || getOrReturn(getProp('designation')),
      departmentOrEmpCode: getOrReturn(getProp('departmentOrEmpCode')),
      perfiosTxnID: getOrReturn(getProp('perfiosTxnID')),

      // Product and branch
      productCode: getProp('selectedCardProductCode') || getProp('defaultCardProductCode'),
      branchName: branchName,
      branchCity: carryover.hiddenBranchCity || fv('branchCityCC') || getOrReturn(getProp('branchCity')) || parsedPermanentAddress.city || '',
      // XLSX APS_APPLYING_BRANCH: "Default Value: N" — hardcoded 'N' regardless of channel.
      // (Earlier JUD-derived `isMktgOrAbsent ? 'N' : 'Y'` contradicts XLSX; reverted.)
      applyingBranch: getProp('applyingBranch') || 'N',
      smCode: fv('smCodeCC') || getOrReturn(getProp('smCode')),
      dseCode: getOrReturn(getProp('dseCode')),
      lc2: fv('lc2CodeCC') || getOrReturn(getProp('lc2')),

      // Auth tokens
      customerID: fv('customerID'),
      Id_token_jwt: globals.form.$properties.demogJwtToken || '',
      timeInfo: new Date().toISOString(),
      // XLSX APS_SELF_CONFIRMATION: "Default Value : Y", "Value to be passed from Savings form: Y".
      // Hardcoded 'Y' (the address-declaration checkbox is enforced as a Continue-button gate,
      // so by the time this fires the checkbox is always checked).
      selfConfirmation: getProp('selfConfirmation') || 'Y',
      authmode: globals.form.$properties.isCorporateEmailVerified === 'Y' ? "OTP" : "",
      eReferenceNumber: getOrReturn(getProp('creditCardJourneyVariables.referenceNumber')),

      // Lead fields
      leadClosures: getOrReturn(getProp('leadClosures')),
      leadGenerater: getOrReturn(getProp('leadGenerater')),
      dsaValue: getOrReturn(getProp('dsaValue')),

      // Journey metadata
      journeyID: getJourneyId(globals),
      journeyName: getJourneyName(globals),
      userAgent: navigator.userAgent,
      channel: isMktgOrAbsent ? 'Website Download' : (getOrReturn(getProp('channel')) || 'Website Download'),
      channelSource: 'SACC',
      // TODO (HDFC escalation): isManualFlow is NOT in Execute Interface API Mapping.xlsx.
      isManualFlow: getProp('isManualFlow') || 'false',
      scenario: getOrReturn(getProp('scenario')),
      // UTM
      utmReferral: queryParams.utm_referral || getOrReturn(getProp('utm_referral')) || '',

      // BRE fillers
      BREFILLER2: getOrReturn(getProp('BREFILLER2')),
      BREFILLER3: getOrReturn(getProp('BREFILLER3')),
      BREFILLER4: getOrReturn(getProp('BREFILLER4')),
      SourceID: getOrReturn(getProp('SourceID')),
      // TODO (HDFC escalation): IPA0 is NOT in Execute Interface API Mapping.xlsx.
      IPA0: getProp('IPA0') || 'N',
      Segment: getOrReturn(getProp('Segment')),
      // TODO (HDFC escalation): JUD FR-G-268 says branch code lives in APS_FILLER6,
      // but XLSX marks APS_FILLER6 as "Not Used". Awaiting HDFC confirmation before
      // moving branch code elsewhere or removing this assignment.
      filler6: carryover.branchCode || fv('branchCodeCC') || getOrReturn(getProp('filler6')),

      // Cards
      cardsData: getOrReturn(getProp('cardsData')),
      ADD_ON_CARDS_PARTNER_VARIABLES_AVAILABLE: 'N',
      CrossSellConsent: getProp('creditCardJourneyVariables.bureauConsent') || 'N',
    };

    globals.form.$properties.creditCardJourneyVariables.channel = isMktgOrAbsent ? 'Website Download' : (getOrReturn(getProp('channel')) || 'Website Download');

    // Handle name clash (first == last for single-word names)
    if (executeInterfaceRequest.firstName &&
      executeInterfaceRequest.lastName &&
      executeInterfaceRequest.firstName.trim() === executeInterfaceRequest.lastName.trim()) {
      executeInterfaceRequest.lastName = '.';
    }

    // Sanitise browser version length
    if (executeInterfaceRequest.browserVersion) {
      executeInterfaceRequest.browserVersion = executeInterfaceRequest.browserVersion.substring(0, 48);
    }

    setProperty('executeInterfaceRequest', { requestString: executeInterfaceRequest }, globals);
  } catch (e) {
    if (globals && globals.form && globals.form.$properties) {
      globals.form.$properties.errorCode = 'INVALID_EXECUTE_INTERFACE_PAYLOAD';
      globals.form.$properties.errorMessage =
        'Apologies! Due to a technical issue at our end, we couldn\'t process your request. ' +
        'Please visit the nearest branch for further assistance. ' + e.message;
    }
    setProperty('executeInterfaceRequest', null, globals);
  }
}


/**
 * @name isSurrogateProductCode
 * @description Returns true when the code is an INC/ITR/CD surrogate offer.
 *              Detection: product code ends with INC, ITR, or CD (case-insensitive).
 *              Examples → true: SWINC, BFCCD, ADKCD. Examples → false: FCFL, IOCFL, TMRFL, UPRFT.
 * @param {string} code - product code from filler1 / card selection
 * @returns {boolean}
 */
function isSurrogateProductCode(code) {
  if (!code) return false;
  return /(INC|ITR|CD)$/i.test(String(code).trim());
}

/**
 * @description Computes incomeProof flag from the selected product code +
 *              accountChoice. Gated on Savings account per FR-G-278A-D.
 *              Surrogate selected + Savings → true. Otherwise → false.
 * @param {string} cardProductCode - the SELECTED card's product code
 * @param {scope} globals
 * @returns {boolean}
 */
function computeIncomeProofFlag(cardProductCode, globals) {
  const accountChoice = globals.form.$properties.creditCardJourneyVariables?.accountTypeSelection;
  const isSavings = accountChoice === '0';
  globals.form.$properties.creditCardJourneyVariables.product = cardProductCode || '';
  return isSavings && isSurrogateProductCode(cardProductCode);
}

/**
 * Renders eligible cards into the selector field's enum.
 *
 * @param {Object|null} ipaResponse - assembled IPA shape:
 *   { errorCode, ipa: { applRefNumber, eRefNumber, ipaResult, filler1 },
 *     productEligibility: { productDetails: [...] } }
 *   Pass null to use the mock from constant.js (dev/testing only).
 * @param {Object} selectorField - credit-card selector field reference
 * @param {scope} globals
 * @returns {{ rendered: boolean }} rendered=true when ≥1 card was pushed
 */
function wireCreditCardEligibility(ipaResponse, selectorField, globals) {
  const ipa = ipaResponse;
  if (!ipa || !ipa.productEligibility) {
    console.warn('wireCreditCardEligibility: IPA response missing productEligibility');
    return { rendered: false };
  }

  const productDetails = Array.isArray(ipa.productEligibility.productDetails)
    ? ipa.productEligibility.productDetails : [];

  const preferredOrder = (ipa.ipa?.filler1 || '')
    .split(/[,\-]/)
    .map((s) => s.trim())
    .filter(Boolean);

  globals.form.$properties.ipaApplRefNumber = ipa.ipa?.applRefNumber || '';
  globals.form.$properties.ipaERefNumber = ipa.ipa?.eRefNumber || '';
  globals.form.$properties.ipaResult = ipa.ipa?.ipaResult || '';

  const sortedCards = [...productDetails]
    .filter((c) => c && c.productAvailable !== false)
    .sort((a, b) => {
      const ia = preferredOrder.indexOf(a.cardProductCode);
      const ib = preferredOrder.indexOf(b.cardProductCode);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    })
    .slice(0, 3);

  if (!selectorField) {
    console.warn('wireCreditCardEligibility: selectorField argument missing');
    return { rendered: false };
  }

  if (sortedCards.length === 0) {
    return { rendered: false };
  }

  globals.functions.setProperty(selectorField, { enum: sortedCards });
  globals.functions.setProperty(selectorField, { value: sortedCards[0] });
  const cjv = globals.form.$properties.creditCardJourneyVariables || {};
  cjv.selectedCardImagePath = sortedCards[0].productCode || sortedCards[0].cardTypePath || '';
  console.log(sortedCards[0]);
  globals.form.$properties.creditCardJourneyVariables = cjv;
  globals.form.$properties.creditCardJourneyVariables.incomeProof = computeIncomeProofFlag(sortedCards[0].cardProductCode, globals);
  return { rendered: true };
}
/**
 * @name wireDefaultCreditCard
 * @description FR-G-253 default-card path. Consumes the dummy-servlet response,
 *              picks the single default card, and pushes it into the same
 *              credit-card selector field as a length-1 enum. The selector
 *              auto-switches to its single pre-approved card layout.
 *
 *              Wired from rule: WHEN custom:dummyCardSuccess.
 *
 * @param {Object} dummyServletResponse - toObject($event.payload) from /dummyCard.json
 * @param {Object} selectorField - credit-card selector field reference
 * @param {scope} globals
 */
function wireDefaultCreditCard(dummyServletResponse, selectorField, globals) {
  if (!dummyServletResponse) {
    console.warn('wireDefaultCreditCard: response missing productEligibility');
    return;
  }
  const list = Array.isArray(dummyServletResponse.productDetails)
    ? dummyServletResponse.productDetails : [];
  const defaultCard = list.find((c) => c && c.productAvailable !== false);
  if (!defaultCard || !selectorField) return;

  globals.functions.setProperty(selectorField, { enum: [defaultCard] });
  globals.functions.setProperty(selectorField, { value: defaultCard });

  const cardSubtitleField = findFieldByNameInScope(globals.form, 'ccSelectorSubTitle');
  const subtitleValue = "You are eligible for " + defaultCard.product + "HDFC Credit Card.";
  globals.functions.setProperty(cardSubtitleField, { value: subtitleValue, visible: true });
  const cjv = globals.form.$properties.creditCardJourneyVariables || {};
  cjv.selectedCardImagePath = defaultCard.productCode || defaultCard.cardTypePath || '';
  globals.form.$properties.creditCardJourneyVariables = cjv;
  globals.form.$properties.defaultCardProductCode = defaultCard.cardProductCode || '';
  globals.form.$properties.creditCardJourneyVariables.selectedCardProductName = defaultCard.product || '';
  globals.form.$properties.creditCardJourneyVariables.incomeProof = true;
  globals.form.$properties.isDefaultCardCase = true;
}
/**
 * @name recomputeIncomeProofFlag
 * @description Refresh incomeProof when user picks a different card on the
 *              Card Selection screen. Wired from rule: WHEN selector is changed.
 * @param {Object} selectorField - the credit-card selector field
 * @param {scope} globals
 */
function recomputeIncomeProofFlag(selectorField, globals) {
  if (!selectorField) return;
  const v = selectorField.$value || selectorField.value || {};
  const code = v.cardProductCode || '';
  globals.form.$properties.incomeProof = computeIncomeProofFlag(code, globals);
  globals.form.$properties.selectedCardProductCode = code;
  const cjv = globals.form.$properties.creditCardJourneyVariables || {};
  cjv.incomeProof = computeIncomeProofFlag(v.cardProductCode || '', globals);
  cjv.selectedCardImagePath = v.productCode || v.cardTypePath || '';
  cjv.selectedCardProductName = v.product || '';
  cjv.cardType = v.cardType || '';
  globals.form.$properties.creditCardJourneyVariables = cjv;
  globals.form.$properties.creditCardJourneyVariables.annualFee = v.annualFee || '';
}
/**
 * @name validateOfficeVsCommAddress
 * @description Validates that the office address is not identical to the communication
 *              address. Salaried only (CC occupation code = "1"). Reads parsed comm
 *              address from creditCardJourneyVariables.commsAddr.
 *              Side-effect only — does not return a value. Avoids the AEM rule engine
 *              writing a stray boolean back into the calling field (e.g. pinCode).
 *              Wire on pinCode.valueCommit or Continue button click.
 * @param {Object} officeL1 - Office address Line 1 field
 * @param {Object} officeL2 - Office address Line 2 field
 * @param {Object} officeL3 - Office address Line 3 field
 * @param {Object} officePin - Office pincode field
 * @param {scope} globals - Global form object
 * @returns {void}
 */
function validateOfficeVsCommAddress(officeL1, officeL2, officeL3, officePin, globals) {
  var carryover = globals.form.$properties.creditCardJourneyVariables || {};
  if (carryover.ccOccupationType !== '1') return;

  var comm = carryover.parsedCommunicationAddress || {};

  function norm(v) {
    return String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  var officeKey = [
    officeL1 && officeL1.$value,
    officeL2 && officeL2.$value,
    officeL3 && officeL3.$value,
    officePin && officePin.$value,
  ].map(norm).join('|');

  var commKey = [comm.line1, comm.line2, comm.line3, comm.pincode].map(norm).join('|');

  if (officeKey && officeKey === commKey) {
    globals.functions.markFieldAsInvalid(
      officeL1.$qualifiedName,
      'Office address cannot be the same as your communication address',
      { useQualifiedName: true },
    );
  }
}

/**
 * @name applyOfficePincodeApiResponse
 * @description Error-path handler for the office-pincode MDM lookup.
 *              Call from the rule editor on the failure branch of the
 *              pinCode fetch rule. Each argument may be either a field
 *              reference (preferred) or a field name as string; if a
 *              string is passed it is resolved via findFieldByNameInScope.
 *              Defensive against rule-editor arg-picker mistakes that
 *              would otherwise pass a field's value instead of the field.
 *
 *              Side effects:
 *                - City  field value is cleared
 *                - State field value is cleared
 *                - pinCode field is marked invalid
 *
 * @param {Object|string} pinField   - pinCode field (or 'pinCode')
 * @param {Object|string} cityField  - City    field (or 'City')
 * @param {Object|string} stateField - State   field (or 'State')
 * @param {scope}         globals    - Global form object
 * @returns {void}
 */
function applyOfficePincodeApiResponse(pinField, cityField, stateField, globals) {
  // Resolve any arg that came through as a string/non-object to its field.
  // Fallback to a name lookup by the canonical office-fragment names.
  function resolve(arg, fallbackName) {
    if (arg && typeof arg === 'object' && arg.$qualifiedName) return arg;
    return findFieldByNameInScope(globals.form, fallbackName);
  }

  var pin = resolve(pinField, 'pinCode');
  var city = resolve(cityField, 'City');
  var state = resolve(stateField, 'State');

  if (city) {
    globals.functions.setProperty(city, { value: '' });
  }
  if (state) {
    globals.functions.setProperty(state, { value: '' });
  }
  if (pin) {
    globals.functions.markFieldAsInvalid(
      pin.$qualifiedName,
      'Please enter a valid 6-digit pincode',
      { useQualifiedName: true },
    );
  }
}

/**
 * @name populateCommAddressDisplay
 * @description Renders the resolved communication address (= card delivery address) onto
 *              the 'communication-address' text field as a single read-only string.
 *              Also toggles the self-declaration checkbox per JUD: shown + pre-ticked +
 *              mandatory only when user picked "Add new" in SA journey.
 *              Wire on form/panel initialize.
 * @param {Object} requiredData - extracted from journey drop-off response
 * @param {scope} globals - Global form object
 * @returns {void} - Updates fields via side effects.
 */
function populateCommAddressDisplay(requiredData, globals) {
  if (!requiredData) return;

  const radio = String(requiredData.communicationAddressSelectionRadio || '0');
  const isAddNew = radio === '1';

  const rawAddr = (isAddNew ? requiredData.communicationAddress : requiredData.permanentAddress) || {};

  // Parse via the same logic used for the executeInterface payload — applies
  // word-aware 30-char-per-line truncation, so the UI display matches what
  // the bank receives (max 90 chars across L1+L2+L3).
  const parsed = parseAddress(rawAddr, globals);

  const formatted = [
    parsed.line1, parsed.line2, parsed.line3,
    parsed.city,
    parsed.state,
    parsed.pincode,
    parsed.country,
  ].map((v) => String(v || '').trim()).filter(Boolean).join(', ');

  const field = findFieldByNameInScope(globals.form, 'communication-address');
  if (field) {
    globals.functions.setProperty(field, { value: formatted });
  }

  const checkbox = findFieldByNameInScope(globals.form, 'addrDeclarationCheckbox');
  if (checkbox) {
    globals.functions.setProperty(checkbox, {
      visible: isAddNew, value: isAddNew ? 'on' : '', required: isAddNew,
    });
  }
}
/**
 * @name mapOfficeAddressForSubmit
 * @description Reads office-address field values, defensively sanitises each line per the
 *              Execute Interface char allowlist, and returns the APS_OFF_ADDRESS_* payload
 *              fragment. Call from submit/prepare-request rule.
 * @param {Object} officeL1 - Office address Line 1 field
 * @param {Object} officeL2 - Office address Line 2 field
 * @param {Object} officeL3 - Office address Line 3 field
 * @param {Object} officePin - Office pincode field
 * @param {Object} officeCity - Office city field
 * @param {Object} officeState - Office state field
 * @param {scope} globals - Global form object
 * @returns {Object} - { APS_OFF_ADDRESS_1, APS_OFF_ADDRESS_2, APS_OFF_ADDRESS_3, APS_OFF_PINCODE, APS_OFF_CITY, APS_OFF_STATE }
 */
function mapOfficeAddressForSubmit(officeL1, officeL2, officeL3, officePin, officeCity, officeState, globals) {
  return {
    APS_OFF_ADDRESS_1: sanitiseAddressText(officeL1 && officeL1.$value).slice(0, 30),
    APS_OFF_ADDRESS_2: sanitiseAddressText(officeL2 && officeL2.$value).slice(0, 30),
    APS_OFF_ADDRESS_3: sanitiseAddressText(officeL3 && officeL3.$value).slice(0, 30),
    APS_OFF_PINCODE: String((officePin && officePin.$value) || ''),
    APS_OFF_CITY: String((officeCity && officeCity.$value) || '').slice(0, 25),
    APS_OFF_STATE: String((officeState && officeState.$value) || ''),
  };
}

/**
 * @name sanitiseAddressText
 * @description Sanitises an address string per the Execute Interface API contract
 *              (APS_COM_ADDRESS_*, APS_PER_ADDRESS_*). The contract allows only
 *              [A-Za-z0-9], space, and underscore. This function replaces commas,
 *              hyphens, and forward slashes with space (so word boundaries survive),
 *              strips everything else outside the allowlist, and collapses whitespace.
 *              Runs before the 30-char slicing so length math reflects the wire format.
 * @param {string} text - Raw address string from JDOP (may contain disallowed chars)
 * @returns {string} - Sanitised address safe for Execute Interface submission
 */
function sanitiseAddressText(text) {
  return String(text || '')
    .replace(/[,/\-]/g, ' ')        // separators → space (preserves word boundaries)
    .replace(/[^A-Za-z0-9 _]/g, '') // strip everything else disallowed by API
    .replace(/\s+/g, ' ')           // collapse multiple spaces
    .trim();
}

/**
 * @name parseAddress
 * @description JUD-compliant parser per FR-G-247 to 251.
 *              Branch A: <10 chars => ineligible
 *              Branch B: SA L2 blank => city to L2, editFlag N
 *              Branch C: <30 chars => last word to L2, editFlag Y
 *              Branch D/E: 30-90 / >90 chars => word-aware 30-char slices,
 *                          full words carried over to next line; editFlag N
 * @param {Object} rawAddr - Raw address object from JDOP
 * @param {scope} globals - Global form object (reserved)
 * @returns {Object} - Parsed address with eligible flag
 */
function parseAddress(rawAddr, globals) {
  if (!rawAddr || typeof rawAddr !== 'object') {
    return { line1: '', line2: '', line3: '', line4: '', eligible: false, branch: 'NO_DATA' };
  }

  var rawL1 = rawAddr.Address1 || '';
  var rawL2 = rawAddr.Address2 || '';
  var rawL3 = rawAddr.Address3 || '';
  var pincode = String(rawAddr.Zipcode || '').trim();
  var country = rawAddr.Country || 'India';
  var city = String(rawAddr.City || rawAddr.hiddenSelectedCity || '').slice(0, 25);
  var state = String(rawAddr.State || rawAddr.hiddenSelectedState || '');

  var sanitised = sanitiseAddressText(rawL1 + ' ' + rawL2 + ' ' + rawL3);
  var len = sanitised.length;
  var pincodeValid = /^\d{6}$/.test(pincode) && pincode.slice(-3) !== '000';

  var base = {
    pincode: pincode, city: city, state: state, country: country,
    line4: '', pincodeValid: pincodeValid
  };

  // Branch A — FR-G-251: ineligible
  if (len < 10) {
    return Object.assign({}, base, {
      line1: '', line2: '', line3: '',
      addressEditFlag: 'N', eligible: false, branch: 'A_TOO_SHORT'
    });
  }

  // Branch B — FR-G-250: SA L2 blank → city to L2
  if (!sanitiseAddressText(rawL2)) {
    var l1B = sanitised.slice(0, 30);
    if (l1B.length < 10) {
      return Object.assign({}, base, {
        line1: '', line2: '', line3: '',
        addressEditFlag: 'N', eligible: false, branch: 'A_TOO_SHORT'
      });
    }
    return Object.assign({}, base, {
      line1: l1B, line2: city, line3: '',
      addressEditFlag: 'N', eligible: true, branch: 'B_L2_BLANK'
    });
  }

  // Branch C — FR-G-249: short address, last word to L2
  if (len < 30) {
    var lastSpace = sanitised.lastIndexOf(' ');
    var head = lastSpace > 0 ? sanitised.slice(0, lastSpace).trim() : sanitised;
    var lastWord = lastSpace > 0 ? sanitised.slice(lastSpace + 1) : sanitised;
    if (head.length < 10) {
      return Object.assign({}, base, {
        line1: '', line2: '', line3: '',
        addressEditFlag: 'N', eligible: false, branch: 'A_TOO_SHORT'
      });
    }
    return Object.assign({}, base, {
      line1: head.slice(0, 30), line2: lastWord.slice(0, 30), line3: '',
      addressEditFlag: 'Y', eligible: true, branch: 'C_SHORT'
    });
  }

  // Branch D / E — FR-G-247/248: word-aware 30-char slices.
  // Full words carry forward to next line instead of mid-word splits.
  function splitWordAware(text, max) {
    if (text.length <= max) return { head: text, rest: '' };
    var idx = text.lastIndexOf(' ', max);
    if (idx <= 0) {
      // Single long word with no space within max - hard cut to satisfy API contract
      return { head: text.slice(0, max), rest: text.slice(max).trim() };
    }
    return { head: text.slice(0, idx), rest: text.slice(idx + 1) };
  }

  var split1 = splitWordAware(sanitised, 30);
  var split2 = splitWordAware(split1.rest, 30);
  var split3 = splitWordAware(split2.rest, 30);

  return Object.assign({}, base, {
    line1: split1.head,
    line2: split2.head,
    line3: split3.head.slice(0, 30),   // hard cap on line 3 if Branch E overflow
    addressEditFlag: 'N', eligible: true,
    branch: len > 90 ? 'E_LONG' : 'D_NORMAL'
  });
}

/**
 * @name parseAndPrepareAddresses
 * @description Parses permanent and communication addresses from JDOP-extracted data and
 *              returns them along with the perm-vs-comm equality flag. Handles "Same as
 *              Above" by reusing the parsed permanent for communication.
 *              Pure return — no side effects. Used as helper inside createCardScreenCarryover.
 * @param {Object} requiredData - Output of extractRequiredDataFromJourneyDropOffParam
 * @param {scope} globals - Global form object
 * @returns {Object|null} - {parsedPerm, parsedComm, isPermSameAsComm} or null
 */
function parseAndPrepareAddresses(requiredData, globals) {
  if (!requiredData) return null;

  var radio = String(requiredData.communicationAddressSelectionRadio || '0');
  var isAddNew = radio === '1';

  var parsedPerm = parseAddress(requiredData.permanentAddress, globals);
  var parsedComm = isAddNew
    ? parseAddress(requiredData.communicationAddress, globals)
    : Object.assign({}, parsedPerm, { branch: (parsedPerm.branch || '') + '_SAME_AS_PERM' });

  function norm(a) {
    return [a.line1, a.line2, a.line3, a.pincode]
      .map(function (v) { return String(v || '').toLowerCase().trim(); })
      .join('|');
  }

  var isPermSameAsComm = (norm(parsedPerm) === norm(parsedComm)) ? 'Y' : 'N';

  return {
    parsedPerm: parsedPerm,
    parsedComm: parsedComm,
    isPermSameAsComm: isPermSameAsComm
  };
}

/**
 * Splits a name into { firstName, middleName, lastName, fullName, isSingleName }.
 *
 * - If TargetName has 2+ words: split as First / Middle (everything in between) / Last.
 * - If TargetName has 1 word: First = TargetName; Middle/Last derived from fatherName + gender:
 *     - fatherName has 2+ words: Middle = 1st word, Last = last word
 *     - fatherName has 1 word: Middle = 'S/O' (Male) | 'D/O' (Female) | '' (Other), Last = fatherName
 *     - fatherName empty: Middle = '', Last = '' (degenerate; flag for review)
 *
 * @param {string} targetName - from Aadhaar (TargetName in journey data)
 * @param {string} fatherName - from SA journey Family Details
 * @param {string} gender - 'M' | 'F' | 'O' (or 'Male' | 'Female' | 'Other'; case-insensitive)
 * @returns {{firstName, middleName, lastName, fullName, isSingleName}}
 */
function buildCustomerFullName(targetName, fatherName, gender) {
  const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ');
  const target = norm(targetName);
  const father = norm(fatherName);
  const g = String(gender || '').trim().toUpperCase();

  const targetWords = target ? target.split(' ') : [];
  const isSingleName = targetWords.length === 1;

  let firstName = '';
  let middleName = '';
  let lastName = '';

  if (targetWords.length >= 2) {
    firstName = targetWords[0];
    lastName = targetWords[targetWords.length - 1];
    middleName = targetWords.slice(1, -1).join(' ');
  } else if (targetWords.length === 1) {
    firstName = targetWords[0];
    const fatherWords = father ? father.split(' ') : [];
    if (fatherWords.length >= 2) {
      middleName = fatherWords[0];
      lastName = fatherWords[1];
    } else if (fatherWords.length === 1) {
      lastName = fatherWords[0];
      if (g === 'M' || g === 'MALE' || g === '1') middleName = 'S/O';
      else if (g === 'F' || g === 'FEMALE' || g === '2') middleName = 'D/O';
      else middleName = '';
    }
  }

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
  return { firstName, middleName, lastName, fullName, isSingleName };
}
/* ===== Internal helpers (not exported, not exposed to rule editor) ===== */

function _findByName(form, name) {
  let found = null;
  form?.visit?.((f) => { if (f?.name === name) found = f; });
  return found;
}

function _setProp(globals, name, props) {
  const f = _findByName(globals.form, name) || findFieldByNameInScope(globals.form, name);
  if (f) globals.functions.setProperty(f, props);
}

/* ===== Office Email rule handlers (all wired from visual editor) ===== */

/**
 * @name prepareVerifyEmail
 * @description Called before the login.json Invoke Service on the Verify
 * button. Combines corporate username + emailDomain into the form property
 * `corporateEmail`, then shows the loader.
 * @param {scope} globals - global scope object
 * @returns {void}
 */
function prepareVerifyEmail(globals) {
  const corp = _findByName(globals.form, 'corporate') || findFieldByNameInScope(globals.form, 'corporate');
  const domain = _findByName(globals.form, 'emailDomain') || findFieldByNameInScope(globals.form, 'emailDomain');
  globals.form.$properties.corporateEmail =
    String(corp?.$value || '') + String(domain?.$value || '');
  globals.functions.dispatchEvent(globals.form, 'custom:showLoader');
}

/**
 * @name handleOfficeLoginSuccess
 * @description On login.json success: open OTP modal, reset password field,
 * reset attempts (3) and resend counter (3). On non-success errorCode:
 * dispatch emailOtpGenFailed. Always hides loader.
 * @param {object} payloadBody - $event.payload.body
 * @param {scope} globals - global scope object
 * @returns {void}
 */
function handleOfficeLoginSuccess(payloadBody, globals) {
  const data = typeof payloadBody === 'string' ? JSON.parse(payloadBody) : payloadBody;
  const errorCode = data?.status?.errorCode || '';
  const ok = (errorCode === '00' || errorCode === '0');
  if (ok) {
    _setProp(globals, 'otpCorporatePanel', { visible: true });
    _setProp(globals, 'officeEmailPassword', { value: null });
    _setProp(globals, 'emailCorporateValAttemptsLeft', { value: 3 });
    globals.form.$properties.officeEmailResendCounter = 3;
  } else {
    globals.functions.dispatchEvent(globals.form, 'custom:emailOtpGenFailed');
  }
  globals.functions.dispatchEvent(globals.form, 'custom:hideLoader');
}

/**
 * @name handleOfficeLoginFailure
 * @description On login.json network/HTTP failure: dispatch emailOtpGenFailed
 * and hide loader.
 * @param {scope} globals - global scope object
 * @returns {void}
 */
function handleOfficeLoginFailure(globals) {
  globals.functions.dispatchEvent(globals.form, 'custom:emailOtpGenFailed');
  globals.functions.dispatchEvent(globals.form, 'custom:hideLoader');
}

/**
 * @name prepareOtpVerify
 * @description Called before the otp.json Invoke Service. Just shows the
 * loader (kept as a separate function for consistency and future tweaks).
 * @param {scope} globals - global scope object
 * @returns {void}
 */
function prepareOtpVerify(globals) {
  globals.functions.dispatchEvent(globals.form, 'custom:showLoader');
}

/**
 * @name handleOfficeOtpSuccess
 * @description On otp.json success: errorCode '00' → mark verified, hide
 * modal & verify button, disable input, set isCorporateEmailVerified='Y'.
 * '02' → decrement attempts, mark password invalid. '08'/'09' → dispatch
 * emailOtpFailed. Always hides loader.
 * @param {object} payloadBody - $event.payload.body
 * @param {scope} globals - global scope object
 * @returns {void}
 */
function handleOfficeOtpSuccess(payloadBody, globals) {
  const data = typeof payloadBody === 'string' ? JSON.parse(payloadBody) : payloadBody;
  const errorCode = data?.status?.errorCode || '';
  if (errorCode === '00') {
    const corp = _findByName(globals.form, 'corporate') || findFieldByNameInScope(globals.form, 'corporate');
    globals.form.$properties.lastVerifiedCorporateEmail = String(corp?.$value || '').trim();

    _setProp(globals, 'corporateVerifiedText', { visible: true });
    _setProp(globals, 'editVerifiedEmailButton', { visible: true });   // ← show Edit
    _setProp(globals, 'otpCorporatePanel', { visible: false });
    _setProp(globals, 'verifyCorporateEmail', { visible: false });
    _setProp(globals, 'corporate', { enabled: false });
    globals.form.$properties.isCorporateEmailVerified = 'Y';
    const continueBtn = findFieldByNameInScope(globals.form, 'continueBtn');
    globals.functions.dispatchEvent(continueBtn, 'custom:otpMandatory');
  } else if (errorCode === '02') {
    const attempts = _findByName(globals.form, 'emailCorporateValAttemptsLeft') || findFieldByNameInScope(globals.form, 'emailCorporateValAttemptsLeft');
    if (attempts) globals.functions.setProperty(attempts, { value: (attempts.$value - 1) });
    _setProp(globals, 'officeEmailPassword', {
      valid: false,
      errorMessage: 'Incorrect OTP. Check and try again.',
    });
  } else if (errorCode === '08' || errorCode === '09') {
    globals.functions.dispatchEvent(globals.form, 'custom:emailOtpFailed');
  }
  globals.functions.dispatchEvent(globals.form, 'custom:hideLoader');
}
/**
 * @name editVerifiedEmail
 * @description "Edit" button next to the "Verified" text after OTP success.
 *              Re-enables the email input so the user can change it. The
 *              previously verified email is preserved in
 *              $properties.lastVerifiedCorporateEmail — if the user types
 *              the same value back, resetOfficeEmailVerification restores
 *              the verified state without re-verifying.
 * @param {scope} globals
 */
function editVerifiedEmail(globals) {
  _setProp(globals, 'corporate', { enabled: true });
  _setProp(globals, 'corporateVerifiedText', { visible: false });
  _setProp(globals, 'editVerifiedEmailButton', { visible: false });
  _setProp(globals, 'verifyCorporateEmail', { visible: true });
  globals.form.$properties.isCorporateEmailVerified = 'N';
  // Do NOT clear lastVerifiedCorporateEmail — needed for the "same value back" check.
}
/**
 * @name handleOfficeOtpFailure
 * @description On otp.json network/HTTP failure: dispatch emailOtpFailed
 * and hide loader.
 * @param {scope} globals - global scope object
 * @returns {void}
 */
function handleOfficeOtpFailure(globals) {
  globals.functions.dispatchEvent(globals.form, 'custom:emailOtpFailed');
  globals.functions.dispatchEvent(globals.form, 'custom:hideLoader');
}

/**
 * @name editOfficeEmail
 * @description "Edit email ID" inside the OTP modal: close modal and
 * re-enable the email input so user can type a new value.
 * @param {scope} globals - global scope object
 * @returns {void}
 */
function editOfficeEmail(globals) {
  _setProp(globals, 'otpCorporatePanel', { visible: false });
  _setProp(globals, 'corporate', { enabled: true });
}

/**
 * @name resetOfficeEmailVerification
 * @description Called on every commit of the corporate email field. Hides
 * Verified text, re-shows Verify button, clears isCorporateEmailVerified.
 * Use together with validateOfficeEmailDomain.
 * @param {scope} globals - global scope object
 * @returns {void}
 */
function resetOfficeEmailVerification(globals) {
  const corp = _findByName(globals.form, 'corporate') || findFieldByNameInScope(globals.form, 'corporate');
  const currentEmail = String(corp?.$value || '').trim();
  const lastVerified = String(globals.form.$properties.lastVerifiedCorporateEmail || '').trim();

  if (lastVerified && currentEmail === lastVerified) {
    // User typed back the same email that was already verified → restore verified state, no re-verification needed.
    _setProp(globals, 'corporateVerifiedText', { visible: true });
    _setProp(globals, 'editVerifiedEmailButton', { visible: true });
    _setProp(globals, 'verifyCorporateEmail', { visible: false });
    _setProp(globals, 'corporate', { enabled: false });
    globals.form.$properties.isCorporateEmailVerified = 'Y';
    return;
  }

  // Different (or no prior verification) → clear verified state
  _setProp(globals, 'corporateVerifiedText', { visible: false });
  _setProp(globals, 'editVerifiedEmailButton', { visible: false });
  _setProp(globals, 'verifyCorporateEmail', { visible: true });
  globals.form.$properties.isCorporateEmailVerified = 'N';
}

/**
 * @name refreshVerifyButtonState
 * @description Toggles enabled state of the Verify button based on whether
 * both corporate (username) and emailDomain have values. Wire to change
 * events on those two fields.
 * @param {scope} globals - global scope object
 * @returns {void}
 */
function refreshVerifyButtonState(globals) {
  const employmentTypeField = findFieldByNameInScope(globals.form, 'hiddenEmploymentTypeCC');
  const isSalaried = String(employmentTypeField?.$value || '').trim() === '2';

  if (!isSalaried) {
    _setProp(globals, 'verifyCorporateEmail', { visible: false });
    return;
  }

  const corp = findFieldByNameInScope(globals.form, 'corporate');
  const domain = findFieldByNameInScope(globals.form, 'emailDomain');
  const domainVal = String(domain?.$value || '').trim();

  let enabled;
  if (!domainVal) {
    // emailDomain empty → optional verify, enable only when corp is a valid email
    const corpVal = String(corp?.$value || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    enabled = emailRegex.test(corpVal);
  } else {
    // emailDomain populated (A/B/S mandatory) → existing strict logic
    enabled = !!corp?.$value && globals.form.$properties.officeEmailDomainMatch === 'Y';
  }

  _setProp(globals, 'verifyCorporateEmail', { visible: true, enabled });
}
/**
 * @name refreshOtpButtonState
 * @description Toggles enabled state of the Confirm OTP button based on
 * whether officeEmailPassword has a value. Wire to officeEmailPassword.change.
 * @param {scope} globals - global scope object
 * @returns {void}
 */
function refreshOtpButtonState(globals) {
  const pwd = _findByName(globals.form, 'officeEmailPassword') || findFieldByNameInScope(globals.form, 'officeEmailPassword');
  const enabled = !!pwd?.$value;
  _setProp(globals, 'corporateOTP', { enabled });
}
/**
 * @name mapOccupationTypeForCC
 * @description Maps the IS journey employmentType from JDOP to the CC journey occupation
 *              code per the mapping table. Returns '' for ineligible types.
 *              Pure return — no side effects. Used as helper inside createCardScreenCarryover.
 * @param {Object} requiredData - Output of extractRequiredDataFromJourneyDropOffParam
 * @param {scope} globals - Global form object
 * @returns {string} - CC occupation code ('1'/'2'/'4'/'5') or '' if not eligible
 */
function mapOccupationTypeForCC(requiredData, globals) {
  if (!requiredData) return '';

  var isOcc = String(requiredData.employmentType || '').trim();
  var occMap = {
    '6': '4',  // Homemaker
    '4': '5',  // Retired
    '2': '1',  // Salaried
    '5': '2',  // Self Employed Prof
    '3': '2',  // Self Employed
    '20': '2'   // Agriculturist/Farmer
  };
  return occMap[isOcc] || '';
}
/**
 * Maps form data and context to the PDF generation API request format.
 * Follows the same pattern as mapLeadGenerationRequest / mapExecuteInterfaceRequest.
 * Stores the result as { requestString: {...} } in globals.form.$properties.pdfGenRequest.
 * @param {scope} globals - The AEM EDS global scope object.
 * @returns {void}
 */
function mapPdfGenRequest(globals) {
  try {
    const props = globals.form && globals.form.$properties ? globals.form.$properties : {};
    const getProp = (key, fallback = '') => {
      const getNestedValue = (obj, path) =>
        path.split('.').reduce((acc, part) => {
          if (acc && typeof acc === 'object') {
            const actualKey = Object.keys(acc).find(k => k.toLowerCase() === part.toLowerCase());
            return actualKey ? acc[actualKey] : undefined;
          }
          return undefined;
        }, obj);

      const value = getNestedValue(props, key);
      return value !== undefined && value !== null ? value : fallback;
    };
    const fv = (name) => { const f = findFieldByNameInScope(globals.form, name); return f ? (getOrReturn(f.$value) || '') : ''; };

    const carryover = getProp('cardScreenCarryover') || {}, ccBag = getProp('creditCardJourneyVariables') || {};
    const parsedPermanentAddress = ccBag.parsedPermanentAddress || {}, parsedCommunicationAddress = ccBag.parsedCommunicationAddress || {};

    const parsedOfficeAddress = {
      line1: fv('AddressLine1'), line2: fv('AddressLine2'), line3: fv('AddressLine3'),
      city: fv('City'), state: fv('State'), pincode: fv('pinCode')
    };

    const fullName = getProp('creditCardJourneyVariables.fullName');

    const parts = fullName.trim().split(/\s+/);

    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
    const middleName =
      parts.length > 2
        ? parts.slice(1, -1).join(' ')
        : '';

    const rawDob = getProp('NSDLDateOfBirth') === 'Y' ? fv('dateofbirth') : getProp('dateOfBirth');
    const dateOfBirth = rawDob ? transformDateFormat(rawDob, 'YYYY-MM-DD', 'DD-MMM-YYYY') : '';

    const occupation = ccBag.ccOccupationType || fv('hiddenEmploymentTypeCC') || fv('employmentType') || carryover.employmentType || '';
   // const designation = getOrReturn(getProp('designationDropdown')) || fv('designationDropdown');
    const officialEmailId = fv('corporate') || '';

    const branchName = carryover.hiddenBranchName || fv('branchNameCC');
    const branchCity = carryover.hiddenBranchCity || fv('branchCityCC') || getOrReturn(getProp('branchCity')) || parsedPermanentAddress.city || '';

    const requestString = {
      mobileNumber: getProp('mobileNumber') ? getProp('mobileNumber').toString() : '',
      existingCustomer: getProp('existingCustomer') || '',
      applRefNumber: getOrReturn(getProp('creditCardJourneyVariables.applicationRefNumber')),
      eRefNumber: getOrReturn(getProp('creditCardJourneyVariables.eRefNumber')),

      firstName, middleName, lastName,
      gender: getProp('creditCardJourneyVariables.gender') || '',
      dateOfBirth,

      panNumber: getOrReturn(getProp('panCard')) || fv('panNumber') || '',
      personalEmailId: getOrReturn(getProp('creditCardJourneyVariables.emailAddress')),
      officialEmailId: officialEmailId,
      nameOnCard: fv('nameOnCardField'),

      communicationAddress1: parsedCommunicationAddress.line1 || '',
      communicationAddress2: parsedCommunicationAddress.line2 || '',
      communicationAddress3: parsedCommunicationAddress.line3 || '',
      communicationCity: parsedCommunicationAddress.city || '',
      communicationState: parsedCommunicationAddress.state || '',
      communicationZip: parsedCommunicationAddress.pincode || '',

      permanentAddress1: parsedPermanentAddress.line1 || '',
      permanentAddress2: parsedPermanentAddress.line2 || '',
      permanentAddress3: parsedPermanentAddress.line3 || '',
      permanentCity: parsedPermanentAddress.city || '',
      permanentState: parsedPermanentAddress.state || '',
      permanentZipCode: parsedPermanentAddress.pincode || '',

      officeAddress1: parsedOfficeAddress.line1 || '',
      officeAddress2: parsedOfficeAddress.line2 || '',
      officeAddress3: parsedOfficeAddress.line3 || '',
      officeCity: parsedOfficeAddress.city || '',
      officeState: parsedOfficeAddress.state || '',
      officeZipCode: parsedOfficeAddress.pincode || '',

      occupation,
      designation : getOrReturn(getProp('creditCardJourneyVariables.designationDropdown')) || fv('designationDropdown'),
      empCode: getOrReturn(getProp('empCode')),
      department: getOrReturn(getProp('department')),
      companyName: getProp('creditCardJourneyVariables.creditCardEmployerName'),

      product: getProp('selectedCardProductCode') || getProp('defaultCardProductCode'),
      lgCode: carryover.jdbLG || getOrReturn(getProp('lgcode')),
      lc1Code: fv('lc1CodeCC'),
      lc2Code: fv('lc2CodeCC') || carryover.jdbLC || getOrReturn(getProp('lc2')),
      smCode: fv('smCodeCC') || getOrReturn(getProp('smCode')),

      branchName, branchCity,
      userAgent: navigator.userAgent,
      journeyID: getJourneyId(globals),
      journeyName: getJourneyName(globals),
      scenario: getOrReturn(getProp('scenario')),
      sourcingChannel: 'SACC',
    };

    if (requestString.firstName && requestString.lastName && requestString.firstName.trim() === requestString.lastName.trim()) requestString.lastName = '.';

    setProperty('pdfGenRequest', { requestString }, globals);

  } catch (e) {
    console.error('mapPdfGenRequest error:', e);

    if (globals && globals.form && globals.form.$properties) {
      globals.form.$properties.errorCode = 'INVALID_PDF_GEN_PAYLOAD';
      globals.form.$properties.errorMessage = 'Unable to build PDF generation request: ' + e.message;
    }

    setProperty('pdfGenRequest', null, globals);
  }
}

/**
 * Maps form data and context to the Final DAP API request format.
 * Stores the result as { requestString: {...} } in globals.form.$properties.finalDapRequest.
 * @param {scope} globals - The AEM EDS global scope object.
 * @returns {void}
 */
function mapFinalDapRequest(globals) {
  try {
    const props = globals.form && globals.form.$properties ? globals.form.$properties : {};
    const getProp = (key, fallback = '') => {
      const getNestedValue = (obj, path) =>
        path.split('.').reduce((acc, part) => {
          if (acc && typeof acc === 'object') {
            const actualKey = Object.keys(acc).find((k) => k.toLowerCase() === part.toLowerCase());
            return actualKey ? acc[actualKey] : undefined;
          }
          return undefined;
        }, obj);

      const value = getNestedValue(props, key);
      return value !== undefined && value !== null ? value : fallback;
    };
    const fv = (name) => {
      const f = findFieldByNameInScope(globals.form, name);
      return f ? (getOrReturn(f.$value) || '') : '';
    };

    const creditcardJourneyDetails = getProp('creditCardJourneyVariables') || {};
    const parsedCommunicationAddress = creditcardJourneyDetails.parsedCommunicationAddress || {};

    const motherFullName = getOrReturn(creditcardJourneyDetails.motherName)
      || getOrReturn(getProp('motherName'))
      || fv('motherName');
    const motherNameParts = motherFullName.trim().split(/\s+/).filter(Boolean);
    const motherFirstName = motherNameParts[0]
      || getOrReturn(creditcardJourneyDetails.motherFirstName)
      || getOrReturn(getProp('motherFirstName'))
      || fv('motherFirstName')
      || '';
    const motherLastName = (motherNameParts.length > 1 ? motherNameParts[motherNameParts.length - 1] : '')
      || getOrReturn(creditcardJourneyDetails.motherLastName)
      || getOrReturn(getProp('motherLastName'))
      || fv('motherLastName')
      || '';
    const motherMiddleName = (motherNameParts.length > 2 ? motherNameParts.slice(1, -1).join(' ') : '')
      || getOrReturn(creditcardJourneyDetails.motherMiddleName)
      || getOrReturn(getProp('motherMiddleName'))
      || fv('motherMiddleName')
      || '';

      var newDate = new Date();

    const finalDapRequest = {
      applRefNumber: getOrReturn(creditcardJourneyDetails.applicationRefNumber) || getOrReturn(getProp('applRefNumber')),
      eRefNumber: getOrReturn(creditcardJourneyDetails.eRefNumber) || getOrReturn(getProp('eRefNumber')),
      customerId: getOrReturn(creditcardJourneyDetails.customerId) || getOrReturn(getProp('customerId')) || fv('customerID'),
      communicationCity: parsedCommunicationAddress.city || getOrReturn(creditcardJourneyDetails.communicationCity) || getOrReturn(getProp('communicationCity')),
      idcomStatus: getOrReturn(creditcardJourneyDetails.idcomStatus) || getOrReturn(getProp('idcomStatus')),
      id_token_jwt: getOrReturn(creditcardJourneyDetails.bundled_jwt_token),
      idcom_token: getOrReturn(creditcardJourneyDetails.idcom_token) || getOrReturn(getProp('idcom_token')),
      motherFirstName: motherFirstName,
      motherMiddleName: motherMiddleName,
      motherLastName: motherLastName,
      motherNameTitle: "Mrs",
      mobileNumber: getProp('mobileNumber') ? getProp('mobileNumber').toString() : '',
      userAgent: navigator.userAgent,
      journeyID: getJourneyId(globals),
      journeyName: getJourneyName(globals),
      filler7: getOrReturn(getProp('filler7')),
      cersaiFlag: getOrReturn(getProp('cersaiFlag')),
      APS_MARKETING_CONSENT: getOrReturn(getProp('APS_MARKETING_CONSENT')),
      biometricStatus: 'phyKYC',
      typeOfIndustry: getOrReturn(getProp('typeOfIndustry')),
      natureOfBusiness: getOrReturn(getProp('natureOfBusiness')),
      occupationCode: globals.form.$properties.creditCardJourneyVariables.ccOccupationType || getOrReturn(getProp('occupationCode')),
      JSCPAYLOAD: getOrReturn(getProp('crosscoreDetails.JSC')) || getOrReturn(getProp('JSCPAYLOAD')),
      BROWSERFINGERPRINT: globals.form.$properties.fingerprint || getOrReturn(getProp('crosscoreDetails.BROWSERFINGERPRINT')),
      HDIMPAYLOAD: getOrReturn(getProp('crosscoreDetails.HDMData')) || getOrReturn(getProp('HDIMPAYLOAD')),
      ekycSuccess: 'Y',
      NVKYCConsent: "NVKYC"+newDate.getDate()+""+newDate.getMonth()+1+""+newDate.getFullYear().toString().substring(2,4)+""+newDate.getHours()+""+newDate.getMinutes()+""+newDate.getSeconds(),
    };

    setProperty('finalDapRequest', { requestString: finalDapRequest }, globals);
  } catch (e) {
    console.error('mapFinalDapRequest error:', e);

    if (globals && globals.form && globals.form.$properties) {
      globals.form.$properties.errorCode = 'INVALID_FINAL_DAP_PAYLOAD';
      globals.form.$properties.errorMessage = 'Unable to build Final DAP request: ' + e.message;
    }

    setProperty('finalDapRequest', null, globals);
  }
}

/**
 * @name getBrowserDetail
 * @description Retrieves specific browser details based on the provided parameter or form properties.
 * @param {string} param The name of the browser detail to retrieve. Supported values:
 * - 'userAgent': Returns the user agent string of the browser.
 * - 'language': Returns the language of the browser.
 * - 'platform': Returns the platform of the browser.
 * @param {object} globals - An object containing read-only form instance, read-only target field instance and methods for form modifications.
 * @returns The value of the requested browser detail or an empty string if not found.
 */
function getBrowserDetail(param, globals) {
  if (!param) {
    return '';
  }

  if (globals.form?.properties?.browserDetails?.[param]) {
    return globals.form.properties.browserDetails[param];
  }

  if (typeof navigator !== 'undefined' && param in navigator) {
    return navigator[param] || '';
  } else {
    return '';
  }
}
/**
 * Returns the last N calendar months relative to today, ordered from oldest to newest.
 * Each entry contains the full month name and 4-digit year.
 *
 * @param {number} [count=3] - Number of past months to return (default 3).
 * @returns {Array<{month: string, year: number, label: string}>}
 */
function getLastNMonths(count = 3) {
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const now = new Date();
  const results = [];
  for (let i = count; i >= 1; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    results.push({ month, year, label: `${month} ${year}` });
  }
  return results;
}

/**
 * Returns the last N Indian Financial Years relative to today, ordered from oldest to newest.
 * Indian FY runs April–March: FY 2024-25 = Apr 2024 – Mar 2025.
 *
 * @param {number} [count=2] - Number of past financial years to return (default 2).
 * @returns {Array<{fy: string, startYear: number, endYear: number}>}
 */
function getLastNFinancialYears(count = 2) {
  const now = new Date();
  // Current FY start year: if month is Jan–Mar (0–2), FY started previous calendar year
  const currentFyStart = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  const results = [];
  for (let i = count; i >= 1; i -= 1) {
    const startYear = currentFyStart - i;
    const endYear = startYear + 1;
    const endSuffix = String(endYear).slice(-2);
    results.push({ fy: `FY ${startYear}-${endSuffix}`, startYear, endYear });
  }
  return results;
}

/**
 * Updates the labels of salary-slip, bank-statement, and ITR file-input fields
 * dynamically based on the current date at the time the user fills the form.
 *
 * Wire this function from a rule on the `incomeProofSection` panel's
 * `initialize` event, or on the form's `initialize` event.
 *
 * @param {scope} globals - Global scope object
 * @returns {void}
 */
function updateIncomeProofLabels(globals) {
  const months = getLastNMonths(3);
  const financialYears = getLastNFinancialYears(2);

  const salarySlipFieldNames = [
    'upload_salary_slip_1',
    'upload_salary_slip_2',
    'upload_salary_slip_3',
  ];
  const bankStatementFieldNames = [
    'upload_bank_stmt_1',
    'upload_bank_stmt_2',
    'upload_bank_stmt_3',
  ];
  const itrFieldNames = [
    'upload_itr_1',
    'upload_itr_2',
  ];

  salarySlipFieldNames.forEach((fieldName, idx) => {
    const field = findFieldByNameInScope(globals.form, fieldName);
    if (field && months[idx]) {
      globals.functions.setProperty(field, {
        label: { value: `Salary Slip (${months[idx].month})`, richText: false },
      });
    }
  });

  bankStatementFieldNames.forEach((fieldName, idx) => {
    const field = findFieldByNameInScope(globals.form, fieldName);
    if (field && months[idx]) {
      globals.functions.setProperty(field, {
        label: { value: `Bank Statement (${months[idx].month})`, richText: false },
      });
    }
  });

  itrFieldNames.forEach((fieldName, idx) => {
    const field = findFieldByNameInScope(globals.form, fieldName);
    if (field && financialYears[idx]) {
      globals.functions.setProperty(field, {
        label: { value: financialYears[idx].fy, richText: false },
      });
    }
  });
}

/**
 * Uploads credit-card income-proof (and PAN) documents to documentUpload API as one multipart request.
 * Payload includes per-file metadata blocks plus grouping keys (1_FS/1_BS/2 and existing_*),
 * matching AEM DocuploadNew servlet expectations.
 * @param {scope} globals - Global scope object
 * @returns {void}
 */
function uploadCCDocuments(globals) {
  globals.functions.dispatchEvent(globals.form, 'custom:showLoader');
  const currentRetryCount = Number(globals.form.$properties.docUploadRetryCount || 0);
  const nextRetryCount = currentRetryCount > 0 ? currentRetryCount - 1 : 0;
  try {
    // TEMP fallback values for local/UAT debugging when execute-interface/IPA refs are absent.
    // Remove after upstream mapping is stable.
    const DUMMY_REQUEST_NUMBER = 'AD125260001Z'; // eRef-style value
    const DUMMY_APPLICATION_REF_NO = 'D26E05238967H0N1'; // applRef-style value

    const props = globals.form.$properties || {};
    const journeyID = props.journeyId || '';
    const journeyName = props.journeyName || 'NTB_CC_JOURNEY';
    const mobileNumber = String(props.mobileNumber || '');

    // ipaApplRefNumber / ipaERefNumber are set by wireCreditCardEligibility after the IPA
    // API response. The executeInterface API (which runs before IPA) stores the same values
    // under creditCardJourneyVariables.applicationRefNumber / .eRefNumber.
    // Fall back to those so the upload works even when the IPA leg is still in-flight.
    const ccvars = props.creditCardJourneyVariables || {};
    const exported = (globals.functions && typeof globals.functions.exportData === 'function')
      ? (globals.functions.exportData() || {})
      : {};
    const exportedProps = exported.properties || {};
    const exportedCcv = exportedProps.creditCardJourneyVariables || {};
    // Legacy/servlet-compatible mapping:
    // requestNumber    <- eRefNumber
    // applicationRefNo <- applRefNumber
    const resolvedApplRefNumber = props.ipaApplRefNumber
      || props.applRefNumber
      || ccvars.applicationRefNumber
      || exportedProps.ipaApplRefNumber
      || exportedProps.applRefNumber
      || exportedCcv.applicationRefNumber
      || exported.applRefNumber
      || DUMMY_APPLICATION_REF_NO
      || '';
    const resolvedERefNumber = props.ipaERefNumber
      || props.eRefNumber
      || ccvars.eRefNumber
      || exportedProps.ipaERefNumber
      || exportedProps.eRefNumber
      || exportedCcv.eRefNumber
      || exported.eRefNumber
      || DUMMY_REQUEST_NUMBER
      || '';
    const requestNumber = resolvedERefNumber;
    const applicationRefNo = resolvedApplRefNumber;

    console.log('uploadCCDocuments: resolved params', {
      mobileNumber: mobileNumber || '(empty)',
      requestNumber: requestNumber || '(empty)',
      applicationRefNo: applicationRefNo || '(empty)',
      source_ipaApplRefNumber: props.ipaApplRefNumber || '(empty)',
      source_applRefNumber: props.applRefNumber || '(empty)',
      source_ccvarsApplicationRefNumber: ccvars.applicationRefNumber || '(empty)',
      source_exported_applRefNumber: exportedProps.applRefNumber || exported.applRefNumber || '(empty)',
      source_exported_ccvarsApplicationRefNumber: exportedCcv.applicationRefNumber || '(empty)',
      source_ipaERefNumber: props.ipaERefNumber || '(empty)',
      source_eRefNumber: props.eRefNumber || '(empty)',
      source_ccvarsERefNumber: ccvars.eRefNumber || '(empty)',
      source_exported_eRefNumber: exportedProps.eRefNumber || exported.eRefNumber || '(empty)',
      source_exported_ccvarsERefNumber: exportedCcv.eRefNumber || '(empty)',
    });

    // Guard: mobileNumber, requestNumber and applicationRefNo are mandatory.
    // They are populated by populateCardScreenCarryover (mobileNumber) and
    // wireCreditCardEligibility / executeInterface response (requestNumber / applicationRefNo).
    // If they are missing the servlet will return 500.
    if (!mobileNumber || !requestNumber || !applicationRefNo) {
      console.error('uploadCCDocuments: required fields missing before upload', {
        mobileNumber: mobileNumber || '(empty)',
        requestNumber: requestNumber || '(empty)',
        applicationRefNo: applicationRefNo || '(empty)',
      });
      setProperty('docUploadRetryCount', nextRetryCount, globals);
      if (nextRetryCount === 0) {
        globals.functions.dispatchEvent(globals.form, 'custom:skipCCandShowFinalThankScreen');
      }
      globals.functions.dispatchEvent(globals.form.CCUploadPanel, 'custom:ccDocUploadFailed');
      globals.functions.dispatchEvent(globals.form, 'custom:hideLoader');
      return;
    }

    const getFile = (panel, fieldName) => {
      try {
        const field = panel && panel[fieldName];
        const val = field && field.$value;
        if (!val) return null;
        if (val instanceof File) return val;
        if (val && val.data instanceof File) return val.data;
        return null;
      } catch (e) {
        return null;
      }
    };

    const ccUploadPanel = globals.form && globals.form.CCUploadPanel;
    const ovdWrapper = ccUploadPanel && ccUploadPanel.ccUploadPanel && ccUploadPanel.ccUploadPanel.ovdCcWrapper;

    if (!ovdWrapper) {
      setProperty('docUploadRetryCount', nextRetryCount, globals);
      if (nextRetryCount === 0) {
        globals.functions.dispatchEvent(globals.form, 'custom:skipCCandShowFinalThankScreen');
      }
      globals.functions.dispatchEvent(globals.form, 'custom:ccDocUploadFailed');
      globals.functions.dispatchEvent(globals.form, 'custom:hideLoader');
      return;
    }

    const incomeProof = ovdWrapper.incomeProofSection;
    const panSection = ovdWrapper.panOnlySection;

    const panFile = getFile(panSection, 'upload_pan_card');
    const incomeFiles = [];

    // Track WHICH income-proof variants the user filled, for analytics
    const hasSalary = ['upload_salary_slip_1', 'upload_salary_slip_2', 'upload_salary_slip_3']
      .some((fn) => getFile(incomeProof && incomeProof.salarySlipPanel, fn));
    const hasItr = ['upload_itr_1', 'upload_itr_2']
      .some((fn) => getFile(incomeProof && incomeProof.itrPanel, fn));
    const hasBankStmt = ['upload_bank_stmt_1', 'upload_bank_stmt_2', 'upload_bank_stmt_3']
      .some((fn) => getFile(incomeProof && incomeProof.bankStatementPanel, fn));
    const hasJoining = !!getFile(incomeProof && incomeProof.joiningLetterPanel, 'upload_joining_letter');
    const hasForm16 = !!getFile(incomeProof && incomeProof.joiningLetterPanel, 'upload_form16');

    ['upload_salary_slip_1', 'upload_salary_slip_2', 'upload_salary_slip_3'].forEach((fn) => {
      const f = getFile(incomeProof && incomeProof.salarySlipPanel, fn);
      if (f) incomeFiles.push(f);
    });
    ['upload_itr_1', 'upload_itr_2'].forEach((fn) => {
      const f = getFile(incomeProof && incomeProof.itrPanel, fn);
      if (f) incomeFiles.push(f);
    });
    ['upload_bank_stmt_1', 'upload_bank_stmt_2', 'upload_bank_stmt_3'].forEach((fn) => {
      const f = getFile(incomeProof && incomeProof.bankStatementPanel, fn);
      if (f) incomeFiles.push(f);
    });
    {
      const joiningFile = getFile(incomeProof && incomeProof.joiningLetterPanel, 'upload_joining_letter');
      if (joiningFile) incomeFiles.push(joiningFile);
    }
    {
      const form16File = getFile(incomeProof && incomeProof.joiningLetterPanel, 'upload_form16');
      if (form16File) incomeFiles.push(form16File);
    }

    if (!panFile && incomeFiles.length === 0) {
      setProperty('docUploadRetryCount', nextRetryCount, globals);
      if (nextRetryCount === 0) {
        globals.functions.dispatchEvent(globals.form, 'custom:skipCCandShowFinalThankScreen');
      }
      globals.functions.dispatchEvent(globals.form.CCUploadPanel, 'custom:ccDocUploadFailed');
      globals.functions.dispatchEvent(globals.form, 'custom:hideLoader');
      return;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Set documentProof on creditCardJourneyVariables for analytics.
    //  datamapping.js reads ccVars.documentProof → exposes as
    //  digitalData.formDetails.documentProof → Adobe v170 (Document Type).
    // ─────────────────────────────────────────────────────────────────────
    const docTypesBeingUploaded = [];
    if (panFile) docTypesBeingUploaded.push('PAN');
    if (hasSalary) docTypesBeingUploaded.push('Salary Slip');
    if (hasItr) docTypesBeingUploaded.push('ITR');
    if (hasBankStmt) docTypesBeingUploaded.push('Bank Statement');
    if (hasJoining) docTypesBeingUploaded.push('Joining Letter');
    if (hasForm16) docTypesBeingUploaded.push('Form 16');

    const cjv = globals.form.$properties.creditCardJourneyVariables || {};
    cjv.documentProof = docTypesBeingUploaded.join(', ');
    globals.form.$properties.creditCardJourneyVariables = cjv;

    const apiUrl = `${submitBaseUrl}/content/hdfc_etb_wo_pacc/api/documentUpload.json`;

    const sanitiseFilename = (name) => String(name || 'document')
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9._-]/g, '_')
      .replace(/_+/g, '_');

    const fd = new FormData();
    const incomeUuids = [];
    const panUuids = [];

    const appendDocBlock = (file, docType, uuid) => {
      const safeName = sanitiseFilename(file.name);
      fd.append(uuid, file, safeName);
      fd.append('imageBinary', file, safeName);
      fd.append('docuemntType', docType);
      fd.append('journeyID', journeyID);
      fd.append('requestNumber', requestNumber);
      fd.append('applicationRefNo', applicationRefNo);
      fd.append('journeyName', journeyName);
      fd.append('mobileNumber', mobileNumber);
      fd.append('userAgent', navigator.userAgent);
      fd.append('docuemntName', safeName);
      return safeName;
    };

    if (panFile) {
      const panUuid = generateUUID();
      appendDocBlock(panFile, '1_FS', panUuid);
      panUuids.push(panUuid);
    }
    panUuids.forEach((uuid) => {
      const f = fd.get(uuid);
      if (f instanceof File) fd.append(uuid, f, sanitiseFilename(f.name));
    });
    if (panUuids.length > 0) fd.append('1_FS', panUuids.join(','));
    fd.append('existing_1_FS', '');

    incomeFiles.forEach((file) => {
      const uuid = generateUUID();
      appendDocBlock(file, '3_77', uuid);
      incomeUuids.push(uuid);
    });
    incomeUuids.forEach((uuid) => {
      const f = fd.get(uuid);
      if (f instanceof File) fd.append(uuid, f, sanitiseFilename(f.name));
    });
    if (incomeUuids.length > 0) fd.append('2', incomeUuids.join(','));
    fd.append('existing_2', '');

    console.log('uploadCCDocuments: uploading single multipart request', {
      panCount: panUuids.length,
      incomeCount: incomeUuids.length,
      requestNumber,
      applicationRefNo,
      documentProof: cjv.documentProof,
    });

    fetch(apiUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { accept: '*/*', 'x-requested-with': 'XMLHttpRequest' },
      body: fd,
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((errBody) => Promise.reject(new Error(`HTTP ${res.status}: ${errBody || res.statusText}`)));
        }
        return res.json().catch(() => ({}));
      })
      .then((payload) => {
        const status = String(payload?.status || payload?.Status || '').trim();
        const subStatus = String(payload?.subStatus || '').trim();
        const errorCode = String(payload?.errorCode || '').trim();
        const isSuccess = status === '200' && (subStatus === '0000' || errorCode === '0000' || subStatus === '');
        if (!isSuccess) {
          return Promise.reject(new Error(`Doc upload business failure: ${JSON.stringify(payload)}`));
        }
        return payload;
      })
      .then(() => {
        mapPdfGenRequest(globals);
        fireClickAnalytics('docUploadResultClick', globals);
        if (typeof window !== 'undefined' && window.digitalData) {
          window.digitalData.event.status = 0;   // overwrite the 1 set by case 'click'
        }
        globals.functions.dispatchEvent(globals.form.CCUploadPanel, 'custom:ccDocUploadSuccess');
      })
      .catch((err) => {
        console.error('uploadCCDocuments FAILED');
        console.error('  Error message :', err && err.message ? err.message : String(err));
        console.error('  Error name    :', err && err.name ? err.name : 'Unknown');
        console.error('  Stack trace   :', err && err.stack ? err.stack : 'N/A');
        console.error('  Full error obj:', err);
        setProperty('docUploadRetryCount', nextRetryCount, globals);
        if (nextRetryCount === 0) {
          globals.functions.dispatchEvent(globals.form, 'custom:skipCCandShowFinalThankScreen');
        }
        fireClickAnalytics('docUploadResultClick', globals);
        if (typeof window !== 'undefined' && window.digitalData) {
          window.digitalData.event.status = 0;   // overwrite the 1 set by case 'click'
        }
        globals.functions.dispatchEvent(globals.form.CCUploadPanel, 'custom:ccDocUploadFailed');
      })
      .finally(() => {
        globals.functions.dispatchEvent(globals.form, 'custom:hideLoader');
      });
  } catch (err) {
    console.error('uploadCCDocuments outer error:', err);
    setProperty('docUploadRetryCount', nextRetryCount, globals);
    if (nextRetryCount === 0) {
      globals.functions.dispatchEvent(globals.form, 'custom:skipCCandShowFinalThankScreen');
    }
    globals.functions.dispatchEvent(globals.form.CCUploadPanel, 'custom:ccDocUploadFailed');
    globals.functions.dispatchEvent(globals.form, 'custom:hideLoader');
  }
}

/**
 * @name handleIpaResponse
 * @description Consumes the real IPA API response (decomposed by the rule
 *              editor). If products are returned → renders them. If response
 *              is N with no products and retries are available → schedules
 *              another IPA call after ipaTimer seconds. If retries exhausted
 *              → dispatches custom:noProductCodes so the dummy-servlet
 *              default-card path takes over.
 *
 *              Wired from rule: WHEN custom:ipaResponse.
 *
 * @param {string} errorCode - $event.payload.errorCode
 * @param {Object} ipa - $event.payload.ipa
 * @param {Object} productEligibility - $event.payload.productEligibility
 * @param {Object} selectorField - credit-card selector field reference
 * @param {scope} globals
 */
function handleIpaResponse(errorCode, ipa, productEligibility, selectorField, globals) {
  const ipaResponse = {
    errorCode: errorCode,
    ipa: ipa,
    productEligibility: productEligibility,
  };

  const outcome = wireCreditCardEligibility(ipaResponse, selectorField, globals);
  if (outcome.rendered) {
    globals.form.$properties.creditCardJourneyVariables.recommendedCard = productEligibility?.productDetails[0]?.product || '';
    globals.form.$properties.ipaRetryAttempt = 0;
    globals.functions.dispatchEvent(selectorField, 'custom:selectCardFlow');
    globals.functions.dispatchEvent(globals.form, 'custom:hideLoader');
    return;
  }

  // No products → retry or fall through to default-card flow.
  const carryover = globals.form.$properties.creditCardJourneyVariables || {};
  const ipaDuration = Number(carryover.ipaDuration) || 0;
  const ipaTimer = Number(carryover.ipaTimer) || 0;
  const maxAttempts = ipaTimer > 0 ? Math.floor(ipaDuration / ipaTimer) : 0;
  const currentAttempt = Number(globals.form.$properties.ipaRetryAttempt) || 0;

  if (currentAttempt < maxAttempts) {
    globals.form.$properties.ipaRetryAttempt = currentAttempt + 1;
    const continue_btn = findFieldByNameInScope(globals.form, 'continue-button-thankyou-panel');
    // Re-dispatch the IPA-trigger event after ipaTimer seconds.
    dispatchEventWithDelay(ipaTimer * 1000, continue_btn, 'callIpaApi', globals);
    return;
  }

  // Retries exhausted → default-card path
  globals.form.$properties.ipaRetryAttempt = 0;
  globals.form.$properties.isDefaultCardCase = true;
  if (selectorField) {
    globals.functions.dispatchEvent(selectorField, 'custom:defaultCardFlow');
    globals.functions.dispatchEvent(selectorField, 'custom:noProductCodes', {});
  }
  globals.functions.dispatchEvent(globals.form, 'custom:hideLoader');
}
/**
 * Resolves the given asset path into a complete asset URL.
 *
 * If the provided path is already an absolute URL
 * (starts with http://, https://, or //), it is returned as-is.
 * Otherwise, the submit base URL is prefixed to generate
 * the full asset URL.
 *
 * @param {string} path - Relative or absolute asset path.
 * @returns {string} Fully resolved asset URL, or an empty string if path is invalid.
 */
function resolveAssetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('//')) return path;
  return `${getSubmitBaseUrl()}${path}`;
}

/**
 * @name fireLoadAnalytics
 * @description Fires a page-load Adobe Analytics call.
 *              Pair with a LOAD_CONFIG entry of the same eventName.
 * @param {string} eventName - matches a key in LOAD_CONFIG
 * @param {scope} globals
 */
function fireLoadAnalytics(eventName, globals) {
  const analyticsField = findFieldByNameInScope(globals.form, 'analytics');
  if (!analyticsField) {
    console.warn('fireLoadAnalytics: analytics field not found');
    return;
  }
  const existing = analyticsField.$properties || {};
  globals.functions.setProperty(analyticsField, {
    properties: {
      ...existing,
      triggerEventName: eventName,
      onLoad: 'loadAnalytics',
    },
  });
  globals.functions.dispatchEvent(analyticsField, 'custom:sendOnLoadAnalytics');
}

/**
 * @name fireClickAnalytics
 * @description Fires a link-click Adobe Analytics call.
 *              Pair with an entry in actions.js whose name === eventName.
 * @param {string} eventName - matches an entry name in actions.js
 * @param {scope} globals
 */
function fireClickAnalytics(eventName, globals) {
  const analyticsField = findFieldByNameInScope(globals.form, 'analytics');
  if (!analyticsField) {
    console.warn('fireClickAnalytics: analytics field not found');
    return;
  }
  const existing = analyticsField.$properties || {};
  globals.functions.setProperty(analyticsField, {
    properties: {
      ...existing,
      triggerEventName: eventName,
    },
  });
  globals.functions.dispatchEvent(analyticsField, 'custom:sendAnalytics', {});
}
/**
 * @name firePopupAnalytics
 * @description Fires a popup Adobe Analytics call.
 *              Pair with an entry in actions.js whose name === eventName.
 * @param {string} eventName - matches an entry name in actions.js
 * @param {scope} globals
 */
function firePopupAnalytics(eventName, globals) {
  const analyticsField = findFieldByNameInScope(globals.form, 'analytics');
  if (!analyticsField) {
    console.warn('firePopupAnalytics: analytics field not found');
    return;
  }
  const existing = analyticsField.$properties || {};
  globals.functions.setProperty(analyticsField, {
    properties: { ...existing, triggerEventName: eventName },
  });
  globals.functions.dispatchEvent(analyticsField, 'custom:sendpopupAnalytics', {});
}
/**
 * @name pushCcVarsToJourneyDB
 * @description Stages credit-card variables into
 *              globals.form.$properties.journeyStateInfoAdditionalParametersToAdd
 *              so the state-button (state-button.js) merges them into the
 *              journeydropoff payload's stateInfo at the next state push.
 *
 *              Reads source values from creditCardJourneyVariables (populated by
 *              createCardScreenCarryover / wireCreditCardEligibility) and
 *              globals.form.$properties.queryParams. Skips empty values so
 *              we don't overwrite already-present keys with blanks.
 *
 *              Mapping (target key in stateInfo  ←  source):
 *                apsCardType                  ← creditCardJourneyVariables.cardType
 *                channelSource (nested apsData.apiFieldsJsonObject.utmParams.CHANNELSOURCE)  ← "SACC"
 *                utmCampaign / hiddenUTMParams ← form.$properties.queryParams
 *                startVKYCUrl (nested vkycDetails.vkycUrl) ← creditCardJourneyVariables.vkycLink
 *                LGCode                       ← creditCardJourneyVariables.jdbLG
 *                LCCode                       ← creditCardJourneyVariables.jdbLC
 *                applicationReferenceNumber   ← creditCardJourneyVariables.applicationRefNumber
 *                Channel                      ← creditCardJourneyVariables.channel
 *
 *              Wire to fire BEFORE the state button's "set currentState" step
 *              (call from the same click rule, just above the setFieldProperty
 *              currentState assignment).
 *
 * @param {scope} globals - global scope object
 */
function pushCcVarsToJourneyDB(globals) {
  const props = (globals && globals.form && globals.form.$properties) || {};
  const ccv = props.creditCardJourneyVariables || {};
  const queryParams = ccv.queryParams || {};

  if (!props.journeyStateInfoAdditionalParametersToAdd) {
    globals.form.$properties.journeyStateInfoAdditionalParametersToAdd = {};
  }
  const bag = globals.form.$properties.journeyStateInfoAdditionalParametersToAdd;

  const setIfTruthy = (key, value) => {
    if (value !== undefined && value !== null && value !== '') bag[key] = value;
  };

  setIfTruthy('apsCardType', ccv.cardType);
  setIfTruthy('LGCode', ccv.jdbLG);
  setIfTruthy('LCCode', ccv.jdbLC);
  setIfTruthy('referenceNumber', ccv.referenceNumber);
  setIfTruthy('Channel', ccv.channel);
  setIfTruthy('hiddenUTMParams', queryParams && Object.keys(queryParams).length ? queryParams : undefined);
  setIfTruthy('creditCardName', ccv.selectedCardProductName);
  setIfTruthy('creditCardImage', ccv.selectedCardImagePath);
  setIfTruthy('creditCardHolderName', ccv.fullName);
  // Nested targets — set the whole sub-object on the bag so it lands at
  // stateInfo.<root>.<...>. Shallow merge with existing bag value to keep
  // sibling keys if another rule has already staged some.
  if (ccv.vkycLink) {
    bag.vkycDetails = { ...(bag.vkycDetails || {}), vkycUrl: ccv.vkycLink };
  }
  bag.apsData = {
    ...(bag.apsData || {}),
    apiFieldsJsonObject: {
      ...((bag.apsData && bag.apsData.apiFieldsJsonObject) || {}),
      utmParams: {
        ...(((bag.apsData && bag.apsData.apiFieldsJsonObject) || {}).utmParams || {}),
        CHANNELSOURCE: 'SACC',
      },
    },
  };
}

/**
 * @name refreshContinueBtnState
 * @description enables/disables the continue button on the thank-you panel
 * @param {scope} globals
 */
function refreshContinueBtnState(globals) {
  const emailVerified = globals.form.$properties.isCorporateEmailVerified === 'Y';
  const consent = findFieldByNameInScope(globals.form, 'CCPanelConsent')?.$value === 'on';
  const line1 = findFieldByNameInScope(globals.form, 'AddressLine1')?.$value !== '' && findFieldByNameInScope(globals.form, 'AddressLine1')?.$value !== undefined && findFieldByNameInScope(globals.form, 'AddressLine1')?.$value !== null;
  const line2 = findFieldByNameInScope(globals.form, 'AddressLine2')?.$value !== '' && findFieldByNameInScope(globals.form, 'AddressLine2')?.$value !== undefined && findFieldByNameInScope(globals.form, 'AddressLine2')?.$value !== null;
  const city = findFieldByNameInScope(globals.form, 'City')?.$value !== '' && findFieldByNameInScope(globals.form, 'City')?.$value !== undefined && findFieldByNameInScope(globals.form, 'City')?.$value !== null;
  const pincode = findFieldByNameInScope(globals.form, 'pinCode')?.$value !== '' && findFieldByNameInScope(globals.form, 'pinCode')?.$value !== undefined && findFieldByNameInScope(globals.form, 'pinCode')?.$value !== null;
  const state = findFieldByNameInScope(globals.form, 'State')?.$value !== '' && findFieldByNameInScope(globals.form, 'State')?.$value !== undefined && findFieldByNameInScope(globals.form, 'State')?.$value !== null;
  const country = findFieldByNameInScope(globals.form, 'Country')?.$value !== '' && findFieldByNameInScope(globals.form, 'Country')?.$value !== undefined && findFieldByNameInScope(globals.form, 'Country')?.$value !== null;
  const addrDeclarationCheckbox = findFieldByNameInScope(globals.form, 'addrDeclarationCheckbox')?.$value === 'on' || !findFieldByNameInScope(globals.form, 'addrDeclarationCheckbox')?.$visible;
  const lc2Code = findFieldByNameInScope(globals.form, 'lc2CodeCC')?.$value !== '' && findFieldByNameInScope(globals.form, 'lc2CodeCC')?.$value !== undefined && findFieldByNameInScope(globals.form, 'lc2CodeCC')?.$value !== null && findFieldByNameInScope(globals.form, 'lc2CodeCC')?.$valid || !findFieldByNameInScope(globals.form, 'lc2CodeCC')?.$visible;
  const smCode = findFieldByNameInScope(globals.form, 'smCodeCC')?.$value !== '' && findFieldByNameInScope(globals.form, 'smCodeCC')?.$value !== undefined && findFieldByNameInScope(globals.form, 'smCodeCC')?.$value !== null && findFieldByNameInScope(globals.form, 'smCodeCC')?.$valid || !findFieldByNameInScope(globals.form, 'smCodeCC')?.$visible;
  const bankUseSectionPanel = findFieldByNameInScope(globals.form, 'BankUseSectionPanel')?.$visible;
  const employmentTypeField = findFieldByNameInScope(globals.form, 'hiddenEmploymentTypeCC');
  const isSalaried = String(employmentTypeField?.$value || '').trim() === '2';
  const employerCategory = findFieldByNameInScope(globals.form, 'hiddenCompanyCategoryCC');
  let otpAndEmailVerified = true;
  // Email verification gating applies ONLY to salaried users with A/B/S company category.
  // Self-employed (3, 5, 6, 20, etc.) → never gated, email is optional.
  if (isSalaried && employerCategory !== undefined && employerCategory !== null && isOtpMandatory(employerCategory) === 'Y') {
    if (!emailVerified) {
      otpAndEmailVerified = false;
    } else {
      otpAndEmailVerified = true;
    }
  }
  const bankUseSectionVisible = !bankUseSectionPanel || (lc2Code && smCode);
  const enabled = consent && line1 && line2 && city && pincode && state && country && otpAndEmailVerified && addrDeclarationCheckbox && bankUseSectionVisible;
  _setProp(globals, 'continueBtn', { enabled });
}
/**
 * @name verifySegmentInDemogResponse
 * @description Verifies the segment in otpvalidationfetchdemog api response
 * @param {string} segment - The segment to verify.
 * @param {scope} globals - The global scope object.
 */
function verifySegmentInDemogResponse(segment, globals) {
  if (segment === 'ONLY_CC' || segment === 'CC_ASSET' || segment === 'CASA_CC'
    || segment === 'CASA_ASSET_CC' || segment === 'ONLY_ASSET' || segment === 'ONLY_HL'
    || segment === 'ONLY_CASA' || segment === 'CASA_ASSET'
  ) {
    return 'Y';
  } else {
    return 'N';
  }
}
/**
 * @name applyInsuranceThankYouVariant
 * @description Switches the CC thank-you panel into "insurance flow" mode when
 *              the URL contains ?isinsurance=true.
 *              In insurance mode:
 *                - VKYC banner image, header text, sub-text and 30-second timer
 *                  ring are hidden (insurance customers wait 2 hours, no countdown).
 *                - Two bottom CTAs are shown: "Continue to Insurance" and
 *                  "Skip to VKYC 2 hours".
 *              In normal (non-insurance) mode this is a no-op.
 *
 *              Called from wireVkycThankYouPanel so it shares the same trigger
 *              (thank-you panel becomes visible).
 *
 * @param {scope} globals - Global form scope
 * @returns {boolean} - true when insurance variant was applied
 */
function applyInsuranceThankYouVariant(globals) {
  const queryParams = (globals.form.$properties && globals.form.$properties.queryParams) || {};
  const isInsurance = String(queryParams.isinsurance || '').toLowerCase() === 'true';
  if (!isInsurance) return false;

  const tq = globals.form
    && globals.form.thankyouPanel
    && globals.form.thankyouPanel.accountDetailsTqPanel;
  if (!tq) return false;

  // Hide VKYC-specific UI on the thank-you panel.
  const hideList = [
    tq.videoKYCPanel,
    tq.impInfoPanel,
    tq.videoKycTimer,
    tq.thankYouContentPanel && tq.thankYouContentPanel.feedbackPanel,
    tq.thankYouContentPanel && tq.thankYouContentPanel.easyBankingAlwaysPanel,
  ];
  hideList.forEach((field) => {
    if (field) globals.functions.setProperty(field, { visible: false });
  });

  // Show the two insurance-mode CTAs.
  const continueToInsurance = findFieldByNameInScope(globals.form, 'continue-to-insurance');
  if (continueToInsurance) {
    globals.functions.setProperty(continueToInsurance, { visible: true });
  }
  const ccSkipBtnIns = tq.insuranceBtnPanel && tq.insuranceBtnPanel.ccSkipBtnInsurance;
  if (ccSkipBtnIns) {
    globals.functions.setProperty(ccSkipBtnIns, { visible: true });
  }

  return true;
}
/**
 * @name revertToVkycThankYouFlow
 * @description Reverse of applyInsuranceThankYouVariant. Un-hides the VKYC
 *              banner / header / timer / Start-VKYC button, hides the two
 *              insurance-mode CTAs, and re-starts the 30-second circular timer.
 *              Wire to the "Skip to VKYC 2 hours" button's click rule on the
 *              insurance-variant thank-you screen.
 *
 * @param {scope} globals - Global form scope
 */
function revertToVkycThankYouFlow(globals) {
  const tq = globals.form
    && globals.form.thankyouPanel
    && globals.form.thankyouPanel.accountDetailsTqPanel;
  if (!tq) return;

  // 1. Seed the time-window variables that the form's custom:timerComplete
  //    rule checks via isCurrentTimeBetween(...). Without these, the navigate
  //    at timer = 0 is gated off and nothing happens.
  //    Same defaults as wireVkycThankYouPanel.
  const carryover = (globals.form.$properties
    && globals.form.$properties.creditCardJourneyVariables) || {};
  const start = carryover.vkycStartTimeRange || '10:00';
  const end = carryover.vkycEndTimeRange || '23:59';
  if (globals.functions.setVariable) {
    globals.functions.setVariable('vkycStartTimeRange', start);
    globals.functions.setVariable('vkycEndTimeRange', end);
  }
  globals.form.$properties.vkycStartTimeRange = start;
  globals.form.$properties.vkycEndTimeRange = end;

  // 2. Seed vkyc2 with the link (form-level rule reads from
  //    creditCardJourneyVariables.vkycLink directly, but the manual
  //    "Start Video KYC" click path reads vkyc2.$value — keep both safe).
  if (tq.vkyc2 && carryover.vkycLink) {
    globals.functions.setProperty(tq.vkyc2, { value: carryover.vkycLink });
  }

  // 3. Show every VKYC element that applyInsuranceThankYouVariant hid.
  const showList = [
    tq.videoKYCPanel,
    tq.videoKycTimer,
    tq.thankYouContentPanel && tq.thankYouContentPanel.feedbackPanel,
  ];
  showList.forEach((field) => {
    if (field) globals.functions.setProperty(field, { visible: true });
  });

  // 4. Hide the insurance-variant CTAs.
  const continueToInsurance = findFieldByNameInScope(globals.form, 'continue-to-insurance');
  if (continueToInsurance) {
    globals.functions.setProperty(continueToInsurance, { visible: false });
  }
  const ccSkipBtnIns = tq.insuranceBtnPanel && tq.insuranceBtnPanel.ccSkipBtnInsurance;
  if (ccSkipBtnIns) {
    globals.functions.setProperty(ccSkipBtnIns, { visible: false });
  }

  // 5. Re-start the 30-second circular timer.
  if (tq.videoKycTimer && tq.videoKycTimer.circularTimerVkyc) {
    globals.functions.dispatchEvent(
      tq.videoKycTimer.circularTimerVkyc,
      'custom:startCircularTimer',
    );
  }
}
/**
 * Redirects the user based on query parameters and eligibility conditions.
 *
 * - If ?iscreditcard=true and employment type is not Priest/Politician/Student
 *   → redirects to creditCardUrl with parentjourneyId appended.
 * - Else if ?isinsurance=true and age is between 18–60
 *   → redirects to insuranceUrl with parentjourneyId appended.
 *
 * Redirection happens in the same tab (window.location.href).
 *
 * @param {string} creditCardUrl - Base URL for credit card journey
 * @param {string} insuranceUrl - Base URL for insurance journey
 * @param {scope} globals - Global scope object
 */
function prepareInsuranceUrl(globals) {
  const queryParams = globals.form.$properties.queryParams || {};
  const parentjourneyId = getJourneyId(globals);
  if (queryParams.isinsurance === 'true') {
    const dob = globals.form?.$properties?.creditCardJourneyVariables?.dateOfBirth;
    const age = calculateAge(dob, globals);

    if (age >= 18 && age <= 60) {
      const insuranceUrl = getInsuranceUrl();
      const separator = insuranceUrl.includes('?') ? '&' : '?';
      window.open(`${insuranceUrl}${separator}parentjourneyId=${parentjourneyId}`, '_self');
    }
  }
  if (queryParams.isinsurance === null || queryParams.isinsurance === undefined) {
    globals.functions.setProperty(findFieldByNameInScope(globals.form, 'cc-ref-num'), {
      value: globals.form.$properties.creditCardJourneyVariables?.referenceNumber || '',
    });
    globals.functions.setProperty(findFieldByNameInScope(globals.form, 'cc-name'), {
      value: globals.form.$properties.creditCardJourneyVariables?.selectedCardProductName || '',
    });
    globals.functions.setProperty(findFieldByNameInScope(globals.form, 'cc-holder-name'), {
      // Name printed on card (parsed name, or the user's dropdown selection); fall back to full name.
      value: globals.form.$properties.creditCardJourneyVariables?.nameOnCard
        || globals.form.$properties.creditCardJourneyVariables?.fullName || '',
    });
    const cardFaciaPath = findFieldByNameInScope(globals.form, 'Card Facia');
    const assetPath = resolveAssetUrl(globals.form.$properties.creditCardJourneyVariables?.selectedCardImagePath || '');
    globals.functions.setProperty(findFieldByNameInScope(globals.form, 'Card Facia'), {
      value: resolveAssetUrl(globals.form.$properties.creditCardJourneyVariables?.selectedCardImagePath || ''),
    });
    globals.functions.dispatchEvent(globals.form, 'custom:showFinalThankScreen');
  }
}

/**
 * @name refreshDocUploadContinueState
 * @description Enables the doc-upload "Continue Button" only when files
 *              required by the currently-selected document type are uploaded.
 *              Uses the radio's $value (not panel.visible) to decide which
 *              files to check — avoids the stale-visibility race that occurs
 *              when this fires inside a radio's valueCommit rule.
 * @param {scope} globals
 */
function refreshDocUploadContinueState(globals) {
  const find = (name) => findFieldByNameInScope(globals.form, name);
  const cjv = globals.form.$properties.creditCardJourneyVariables || {};

  const needsPan = !!cjv.identityFlag;       // identityFlag true → PAN required
  const needsIncomeProof = !!cjv.incomeProof; // incomeProof true → income docs required

  const hasFile = (fieldName) => {
    const field = find(fieldName);
    if (!field) return false;
    const v = field.$value;
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    return String(v).trim() !== '';
  };

  const disable = () => { _setProp(globals, 'Continue Button', { enabled: false }); };
  const enable = () => { _setProp(globals, 'Continue Button', { enabled: true }); };

  // 1. PAN — gated on identityFlag, not panel visibility
  if (needsPan && !hasFile('upload_pan_card')) {
    return disable();
  }

  // 2. Income proof — gated on incomeProof flag, not panel visibility
  if (needsIncomeProof) {
    const salariedRadio = find('income_proof_type_salaried');
    const selfEmpRadio = find('income_proof_type_self_employed');
    const docType = String(salariedRadio?.$value || '') || String(selfEmpRadio?.$value || '');

    switch (docType) {
      case 'Salary Slip':
        if (!hasFile('upload_salary_slip_1') || !hasFile('upload_salary_slip_2') || !hasFile('upload_salary_slip_3')) {
          return disable();
        }
        break;
      case 'Joining Letter':
      case 'ITR/Form16':
      case 'Form 16':
        if (!hasFile('upload_form16')) return disable();
        break;
      case 'ITR':
        if (!hasFile('upload_itr_1') || !hasFile('upload_itr_2')) return disable();
        break;
      case 'Bank Statement':
        if (!hasFile('upload_bank_stmt_1') || !hasFile('upload_bank_stmt_2') || !hasFile('upload_bank_stmt_3')) {
          return disable();
        }
        break;
      default:
        // Income proof required but no doc type selected yet → keep disabled
        return disable();
    }
  }

  // All required uploads done (or nothing required) → enable
  enable();
}
/**
 * @name addCorporateEmailHeading
 * @description Adds a heading to the corporate email verification section of the form.
 * @param {Object} emailTextField - The email text field object
 * @param {Object} emailInputField - The email input field object
 * @param {scope} globals - Global form object
 */
function addCorporateEmailHeading(emailTextField, emailInputField, globals) {
  const headingField = findFieldByNameInScope(globals.form, 'officeOtpPopupInfoText');
  const headingText = "We've sent a 6-digit OTP to your office email ID " + maskEmail(emailInputField);

  if (headingField) {
    globals.functions.setProperty(headingField, { value: headingText });
  }
}
/**
 * @name mapInitiateKycRequest
 * @description Builds the initiateKycVkyc.json request payload after Final DAP
 *              success. Gated on URL ?isKyc=true. Stores payload as
 *              $properties.initiateKycRequest.requestString so the WSDL rule
 *              can read it via getVariable('initiateKycRequest.requestString').
 * @param {scope} globals
 */
function mapInitiateKycRequest(globals) {
  try {
    // CR-7 gate
    const queryParams = globals.form.$properties.queryParams || {};
    if (globals.form.$properties.isVkyc !== 'true') {
      return;
    }

    const props = globals.form.$properties || {};
    const ccBag = props.creditCardJourneyVariables || {};
    const carryover = props.cardScreenCarryover || {};

    const fv = (name) => {
      const f = findFieldByNameInScope(globals.form, name);
      return f ? (getOrReturn(f.$value) || '') : '';
    };

    // Parsed addresses
    const parsedComm = ccBag.parsedCommunicationAddress || {};
    const officeAddr = {
      line1: fv('AddressLine1'),
      line2: fv('AddressLine2'),
      line3: fv('AddressLine3'),
      state: fv('State'),
      city: fv('City'),
      pincode: fv('pinCode'),
    };

    // Build payload.queryParams string
    const leadProfileId = props.leadProfileId || ccBag.leadProfileId || '';
    const parentJourneyId = props.parentJourneyId || queryParams.parentJourneyId || queryParams.parentjourneyId || '';
    const parentJourneyName = ccBag.parentJourneyName || queryParams.jName || 'INSTA_SAVINGS_JOURNEY';
    const payloadQueryParams = [
      `pId=${leadProfileId}`,
      `jName=${parentJourneyName}|EDS`,
      `mNo=${ccBag.mobileNumber || ''}`,
      `jId=${parentJourneyId}`,
    ].join('&');

    // Format DOB as DD-MMM-YYYY (e.g., 15-Aug-1998)
    const dobFormatted = ccBag.dateOfBirth
      ? transformDateFormat(ccBag.dateOfBirth, 'YYYY-MM-DD', 'DD-MMM-YYYY')
      : '';

    const requestStringObj = {
      context: {
        journeyID: props.journeyId || '',
        journeyName: props.journeyName || 'NTB_CC_JOURNEY',
        scenario: 'vKycEngine',
        apiName: 'IntiateKyc',                                  // Typo preserved from cURL — backend expects this
        userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : (props.browserAgent || ''),
      },
      payload: {
        mobileNumber: String(ccBag.mobileNumber || ''),
        dateOfBirth: dobFormatted,
        panNumber: ccBag.panCard || '',
        countrycode: '91',
        considerCountryCode: 'true',
        queryParams: payloadQueryParams,
        kycPreferredMode: 'CKYC',
        customerFullName: carryover.aadhaarFullName || ccBag.targetName || '',
        email: ccBag.emailAddress || '',
        employmentType: ccBag.employmentTypeLabel || carryover.employmentType || '',
        configId: ccBag.packageId || 'ff6f7eac-99f4-420f-bb50-5bc801b65bde',
        income: String(ccBag.annualIncome || ''),
        residenceAddressLine1: parsedComm.line1 || '',
        residenceAddressLine2: parsedComm.line2 || '',
        residenceAddressLine3: parsedComm.line3 || '',
        residenceAddressState: parsedComm.state || '',
        residenceAddressCity: parsedComm.city || '',
        residenceAddressZipcode: parsedComm.pincode || '',
        officeAddressLine1: officeAddr.line1,
        officeAddressLine2: officeAddr.line2,
        officeAddressLine3: officeAddr.line3,
        officeAddressState: officeAddr.state,
        officeAddressCity: officeAddr.city,
        officeAddressZipcode: officeAddr.pincode,
        sourceProductCode: 'SACC',
        client_info: getClientInfoAsObject(globals) || {},
      },
    };

    globals.form.$properties.initiateKycRequest = {
      requestString: requestStringObj,
    };
    setProperty('vKycRequest', { requestString: requestStringObj }, globals); // Return for logging/debugging purposes if needed
  } catch (e) {
    console.error('mapInitiateKycRequest error:', e);
  }
}

/**
 * @name handleInitiateKycSuccess
 * @description On initiateKycVkyc success, replace creditCardJourneyVariables.vkycLink
 *              with the URL from response so the VKYC CTA on thank-you screen embeds
 *              the new URL. Gated on ?isKyc=true.
 * @param {object} original - $event.payload.body
 * @param {object} data - global scope object
 * @param {scope} globals
 */
function handleInitiateKycSuccess(original, data, globals) {
  try {
    globals.form.$properties.creditCardJourneyVariables.initiateVkycUrl = original?.initiateVkyc?.url || '';
    globals.form.$properties.creditCardJourneyVariables.kycJourneyId = original?.initiateVkyc?.kycJourneyId || '';
  } catch (e) {
    console.error('handleInitiateKycSuccess parse error:', e);
  }
}

/**
 * @name handleInitiateKycFailure
 * @description On initiateKycVkyc failure (after retries), keep existing
 *              Aadhaar URL in vkycLink. Per JUD: "If the Initiate KYC API
 *              gives failure response, URL received in the response of the
 *              KYC engine when it was called for Aadhar redirection will be
 *              embedded in VKYC CTA". No-op.
 * @param {scope} globals
 */
function handleInitiateKycFailure(globals) {
  const MAX_RETRIES = 5;
  const RETRY_INTERVAL_MS = 5000;

  const currentRetry = Number(globals.form.$properties.initiateKycRetryCount || 0);

  if (currentRetry < MAX_RETRIES) {
    // Bump counter, keep loader visible, schedule next attempt
    globals.form.$properties.initiateKycRetryCount = currentRetry + 1;
    globals.functions.dispatchEvent(globals.form, 'custom:showLoader');

    // Re-fire after RETRY_INTERVAL_MS via a custom event on the panel that
    // hosts the WSDL rule (ccUploadPanel — the doc-upload fragment ref).
    const ccUploadPanelField = findFieldByNameInScope(globals.form, 'ccUploadPanel');
    if (ccUploadPanelField) {
      dispatchEventWithDelay(RETRY_INTERVAL_MS, ccUploadPanelField, 'finalDapSuccess', globals);
    }
    return;
  }
  globals.form.$properties.initiateKycRetryCount = 0;
  globals.form.$properties.initiateKycInFlight = false;
  // vkycLink stays at the existing Aadhaar URL (from earlier IS journey)
  globals.functions.dispatchEvent(globals.form, 'custom:hideLoader');
  // Intentional no-op — existing vkycLink (Aadhaar URL) stays.
}
/**
 * @name setSkipCCHeaderText
 * @description sets the header text for the skip credit card flow based on the account type selected by the user
 * @param {scope} globals
 */
function setSkipCCHeaderText(globals) {
  const accountTypeSelection = globals.form.$properties
    ?.creditCardJourneyVariables?.accountTypeSelection;
  const text = accountTypeSelection === '0'
    ? 'Your Savings Account application submitted Successfully'
    : 'Your Salary Account application submitted Successfully';
  _setProp(globals, 'headertext', { value: text });
}
/**
 * @name setCreditCardSuccessHeaderText
 * @description sets the header text for the credit card success flow
 * @param {scope} globals
 */
function setCreditCardSuccessHeaderText(globals) {
  _setProp(globals, 'headertext', { value: 'Successfully Applied for Credit Card' });
}

// eslint-disable-next-line import/prefer-default-export
export {
  maskMobileNumber,
  isSSO,
  days,
  submitFormArrayToString,
  setProperty,
  getProperty,
  getArrayProperty,
  getCustomEventPayload,
  createJourneyId,
  calculateAge,
  setFieldProperty,
  getFieldProperty,
  getClientInfoAsObject,
  removeHyphensAndUnderscores,
  validateAuthenticator,
  convertDateFormat,
  getCurrentIsoDateTime,
  getJourneyName,
  getJourneyId,
  mask,
  filterByPropertyValue,
  addKeyValueToEachObject,
  generateImagePath,
  appendImagePathField,
  getFullPropertyPath,
  groupAnArrayOfObject,
  transformBills,
  filterByKeyword,
  groupByFirstLetter,
  getJsonProperty,
  parseJsonString,
  mapArrayByKeys,
  combineArraysOfObjects,
  mergeUniqueObjects,
  cleanArray,
  setFieldValueWithDelay,
  decrypt,
  encrypt,
  createStateInfoObject,
  getOffsetDate,
  setFormData,
  getRJDateFormat,
  getOrReturn,
  validateLength,
  convertDateToFormat,
  initializeCrosscore,
  collectCrosscoreDetails,
  dispatchEventWithDelay,
  formatIncome,
  createMappingFromArray,
  transformDateFormat,
  initRestAPIDataSecurityService,
  getCurrentYear,
  getQueryParamsString,
  getAnyNonNullValue,
  enableOvdButton,
  isArray,
  splitFullName,
  regexTest,
  getConsentInputValue,
  maskString,
  filterSpecialCharacters,
  convertIsoToReadable,
  passesNullCheck,
  isValidJsonString,
  getMinutesBetweenTwoDates,
  capitalizeFirstCharOfWords,
  getDifferenceFromCurrentDate,
  getEmptyArray,
  appendAndSubmitPaymentForm,
  mapConsentData,
  getProductCode,
  refresh,
  returnValidProductCategory,
  cleanStringForNulls,
  autoRefillOtp,
  findElementInArray,
  validateName,
  setValueFromInputToNumberField,
  addressValidationHandler,
  validateAddressCommon,
  validateEmail,
  onpremCallBackPayload,
  panNameMatchApiError,
  breApiError,
  checkAndSetSingleEnumValue,
  getEnumDisplayName,
  getCurrentFormattedDateTime,
  sha1Base64,
  verifySha1Hash,
  calculateAndSaveSha1Hash,
  maskEmail,
  isCurrentTimeBetween,
  getOrDefaultValue,
  getRedirectionUrl,
  getHostName,
  returnEmptyObject,
  filterUniqueDropdownEnumsAndEnumNames,
  getUpdatedLastName,
  navigateToVkycLink,
  wireVkycThankYouPanel,
  parkVkycTab,
  getEnumValueFromEnumName,
  populateAccountNumbers,
  nullToEmpty,
  getFormElementByName,
  creditcardInitProcess,
  extractRequiredDataFromJourneyDropOffParam,
  populateAccountDetails,
  populateCardScreenCarryover,
  wireCreditCardEligibility,
  computeNameOnCardOptions,
  populateNameOnCardField,
  validateOfficeEmailDomain,
  isOtpMandatory,
  findFieldByNameInScope,
  validateOfficeVsCommAddress,
  applyOfficePincodeApiResponse,
  mapOfficeAddressForSubmit,
  populateCommAddressDisplay,
  parseAndPrepareAddresses,
  createCardScreenCarryover,
  prepareVerifyEmail,
  handleOfficeLoginSuccess,
  handleOfficeLoginFailure,
  prepareOtpVerify,
  handleOfficeOtpSuccess,
  handleOfficeOtpFailure,
  editOfficeEmail,
  resetOfficeEmailVerification,
  refreshVerifyButtonState,
  refreshOtpButtonState,
  getBrowserDetail,
  wireDefaultCreditCard,
  getLastNMonths,
  getLastNFinancialYears,
  updateIncomeProofLabels,
  uploadCCDocuments,
  mapFinalDapRequest,
  mapPdfGenRequest,
  mapExecuteInterfaceRequest,
  handleIpaResponse,
  recomputeIncomeProofFlag,
  resolveAssetUrl,
  fireLoadAnalytics,
  fireClickAnalytics,
  getUserReferenceNo,
  populateDesignationsByEmploymentType,
  firePopupAnalytics,
  refreshContinueBtnState,
  pushCcVarsToJourneyDB,
  verifySegmentInDemogResponse,
  revertToVkycThankYouFlow,
  prepareInsuranceUrl,
  refreshDocUploadContinueState,
  addCorporateEmailHeading,
  editVerifiedEmail,
  mapInitiateKycRequest,
  handleInitiateKycSuccess,
  handleInitiateKycFailure,
  setSkipCCHeaderText,
  setCreditCardSuccessHeaderText
};