import { subscribe } from '../../rules/index.js';

export default function decorate(element, fieldJson, container, formId) {
  const { expandButtonLabel, collapseButtonLabel } = fieldJson.properties;
  function createSingleAccountCard(accountData, model) {
    const legend = element.querySelector('legend');
    legend.textContent = accountData.Account;
    element.querySelector('.radio-wrapper')?.remove();

    // Mapping of feature keys to icon image URLs
    const iconMap = model.properties?.iconsMapping?.reduce((acc, item) => {
      acc[item.Features] = `/eds-li/blocks/form/components/single-account-card/icons/${item.Icons}.svg`;
      return acc;
    }, {});
    const defaultIcon = 'https://img.icons8.com/ios-filled/50/000000/star--v1.png';

    // Remove old features if any
    element.querySelector('.features-grid')?.remove();

    // Create grid container
    const grid = document.createElement('div');
    grid.className = 'features-grid';

    // Loop through features
    Object.entries(accountData).forEach(([key, value]) => {
      if (['Account', 'Link', 'consent','Balance Requirement','Required Consent','gigacreditcard','Product Codes','Sub Product Codes','AMB_RURAL','AMB_URBAN','AMB_SEMIURBAN','AMB_METROPOLITAN','Parent_Product_Category','Optional Consent','Account_Category','Is_BaaS_Account', 'Manage_Program_Applicable'].includes(key)) return; // skip non-features

      if(value.trim()==="-"){
        return;
      }
      const card = document.createElement('div');
      card.className = 'feature-card';

      // Icon
      const icon = document.createElement('div');
      icon.className = 'feature-icon';
      const img = document.createElement('img');
      img.src = iconMap[key] || defaultIcon;
      img.alt = `${key} icon`;
      img.width = 40;
      img.height = 40;
      icon.appendChild(img);

      // Title
      const title = document.createElement('div');
      title.className = 'feature-title';
      title.textContent = key;

      // Value
      const desc = document.createElement('div');
      desc.className = 'feature-desc';
      desc.textContent = value;

      if (value.trim() === "" || value.trim() === "-") {
        desc.classList.add('empty-desc');
      } else {
        desc.classList.remove('empty-desc');
      }

      card.appendChild(icon);
      card.appendChild(title);
      card.appendChild(desc);

      grid.appendChild(card);
    });

    if( myForm.properties.queryParams.utm_campaign !==  "gigaccount" ){
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'card-choice-toggle';
    toggleButton.textContent = 'View More Details';
    toggleButton.type = 'button';

    grid.classList.add('collapse');

    toggleButton.addEventListener('click', () => {
      if (grid.classList.contains('expand')) {
        grid.classList.remove('expand');
        grid.classList.add('collapse');
        toggleButton.textContent = expandButtonLabel || 'View More Details';
      } else {
        grid.classList.remove('collapse');
        grid.classList.add('expand');
        toggleButton.textContent = collapseButtonLabel || 'View Less';
      }
    });
     element.appendChild(grid);
     element.appendChild(toggleButton);
  } else{
     element.appendChild(grid);
  }
   
    
  }

  subscribe(element, formId, (fieldDiv, fieldModel) => {
    fieldModel.subscribe((e) => {
      const { payload } = e;
      payload?.changes?.forEach((change) => {
        const { propertyName, currentValue } = change;
        if (propertyName === 'enum') {
          createSingleAccountCard(currentValue?.[0], fieldModel);
          fieldModel.value = fieldModel.enum?.[0]; // set the first value as the default value
        }
      });
    });
  });

  return element;
}
