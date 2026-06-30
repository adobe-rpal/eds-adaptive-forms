/* eslint-disable max-len */
import { subscribe } from '../../rules/index.js';
import { getSubmitBaseUrl, isEncryptionEnabled } from '../../constant.js';
import { encrypt, decrypt } from '../../../../../eds-cc/creditcard/functions.js';

let leadId;
let globalStateTracker = [];
let initial = true;
let unBoundDataFromJourneyCall = null;
let initialJourneyState = 'CUSTOMER_LEAD_QUALIFIED';
// Terminal states that should also trigger parent journey update with mapped state names
const TERMINAL_STATES_WITH_PARENT_MAPPING = {
  'CUSTOMER_ONBOARDING_COMPLETED': 'CUSTOMER_CREDITCARD_ONBOARDING_SUCCESS',
  'CUSTOMER_ONBOARDING_FAILED': 'CUSTOMER_CREDITCARD_ONBOARDING_FAILED',
};

/**
 * Returns a copy of the form data with specific fields cleared (set to empty string),
 * based on the paths provided in the global `unBoundDataFromJourneyCall` string.
 *
 * Supports:
 * - Simple field paths like 'user.email'
 * - Array paths like 'profile.contacts[*][role,regex]' to clear fields inside each object in the array
 *
 * @param {Object} formData - The form data to process.
 * @returns {Object} - A new form data object with selected fields cleared.
 *
 * @example
 * For: unBoundDataFromJourneyCall = 'user.email+profile.name'
 * const formData = {
 *   user: { email: 'test@example.com', id: 123 },
 *   profile: { name: 'John', age: 30 }
 * };
 *
 * const result = createWithUnbound(formData);
 * result = {
 *    user: { email: '', id: 123 },
 *    profile: { name: '', age: 30 }
 *  }
 *
 * @example
 * For: unBoundDataFromJourneyCall = 'profile.contacts[*][role,regex]'
 * const formData = {
 *   profile: {
 *     contacts: [
 *       { role: 'admin', regex: '.*admin.*', name: 'Alice' },
 *       { role: 'user', regex: '.*user.*', name: 'Bob' }
 *     ]
 *   }
 * };
 *
 * const result = createWithUnbound(formData);
 *  result = {
 *    profile: {
 *      contacts: [
 *       { role: '', regex: '', name: 'Alice' },
 *       { role: '', regex: '', name: 'Bob' }
 *      ]
 *    }
 *  }
 */

const createWithUnbound = (formData = {}) => {
  try {
    const unboundList = unBoundDataFromJourneyCall?.split('+') || [];
    const data = { ...formData };
    unboundList.forEach((path) => {
      const arrayPatternMatch = path.match(/(.*?)\[\*\]\[(.*)\]/);
      if (arrayPatternMatch) {
        // Handles: profile.name[*][role,regex]
        const basePath = arrayPatternMatch[1]; // "profile.name"
        const fields = arrayPatternMatch[2].split(',').map((k) => k.trim());

        const properties = basePath
          .replace(/\[/g, '.')
          .replace(/\]/g, '')
          .split('.')
          .filter(Boolean);

        let current = data;
        properties.forEach((key) => {
          if (!current[key]) current[key] = [];
          current = current[key];
        });

        if (Array.isArray(current)) {
          current.forEach((item) => {
            fields.forEach((field) => {
              item[field] = '';
            });
          });
        }
      } else {
        // Handles: user.email or profile.name
        const properties = path
          .replace(/\[/g, '.')
          .replace(/\]/g, '')
          .split('.')
          .filter(Boolean);

        let current = data;
        properties.slice(0, -1).forEach((key) => {
          if (current[key] === undefined || typeof current[key] !== 'object') {
            current[key] = {};
          }
          current = current[key];
        });
        current[properties.at(-1)] = '';
      }
    });
    return data;
  } catch {
    return formData;
  }
};

/**
 * Creates journey state info array from states array
 * @param {Array} states - Array of state names
 * @param {Object} data - Form data to include in stateInfo
 * @param {Object} additionalParameters - Additional parameters to include in stateInfo
 * @returns {Array} Array of journey state objects
 */
function createJourneyStateInfo(states = [], data = {}, additionalParameters = {}) {
  const formData = unBoundDataFromJourneyCall ? createWithUnbound(data) : data;

  if (!states || !Array.isArray(states) || states.length === 0) {
    return globalStateTracker;
  }

  // Merge additional parameters into formData for stateInfo
  const formDataWithAdditional = {
    ...formData,
    ...additionalParameters,
  };

  let currentTime = new Date().toISOString();
  if (additionalParameters?.useTimezoneSpecificTime) { // Added to make compatible with Native journey. We can turn this flag off for the latest EDS implementations.
    // ISO format with local timezone time (note: 'Z' suffix remains but time is local)
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    currentTime = (new Date(Date.now() - tzoffset)).toISOString();
  }
  const newStateEntries = states.map((state) => {
    const entry = {
      stateInfo: JSON.stringify(formDataWithAdditional),
      state,
      timeinfo: currentTime
    };

    if (formData.isFeedback === 'Y') {
      entry.feedback = formData.feedbackRatingValue;
    }

    return entry;
  });

  // As per Prudhvi, the journey states are repeating in the DB for the same Journey ID.
  // So we are returning the newStateEntries instead of adding to the globalStateTracker.
  // globalStateTracker = [...globalStateTracker, ...newStateEntries];
  // return globalStateTracker;
  return newStateEntries;
}

/**
 * Makes a fetch request to the specified URL with the given payload
 * @param {string} url - The URL to fetch
 * @param {Object} payload - The payload to send in the request body
 * @returns {Promise} - The fetch promise
 */
function triggerFetch(url, payload) {
 // const currentDate = new Date();
  return fetch(url, {
    method: 'POST',
   // credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
     // 'iat': typeof window !== undefined ? btoa(currentDate.getTime()) : '',
     // 'journeyid': myForm.properties.journeyId,
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        console.error(`API call to ${url} failed:`, response.statusText);
        throw new Error(`API call failed: ${response.statusText}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error(`Error calling API ${url}:`, error);
      throw error;
    });
}

/**
 * Makes a fetch request with encrypted payload and decrypts the response
 * Uses a mutex to prevent parallel encryption operations
 * @param {string} url - The URL to fetch
 * @param {Object} payload - The payload to encrypt and send
 * @returns {Promise<Object|null>} - Resolves to decrypted response data or null on failure
 * @throws Will throw an error if encryption or fetch fails
 */
async function triggerEncFetch(url, payload) {
  try {
    const requestData = {
      body: payload,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Acquire encryption lock to serialize encryption calls
    //await encryptionMutex.lock();

    const encryptedData = await encrypt(requestData);
      // Always release the lock regardless of encrypt success/failure
      //encryptionMutex.unlock();

    const response = await fetch(url, {
      method: 'POST',
      headers: encryptedData.headers,
      body: encryptedData.body,
    });

    if (!response.ok) {
      console.error(`Encrypted API call to ${url} failed:`, response.statusText);
      throw new Error(`API call failed: ${response.statusText}`);
    }

    let responseData;
    const contentType = response.headers.get('Content-Type') || '';

    if (contentType.includes('application/json')) {
      responseData = await response.json();
      return responseData
    } else {
      responseData = await response.text();
      // Decrypt and parse JSON response
      const decrypted = await decrypt(responseData, encryptedData);
      return JSON.parse(decrypted);
    }

  } catch (error) {
    console.warn('Encrypted request failed:', error);
    // You can choose to throw or return null/fallback here
    return null;
  }
}

// Mutex to serialize encryption operations
const encryptionMutex = {
  locked: false,
  queue: [],

  async lock() {
    if (this.locked) {
      await new Promise(resolve => this.queue.push(resolve));
    }
    this.locked = true;
  },

  unlock() {
    this.locked = false;
    if (this.queue.length > 0) {
      const nextResolve = this.queue.shift();
      nextResolve();
    }
  },
};

// Removes spaces from all object keys deeply
const fixKeys = (obj) => {
  if (Array.isArray(obj)) return obj.map(fixKeys);

  if (obj && typeof obj === "object") {
    const newObj = {};
    for (let key in obj) {
      const newKey = key.replace(/ /g, "_");   // replace spaces in keys
      newObj[newKey] = fixKeys(obj[key]);
    }
    return newObj;
  }

  return obj;
};

async function triggerJourneyAPI(data, states, form, type) {
  const { RegisteredPhoneNum, AadharDOB, DateOfBirth } = data;
  const { browserAgent, mob, useTimezoneSpecificTime } = form?.properties || {};
  let { journeyId, journeyid } = form?.properties || {};
  let journeyName = form?.properties?.journeyName || '';

  //TODO - changed here because createjourneyID method triggered later
  if (journeyId && journeyId.includes("INSTASAVING_VRM_U_WEB")) {
    journeyId = journeyId.replace("INSTASAVING_VRM_U_WEB", "ISVRM_U_WEB");
    journeyid = journeyId;
  }
  const sudoJourneyName = form?.properties?.sudoJourneyName || "";
   data = fixKeys(data);
  if (form?.properties?.strayFormDataList) {
    // In form authoring, ensure `strayFormDataList` is configured in form properties
    unBoundDataFromJourneyCall = form?.properties?.strayFormDataList;
  }
  if(sudoJourneyName !== ""){
    journeyName = sudoJourneyName;
  }
  const leadProfile = {
    profile: {
      dob: AadharDOB || DateOfBirth ||'',
    },
    mobileNumber: (RegisteredPhoneNum || mob || '').toString() || '',
  };

  leadId = form.properties?.leadProfileID || form.properties?.leadProfileId;
  if (leadId) {
    leadProfile.leadProfileId = leadId;
    /* leadProfileId is created as text filed along with schema */
    data.leadProfileId = leadId;
  }

  // Extract additional parameters for journey state info
  const journeyStateInfoAdditionalParametersToAdd = {
    ...(form?.properties?.journeyStateInfoAdditionalParametersToAdd || {}),
  };

  if (!journeyStateInfoAdditionalParametersToAdd.useTimezoneSpecificTime && useTimezoneSpecificTime) {
    journeyStateInfoAdditionalParametersToAdd.useTimezoneSpecificTime = useTimezoneSpecificTime;
  }

  if (data?.LeadProfileId) {
    leadProfile.leadProfileId = Number(data.LeadProfileId);
     data.leadProfileId = Number(data.LeadProfileId);
  }

  const payload = {
    RequestPayload: {
      userAgent: browserAgent,
      leadProfile,
      formData: {
        journeyName,
        journeyStateInfo: createJourneyStateInfo(states, data, journeyStateInfoAdditionalParametersToAdd),
        channel: 'ADOBE WEBFORMS',
        journeyID: journeyId,
        isExisitingCustomer: form?.properties?.isExistingCustomer,
      },
    },
  };
  const url = type === 'dropoff' ? `${getSubmitBaseUrl()}/content/hdfc_commonforms/api/journeydropoff.json` : `${getSubmitBaseUrl()}/content/hdfc_commonforms/api/journeydropoffupdate.json`;
  let responseData;
  if (isEncryptionEnabled || data?.security?.enabled === 'true') {
    responseData = await triggerEncFetch(url, payload);
  } else {
    responseData = await triggerFetch(url, payload);
  }
  // Store leadProfileId from response if not already set
  if (!leadId && responseData?.lead_profile_info?.leadProfileId) {
    leadId = responseData.lead_profile_info.leadProfileId;
    // todo : How do we set leadId to the form property
    form.properties.leadProfileId = leadId.toString();
    form.properties.journeyId = journeyId?.toString();
    form.properties.journeyid = journeyid?.toString();
  }

  // Store Last Journey Payload in Properties.
  form.properties.journeyJsonObject = payload;
  return responseData;
}

function normalizeJourneyId(journeyId = '') {
  if (journeyId && journeyId.includes("INSTASAVING_VRM_U_WEB")) {
    return journeyId.replace("INSTASAVING_VRM_U_WEB", "ISVRM_U_WEB");
  }

  return journeyId;
}

function resolveJourneyTargets(form) {
  const formProperties = form?.properties || {};
  const queryParams = formProperties.queryParams || {};

  const insuranceJourneyId = normalizeJourneyId(
    formProperties.insuranceJourneyId || formProperties.journeyId || formProperties.journeyid || ''
  );

  const parentJourneyId = normalizeJourneyId(
    formProperties.parentJourneyId
      || queryParams.parentJourneyId
      || queryParams.parentJourneyID
      || queryParams.parentjourneyId
      || ''
  );

  // Use jName query param passed by IS form; fall back to registered IS journey name.
  const parentJourneyName = queryParams.jName || 'INSTA_SAVINGS_JOURNEY';

  return {
    insuranceJourneyId,
    parentJourneyId,
    parentJourneyName,
  };
}

function buildJourneyCallSequence(currentState, form) {
  const { insuranceJourneyId, parentJourneyId, parentJourneyName } = resolveJourneyTargets(form);

  if (!insuranceJourneyId) {
    return [];
  }

  const isInitialInsuranceState = initial && currentState === initialJourneyState;
  const sequence = [];

  // Always add credit card journey (insuranceJourneyId) calls
  if (isInitialInsuranceState) {
    sequence.push({ type: 'dropoff', journeyId: insuranceJourneyId, journeyName: null, state: currentState });
    sequence.push({ type: 'dropoffupdate', journeyId: insuranceJourneyId, journeyName: null, state: currentState });
    initial = false;
  } else {
    sequence.push({ type: 'dropoffupdate', journeyId: insuranceJourneyId, journeyName: null, state: currentState });
  }

  // Only send to parent journey for terminal states with mapped state names
  if (parentJourneyId
      && parentJourneyId !== insuranceJourneyId
      && TERMINAL_STATES_WITH_PARENT_MAPPING[currentState]) {
    sequence.push({
      type: 'dropoffupdate',
      journeyId: parentJourneyId,
      journeyName: parentJourneyName,
      state: TERMINAL_STATES_WITH_PARENT_MAPPING[currentState], // Use mapped state for parent
    });
  }

  return sequence;
}

async function apiHandler(currentValue, form) {
  if (!currentValue) {
    return;
  }

  const sequence = buildJourneyCallSequence(currentValue, form);

  if (sequence.length === 0) {
    if (initial && currentValue === initialJourneyState) {
      initial = false;
      await triggerJourneyAPI(form.exportData(), [currentValue], form, 'dropoff');
      return;
    }

    await triggerJourneyAPI(form.exportData(), [currentValue], form, 'dropoffupdate');
    return;
  }

  const originalJourneyId = form?.properties?.journeyId;
  const originalJourneyid = form?.properties?.journeyid;
  const originalJourneyName = form?.properties?.journeyName;

  for (const { type, journeyId, journeyName, state } of sequence) {
    form.properties.journeyId = journeyId;
    form.properties.journeyid = journeyId;
    form.properties.journeyName = journeyName || originalJourneyName;
    // Use state from sequence if provided, otherwise use currentValue
    const stateToSend = state || currentValue;
    await triggerJourneyAPI(form.exportData(), [stateToSend], form, type);
  }

  form.properties.journeyId = originalJourneyId;
  form.properties.journeyid = originalJourneyid;
  form.properties.journeyName = originalJourneyName;
}

// state button invokes the journeydropoff API when navigating to subsequent panels.
// sometimes state is updated based on the response of someother API so we rely
// on the propertyChange of successState or errorState for API invocation.
// But there are cases where when the button is clicked the state is updated,
// so there should be an currentState property
// on button that can be set via authoring or dynamically based on  user action on the form.
export default function decorate(element, fd, container, formId) {
  subscribe(element, formId, (_element, fieldModel) => {
    const { form, properties } = fieldModel;
    const { currentState } = properties;
    if (currentState) {
      apiHandler(currentState, form);
      fieldModel.properties.currentState = null;
    }
    fieldModel.subscribe((e) => {
      const { changes } = e?.payload || {};
      changes?.forEach((change) => {
        if (change?.propertyName.includes('properties')) {
          const { currentValue } = change;
          if (currentValue) {
            apiHandler(currentValue, form);
            fieldModel.properties.currentState = null;
          }
        }
      });
    }, 'change');
  });
  return element;
}