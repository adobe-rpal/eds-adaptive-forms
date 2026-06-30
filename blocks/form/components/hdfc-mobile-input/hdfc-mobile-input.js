// import { urlPath } from '../../../common/formutils.js';

export default async function decorate(panel) {
    const inputField = panel.querySelector('.field-countrycodesearch input');
    const selectDropdown = panel.querySelector('.field-countrycode input');
    if (inputField && inputField.dataset && inputField.dataset.id) {
      inputField.dataset.id = 'searchcode-id';
    }
    const searchParent = inputField?.parentNode;

    const inputFields = panel.querySelector('input[type="number"]');
    inputFields.addEventListener('input', (event) => {
      let { value } = event.target;

      // Remove all non-digit characters just in case (e.g., from copy-paste)
      value = value.replace(/\D/g, '');

      // If the first digit exists and is not between 6 and 9, remove it
      if (value.length > 0 && !/^[6-9]/.test(value)) {
        value = value.slice(1);
      }

      // Limit to 10 digits max
      if (value.length > 10) {
        value = value.slice(0, 10);
      }

      // Check if the input is about to become 10 identical digits (6–9)
      if (value.length === 10) {
        const allSame = value.split('').every((char) => char === value[0]);
        const firstDigit = value[0];
        if (allSame && /^[6-9]$/.test(firstDigit)) {
          // Reject the 10th character
          value = value.slice(0, 9);
        }
      }

      // Update the input field with the cleaned value
      event.target.value = value;
    });

    try {
      const response = await fetch('https://applyonlinedev.hdfcbank.com/content/hdfc_commonforms/api/mdm.ETB.NRI_ISD_MASTER.COUNTRYNAME.json?pageSize=300&ifsc=234',
      { 
        headers: {
          'Content-type': 'text/plain',
          Accept: 'application/json',
        },
      });
      const data = await response.json();
      const seenISDCodes = new Set();
      const newOptionTemp = document.createElement('ul');
      newOptionTemp.classList.add('isd-drop-down');
      let searchOptions = [];

      data?.forEach(item => {
      const isdCode = item.ISDCODE;
      const countryName = item.DESCRIPTION || item.COUNTRYNAME;

      if (isdCode && countryName && !seenISDCodes.has(isdCode)) {
        seenISDCodes.add(isdCode);

        const option = document.createElement('li');
        const key = `${countryName} (+${isdCode})`;
        option.innerText = key;
        option.value = isdCode;
        option.dataset.id = `+${isdCode}`;
        option.classList.add('lianchor');

        // On click expand the list
        panel.querySelector('.field-countrycode').addEventListener('click', (event) => {
          let searchCodeField = document?.querySelector('[name="countryCodeSearch"]');
          searchCodeField.parentNode.dataset.visible = true;
          const event1 = new Event('change', {
            bubbles: true,
            cancelable: true,
          });
          searchCodeField?.dispatchEvent(event1);
        });

        // On click of options select the option
        option.addEventListener('click', (event) => {
          const selectedCode = event.target.dataset.id;
          document.querySelector('[name="countryCodeSearch"]').value = selectedCode;

          const event1 = new Event('change', { bubbles: true, cancelable: true });
          document.querySelector('[name="countryCodeSearch"]').parentNode.dataset.visible = false;

          inputField?.dispatchEvent(event1);

          let countryCodeEl = document.querySelector('[name="countryCode"]');
          countryCodeEl.value = selectedCode;
          countryCodeEl.dispatchEvent(event1);
        });

        newOptionTemp.appendChild(option);

        searchOptions.push({
          countryCode: isdCode,
          countryText: key
        });
      }
      });

      if (searchParent) {
        searchParent.appendChild(newOptionTemp);
      }

        setTimeout(() => {
          let allLis = document.querySelectorAll('.lianchor')
          for (var i = 0; i < allLis.length; i++) {
              allLis[i].addEventListener('click', (event) => {
                  document.querySelector('[name="countryCodeSearch"]').value = event.target.dataset.id;
                  const event1 = new Event('change', {
                      bubbles: true, // Allow the event to bubble up
                      cancelable: true, // Allow the event to be canceled
                  });
                  panel.visible = false;
                  inputField?.dispatchEvent(event1);
                      
                  let countryCodeEl = document.querySelector('[name="countryCode"]');
                  countryCodeEl.value = event.target.dataset.id; 
                  countryCodeEl.dispatchEvent(event1);
              });
          }
          selectDropdown.addEventListener('input', (event) => {
            // Allow only letters, numbers, and the plus sign
            event.target.value = event.target.value.replace(/[^a-zA-Z0-9+]/g, '');
          });
          document.querySelector('[name="countryCodeSearch"]')?.addEventListener('keyup', (event) => {
            let searchKey = event.target.value;
            if (typeof searchKey !== 'undefined' && searchKey.length >= 0) {
              drawCountryCode(searchOptions, searchKey, inputField, panel);
            }
          });
          // On tab out close the dropdown
          document.querySelector('.field-countrycodesearch').addEventListener('focusout', () => {
            // document.querySelector('[name="countryCodeSearch"]').parentNode.dataset.visible = false;
            setTimeout(() => {
              document.querySelector('[name="countryCodeSearch"]').parentNode.dataset.visible = false;
            }, 100); 
          });
        }, 1200);
    } catch (error) {
      console.error('Failed to fetch country codes:', error);
    }
return panel;
}

function drawCountryCode(searchOptions, key, inputField, panel) {
let filteredOptions = [];
if (key.length == 0) {
    filteredOptions = searchOptions;
} else {
    filteredOptions = searchOptions.filter((searchOption) => {
        let searchText = String(searchOption.countryText);
        return searchText.toLowerCase().includes(key.toLowerCase());
    });
}
if (filteredOptions.length == 0) {
    filteredOptions = searchOptions;
}
let dropdownEle = document.querySelector('.isd-drop-down');
dropdownEle.innerHTML = '';
filteredOptions.forEach((filteredOption) => {
    const newOption = document.createElement('li');
    newOption.innerText = filteredOption?.countryText;
    newOption.value = `${String(filteredOption?.countryCode)}`;
    newOption.classList.add('lianchor')
    newOption.dataset.id = `+${filteredOption?.countryCode}`;
    newOption?.addEventListener('mousedown', (event) => {
      console.log('Option clicked:', event.target.dataset.id);
      document.querySelector('[name="countryCodeSearch"]').value = event.target.dataset.id;
      const event1 = new Event('change', {
        bubbles: true,
        cancelable: true,
      });
      document.querySelector('[name="countryCodeSearch"]').parentNode.dataset.visible = false;
      inputField?.dispatchEvent(event1);
      let countryCodeEl = document.querySelector('[name="countryCode"]');
      countryCodeEl.value = event.target.dataset.id; 
      countryCodeEl.dispatchEvent(event1);
    });
    dropdownEle.appendChild(newOption);
})
}
