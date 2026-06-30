/* eslint-disable max-len */

import { CLICK_CONFIG, LOAD_CONFIG } from './analytics-constant.js';

/**
 * parse api payload
 */
function parseApiResponse(apiEventTrigger, payload) {

  let errorCode = payload?.data?.status?.errorCode;
  let errorMsg = payload?.data?.status?.errorMsg;

  // API overrides
  switch (apiEventTrigger) {
    case 'consentApiCall-consentreceipts.json-consentApiCall':
      errorCode = payload?.status?.errorCode;
      errorMsg = payload?.status?.errorMessage;
      break;
    case 'personalDetailsContinue-state.india.json-click':
      errorCode = payload?.success;
      break;
    case 'financialDetailsContinue-panValNameMatch.json-click':
      errorCode = payload?.panValidation?.status?.errorCode;
      errorMsg = payload?.panValidation?.status?.errorMsg;
      break;
    case 'loginFragment-returnjourneyinfo.json-otpSuccess':
      errorCode = payload?.errorCode;
      errorMsg = payload?.errorMessage;
      break;
    case 'continueOvdClick':
      errorCode = payload?.errorCode;
      errorMsg = payload?.errorMessage;
      break;
    case 'onpremcallback':
      errorCode = payload?.errorCode;
      errorMsg = payload?.errorMessage;
      break;
    case 'panNameMatch':
      errorCode = payload?.errorCode;
      errorMsg = payload?.errorMessage;
      break;
    case 'bre1':
    case 'bre1onpremcallback':
    case 'bre2':
    case 'bre2onpremcallback':
      errorCode = payload?.errorCode;
      errorMsg = payload?.errorMessage;
      break;
    case 'customerEligibilityCheck':
      errorCode = payload?.errorCode;
      errorMsg = payload?.errorMessage;
      break;
    case 'kycContinue0-consentcollectionreceipts.json-click':
      errorCode = payload?.status?.errorCode;
      errorMsg = payload?.status?.errorMessage;
      break;
    case 'kycContinue1-consentcollectionreceipts.json-click':
      errorCode = payload?.status?.errorCode;
      errorMsg = payload?.status?.errorMessage;
      break;
    case 'reviewSubmit-leadcreateupdateaccountopeningvkyc.json-customerEligibilitySuccess':
      errorCode = payload?.accountOpening?.errorCode;
      if(errorCode === "BA001")
      {
        errorMsg = payload?.leadCreationStatus?.errorText;
        errorCode = payload?.leadCreationStatus?.errorCode; 
        break;
      }
      errorMsg = payload?.accountOpening?.errorText;
      break;

     case 'reviewSubmit-etbaccountleadupdate.json-customerEligibilitySuccess':
      errorCode = payload?.accountLeadUpdateStatus?.errorCode;
      errorMsg = payload?.accountLeadUpdateStatus?.errorText;
      break;

    case 'addMoneyButton-paymentorderidcheck.json-click':
      errorCode = payload?.errorCode;
      errorMsg = payload?.errorMessage;
      break;

    case 'computerecommended':
      errorCode = payload?.errorCode;
      errorMsg = payload?.errorMessage;
      break;
    default:
      break;
  }

  const isSuccess = errorCode === null || errorCode === '0' || errorCode === 'true' || errorCode === '00' || errorCode === '1' ||errorCode === 'RJI0000' || errorCode === 'RJI0001' || errorCode === '500' || errorCode === undefined;
  const config = CLICK_CONFIG[apiEventTrigger] || {};

  return {
    errorCode,
    errorMsg,
    isSuccess,
    journeyState: isSuccess
      ? config.journeyStateSuccessCase
      : config.journeyStateFailureCase || '',
    errorPage: isSuccess ? 'Error Page' : config.errorPage || 'Error Page',
  };
}

/**
 * evaluateApiResponse function used in the api button click events where it validates the response and return the results in objetc
 */
const checkApiResponseIntegrity = (apiEventTrigger, payload, apiName) => {
  const {
    errorCode,
    errorMsg,
    isSuccess,
    journeyState,
    errorPage
  } = parseApiResponse(apiEventTrigger, payload);

  return {
    success: isSuccess,
    errorCode,
    errorMsg,
    errorPage,
    apiLabel: apiName,
    journeyState,
  };
};

/**
 * Hashes a phone number using SHA-256 algorithm.
 *
 * @function hashInSha256
 * @param {string}  - The phone number to be hashed.
 * @returns {Promise<string>} A promise that resolves to the hashed phone number in hexadecimal format.
 */
const hashInSha256 = async (inputString) => {
  const encoder = new TextEncoder();
  const rawdata = encoder.encode(inputString);
  const hash = await crypto.subtle.digest('SHA-256', rawdata);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const hashPhNo = async (phoneNumber) => {
  const hashed = await hashInSha256(String(phoneNumber));
  return hashed;
};

export {
  // eslint-disable-next-line import/prefer-default-export
  checkApiResponseIntegrity,
  hashPhNo,
};
