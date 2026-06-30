import { loadCSS } from '../../scripts/aem.js';

let inactivityTimer;
const LEAD_DEDUPE_HOST = 'https://feature-alp-426-v1--forms-engine--hdfc-forms.aem.live';

/**
 * Resets the inactivity timer. When the timer expires, a custom
 * "sessionExpired" event is dispatched on the form via globals.
 *
 * @param {number} inactivityTime - Duration of inactivity allowed in milliseconds.
 */
function resetTimer(inactivityTime) {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    console.log(`User inactive for ${inactivityTime / 1000} seconds.`);
    myForm.dispatch({ type: 'custom:sessionExpired', payload: { random : '' } });
    // globals.functions.dispatchEvent(globals.form, 'custom:sessionExpired');
  }, inactivityTime);
}

/**
 * Recursively waits for window to be available.
 * Then adds event listeners to check for user inactivity.
 * If user has been inactive for more than desired time, dispatches an event on the form.
 * @param {number} expiryTime - Expiry time in seconds.
 */
function setSessionExpiry(expiryTime) {
  // If document is not yet available, wait for a second, and try again.
  if (typeof window === 'undefined' || window === null || typeof myForm === 'undefined') {
    setTimeout(() => {
      setSessionExpiry(expiryTime);
    }, 2000);
    return;
  }

  function activityHandler() {
    resetTimer(expiryTime * 1000);
  }

  // Check to add listeners only once.
  if (window.sessionExpiryListenersAdded !== true) {
    // Events that count as "activity"
    ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach((event) => {
      window.addEventListener(event, activityHandler);
    });
    window.sessionExpiryListenersAdded = true;
  }

  // Kick off the timer.
  activityHandler();
}
function autoReadOtp() {
  if (!('OTPCredential' in window)) {
    console.log('Web OTP API not supported');
    return;
  }

  const otpInput = document.querySelector('input[name="otpInput"]');
  if (!otpInput) return;

  // Always keep masked initially
  const originalType = otpInput.type || 'password';
  otpInput.type = originalType;

  otpInput.setAttribute('autocomplete', 'one-time-code');
  otpInput.setAttribute('inputmode', 'numeric');

  const controller = new AbortController();

  navigator.credentials.get({
    otp: { transport: ['sms'] },
    signal: controller.signal
  }).then(otp => {
    if (otp?.code) {
      // TEMPORARILY allow text ONLY for autofill
      otpInput.type = 'text';
      otpInput.value = otp.code;

      otpInput.dispatchEvent(new Event('input', { bubbles: true }));
      otpInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Mask again immediately
      requestAnimationFrame(() => {
        otpInput.type = originalType;
      });

      controller.abort();
      console.log('OTP auto-filled');
    }
  }).catch(err => {
    otpInput.type = originalType;
    console.log('OTP read cancelled or failed', err);
  });
}

export default function decorateForm(formDef) {
  const { journeyName, sessionExpiryTimeout, sessionExpiryFlag } = formDef?.properties || {};
  //form?.classList.add(journeyName);

  if(window){
    const flowType = [...new URLSearchParams(window.location.search).entries()]
                      .find(([key]) => key.toLowerCase() === 'flowtype')?.[1]?.toLowerCase();

    if (flowType === 'leaddedupe') {
      const leadDedupeOrigin = new URL(LEAD_DEDUPE_HOST).origin;
      if (window.location.origin.toLowerCase() !== leadDedupeOrigin.toLowerCase()) {
        const redirectUrl = `${leadDedupeOrigin}${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.replace(redirectUrl);
        return;
      }
    }
  }

  // If form level field "Session Expiry Flag is set to True -> Add event listeners."
  if (sessionExpiryFlag === true) {
    // Default session timeout time - 25mins || 1500 seconds.
    setSessionExpiry(sessionExpiryTimeout || 1500);
  }
  if (journeyName === "CC_Journey") {
    // Signal delayed.js to handle URL cleanup after all scripts have loaded,
    // ensuring query params are not removed before other code has read them.
    window.isISJourney = true;
    setTimeout(() => {
      autoReadOtp();
    }, 500);
    try {
      loadCSS(`${window.hlx.codeBasePath}/styles/cc-journey.css`);
    } catch (error) {
      console.error('Failed to load CSS:', error);
    }
  }
}
