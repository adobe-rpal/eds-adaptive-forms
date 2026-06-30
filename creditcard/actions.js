export function getAnalyticsActions(form) {
    return [

        {
            name: 'getOtp',
            pageName: 'Step 1 - Identify Yourself',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'Get OTP',
            linkPosition: 'Form',
            dataDto: [
                'digitalData.event.status',
                'digitalData.event.validationMethod',
                'digitalData.event.phone',
                'digitalData.formDetails.BureauConsent',
                'digitalData.formDetails.POConsent',
                'digitalData.formDetails.panAvailable',
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.form.name'
            ],
        },
        {
            name: 'skipToVkycClick',
            pageName: 'New IS Confirmation - CC Cross Sell',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'Skip to Video KYC',
            linkPosition: 'Form',
            dataDto: [
                'digitalData.event.status',
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.form.name',
            ],
        },
        {
            name: 'proceedToSelectCardClick',
            pageName: 'New IS Confirmation - CC Cross Sell',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'Proceed to select Credit Card',
            linkPosition: 'Form',
            dataDto: [
                'digitalData.event.status',
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.form.name',
                'digitalData.formDetails.reference',
            ],
        },
        {
            name: 'New IS Confirmation - CC Cross Sell',     // ← MUST match LOAD_CONFIG.pageName exactly
            pageName: 'New IS Confirmation - CC Cross Sell',
            event: 'pageload',
            analyticsEvent: 'pageload',
            // Omit linkType/linkName/linkPosition — they're click-only
            dataDto: [
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.user.journeyID',
                'digitalData.user.journeyState',
                'digitalData.user.journeyVariant',
                'digitalData.form.name',
                'digitalData.formDetails.isAccount',
                'digitalData.formDetails.isVideoKYC',
                'digitalData.formDetails.isFundingEligible',
                'digitalData.formDetails.leadGenerated',
                'digitalData.formDetails.formSubmitted',
                'digitalData.formDetails.reference',
                'digitalData.formDetails.accountType',
            ],
        },
        {
            name: 'Choose Card Screen',                       // ← MUST match LOAD_CONFIG.chooseCardPageLoad.pageName
            pageName: 'Choose Card Screen',
            event: 'pageload',
            analyticsEvent: 'pageload',
            // No linkType/linkName/linkPosition — those are click-only
            dataDto: [
                'digitalData.card.selectedCard',          // v88 — "New Card" (recommended card)
                'digitalData.card.annualFee',             // e72, v89 — "Card - Annual Fee"
                'digitalData.card.recommendedCard',          // v184 — "Eligible Card"
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.user.journeyID',
                'digitalData.user.journeyState',
                'digitalData.user.journeyVariant',
                'digitalData.form.name',
            ],
        },
        {
            name: 'moreBenefitsClick',
            pageName: 'Choose Card Screen',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'More Benefits',
            linkPosition: 'Form',
            dataDto: [
                'digitalData.event.status',
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.form.name',
            ],
        },
        {
            name: 'skipDecideLaterClick',
            pageName: 'Choose Card Screen',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'Skip I will decide later',
            linkPosition: 'Form',
            dataDto: [
                'digitalData.event.status',
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.form.name',
            ],
        },
        {
            name: 'ratingSubmitButtonClick',
            pageName: 'Feedback Page',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'Submit Feedback',
            linkPosition: 'Form',
            dataDto: [
                'digitalData.event.status',
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.form.name',
            ],
        },
        {
            name: 'Credit Card Skip Popup',
            pageName: 'Credit Card Skip Popup',
            event: 'pageload',
            dataDto: [
                'digitalData.event.status',
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.user.journeyState',
                'digitalData.user.journeyVariant',
                'digitalData.form.name',
            ],
        },
        // actions.js
        {
            name: 'doNotWantCcClick',
            pageName: 'Credit Card Skip Popup',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'Do not want',
            linkPosition: 'Form',
            dataDto: ['digitalData.event.status', 'digitalData.user.casa', 'digitalData.user.journeyName', 'digitalData.form.name'],
        },
        {
            name: 'wantCcClick',
            pageName: 'Credit Card Skip Popup',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'I want credit card',
            linkPosition: 'Form',
            dataDto: ['digitalData.event.status', 'digitalData.user.casa', 'digitalData.user.journeyName', 'digitalData.form.name'],
        },
        {
            name: 'verifyEmailClick',
            pageName: 'Choose Card Screen',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'Verify',
            linkPosition: 'Form',
            dataDto: [
                'digitalData.event.status',
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.form.name',
            ],
        },
        {
            name: 'termsAndConditionsClick',
            pageName: 'Choose Card Screen',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'link',
            linkName: 'T&C',
            linkPosition: 'Form',
            dataDto: [
                'digitalData.event.status',
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.form.name',
            ],
        },
        // Page-load entry (driven by Choose Card Continue's nextPage='Document Upload')
        {
            name: 'Document Upload',
            pageName: 'Document Upload',
            event: 'pageload',
            dataDto: [
                'digitalData.formDetails.documentProof',
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.user.journeyState',
                'digitalData.user.journeyVariant',
                'digitalData.form.name',
            ],
        },

        // Continue button click — immediate
        {
            name: 'docUploadContinueClick',
            pageName: 'Document Upload',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'Continue',
            linkPosition: 'Form',
            dataDto: [
                'digitalData.event.status',
                'digitalData.formDetails.documentProof',
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.form.name',
            ],
        },

        // Document Upload API outcome (fired after fetch completes)
        {
            name: 'docUploadResultClick',
            pageName: 'Document Upload',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'Continue',
            linkPosition: 'Form',
            dataDto: [
                'digitalData.event.status',
                'digitalData.formDetails.documentProof',
                'digitalData.page.pageInfo.errorCode',
                'digitalData.page.pageInfo.errorMessage',
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.form.name',
            ],
        },

        // Browse & Upload click
        {
            name: 'docUploadBrowseClick',
            pageName: 'Document Upload',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'Browse and Continue',
            linkPosition: 'Form',
            dataDto: [
                'digitalData.event.status',
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.form.name',
            ],
        },
        {
            name: 'continueBtn',                  // ← matches button's XML field name (verify in .content.xml)
            pageName: 'Choose Card Screen',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'Continue',
            linkPosition: 'Form',
            dataDto: [
                'digitalData.event.status',
                'digitalData.card.selectedCard',              // selected card (variant)
                'digitalData.card.annualFee',                 // annual fees of selected card
                'digitalData.assisted.flag',                  // Assisted Flag (v77)
                'digitalData.assisted.lg',                    // Assisted LG (v66)
                'digitalData.assisted.lc',                    // Assisted LC (v78)
                'digitalData.assisted.lc2',                   // LC2 Code DL (v77)
                'digitalData.assisted.smCode',                // SM Code DL (v77)
                'digitalData.assisted.branch',                // Branch Name (v77)
                'digitalData.assisted.branchCity',            // Branch City (v77)
                'digitalData.assisted.branchCode',            // B Code DL (v77)
                'digitalData.assisted.channel',               // Assisted Channel (v77)
                // intentionally OMITTED per your spec: tse, empCode, se, dsa, promocode, dsaName, tlCode
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.form.name',
            ],
        },
        {
            name: 'continueBtnFinalDap',                  // ← matches button's XML field name (verify in .content.xml)
            pageName: 'Choose Card Screen',
            event: 'click',
            analyticsEvent: 'submit',
            linkType: 'button',
            linkName: 'Continue',
            linkPosition: 'Form',
            dataDto: [
                'digitalData.event.status',
                'digitalData.card.selectedCard',              // selected card (variant)
                'digitalData.card.annualFee',                 // annual fees of selected card
                'digitalData.assisted.flag',                  // Assisted Flag (v77)
                'digitalData.assisted.lg',                    // Assisted LG (v66)
                'digitalData.assisted.lc',                    // Assisted LC (v78)
                'digitalData.assisted.lc2',                   // LC2 Code DL (v77)
                'digitalData.assisted.smCode',                // SM Code DL (v77)
                'digitalData.assisted.branch',                // Branch Name (v77)
                'digitalData.assisted.branchCity',            // Branch City (v77)
                'digitalData.assisted.branchCode',            // B Code DL (v77)
                'digitalData.assisted.channel',               // Assisted Channel (v77)
                // intentionally OMITTED per your spec: tse, empCode, se, dsa, promocode, dsaName, tlCode
                'digitalData.user.casa',
                'digitalData.user.journeyName',
                'digitalData.form.name',
            ],
        }
    ]
};
