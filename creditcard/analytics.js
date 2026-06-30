import { getAnalyticsActions } from './actions.js';
import { getAnalyticsData, prepareHashedPhone } from './datamapping.js';
import { checkApiResponseIntegrity } from './analytics-utils.js';
import { CLICK_CONFIG, LOAD_CONFIG } from './analytics-constant.js';

export default function triggerAnalytics(event, form, actionType) {
    const formData = form.exportData();
    // Get default data mapping

    prepareHashedPhone(form, () => {
        const formMapping = getAnalyticsData(form);
        const actionMapping = getAnalyticsActions(form);

        switch (actionType) {
            case 'ctaClickWithBankApiResponse': {
                let buttonEventName = event?.payload?.response?.submitter?.$name === '$form'
                    ? event?.payload?.targetEvent?.type
                    : event?.payload?.response?.submitter?.$name;
                if (buttonEventName === 'kycContinue') {
                    buttonEventName = buttonEventName + formData.KYCChoice;
                }
                let apiName = event?.payload?.request?.url?.split('/').pop() || '';
                const triggerType = event?.payload?.targetEvent?.type;
                const apiResBody = event?.payload?.response?.body;
                const apiClickEventName = `${buttonEventName}-${apiName}-${triggerType}`;
                const parsedApiData = checkApiResponseIntegrity(apiClickEventName, apiResBody, apiName);
                const { errorCode, errorMsg, journeyState, apiLabel, errorPage } = parsedApiData;
                const leadId = apiResBody?.leadUpdateStatus?.ItemKey;
                digitalData.formDetails.leadGenerationReason = apiResBody?.leadUpdateStatus?.errorText;
                if (apiResBody?.accountOpening?.status === 'Success') {
                    digitalData.formDetails.isAccount = 'Yes';
                    digitalData.formDetails.leadGenerated = 'No';
                    digitalData.formDetails.leadGenerationReason = 'Account Created';
                    if (form.properties.journeyName?.startsWith('ETB')) {
                        digitalData.formDetails.isFundingEligible = 'Yes';
                    }
                    else if (formData.gigaUtmCheck === 'gigaccount') {
                        digitalData.formDetails.isFundingEligible = 'Yes';
                    }
                    else {
                        digitalData.formDetails.isFundingEligible = 'No';
                    }
                }
                const accountId = apiResBody?.accountOpening?.accountNo;
                const analyticsFlaggedApiPatterns = [
                    'consentreceipts',
                    'threedigitpincode',
                    'branchSelection',
                    'birthState',
                    'mdm.INSTA.BRANCH_MASTER.PINCODE',
                    'fetchCustomerEligibilityStatus',
                    'initiateCustomerEligibility',
                    'fetchauthcode',
                    'leadupdate',
                    'factiva_service',
                    'bretwo',
                    'executeinterface',
                    'otpvalidationfetchdemog',
                    'pdfgen.json'
                ];
                if (apiName === 'otp.json') {
                    const isEmailExceeded = form.properties?.emailValAttemptsLeft > 1;
                    const isMobileExceeded = form.properties?.maxAttempts > 1;
                    const isCorporateEmailExceeded = form.properties?.emailCorporateValAttemptsLeft > 1;
                    if (errorCode === '02') {
                        if (isEmailExceeded || isMobileExceeded || isCorporateEmailExceeded) {
                            return;
                        }
                        if (buttonEventName === 'verifyOtp') {
                            apiName = 'mobile-otp.json';
                        } else if (buttonEventName === 'verifyEmailSubmit' || buttonEventName === 'corporateOTP') {
                            apiName = 'email-otp.json';
                        }

                    } else if (errorCode !== '00') {
                        if (buttonEventName === 'verifyOtp') {
                            apiName = 'mobile-otp.json';
                        } else if (buttonEventName === 'verifyEmailSubmit' || buttonEventName === 'corporateOTP') {
                            apiName = 'email-otp.json';
                        }
                    }
                }
                if (apiName === 'login.json') {
                    if (buttonEventName === 'getOtp') {
                        apiName = 'mobile-login.json';
                    } else if (buttonEventName === 'verifyButton' || buttonEventName === 'verifyCorporateEmail') {
                        apiName = 'email-login.json';
                    }
                }
                if (apiName === 'consentcollectionreceipts.json' && buttonEventName !== 'kycContinue0' && buttonEventName !== 'kycContinue1') {
                    return;
                }

                if (analyticsFlaggedApiPatterns.some(pattern => parsedApiData?.apiLabel?.includes(pattern))) {
                    return;
                }
                if (buttonEventName === 'communicationAddress' && digitalData.formDetails.isAccount === 'Yes') {
                    return;
                }

                if (parsedApiData.success === true || (leadId && leadId.trim() !== '')) {
                    let updatedButtonEventName = buttonEventName;
                    if (form.properties.journeyName?.startsWith('ETB')) {
                        updatedButtonEventName = 'etb_' + buttonEventName;
                    }
                    setSpecificAnalyticsClick(updatedButtonEventName, actionMapping, digitalData, formMapping, leadId, accountId, errorCode, errorMsg, apiName);
                } else {
                    sendErrorAnalytics(errorCode, errorMsg, apiName, errorPage, journeyState, formData, leadId);
                }
                break;
            }
            case 'customAnalyticsBankApiResponse': {
                const buttonEventName = event?.payload?.buttonEventName;
                const apiName = event?.payload?.apiName;
                const triggerType = 'customapi';
                const parsedApiData = checkApiResponseIntegrity(buttonEventName, event?.payload, apiName);
                const { errorCode, errorMsg, journeyState, apiLabel, errorPage } = parsedApiData;

                const analyticsFlaggedApiPatterns = [
                    'consentreceipts',
                    'threedigitpincode',
                    'branchSelection',
                    'birthState',
                    'mdm.INSTA.BRANCH_MASTER.PINCODE'
                ];

                if (analyticsFlaggedApiPatterns.some(pattern => parsedApiData?.apiLabel?.includes(pattern))) {
                    return;
                }
                if (buttonEventName === 'communicationAddress' && digitalData.formDetails.isAccount === 'Yes') {
                    return;
                }

                if (parsedApiData.success === true) {
                    let updatedButtonEventName = buttonEventName;
                    if (form.properties.journeyName?.startsWith('ETB')) {
                        updatedButtonEventName = 'etb_' + buttonEventName;
                    }
                    setSpecificAnalyticsClick(updatedButtonEventName, actionMapping, digitalData, formMapping);
                } else {
                    sendErrorAnalytics(errorCode, errorMsg, apiName, errorPage, journeyState, formData);
                }
                break;
            }

            case 'customAnalyticsErrorPageResponse': {
                const buttonEventName = event?.payload?.buttonEventName;
                const apiName = form.properties?.apiName;
                const parsedApiData = checkApiResponseIntegrity(buttonEventName, event?.payload, apiName);
                const errorCode = form.properties.analyticsErrorCode;
                const errorMsg = form.properties.analyticsErrorMessage || form.properties.errorMessage;
                const journeyState = form.properties.journeyState;
                const errorPage = 'Error Page';
                if (errorCode === undefined || errorMsg === undefined || apiName === undefined) {
                    return;
                }
                sendErrorAnalytics(errorCode, errorMsg, apiName, errorPage, journeyState, formData);
                break;
            }
            case 'click': {
                const { triggerEventName } = event?._target?.properties;
                let updatedButtonEventName = triggerEventName;
                if (form.properties.journeyName?.startsWith('ETB')) {
                    updatedButtonEventName = 'etb_' + triggerEventName;
                }
                if (updatedButtonEventName === 'etb_baasEtbContinueButton') {
                    digitalData.formDetails.leadGenerated = "No";
                    digitalData.formDetails.isAccount = "No";
                    digitalData.formDetails.isAccountConvertedToCorporateSalary = 1;
                    digitalData.formDetails.accountType = form.properties?.baasCoBrandedAccountType;
                    sendPageloadEvent('CUSTOMER_ONBOARDING_COMPLETE', actionMapping, digitalData, formMapping, 'Confirmation', formData);
                }
                if (triggerEventName === 'communicationAddress' && digitalData.formDetails.isAccount === 'Yes') {
                    return;
                }
                if (triggerEventName === 'familyDetailsContinue') {
                    digitalData.formDetails.nomineeRelation = form?.properties?.selectedNomineeRelationship;
                }
                else if (triggerEventName === 'AddMemberPopupAddition') {
                    digitalData.formDetails.nomineeRelation = form?.properties?.memberRelationship;
                }
                else if (triggerEventName === 'AddFamilyContinue') {
                    let relation = familylistingpanel.filter(item => item?.membercheckbox === "on")
                        .map(item =>
                            item?.familylistinginnerpanel
                                ?.cardmemberdetailspanel
                                ?.detailsRow
                                ?.prefillMemberRelation
                        )
                        .filter(value => value)
                        .join(" ");
                    let count = familylistingpanel
                        .filter(item => item?.membercheckbox === "on")
                        .length;
                    digitalData.formDetails.nomineeRelation = `${count} | ${relation}`;
                }
                digitalData.event.status = 1;
                setSpecificAnalyticsClick(updatedButtonEventName, actionMapping, digitalData, formMapping);
                break;
            }
            case 'popupload': {
                const { triggerEventName } = event?._target?.properties;
                // let updatedButtonEventName = triggerEventName;
                sendPageloadEvent(LOAD_CONFIG[triggerEventName].journeyStateSuccessCase, actionMapping, digitalData, formMapping, LOAD_CONFIG[triggerEventName].pageName, formData);
                digitalData.event.status = 1;
                break;
            }

            case 'onLoad': {
                let { triggerEventName } = event?.properties;
                setNestedValue(digitalData, 'event.status', 0);

                if (LOAD_CONFIG[triggerEventName]) {
                    if (form.properties.fundingStatus) {
                        triggerEventName = 'fundingsuccess';
                    }
                    switch (triggerEventName) {
                        case 'initialValue':
                            if (formData?.DateOfBirth) {
                                triggerEventName = 'reloadAfterAadhar';
                            }
                            sendPageloadEvent(
                                LOAD_CONFIG[triggerEventName].journeyStateSuccessCase,
                                actionMapping, digitalData, formMapping,
                                LOAD_CONFIG[triggerEventName].pageName, formData,
                            );
                            break;
                        case 'fundingsuccess':
                            // ... existing logic unchanged ...
                            break;
                        case 'reloadAfterIdComStatus':
                        case 'reloadAfterValidateAcount':
                        case 'reloadAfterCreateBillApi':
                        case 'reloadAfterModifyBillApi':
                        case 'reloadAfterIdCom':
                            sendPageloadEvent(
                                LOAD_CONFIG[triggerEventName].journeyStateSuccessCase,
                                actionMapping, digitalData, formMapping,
                                LOAD_CONFIG[triggerEventName].pageName, formData,
                            );
                            break;
                        default:
                            // NEW: generic page-load for any new screen with a LOAD_CONFIG entry
                            sendPageloadEvent(
                                LOAD_CONFIG[triggerEventName].journeyStateSuccessCase,
                                actionMapping, digitalData, formMapping,
                                LOAD_CONFIG[triggerEventName].pageName, formData,
                            );
                            break;
                    }
                }
                break;
            }
            case 'loadAnalyticsAfterIdCom': {
                setNestedValue(digitalData, 'event.status', 0);
                const triggerType = 'etb-lead-account';
                if (form.properties.etbAccountCreated === 'Y') {
                    digitalData.formDetails.reference = form.properties.leadID;
                    digitalData.formDetails.leadGenerated = "No";
                    digitalData.formDetails.isAccount = "Yes";
                    if (form.properties?.baasFlow === "true") {
                        if (form.properties?.isAccountConvertedToCorporateSalary === "Yes") {
                            digitalData.formDetails.isAccountConvertedToCorporateSalary = 1;
                            digitalData.formDetails.accountType = form.properties?.baasCoBrandedAccountType;
                        } else {
                            digitalData.formDetails.isAccountConvertedToCorporateSalary = 0;
                        }
                    }
                } else if (form.properties.etbLeadCreated === 'Y') {
                    digitalData.formDetails.reference = form.properties.leadID;
                    digitalData.formDetails.leadGenerated = "Yes";
                    digitalData.formDetails.isAccount = "No";
                    digitalData.page.pageInfo.errorCode = form.properties.etbErrorCode;
                    digitalData.page.pageInfo.errorMessage = form.properties.etbErrorMessage;
                    digitalData.page.pageInfo.errorAPI = 'etbaccountopening.json';
                    if (form.properties?.baasFlow === "true") {
                        if (form.properties?.isAccountConvertedToCorporateSalary === "Yes") {
                            digitalData.formDetails.isAccountConvertedToCorporateSalary = 1;
                            digitalData.formDetails.accountType = form.properties?.baasCoBrandedAccountType;
                        } else {
                            digitalData.formDetails.isAccountConvertedToCorporateSalary = 0;
                        }
                    }
                }

                sendPageloadEvent('CUSTOMER_ONBOARDING_COMPLETE', actionMapping, digitalData, formMapping, 'Confirmation', formData);
            }
            default:
                break;
        }
    });
}

function setSpecificAnalyticsClick(targetEvent, actionMapping, digitalData, formMapping, leadId = '', accountId = '', errorCode = '', errorMsg = '', apiName = '') {
    if(apiName === 'finaldap.json'){
        targetEvent = 'continueBtnFinalDap'
    }
    // genericClickAnalyticsClick(actionMapping, digitalData, formMapping);
    mapEventDigitalData(targetEvent, actionMapping, digitalData, formMapping);
    // Set event status to 1 if targetEvent is present, otherwise 0
    setNestedValue(digitalData, 'event.status', targetEvent ? 1 : 0);
    // if (typeof window !== 'undefined' && typeof _satellite !== 'undefined') {
    //             _satellite.track('submit');
    // }
    const matchingConfigKey = Object.keys(CLICK_CONFIG).find(key =>
        key.includes(targetEvent)
    );
    if (matchingConfigKey && typeof _satellite !== 'undefined' && !['feedbackSubmitted', 'etb_feedbackSubmitted'].includes(matchingConfigKey)) {
        digitalData.formDetails.isAccount = "No";
        _satellite.track('submit');
        const config = CLICK_CONFIG[matchingConfigKey];
        if (matchingConfigKey === 'verifyEmailSubmit-otp.json-click') { return; }
        if (!config.nextPage) { return; } // If no nextPage defined, it's not a screen transition, so skip pageload event
        setTimeout(() => {
            if (apiName === 'finaldap.json') {
                sendPageloadEvent('CUSTOMER_ONBOARDING_COMPLETED', actionMapping, digitalData, formMapping, config.nextPage);
            } else {
                sendPageloadEvent(config.journeyStateSuccessCase, actionMapping, digitalData, formMapping, config.nextPage);
            }
        }, 500);
    } else if (['feedbackSubmitted', 'etb_feedbackSubmitted'].includes(matchingConfigKey)) {
        digitalData.formDetails.isAccount = "No";
        _satellite.track('survey');
    }

}

function sendErrorAnalytics(errorCode, errorMsg, apiName, errorPage, journeyState, formData, leadId = '') {
    digitalData.page.pageInfo.errorCode = errorCode;
    digitalData.page.pageInfo.errorMessage = errorMsg;
    digitalData.page.pageInfo.errorAPI = apiName;
    digitalData.page.pageInfo.pageName = errorPage || 'Error Page';
    digitalData.user.journeyState = journeyState || '';
    if (leadId && leadId.trim() !== '' && journeyState === 'ACCOUNT_OPENING_ERROR') {
        digitalData.formDetails.reference = leadId;
        digitalData.formDetails.leadGenerated = "Yes";
        digitalData.formDetails.isAccount = "No";
    }
    if (typeof window !== 'undefined' && typeof _satellite !== 'undefined') {
        _satellite.track('pageload');
    }
}

function mapEventDigitalData(eventName, actionMapping, digitalData, formMapping) {
    const eventAction = actionMapping.find(ele => ele.name === eventName);

    if (eventAction && eventAction.dataDto) {
        digitalData.page.pageInfo.pageName = eventAction?.pageName;
        const dataKeys = eventAction.dataDto;

        const analyticsData = {};

        // Map the link properties from the action to digitalData
        if (eventAction.linkType) {
            setNestedValue(digitalData, 'link.linkType', eventAction.linkType);
            analyticsData['digitalData.link.linkType'] = eventAction.linkType;
        }

        if (eventAction.linkName) {
            setNestedValue(digitalData, 'link.linkName', eventAction.linkName);
            analyticsData['digitalData.link.linkName'] = eventAction.linkName;
        }

        if (eventAction.linkPosition) {
            setNestedValue(digitalData, 'link.linkPosition', eventAction.linkPosition);
            analyticsData['digitalData.link.linkPosition'] = eventAction.linkPosition;
        }

        // Process the rest of the data keys
        dataKeys.forEach(key => {
            const value = formMapping[key] ?? '';
            // Remove 'digitalData.' prefix if it exists to avoid nesting
            if (value !== undefined && value !== null && value !== '') {
                const normalizedKey = key.startsWith('digitalData.') ? key.substring('digitalData.'.length) : key;
                setNestedValue(digitalData, normalizedKey, value);
                analyticsData[key] = value;
            }
        });

        return analyticsData;
    }
    return {};
}
function genericClickAnalyticsClick(actionMapping, digitalData, formMapping) {
    const genericClickAction = actionMapping.find(ele => ele.event === 'genericClick');
    const dataKeys = genericClickAction.dataDto;
    const analyticsData = {};

    // Map the link properties from the action to digitalData
    if (genericClickAction.linkType) {
        setNestedValue(digitalData, 'link.linkType', genericClickAction.linkType);
        analyticsData['digitalData.link.linkType'] = genericClickAction.linkType;
    }

    if (genericClickAction.linkName) {
        setNestedValue(digitalData, 'link.linkName', genericClickAction.linkName);
        analyticsData['digitalData.link.linkName'] = genericClickAction.linkName;
    }

    if (genericClickAction.linkPosition) {
        setNestedValue(digitalData, 'link.linkPosition', genericClickAction.linkPosition);
        analyticsData['digitalData.link.linkPosition'] = genericClickAction.linkPosition;
    }

    // Process the rest of the data keys
    dataKeys.forEach(key => {
        const value = formMapping[key] || '';
        // Remove 'digitalData.' prefix if it exists to avoid nesting
        const normalizedKey = key.startsWith('digitalData.') ? key.substring('digitalData.'.length) : key;
        setNestedValue(digitalData, normalizedKey, value);
        analyticsData[key] = value;
    });

    return analyticsData;
}

// Helper function to set a value in a nested object using a dot-notation path
function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
            current[part] = {};
        }
        current = current[part];
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
}

const setGenericLoadProp = (journeyState, formMapping, digitalData) => {
    setNestedValue(digitalData, 'user.pseudoID', '');// Need to check
    const journeyName = formMapping['digitalData.user.journeyName'] || '';
    setNestedValue(digitalData, 'user.journeyName', journeyName);
    const journeyVariant = formMapping['digitalData.user.journeyVariant'] || '';
    setNestedValue(digitalData, 'user.journeyVariant', journeyVariant);
    const journeyID = formMapping['digitalData.user.journeyID'] || '';
    setNestedValue(digitalData, 'user.journeyID', journeyID);
    setNestedValue(digitalData, 'user.journeyState', journeyState || '');
    const casa = formMapping['digitalData.user.casa'] || '';
    setNestedValue(digitalData, 'user.casa', casa);
    // const kycType = formMapping['digitalData.formDetails.kycType'] || '';
    const formName = formMapping['digitalData.form.name'] || '';
    const baasFlow = formMapping['digitalData.formDetails.baasFlow'] || '';
    // setNestedValue(digitalData, 'formDetails.kycType', kycType);
    setNestedValue(digitalData, 'user.aan', '');
    setNestedValue(digitalData, 'form.name', formName);
    setNestedValue(digitalData, 'form.emiCategory', '');
    setNestedValue(digitalData, 'formDetails.baasFlow', baasFlow);
};

function sendPageloadEvent(journeyState, actionMapping, digitalData, formMapping, pageName, formData = {}) {

    setGenericLoadProp(journeyState, formMapping, digitalData);
    digitalData.page.pageInfo.pageName = pageName;
    mapEventDigitalData(pageName, actionMapping, digitalData, formMapping);
    if (pageName === 'Funding Confirmation') {
        digitalData.user.journeyLevel2 = 'AddMoney';
    }
    setNestedValue(digitalData, 'event.status', 0);
    if (typeof window !== 'undefined' && typeof _satellite !== 'undefined') {
        if (formData.lccodeerror === 'true') {
            sendErrorAnalytics('BAAS_ERROR_INVALID_LC_CODE', 'Please co-ordinate with a bank representative to access a valid URL for opening an account.', null, 'Error Page', 'CUSTOMER_IDENTITY_INITIATED', formData);
        }
        else if (formData.lgcodeerror === 'true') {
            sendErrorAnalytics('BAAS_ERROR_INVALID_LG_CODE', 'Please co-ordinate with a bank representative to access a valid URL for opening an account.', null, 'Error Page', 'CUSTOMER_IDENTITY_INITIATED', formData);
        }
        else if (formData.jdbCheckBaasError === 'true') {
            sendErrorAnalytics(formData.jdbCheckBaasErrorReason, 'Please co-ordinate with a bank representative to access a valid URL for opening an account.', 'checkbaasflow.json', 'Error Page', 'CUSTOMER_IDENTITY_INITIATED', formData);
        }
        else
            _satellite.track('pageload');
    }
}
