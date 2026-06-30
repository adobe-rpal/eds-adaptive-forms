import { getAnalyticsActions } from './actions.js';
import { hashPhNo } from './analytics-utils.js';

let hashedPhone = '';

export function prepareHashedPhone(form, callback) {
  if (form.exportData().RegisteredPhoneNum) {
    hashPhNo(form.exportData().RegisteredPhoneNum)
      .then((result) => {
        hashedPhone = result;
        if (callback) callback();
      })
      .catch((err) => console.error('Hashing failed:', err));
  } else if (callback) callback();
}

export function getAnalyticsData(form) {
  window.digitalData = window.digitalData || {};
  digitalData = window.digitalData;
  digitalData.user = digitalData.user || {};
  digitalData.event = digitalData.event || {};
  digitalData.formDetails = digitalData.formDetails || {};
  digitalData.assisted = digitalData.assisted || {};
  digitalData.form = digitalData.form || {};
  digitalData.link = digitalData.link || {};
  digitalData.page = digitalData.page || {};
  digitalData.page.pageInfo = digitalData.page.pageInfo || {};
  digitalData.card = digitalData.card || {};

  const formData = form.exportData();
  const actionMapping = getAnalyticsActions(form);
  const ccVars = form.properties?.creditCardJourneyVariables || {};

  // ── Journey variant — multi-flow detection ──
  // Cross-check: ccVars.journeyVariant may say 'Bundled_Journey' while the
  // CC spec expects 'Bundled_Journey_CC'. Prefer ccVars first if you want CC
  // to override IS-supplied value; otherwise default kicks in.
  let journeyVariant;
  if (formData.gigaUtmCheck === 'gigaccount') {
    journeyVariant = 'Giga_Bundled_Journey';
  } else if (form.properties?.baasFlow === 'true') {
    journeyVariant = 'BaasFlow_Bundled_Journey';
  } else {
    journeyVariant =
      ccVars.journeyVariant
      || form.properties?.journeyVariant
      || 'Bundled_Journey_CC';
  }

  let isAccountCreated = 'Yes';

  return {
    // ─────────────────────────────────────────────────────────────────
    //  Generic (every page / every click)
    // ─────────────────────────────────────────────────────────────────
    'digitalData.page.pageInfo.pageName': formData.pageName || '',
    'digitalData.user.journeyID':         form.properties.journeyId || '',
    'digitalData.user.journeyName':       form.properties.journeyName || '',
    'digitalData.user.journeyState':      form.properties.journeyState || '',
    'digitalData.user.journeyLevel2':     'Bundled_Journey_CC',
    'digitalData.user.journeyVariant':    journeyVariant || '',
    'digitalData.user.casa':              'No',
    'digitalData.form.name':              'ntb cc w/o offer',

    // Link fields — mapEventDigitalData overrides per click; kept for completeness
    'digitalData.link.linkName':     actionMapping[0]?.linkName || '',
    'digitalData.link.linkType':     actionMapping[0]?.linkType || '',
    'digitalData.link.linkPosition': actionMapping[0]?.linkPosition || '',

    // Form status (set per beacon by analytics.js)
    'digitalData.event.status': '',

    // ─────────────────────────────────────────────────────────────────
    //  Page errors
    // ─────────────────────────────────────────────────────────────────
    'digitalData.page.pageInfo.errorCode':    formData.errorCode || '',
    'digitalData.page.pageInfo.errorMessage': formData.errorMessage || '',
    'digitalData.page.pageInfo.errorAPI':     formData.errorAPI || '',

    // ─────────────────────────────────────────────────────────────────
    //  Thank-you / CC Cross-Sell + New CC Confirmation
    // ─────────────────────────────────────────────────────────────────
    'digitalData.formDetails.isAccount':
      ccVars.isAccount || isAccountCreated || '',

    'digitalData.formDetails.isVideoKYC':
      ccVars.isVideoKYC
      || (form.properties.vkycErrorCode === 'VD0000' ? 'Yes' : 'No'),

    'digitalData.formDetails.isFundingEligible':
      ccVars.isFundingEligible || '',

    'digitalData.formDetails.leadGenerated':
      ccVars.leadGenerated || isLeadCreated || '',

    // Cross-check: ccVars.formSubmitted is currently 0 (number). Using `??`
    // so 0 isn't short-circuited away. Confirm 0 is a valid analytics value
    // vs an empty default.
    'digitalData.formDetails.formSubmitted':
      ccVars.formSubmitted ?? '',

    // Cross-check: confirm with analytics team which value goes to v80.
    // Options: ccVars.referenceNumber, ccVars.applicationRefNumber, ccVars.eRefNumber.
    // Current: referenceNumber → leadId fallback.
    'digitalData.formDetails.reference':
      ccVars.referenceNumber,

    // Cross-check: ccVars currently does NOT include accountType.
    // Falls back to deriving from formData.accountTypeSelection.
    'digitalData.formDetails.accountType':
      ccVars.accountType
      || (formData.accountTypeSelection === '1' ? 'Corporate Salary Account' : 'Savings Account'),

    // Cross-check: not yet present in ccVars. Set in the rule/function that
    // handles insurance-type selection on Thank-you Continue / New CC Confirmation Continue.
    'digitalData.formDetails.insuranceDetail':
      ccVars.insuranceDetail || '',

    // ─────────────────────────────────────────────────────────────────
    //  Document Upload
    // ─────────────────────────────────────────────────────────────────
    // Cross-check: not yet present in ccVars. Set after user selects a document type.
    'digitalData.formDetails.documentProof':
      ccVars.documentProof || '',

    // ─────────────────────────────────────────────────────────────────
    //  Choose Card
    // ─────────────────────────────────────────────────────────────────
    // Cross-check: ccVars.product ("TMRFL") is currently NOT picked up — the
    // mapping looks for `selectedCardCode`. Recommend renaming ccVars.product
    // → ccVars.selectedCardCode (or add that key when populating).
    'digitalData.card.selectedCard':
      ccVars.selectedCardProductName || '',

    'digitalData.card.annualFee':
      ccVars.annualFee || '',

    // Cross-check: ccVars does NOT include ipaProductCodes yet. Should be set
    // in handleIpaResponse from filler1 (e.g., ['FCFL','IOCFL','TMRFL','UPRFT']).
    'digitalData.card.recommendedCard': ccVars.recommendedCard || '',

    // ─────────────────────────────────────────────────────────────────
    //  New Credit Card Confirmation
    // ─────────────────────────────────────────────────────────────────
    // Cross-check: ccVars does NOT include newCardType yet. Set on the
    // New CC Confirmation screen — falls back to selectedCardCode.
    'digitalData.card.newType':
      ccVars.newCardType
      || ccVars.selectedCardCode
      || '',

    // ─────────────────────────────────────────────────────────────────
    //  Assisted / branch metadata (Choose Card → Continue)
    // ─────────────────────────────────────────────────────────────────
    'digitalData.assisted.flag':     ccVars.employeeAssistance || '',
    'digitalData.assisted.lg':       formData.jdbLG || ccVars.jdbLG || '',
    'digitalData.assisted.lc':       formData.lcCode || ccVars.jdbLC || '',
    'digitalData.assisted.lc2':      formData.lc2CodeCC || ccVars.lc2CodeCC || '',
    'digitalData.assisted.smCode':   formData.smCodeCC || ccVars.smCodeCC || '',

    // Cross-check: ccVars has branchName / branchCity / branchCode, but the
    // original mapping read formData.* (often empty for CC flow). Now uses
    // ccVars as primary, formData as fallback.
    'digitalData.assisted.branch':     ccVars.branchName || formData.branchName_value || '',
    'digitalData.assisted.branchCity': ccVars.branchCity || formData.branchCity_value || '',
    'digitalData.assisted.branchCode': ccVars.branchCode || formData.branchCode || '',
    'digitalData.assisted.channel':   ccVars.channel || '',
  };
}