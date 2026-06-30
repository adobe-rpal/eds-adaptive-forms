import { subscribe } from '../../rules/index.js';
// TODO: Replace this hardcoded variable with API data when ready
let lifeInsurancePlanCodes = [
  {
    code: 'HDFC_BANK_GTL_18_45_1_ADOBE',
    products: [
      {
        priority: 1,
        plan_groups: [
          {
            tenure: 1,
            tenure_unit: 'year',
            start_price: 4543.0,
            priority: 1,
            sum_insured: 1000000.0,
          },
        ],
      },
    ],
  },
  {
    code: 'HDFC_BANK_GTL_18_45_2_ADOBE',
    products: [
      {
        priority: 1,
        plan_groups: [
          {
            tenure: 1,
            tenure_unit: 'year',
            start_price: 6814.5,
            priority: 1,
            sum_insured: 1500000.0,
          },
        ],
      },
    ],
  },
  {
    code: 'HDFC_BANK_GTL_18_45_3_ADOBE',
    products: [
      {
        priority: 1,
        plan_groups: [
          {
            tenure: 1,
            tenure_unit: 'year',
            start_price: 9086.0,
            priority: 1,
            sum_insured: 2000000.0,
          },
        ],
      },
    ],
  },
  {
    code: 'HDFC_BANK_GTL_18_45_4_ADOBE',
    products: [
      {
        priority: 1,
        plan_groups: [
          {
            tenure: 1,
            tenure_unit: 'year',
            start_price: 11357.5,
            priority: 1,
            sum_insured: 2500000.0,
          },
        ],
      },
    ],
  },
  {
    code: 'HDFC_BANK_GTL_18_45_1_ADOBE',
    products: [
      {
        priority: 1,
        plan_groups: [
          {
            tenure: 1,
            tenure_unit: 'year',
            start_price: 4543.0,
            priority: 1,
            sum_insured: 3000000.0,
          },
        ],
      },
    ],
  },
  {
    code: 'HDFC_BANK_GTL_18_45_1_ADOBE',
    products: [
      {
        priority: 1,
        plan_groups: [
          {
            tenure: 1,
            tenure_unit: 'year',
            start_price: 4543.0,
            priority: 1,
            sum_insured: 3500000.0,
          },
        ],
      },
    ],
  },
  {
    code: 'HDFC_BANK_GTL_18_45_1_ADOBE',
    products: [
      {
        priority: 1,
        plan_groups: [
          {
            tenure: 1,
            tenure_unit: 'year',
            start_price: 4543.0,
            priority: 1,
            sum_insured: 4000000.0,
          },
        ],
      },
    ],
  },
  {
    code: 'HDFC_BANK_GTL_18_45_1_ADOBE',
    products: [
      {
        priority: 1,
        plan_groups: [
          {
            tenure: 1,
            tenure_unit: 'year',
            start_price: 4543.0,
            priority: 1,
            sum_insured: 4500000.0,
          },
        ],
      },
    ],
  },
  {
    code: 'HDFC_BANK_GTL_18_45_1_ADOBE',
    products: [
      {
        priority: 1,
        plan_groups: [
          {
            tenure: 1,
            tenure_unit: 'year',
            start_price: 4543.0,
            priority: 1,
            sum_insured: 5000000.0,
          },
        ],
      },
    ],
  },
  {
    code: 'HDFC_BANK_GTL_18_45_1_ADOBE',
    products: [
      {
        priority: 1,
        plan_groups: [
          {
            tenure: 1,
            tenure_unit: 'year',
            start_price: 4543.0,
            priority: 1,
            sum_insured: 5500000.0,
          },
        ],
      },
    ],
  },
  {
    code: 'HDFC_BANK_GTL_18_45_1_ADOBE',
    products: [
      {
        priority: 1,
        plan_groups: [
          {
            tenure: 1,
            tenure_unit: 'year',
            start_price: 4543.0,
            priority: 1,
            sum_insured: 6000000.0,
          },
        ],
      },
    ],
  },
  {
    code: 'HDFC_BANK_GTL_18_45_1_ADOBE',
    products: [
      {
        priority: 1,
        plan_groups: [
          {
            tenure: 1,
            tenure_unit: 'year',
            start_price: 4543.0,
            priority: 1,
            sum_insured: 6500000.0,
          },
        ],
      },
    ],
  },
  {
    code: 'HDFC_BANK_GTL_18_45_1_ADOBE',
    products: [
      {
        priority: 1,
        plan_groups: [
          {
            tenure: 1,
            tenure_unit: 'year',
            start_price: 4543.0,
            priority: 1,
            sum_insured: 7000000.0,
          },
        ],
      },
    ],
  }
];

function formatSumInsured(amount) {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(amount % 10000000 === 0 ? 0 : 1)}Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)}L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}m`;
  return amount.toString();
}

function extractSumInsuredOptions(planCodesData) {
  if (!Array.isArray(planCodesData)) return [];
  
  const options = [];
  planCodesData.forEach(planCode => {
    planCode.products?.forEach(product => {
      product.plan_groups?.forEach(group => {
        if (group.sum_insured != null) {
          options.push({
            value: group.sum_insured,
            label: formatSumInsured(group.sum_insured),
            price: group.start_price
          });
        }
      });
    });
  });
  
  return options.filter((opt, idx, self) => 
    idx === self.findIndex(o => o.value === opt.value)
  );
}

function renderPillButtons(element, options) {
  const container = document.createElement('div');
  container.className = 'sum-insured-pills-container';
  const radioName = `sum-insured-${Math.random().toString(36).substr(2, 9)}`;

  options.forEach((option, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'sum-insured-pill-wrapper';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = radioName;
    radio.id = `sum-insured-${idx}`;
    radio.className = 'sum-insured-radio';
    radio.value = option.value;
    radio.dataset.index = idx;

    const label = document.createElement('label');
    label.htmlFor = `sum-insured-${idx}`;
    label.className = 'sum-insured-pill';
    label.textContent = option.label;

    wrapper.append(radio, label);
    container.appendChild(wrapper);
  });

  element.innerHTML = '';
  element.appendChild(container);
}

export default function decorate(fieldDiv, fieldJson, parentElement, formId) {
  const options = extractSumInsuredOptions(lifeInsurancePlanCodes);

  if (options.length > 0) {
    fieldJson.enum = options.map(o => o.value);
    fieldJson.enumNames = options.map(o => o.label);
    renderPillButtons(fieldDiv, options);
  }

  subscribe(fieldDiv, formId, async (element, fieldModel) => {
    console.log('✓ Subscribe callback - fieldModel ready');
    
    if (options.length > 0) {
      fieldModel.enum = options.map(o => o.value);
      fieldModel.enumNames = options.map(o => o.label);
    }

    // Listen to value changes on the fieldModel
    fieldModel.subscribe(async (event) => {
      console.log('✓ fieldModel change event:', event);
      
      const changes = event.payload?.changes || [];
      
      for (const change of changes) {
        if (change.propertyName === 'value') {
          const selectedValue = change.currentValue;
          console.log('✓ Value changed:', selectedValue, 'Type:', typeof selectedValue);
          
          // ✅ CRITICAL FIX: Convert string to number
          const numericValue = typeof selectedValue === 'string' 
            ? Number(selectedValue) 
            : selectedValue;
          
          // Validate numeric conversion
          if (isNaN(numericValue)) {
            console.error('Invalid numeric value:', selectedValue);
            return;
          }
          
          console.log('✓ Searching for numeric value:', numericValue);
          
          // Find option with matching numeric value
          const selectedIndex = options.findIndex(opt => opt.value === numericValue);
          
          console.log('✓ Found index:', selectedIndex);
          
          if (selectedIndex === -1) {
            console.warn('Option not found for value:', numericValue);
            console.log('Available options:', options.map(o => o.value));
            return;
          }
          
          const option = options[selectedIndex];
          const planCode = lifeInsurancePlanCodes[selectedIndex]?.code;
          
          if (!planCode) {
            console.error('Plan code not found at index:', selectedIndex);
            return;
          }
          
          console.log('✓ Selected:', { 
            index: selectedIndex,
            option, 
            planCode 
          });
          
          // Store data
          fieldModel.properties = fieldModel.properties || {};
          fieldModel.properties.selectedPrice = option.price;
          fieldModel.properties.selectedPlanCode = planCode;
          fieldModel.properties.selectedSumInsured = option.value;
          
          console.log('✓ Properties updated');
          
          // Fetch premium
          await fetchPremiumDetails(planCode, fieldModel.form);
        }
      }
    }, 'change');
  });

  return fieldDiv;
}

async function fetchPremiumDetails(planCode, form) {
  try {
    if (!form) {
      console.error('Form not provided');
      return;
    }

    const loaderFragment = form.resolveQualifiedName('$form.loader_fragment');
    if (loaderFragment) {
      loaderFragment.visible = true;
      console.log('✓ Loader shown');
    }
    
    console.log('✓ Fetching premium for plan:', planCode);
    
    const journeyId = form.$properties?.journeyId || 'INSURANCE_FETCH_PREMIUM_001';
    const journeyName = form.$properties?.journeyName || 'HDFC_INSURANCE_GTL';
    const packageCode = form.$properties?.packageCode;

    const panel = form.resolveQualifiedName('$form.premiumAmountPanel');
    
    const dobField = form.resolveQualifiedName('$form.dateOfBirth') ||
                     form.resolveQualifiedName('$form.hiddenDob') ||
                     form.resolveQualifiedName('$form.dob');

    if (loaderFragment) loaderFragment.visible = true;
    if (panel) panel.visible = false;
    
    let dob = dobField?.value || dobField?.$value || '';
    
    if (dob?.includes('-')) {
      const [y, m, d] = dob.split('-');
      if (y.length === 4) dob = `${d}-${m}-${y}`;
    }
    
    console.log('✓ Request params:', { journeyId, journeyName, packageCode, planCode, dob });
    
    const response = await fetch('https://hdfc-dev-03.adobecqms.net/content/hdfc_insurance_forms/api/fetchpremium.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestString: {
          journeyId,
          journeyName,
          package_code: packageCode || 'ADOBE_GTL_0E',
          plan_code: planCode,
          pricing_params: [{ key: "proposer_dob", value: dob }]
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const apiResponse = await response.json();
    console.log('✓ Full API response:', apiResponse);
    
    // ✅ Extract data from correct path
    const data = apiResponse?.data?.responseString;
    
    if (!data) {
      console.error('Invalid response structure');
      return;
    }
    
    console.log('✓ Response data:', data);
    
    // Pass form to update display
    updatePremiumDisplay(data, form);
    
  } catch (error) {
    console.error('[fetchPremiumDetails] Error:', error);
  } finally{
    const loaderFragment = form.resolveQualifiedName('$form.loader_fragment');
    if (loaderFragment) loaderFragment.visible = false;
  }
}

function updatePremiumDisplay(responseData, form) {
  try {
    console.log('✓ Updating premium display with:', responseData);
    
    // Show panel
    const panel = form.resolveQualifiedName('$form.premiumAmountPanel');
    if (panel) {
      panel.visible = true;
      console.log('✓ Panel shown');
    } else {
      console.warn('Panel not found');
    }
    
    // Access nested fields
    const premiumAmountField = form.resolveQualifiedName('$form.premiumAmountPanel.premiumAmount');
    const monthlyPremiumField = form.resolveQualifiedName('$form.premiumAmountPanel.monthlyPremium');
    const insurancePartnerField = form.resolveQualifiedName('$form.premiumAmountPanel.insurancePartner');
    
    // ✅ Extract values from correct paths
    const yearlyPremium = responseData.total_premium;
    const monthlyPremium = yearlyPremium ? Math.round(yearlyPremium / 12) : null;
    const insurancePartner = responseData.products?.[0]?.carrier_name || 'HDFC Life';
    
    console.log('✓ Extracted values:', { 
      yearlyPremium, 
      monthlyPremium, 
      insurancePartner 
    });
    
    // Update yearly premium
    if (premiumAmountField && yearlyPremium != null) {
      premiumAmountField.value = `₹${yearlyPremium.toLocaleString('en-IN')}`;
      console.log('✓ Premium amount updated:', premiumAmountField.value);
    } else {
      console.warn('Premium amount field not found or data missing');
    }
    
    // Update monthly premium
    if (monthlyPremiumField && monthlyPremium != null) {
      monthlyPremiumField.value = `₹${monthlyPremium.toLocaleString('en-IN')}`;
      console.log('✓ Monthly premium updated:', monthlyPremiumField.value);
    } else {
      console.warn('Monthly premium field not found or data missing');
    }
    
    // Update insurance partner
    if (insurancePartnerField && insurancePartner) {
      insurancePartnerField.value = insurancePartner;
      console.log('✓ Insurance partner updated:', insurancePartnerField.value);
    } else {
      console.warn('Insurance partner field not found or data missing');
    }
    
    console.log('✓ Premium display complete');
    
  } catch (error) {
    console.error('[updatePremiumDisplay] Error:', error);
  }
}