import { subscribe } from '../../rules/index.js';
import { stripTags } from '../../util.js';
import triggerAnalytics from '../../../../liabilities/insta_savings_journey/analytics.js';

function createSkipModal(properties, globals, onConfirm, onCancel) {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'skip-modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'skip-modal';
  const closeButton = document.createElement('button');
  closeButton.className = 'skip-modal-close';
  closeButton.setAttribute('aria-label', 'Close');
  const modalContent = document.createElement('div');
  modalContent.className = 'skip-modal-content';
  const illustration = document.createElement('div');
  illustration.className = 'skip-modal-illustration';
  const heading = document.createElement('h3');
  heading.textContent = properties.popupHeading || 'Are you sure you want to skip?';
  const description = document.createElement('p');
  description.textContent = properties.popupDescription || 'You can add family members in just a few steps. Adding a family member allows them to open a Zero Balance Savings Account.';
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'skip-modal-buttons';
  const confirmButton = document.createElement('button');
  confirmButton.className = 'skip-confirm-btn';
  confirmButton.textContent = properties.popupCtaLabel || 'Skip for Now';
  const cancelButton = document.createElement('button');
  cancelButton.className = 'skip-cancel-btn';
  cancelButton.textContent = properties.popupCancelLabel || 'Cancel';
  const closeModal = () => {
    document.body.removeChild(modalOverlay);
    onCancel?.();
  };

  const confirmSkip = () => {
    document.body.removeChild(modalOverlay);
    onConfirm?.();
  };
  confirmButton.addEventListener('click', async (e) => {
    e.preventDefault();

    const analyticsEvent = {
      payload: {
        response: {
          submitter: {
            $name: 'SkipFamilyGroupFeaturesPopupClicked',
            $type: 'button',
              }
            }
      },
      _target: {
        properties: {
          triggerEventName: 'SkipFamilyGroupFeaturesPopupClicked',
            }
          }
    };
    triggerAnalytics(analyticsEvent, globals.form, 'click');
      })

    cancelButton.addEventListener('click', async (e) => {
    e.preventDefault();

    const analyticsEvent = {
      payload: {
        response: {
          submitter: {
            $name: 'SkipFamilyGroupFeaturesPopupCancelled',
            $type: 'button',
              }
            }
      },
      _target: {
        properties: {
          triggerEventName: 'SkipFamilyGroupFeaturesPopupCancelled',
            }
          }
    };
    triggerAnalytics(analyticsEvent, globals.form, 'click');
      })
  closeButton.addEventListener('click', closeModal);
  cancelButton.addEventListener('click', closeModal);
  confirmButton.addEventListener('click', confirmSkip);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  buttonContainer.appendChild(confirmButton);
  buttonContainer.appendChild(cancelButton);

  modalContent.appendChild(illustration);
  modalContent.appendChild(heading);
  modalContent.appendChild(description);
  modalContent.appendChild(buttonContainer);

  modal.appendChild(closeButton);
  modal.appendChild(modalContent);
  modalOverlay.appendChild(modal);

  return modalOverlay;
}

function findPanelByName(form, panelName) {
  let foundPanel = null;

  form.visit((field) => {
    if (field.name === panelName && field.isContainer) {
      foundPanel = field;
    }
  });
  return foundPanel;
}

function navigateToPanel(form, panelName, currentFieldModel, formId) {
  const panel = findPanelByName(form, panelName);
  if (panel) {
    // Hide the parent panel containing the skip button
    if (currentFieldModel && currentFieldModel.parent) {
      let parentPanel = currentFieldModel.parent;
      while (parentPanel && !parentPanel.isContainer) {
        parentPanel = parentPanel.parent;
      }
      if (parentPanel && parentPanel.isContainer) {
        parentPanel.visible = false;
      }
    }
    // form.setFocus(panel);
    panel.visible = true;
    currentFieldModel.dispatch({ type : 'custom:skippedCurrentPanel', payload : { formId } });
  }
}

export default function decorate(element, fd, container, formId) {
  subscribe(element, formId, (_element, fieldModel) => {
    const { properties } = fieldModel;
    const { form } = fieldModel;

    const globals = {
      form: form,
      functions: {
        dispatchEvent: (target, eventName, payload) => {
          target.dispatchEvent(
            new CustomEvent(eventName, {
              detail: payload,
              bubbles: true,
            })
          );
        },
        exportData: () => form.exportData(),
        setProperty: (field, props) =>
          form.setProperty(field, props),
      },
      field: fieldModel,
    };
    const skipButton = document.createElement('button');
    skipButton.textContent = stripTags(fieldModel.label?.value, '') || 'Skip';
    skipButton.className = 'skip-button';
    skipButton.type = 'button';
    skipButton.addEventListener('click', async (e) => {
    e.preventDefault();

    const analyticsEvent = {
      payload: {
        response: {
          submitter: {
            $name: 'skipButtonFamilyGroupFeatures',
            $type: 'button',
              }
            }
      },
      _target: {
        properties: {
          triggerEventName: 'skipButtonFamilyGroupFeatures',
            }
          }
    };
    triggerAnalytics(analyticsEvent, globals.form, 'click');
      })


    skipButton.addEventListener('click', () => {
      const modal = createSkipModal(
        properties,
        globals,   
        () => {
          if (properties.nextPanelName) {
            navigateToPanel(form, properties.nextPanelName, fieldModel, formId);
          }
        },
        () => {
        }
      );

      document.body.appendChild(modal);
    });

    element.innerHTML = '';
    element.appendChild(skipButton);

    fieldModel.subscribe((e) => {
        const { changes } = e?.payload || {};
        changes?.forEach((change) => {
          if (change?.propertyName === 'label') {
          skipButton.textContent = stripTags(change.currentValue?.value, '') || 'Skip';
          }
        });
    }, 'change');
  });

  return element;
}
