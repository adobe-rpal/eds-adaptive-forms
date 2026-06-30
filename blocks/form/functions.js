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

// DOC UPLOAD SCREEN PARENT DOC IDs
const docUploadParentIDs = {
	"PhotographID" : "16",
	"KYC_ID" : "1",
	"OwnershipID": "741",
	"ContinuityID": "740",
	"GovtRegID": "1612",
	"PSL_ID": "1413",
	"QualificationID": "102",
	"IncomeID":"6",
	"bankStmtID":"50",
	"government_Id": "106",
	"additionalDoc_Id": "762",
	"balanceTransfer_Id":"522"
}

// Child Doc Id Map
const docUploadChildIDs = {
  "Passport": "527",
  "VoterID": "530",
  "DL": "28",
  "Aadhaar": "1183",
  "EmpCertificateID": "536",
	"GovtIDCard": "1715",
	"employmentProofID":"1802",
	"bankStatementID":"567",
	"PhotographChildID":"16",
	"additionalChildID":"762",
	"balanceTransferChildID":"636"
}

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
  if (globals && globals.form && globals.form.loaderFragment){ // loaderFragment - show
    globals.functions.setProperty(globals.form.loaderFragment, { visible: true });
  }

  data.credentials = "include";
  if (!restAPIDataSecurityServiceContext.initStatus) {
    if (restAPIDataSecurityServiceContext.encEnabled === undefined) {
      const formData = globals.functions.exportData();

      if (!formData || !formData.security || formData.security.enabled !== 'true') {
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
    cryptoMetadata,
    credentials: "include"
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
	if (globals && globals.form && globals.form.loaderFragment) { 
    globals.functions.setProperty(globals.form.loaderFragment, { visible: false });
  }
  if (!restAPIDataSecurityServiceContext.initStatus) {
    return encryptedBase64;
  }

  try {
    const encryptedBuffer = base64ToBuffer(encryptedBase64);
    //const ivBuffer = base64ToBuffer(request.cryptoMetadata.secret);
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

let submitBaseUrl = 'https://hdfc-dev-02.adobecqms.net';

export function getSubmitBaseUrl() {
  return submitBaseUrl;
}

/**
 * Fetches, merges, and processes branch details for a list of city IDs.
 *
 * - Sorts the master metadata (`pincodeBranchMasterResponse`) by numeric `CODE` to determine the primary city.
 * - Sets the primary city ID in the `branchCityField`.
 * - Initiates parallel fetch requests for each city ID's branch data.
 * - Merges all valid `branchDetails` arrays from successful responses.
 * - Sorts merged branch details alphabetically by `Name`.
 * - Populates `branchNamesField` with enum values and names derived from the merged data.
 *
 * This function uses Promises for asynchronous operations and can be invoked from synchronous contexts.
 *
 * @param {Array<Object>} pincodeBranchMasterResponse - Array of branch metadata objects, each with a `CODE` and `CITYID`.
 * @param {Array<string>} cityIds - List of unique city IDs for which to fetch branch data.
 * @param {Object} branchCityField - Field reference to branchCity.
 * @param {Object} branchNamesField - Field reference for branchName.
 * @param {scope} globals - Global context object with utility functions like `globals.functions.setProperty`.
 * @returns {void} - No return value. Updates fields via side effects. Any errors are logged to console.
 */
function fetchMergedBranchDetails(pincodeBranchMasterResponse, cityIds, branchCityField, branchNamesField, globals) {
  if (!Array.isArray(cityIds) || cityIds.length === 0 || !Array.isArray(pincodeBranchMasterResponse) || pincodeBranchMasterResponse.length === 0) {
    return;
  }

  // Sort by Code (Numerically)
  pincodeBranchMasterResponse.sort(function (a, b) {
    return parseInt(a.CODE, 10) - parseInt(b.CODE, 10);
  });

  globals.functions.setProperty(branchCityField, {
    value: pincodeBranchMasterResponse[0].CITYID || ''
  });

  let mergedBranchDetails = [];

  // Create array of fetch promises
  const fetchPromises = cityIds.map(cityId =>
    fetch(`${getSubmitBaseUrl()}/content/hdfc_savings_common/api/branchdata.${cityId}.json`, {
      method: "GET"
    })
      .then(response => response.json())
      .then(data => {
        if (data.success === "true" && Array.isArray(data.branchDetails)) {
          mergedBranchDetails.push(...data.branchDetails);
        }
      })
      .catch(e => {
        console.error(`Error fetching data for cityId: ${cityId}`, e);
      })
  );

  // Wait for all fetches to complete
  Promise.all(fetchPromises)
    .then(() => {
      if (mergedBranchDetails.length === 0) return;

      // Sort by Name (alphabetically)
      mergedBranchDetails.sort((a, b) => {
        return (a.Name || '').localeCompare(b.Name || '');
      });

      globals.functions.setProperty(branchNamesField, {
        "enum": mergedBranchDetails.map(item => item.Code || ''),
        "enumNames": mergedBranchDetails.map(item => item.Name || ''),
        value:  pincodeBranchMasterResponse[0].CODE || (mergedBranchDetails[0].Code || '')
      });
    })
    .catch(error => {
      console.error('Unexpected error in fetchMergedBranchDetails:', error);
    });
}

/**
 * Sorts an array of JSON objects by a specific key and sort type.
 *
 * @param {Array<Object>} data - Array of JSON objects.
 * @param {string} sortKey - Key to sort by.
 * @param {boolean} ascending - true for ascending, false for descending.
 * @param {'number'|'string'|'date'|'boolean'} sortType - Type of sort to perform.
 * @returns {Array<Object>} - Sorted array.
 */
function sortJsonArrayByKey(data, sortKey, ascending = 'true', sortType = 'string') {
  ascending = (ascending === 'true' || ascending === true);
  if (!Array.isArray(data)) return [];

  return [...data].sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    // Normalize values based on sortType
    switch (sortType) {
      case 'number':
        valA = Number(valA);
        valB = Number(valB);
        break;
      case 'string':
        valA = String(valA);
        valB = String(valB);
        break;
      // case 'date':
      //   valA = new Date(valA);
      //   valB = new Date(valB);
      //   break;
      // case 'boolean':
      //   valA = valA ? 1 : 0;
      //   valB = valB ? 1 : 0;
      //   break;
    }

    if (valA < valB) return ascending ? -1 : 1;
    if (valA > valB) return ascending ? 1 : -1;
    return 0;
  });
}


/**
 * Gets the extreme (min/max) object or key value from a JSON array, based on sortKey and sortType.
 *
 * @param {Array<Object>} data - Array of JSON objects.
 * @param {string} sortKey - Key to sort by.
 * @param {boolean|string} ascending - true for min, false for max.
 * @param {string|null} returnKey - If set, returns that key's value from the matched object. Otherwise, returns the full object.
 * @param {'number'|'string'|'date'|'boolean'} sortType - How to sort.
 * @returns {any} - Either the whole object, or a specific key's value.
 */
function getExtremeFromJsonArray(data, sortKey, ascending = 'true', returnKey = null, sortType = 'string') {
  const sorted = sortJsonArrayByKey(data, sortKey, ascending, sortType);
  if (sorted.length === 0) return null;

  return returnKey ? sorted[0][returnKey] : sorted[0];
}



/**
 * Get Full Name
 * @name getFullName Concats first name and last name
 * @param {string} firstname in Stringformat
 * @param {string} lastname in Stringformat
 * @return {string}
 */
function getFullName(firstname, lastname) {
  return `${firstname} ${lastname}`.trim();
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

/**
 * Get a form property value
 * @param {string} propertyName Name of the property to get (supports dot notation e.g. 'address.city')
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
 * Sets the last five digits of the mobile number to the dynamic text value.
 * @param {object} normalField
 * @param {scope} globals
 * @returns {void}
 */
function populateLastFiveDigits(normalField, globals) {
  const value = globals.field.$value.toString() || '';
  globals.functions.setProperty(normalField, {
    properties: {
      lastFiveDigits: value.slice(-5),
    },
  });
}

/**
 * Sets first 2 digits and last 2 digits are visible rest all are masked
 * @param {string} mobileNumber Mobile Number
 * @param {scope} globals
 * @returns {string}
 */
function maskMobileNumberAssetsFormat(mobileNumber, globals) {
  let str = mobileNumber;
  let otpSubTitleText = globals.form.otpValidationWrapper.otpValidationSection.aadharOtpPanel.otpMainTextPanel.otpMainText.$value;
  otpSubTitleText = otpSubTitleText.replace("****", str.slice(0, 2) + "*".repeat(str.length - 4) + str.slice(-2));

  //first 2 digits and last 2 digits are visible rest all are masked
  return otpSubTitleText;

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
  let journeyId = getProperty("journeyId", globals);

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
 * Creates a journey ID by combining various parameters
 * @param {string} journeyAbbreviation The journey abbreviation
 * @param {string} channel The channel
 * @param {scope} globals Global scope object
 * @returns {string} The generated journey ID
 */
function createPartnerJourneyId(journeyAbbreviation, channel, globals) {
  var visitMode = "U"; // todo check if this is correct
  var dynamicUUID = generateUUID();
  var dispInstance = getDispatcherInstance();
  var journeyId = dynamicUUID + '_' + dispInstance + "_" + journeyAbbreviation;
  // todo: this is done since setProperty is asynchronous
  // and return values is immediately set as updates on the form object in which this is written
  return journeyId
}


/**
 * Get the complete event payload
 * @param {scope} globals Global scope object
 * @returns {*} event payload - returns body if present, otherwise full payload
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
    const referenceDate = getProperty("currentDateTime", globals);
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
 * Import recommended sub products data into the panel
 * @param {object} subProductPanel Panel component to import data into
 * @param {object} subProductData Data to be imported
 * @param {scope} globals Global scope object
 */
function importRecommendedSubProducts(subProductPanel, subProductData, globals) {
  // todo: transform the subProductData to the format of the subProductPanel
  subProductPanel.importData(subProductData);
}

/**
 * Extract an element from array at specified index or last element if no index provided
 * @param {Array} array Array to extract element from
 * @param {number} [index] Optional index to extract element from, defaults to last element
 * @returns {string|object} Element from the array at specified index or last element
 */
function extractArrayElement(array, index) {
  return array[index ? index : array.length - 1];
}

/**
 * Gets the form data by exporting all field values and converts to JSON string
 * @param {scope} globals - Global scope object containing form context
 * @returns {object|string} The complete form data as an object or JSON string if stringify is true
 */
function getFormDataAsString(globals) {
  // todo: add this function in the product OOTB list
  const data = globals.functions.exportData();
  // Check if data exists and is an object
  if (data && typeof data === 'object') {
    return JSON.stringify(data);
  }
  return data;
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
function removeHyphensAndUnderscores (str, globals) {
  return (str || '').replace(/-/g, '').replace(/_/g, '');
}

/**
 * Sends a POST request by dynamically creating and submitting a form.
 * The form includes Aadhaar-related encrypted fields and vendor information.
 *
 * @param {string} encKey - The encrypted key to be included in the form.
 * @param {string} encSecret - The encrypted secret to be included in the form.
 * @param {string} vendorId - The vendor identifier.
 * @param {string} encData - The encrypted Aadhaar data.
 * @param {string} redirectUrl - The URL to which the form will be submitted.
 */
function sendAadharRequest(encKey, encSecret, vendorId, encData, redirectUrl) {
  const aadharValidationForm = document.createElement('form');
  aadharValidationForm.setAttribute('action', redirectUrl);
  aadharValidationForm.setAttribute('method', 'POST');

  updateAadharFormElement(aadharValidationForm, "encKey", encKey);
  updateAadharFormElement(aadharValidationForm, "encSecret", encSecret);
  updateAadharFormElement(aadharValidationForm, "vendorId", vendorId);
  updateAadharFormElement(aadharValidationForm, "encData", encData);
  updateAadharFormElement(aadharValidationForm, "redirectUrl", redirectUrl);

  document.body.appendChild(aadharValidationForm);
  aadharValidationForm.submit();
}

/**
 * Appends a hidden input field to the form for the given key-value pair.
 *
 * @param {HTMLFormElement} form - The form element to which the hidden field should be added.
 * @param {string} key - The name attribute for the input field.
 * @param {string} value - The value attribute for the input field.
 */
function updateAadharFormElement(form, key, value) {
  const field = document.createElement('input');
  field.setAttribute('type', 'hidden');
  field.setAttribute('name', key);
  field.setAttribute('value', value);
  form.appendChild(field);
}

/**
 * Filter and return IFSC code based on selected branch ID
 * @param {scope} globals Global scope object containing field properties and value
 * @returns {string} IFSC code of the selected branch or empty string if not found
 */
function filterIfscCode(globals) {
  var branchDetails = globals.field.$properties["branchDetails"];
  if (branchDetails) {
    var filteredValue = branchDetails.filter(function(detail) {
      return detail.Id === globals.field.$value;
    })[0];
    return filteredValue ? filteredValue.IFSC || "" : "";
  }
  return "";
}

/**
 * Shows the wizard panel by setting its visibility property
 * @param {scope} globals Global scope object containing form functions and components
 * @returns {void}
 */
function showWizardHideLoginFragment(globals) {
   // todo: limitation in rule editor to listen to event, ideally this should
  // have being down via dispatchEvent in fragment and listening to that event in fragment wrapper of form
  var panel = globals.form.wizard;
  var loginFragment = globals.form.loginFragment
  globals.functions.setProperty(panel, {
    "visible": true
  });
  globals.functions.setProperty(loginFragment, {
    "visible": false
  });
}


/**
 * Validates the login page form based on mobile number, either DOB or PAN (depending on selection),
 * and mandatory consent checkbox.
 *
 * @param {Object} mobileField - The form field object for the mobile number, containing a `$valid` property.
 * @param {Object} dobField - The form field object for date of birth (DOB), containing a `$valid` property.
 * @param {Object} panField - The form field object for PAN, containing a `$valid` property.
 * @param {Object} mandatoryConsent - The consent checkbox field object, containing a `$value` property (boolean).
 * @param {scope} globals - Global variables or settings object (currently unused in this function).
 *
 * @returns {boolean} - Returns `true` if the form passes validation rules; otherwise, `false`.
 *
 * @example - On rule editor, if the response of this function is true, enable the otp button else keep it disabled.
 */
function validateLoginPage(mobileField, dobField, panField, mandatoryConsent, globals) {
  // const radioSelect = (panDobSelection === '0') ? 'DOB' : 'PAN';
  const radioSelect = 'DOB'; // Hardcoded for now, assuming DOB is always selected
  if (mobileField.$value && mobileField.$value.toString().length == 10 && mobileField.$valid &&
      ((radioSelect === 'DOB' && dobField.$valid) ||
        (radioSelect === 'PAN' && panField.$valid)) &&
        mandatoryConsent.$value === 'yes') {
    return true;
  }

  return false;
}

/**
 * Validates the otp screen based on the OTP Input.
 *
 * @param {Object} otpField - The form field object for the otp, containing a `$valid` property.
 * @param {scope} globals - Global variables or settings object (currently unused in this function).
 *
 * @returns {boolean} - Returns `true` if the form passes validation rules; otherwise, `false`.
 *
 * @example - On rule editor, if the response of this function is true, enable the otp button else keep it disabled.
 */
function validateOtpPage(otpField, globals) {
  if (otpField.$valid) {
    return true
  }
  return false;
}

/**
 * Validates the age based on the Date of Birth (DOB) field value.
 * The function checks whether the age derived from the provided DOB falls within the specified
 * minimum and maximum age range.
 *
 * @param {Object} dobField - The form field object representing the Date of Birth input field.
 * It should contain a `$value` property that holds the DOB in a valid date format.
 *
 * @param {number} minAge - The minimum age the person should be based on their Date of Birth.
 *
 * @param {number} maxAge - The maximum age the person can be based on their Date of Birth.
 *
 * @param {scope} globals - A global settings object (currently unused in this function,
 * but could be extended to handle additional logic or configurations).
 *
 * @returns {void} - Sets dob field as invalid, if the age is out of the range provided.
 *
 */
function validateDobAge(dobField, minAge, maxAge, globals) {
  const age = calculateAge(dobField, globals);

  if(age < minAge || age > maxAge) {
    globals.functions.markFieldAsInvalid(
      dobField.$qualifiedName,
      `Customers with age below ${minAge} years and above ${maxAge} are not allowed.`,
      { useQualifiedName: true });
  }
}

/**
 * Converts a date string from one format to another.
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
 * Computes the matching state ID from branch state field based on pincode state list
 * @param {Array} stateListFromPinCode List of states from pincode response
 * @param {object} branchStateField Branch state field containing enum values and names
 * @param {scope} globals Global scope object
 * @returns {string} Matching state ID from branch state field or undefined if no match found
 */
function computeBranchState(stateListFromPinCode, branchStateField, globals) {
  if (!stateListFromPinCode || !stateListFromPinCode.length || !branchStateField) {
    return undefined;
  }

  // Search through enumNames and values to find matching state
  for (const state of stateListFromPinCode) {
    if (state.Name.toLowerCase() === branchStateField.toLowerCase()) {
      return state.StateId;
    }
  }

  return undefined;
}

/**
 * Sets the enum property of accountVariantSelected field based on subProductId from exported data
 * @param {scope} globals Global scope object containing form data and field information
 * @returns {void} Updates the enum property of accountVariantSelected field
 */
function computeAccountVariant(globals) {
  // todo: this can be done in visual rule editor
  // today the rule of repeatable panel is not working correctly, hence dont here

  // ideal way: set property enum of field when repeatable panel is initialized in visual rule editor
  const exportedData = globals.field.$value;

  if (exportedData && exportedData.SubProductId) {
    globals.functions.setProperty(globals.field.accountVariantSelected, {
      "enum": [exportedData.SubProductId],
      "enumNames": [""]
    });
  }
}

/**
 * Replace all occurrences of a string in the original string
 * @param {string|date} originString Original string or date to perform replacement on
 * @param {string} stringToReplace String to be replaced
 * @param {string} stringToReplaceWith String to replace with
 * @param {scope} globals Global scope object
 * @returns {string} String with all occurrences replaced
 */
function replaceString(originString, stringToReplace, stringToReplaceWith, globals) {
  // todo: add this function in the OOTB list
  if (!originString || !stringToReplace) {
    return "";
  }
  var stringToProcess = originString;
  // Convert Date to string if needed
  if (originString instanceof Date) {
    stringToProcess = originString.toString();
  }
  // Replace all occurrences using split and join for ES5 compatibility
  return stringToProcess.split(stringToReplace).join(stringToReplaceWith || '');
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
 * Get consent panel value
 * @param {object} consentPanel consent panel object
 * @returns {string} The consent panel value
 * TODO: This is a temporary function to get the consent panel value will be removed once issue fixed in invoke service
 */
function getConsentValue(consentPanel) {
  return consentPanel.$value;
}

/**
 * Handles the error state of the form
 * * @param {object} errorScrrenPanel Panel to show when there is a form error 
 * @param {scope} globals - An object containing read-only form instance, read-only target field instance and methods for form modifications.
 * @returns {void}
 */
function formErrorHandler(errorScrrenPanel, globals) {
  // hide the active panel and show the error screen panel
  globals.functions.setProperty(globals.form.$activeChild, {visible: false});
  globals.functions.setProperty(errorScrrenPanel, {visible: true});
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
  if(!etb) {
    return field.$value;
  }
  if(getProperty("isVRMFlag", globals) == "true") return field.$value;
  switch(maskingType) {
    case 'dateOfBirth':
      return maskDOB(field);
    case 'email':
      return maskEmail(field);
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


function maskDOB(field) {
  const dob = field.$value;
  if (dob) {
    // Split the date into parts
    const [year, month, day] = dob.split('-');
    // Get first digit of day and mask rest
    const maskedDay = day.charAt(0) + '*';
    // Mask month completely
    const maskedMonth = '**';
    // Get first two digits of year and mask rest
    const maskedYear = year.substring(0, 2) + '**';
    // Combine with separators
    return `${maskedDay} / ${maskedMonth} / ${maskedYear}`;
  }
  return dob || '';
}

// TODO: upate masking logic for all these functions
function maskEmail(field) {
  const email = (field.$value || '').toLowerCase();

  const [local, domain] = email.split('@');

  if (!local || !domain || local.length <= 4) {
    return email; // Not enough characters to mask
  }

  const firstTwo = local.substring(0, 2);
  const lastTwo = local.substring(local.length - 2);
  const maskedMiddle = '*'.repeat(local.length - 4);

  return `${firstTwo}${maskedMiddle}${lastTwo}@${domain}`;
}

function maskFullName(field) {
  const fullName = field.$value || '';
  if (!fullName) return '';

  const masked = fullName
    .split(' ')
    .map(word => {
      if (word.length <= 2) return word;
      return word.substring(0, 2) + '*'.repeat(word.length - 2);
    })
    .join(' ');

  return masked;
}

function maskAccountNumber(field) {
  return field.$value;
}

function maskPAN(field) {
  const pan = field.$value || '';
  if (!pan || pan.length <= 4) return pan; // Nothing to mask

  const firstTwo = pan.substring(0, 2);
  const lastTwo = pan.substring(pan.length - 2);
  const maskedMiddle = '*'.repeat(pan.length - 4);

  return firstTwo + maskedMiddle + lastTwo;
}

/**
* splits and populates the address
* @name splitAddress splits and populates the address
* @param {object} fullAddressField hidden field with full address
* @param {object} addressLine1 address line 1
* @param {object} addressLine2 address line 2
* @param {object} addressLine3 address line 3
* @param {number} splitSize length of each address lines
* @param {number} addressMaxLength max length of the address
* @param {scope} globals Global scope object
* @return {void} splits and sets the address fields
*/
function splitAddress(fullAddress, addressLine1, addressLine2, addressLine3, splitSize, addressMaxLength, globals) {

  let address = fullAddress.$value.trim();

  if (!address) return;

  // commas need to be removed
  address = address.replace(/,/g, '');

  // Get the full address string and truncate to 90 characters if needed
  if (address.length > addressMaxLength) {
    address = address.substring(0, addressMaxLength);
  }

  // Helper function to split string at last space before splitSize
  function splitAtLastSpace(str, maxLength) {
    if (str.length <= maxLength) {
      return str;
    }
    const lastSpace = str.substring(0, maxLength).lastIndexOf(' ');
    return lastSpace > 0 ? str.substring(0, lastSpace) : str.substring(0, maxLength);
  }

  // Split address into lines
  let remainingAddress = address;
  let line1 = splitAtLastSpace(remainingAddress, splitSize);
  remainingAddress = remainingAddress.substring(line1.length).trim();

  let line2 = splitAtLastSpace(remainingAddress, splitSize);
  remainingAddress = remainingAddress.substring(line2.length).trim();

  let line3 = remainingAddress;

  globals.functions.setProperty(addressLine1, { value: line1 });
  globals.functions.setProperty(addressLine2, { value: line2 });
  globals.functions.setProperty(addressLine3, { value: line3 });
}

/**
* formats the features array
* @name formatFeaturesArray 
* @param {array} featuresArray field whose value is to be masked
* @param {array} iconsArray icons array
* @return {array} filtered features array
*/
function formatFeaturesArray(featuresArray, iconsArray) {
  const blacklist = [
    "Link",
    "Account",
    "consent",
    "Product Codes",
    "Sub Product Codes"
  ];
  return featuresArray
    .filter(feature => !blacklist.includes(feature))
    .map(feature => ({ feature }));
}

/**
*  filters out the recommended accounts array and maps it to defined schema
* @name filterAccounts
* @param {array} accountsArray list of all available account types
* @param {array} recommededAccountNames array of accounts to be recommended
* @return {array} returns recommends accounts array
*/
function filterAccounts(accountsArray, recommededAccountNames) {

  return accountsArray.map(account => {
    // Create base object with accountVariantSelected
    const transformedAccount = {
      accountVariantSelected: account.Account || '',
      accountFeature: []
    };

    const blacklist = [
      "Link",
      "Account"
    ];

    // Convert each property (except Account and Link) into a feature object
    Object.entries(account).forEach(([key, value]) => {
      if (!blacklist.includes(key)) {
        transformedAccount.accountFeature.push({
          accountFeatureInfo: value
        });
      }
    });

    return transformedAccount;
  });
}


/**
 * computes account variants recommendations
 * @name computeRecommendations 
 * @param {array} accountsData array of account data
 * @param {array} recommendationsData recommended data
 * @param {scope} globals Global scope object
 * @returns {array} returns the filtered accounts data with recommendations
 */
function computeRecommendations(accountsData, recommendationsData, globals) {
  let matchingRecommendation;

  if(globals.form.$properties.utm_campaign === 'gigaccount') {
    return accountsData.slice(0, 1); // TODO: once bank provides data for GIGA that needs to be filtered and returned here.
  }

  try {
     // Calculate age from DOB
     const dob = globals.form.loginFragment.loginPanel.dobPanel.dateofbirth.$value;
     const income = globals.form.wizard.yourDetailsPanel.yourDetailsSubPanel.yourDetailsFragment.yourDetailsTabLayout.financialDetails.financialDetailsFragment.financialDetails.annualIncome.$value;
     const gender = globals.form.wizard.yourDetailsPanel.yourDetailsSubPanel.yourDetailsFragment.yourDetailsTabLayout.personalDetails.personalDetailsFragment.personalDetails.gender.$value;
     const occupation = globals.form.wizard.yourDetailsPanel.yourDetailsSubPanel.yourDetailsFragment.yourDetailsTabLayout.financialDetails.financialDetailsFragment.financialDetails.organizationType.$value;
     const rbiClass = globals.form.$properties.RBIClass[0];
   // Calculate age from DOB
     const age = calculateAge(dob, globals);

   // Find the matching recommendation bucket
   matchingRecommendation = recommendationsData.find(recommendation => {
     // Check income range
     const minIncome = parseFloat(recommendation["Min Income"]) || 0;
     const maxIncome = parseFloat(recommendation["Max Income"]) || Infinity;
     const incomeMatch = income >= minIncome && (maxIncome === Infinity || income <= maxIncome);

     // Check age range
     const minAge = parseInt(recommendation["Min Age"]) || 0;
     const maxAge = parseInt(recommendation["Max Age"]) || Infinity;
     const ageMatch = age >= minAge && (maxAge === Infinity || age <= maxAge);

     // Check gender
     const allowedGenders = recommendation["Gender"].split(',').map(g => g.trim().toLowerCase());
     const genderMatch = allowedGenders.includes("any") || allowedGenders.includes((gender || '').toLowerCase());

     // Check excluded occupation
     const excludedOccupations = recommendation["Excluded Occupation"].split(',').map(o => o.trim().toLowerCase()).filter(o => o);
     const occupationMatch = excludedOccupations.length === 0 || !excludedOccupations.includes((occupation || '').toLowerCase());

     // Check RBI class
     const allowedRbiClasses = recommendation["RBI Class"].split(',').map(c => c.trim());
     const rbiClassMatch = rbiClass === 'Any' || allowedRbiClasses.includes("Any") || allowedRbiClasses.includes(rbiClass); // TODO:RBIClass set to any needs to be change when mock is replaced

     return incomeMatch && ageMatch && genderMatch && occupationMatch && rbiClassMatch;
   });
  } catch (error) {

  }

  
  if (!matchingRecommendation) {
    // Return original accountsData if no matching recommendation found, need to discuss with team on this
    return accountsData;
  }

  // Extract priority values and filter out empty ones
  const priorities = [
    matchingRecommendation["Priority 1"],
    matchingRecommendation["Priority 2"],
    matchingRecommendation["Priority 3"],
    matchingRecommendation["Priority 4"]
  ].filter(priority => priority && priority.trim() !== "");
  // Filter accountsData to only include accounts that match the priorities
  const recommendedAccounts = accountsData.filter(account => {
    return priorities.some(priority => {
      // Check if account name matches any of the priority recommendations
      return account.Account && account.Account.toLowerCase().includes(priority.toLowerCase());
    });
  });

  // Sort accounts based on priority order
  recommendedAccounts.sort((a, b) => {
    const aPriority = priorities.findIndex(priority =>
      a.Account && a.Account.toLowerCase().includes(priority.toLowerCase())
    );
    const bPriority = priorities.findIndex(priority =>
      b.Account && b.Account.toLowerCase().includes(priority.toLowerCase())
    );

    // If both found, sort by priority index (lower index = higher priority)
    if (aPriority !== -1 && bPriority !== -1) {
      return aPriority - bPriority;
    }

    // If only one found, prioritize the found one
    if (aPriority !== -1) return -1;
    if (bPriority !== -1) return 1;

    // If neither found, maintain original order
    return 0;
  });

  return recommendedAccounts;
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
    [toKey]: generateImagePath(basePath,(item[fromKey] || ''), extension)
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

function validateAuthenticator(field, pattern, errMssg, type, globals){
  const fieldValue = field.$value;
  if(!fieldValue.match(pattern)){
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
 * populate dynamic consent data
 *
 * @param {Object} singleAccountField - single account card field.
 * @param {Object} consentPanel - Second array of objects.
 * @param {scope} globals
 * @returns {void}
 */
function populateDynamicConsent(singleAccountField, consentPanel, globals) {

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

// Note: This is a copy function from convertDateFormat, but with inputFormat and outputFormat as parameters.
// Requirement was realized later, and it was not possible to change the function signature, without manually updating this function everywhere in the rules. It was closed with Engg to make a copy function.
/**
 * Converts a date string from one format to another.
 * Supported format tokens: YYYY, YY, MM, DD
 *
 * @param {string} dateStr - The original date string (e.g., '2000-02-10').
 * @param {string} [inputFormat='YYYY-MM-DD'] - Desired input format (e.g., 'YYYY-MM-DD').
 * @param {string} [outputFormat='DD/MM/YYYY'] - Desired output format (e.g., 'DD/MM/YYYY').
 * @returns {string} - Reformatted date string (e.g., '10/02/2000').
 *
 * @example
 * transformDateFormat('2000-02-10'); // '10/02/2000'
 * transformDateFormat('2000-02-10', 'YYYY-MM-DD', 'DD/MM/YYYY') // '10/02/2000'
 * transformDateFormat('2000-02-10', 'DD/MM/YYYY', 'YYYY-MM-DD') // '2000-02-10'
 */
function transformDateFormat(dateStr, inputFormat = 'YYYY-MM-DD', outputFormat = 'DD/MM/YYYY') { // TODO: Needs to be a part of the product.
  if (dateStr === null || dateStr === undefined) {
    return '';
  }
  if(outputFormat === null || outputFormat === undefined) {
    outputFormat = 'DD/MM/YYYY';
  }
  if(inputFormat === null || inputFormat === undefined) {
    inputFormat = 'YYYY-MM-DD';
  }

  const dateMap = {};

  // Find positions of date components in input format
  const yyyyIndex = inputFormat.indexOf('YYYY');
  const yyIndex = inputFormat.indexOf('YY');
  const mmIndex = inputFormat.indexOf('MM');
  const ddIndex = inputFormat.indexOf('DD');

  if (yyyyIndex === -1 && yyIndex === -1 || mmIndex === -1 && ddIndex === -1) {
    return '';
  }
  // Extract values based on positions
  if (yyyyIndex !== -1) {
    dateMap['YYYY'] = dateStr.substring(yyyyIndex, yyyyIndex + 4);
  } else if (yyIndex !== -1) {
    dateMap['YY'] = dateStr.substring(yyIndex, yyIndex + 2);
  }

  dateMap['MM'] = dateStr.substring(mmIndex, mmIndex + 2);
  dateMap['DD'] = dateStr.substring(ddIndex, ddIndex + 2);

  return outputFormat
    .replace(/YYYY/, dateMap['YYYY'] || ('20' + dateMap['YY']))
    .replace(/YY/, dateMap['YY'] || dateMap['YYYY'].slice(-2))
    .replace(/MM/, dateMap['MM'])
    .replace(/DD/, dateMap['DD']);
}

/**
 * Validates if the selected self-employed duration does not exceed the actual duration since incorporation
 * @param {scope} globals - Global context object with utility functions like `globals.functions.setProperty`.
 * @returns {boolean} True if selected durationf is less than or equal to actual duration since incorporation, false otherwise
 */
function isSelfEmployedDurationInvalid(globals) {
  return true;
}

/**
 * Checks if all required OVD (Officially Valid Document) files are uploaded and valid
 * @param {scope} globals - Global scope object containing form data
 * @returns {boolean} True if all required files are uploaded and valid, false otherwise
 */
function enableOvdButton(globals) {
  return true;
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
 * regexTest(addressField, '(.)\\1{3,}', globals)
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
  return "Y";
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

  const normalizedKeyword = String(keyword || '').toLowerCase();
  return list.filter(item => {
    const propValue = String(item[prop] || '').toLowerCase();

    // Return true if the property either starts with OR contains the keyword
    if(normalizedKeyword === "numeric")
      // Note: This won't produce duplicates as each item is only included once in the filtered results
      return propValue.startsWith(normalizedKeyword) || propValue.includes(normalizedKeyword);
    else
      return propValue.startsWith(normalizedKeyword);
  });
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
 * Set a field property value
 * @param {object} field field or panel component to set the property on
 * @param {string} propertyName Name of the property to set
 * @param {any} propertyValue Value to set for the property
 * @param {number} timeDelay time delay
 * @param {scope} globals Global scope object
 */
function setFieldValueWithDelay(field, propertyName, propertyValue, timeDelay, globals){
  try {
    if(typeof window !== 'undefined') {
      window.setTimeout(()=>{
        globals.functions.setProperty(field, {
          [propertyName] : propertyValue
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
function createStateInfoObject(journeyState, journeyData, timeinfo){
  return (
    [{
      state: journeyState,
      stateInfo: journeyData,
      timeinfo: timeinfo ,
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
function setFormData(stringifiedFormData, globals){
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
 * Checks if a given value exists in a delimited string of values.
 *
 * @param {string} source - A delimited string (e.g., "404|500|403").
 * @param {string} target - The value to check for presence.
 * @param {string} [delimiter='|'] - The delimiter used in the source string.
 * @returns {boolean} - True if the target value exists in the list, false otherwise.
 *
 * @example
 * includesInDelimitedString('404|500|403', '500'); // true
 * includesInDelimitedString('404|500|403', '200'); // false
 */
function includesInDelimitedString(source, target, delimiter = '|') {
  if (typeof source !== 'string' || typeof target !== 'string') return false;

  const list = source.split(delimiter).map(str => str.trim());
  return list.includes(target.trim());
}

/**
 * Prepares and returns an array of SmartPay review details based on the exported global data.
 *
 * The function extracts authenticators depending on the selected flow type,
 * appends optional biller nickname if valid,
 * and adds specific fields based on whether the biller type is PAYEE or not.
 *
 * @param {Object} formData - An object containing the data.
 * @param {scope} globals - Global scope object
 *
 * @returns {array} smartPayDetails - Array of objects each containing:
 *   - parameter_name {string}: The name of the detail parameter (e.g., "Nickname", "Recharge Amount").
 *   - value {string}: The value associated with the parameter.
 */
function prefillSmartPayReviewDetails(formData, globals) {
  const data = typeof formData === 'string' ? JSON.parse(formData) : globals.functions.exportData();
  let smartPayDetails = [];

  // Step 1: Extract authenticators based on flow type
  const auths = cleanArray(data.selectedFlowType === "E"
    ? JSON.parse(data.selectedEnabledBillerdetailsRes).authenticators
    : JSON.parse(data.selectedAuthenticators));

  if (Array.isArray(auths)) {
    smartPayDetails.push(...auths);
  }

  // Step 2: Append Nickname if valid
  const isValidNickname = data.billerNickName && data.billerNickName !== "null";
  if (isValidNickname) {
    smartPayDetails.push({
      parameter_name: "Nickname",
      value: data.billerNickName
    });
  }

  // Step 3: Add PAYEE-specific or other biller type fields
  if (data.selectedBillerType === "PAYEE") {
    smartPayDetails.push(
      { parameter_name: "Recharge Amount", value: formatCurrency(data.rechargeAmount) },
      { parameter_name: "SmartPay Start Date", value: convertDateToFormat(data.smartPayStartDate, "yyyy-mm-dd", "dd/mm/yyyy") || "-" },
      { parameter_name: "Frequency", value: data.frequency || "-" }
    );
  } else {
    const billAmt = data.spLimitOptions !== "0" ? formatCurrency(data.spLimit)  : "Entire Bill Amount";
    smartPayDetails.push({
      parameter_name: "SmartPay Limit",
      value: billAmt
    });
  }

  smartPayDetails.push({
      parameter_name: "Payment Method",
      value: data.selectedPaymethodInReview
  });

  updateBillerUIProperties(data, globals)

  return smartPayDetails;
}

function updateBillerUIProperties(data, globals) {
  const section = globals.form.billerRegistrationSection.setUpSPPrePaidPostPaidSection.billerDetailsPanel.registeredBillerLogoWrapper;

  globals.functions.setProperty(section.registrationBillerName, { value: data.selectedBillerName });
  globals.functions.setProperty(
    section.registrationBillerCategoryPanel.registeredBillerCategory,
    { value: generateImagePath("/content/dam/hdfc/siccdc/billercategorylogo/", data.selectedBillerCategoryName, ".svg") }
  );
  globals.functions.setProperty(
    section.registrationBillerCategoryPanel.regsiteredBillerCategoryName,
    { value: data.selectedBillerCategoryName }
  );
  globals.functions.setProperty(
    globals.form.billerRegistrationSection.setUpSPPrePaidPostPaidSection.billerDetailsPanel.billerLogoRegistration,
    { value: data.selectedBillerLogo }
  );
  globals.functions.setProperty(
    globals.form.billerRegistrationSection.setUpSPPrePaidPostPaidSection.paymentMethod,
    { value: data.selectedPaymethodInReview }
  );
}

/**
 * Formats a given amount as Indian Rupees currency string (₹) with two decimals.
 * Accepts amount as number or numeric string.
 * If the input is not a valid number, returns the original input unmodified.
 *
 * @param {string|number} amount - The amount to format. Can be a number or a numeric string.
 * @returns {string} - Formatted currency string in INR (e.g., "₹890.00") or original input if invalid.
 */
function formatCurrency(amount) {
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return amount; // Return original if invalid number
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(numericAmount);
}

/**
 * Updates stateInfo with LG and LC code retention info (in-place, void)
 * Sets retention only if returnJourneyDate is within 30 days from today.
 * If stateInfo is not provided, it will initialize an empty object.
 *
 * @param {Date} returnJourneyDate - The date when journey should be retained
 * @param {Object} [stateInfo] - The object containing finalLgCode and finalLcCode; updated in place
 * @returns {void} - No return value.
 */
function putLgLcRetention(returnJourneyDate, stateInfo) {
  return;
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

/** 
* Masks the first 5 digits of the mobile number with *
* @param {*} mobileNumber
* @returns {string} returns the mobile number with first 5 digits masked
**/
function maskMobileNumber(mobileNumber) {
  if (!mobileNumber) {
    return '';
  }
  const value = mobileNumber.toString();
  // Mask first 5 digits and keep the rest
  return ` ${'*'.repeat(5)}${value.substring(5)}`;
}

/**
* checks if the productcode in utm is valid
* @param {array} accountsData array of account data
* @param {scope} globals Global scope object
*  @returns {boolean} prouctcode value if productcode is valid, else empty string
*/
function isValidProductCode(accountsData,globals){
return true;
}
/**
* Generates an array of application status information based on step name, user type, and source.
 * @param {string} stepName 
 * @param {string} userType 
 * @param {Date} timeStamp
 * @param {string} source 
*  @returns {array} of objects with stepName, userType, timeStamp and source
*/

function applicationStatusInfoArray(stepName, userType, timeStamp, source, globals) {
  const infoObject = [{
    stepName: stepName || '',
    userType: userType || '',
    timeStamp: new Date().toISOString(),
    source: source || ''
  }];

  try {
    const destination = globals?.form?.choiceAll?.hiddenDestinationType?.$value;
    const retryCount = globals?.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount?.$value;

    if (destination) {
      const destinationMap = {
        netbankingFetch: "Net Banking",
        statement: "Statement Upload",
        accountAggregator: "Account Aggregator",
      };
      infoObject[0].destination = destinationMap[destination];
    }
    if(retryCount){
      infoObject[0].retryCount = retryCount;
    }
  } catch (error) {
  }

  // Returning the array 
   return infoObject;
}

/**
 * Retrieves the user input value for a specific consent type from dynamic optional consents
 * @param {string} dataRefParam - data ref parameter
 * @returns {string} 
 */
function dataRefParamTrim(dataRefParam) {
  const formattedURLArray = dataRefParam.split('/').map(item => item.trim());
  return formattedURLArray[1]; 
}

/**
 * Retrieves the dataref parameter from URL and returns JID
 * @param {string} dataRefParam - data ref parameter
 * @returns {string} 
 */
function extractJIDFromUTM(dataRefParam) {
  const formattedURLArray = dataRefParam.split('/').map(item => item.trim());
  return formattedURLArray[1]; 
}

/**
 * Retrieves the consents and its values in Array of Objects
 * @param {string} consentState - consent state parameter 
 * @param {scope} globals - Global scope object
 * @returns {array} 
 */
function createConsentFormatData(consentState, globals) {
    let consents = [];
    let consentValues;
    if (consentState == "LandingPage") {
        consentValues = {
          "personalDataCaptureConsent" : globals.form.$properties.personalDataCaptureConsent,
          "personalizedOffersCaptureConsent" : globals.form.$properties.personalizedOffersCaptureConsent,
          "channelCaptureConsent" : globals.form.$properties.channelCaptureConsent
        };
    } else if(consentState == "PerfiosPage"){
      consentValues = {
         "personalDataPerfiosCaptureConsent" : 'Y'
        }
    }

    /* Store the array of objects */
    consents = Object.entries(consentValues).map(([consentName, consentValue]) => ({ [consentName]: consentValue }));

    return consents;
}

/**
 * Retrieves the first name from customer name
 * @param {string} customerName - customerName parameter 
 * @returns {string} 
 */
function getFirstNameFromCustName(customerName) {
  let firstName = customerName.trim().split(' ');
  return firstName[0] || ''; 
}

/**
 * Retrieves the last name from customer name
 * @param {string} customerName - customerName parameter 
 * @returns {string} 
 */
function getLastNameFromCustName(customerName) {
  let lastName = customerName.trim().split(' ').slice(1).join(' ') || '';
  return lastName;
}

/**
 * Prefill the binding data inside globals form Object
 * @param {string} stateInfoArray - data ref parameter 
 * @param {number} leadProfileID - leadProfileID
 * @param {scope} globals - Global scope object
 */
function formatStateInfo(stateInfoArray, leadProfileID, globals) {
 var latestStateData = {};
 let journeyState;
 if (stateInfoArray != null && stateInfoArray.length > 0) {
    latestStateData = JSON.parse(stateInfoArray[stateInfoArray.length - 1].stateInfo);
    globals.form.$properties.returnJourneyState = stateInfoArray[stateInfoArray.length - 1].state;
    journeyState = stateInfoArray[stateInfoArray.length - 1].state;
    globals.form.$properties.customerName = latestStateData.customerName;
    globals.form.$properties.gender = latestStateData.customerName;
    globals.form.$properties.dob = latestStateData.dob;
    globals.form.$properties.mob = latestStateData.RegisteredPhoneNum;
    globals.form.$properties.pan = latestStateData.panNumber;
    globals.form.$properties.offerAvailable = latestStateData.offerAvailable;
    globals.form.$properties.customerType = latestStateData.customerType;
    globals.form.$properties.existingCustomer = latestStateData.existingCustomer;
    globals.form.$properties.CPLCMFlag = latestStateData.CPLCMFlag;    
    globals.form.$properties.bjid = latestStateData.bankJourneyID;
    globals.form.$properties.pjid = latestStateData.partnerJourneyID;
    globals.form.$properties.identifierName = latestStateData.identifierName;
    globals.form.$properties.identifierValue = latestStateData.identifierValue;
    globals.form.$properties.personalDataCaptureConsent = latestStateData.personalDataCaptureConsent;
    globals.form.$properties.personalizedOffersCaptureConsent = latestStateData.personalizedOffersCaptureConsent;
    globals.form.$properties.channelCaptureConsent = latestStateData.channelCaptureConsent;
    
    if(latestStateData.loanAmountIPA !== null && latestStateData.loanAmountIPA !== undefined){
      globals.form.$properties.loanAmountIPA = latestStateData.loanAmountIPA;
      if(globals.form?.loanAmountIPA){
      globals.functions.setProperty(
        globals.form?.loanAmountIPA, { value: globals.form.$properties.loanAmountIPA }
      );
    }
      if(globals.form?.loanAmountIPACustomer){
        globals.functions.setProperty(
          globals.form?.loanAmountIPACustomer, { value: globals.form.$properties.loanAmountIPA }
        );
      }
    }
if(latestStateData.loanAmountIPACustomer !== null && latestStateData.loanAmountIPACustomer !== undefined){
	globals.form.$properties.loanAmountIPA = latestStateData.loanAmountIPACustomer;
	globals.functions.setProperty(
	globals.form?.loanAmountIPACustomer, { value: globals.form.$properties.loanAmountIPA }
	);
}

if(latestStateData.maxTenureIPA !== null && latestStateData.maxTenureIPA !== undefined){
      globals.form.$properties.maxTenureIPA = latestStateData.maxTenureIPA;
      if(globals.form?.maxTenureIPA){
      globals.functions.setProperty(
        globals.form?.maxTenureIPA, { value: globals.form.$properties.maxTenureIPA }
      );
      }
      if(globals.form?.maxTenureIPA_customer){
        globals.functions.setProperty(
          globals.form?.maxTenureIPA_customer, { value: globals.form.$properties.maxTenureIPA }
        );
      }
    }
if(latestStateData.maxTenureIPA_customer !== null && latestStateData.maxTenureIPA_customer !== undefined){
	globals.form.$properties.maxTenureIPA = latestStateData.maxTenureIPA_customer;
	globals.functions.setProperty(
	globals.form?.maxTenureIPA_customer, { value: globals.form.$properties.maxTenureIPA }
	);
}

if(latestStateData.IPA_tenure_loamAmt_map !== null && latestStateData.IPA_tenure_loamAmt_map !== undefined){
      globals.form.$properties.IPA_tenure_loamAmt_map = latestStateData.IPA_tenure_loamAmt_map;
      if(globals.form?.IPA_tenure_loamAmt_map){
      globals.functions.setProperty(
        globals.form?.IPA_tenure_loamAmt_map, { value: globals.form.$properties.IPA_tenure_loamAmt_map }
      );
    }
      if(globals.form?.IPA_tenure_loamAmt_map_customer){
        globals.functions.setProperty(
          globals.form?.IPA_tenure_loamAmt_map_customer, { value: globals.form.$properties.IPA_tenure_loamAmt_map }
        );
      }
    }
if(latestStateData.IPA_tenure_loamAmt_map_customer !== null && latestStateData.IPA_tenure_loamAmt_map_customer !== undefined){
	globals.form.$properties.IPA_tenure_loamAmt_map = latestStateData.IPA_tenure_loamAmt_map_customer;
	globals.functions.setProperty(
	globals.form?.IPA_tenure_loamAmt_map_customer, { value: globals.form.$properties.IPA_tenure_loamAmt_map }
	);
}

if(latestStateData.IPA_irr !== null && latestStateData.IPA_irr !== undefined){
      globals.form.$properties.IPA_irr = latestStateData.IPA_irr;
      if(globals.form?.IPA_irr){
      globals.functions.setProperty(
        globals.form?.IPA_irr, { value: globals.form.$properties.IPA_irr }
      );
    }
      if(globals.form?.IPA_irr_customer){
        globals.functions.setProperty(
          globals.form?.IPA_irr_customer, { value: globals.form.$properties.IPA_irr }
        );
      }
    }
if(latestStateData.IPA_irr_customer !== null && latestStateData.IPA_irr_customer !== undefined){
	globals.form.$properties.IPA_irr = latestStateData.IPA_irr_customer;
	globals.functions.setProperty(
	globals.form?.IPA_irr_customer, { value: globals.form.$properties.IPA_irr }
	);
}

if(latestStateData.IPA_irr !== null && latestStateData.IPA_irr !== undefined){
      globals.form.$properties.IPA_irr = latestStateData.IPA_irr;
      globals.functions.setProperty(
        globals.form?.IPA_irr, { value: globals.form.$properties.IPA_irr }
      );
      if(globals.form?.IPA_irr_customer){
        globals.functions.setProperty(
          globals.form?.IPA_irr_customer, { value: globals.form.$properties.IPA_irr }
        );
      }
    }
if(latestStateData.IPA_irr_customer !== null && latestStateData.IPA_irr_customer !== undefined){
	globals.form.$properties.IPA_irr = latestStateData.IPA_irr_customer;
	globals.functions.setProperty(
	globals.form?.IPA_irr_customer, { value: globals.form.$properties.IPA_irr }
	);
}

    if(latestStateData.perfiosCount > 0 && latestStateData.perfiosCount !== null && latestStateData.perfiosCount !== undefined){
      globals.functions.setProperty(
          globals.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount, { value: latestStateData.perfiosCount }
        );
    }
    if(latestStateData.perfiosRetryCount > 0 && latestStateData.perfiosRetryCount !== null && latestStateData.perfiosRetryCount !== undefined){
      globals.functions.setProperty(
          globals?.form?.hiddenPerfiosRetryCount, { value: latestStateData.perfiosRetryCount }
        );
    }
    

    globals.form.$properties.govIdProofReq = latestStateData.govIdProofReq; 
    globals.functions.setProperty(
      globals.form?.hiddenFieldsPanel?.govIdProofReq, { value: latestStateData.govIdProofReq}
    );

    /* Check for KYC_COMPLETE_SUCCESS state to set the aadhaarData hidden field */
    if(journeyState === "KYC_COMPLETE_SUCCESS"){
        /* Create aadhaarData object and populate fields */
        let aadhaarData = {};
        aadhaarData.aadhaarAddress = latestStateData.aadhaarAddress;
        aadhaarData.aadhaarCity = latestStateData.aadhaarCity;
        aadhaarData.aadhaarDOB = latestStateData.aadhaarDOB;
        aadhaarData.aadhaarGender = latestStateData.aadhaarGender;
        aadhaarData.aadhaarName = latestStateData.aadhaarName;
        aadhaarData.aadhaarPincode = latestStateData.aadhaarPincode;
        aadhaarData.aadhaarPost = latestStateData.aadhaarPost;
        aadhaarData.aadhaarState = latestStateData.aadhaarState;
        aadhaarData.aadhaarSubDist = latestStateData.aadhaarSubDist;
        aadhaarData.addressMatchPercentage = latestStateData.addressMatchPercentage;
        aadhaarData.ekycStatus = latestStateData.ekycStatus;
        aadhaarData.nameMatchPercentage = latestStateData.nameMatchPercentage;
        aadhaarData.ekycStatus = latestStateData.ekycStatus;

        /* Set the aadhaarData object to form hidden field */
        globals.functions.setProperty(
          globals.form?.hiddenFieldsPanel?.hiddenAadhaarData, { value: JSON.stringify(aadhaarData) }
        );
    }
 }
  globals.form.$properties.leadProfileID = leadProfileID;
}

/**
 * formats array of application status info 
 * @param {array} applicationStatusInfo - arrayInfo parameter 
 * @param {scope} globals - Global scope object
 */
function rmDashBoardArrayFormat(applicationStatusInfo, globals){
  const stepMapping = {
    "Link Shared": "consentLinkShared",
    "Consent Given": "consentGiven", 
    "KYC Initiated": "kycInitiated",
    "KYC Completed": "kycCompleted",
    "KYC Completed Error": "kycCompletedErrorCheck"
  };
  
  // Iterate only through the items that exist in applicationStatusInfo
  applicationStatusInfo.forEach((statusItem) => {
    const section = stepMapping[statusItem.stepName];
    
    if (section) {
      const sectionObj = globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.[`${section}Section`];
      
      if (sectionObj) {
        // Handle checkbox field
        const checkboxField = sectionObj[`${section}Check`];
        if (checkboxField) {
          checkboxField.$value = "yes";
          globals.functions.setProperty(checkboxField, {
            valid: true,
            checked: true,
          });
        }

        // Handle timestamp field
        const timeField = sectionObj[`${section}Time`];
        if (timeField && statusItem.timeStamp) {
          const formattedTime = getRJDateFormat(statusItem.timeStamp);
          const wrappedTime = `<p><p>${formattedTime}</p></p>`;
          globals.functions.setProperty(timeField, {
            value: wrappedTime,
            visible: true,
          });
        }
      }else {
        globals.functions.setProperty(globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.kycCompletedErrorCheck, { visible: true });
        globals.functions.setProperty(globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.kycCompletedSection, { visible: false });
      }
    }
  });
}

/* Custom functions of Assisted Journey goes in this block 

/**
 * Handles the reinitiate journey flow based on the journey state
 * @param {scope} globals - Global scope object
 */
function assetsAssistedReinitiateJourney(globals) {
  let initiatedJourneyState = globals.form.$properties.journeyState || '';

  /* Default hide the OTP Section */
  globals.functions.setProperty(
    globals.form?.otpValidationWrapper, { visible: false }
  );

  //show EKYC selection page
  if(initiatedJourneyState === "RM_REINITIATE_EKYC_CUSTOMER_LINK"){
    globals.functions.setProperty(
      globals.form?.kycConsentWrapper, { visible: true }
    );
  }
  // show Perfios choice All page
  else if(initiatedJourneyState === "RM_RE_SHARED_PERFIOS_LINK" || initiatedJourneyState === "RM_SHARED_PERFIOS_LINK"){
    globals.functions.setProperty(
      globals.form?.choiceAll, { visible: true }
    );
  }
}

/**
* Generates an array of application status information based on step name, user type, and source.
 * @param {string} stepName 
 * @param {string} userType 
 * @param {Date} timeStamp
 * @param {string} source 
*  @returns {array} of objects with stepName, userType, timeStamp and source
*/

function assetsAssistedApplicationStatusInfoArray(stepName, userType, timeStamp, source) {
  const infoObject = [{
    stepName: stepName || '',
    userType: userType || '',
    timeStamp: new Date().toISOString(),
    source: source || ''
  }];

  // Check for hidden field and add stored data if it exists
  try {
    const hiddenField = document.querySelector('input[name="tenSecondHiddenData"]');
    
    if (hiddenField && hiddenField.value) {
      const storedData = JSON.parse(hiddenField.value);
      infoObject[0] = { ...infoObject[0], ...storedData };
    }
  } catch (error) {
    // Silently continue if field doesn't exist or data can't be parsed
  }

  // Returning the array 
   return infoObject;
}
  
function assetsAssistedValidateEmail(emailField) {
  const email = document.querySelector('#emailinput-b42f2801ba');
  
  if (!email) return false;

  // Focus the email field
  email.focus();
  
  const userEmail = email.value || "";
  if(userEmail.trim() === ""){
    return false;
  }
  
  let userName = userEmail;
  if(userEmail.includes('@')){
     userName = userEmail.split('@')[0];
  }

  // Set new email value
  email.value = userName + emailField;

  // Trigger validation like typing
  email.dispatchEvent(new Event('input', { bubbles: true }));
  email.dispatchEvent(new Event('change', { bubbles: true }));

  return true;
}

function assetsAssistedWorkEmailValidation(emailField) {

}

/**
 * Handles request retries with up to 2 retry attempts
 * @param {function} requestFn - The request function to execute
 * @param {scope} globals - Global scope object
 * @return {Promise} A promise that resolves with the response or rejects after all retries
 */
async function retryHandler(requestFn, globals) {
  const MAX_RETRIES = globals.form.hiddenFieldsPanel.retryCount.$value;
  const retryInterval = globals.form.hiddenFieldsPanel.retryInterval.$value;
  var ASE_MAX_RETRIES = globals.form.hiddenFieldsPanel.aseRetryCount.$value;
  var aseRetryInterval = globals.form.hiddenFieldsPanel.aseRetryInterval.$value;
  var originalRequestURL = "";
  var aseResponse = {};
  
  /**
   * Attempts the request with retry metadata
   * @param {number} retryCount - Current retry attempt count
   * @return {Promise} The request promise
   */
  function attemptRequest(retryCount = 0) {
    // Execute the request with retry metadata if this is a retry
    const requestOptions = MAX_RETRIES > 0 ? {
      headers: {
        'X-Retry': 'true',
        'X-Retry-Count': retryCount.toString(),
        'X-Retry-Time': new Date().toISOString()
      },
      body: {
        retry: true,
        retryCount: retryCount,
        timestamp: Date.now()
      }
    } : undefined;
    return requestFn(requestOptions)
      .then(function (response) {
        originalRequestURL = response.originalRequest.url;
        if (response.originalRequest.url.includes('getApplicationStatus')) {
          throw new Error('Request failed with status ' + response.status);
        }
         else if (response.originalRequest.url.includes('actionStatusInquiry')) {
          aseResponse = response;
          if(ASE_MAX_RETRIES == null && aseRetryInterval == null){
            ASE_MAX_RETRIES = globals.form.hiddenFieldsPanel.aseRetryCount.$value;
            aseRetryInterval = globals.form.hiddenFieldsPanel.aseRetryInterval.$value;
          }
          if ((response.body.hasOwnProperty("responseString") && response.body.responseString !== null) && response.body.responseString.STP_Status.toLowerCase() !== "soft reject" && response.body.responseString.STP_Status.toLowerCase() !== "reject") {
            if(response.originalRequest.body.requestString.action === "GetIncomeBasedOffer-0" && response.body.responseString.PERF_ERROR_DESC.toUpperCase() !== "SUCCESS" && !response.body.responseString.FILLER5.split(',').includes("OFFERTYPE_BUREAU")) {
              retryCount = -1;
              ASE_MAX_RETRIES = "6";
              response.originalRequest.body.requestString.action = "GetBureauOffer";
              throw new Error('Request failed with status ' + response.status);
            }else if(response.originalRequest.body.requestString.action === "GetIncomeBasedOffer-1" && response.body.responseString.PERF_ERROR_DESC.toUpperCase() !== "SUCCESS"){
              if (globals.form.$properties.bre2Invoked && globals.form.$properties.bre2Invoked === "true") {
                  globals.functions.setProperty(globals.form.bre2offerscreenpanel, { visible: false });
                  if((globals?.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount && globals?.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount?.$value < 3) || (globals?.form?.hiddenPerfiosRetryCount && globals?.form?.hiddenPerfiosRetryCount?.$value < 3)){
	                  const retryCount = globals?.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount?.$value || globals?.form?.hiddenPerfiosRetryCount?.$value;
	                  const wrappedretryCount = `<p><p>Income e-Verification Failed ${retryCount}/3`
                    globals.functions.setProperty(globals.form.reinitiateincomeverificationPanel, { visible: true });
                    globals.functions.setProperty(globals.form.verificationButtonPanel.reVerificationButton, { visible: true });
                    globals.functions.setProperty(globals.form.verificationButtonPanel.skipVerification, { visible: true });                    
                  }else{
                    globals.functions.setProperty(globals.form.loanOfferScreen, { visible: true });
                    globals.form.$properties.screenStatus = "showIPAScreen";
                    globals.functions.setProperty(globals.form.loanOfferScreen.loanDetailAndDescription.offerScreenBottomPage.loanSummarySection.emiDetailsPanel.emiBottonSectionWrapper.emiBottomSection, { visible: false });
                    globals.functions.setProperty(globals.form.loanOfferScreen.loanDetailAndDescription.offerScreenBottomPage.loanSummarySection.emiDetailsPanel.emiBottonSectionWrapper.emiRecalculateOfferCTA, { visible: false });
                    globals.functions.setProperty(globals.form.loanOfferScreen.loanDetailAndDescription.offerScreenBottomPage.loanSummarySection.emiDetailsPanel.instantDisbursementPanel.instantDisbursementText, { visible: false });
                    assetsAssistedGetIPALoanAndTenure(globals);
                    populateIPALoanDetails(globals);
                  }
                }
            }
            else if (response.body.responseString.PERF_ERROR_DESC.toUpperCase() === "SUCCESS" || (response.body.responseString.FILLER5.split(',').includes("OFFERTYPE_BUREAU") &&
              (response.body.responseString.STP_Status.toLowerCase() === "yes"))) {
              globals.form.$properties.perfiosAccountNumber = response.body.responseString.accountNumber;
              if (response.body.responseString.hasOwnProperty("OFFER_AMOUNT") && response.body.responseString.OFFER_AMOUNT[response.body.responseString.OFFER_AMOUNT.length - 1].offerAmount !== 0) {
                globals.form.$properties.breOfferIdentificationFlag = setBREOfferIdentificationFlag(response.body.responseString);
                if (globals.form.$properties.bre2Invoked && globals.form.$properties.bre2Invoked === "true") {
                  globals.form.$properties.bre2Response = saveBreResponse(response.body.responseString);
                } else {
                  globals.form.$properties.bre1Response = saveBreResponse(response.body.responseString);
                }
                if (response.originalRequest.body.requestString.action === "GetIncomeBasedOffer-0" || response.originalRequest.body.requestString.action === "GetBureauOffer") {
                    globals.form.$properties.screenStatus = "bureauOffer";
                    globals.functions.setProperty(globals.form.analysingCustomerCreditPopup, { visible: false });
                    assetsAssistedUpdateRiskOMeterData(response,globals);
                    globals.functions.setProperty(globals.form.loanRiskoMeterPopup, { visible: true });
                  return;
                }else{
                  globals.functions.setProperty(globals.form.bre2offerscreenpanel, { visible: false });
                  globals.functions.setProperty(globals.form.loanOfferScreen, { visible: true });
                  assetsAssistedSetLoanSlider(globals.form.$properties.bre2Response,globals);
                }
              } else {
                if (response.originalRequest.body.requestString.action === "GetBureauOffer") {
                  globals.form.$properties.screenStatus = "incomeVerification";
                  globals.functions.setProperty(globals.form.analysingCustomerCreditPopup, { visible: false });
                  assetsAssistedUpdateRiskOMeterData(response,globals);
                  globals.functions.setProperty(globals.form.loanRiskoMeterPopup, { visible: true });
                  return;
                } else if (response.originalRequest.body.requestString.action === "GetIncomeBasedOffer-0") {
                  retryCount = -1;
                  ASE_MAX_RETRIES = "6";
                  response.originalRequest.body.requestString.action = "GetBureauOffer";
                  throw new Error('Request failed with status ' + response.status);
                }
              }
            } else if (response.originalRequest.body.requestString.action === "GetIncomeBasedOffer-0") {
              retryCount = -1;
              ASE_MAX_RETRIES = "6";
              response.originalRequest.body.requestString.action = "GetBureauOffer";
              throw new Error('Request failed with status ' + response.status);
            } else if (response.originalRequest.body.requestString.action === "GetBureauOffer" && globals.form.hiddenFieldsPanel.isFIPInitiated.$value == "false") {
                globals.form.$properties.screenStatus = "incomeVerification";
                globals.functions.setProperty(globals.form.analysingCustomerCreditPopup, { visible: false });
                assetsAssistedUpdateRiskOMeterData(response,globals);
                globals.functions.setProperty(globals.form.loanRiskoMeterPopup, { visible: true });
              return;
            }
          } else {
            if((retryCount == (ASE_MAX_RETRIES - 1) && globals.form.hiddenFieldsPanel.isFIPInitiated.$value == "true" &&
                response.originalRequest.body.requestString.action === "GetIncomeBasedOffer-0") && !(response.body.hasOwnProperty("responseString") && response.body.responseString !== null)){
                retryCount = -1;
                ASE_MAX_RETRIES = "6";
                response.originalRequest.body.requestString.action = "GetBureauOffer";
                throw new Error('Request failed with status ' + response.status);
            }else if(!response.body.hasOwnProperty("responseString") || (response.body.responseString == null && response.body.responseCode === "RE002")){
                throw new Error('Request failed with status ' + response.status);
            }
            else{
            globals.form.$properties.STP_Status = response.body.responseString.STP_Status.toLowerCase();
            globals.form.$properties.screenStatus = "showIPAScreen";
            if (globals.form.$properties.bre2Invoked && globals.form.$properties.bre2Invoked === "true") {
              globals.functions.setProperty(globals.form.bre2offerscreenpanel, { visible: false });
              if((globals?.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount && globals?.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount?.$value < 3) || (globals?.form?.hiddenPerfiosRetryCount && globals?.form?.hiddenPerfiosRetryCount?.$value < 3)){
                const retryCount = globals?.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount?.$value || globals?.form?.hiddenPerfiosRetryCount?.$value;
	              const wrappedretryCount = `<p><p>Income e-Verification Failed ${retryCount}/3`
                globals.functions.setProperty(globals.form.reinitiateincomeverificationPanel, { visible: true });
                globals.functions.setProperty(globals.form.verificationButtonPanel.reVerificationButton, { visible: true });
                globals.functions.setProperty(globals.form.verificationButtonPanel.skipVerification, { visible: true });
              }else{
                globals.functions.setProperty(globals.form.errorScrrenPanel, { visible: true });
              }
            } else {
              globals.functions.setProperty(globals.form.analysingCustomerCreditPopup, { visible: false });
              assetsAssistedUpdateRiskOMeterData(response,globals);
              globals.functions.setProperty(globals.form.loanRiskoMeterPopup, { visible: true });
            }
            return;
          }
        }
        }
        return response;
      })
      .catch(function (error) {
        if (originalRequestURL.includes("actionStatusInquiry")) {
          if (ASE_MAX_RETRIES === "-1") {
            // Infinite retries 
            return new Promise(function (resolve) {
              setTimeout(resolve, aseRetryInterval);
            }).then(function () {
              return attemptRequest(retryCount + 1);
            });

          } else if (retryCount < ASE_MAX_RETRIES - 1) {

            // Add exponential backoff delay

            const delay = aseRetryInterval;
            return new Promise(function (resolve) {
              setTimeout(resolve, delay);
            }).then(function () {
              return attemptRequest(retryCount + 1);
            });
          } else {
            if (globals.form.$properties.bre2Invoked && globals.form.$properties.bre2Invoked === "true") {
                assetsAssistedTriggerLSEAPI(aseResponse.originalRequest.body.requestString,globals, "BRE2_Callback_From_EL_Server");
            } else {
              globals.form.$properties.screenStatus = "incomeVerification";
              globals.functions.setProperty(globals.form.analysingCustomerCreditPopup, { visible: false });
              assetsAssistedUpdateRiskOMeterData(aseResponse,globals);
              globals.functions.setProperty(globals.form.loanRiskoMeterPopup, { visible: true });
            }
            return;
            // All retries exhausted, reject with the final error
            //throw new Error('Request failed after ' + (ASE_MAX_RETRIES + 1) + ' attempts: ' + error.message);
          }
        } else {
          if (MAX_RETRIES === "-1") {
            // Infinite retries 
            return new Promise(function (resolve) {
              setTimeout(resolve, retryInterval * 1000);
            }).then(function () {
              return attemptRequest(retryCount + 1);
            });

          } else if (retryCount < MAX_RETRIES - 1) {

            // Add exponential backoff delay

            const delay = retryInterval * 1000;
            return new Promise(function (resolve) {
              setTimeout(resolve, delay);
            }).then(function () {
              return attemptRequest(retryCount + 1);
            });
          } else {
            // All retries exhausted, reject with the final error
            throw new Error('Request failed after ' + (MAX_RETRIES + 1) + ' attempts: ' + error.message);
          }
        }
      });
  }
  // Start the first attempt
  return attemptRequest();
}

/**
 * Retrieves the user input value for a specific consent type from dynamic optional consents
 * @param {string} dataRefParam - data ref parameter 
 * @param {scope} globals - Global scope object
 * @returns {array} 
 */
function assetsAssistedDataRefParamTrim(dataRefParam, globals) {
  const formattedURLArray = dataRefParam.split('/').map(item => item.trim());
  return formattedURLArray[1]; 
}


/**
 * Prefill the binding data inside globals form Object
 * @param {string} stateInfoArray - data ref parameter 
 * @param {number} leadProfileID - leadProfileID
 * @param {scope} globals - Global scope object
 */
function assetsAssistedFormatStateInfo(stateInfoArray, leadProfileID, globals) {
 var latestStateData = {};
 if (stateInfoArray != null && stateInfoArray.length > 0) {
    latestStateData = JSON.parse(stateInfoArray[stateInfoArray.length - 1].stateInfo);
    globals.form.$properties.customerName = latestStateData.customerName;
    globals.form.$properties.gender = latestStateData.customerName;
    globals.form.$properties.dob = latestStateData.dob;
    globals.form.$properties.mob = latestStateData.RegisteredPhoneNum;
    globals.form.$properties.pan = latestStateData.panNumber;
    globals.form.$properties.offerAvailable = latestStateData.offerAvailable;
    globals.form.$properties.customerType = latestStateData.customerType;
    globals.form.$properties.existingCustomer = latestStateData.existingCustomer;
    globals.form.$properties.CPLCMFlag = latestStateData.CPLCMFlag;    
    globals.form.hiddenFieldsPanel.hiddenMobileNumber.$value = latestStateData.RegisteredPhoneNum;
    globals.form.$properties.bankJourneyID = latestStateData.bankJourneyID;
    globals.form.$properties.partnerJourneyID = latestStateData.partnerJourneyID;
    globals.form.$properties.identifierName = latestStateData.identifierName;
    globals.form.$properties.identifierValue = latestStateData.identifierValue;
 }
  globals.form.$properties.leadProfileID = leadProfileID;
}

/**
 * formats array of application status info 
 * @param {array} applicationStatusInfo - arrayInfo parameter 
 * @param {scope} globals - Global scope object
 */
function assetsAssistedRMDashBoardArrayFormat(applicationStatusInfo, globals){
  const stepMapping = {
    "Link Shared": "consentLinkShared",
    "Consent Given": "consentGiven",
    "Consent Given Error" : "consentLinkSharedError",
    "KYC Initiated": "kycInitiated",
    "KYC Completed": "kycCompleted",
    "KYC Completed Error": "kycCompletedErrorCheck"
  };

  const stepMappingCustomerDetails = {
    "Personal Details Entered": "rmPersonalDetails",
    "Employment Details Entered": "rmEmploymentDetails",
    "Offer Shared": "rmOfferShared",
    "Offer Accepted": "rmOfferAccepted"
  };

  const stepMappingTenSecondLoan = {
    "Ten Second Loan Trigger": "tenSecondOfferLoan"
  };

  const stepMappingLoanOffer = {
    "Income EVerification": "loanOfferincomeEVerification",
    "Offer Shared": "loanOfferShared"
  };

  // Check if either Personal Details or Employment Details are present
  const hasPersonalDetails = applicationStatusInfo.some(item => item.stepName === "Personal Details Entered");
  const hasEmploymentDetails = applicationStatusInfo.some(item => item.stepName === "Employment Details Entered");
  const shouldTickBothCustomerDetails = hasPersonalDetails || hasEmploymentDetails;
  let statusStepName;

  // Iterate only through the items that exist in applicationStatusInfo
  applicationStatusInfo.forEach((statusItem) => {
    const section = stepMapping[statusItem.stepName];
    const customerDetailSection = stepMappingCustomerDetails[statusItem.stepName];
    statusStepName = statusItem.stepName;
    
    if (section) {
      const sectionObj = globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.[`${section}Section`];
      
      if (sectionObj) {
        // Handle checkbox field
        const checkboxField = sectionObj[`${section}Check`];
        if (checkboxField) {
          checkboxField.$value = "yes";
          globals.functions.setProperty(checkboxField, {
            valid: true,
            checked: true,
          });
        }

        // Handle timestamp field
        const timeField = sectionObj[`${section}Time`];
        if (timeField && statusItem.timeStamp) {
          const formattedTime = getRJDateFormat(statusItem.timeStamp);
          const wrappedTime = `<p><p>${formattedTime}</p></p>`;
          globals.functions.setProperty(timeField, {
            value: wrappedTime,
            visible: true,
          });
        }

        if(statusItem.stepName === "KYC Completed"){
          globals.functions.setProperty(globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.kycCompletedErrorCheck, { visible: false });
          globals.functions.setProperty(globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.kycCompletedSection, { visible: true });
          globals.functions.setProperty(globals.form?.rmDashboardWrapper.rmDashboardSection.rmConsentWrapper?.rmConsentStatusSection?.reshareCountDownTimerSection?.consentLinkExpiryTimer, { visible: false });
          globals.functions.setProperty(globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.reshareCountDownTimerSection?.rmReInitiateKYCLink, { visible: false });
        }

      } else {
        if(statusItem.stepName === "KYC Completed Error"){
          globals.functions.setProperty(globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.kycCompletedErrorCheck, { visible: true });
          globals.functions.setProperty(globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.kycCompletedSection, { visible: false });
        }
        if(statusItem.stepName === "Consent Given Error"){
          globals.functions.setProperty(globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.consentLinkSharedError, { visible: true });
          globals.functions.setProperty(globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.consentGivenSection, { visible: false });
        }
      }
    }
    
    // Handle customer details section (Next Steps)
    if (customerDetailSection) {
      const nextSectionWrapper = globals.form?.rmDashboardWrapper?.rmDashboardSection?.nextSectionMainWrapper?.nextSectionWrapper;
      const sectionObj = nextSectionWrapper?.[`${customerDetailSection}Section`];
      
      if (sectionObj) {
        // Handle checkbox field
        const checkboxField = sectionObj[`${customerDetailSection}Check`];
        if (checkboxField) {
          checkboxField.$value = "yes";
          globals.functions.setProperty(checkboxField, {
            valid: true,
            checked: true,
          });
        }

        // Handle timestamp field
        const timeField = sectionObj[`${customerDetailSection}CheckTime`];
        if (timeField && statusItem.timeStamp) {
          const formattedTime = getRJDateFormat(statusItem.timeStamp);
          const wrappedTime = `<p><p>${formattedTime}</p></p>`;
          globals.functions.setProperty(timeField, {
            value: wrappedTime,
            visible: true,
          });
        }
      }
    }

    // Handle ten second loan section
    const tenSecondLoanSection = stepMappingTenSecondLoan[statusItem.stepName];
    if (tenSecondLoanSection) {
      // Use actual API data from statusItem
      const testOfferAmount = statusItem.offerAmount;
      const testRedirectUrl = statusItem.redirectUrl;
      const rateOfInterest = statusItem.rateOfInterest;
      
      // Check if we have valid data from API
      if (testOfferAmount > 0 && testRedirectUrl && testRedirectUrl.trim() !== '') {
        // Access the ten second loan wrapper
        const tenSecondOfferWrapper = globals.form?.tenSecondOfferLoanWrapper ||
          globals.form?.rmDashboardWrapper?.rmDashboardSection?.tenSecondOfferLoanWrapper ||
          globals.form?.rmDashboardWrapper?.tenSecondOfferLoanWrapper;
        
        if (tenSecondOfferWrapper) {
          // Show the ten second loan wrapper
          globals.functions.setProperty(tenSecondOfferWrapper, { visible: true });
          
          const tenSecondOfferLoan = tenSecondOfferWrapper.tenSecondOfferLoan;
          const consentSection = tenSecondOfferLoan?.consentLinkSharedSection;
          
          if (consentSection) {
            // Update pre-approved limit checkbox with offer amount
            const preApprovedLimit = consentSection.preApprovedLimit;
            if (preApprovedLimit) {
              const formattedAmount = new Intl.NumberFormat('en-IN').format(testOfferAmount);
              preApprovedLimit.$value = "on";
              globals.functions.setProperty(preApprovedLimit, { 
                value: "on",
                checked: true,
                valid: true,
                label: `Pre-Approved (₹${formattedAmount}, ROI ${rateOfInterest})`
              });
              
              // Also set the label directly on the DOM element as backup
              const labelElement = document.querySelector('label[for="checkbox-fa68162fe8"]');
              if (labelElement) {
                labelElement.textContent = `Pre-Approved (₹${formattedAmount}, ROI ${rateOfInterest})`;
                labelElement.setAttribute('data-visible', 'true');
              }
            }

            // Show and enable the share link button
            const shareLinkButton = consentSection.shareLinkTenSecLoan;
            if (shareLinkButton) {
              globals.functions.setProperty(shareLinkButton, { 
                visible: true,
                enabled: true
              });
            }
          }

          // Store actual API data
          globals.form.$properties.tenSecondLoanOfferAmount = testOfferAmount;
          globals.form.$properties.tenSecondLoanRedirectUrl = testRedirectUrl;
          globals.form.$properties.tenSecondLoanOfferType = statusItem.offerType;
          globals.form.$properties.tenSecondLoanCustomerOfferType = statusItem.customerOfferType;
        }
      }
    }

    // Handle loan offer section
    const loanOfferSection = stepMappingLoanOffer[statusItem.stepName];
    if (loanOfferSection) {
      const loanOfferWrapper = globals.form?.loanOfferWrapper ||
        globals.form?.rmDashboardWrapper?.rmDashboardSection?.loanOfferWrapper ||
        globals.form?.rmDashboardWrapper?.loanOfferWrapper;
      
      if (loanOfferWrapper) {
        const loanOfferSectionObj = loanOfferWrapper?.loanOfferSection;
        
        if (loanOfferSectionObj) {
          let sectionObj;
          
          if (statusItem.stepName === "Income EVerification") {
            sectionObj = loanOfferSectionObj.LoanOfferIncomeEVerificationSection;
          } else if (statusItem.stepName === "Offer Shared") {
            sectionObj = loanOfferSectionObj.loanofferSharedSection || 
                        loanOfferSectionObj.loanOfferSharedSection ||
                        loanOfferSectionObj.loanoffersharedsection;
          }
          
          if (sectionObj) {
            // Handle checkbox field
            const checkboxFieldName = statusItem.stepName === "Offer Shared" ? "loanOfferSharedCheck" : `${loanOfferSection}Check`;
            const checkboxField = sectionObj[checkboxFieldName];
            
            if (checkboxField) {
              checkboxField.$value = "yes";
              globals.functions.setProperty(checkboxField, {
                valid: true,
                checked: true,
              });
            }
            
            if ( statusItem.stepName === 'Income EVerification' && statusItem.timeStamp) {
              const formattedTime = getRJDateFormat(statusItem.timeStamp);
              const wrappedTime = `<p><p>${formattedTime}</p></p>`;
              globals.functions.setProperty(globals.form.rmDashboardWrapper.rmDashboardSection.loanOfferWrapper.loanOfferSection.LoanOfferIncomeEVerificationSection.loanOfferIncomeEVerificationTime, {
                value: wrappedTime,
                visible: true,
              });
            }
            if(statusItem.stepName === "Offer Shared" && statusItem.destination){
              const wrappedDestination = `<p><p>Mode - ${statusItem.destination}</p></p>`
              globals.functions.setProperty(globals.form.rmDashboardWrapper.rmDashboardSection.loanOfferWrapper.loanOfferSection.loanofferSharedSection.offerSharedMode, {
                value: wrappedDestination,
                visible: true,
              });
            }
            if(statusItem.stepName === "Offer Shared" && statusItem.retryCount){
              const wrappedretryCount = `<p><p>Attempt - ${statusItem.retryCount}</p></p>`
              globals.functions.setProperty(globals.form.rmDashboardWrapper.rmDashboardSection.loanOfferWrapper.loanOfferSection.loanofferSharedSection.offerSharedAttempt, {
                value: wrappedretryCount,
                visible: true,
              });
              if(statusItem.retryCount === 3){
                globals.functions.setProperty(globals.form.rmDashboardWrapper.rmDashboardSection.loanOfferWrapper.loanOfferSection.loanofferSharedSection.loanOfferSharedErrorCheck, { visible: true });
                globals.functions.setProperty(globals.form.rmDashboardWrapper.rmDashboardSection.loanOfferWrapper.loanOfferSection.loanofferSharedSection.loanOfferSharedCheck, { visible: false });
              } else{
                globals.functions.setProperty(globals.form.rmDashboardWrapper.rmDashboardSection.loanOfferWrapper.loanOfferSection.loanofferSharedSection.loanOfferSharedCheck, { visible: true });
                globals.functions.setProperty(globals.form.rmDashboardWrapper.rmDashboardSection.loanOfferWrapper.loanOfferSection.loanofferSharedSection.loanOfferSharedErrorCheck, { visible: false });
              }
            }
          }
        }
      }
    }
  });

  // If either Personal Details or Employment Details is present, tick both checkboxes
  if (shouldTickBothCustomerDetails) {
    const nextSectionWrapper = globals.form?.rmDashboardWrapper?.rmDashboardSection?.nextSectionMainWrapper?.nextSectionWrapper;

    // Tick both Personal Details and Employment Details checkboxes
    ["rmPersonalDetails", "rmEmploymentDetails"].forEach(sectionName => {
      const sectionObj = nextSectionWrapper?.[`${sectionName}Section`];

      if (sectionObj) {
        // Handle checkbox field
        const checkboxField = sectionObj[`${sectionName}Check`];
        if (checkboxField) {
          checkboxField.$value = "yes";
          globals.functions.setProperty(checkboxField, {
            valid: true,
            checked: true,
          });
        }

        // Handle timestamp field - use the timestamp from the available item
        const timeField = sectionObj[`${sectionName}CheckTime`];
        if (timeField) {
          const relevantItem = applicationStatusInfo.find(item =>
            item.stepName === "Personal Details Entered" || item.stepName === "Employment Details Entered"
          );

          if (relevantItem && relevantItem.timeStamp) {
            const formattedTime = getRJDateFormat(relevantItem.timeStamp);
            const wrappedTime = `<p><p>${formattedTime}</p></p>`;
            globals.functions.setProperty(timeField, {
              value: wrappedTime,
              visible: true,
            });
          }
        }
      }
    });
  }

  // Helper function to check if checkbox is ticked
  const isCheckboxTicked = (checkbox) => {
    return checkbox?.$value === "yes" || checkbox?.$value === "on" || checkbox?.checked === true;
  };

  // Check completion status
  const consentSection = globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection;
  
  // Check if checkboxes are ticked
  const isLinkSharedTicked = isCheckboxTicked(consentSection?.consentLinkSharedSection?.consentLinkSharedCheck);
  const isConsentGivenTicked = isCheckboxTicked(consentSection?.consentGivenSection?.consentGivenCheck);

  // Show Next Steps if both checkboxes are ticked
  const showNextSectionWrapper = isLinkSharedTicked && isConsentGivenTicked;

  if(showNextSectionWrapper){
    globals.functions.setProperty(globals.form?.rmDashboardWrapper.rmDashboardSection.rmConsentWrapper?.rmConsentStatusSection?.reshareCountDownTimerSection?.consentLinkExpiryTimer, { visible: !showNextSectionWrapper });
  }

  // Show re-initiate KYC button when KYC Completed Error is shown
  const isKYCCompletedErrorShown = globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.kycCompletedErrorCheck.$visible === true && globals.form.hiddenFieldsPanel?.hiddenExistingCustomer.$value === "N";
  const rmReInitiateKYCLink = globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.reshareCountDownTimerSection?.rmReInitiateKYCLink;
  if(showNextSectionWrapper && isKYCCompletedErrorShown){
    //const rmReInitiateKYCLink = globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.reshareCountDownTimerSection?.rmReInitiateKYCLink;
    if (rmReInitiateKYCLink) {
      globals.functions.setProperty(rmReInitiateKYCLink, { visible: true });
      //globals.functions.setProperty(rmReInitiateKYCLink, { enabled: true });
    }

    const addressDetailWrapper = globals.form?.customerPersonalDetailsWrapper?.customerPersonalDetailsSection?.customerDetailMainPanel?.customerDetailBodyPanel?.addressDetailWrapper;
    if (addressDetailWrapper) {
      globals.functions.setProperty(addressDetailWrapper, { visible: false });
    }
    
    const currentAddress = globals.form?.customerPersonalDetailsWrapper?.customerPersonalDetailsSection?.customerDetailMainPanel?.customerDetailBodyPanel?.currentaddress;
    if (currentAddress) {
      globals.functions.setProperty(currentAddress, { visible: true });
    }
    
    const customerName = globals.form?.customerPersonalDetailsWrapper?.customerPersonalDetailsSection?.customerDetailMainPanel?.customerDetailBodyPanel?.customerNameWrapper?.customerName;
    if (customerName) {
      globals.functions.setProperty(customerName, { visible: false });
    }
  }
  else{
    globals.functions.setProperty(rmReInitiateKYCLink, { visible: false });
    if(statusStepName === "KYC Completed" || statusStepName === "KYC Completed Error"){
      globals.functions.setProperty(globals.form?.rmDashboardWrapper.rmDashboardSection.rmConsentWrapper?.rmConsentStatusSection?.reshareCountDownTimerSection?.consentLinkExpiryTimer, { visible: false });
    }
  }

  // Try both paths to find nextSectionMainWrapper
  const nextSectionMainWrapper = globals.form?.nextSectionMainWrapper || 
    globals.form?.rmDashboardWrapper?.rmDashboardSection?.nextSectionMainWrapper;


  if (nextSectionMainWrapper) {
    globals.functions.setProperty(nextSectionMainWrapper, { 
      visible: showNextSectionWrapper
    });
  }

  // Force visibility through multiple paths if needed
  if (showNextSectionWrapper) {
    const paths = [
      globals.form.rmDashboardWrapper.rmDashboardSection.rmDetailsWrapper.rmDetailsPanel.rmCustOfferTypeDetailsPanel,
      globals.form?.nextSectionMainWrapper,
      globals.form?.rmDashboardWrapper?.rmDashboardSection?.nextSectionMainWrapper,
      globals.form?.rmDashboardWrapper?.nextSectionMainWrapper
    ];

    paths.forEach(element => {
      if (element) {
        globals.functions.setProperty(element, { visible: true });
      }
    });
  }

  /* Handle Customer Type and Offer Type Section visibility */
    let customerType, OfferType;
    const OfferTypePanel = globals.form.rmDashboardWrapper.rmDashboardSection.rmDetailsWrapper.rmDetailsPanel.rmCustOfferTypeDetailsPanel;
    if(globals.form.hiddenFieldsPanel?.hiddenExistingCustomer.$value === "N" && globals.form.hiddenFieldsPanel?.hiddenOfferAvailable.$value === "N"){
        customerType = "NTB";
        OfferType = "No Offer";
    }
    else if(globals.form.hiddenFieldsPanel?.hiddenExistingCustomer.$value === "Y" && globals.form.hiddenFieldsPanel?.hiddenOfferAvailable.$value === "N"){
        customerType = "ETB";
        OfferType = "No Offer";
    }
    else{
        customerType = "ETB";
        OfferType = "Pre-Approved Offer";
    }

    // Set the values to the fields
    globals.functions.setProperty(OfferTypePanel?.rmCustType, { value: customerType });
    globals.functions.setProperty(OfferTypePanel?.rmOfferType, { value: OfferType });

    // hide the re-initiate KYC button on RM Dashboard
    /*const rmReInitiateKYCLinkToHide = globals.form?.rmDashboardWrapper?.rmDashboardSection?.rmConsentWrapper?.rmConsentStatusSection?.reshareCountDownTimerSection?.rmReInitiateKYCLink;
    if (rmReInitiateKYCLinkToHide) {
      globals.functions.setProperty(rmReInitiateKYCLinkToHide, { visible: false });
    }*/

  // Check if both Personal Details and Employment Details checkboxes are ticked
  const nextSectionWrapper = globals.form?.rmDashboardWrapper?.rmDashboardSection?.nextSectionMainWrapper?.nextSectionWrapper;

  const isPersonalDetailsTicked = isCheckboxTicked(nextSectionWrapper?.rmPersonalDetailsSection?.rmPersonalDetailsCheck);
  const isEmploymentDetailsTicked = isCheckboxTicked(nextSectionWrapper?.rmEmploymentDetailsSection?.rmEmploymentDetailsCheck);

  // Check if Ten Second Loan Trigger is present with valid API data
  const tenSecondLoanItem = applicationStatusInfo.find(item => 
    item.stepName === "Ten Second Loan Trigger" && 
    item.offerAmount > 0 && 
    item.redirectUrl && 
    item.redirectUrl.trim() !== ''
  );
  const hasTenSecondLoanTrigger = tenSecondLoanItem;

  // Show Loan Offer section if both Personal Details and Employment Details are ticked
  // OR if shouldTickBothCustomerDetails is true (since we tick both when either is present)
  const showLoanOfferWrapper = (isPersonalDetailsTicked && isEmploymentDetailsTicked) || shouldTickBothCustomerDetails;

  // Show Ten Second Loan Wrapper if trigger is present with valid API data
  if (hasTenSecondLoanTrigger) {
    const tenSecondPaths = [
      globals.form?.tenSecondOfferLoanWrapper,
      globals.form?.rmDashboardWrapper?.rmDashboardSection?.tenSecondOfferLoanWrapper,
      globals.form?.rmDashboardWrapper?.tenSecondOfferLoanWrapper
    ];

    tenSecondPaths.forEach(element => {
      if (element) {
        globals.functions.setProperty(element, { visible: true });
      }
    });
  }

  // Try multiple paths to find loanOfferWrapper
  const loanOfferWrapper = globals.form?.loanOfferWrapper ||
    globals.form?.rmDashboardWrapper?.rmDashboardSection?.loanOfferWrapper ||
    globals.form?.rmDashboardWrapper?.loanOfferWrapper;

  if (loanOfferWrapper) {
    globals.functions.setProperty(loanOfferWrapper, {
      visible: showLoanOfferWrapper
    });
  }

  // Force visibility through multiple paths if needed
  if (showLoanOfferWrapper) {
    const loanOfferPaths = [
      globals.form?.loanOfferWrapper,
      globals.form?.rmDashboardWrapper?.rmDashboardSection?.loanOfferWrapper,
      globals.form?.rmDashboardWrapper?.loanOfferWrapper
    ];

    loanOfferPaths.forEach(element => {
      if (element) {
        globals.functions.setProperty(element, { visible: true });
      }
    });
    // Hide the "Proceed" button in nextSection when loan offer wrapper is shown
    const proceedButton = nextSectionWrapper?.nextStepsProceed;
    if (proceedButton) {
      globals.functions.setProperty(proceedButton, { visible: false });
    }

    // Also try to hide via DOM element as backup
    const proceedButtonElement = document.querySelector('button[name="nextStepsProceed"]');
    if (proceedButtonElement) {
      proceedButtonElement.style.display = 'none';
    }
  }
}

/**
 * Update City and state ID Data
 * @param {Object} pinCodeData
 * @param {scope} globals
 */
function assetsAssistedUpdateCityStateID(pinCodeData,globals){
  var pinCodeData = pinCodeData[0];
  globals.form.$properties.cityID = pinCodeData.CITY_ID;
  globals.form.$properties.stateID = pinCodeData.STATEID;
}

/**
 * Creates a journey ID by combining various parameters
 * @param {string} journeyAbbreviation The journey abbreviation
 * @param {string} channel The channel
 * @param {scope} globals Global scope object
 * @returns {string} The generated journey ID
 */
function assetsAssistedCreatePartnerJourneyId(journeyAbbreviation, channel, globals) {
  var visitMode = "U"; // todo check if this is correct
  var dynamicUUID = generateUUID();
  var dispInstance = getDispatcherInstance();
  var journeyId = dynamicUUID + '_' + dispInstance + "_" + journeyAbbreviation;
  // todo: this is done since setProperty is asynchronous
  // and return values is immediately set as updates on the form object in which this is written
  return journeyId
}

/**
 * Get credit promo code
 * @param {string} loanType  Type of loan customer selected
 * @returns {string} generated credit promocode
 */
function getCreditPromoCode(loanType){
        var creditPromoCode = "";
        if(loanType === "Fresh Loan") {
            creditPromoCode = "502528"; 
        } else if(loanType === "Balance Transfer") {
            creditPromoCode = "505349"; 
        } else if(loanType === "Existing Enhancement") {
            creditPromoCode = "503519"; 
        } else if(loanType === "Existing Top-up") {
            creditPromoCode = "507354"; 
        }
        return creditPromoCode;
}

/**
 * Retrieves the consents and its values in Array of Objects
 * @param {string} consentState - consent state parameter 
 * @param {scope} globals - Global scope object
 * @returns {array} 
 */
function assetsAssistedCreateConsentFormatData(consentState, globals) {
    let consents = [];
    let consentValues;
    if (consentState == "LandingPage") {
        consentValues = {
          "personalDataCaptureConsent" : globals.form.hiddenFieldsPanel.hiddenPersonalDataCaptureConsent.$value,
          "personalizedOffersCaptureConsent" : globals.form.hiddenFieldsPanel.hiddenPersonalizedOffersCaptureConsent.$value,
          "channelCaptureConsent" : globals.form.hiddenFieldsPanel.hiddenChannelCaptureConsent.$value
        };
    }

    /* Store the array of objects */
    consents = Object.entries(consentValues).map(([consentName, consentValue]) => ({ [consentName]: consentValue }));

    return consents;
}

/**
 * Retrieves the first name from customer name
 * @param {string} customerName - customerName parameter 
 * @returns {string} 
 */
function assetsAssistedGetFirstNameFromCustName(customerName) {
  let firstName = customerName.trim().split(' ');
  return firstName[0] || ''; 
}

/**
 * Retrieves the last name from customer name
 * @param {string} customerName - customerName parameter 
 * @returns {string} 
 */
function assetsAssistedGetLastNameFromCustName(customerName) {
  let lastName = customerName.trim().split(' ').slice(1).join(' ') || '';
  return lastName;
}

/**
 * converts the customer name to titlecase
 * @param {string} customerName - customerName parameter 
 * @returns {string} 
 */
function assetsAssistedConvertToTitleCase(customerName) {
  return customerName.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Sets first 2 digits and last 2 digits are visible rest all are masked
 * @param {string} mobileNumber Mobile Number
 * @param {scope} globals
 * @returns {string}
 */
function assetsAssistedMaskMobileNumberAssetsFormat(mobileNumber, globals) {
  let str = mobileNumber;
  let otpSubTitleText = globals.form.otpValidationWrapper.otpValidationSection.aadharOtpPanel.otpMainTextPanel.otpMainText.$value;
  otpSubTitleText = otpSubTitleText.replace("****", str.slice(0, 2) + "*".repeat(str.length - 4) + str.slice(-2));

  //first 2 digits and last 2 digits are visible rest all are masked
  return otpSubTitleText;

}

/**
 * formats array of application status info 
 * @param {object} customerDemogData - customer demographic data
 */
function assetsAssistedFilterDemogDetails(customerDemogData) {
  // Use the provided customerDemogData parameter
  const data = customerDemogData;

  // Extract and store required fields in hidden text field
  try {
    const tenSecondData = {
      redirectUrl: data?.redirectUrl || '',
      offerAmount: data?.OfferDemogDetails?.[0]?.offerAmount || 0,
      offerType: data?.OfferDemogDetails?.[0]?.offerType || '',
      customerOfferType: data?.customerOfferType || '',
      tenure: data?.OfferDemogDetails?.[0]?.tenure || '',
      rateOfInterest: data?.OfferDemogDetails?.[0]?.rateOfInterest || ''
    };
    
    // Store in hidden field using querySelector
    const hiddenField = document.querySelector('input[name="tenSecondHiddenData"]');
    if (hiddenField) {
      hiddenField.value = JSON.stringify(tenSecondData);
    } else {
      // Try alternative selector by ID
      const hiddenFieldById = document.querySelector('input[id="textinput-55eb9e0b0b"]');
      if (hiddenFieldById) {
        hiddenFieldById.value = JSON.stringify(tenSecondData);
      }
    }
  } catch (error) {
    console.error('Error storing ten second data:', error);
  }

  // Defensive checks
  if (
    data &&
    Array.isArray(data.OfferDemogDetails) &&
    data.OfferDemogDetails.length > 0
  ) {
    // Get details for all offers, organized by category, excluding empty fields
    const result = data.OfferDemogDetails.map(customer => ({
      personalDetails: {
        customerFullName: customer.customerFullName || '',
        customerFirstName: customer.customerFirstName || '',
        customerLastName: customer.customerLastName || '',
        customerMiddleName: customer.customerMiddleName || '',
        customerPan: customer.customerPan || '',
        dateOfBirth: customer.dateOfBirth || '',
        customerGender: customer.customerGender || '',
        customerID: customer.customerID || '',
        custType: customer.custType || ''
      },
      contactDetails: {
        emailAddress: customer.emailAddress || '',
      },
      addressDetails: {
        customerAddress1: customer.customerAddress1 || '',
        customerAddress2: customer.customerAddress2 || '',
        customerAddress3: customer.customerAddress3 || '',
        customerCity: customer.customerCity || '',
        customerState: customer.customerState || '',
        zipCode: customer.zipCode || '',
        customerCountry: customer.customerCountry || '',
        customerOfficeAddress1: customer.customerOfficeAddress1 || '',
        customerOfficeAddress2: customer.customerOfficeAddress2 || '',
        customerOfficeAddress3: customer.customerOfficeAddress3 || '',
        customerOfficeZipCode: customer.customerOfficeZipCode || ''
      },
      financialDetails: {
        monthlyIncome: customer.monthlyIncome || '',
        profession: customer.profession || '',
      },
      accountDetails: {
        accountNumber: customer.accountNumber || '',
      }
    }));
    return result;
  }
  return [];
}
 

/**
 * Prefill the binding data inside globals form Object
 * @param {object} customerDemogData - demog data
 * @param {scope} globals - Global scope object
 * @param {string} accountNumber - account number
 */
function assetsAssistedCustomerDemogDetails(accountNumber, customerDemogData, globals) {
  // Find required state objects
  const leadQualificationObj = (customerDemogData || []).find(
    item => item.state === "CUSTOMER_LEAD_QUALIFICATION_SUCCESS"
  );
  const kycCompleteObj = (customerDemogData || []).find(
    item => item.state === "KYC_COMPLETE_SUCCESS"
  );

  // Early return if no relevant data found
  if (!leadQualificationObj && !kycCompleteObj) return;

  let result = {};

  // Process demographic data if available
  if (leadQualificationObj) {
    let stateInfoObj;
    try {
      stateInfoObj = JSON.parse(leadQualificationObj.stateInfo);
    } catch (e) {
      stateInfoObj = null;
    }
    
    if (stateInfoObj) {
      let demogDetailsArr;
      try {
        demogDetailsArr = JSON.parse(stateInfoObj.hiddenFilteredDemogData);
      } catch (e) {
        demogDetailsArr = null;
      }
      
      if (demogDetailsArr && Array.isArray(demogDetailsArr) && demogDetailsArr.length > 0) {
        // Find matching account or use first entry
        const demog = accountNumber 
          ? demogDetailsArr.find(item => item.accountDetails?.accountNumber === accountNumber) || demogDetailsArr[0]
          : demogDetailsArr[0];

        const isAccountNumberMatch = Boolean(accountNumber && demog.accountDetails?.accountNumber === accountNumber);
        
        // Build full address from address components
        const addressParts = [
          demog.addressDetails?.customerAddress1,
          demog.addressDetails?.customerAddress2,
          demog.addressDetails?.customerAddress3
        ].filter(Boolean).join(', ');
        
        const locationParts = [
          addressParts,
          demog.addressDetails?.customerState,
          demog.addressDetails?.customerCity
        ].filter(Boolean).join(', ');
        
        const fullAddress = demog.addressDetails?.zipCode 
          ? `${locationParts} - ${demog.addressDetails.zipCode}`
          : locationParts;

        result = {
          timeinfo: leadQualificationObj.timeinfo,
          customerFullName: demog.personalDetails?.customerFullName || '',
          customerFirstName: demog.personalDetails?.customerFirstName || '',
          customerLastName: demog.personalDetails?.customerLastName || '',
          customerMiddleName: demog.personalDetails?.customerMiddleName || '',
          customerPan: demog.personalDetails?.customerPan || '',
          dateOfBirth: demog.personalDetails?.dateOfBirth ? demog.personalDetails.dateOfBirth.split('-').reverse().join('-') : '',
          customerGender: demog.personalDetails?.customerGender || '',
          customerID: demog.personalDetails?.customerID || '',
          custType: demog.personalDetails?.custType || '',
          emailAddress: demog.contactDetails?.emailAddress || '',
          customerFullAddress: fullAddress,
          customerAddress1: demog.addressDetails?.customerAddress1 || '',
          customerAddress2: demog.addressDetails?.customerAddress2 || '',
          customerAddress3: demog.addressDetails?.customerAddress3 || '',
          customerCity: demog.addressDetails?.customerCity || '',
          customerState: demog.addressDetails?.customerState || '',
          zipCode: demog.addressDetails?.zipCode || '',
          customerCountry: demog.addressDetails?.customerCountry || '',
          customerOfficeAddress1: demog.addressDetails?.customerOfficeAddress1 || '',
          customerOfficeAddress2: demog.addressDetails?.customerOfficeAddress2 || '',
          customerOfficeAddress3: demog.addressDetails?.customerOfficeAddress3 || '',
          customerOfficeZipCode: demog.addressDetails?.customerOfficeZipCode || '',
          monthlyIncome: demog.financialDetails?.monthlyIncome || '',
          profession: demog.financialDetails?.profession || '',
          accountNumber: isAccountNumberMatch ? (demog.accountDetails?.accountNumber || '') : '',
        };
      }
    }
    
    // If parsing failed but no KYC fallback, return early
    if (Object.keys(result).length === 0 && !kycCompleteObj) return;
  }

  // Initialize with empty structure if no demographic data was processed
  if (Object.keys(result).length === 0) {
    result = {
      timeinfo: kycCompleteObj?.timeinfo || '',
      customerFullName: '',
      customerFirstName: '',
      customerLastName: '',
      customerMiddleName: '',
      customerPan: '',
      dateOfBirth: '',
      customerGender: '',
      customerID: '',
      custType: '',
      emailAddress: '',
      customerFullAddress: '',
      customerAddress1: '',
      customerAddress2: '',
      customerAddress3: '',
      customerCity: '',
      customerState: '',
      zipCode: '',
      customerCountry: '',
      customerOfficeAddress1: '',
      customerOfficeAddress2: '',
      customerOfficeAddress3: '',
      customerOfficeZipCode: '',
      monthlyIncome: '',
      profession: '',
      accountNumber: '',
    };
  }

  // Enhance with KYC data if available
  if (kycCompleteObj) {
    try {
      const kycStateInfo = JSON.parse(kycCompleteObj.stateInfo);
      
      // KYC field mappings - enhance result with KYC data for missing fields
      const kycMappings = [
        { resultField: 'customerFullName', kycField: 'customerName' },
        { resultField: 'customerFullAddress', kycField: 'aadhaarAddress' },
        { resultField: 'customerCity', kycField: 'aadhaarCity' },
        { resultField: 'customerState', kycField: 'aadhaarState' },
        { resultField: 'zipCode', kycField: 'aadhaarPincode' },
        { resultField: 'customerPan', kycField: 'panNumber' }
      ];

      kycMappings.forEach(({ resultField, kycField }) => {
        if (!result[resultField] && kycStateInfo[kycField]) {
          result[resultField] = kycStateInfo[kycField];
        }
      });

      // Split KYC aadhaarAddress into individual address components if missing
      if (kycStateInfo.aadhaarAddress && (!result.customerAddress1 || !result.customerAddress2 || !result.customerAddress3)) {
        const addressParts = kycStateInfo.aadhaarAddress.split(',').map(part => part.trim()).filter(Boolean);
        
        if (!result.customerAddress1 && addressParts.length > 0) {
          result.customerAddress1 = addressParts[0];
        }
        
        if (!result.customerAddress2 && addressParts.length > 1) {
          result.customerAddress2 = addressParts[1];
        }
        
        if (!result.customerAddress3 && addressParts.length > 2) {
          result.customerAddress3 = addressParts[2];
        }
      }

      // Parse customerName from KYC to populate first, middle, and last names if missing
      if (kycStateInfo.customerName && (!result.customerFirstName || !result.customerLastName)) {
        const nameParts = kycStateInfo.customerName.trim().split(' ');
        
        if (!result.customerFirstName && nameParts.length > 0) {
          result.customerFirstName = nameParts[0];
        }
        
        if (!result.customerLastName && nameParts.length > 1) {
          result.customerLastName = nameParts.slice(1).join(' ');
        }
        
        // Handle middle name if there are 3 or more parts
        if (!result.customerMiddleName && nameParts.length > 2) {
          result.customerMiddleName = nameParts.slice(1, -1).join(' ');
          result.customerLastName = nameParts[nameParts.length - 1];
        }
      }
      
    } catch (e) {
      // Ignore KYC parsing errors, keep original demog data or empty fields
    }
  }
  console.log(result);
  return result;
}

/**
 * Converts String To Integer
 * @param {string} inputField - Value ins stringFormat
 */
function assetsAssistedConvertToNumber(inputField) {
return parseInt(inputField);
};

function setBREOfferIdentificationFlag(responseString) {
  var filler_5 = responseString.FILLER5;
  var filler_5_arr = (filler_5 !== null && filler_5 !== undefined && filler_5 !== "") ? filler_5.split(',') : [''];
  var breOfferIdentificationFlag = "";
  if (filler_5_arr.includes("OFFERTYPE_BUREAU")) {
    if (responseString.STP_Status.toLowerCase() === "yes") {
      breOfferIdentificationFlag = "BRE 1 STP";
    } else if (responseString.STP_Status.toLowerCase() === "no") {
      breOfferIdentificationFlag = "BRE 1 NSTP";
    }
  } else if (filler_5_arr.includes("OFFERTYPE_PERFIOS")) {
    if (responseString.STP_Status.toLowerCase() === "yes") {
      breOfferIdentificationFlag = "BRE 2 STP";
    } else if (responseString.STP_Status.toLowerCase() === "no") {
      breOfferIdentificationFlag = "BRE 2 NSTP";
    }
  } else if (filler_5_arr.includes("OFFERTYPE_NOOFFER")) {
    breOfferIdentificationFlag = "IPA";
  } else {
    breOfferIdentificationFlag = "IPA";
  }
  return breOfferIdentificationFlag;
}

//Method To Save BRE1 Response in CurrentFormContext based on STP and Non STP
function saveBreResponse(responseString) {
  var amount = new Map();
  var irr = new Map();
  var procFee = new Map();
  var amountArray = [];
  var irrArray = [];
  var procFeeArray = [];
  var tenureArray = [];

  for (var i = 0; i < responseString.OFFER_AMOUNT.length; i++) {
    amount.set(responseString.OFFER_AMOUNT[i].tenure, responseString.OFFER_AMOUNT[i].offerAmount);
    irr.set(responseString.IRR[i].tenure, responseString.IRR[i].irr);
    procFee.set(responseString.PROCFEEPER[i].tenure, responseString.PROCFEEPER[i].procFeePer);

    amountArray.push(responseString.OFFER_AMOUNT[i].offerAmount);
    irrArray.push(responseString.IRR[i].irr);
    procFeeArray.push(responseString.PROCFEEPER[i].procFeePer);
    tenureArray.push(responseString.OFFER_AMOUNT[i].tenure);
  }

  var breResponse = {};

  breResponse.amount = amount;
  breResponse.irr = irr;
  breResponse.procFee = procFee;
  breResponse.amountArray = amountArray;
  breResponse.irrArray = irrArray;
  breResponse.procFeeArray = procFeeArray;
  breResponse.tenureArray = tenureArray;
  return breResponse;
}

/**
 * Get Resident Type of customer
 * @param {string} type 
 * @return {string}
 */
function assetsAssistedGetResidentType(type){
  if(type == "0"){
  return "Company Provided";
  }else if(type == "1"){
  return "Hostel";
  }else if(type == "2"){
  return "Owned by parent / sibling";
  }else if(type == "3"){
  return "Owned by self / spouse";
  }else if(type == "4"){
  return "Paying guest";
  }else if(type == "5"){
  return "Rented - Staying alone";
  }else if(type == "6"){
  return "Rented - with family";
  }else if(type == "7"){
  return "Rented - with friends";
  }
}

function assetsAssistedTenSecondLoanData(customerDemogData) {
  // Implement the logic for processing customerDemogData for 10-second loan data
}

/**
* Generates an array of account details for FIP
 * @param {string} accountNumber
 * @param {string} customerID
*  @returns {array} of objects with stepName, userType, timeStamp and source
*/

function getAccountdetailsFIP(accountNumber, customerID) {
  const accountDetails = [{
    accountNumber: accountNumber || '',
    customerID: customerID || ''
  }];

  // Returning the array
   return accountDetails;
}

function assetsAssistedIfscCodeFilter(ifscBankName, ifscMicrCode, ifscBankBranch) {  
  // Handle case where inputs could be arrays or single values
  const bankName = Array.isArray(ifscBankName) ? ifscBankName[0] : ifscBankName;
  const micrCode = Array.isArray(ifscMicrCode) ? ifscMicrCode[0] : ifscMicrCode;
  const bankBranch = Array.isArray(ifscBankBranch) ? ifscBankBranch[0] : ifscBankBranch;


  // Use querySelector to set values directly in the DOM
  try {
    // Set bank name using querySelector
    const bankNameField = document.querySelector('input[name="bankName"]');
    if (bankNameField) {
      bankNameField.value = bankName || '';
      console.log('Successfully set bankName via querySelector:', bankName);
    } else {
      console.log('Bank name field not found via querySelector');
    }

    // Set MICR code using querySelector  
    const micrCodeField = document.querySelector('input[name="micrCode"]');
    if (micrCodeField) {
      micrCodeField.value = micrCode || '';
      console.log('Successfully set micrCode via querySelector:', micrCode);
    } else {
      console.log('MICR code field not found via querySelector');
    }

    const bankBranchField = document.querySelector('input[name="bankBranch"]');
    if (bankBranchField) {
      bankBranchField.value = bankBranch || '';
      console.log('Successfully set bankBranch via querySelector:', bankBranch);
    } else {
      console.log('Bank branch field not found via querySelector');
    } 
  } catch (error) {
    console.error('Error using querySelector:', error);
  }

  return {
    bankName: bankName || '',
    micrCode: micrCode || '',
    bankBranch: bankBranch || ''
  };
}

/**
* Generates an array of account details for FIP
 * @param {string} demogData
 * @param {scope} globals
 *  @returns {array} of objects with accountNumber and customerId
 */
function assetsAssistedStoreAccountNumber(demogData, globals) {
  // Find the object with the required state
  const leadQualificationObj = (demogData || []).find(
    item => item.state === "CUSTOMER_LEAD_QUALIFICATION_SUCCESS"
  );
  if (!leadQualificationObj) return [];
 
  // Parse stateInfo
  let stateInfoObj;
  try {
    stateInfoObj = JSON.parse(leadQualificationObj.stateInfo);
  } catch (e) {
    return [];
  }
 
  // Parse hiddenFilteredDemogData
  let demogDetailsArr;
  try {
    demogDetailsArr = JSON.parse(stateInfoObj.hiddenFilteredDemogData);
  } catch (e) {
    return [];
  }
 
  // Extract accountNumber and customerId from each demographic detail object
  let result = [];
  if (Array.isArray(demogDetailsArr) && demogDetailsArr.length > 0) {
    result = demogDetailsArr.map(demog => ({
      accountNumber: demog.accountDetails?.accountNumber || '',
      customerId: demog.personalDetails?.customerID || ''
    })).filter(item => item.accountNumber || item.customerId); // Filter out empty objects
  }
  return result;
};
 

/**
* Get IPA loan and Tenure
 * @param {scope} globals
 */
function assetsAssistedGetIPALoanAndTenure(globals) {
        if (globals.form.$properties.IPA_tenure_array === null || globals.form.$properties.IPA_tenure_array === undefined)
            globals.form.$properties.IPA_tenure_array = [6, 12, 24, 48, 72];

        if (globals.form.$properties.IPA_tenure_loamAmt_map === null || globals.form.$properties.IPA_tenure_loamAmt_map === undefined) {
            var map1 = new Map();

            map1.set(12, 1200000);
            map1.set(24, 2400000);
            map1.set(48, 8060000);
            map1.set(6, 500000);
            map1.set(72, 1240000);

            globals.form.$properties.IPA_tenure_loamAmt_map = JSON.stringify(Object.fromEntries(map1));
        }
        globals.form.$properties.maxTenureIPA = globals.form.$properties.IPA_tenure_array[globals.form.$properties.IPA_tenure_array.length - 1];
    // get the calculated loan amount based on maximum tenure
    globals.form.$properties.loanAmountIPA = Math.round(globals.form.$properties.IPA_tenure_loamAmt_map.get(globals.form.$properties.maxTenureIPA) / 1000) * 1000;		
    globals.functions.setProperty(
      globals.form?.maxTenureIPA, { value: globals.form.$properties.maxTenureIPA }
    );
    globals.functions.setProperty(
      globals.form?.loanAmountIPA, { value: globals.form.$properties.loanAmountIPA }
    );
    globals.functions.setProperty(
      globals.form?.IPA_tenure_loamAmt_map, { value: globals.form.$properties.IPA_tenure_loamAmt_map }
    );
  }

/**
 * calculate IRR data
 * @param {Object} irr_pf_response 
 * @param {Object} category 
 * @param {scope} globals
 */
function assetsAssistedCalculateIRRData(irr_pf_response,category,globals) {

    if(irr_pf_response === null || irr_pf_response === undefined)
        irr_pf_response = {};

    //Check for category and filter the response
    var filtered_irr_pf_response = {};
    for(var i = 0; i < irr_pf_response.length; i++){

        if(irr_pf_response[i].EMPLOYEE_CAT === category){
            filtered_irr_pf_response = irr_pf_response[i];
            break;
        }
    }

    //Fetch Combined Key, IRR, PF & Max loan amount
    globals.form.$properties.combined_key = filtered_irr_pf_response.COMBINEDKEY;
    globals.form.$properties.IPA_irr = filtered_irr_pf_response.IRR.replace(/[%]+/g, '').trim();
    globals.functions.setProperty(
      globals.form?.IPA_irr, { value: globals.form.$properties.IPA_irr }
    );
    globals.form.$properties.IPA_pf = filtered_irr_pf_response.PF;
    globals.functions.setProperty(
      globals.form?.hiddenFieldsPanel?.IPA_pf, { value: globals.form.$properties.IPA_pf }
    );
    globals.form.$properties.max_loan_amount = filtered_irr_pf_response.MAXLOANAMT;
}

/**
 * Tenure Multiplier Master Call - success function
 * @param {Object} tenure_multiplier_response 
 * @param {scope} globals
 */
function assetsAssistedTenureMultiplierResponse(tenure_multiplier_response,globals) {
    var income = globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.incomeDetailsWrapper.incomeDetails.monthlyNetIncome.$value;
    if(tenure_multiplier_response === null || tenure_multiplier_response === undefined)
        tenure_multiplier_response = {};

    //Fetch tenure months multiplier corrosponding to the conbined key
    var filtered_tenure_multiplier_response = {};
    for(var i = 0; i < tenure_multiplier_response.length; i++){

        if(tenure_multiplier_response[i].COMBINEDKEY.toUpperCase() === globals.form.$properties.combined_key.toUpperCase()){
            filtered_tenure_multiplier_response = tenure_multiplier_response[i];
            break;
        }
    }

    var keys = Object.keys(filtered_tenure_multiplier_response);
    var tenure_array = [];
    var tenure_loamAmt_map = new Map();

    for(var i = 0; i < keys.length; i++){

        var key = keys[i];
        var key_value = filtered_tenure_multiplier_response[key];
        var nan_check = parseInt(keys[i]);

        if(nan_check && key_value !== "0" && key_value != null){
            tenure_array.push(parseInt(keys[i]));
            var loanAmt = (globals.form.$properties.max_loan_amount < key_value*income ? globals.form.$properties.max_loan_amount : key_value*income);
            tenure_loamAmt_map.set(parseInt(keys[i]), Math.round(loanAmt/ 1000) * 1000);
        }
    }
    globals.form.$properties.IPA_tenure_array = tenure_array.sort();
    globals.form.$properties.IPA_tenure_loamAmt_map = JSON.stringify(Object.fromEntries(tenure_loamAmt_map));
    assetsAssistedGetIPALoanAndTenure(globals);   

}

/**
 * IPA offer text for perfios
 * @param {scope} globals
 * @return {string}
 */
function assetsAssistedIPAOfferText(globals){
  return "Customer is eligible for a loan amount of upto ₹" + globals.form.$properties.loanAmountIPA/100000 +" lakh for a maximum tenure of " + globals.form.$properties.maxTenureIPA + " months!"
}

/**
 * update perfios count
 * @param {scope} globals
 * @return {void} - nothing to return
 */
function assetsAssistedUpdatePerfiosRetryCount(globals) {
  const urlLocation =
    typeof window !== "undefined" ? window.location.href : null;
  const journeyType =
    globals?.form?.hiddenFieldsPanel?.hiddenJourneyType?.$value ?? "";
  const customerPerfiosCount =
    globals?.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount?.$value ?? "";

  if (urlLocation) {
    let params = new URL(urlLocation).searchParams;
    if (params.get("visitType") === "RM_PERFIOS") {
      const url = new URL(urlLocation);
      const journeyId = url.searchParams.get("journeyID");
      if (journeyId) {
        setProperty("journeyId", journeyId, globals);
      }
      return globals.functions.setProperty(
        globals.form?.hiddenPerfiosRetryCount,
        { value: globals?.form?.hiddenPerfiosRetryCount?.$value + 1 }
      );
    }
  }
  if (journeyType === "RM") {
    globals.functions.setProperty(globals?.form?.hiddenPerfiosRetryCount, {
      value: globals?.form?.hiddenPerfiosRetryCount?.$value + 1,
    });
  } else {
    if (customerPerfiosCount < 3) {
      globals.functions.setProperty(
        globals.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount,
        {
          value:
            globals.form.hiddenFieldsPanel.hiddenPerfiosRetryCount.$value + 1,
        }
      );
    } else {
      globals.functions.setProperty(
        globals.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount,
        {
          value: 1,
        }
      );
    }
  }
}



/**
 * Update Employee Data
 * @param {Object} empdata
 * @param {scope} globals
 */
function assetsAssistedUpdateEmpData(empdata,globals){
  var empObj = empdata[0];
  globals.form.$properties.globalFinalCategory = empObj.FINAL_CATEGORY;
  globals.form.$properties.globalEmployerId = empObj.EMPLOYERID;
}

/**
 * Set loan slider values
 * @param {Object} bre2Response
 * @param {scope} globals
 */
function assetsAssistedSetLoanSlider(bre2Response,globals){
  globals.functions.setProperty(globals.form?.loanOfferScreen?.offerScreenTopSection?.greatNewsPanel?.loanEligibilityPanel?.loanDesTitle?.loanEligibilityText, { value: "Customer is eligible for a loan of ₹" + bre2Response.amountArray[bre2Response.amountArray.length-1] + "!"});
  globals.functions.setProperty(globals.form?.loanOfferScreen?.offerScreenTopSection?.greatNewsPanel?.loanEligibilityPanel?.loanDesTitle?.additionalDocumentsText , {value : "For a higher loan amount, customer needs to submit additional documents to avail a loan of up to ₹"+ globals.form.$properties.loanAmountIPA});
  globals.functions.setProperty(globals.form?.loanOfferScreen?.loanDetailAndDescription?.loanOfferTenureAndSlider?.loanAmountPanel?.loanAmtSlider,{splitValue :assetsAssistedConvertToNumber("234567")});	globals.functions.setProperty(globals.form?.loanOfferScreen?.loanDetailAndDescription?.loanOfferTenureAndSlider?.loanAmountPanel?.loanAmtSlider,{stepValue : assetsAssistedConvertToNumber("10000")});	globals.functions.setProperty(globals.form?.loanOfferScreen?.loanDetailAndDescription?.loanOfferTenureAndSlider?.loanAmountPanel?.loanAmtSlider,{maxValue : assetsAssistedConvertToNumber(globals.form.$properties.loanAmountIPA + "")});	globals.functions.setProperty(globals.form?.loanOfferScreen?.loanDetailAndDescription?.loanOfferTenureAndSlider?.loanAmountPanel?.loanAmtSlider,{minValue : assetsAssistedConvertToNumber("50000")});	globals.functions.setProperty(globals.form?.loanOfferScreen?.loanDetailAndDescription?.loanOfferTenureAndSlider?.loanAmountPanel?.loanAmtSlider,{minLabel : assetsAssistedConvertToNumber("50")+"K"});	globals.functions.setProperty(globals.form?.loanOfferScreen?.loanDetailAndDescription?.loanOfferTenureAndSlider?.loanAmountPanel?.loanAmtSlider,{maxLabel : assetsAssistedConvertToNumber(globals.form.$properties.loanAmountIPA/100000) + "L"});	globals.functions.setProperty(globals.form?.loanOfferScreen?.loanDetailAndDescription?.loanOfferTenureAndSlider?.loanAmountPanel?.loanAmtSlider,{default : assetsAssistedConvertToNumber(bre2Response.amountArray[bre2Response.amountArray.length-1])});
}

/**
 * Handles the selection of radio buttons within the assisted ETB account fieldset.
 * Updates hidden input fields with account number and customer ID based on the selected radio button.
 * @param {scope} globals
 */
function assetsAssistedRadioSelectionHandler(globals) {
  const wrapper = document.querySelector("fieldset.field-assistedetbaccount");
  if (!wrapper) return;
  const continueButton = document.querySelector("button[name='etbAccountSelectionButton']");
  if (!continueButton) return;

  function updateHiddenFieldsFromRadio(radio) {
    if (!radio.checked) return;

    const panel = radio.closest("fieldset[data-index]");
    if (!panel) return;

    const accInput = panel.querySelector("input[name='FipAccountNunber']");
    const custInput = panel.querySelector("input[name='custId']");

    const accNumber = accInput?.value || "";
    const custId = custInput?.value || "";

    const bankNameField = globals.form.accountSelectionDetailsFrag.accountSelectionPanel.accountSelectionWrapper.hiddenBankNameField.$value;

    if (bankNameField === "HDFC Bank") {
      // Set hidden fields only if bankNameField is HDFC Bank
      globals.functions.setProperty(
        globals.form?.hiddenFieldsPanel?.hiddenAccNumber, { value: accNumber }
      );
      globals.functions.setProperty(
        globals.form?.hiddenFieldsPanel?.hiddenCustId, { value: custId }
      );
    } else {
      // Clear hidden fields if bankNameField is not HDFC Bank
      globals.functions.setProperty(
        globals.form?.hiddenFieldsPanel?.hiddenAccNumber, { value: "" }
      );
      globals.functions.setProperty(
        globals.form?.hiddenFieldsPanel?.hiddenCustId, { value: "" }
      );
    }
  }

  // function to validate bankNameField and enable/disable continue button accordingly
  function validateBankNameField() {
    const bankNameField = globals.form.accountSelectionDetailsFrag.accountSelectionPanel.accountSelectionWrapper.hiddenBankNameField.$value;

    if (!bankNameField || bankNameField.trim() === "") {
      continueButton.disabled = true;
    } else if (bankNameField === "HDFC Bank") {
      const checkedRadio = wrapper.querySelector("input[type='radio'][name='accontNumberDetails']:checked");
      continueButton.disabled = !checkedRadio;
    } else {
      continueButton.disabled = false;
    }
  }

  function onRadioChange(event) {
    const target = event.target;
    if (target.matches("input[type='radio'][name='accontNumberDetails']")) {
      updateHiddenFieldsFromRadio(target);
      validateBankNameField();
    }
  }

  wrapper.addEventListener("change", onRadioChange);

  const radios = wrapper.querySelectorAll("input[type='radio'][name='accontNumberDetails']");

  if (radios.length === 1) {
    // Auto-select the single radio
    const singleRadio = radios[0];
    singleRadio.checked = true;
    updateHiddenFieldsFromRadio(singleRadio);
    validateBankNameField();
  } else {
    // Initially disable continue button (will be enabled after validation)
    continueButton.disabled = true;

    // If any pre-selected radio, update hidden fields and validate
    radios.forEach(radio => {
      if (radio.checked) {
        updateHiddenFieldsFromRadio(radio);
      }
    });

    validateBankNameField();
  }
}

/*
 * @param {void} - No parameters are passed. Data is pulled from the DOM directly.
 * @returns {void} - Does not return anything. Manipulates the DOM directly.
 */
function assetsAssistedPopulateEtbAccounts() {
  // Get hidden field that contains account data as JSON
  const hiddenField = document.querySelector("input[name='hiddenAccoundNumberDetails']");
  if (!hiddenField) return;

  // Parse accounts array from hidden field
  let accounts = [];
  try {
    accounts = JSON.parse(hiddenField.value || '[]');
  } catch (e) {
    return;
  }

  if (accounts.length === 0) return;

  // Get the repeatable panel wrapper
  const assistedPanel = document.querySelector("fieldset.field-assistedetbaccount");
  if (!assistedPanel) return;

  const repeatWrapper = assistedPanel.querySelector("div.repeat-wrapper");
  if (!repeatWrapper) return;

  const firstInstance = repeatWrapper.querySelector("fieldset[data-index='0']");
  if (!firstInstance) return;

  // Remove any previously cloned instances beyond the first
  const existingInstances = repeatWrapper.querySelectorAll("fieldset[data-index]");
  existingInstances.forEach((inst, idx) => {
    if (idx > 0) inst.remove();
  });

  // For each account, clone and populate a panel instance
  accounts.forEach((account, index) => {
    let instance;

    // Use first instance or clone it
    if (index === 0) {
      instance = firstInstance;
    } else {
      instance = firstInstance.cloneNode(true);
      instance.setAttribute("data-index", index);
      instance.querySelectorAll("input").forEach(input => input.value = "");
      repeatWrapper.appendChild(instance);
    }

    // === Masked Account Logic ===
    const rawAccNumber = account.accountNumber || "";
    let maskedAcc = rawAccNumber;

    if (rawAccNumber.length > 4) {
      const last4 = rawAccNumber.slice(-4);
      const maskChar = rawAccNumber[0];

      if (maskChar === 'X' || maskChar === '*') {
        maskedAcc = maskChar.repeat(rawAccNumber.length - 4) + last4;
      } else {
        // If not masked, just show last 4 digits
        maskedAcc = 'X'.repeat(rawAccNumber.length - 4) + last4;
      }
    }

    // Populate fields in the instance
    const accInput = instance.querySelector("input[name='FipAccountNunber']");
    if (accInput) accInput.value = maskedAcc;

    const custInput = instance.querySelector("input[name='custId']");
    if (custInput) custInput.value = account.customerId || "";
  });
}

/**
*  Update address based on customer selection
* @param {scope} globals
* @returns {void} - No return value
*/
function assetsAssistedUpdateAddressDataNTB(globals){
    var addreddFlag = globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.addressDetailWrapper.customerAadharAddressSelection.$value;
    if(addreddFlag == "0" || addreddFlag == "3"){
        globals.form.$properties.breAddress1=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentaddress.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddress.currentAddressLine1.$value;		globals.form.$properties.breAddress2=globals.form.$properties.breAddress1=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentaddress.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddress.currentAddressLine2.$value;	globals.form.$properties.breAddress3=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentaddress.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddress.currentAddressLine3.$value;	globals.form.$properties.breZipCode=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentaddress.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddress.currentPinCode.$value;	globals.form.$properties.breCity=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentaddress.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddress.currentCity.$value;	globals.form.$properties.breState=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentaddress.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddress.currentStateProvince.$value;	globals.form.$properties.breResidentType=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentaddress.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddress.currentResidenTtype.$value;
    }
}

/**
* Update address based on customer selection ETB
* @param {scope} globals
* @returns {void} - No return value
*/
function assetsAssistedUpdateAddressDataETB(globals){

if(globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.addressDetailWrapper.residentialAddressSelection.$value == "0"){
    globals.form.$properties.breAddress1=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentAddressEtb.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddressEtb.currentEtbAddressLine1.$value;
    globals.form.$properties.breAddress2=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentAddressEtb.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddressEtb.currentEtbAddressLine2.$value;
    globals.form.$properties.breAddress3=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentAddressEtb.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddressEtb.currentEtbAddressLine3.$value;
    globals.form.$properties.breZipCode=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentAddressEtb.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddressEtb.currentEtbPinCode.$value;
    globals.form.$properties.breCity=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentAddressEtb.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddressEtb.currentEtbCity.$value;
    globals.form.$properties.breState=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentAddressEtb.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddressEtb.currentEtbstateProvince.$value;
    globals.form.$properties.breResidentType=globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.currentAddressEtb.currentAddrressDetailsOfCustomer.currentAddressWrapper.currentAddressEtb.currentEtbResidenTtype.$value;
}
}
/**
* Update aadhar address for NTB
* @param {scope} globals
* @returns {void} - No return value
*/
function assetsAssistedUpdateAadharAddress(globals){
    globals.form.$properties.breAddress1= globals.form.$properties.demogCustomerDetails.customerAddress1;
    globals.form.$properties.breAddress2= globals.form.$properties.demogCustomerDetails.customerAddress2;
    globals.form.$properties.breAddress3= globals.form.$properties.demogCustomerDetails.customerAddress3;
    globals.form.$properties.breZipCode= globals.form.$properties.demogCustomerDetails.zipCode;
    globals.form.$properties.breCity= globals.form.$properties.demogCustomerDetails.customerCity;
    globals.form.$properties.breState= globals.form.$properties.demogCustomerDetails.customerState;
    globals.form.$properties.breResidentType= assetsAssistedGetResidentType("2");
}

/**
 * Update choice All everify section
 * @param {Object} response
 * @param {scope} globals
 */
function assetsAssistedChoiceAllEverify(response, globals){
  const data = response[0];
  const mapping = {
    ISNETBANKING: ".field-salaryaccountcheckbox input[type='checkbox']",
    ISSTATEMENT: ".field-bankstatementcheckbox input[type='checkbox']",
    ISAA: ".field-accountaggregatorcheckbox input[type='checkbox']"
  };

  const recommendationMap = {
    NETBANKING_RECOMMENDATION: ".field-salaryaccountcheckbox input[type='checkbox']",
    STATEMENT_RECOMMENDATION: ".field-bankstatementcheckbox input[type='checkbox']",
    AA_RECOMMENDATION: ".field-accountaggregatorcheckbox input[type='checkbox']"
  };

  const destinationTypeMap = {
    NETBANKING_RECOMMENDATION: "netbankingFetch",
    STATEMENT_RECOMMENDATION: "statement",
    AA_RECOMMENDATION: "accountAggregator"
  };

  const recommendedVisibilityMap = {
    AA_RECOMMENDATION: globals.form.choiceAll.e_verify_income.eVerifyMethod.eVerifyRadioButtonPanel.accountAggregatorSection.Recommended1,
    NETBANKING_RECOMMENDATION: globals.form.choiceAll.e_verify_income.eVerifyMethod.eVerifyRadioButtonPanel.salaryAccountSection.Recommended2,
    STATEMENT_RECOMMENDATION: globals.form.choiceAll.e_verify_income.eVerifyMethod.eVerifyRadioButtonPanel.bankStatementSection.Recommended3
  };

   globals.functions.setProperty(globals.form.choiceAll.e_verify_income.eVerifyMethod, { visible: true });
   globals.functions.setProperty(recommendedVisibilityMap.AA_RECOMMENDATION, { visible: false });
   globals.functions.setProperty(recommendedVisibilityMap.NETBANKING_RECOMMENDATION, { visible: false });
   globals.functions.setProperty(recommendedVisibilityMap.STATEMENT_RECOMMENDATION, { visible: false });
  //  const container = document.querySelector(".field-selectbankbtn");
 
  // container.onclick = e => {
  //   if (e.target.classList.contains("button")) {
  //     container.querySelectorAll(".button").forEach(btn => btn.classList.remove("activeBank"));
  //     e.target.classList.add("activeBank");
  //   }
  // };

  const allCheckboxes = Object.values(mapping)
    .map(selector => document.querySelector(selector))
    .filter(Boolean);

  Object.entries(mapping).forEach(([key, selector]) => {
    const checkbox = document.querySelector(selector);
    if (checkbox) {
      checkbox.disabled = (data[key] === "N");
      checkbox.checked = false;
      checkbox.onclick = function () {
        if (this.checked === false) {
        this.checked = true;
        return;
      }
        
      allCheckboxes.forEach(c => {
        if (c !== this) c.checked = false;
      });

      };
    }
  });

  for (const [key, selector] of Object.entries(recommendationMap)) {
    const checkbox = document.querySelector(selector);
    if (checkbox && data[key] === "Y" && !checkbox.disabled) {
      checkbox.checked = true;
      
       if (recommendedVisibilityMap[key]) {
        globals.functions.setProperty(recommendedVisibilityMap[key], { visible: true });
      }
      if (data.INSTITUTION_ID) {
        globals.functions.setProperty(globals.form.choiceAll.hiddenInstituteId,{ value: data.INSTITUTION_ID });
      }

      globals.functions.setProperty(globals.form.choiceAll.hiddenDestinationType,{ value: destinationTypeMap[key] });
      break;
    }
  }
}

/**
 * Function to handle "Try Again" functionality for assisted assets
 * @param {object} utmParam - UTM parameter from the URL
 * @param {string} ctaText - Call to action text
 * @param {boolean} hideTooggle - Flag to hide toggle
 * @param {scope} globals - Global scope object
 */
function assetsAssistedTryAgainFunctionality(utmParam , ctaText, hideTooggle, globals){
  // Implement the functionality here
}

/**
 * Function to handle "goToBottom" functionality 
 */
function assetsAssistedGoToBottomFunctionality(){
let popup = document.querySelector(".field-consentmodalmandatory .modal-content");
if(popup){
popup.scrollTop = popup.scrollHeight;
}
}

//EMI Calculation logic
function getCalculateEMI(loanAmountcal, rateOfInterest, tMonths) {
  var newrate = (rateOfInterest / 100) / 12;
  var rate1 = (1 + newrate);
  var rate2 = Math.pow(rate1, tMonths);
  var rate3 = (rate2 - 1);
  var principle = [(loanAmountcal) * (newrate) * rate2];
  var finalEMI = Math.round(principle / rate3);
  return finalEMI;
}

 // function to calculate Processing fee
 function procFee(loanAMount, percent) {
  if (percent.toString().indexOf("%") !== -1) {
      return (loanAMount / 100) * parseFloat(percent);
  } else {
      return percent;
  }
}

//function to generate commas in amount
function commasSepratedValue(loanAmount) {
  return parseInt(loanAmount).toLocaleString('en-IN');
}

/**
 * Update choice All everify section
 * @param {scope} globals
 */
// populates the bre loan screen with loan details: customer name, loan amount, tenure, roi and processing fee
function populateLoanDetails(globals) {


  var maxTenure = globals.form.$properties.bre1Response.tenureArray[globals.form.$properties.bre1Response.tenureArray.length-1];
  // get the calculated loan amount based on maximum tenure
  var loanAmount = Math.round(globals.form.$properties.bre1Response.amount.get(maxTenure) / 1000) * 1000;

  // get the roi on calculated loan amount
  var roi = globals.form.$properties.bre1Response.irr.get(maxTenure);
  let loanOfferMainHead = globals.form.loanOfferScreen.offerScreenTopSection.greatNewsPanel.loanEligibilityPanel.loanDesTitle.loanEligibilityText.$value;
  globals.form.loanOfferScreen.offerScreenTopSection.greatNewsPanel.loanEligibilityPanel.loanDesTitle.loanEligibilityText.$value = loanOfferMainHead.replace("₹8,00,000","₹" + commasSepratedValue(loanAmount));
  globals.form.loanOfferScreen.loanDetailAndDescription.loanOfferTenureAndSlider.loanAmountPanel.childLoanAmt.loanAmtValue.$value = commasSepratedValue(loanAmount);

  // set the tenure value
  globals.form.$properties.tenure = maxTenure;

  globals.form.loanOfferScreen.loanDetailAndDescription.loanOfferTenureAndSlider.loanTenurePanel.childLoanTenure.loanTenureValue.$value = Math.floor(globals.form.$properties.tenure) + " " + "Months";
  globals.form.loanOfferScreen.loanDetailAndDescription.offerScreenBottomPage.loanSummarySection.emiDetailsPanel.emiTopSection.rateOfInterest.$value = roi.toString() + "%" + " " + "p.a";

  // get the calculated EMI on loan amount, roi and tenure
  var monthlyInstallment = getCalculateEMI(loanAmount, roi, globals.form.$properties.tenure);

  globals.form.loanOfferScreen.loanDetailAndDescription.offerScreenBottomPage.loanSummarySection.emiDetailsPanel.emiTopSection.emiAmount.$value = "₹" + " " + commasSepratedValue(monthlyInstallment);
  globals.form.loanOfferScreen.loanDetailAndDescription.offerScreenBottomPage.instantDisbursementText.emiDetailsPanel.emiBottonSectionWrapper.emiBottomSection.processingFee.$value = "₹" + " " + procFee(loanAmount, globals.form.$properties.procFee.get(maxTenure));
  var maxAmount = globals.form.loanOfferScreen.loanDetailAndDescription.loanOfferTenureAndSlider.loanAmountPanel.childLoanAmt.loanAmtValue.$value;
}

/**
 * Update choice All everify section
 * @param {scope} globals
 */
// populates the bre loan screen with loan details: customer name, loan amount, tenure, roi and processing fee
function populateIPALoanDetails(globals) {


  var maxTenure = globals.form?.hiddenFieldsPanel?.maxTenureIPA.$value;
  // get the calculated loan amount based on maximum tenure
  var loanAmount = globals.form?.hiddenFieldsPanel?.loanAmountIPA.$value;

  // get the roi on calculated loan amount
  var roi = globals.form?.hiddenFieldsPanel?.IPA_pf.$value;
  let loanOfferMainHead = globals.form.loanOfferScreen.offerScreenTopSection.greatNewsPanel.loanEligibilityPanel.loanDesTitle.loanEligibilityText.$value;
  globals.functions.setProperty(globals.form.loanOfferScreen.offerScreenTopSection.greatNewsPanel.loanEligibilityPanel.loanDesTitle.loanEligibilityText, { value: "<b>You are eligible for a loan amount of upto ₹" + loanAmount});
  globals.functions.setProperty(globals.form.loanOfferScreen.offerScreenTopSection.greatNewsPanel.loanEligibilityPanel.loanDesTitle.additionalDocumentsText, { visible: false});
  globals.functions.setProperty(globals.form.loanOfferScreen.shareOfferToCustomer, {visible: false});
  globals.functions.setProperty(globals.form.loanOfferScreen.loanDetailAndDescription.loanOfferTenureAndSlider.loanAmountPanel.childLoanAmt.loanAmtValue, { value: loanAmount});

  // set the tenure value
  globals.form.$properties.tenure = maxTenure;

  globals.functions.setProperty(globals.form.loanOfferScreen.loanDetailAndDescription.loanOfferTenureAndSlider.loanTenurePanel.childLoanTenure.loanTenureValue, { value: Math.floor(globals.form.$properties.tenure) + " " + "Months"});
  //globals.form.loanOfferScreen.loanDetailAndDescription.offerScreenBottomPage.loanSummarySection.emiDetailsPanel.emiTopSection.rateOfInterest.$value = roi.toString() + "%" + " " + "p.a";

  // get the calculated EMI on loan amount, roi and tenure
  //var monthlyInstallment = getCalculateEMI(loanAmount, roi, globals.form.$properties.tenure);

  //globals.form.loanOfferScreen.loanDetailAndDescription.offerScreenBottomPage.loanSummarySection.emiDetailsPanel.emiTopSection.emiAmount.$value = "₹" + " " + commasSepratedValue(monthlyInstallment);
  var maxAmount = globals.form.loanOfferScreen.loanDetailAndDescription.loanOfferTenureAndSlider.loanAmountPanel.childLoanAmt.loanAmtValue.$value;
}

/**
 * Updates the loan tenure slider value when the input box value changes and vice versa.
 * This function provides two-way binding between the slider and input field.
 * 
 * @param {object} sliderField - The slider field object
 * @param {object} inputField - The input field object
 * @param {scope} globals - Global scope object
 * @returns {void}
 */
function updateLoanTenureSliderAndInput(sliderField, inputField, globals) {
  // Define the available tenure options (in months)
  const tenureOptions = [12, 24, 36, 48, 60, 72, 84];
  
  // Get current values
  let sliderValue = parseInt(sliderField.$value || 48);
  let inputValue = inputField.$value || '';
  
  // Extract numeric value from input (remove "Months" text if present)
  let inputNumericValue = parseInt(inputValue.toString().replace(/[^0-9]/g, ''));
  
  // Determine which field triggered the update
  if (globals.field === inputField) {
    // Input field was changed, update slider
    if (!isNaN(inputNumericValue)) {
      // Find the closest valid tenure option
      const closestTenure = tenureOptions.reduce((prev, curr) => {
        return (Math.abs(curr - inputNumericValue) < Math.abs(prev - inputNumericValue) ? curr : prev);
      });
      
      // Update slider value
      globals.functions.setProperty(sliderField, {
        value: closestTenure
      });
      
      // Update input field with formatted value (in case it was adjusted to match a valid tenure)
      globals.functions.setProperty(inputField, {
        value: `${closestTenure} Months`
      });
    }
  } else if (globals.field === sliderField) {
    // Slider was changed, update input field
    globals.functions.setProperty(inputField, {
      value: `${sliderValue} Months`
    });
  }
}

function assetsAddClassNameBankIcon(className){
  const bankBtn = document.querySelector(`button[name='${className}']`);
  const container = document.querySelector(".field-selectbankbtn");
  container.onclick = e => {
    if (e.target.classList.contains("button")) {
      container.querySelectorAll(".button").forEach(btn => btn.classList.remove("activeBank"));
      // e.target.classList.add("activeBank");
    }}
  if (bankBtn) {
    bankBtn.classList.add("activeBank");
  }
}

function assetsAssistedRemoveClassNameBankIcon(){
  const container = document.querySelector(".field-selectbankbtn");
  container.querySelectorAll(".button").forEach(btn => btn.classList.remove("activeBank"));
}

/**
 * Update Other Emp Data
 * @param {Object} response
 * @param {scope} globals
 */
function assetsAssistedOtherEmpData(response, globals){
  var isVerified = false;
  var income = globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.incomeDetailsWrapper.incomeDetails.monthlyNetIncome.$value;
  for(var i=0; i< response.length;i++){
    if(income >= response[i].LOW && income <= response[i].HIGH){
      globals.form.$properties.globalFinalCategory = response[i].COMPANY_CATEGORY;
      globals.form.$properties.minVerifyIncomeAmount = response[i].LOW;
      globals.form.$properties.maxVerifyIncomeAmount = response[i].HIGH;
      globals.form.$properties.govIdProofReq = response[i].ID_PROOF_REQ; 
      globals.functions.setProperty(
        globals.form?.hiddenFieldsPanel?.govIdProofReq, { value: response[i].ID_PROOF_REQ}
      );
      globals.form.$properties.workEmailReq = response[i].WORK_EMAIL_REQ;
      if(globals.form.$properties.workEmailReq === "N"){
        globals.functions.setProperty(globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.otherWorkEmailIdWrapper.otherWorkEmailId.otherWorkEmailVerification, { required: false });
      }
      isVerified = true;
    }
  }
  if(!isVerified){
    globals.form.$properties.globalFinalCategory = "CAT NEW";
    globals.form.$properties.minVerifyIncomeAmount = "100";
    globals.form.$properties.maxVerifyIncomeAmount = "9999999999";
  }
}

/**
 * Check doc upload status
 * @param {string} fieldClass
 * @param {Object} fieldData
 * @param {scope} globals
 * @returns {boolean}
 */
function assetsAssistedCheckDocUploadStatus(fieldClass,fieldData,globals){
  if(document.getElementsByClassName(fieldClass)[0].className.includes("field-valid")){
    globals.functions.setProperty(fieldData, { visible: true });
  }else{
    globals.functions.setProperty(fieldData, { visible: false });
  }
}

/**
 * Helper function to safely get field value data using optional chaining
 * @param {Object} field - The form field
 * @returns {*} - The field value data or null if not available
 */
function assetsAssistedGetFieldValue(field) {
  if(!field || field.$value === null || !field.$value.data) {
    return null;
  }
  return field.$value.data;
}

/**
 * 
 * @param {string} journeyId 
 * @param {string} journeyName 
 * @param {string} phoneNumber 
 * @param {string} parentDocID 
 * @param {string} parentDocName 
 * @param {string} partnerJourneyID 
 * @param {string} bankJourneyID 
 * @returns {*} - The field value data or null if not available
 */
function assetsAssistedCreateDocUploadRequest(journeyId,journeyName,phoneNumber,parentDocID,parentDocName,partnerJourneyID,bankJourneyID){
    var requestString = {};
  var additionalDataMap = new Map();
    if(parentDocID === docUploadChildIDs["PhotographChildID"]) {
        requestString.parentDocID = docUploadParentIDs["PhotographID"];
        requestString.childDocID = parentDocID;
    } else if(parentDocID === docUploadParentIDs["KYC_ID"]) {
        requestString.parentDocID = docUploadParentIDs["KYC_ID"];
        requestString.childDocID = docUploadChildIDs[parentDocName];
    } else if(parentDocID === docUploadParentIDs["employmentProofID"]) {
        requestString.parentDocID = docUploadParentIDs["IncomeID"];
        requestString.childDocID = parentDocID;
    } else if(parentDocID === docUploadParentIDs["bankStatementID"]) {
        requestString.parentDocID = docUploadParentIDs["bankStmtID"];
        requestString.childDocID = parentDocID;
    } else if(parentDocID === docUploadParentIDs["government_Id"]) {
        requestString.parentDocID = docUploadParentIDs["government_Id"];
        requestString.childDocID = docUploadChildIDs[parentDocName];
    } else if(parentDocID === docUploadParentIDs["balanceTransfer_Id"]) {
        requestString.parentDocID = docUploadParentIDs["balanceTransfer_Id"];
        requestString.childDocID = docUploadChildIDs[parentDocName];
        requestString.Parent_Doc_desc = "LOAN TRANSFER DOCUMENTS";
        requestString.Child_Doc_Desc = "STATEMENT OF ACCOUNTS";

    } else if(parentDocID === docUploadParentIDs["additionalDoc_Id"]) {
          requestString.parentDocID = docUploadParentIDs["additionalDoc_Id"];
          requestString.childDocID = docUploadChildIDs[parentDocName];
    }
    requestString.documentType = "0";
    requestString.flgReupload = "No";
    requestString.flgFinalUpload = "";
    requestString.journeyID = journeyId;
    requestString.journeyName = journeyName;
    requestString.partnerJourneyID = partnerJourneyID;
    requestString.bankJourneyID = bankJourneyID;
  requestString.mobileNo = phoneNumber;
    requestString.userAgent = window.navigator.userAgent;

    additionalDataMap.set('requestString', JSON.stringify(requestString));
    additionalDataMap.set('childDocID', requestString.childDocID);
    return additionalDataMap;
}

/**
 * Helper function to extract document data from form fields
 * @param {string} docType - type of document
 * @param {object} panel - field panel
 * @returns {Object} - Document data or null if required data is missing
 */
function assetsAssistedExtractDocumentData(docType, panel) {
  var docData = {};
  if(docType === "Photograph"){
    docData.photograph = assetsAssistedGetFieldValue(panel.photographUpload);
  }else if(docType === "kycProof"){
    docData.kycProofFront = assetsAssistedGetFieldValue(panel.kycProofFront);
    docData.kycProofBack = assetsAssistedGetFieldValue(panel.kycProofBack);
  }else if(docType === "employmentProof"){
    docData.incomeProof1 = assetsAssistedGetFieldValue(panel.incomeProof1);
    docData.incomeProof2 = assetsAssistedGetFieldValue(panel.incomeProof2);
    docData.incomeProof3 = assetsAssistedGetFieldValue(panel.incomeProof3);
  }else if(docType === "incomeProof"){
    docData.bankStat = assetsAssistedGetFieldValue(panel.bankStat);
  }else if(docType === "addDoc"){
    docData.additionalDoc = assetsAssistedGetFieldValue(panel.additionalDoc);
  }else if(docType === "govtIdProof"){
    docData.govtIdProofDoc = assetsAssistedGetFieldValue(panel.govtIdProofDoc);
  }
  return docData;
}

/**
 * Helper function to upload documents to the server
 * @param {string} docType - Document data extracted from the form
 * @param {string} journeyId 
 * @param {string} journeyName 
 * @param {string} phoneNumber 
 * @param {string} parentDocID 
 * @param {string} parentDocName 
 * @param {string} partnerJourneyID
 * @param {object} panel
 * @param {string} bankJourneyID
 * @returns {Promise<Object>} - Promise resolving to the upload response
 */
function assetsAssistedUploadDocuments(docType,journeyId,journeyName,phoneNumber,parentDocID,parentDocName,partnerJourneyID,panel,bankJourneyID) {
  return new Promise((resolve, reject) => {
    try {
      const formData = new FormData();
      const documentIds = [];
      var docData = assetsAssistedExtractDocumentData(docType, panel);
      var additionalDataMap = assetsAssistedCreateDocUploadRequest(journeyId,journeyName,phoneNumber,parentDocID,parentDocName,partnerJourneyID,bankJourneyID);
  
      // Helper function to append files
      const appendFile = (fileData) => {
        if (fileData instanceof File) {
          const uuid = generateUUID();
          formData.append(uuid, fileData); // key = uuid, value = file (binary)
          documentIds.push(uuid); // track uploaded field names
        }
      };
	  
	  if(docType === "Photograph"){
		appendFile(docData.photograph);
	  }else if(docType === "kycProof"){
		appendFile(docData.kycProofFront);
		appendFile(docData.kycProofBack);
	  }else if(docType === "employmentProof"){
		appendFile(docData.incomeProof1);
		appendFile(docData.incomeProof2);
		appendFile(docData.incomeProof3);
	  }else if(docType === "incomeProof"){
		appendFile(docData.bankStat);
	  }else if(docType === "addDoc"){
		appendFile(docData.additionalDoc);
	  }else if(docType === "govtIdProof"){
		appendFile(docData.govtIdProofDoc);
	  }
	//Populate additional data map
	if (additionalDataMap) {
	additionalDataMap.forEach(function (value, key, map) {
		formData.append(key, value);
	});
	}
	// Add document IDs
	formData.append(additionalDataMap.get("childDocID"), documentIds.join(","));

	// If no documents to upload, resolve with null
	if (documentIds.length === 0) {
	  console.warn("No documents to upload");
    resolve(null);
    return;
	}

      // Send the request
      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        `${getSubmitBaseUrl()}/content/hdfc_loan_forms/api/xpressAssist/docUpload.json`,
        true
      );
      // Set the custom header here
      xhr.setRequestHeader("journeyname", journeyName);
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if(response.status.responseCode === "0"){
              console.log(response);
            }
            resolve(response);
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          reject(
            new Error(
              `Upload failed with status ${xhr.status}: ${xhr.statusText}`
            )
          );
          
        }
      };

      xhr.onerror = function () {
        reject(new Error("Network error during document upload"));
      };
      xhr.send(formData);
    } catch (error) {
      
    }
  });
}

/**
 * Prepares and uploads document data from form fields to the document upload API.
 * This function extracts document data from various form fields based on the document type,
 * creates a FormData object with the appropriate metadata, and sends it to the server.
 * @param {string} docType - Document data extracted from the form
 * @param {string} journeyId 
 * @param {string} journeyName 
 * @param {string} phoneNumber 
 * @param {string} parentDocID 
 * @param {string} parentDocName 
 * @param {string} partnerJourneyID
 * @param {object} panel - field panel 
 * @param {string} bankJourneyID
 * @returns {Promise<Object>} - Promise resolving to the upload response
 */
function assetsAssistedDocuploadAPI(docType,journeyId,journeyName,phoneNumber,parentDocID,parentDocName,partnerJourneyID,panel,bankJourneyID) {
  try {    
    // Create and send the form data
    return assetsAssistedUploadDocuments(docType,journeyId,journeyName,phoneNumber,parentDocID,parentDocName,partnerJourneyID,panel,bankJourneyID);
  } catch (error) {
    console.error("Error in document upload process:", error);
    return Promise.reject(error);
  }
}

/**
 * Helper function to fetch LSE response
 * @param {object} requestData
 * @param {scope} globals - Document data extracted from the form
 * @returns {Promise<Object>} - Promise resolving to the upload response
 */
function assetsAssistedFetchLSEData(requestData,globals) {
  return new Promise((resolve, reject) => {
    try {
      // Send the request
      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        `${getSubmitBaseUrl()}/content/hdfc_loan_forms/api/xpressAssist/loanStatusInquiry.json`,
        false
      );
      xhr.onload = function () {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(xhr.responseText);
            assetsAssistedProcessLSEResponse(response,globals);
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          reject(
            new Error(
              `LSE failed with status ${xhr.status}: ${xhr.statusText}`
            )
          );
        }
      };

      xhr.onerror = function () {
        reject(new Error("Network error during LSE call"));
      };
      xhr.send(JSON.stringify(requestData));
    } catch (error) {
      console.error("Error:", error);
    }
  });
}

/**
 * Helper function to trigger LSE API
 * @param {object} requestString
 * @param {scope} globals - Document data extracted from the form
 * @param {string} expectedStep
 * @returns {Promise<Object>} - Promise resolving to the upload response
 */
function assetsAssistedTriggerLSEAPI(requestString,globals,expectedStep) {
  try {
	var requestString = {
	  "requestString": {
		"mobileNo": requestString.mobileNo,
		"journeyID": requestString.journeyID,
		"journeyName": requestString.journeyName,
		"partnerJourneyID": requestString.externalJourneyID,
		"partnerID": requestString.partnerID,
		"bankJourneyID": requestString.partnerJourneyID,
		"productName": requestString.productName,
		"expectedStep": expectedStep
	  }
	};
    // Create and send the form data
    return assetsAssistedFetchLSEData(requestString,globals);
  } catch (error) {
    console.error("Error in LSE process:", error);
    return Promise.reject(error);
  }
}

/**
 * process LSE API response
 * @param {object} lseSuccessResponseObj - LSE API response object
 * @param {scope} globals - Global scope object
 */
function assetsAssistedProcessLSEResponse(lseSuccessResponseObj,globals){
	if (lseSuccessResponseObj !== null && lseSuccessResponseObj.status.responseCode === "0")
	{
		//Hard Reject check will ke kept after LSE response
		var expectedStepResponse = lseSuccessResponseObj.responseString.hasOwnProperty("expectedStepResponse") ? lseSuccessResponseObj.responseString.expectedStepResponse : {};

		if (expectedStepResponse !== null && expectedStepResponse.hasOwnProperty("errorCode") && expectedStepResponse.errorCode === "0") {
			//received successCode
			var stepResponse = expectedStepResponse.hasOwnProperty("stepResponse") ? expectedStepResponse.stepResponse : {};
			var stepResponseSting = stepResponse.hasOwnProperty("responseString") ? JSON.parse(stepResponse.responseString) : "";

			if (stepResponseSting.STP_WFLW.toLowerCase() === "stp_reject") {
				globals.functions.setProperty(globals.form.errorScrrenPanel, { visible: true });
			} else {
				assetsAssistedShowPanelBasedLSE(globals);
			}
		} else {
			assetsAssistedShowPanelBasedLSE(globals);
		}
	} else{
		assetsAssistedShowPanelBasedLSE(globals);
	}
}




/**
 * show Panel Based LSE response
 * @param {scope} globals - Global scope object
 */
function assetsAssistedShowPanelBasedLSE(globals){
  globals.functions.setProperty(globals.form.bre2offerscreenpanel, { visible: false });
  if((globals?.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount && globals?.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount?.$value < 3) || (globals?.form?.hiddenPerfiosRetryCount && globals?.form?.hiddenPerfiosRetryCount?.$value < 3)){
	const retryCount = globals?.form?.hiddenFieldsPanel?.hiddenPerfiosRetryCount?.$value || globals?.form?.hiddenPerfiosRetryCount?.$value;
	const wrappedretryCount = `<p><p>Income e-Verification Failed ${retryCount}/3`
	globals.functions.setProperty(globals.form.reinitiateincomeverificationPanel, { visible: true });
	globals.functions.setProperty(globals.form.verificationButtonPanel.reVerificationButton, { visible: true });
	globals.functions.setProperty(globals.form.verificationButtonPanel.skipVerification, { visible: true });
	globals.functions.setProperty(globals.form.reinitiateincomeverificationPanel.reInitiateIncomeVerification.reinitateIncomeWrapper.income_e_verification_failed_alert,{value: wrappedretryCount})
  }else{
	  globals.functions.setProperty(globals.form.loanOfferScreen, { visible: true });
  }
}

/**
 * Update Risk o meter screen data
 * @param {Object} response
 * @param {scope} globals
 */
function assetsAssistedUpdateRiskOMeterData(response,globals){
	if(response.body.hasOwnProperty("responseString") && response.body.responseString !== null){
		if(response.body.responseString.FILLER5.split(',').includes("RISKOM_BAD")){
			globals.functions.setProperty(globals.form?.loanRiskoMeterPopup?.creditBureauScore, { value: "Weak"});
			globals.functions.setProperty(globals.form?.loanRiskoMeterPopup?.internalCheckMatch, { value: "No Match Found"});
			globals.functions.setProperty(globals.form?.loanRiskoMeterPopup?.fraudCheckMatch, { value: "No Match Found"});
      
		}else if(response.body.responseString.FILLER5.split(',').includes("RISKOM_NUTRAL")){
			globals.functions.setProperty(globals.form?.loanRiskoMeterPopup?.creditBureauScore, { value: "Moderate"});
			globals.functions.setProperty(globals.form?.loanRiskoMeterPopup?.internalCheckMatch, { value: "Weak Match"});
			globals.functions.setProperty(globals.form?.loanRiskoMeterPopup?.fraudCheckMatch, { value: "Flagged"});
      
		}
	}else{
		globals.functions.setProperty(globals.form?.loanRiskoMeterPopup?.creditBureauScore, { value: "Moderate"});
		globals.functions.setProperty(globals.form?.loanRiskoMeterPopup?.internalCheckMatch, { value: "Weak Match"});
		globals.functions.setProperty(globals.form?.loanRiskoMeterPopup?.fraudCheckMatch, { value: "Flagged"});
    
	}
}

/**
 * Prepares document data from form fields to the document upload API.
 * @param {string} journeyID 
 * @param {string} journeyName 
 * @param {string} mobNum 
 * @param {string} partnerJourneyID
 * @param {string} bankJourneyID
 */
function assetsAssistedDocUploadScreenData(journeyID,journeyName,mobNum,partnerJourneyID,bankJourneyID){
	globals.form.$properties.docJourneyID = journeyID;
	globals.form.$properties.docJourneyName = journeyName;
	globals.form.$properties.docMobNum = mobNum;
	globals.form.$properties.docPartnerJourneyID = partnerJourneyID;
	globals.form.$properties.docBankJourneyID = bankJourneyID;
}

/**
 * 
 * @param {object} data 
 * @param {scope} globals 
 */
function assetsAssistedReviewDetailsPrefill(data ,globals){

}

/**
 * Validates the two numeric fields to check if the second field value is greater than or equal to the first field value
 * @param {Object} monthlyIncome - First numeric field object
 * @param {Object} emiAmount - Second numeric field object
 * @param {scope} globals - Global scope object
 * @returns {Boolean} 
 */
function assetsAssistedValidateEMIAmount(monthlyIncome, emiAmount, globals) {
  if(emiAmount.$value > monthlyIncome.$value) {
    globals.functions.markFieldAsInvalid(emiAmount.$id, "Please enter amount lesser than Your Net Take Home Monthly Salary", { useId: true });
  }
  else{
    const onGoingIncomeField = globals.form.customerPersonalDetailsWrapper.customerPersonalDetailsSection.customerDetailMainPanel.customerDetailBodyPanel.incomeDetailsWrapper.incomeDetails.onGoingIncome;
    globals.functions.setProperty(onGoingIncomeField, {valid: true});
  }
}

/**
 * Retrieves the workemail by removing special characters from the email
 * @param {string} workEmail - workemail parameter 
 * @param {string} characterToRemove - make substring as empty after specified character
 * @returns {string} 
 */
function assetsAssistedFormatWorkEmail(workEmail, characterToRemove) {
  let regex = new RegExp(`(${characterToRemove}).*`);
  workEmail = workEmail.replace(regex, '$1');
  return workEmail;
}



function customCustomerDetailsDropOff(customerDemogData, globals) {
}

/**
 * Resets and validates a list of enabled components under a wrapper.
 * @param {object} wrapper - Container that holds the field components.
 * @param {{ reset: Function, setProperty: Function }} functions - AEM functions.
 * @param {string[]} fieldNames - Field keys to process.
 */
function resetEnabledFields(wrapper, functions, fieldNames) {
  const { reset, setProperty } = functions || {};
  if (!wrapper || typeof reset !== 'function' || typeof setProperty !== 'function') return;

  for (const key of fieldNames) {
    const cmp = wrapper[key];
    if (cmp?.['_jsonModel']?.enabled) {
      reset(cmp);
      setProperty(cmp, { valid: true });
    }
  }
}

/**
 * Handles the selection of channel within bank use section.
 * Resets the bank use section fields if they are enabled.
 * @param {scope} globals
 */
function assetsAssistedChannelSelectionHandler(globals) {
  const wrapper = globals?.form?.loginWrapper?.bankUseAccordian?.bankUseSection?.bankUseSectionWrapper;
  const fields = ['dsaCode','branchCode','crmNumber','smCode','seCode','tseCode','promoCode','lcCode','lgCode'];
  resetEnabledFields(wrapper, globals?.functions, fields);
}



/**
 * @name validateName
 * @description Validates a single customer name field
 * @param {Object} customerNameObj - The name field object
 * @param {scope} globals - Global form object
 */
function validateName(customerNameObj, globals){
}

/**
 * Sets a value from one input field to another input field
 * @param {object} sourceField - The source input field object containing the value to copy
 * @param {object} targetField - The target input field object where the value will be set
 * @param {scope} globals - Global scope object
 * @returns {void}
 */
function setValueFromInputToNumberField(sourceField, targetField, globals) {
}


/**
 * @name validateEmail
 * @description Validates personal email against pattern, mandatory, and work email duplication
 * @param {Object} emailObj - Personal email field object
 * @param {scope} globals - Global form object
 * @returns {boolean} - true if valid, false if invalid
 */
function validateEmail(emailObj, globals){
}

/**
 * Calculates remaining time required before minimum API duration is met
 * and automatically manages loader visibility.
 *
 * This function is generic and reusable across all API flows.
 * It handles:
 * - Calculating remaining time in seconds
 * - Showing loader when remaining time > 0
 * - Auto-hiding loader after remaining time elapses
 *
 * Usage in Rule Editor:
 * remainingTime > 0  -> loader is shown + countdown starts
 * remainingTime === 0 -> loader is hidden
 *
 * @param {string|Date} startTime - API trigger timestamp
 * @param {string|Date} endTime - API callback timestamp (or current time)
 * @param {number} minDurationSeconds - Minimum required duration in seconds
 * @param {scope} globals - Global scope object for event dispatching
 *
 * @returns {number} Remaining time in seconds (0 if minimum duration met or error)
 *
 * @example
 * // Show loader for minimum 5 seconds
 * const apiStartTime = new Date().toISOString();
 * // ... API call happens ...
 * const remainingTime = calculateApiTiming(
 *   apiStartTime,
 *   new Date(),
 *   5,
 *   globals
 * );
 * // Loader automatically shown and will hide after remaining time
 */
function calculateApiTiming(startTime, endTime, minDurationSeconds, globals) {
  try {
    console.log('calculateApiTiming: Starting calculation', {
      startTime,
      endTime,
      minDurationSeconds
    });

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('calculateApiTiming: Invalid timestamp', {
        startTime,
        endTime,
        startValid: !isNaN(start.getTime()),
        endValid: !isNaN(end.getTime())
      });
      return 0;
    }

    // Calculate elapsed time
    const elapsedMs = Math.abs(end.getTime() - start.getTime());
    console.log('calculateApiTiming: Elapsed time (ms):', elapsedMs);

    // Minimum required duration
    const minDurationMs = minDurationSeconds * 1000;
    console.log('calculateApiTiming: Minimum duration (ms):', minDurationMs);

    // Remaining time (never negative)
    const remainingMs = Math.max(0, minDurationMs - elapsedMs);
    const remainingSeconds = remainingMs / 1000;
    
    console.log('calculateApiTiming: Remaining time', {
      remainingMs,
      remainingSeconds
    });

    // Handle loader visibility based on remaining time
    if (remainingSeconds > 0) {
      console.log('calculateApiTiming: Showing loader for', remainingSeconds, 'seconds');
      
      // Show loader immediately
      globals.functions.dispatchEvent(globals.form, "custom:showLoader");
      
      // Schedule hiding loader after remaining time elapses
      dispatchEventWithDelay(remainingMs, globals.form, "hideLoader", globals);
      
      console.log('calculateApiTiming: Loader scheduled to hide after', remainingMs, 'ms');
    } else {
      console.log('calculateApiTiming: Minimum duration met, hiding loader');
      
      // Hide loader if already shown (minimum duration already met)
      globals.functions.dispatchEvent(globals.form, "custom:hideLoader");
    }

    // Return remaining time in seconds
    return remainingSeconds;

  } catch (error) {
    console.error('calculateApiTiming error:', error);
    
    // Ensure loader is hidden on error
    if (globals && globals.functions) {
      console.log('calculateApiTiming: Error occurred, hiding loader');
      globals.functions.dispatchEvent(globals.form, "custom:hideLoader");
    }
    
    return 0;
  }
}
// eslint-disable-next-line import/prefer-default-export
export {
  maskMobileNumber,
  isSSO,
  getFullName,
  days,
  submitFormArrayToString,
  populateLastFiveDigits,
  setProperty,
  getProperty,
  getArrayProperty,
  getCustomEventPayload,
  createJourneyId,
  calculateAge,
  filterIfscCode,
  showWizardHideLoginFragment,
  computeBranchState,
  setFieldProperty,
  importRecommendedSubProducts,
  replaceString,
  computeAccountVariant,
  getFieldProperty,
  getFormDataAsString,
  getClientInfoAsObject,
  removeHyphensAndUnderscores,
  sendAadharRequest,
  validateLoginPage,
  validateOtpPage,
  validateDobAge,
  validateAuthenticator,
  convertDateFormat,
  getCurrentIsoDateTime,
  getJourneyName,
  getJourneyId,
  getConsentValue,
  formErrorHandler,
  splitAddress,
  mask,
  formatFeaturesArray,
  filterAccounts,
  computeRecommendations,
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
  cleanArray,
  setFieldValueWithDelay,
  decrypt,
  encrypt,
  createStateInfoObject,
  getOffsetDate,
  setFormData,
  getRJDateFormat,
  includesInDelimitedString,
  convertDateToFormat,
  prefillSmartPayReviewDetails,
  formatIncome,
  getExtremeFromJsonArray,
  sortJsonArrayByKey,
  populateDynamicConsent,
  createMappingFromArray,
  transformDateFormat,
  isSelfEmployedDurationInvalid,
  enableOvdButton,
  regexTest,
  isValidProductCode,
  getConsentInputValue,
  initRestAPIDataSecurityService,
  putLgLcRetention,
  getCurrentYear,
  applicationStatusInfoArray,
  dataRefParamTrim,
  formatStateInfo,
  rmDashBoardArrayFormat,
  createPartnerJourneyId,
  createConsentFormatData,
  getFirstNameFromCustName,
  getLastNameFromCustName,
  maskMobileNumberAssetsFormat,
  extractJIDFromUTM, 
  extractArrayElement,
  assetsAssistedApplicationStatusInfoArray,
  assetsAssistedRMDashBoardArrayFormat,
  assetsAssistedDataRefParamTrim,
  assetsAssistedFormatStateInfo,
  assetsAssistedCreatePartnerJourneyId,
  assetsAssistedCreateConsentFormatData,
  assetsAssistedGetFirstNameFromCustName,
  assetsAssistedGetLastNameFromCustName,
  assetsAssistedMaskMobileNumberAssetsFormat,
  assetsAssistedFilterDemogDetails,
  assetsAssistedCustomerDemogDetails,
  assetsAssistedConvertToTitleCase,
  assetsAssistedReinitiateJourney,
  assetsAssistedConvertToNumber,
  getCreditPromoCode,
  assetsAssistedTenSecondLoanData,
  getAccountdetailsFIP,
  assetsAssistedIfscCodeFilter,
  assetsAssistedStoreAccountNumber,
  assetsAssistedGetIPALoanAndTenure,
  assetsAssistedCalculateIRRData,
  assetsAssistedTenureMultiplierResponse,
  assetsAssistedIPAOfferText,
  assetsAssistedUpdateEmpData,
  assetsAssistedPopulateEtbAccounts,
  assetsAssistedRadioSelectionHandler,
  assetsAssistedUpdateCityStateID,
  assetsAssistedUpdateAddressDataNTB,
  assetsAssistedUpdateAddressDataETB,
  assetsAssistedSetLoanSlider,
  assetsAssistedUpdatePerfiosRetryCount,
  assetsAssistedGetResidentType,
  assetsAssistedChoiceAllEverify,
  assetsAssistedTryAgainFunctionality,
  assetsAssistedGoToBottomFunctionality,
  assetsAssistedValidateEmail,
  assetsAssistedWorkEmailValidation,
  populateLoanDetails,
  assetsAssistedUpdateAadharAddress,
  updateLoanTenureSliderAndInput,
  assetsAssistedFormatWorkEmail,
  assetsAddClassNameBankIcon,
  assetsAssistedRemoveClassNameBankIcon,
  assetsAssistedOtherEmpData,
  assetsAssistedCheckDocUploadStatus,
  assetsAssistedValidateEMIAmount,
  assetsAssistedDocuploadAPI,
  assetsAssistedReviewDetailsPrefill,
  assetsAssistedDocUploadScreenData,
  assetsAssistedChannelSelectionHandler,
  retryHandler,
  validateName,
  setValueFromInputToNumberField,
  validateEmail,
calculateApiTiming
};
