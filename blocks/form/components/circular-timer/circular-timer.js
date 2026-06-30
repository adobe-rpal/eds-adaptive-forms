import { subscribe } from '../../rules/index.js';

/**
 * Converts seconds into a human-readable format:
 *   - >60 seconds → minutes + seconds
 *   - >60 minutes → hours + minutes + seconds
 *   - >24 hours   → days + hours + minutes + seconds
 *
 * @param {number} totalSeconds - Duration in seconds.
 * @returns {string} Formatted string (e.g., "1d 3h 5m 7s")
 */
function formatDuration(totalSeconds) {
  totalSeconds = parseInt(totalSeconds, 10);
  const days = Math.floor(totalSeconds / (24 * 3600));
  totalSeconds %= (24 * 3600);

  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}


export default function decorate(fieldDiv, fieldJson, container, formId) {
  const { time } = fieldJson?.properties || {};
  const countdownSeconds = parseInt(time, 10) || 30 // Default to 14 seconds if not specified
  const circumference = 2 * Math.PI * 40; // Circle radius is 40 (from SVG viewBox)

  // Create SVG structure for circular timer
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.classList.add('circular-timer-svg');

  // Background circle
  const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgCircle.classList.add('circular-timer-circle', 'background');
  bgCircle.setAttribute('cx', '50');
  bgCircle.setAttribute('cy', '50');
  bgCircle.setAttribute('r', '40');

  // Progress circle
  const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  progressCircle.classList.add('circular-timer-circle', 'progress');
  progressCircle.setAttribute('cx', '50');
  progressCircle.setAttribute('cy', '50');
  progressCircle.setAttribute('r', '40');
  progressCircle.style.strokeDasharray = circumference;
  progressCircle.style.strokeDashoffset = '0';

  svg.appendChild(bgCircle);
  svg.appendChild(progressCircle);

  // Create text display
  const timerText = document.createElement('div');
  timerText.classList.add('circular-timer-text');
  timerText.textContent = `${countdownSeconds}s`;

  // Create container
  const timerContainer = document.createElement('div');
  timerContainer.classList.add('circular-timer-container');
  timerContainer.appendChild(svg);
  timerContainer.appendChild(timerText);

  // Replace any existing content and add timer
  fieldDiv.innerHTML = '';
  fieldDiv.appendChild(timerContainer);

  // Start timer
  const startTimer = (fieldModel) => {
    let timeLeft = countdownSeconds;
    
    const updateTimer = () => {
      const progress = timeLeft / countdownSeconds;
      const offset = circumference * (1 - progress);
      progressCircle.style.strokeDashoffset = offset;
      timerText.textContent = `${formatDuration(timeLeft)}`;

      if (timeLeft <= 0) {
        clearInterval(interval);
        // Dispatch custom event when timer finishes
        fieldModel.form.dispatch({ type : 'custom:timerComplete', payload : { formId } });
        fieldModel.dispatch({ type : 'custom:timerComplete', payload : { formId } });
      }
      timeLeft--;
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000);

    // Store interval ID for cleanup
    fieldDiv.dataset.timerInterval = interval;
  };

  // Timer starts on events
  console.log('[CircularTimer] Timer will start on events for form:', formId, 'with duration:', countdownSeconds, 'seconds');

  // Subscribe to form events
  subscribe(fieldDiv, formId, (_fieldDiv, fieldModel) => {
    // Subscribe to startCircularTimer event
    fieldModel.subscribe(() => {
      console.log('[CircularTimer] Resetting timer for form:', formId);
      // Clear existing interval if any
      if (fieldDiv.dataset.timerInterval) {
        clearInterval(parseInt(fieldDiv.dataset.timerInterval, 10));
      }
      // Restart timer
      startTimer(fieldModel);
    }, 'startCircularTimer');
  });

  return fieldDiv;
}
