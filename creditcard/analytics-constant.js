const DIGITAL_DATA_SCHEMA = {
  page: {
    pageInfo: {
      pageName: '',
      errorCode: '',
      errorMessage: '',
    },
  },
  user: {
    pseudoID: '',
    journeyID: '',
    journeyName: '',
    journeyState: '',
    casa: '',
    gender: '',
    email: '',
  },
  form: {
    name: '',
  },
  link: {
    linkName: '',
    linkType: '',
    linkPosition: '',
  },
  event: {
    phone: '',
    validationMethod: '',
    status: '',
    rating: '',
  },
  formDetails: {},
  assisted: {},
};

const CLICK_CONFIG = {

  'continue-button-thankyou-panel-ipa.json-click': {
    linkType: 'button',
    linkName: 'Proceed to select Credit Card',
    linkPosition: 'Form',
    pageName: 'New IS Confirmation - CC Cross Sell',
    nextPage: 'Choose Card Screen',                   // ← landing page after success
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'CHOOSE_CARD_LOAD',
    journeyStateFailureCase: 'IPA_FAILURE',
  },
  'continueBtn-finaldap.json-click': {
    linkType: 'button',
    linkName: 'Continue',
    linkPosition: 'Form',
    pageName: 'Choose Card Screen',
    nextPage: 'New Credit Card New IS Confirmation - CC Cross Sell',                    // ← or 'New Credit Card Confirmation' if doc upload is skipped
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'CUSTOMER_CARD_SELECTED',
    journeyStateFailureCase: 'CARD_SELECTION_CONTINUE_FAILURE',
  },
  'continueBtn': {
    linkType: 'button',
    linkName: 'Continue',
    linkPosition: 'Form',
    pageName: 'Choose Card Screen',
    nextPage: 'Document Upload',                    // ← or 'New Credit Card Confirmation' if doc upload is skipped
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'CUSTOMER_CARD_SELECTED',
    journeyStateFailureCase: 'CARD_SELECTION_CONTINUE_FAILURE',
   },
  proceedToSelectCardClick: {
    linkType: 'button',
    linkName: 'Proceed to select Credit Card',
    linkPosition: 'Form',
    pageName: 'New IS Confirmation - CC Cross Sell',
    nextPage: 'Choose Card Screen',                   // ← landing page after success
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'CHOOSE_CARD_LOAD',
    journeyStateFailureCase: 'PROCEED_TO_CARD_SELECTION_FAILURE',
  },
  'continueBtnFinalDap':{
    linkType: 'button',
    linkName: 'Continue',
    linkPosition: 'Form',
    pageName: 'Choose Card Screen',
    nextPage: 'New IS Confirmation - CC Cross Sell',                    // ← or 'New Credit Card Confirmation' if doc upload is skipped
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'CUSTOMER_CARD_SELECTED',
    journeyStateFailureCase: 'CARD_SELECTION_CONTINUE_FAILURE',
  },
  // (C) For default-card path API auto-fire — dummy servlet
  'continue-button-thankyou-panel-dummyCard.json-click': {
    linkType: 'button',
    linkName: 'Proceed to select Credit Card',
    linkPosition: 'Form',
    pageName: 'New IS Confirmation - CC Cross Sell',
    nextPage: 'Choose Card Screen',                   // ← landing page after success
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'CHOOSE_CARD_LOAD',
    journeyStateFailureCase: 'DUMMY_SERVLET_FAILURE',
  },
  moreBenefitsClick: {
    linkType: 'button',
    linkName: 'More Benefits',
    linkPosition: 'Form',
    pageName: 'Choose Card Screen',
    // No nextPage — this is a popup, not a screen transition
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'MORE_BENEFITS_OPENED',
  },
  skipDecideLaterClick: {
    linkType: 'button',
    linkName: 'Skip I will decide later',
    linkPosition: 'Form',
    pageName: 'Choose Card Screen',
    // No nextPage — opens a popup (notWantCreditCardModal), stays on Choose Card
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'SKIP_DECIDE_LATER_CLICKED',
  },
  // CLICK_CONFIG
  doNotWantCcClick: {
    linkType: 'button',
    linkName: 'Do not want',
    linkPosition: 'Form',
    pageName: 'Credit Card Skip Popup',
    // 'Do not want' likely navigates user out (to VKYC?). Set nextPage if so:
    // nextPage: 'Video KYC',
    // journeyStateSuccessCase: 'VKYC_INITIATED',
    errorPage: 'Error Page',
  },
  wantCcClick: {
    linkType: 'button',
    linkName: 'I want credit card',
    linkPosition: 'Form',
    pageName: 'Credit Card Skip Popup',
    // No nextPage — closes popup, stays on Choose Card
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'CC_SKIP_DISMISSED',
  },
  verifyEmailClick: {
    linkType: 'button',
    linkName: 'Verify',
    linkPosition: 'Form',
    pageName: 'Choose Card Screen',
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'OFFICE_EMAIL_VERIFY_CLICKED',
  },
  termsAndConditionsClick: {
    linkType: 'link',
    linkName: 'T&C',
    linkPosition: 'Form',
    pageName: 'Choose Card Screen',
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'TC_OPENED',
  },
  docUploadContinueClick: {
    linkType: 'button',
    linkName: 'Continue',
    linkPosition: 'Form',
    pageName: 'Document Upload',
    // No nextPage — the API outcome beacon (docUploadResultClick) drives the next pageload
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'DOC_UPLOAD_CONTINUE_CLICKED',
  },
  ratingSubmitButtonClick: {
    linkType: 'button',
    linkName: 'ratingSubmitButton',
    linkPosition: 'Form',
    pageName: 'Feedback Page',
    // No nextPage — the API outcome beacon (docUploadResultClick) drives the next pageload
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'CUSTOMER_FEEDBACK_CAPTURED'
  },

  'Continue Button-documentUpload.json-click': {
    linkType: 'button',
    linkName: 'Continue',
    linkPosition: 'Form',
    pageName: 'Document Upload',
    nextPage: 'New Credit Card Confirmation',                // ← drives next-screen pageload on success
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'DOC_UPLOAD_SUCCESS',
    journeyStateFailureCase: 'DOC_UPLOAD_FAILURE',
  },

  docUploadBrowseClick: {
    linkType: 'button',
    linkName: 'Browse and Continue',
    linkPosition: 'Form',
    pageName: 'Document Upload',
    // No nextPage — file picker stays on same screen
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'DOC_BROWSE_CLICKED',
  },
  skipToVkycClick: {
    linkType: 'button',
    linkName: 'Skip to Video KYC',
    linkPosition: 'Form',
    pageName: 'New IS Confirmation - CC Cross Sell',
    // No nextPage — opens 'Credit Card Skip Popup' (notWantCreditCardModal)
    errorPage: 'Error Page',
    journeyStateSuccessCase: 'SKIP_TO_VKYC_CLICKED',
  },
};


const LOAD_CONFIG = {
  initialValue: {
    journeyStateSuccessCase: 'CUSTOMER_IDENTITY_INITIATED',
    journeyStateFailureCase: 'CUSTOMER_IDENTITY_INITIATED',
    pageName: 'Step 1 - Identify Yourself',
    errorPage: 'Error Page',
  },
  thankyouPageLoad: {
    journeyStateSuccessCase: 'NEW_IS_CONFIRMATION_CC_CROSS_SELL',
    pageName: 'New IS Confirmation - CC Cross Sell',
    errorPage: 'Error Page'
  },
  chooseCardPageLoad: {
    journeyStateSuccessCase: 'CHOOSE_CARD_LOAD',
    pageName: 'Choose Card Screen',
    errorPage: 'Error Page'
  },
  ccSkipPopupLoad: {
    journeyStateSuccessCase: 'CC_SKIP_POPUP_LOAD',
    pageName: 'Credit Card Skip Popup',
    errorPage: 'Error Page',
  },
};

export {
  DIGITAL_DATA_SCHEMA,
  CLICK_CONFIG,
  LOAD_CONFIG,
};