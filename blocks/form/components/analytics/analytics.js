/* eslint-disable max-len */
import { ENV } from '../../constant.js';
import { subscribe } from '../../rules/index.js';

export default async function decorate(element, fieldJson, container, formId) {
  console.log('[analytics decorate] fieldJson:', fieldJson);
  console.log('[analytics decorate] fieldJson keys:', Object.keys(fieldJson || {}));
  console.log('[analytics decorate] fieldJson.properties:', fieldJson?.properties);
  console.log('[analytics decorate] fieldJson.properties keys:', Object.keys(fieldJson?.properties || {}));
  // eslint-disable-next-line no-unsafe-optional-chaining
  const { devLaunchScript, prodLaunchScript, stageLaunchScript } = fieldJson?.properties;
  const scripConfig = {
    dev: devLaunchScript,
    qa : devLaunchScript,
    prod: prodLaunchScript,
    stage: stageLaunchScript,
    default: '',
  };
  const script = scripConfig[ENV || 'default'];
  // Queue analytics script for delayed loading to improve TBT
  if ((typeof window !== 'undefined') && script) {
    window.delayedScripts = window.delayedScripts || [];
    window.delayedScripts.push({ src: script, element });
  }
  // Subscribe to requestSuccess event
  subscribe(element, formId, async (_element, fieldModel) => {
    const { form } = fieldModel;
    const analyticsFilePath = fieldModel?.properties?.analyticsFilePath || '../../../../creditcard/analytics.js';
    if ((fieldModel?.properties?.onLoad === 'loadAnalytics')) { // setkeyvalue ---> on analytics componennet - i.e : onLoad-loadAnalytics
      if (analyticsFilePath) {
        const { default: triggerAnalytics } = await import(analyticsFilePath);
        triggerAnalytics(fieldModel, form, 'onLoad'); // loadAnalytics
      }
    }

    element.addEventListener('delayed-script-loaded', async () => {
      if (analyticsFilePath) {
        const { default: triggerAnalytics } = await import(analyticsFilePath);
        triggerAnalytics(fieldModel, form, 'onLoad'); // loadAnalytics
      }
    });

    fieldModel.subscribe(async (event) => {
      if (analyticsFilePath) {
        const { default: triggerAnalytics } = await import(analyticsFilePath);
        triggerAnalytics(event, form, 'onLoad'); // normal button click - with no api tooling action over the button.
        fieldModel.dispatch({ type : 'custom:analyticsOnLoadComplete', payload : { formId } })
      }
    }, 'sendOnLoadAnalytics');
    fieldModel.subscribe(async (event) => {
      if (analyticsFilePath) {
        const { default: triggerAnalytics } = await import(analyticsFilePath);
        triggerAnalytics(event, form, 'click'); // normal button click - with no api tooling action over the button.
        fieldModel.dispatch({ type : 'custom:analyticsClickComplete', payload : { formId } })
      }
    }, 'sendAnalytics');
    fieldModel.subscribe(async (event) => {
      if (analyticsFilePath) {
        const { default: triggerAnalytics } = await import(analyticsFilePath);
        triggerAnalytics(event, form, 'popupload'); // normal load - with no api tooling action over the button.
        }
      }, 'sendpopupAnalytics');
     fieldModel.subscribe(async (event) => {
          if (analyticsFilePath) {
            const { default: triggerAnalytics } = await import(analyticsFilePath);
            triggerAnalytics(event, form, 'customAnalyticsBankApiResponse'); // api button click - with api tooling action over the button, will be triggered on custom analytics event sendAnalyticsApi
          }
        }, 'sendAnalyticsApiError');
     fieldModel.subscribe(async (event) => {
          if (analyticsFilePath) {
            const { default: triggerAnalytics } = await import(analyticsFilePath);
            triggerAnalytics(event, form, 'customAnalyticsErrorPageResponse'); // api button click - with api tooling action over the button, will be triggered on custom analytics event sendAnalyticsApi
          }
        }, 'errorPageSendAnalytics');
     fieldModel.subscribe(async (event) => {
          if (analyticsFilePath) {
            const { default: triggerAnalytics } = await import(analyticsFilePath);
            triggerAnalytics(event, form, 'sendETBAccountOpeningAnalytics'); // api button click - checking etb account opening scenario
          }
        }, 'sendETBAccountOpeningAnalyticsPageLoad');
    form.subscribe(async (e) => {
      const { payload } = e;
      const { default: triggerAnalytics } = await import(analyticsFilePath);
      payload?.changes?.forEach((change) => {
        if (change?.propertyName.includes('properties')) {
          const { currentValue } = change;
          const key = change.propertyName.split('properties.')[1];
          if(key === 'sendAnalyticsApiError') {
            triggerAnalytics({payload: currentValue}, form, 'customAnalyticsBankApiResponse');
          }
        }
      });
    }, 'change');
    form.subscribe(async (event) => {
      if (analyticsFilePath) {
        const { default: triggerAnalytics } = await import(analyticsFilePath);
        triggerAnalytics(event, form, 'ctaClickWithBankApiResponse'); // api button click - with api tooling action over the button, will be triggered on success
      }
    }, 'requestSuccess');
    form.subscribe((event) => {
      // eslint-disable-next-line no-console
      console.log('Request success event received:', event);
      // Add your analytics tracking logic here
    }, 'requestFailure');
  });
  return element;
}
/**
 * Notes:
 * 1) Load environment-specific scripts:
 *    - Loads the correct script (`devLaunchScript`, `stageLaunchScript`, `prodLaunchScript`)
 *      based on the current `ENV` value.
 *    - In form authoring, these script paths can be authored under the field properties.
 *
 * 2) Load analytics file dynamically:
 *    - In form authoring, `analyticsFilePath` must be authored (e.g., "../../../../siccdc/analytics.js").
 *    - The analytics file must export a single default function, e.g., `export default function triggerAnalytics(event, form, actiontype)`,
 *      which is used to track user interactions and system events.
 *
 * The `triggerAnalytics` function can handle the following event types:
 *    - `onLoad`: Triggered during the initial page load.
 *    - `click`: Triggered for normal button clicks without API tooling.
 *    - `ctaClickWithBankApiResponse`: Triggered for API-integrated button actions (fires on `requestSuccess`).
 *
 * - to handle click:
 * setFieldProperty of analytics compoennet with triggert event and dispatchevent(custom:sendAnalytics) to fire the ui click and handles
 * - to handle onLoad
 * setFieldPropert with key: onLoad and value as loadAnalytics
 *
 */