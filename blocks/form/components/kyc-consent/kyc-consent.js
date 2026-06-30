import { subscribe } from '../../rules/index.js';
import { getSubmitBaseUrl } from '../../constant.js';

export default function decorate(block, fieldJson, container, formId) {
  let formModel;
  const { isDBTConsent, consentContentPath } = fieldJson?.properties || {};
  const languageDropdown = block.querySelector('select:first-of-type');
  const consentTextId = block.querySelector('.field-consenttext')?.dataset?.id;
  const dbtConsent1Id = block.querySelector('.field-dbtconsent1')?.dataset?.id;
  const dbtConsent2Id = block.querySelector('.field-dbtconsent1')?.dataset?.id;
  const additionalTextId = block.querySelector('.field-additionaltext')?.dataset?.id;
  const dbtConsentWrapperId = block.querySelector('.field-dbtconsentwrapper')?.dataset?.id;
  const { value: lang, id: dropdownId } = languageDropdown || {};

  async function setConsentContent(_lang) {
    if (!formModel) return;

    const consentText = formModel.getElement(consentTextId);
    const dbtConsent1 = formModel.getElement(dbtConsent1Id);
    const dbtConsent2 = formModel.getElement(dbtConsent2Id);
    const additionalText = formModel.getElement(additionalTextId);
    if (consentContentPath && consentText) {
      // Construct the full content path
      const fullContentPath = `${getSubmitBaseUrl()}${consentContentPath}/${!_lang ? 'english' : _lang.toLowerCase()}/jcr:content/root/container/container.model.json`;
      try {
        const response = await fetch(fullContentPath);
        if (!response.ok) {
          throw new Error(`Failed to fetch consent content: ${response.status}`);
        }
        const data = await response.json();

        // Get all items and find the one with id 'consentText'
        const items = data[':items'] || {};
        const consentTextItem = Object.values(items).find((item) => item.id === 'consentText');
        const dbtConsent1Item = Object.values(items).find((item) => item.id === 'dbtConsent1');
        const dbtConsent2Item = Object.values(items).find((item) => item.id === 'dbtConsent2');
        const additionalTextItem = Object.values(items).find((item) => item.id === 'additionalText');

        if (consentTextItem && consentTextItem.text) {
          // Set the consent text content
          consentText.value = consentTextItem.text;
        }
        if (dbtConsent1Item && dbtConsent1Item.text && isDBTConsent) {
          dbtConsent1.label.value = dbtConsent1Item.text;
          block.querySelector('.field-dbtconsent1 > label').innerHTML = dbtConsent1Item.text;
        }
        if (dbtConsent2Item && dbtConsent2Item.text && isDBTConsent) {
          dbtConsent2.label.value = dbtConsent2Item.text;
          block.querySelector('.field-dbtconsent2 > label').innerHTML = dbtConsent2Item.text;
        }
        if (additionalTextItem && additionalTextItem.text) {
          additionalText.value = additionalTextItem.text;
        }
      } catch (error) {
        console.error('Error fetching consent content:', error);
      } finally {
        block.querySelector('.field-consenttext')?.classList.remove('field-valid');
        block.querySelector('.field-dbtconsent1 > label')?.classList.remove('field-valid');
        block.querySelector('.field-dbtconsent2 > label')?.classList.remove('field-valid');
        block.querySelector('.field-additionaltext')?.classList.remove('field-valid');
      }
    }
  }

  subscribe(block, formId, async (_fieldDiv, fieldModel) => {
    formModel = fieldModel?.form;

    setConsentContent(lang);

    if (!isDBTConsent) {
      formModel.getElement(dbtConsentWrapperId).visible = false;
    }

    const dropdown = formModel.getElement(dropdownId);

    dropdown.subscribe((e) => {
      const { payload } = e;
      payload?.changes?.forEach(async (change) => {
        if (change?.propertyName === 'value') {
          const { currentValue } = change;
          setConsentContent(currentValue);
        }
      });
    });
  });
  return block;
}
