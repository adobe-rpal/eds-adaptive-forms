import { subscribe } from '../../rules/index.js';

/**
 * Formats time based on variant
 * @param {number} seconds - Time in seconds
 * @param {string} variant - Display variant (default or minutes)
 * @returns {string} Formatted time string
 */
function formatTime(seconds, variant) {
  if (variant === 'minutes') {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')} Min`;
  }
  return `${seconds} secs`;
}

export default function decorate(fieldDiv, fieldJson, container, formId) {
  // eslint-disable-next-line no-unsafe-optional-chaining
  const { initialText, finalText, time, variant = 'default' } = fieldJson?.properties;

  const button = fieldDiv.querySelector('button');
  // Style the button to look like text/link instead of a button
  button.classList.add('countdown-timer-link');
  fieldDiv.classList.add('countdown-timer-container');
  // Show initialText immediately on page load instead of the authored title
  button.textContent = initialText || 'Resend OTP in: ';
  // Convert time to seconds (default to 10 seconds if not provided)
  const countdownSeconds = parseInt(time, 10) || 10;

  const startCountdown = (retries) => {
    // Clear any existing countdown interval
    if (button.dataset.countdownInterval) {
      clearInterval(parseInt(button.dataset.countdownInterval, 10));
    }

    let secondsRemaining = countdownSeconds;

    // Set initial state - disabled with countdown text
    button.textContent = initialText || 'Resend OTP in: ';
    button.disabled = true;

    // Create a span for the countdown number
    const countdownSpan = document.createElement('span');
    countdownSpan.classList.add('countdown-timer-number');
    countdownSpan.textContent = formatTime(secondsRemaining, variant);
    button.appendChild(countdownSpan);

    // Start the countdown
    const countdownInterval = setInterval(() => {
      secondsRemaining -= 1;

      if (secondsRemaining <= 0) {
        // Countdown complete
        clearInterval(countdownInterval);

        // Update button text and enable it
        button.textContent = finalText || 'Resend OTP';
        if (retries > 1) {
          button.disabled = false;
        } else {
          button.disabled = true;
        }
        // Add a class to indicate the countdown is complete
        fieldDiv.classList.add('countdown-complete');
      } else {
        // Update the countdown display
        countdownSpan.textContent = formatTime(secondsRemaining, variant);
      }
    }, 1000);

    // Store the interval ID on the button element ,so it can be cleared if needed
    button.dataset.countdownInterval = countdownInterval;
  };

  subscribe(fieldDiv, formId, (_fieldDiv, fieldModel) => {
    let timerStarted = false;

    // Watch otpPanel visibility via MutationObserver — field itself is always
    // visible:true so we must observe the parent panel's data-visible attribute.
    const otpPanel = document.querySelector('[name="otpCorporatePanel"]');
    if (otpPanel) {
      const observer = new MutationObserver(() => {
        if (otpPanel.dataset.visible === 'true' && !timerStarted) {
          timerStarted = true;
          const { retries } = fieldModel.properties || {};
          startCountdown(retries || 1);
        }
      });
      observer.observe(otpPanel, { attributes: true, attributeFilter: ['data-visible'] });

      // Handle case where panel is already visible on init
      if (otpPanel.dataset.visible === 'true') {
        timerStarted = true;
        const { retries } = fieldModel.properties || {};
        startCountdown(retries || 1);
      }
    }

    // Restart countdown on resetOtpCounter (resend OTP)
    fieldModel.subscribe(() => {
      timerStarted = false;
      const { retries: currentRetries } = fieldModel.properties || {};
      if (currentRetries > 0) {
        startCountdown(currentRetries);
        fieldModel.properties.retries = currentRetries - 1;
      }
    }, 'resetOtpCounter');
  });

  return fieldDiv;
}
