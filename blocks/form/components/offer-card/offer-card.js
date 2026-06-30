import { initOfferCards, handleOfferSsoRedirection} from '../../../../../eds-li/liabilities/insta_savings_journey/functions.js';
import {subscribe} from '../../rules/index.js';
import triggerAnalytics from '../../../../liabilities/insta_savings_journey/analytics.js';
import { getSubmitBaseUrl } from '../../constant.js';
/**
 * Creates an individual offer card element
 * @param {Object} offerData - The offer card data
 * @returns {HTMLElement} - The li element containing the card
 */
function createOfferCardElement(offerData, journeyKey, userContext, globals) {
  const cardDiv = document.createElement('div');
  
  const customClass = offerData.customStyleClass || '';
  cardDiv.className = `offer-card ${customClass}`.trim();

  // Image wrapper
  const imgWrapper = document.createElement('div');
  imgWrapper.className = 'img-wrapper';
  const img = document.createElement('img');
  img.src = offerData.cardImage;
  img.alt = offerData.title;
  img.className = 'offer-img';
  imgWrapper.appendChild(img);
  cardDiv.appendChild(imgWrapper);

  if(journeyKey === 'PIXEL_CC'){
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = offerData.preApprovedText;
    cardDiv.appendChild(tag);
  }

  if(offerData?.isPreApprovedJourney){
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = offerData.preApprovedText;
    cardDiv.appendChild(tag);
  }

  const innerDiv = document.createElement('div');
  innerDiv.className = 'offer-card-inn';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = offerData.title;
  innerDiv.appendChild(title);

  if(journeyKey === "PIXEL_CC"){
    const subtitle = document.createElement('p');
    subtitle.className = 'sub';
    subtitle.innerHTML = 'Enjoy up to <b>5% cashback</b> at <span class="cut-price">₹500</span> zero fee';
    innerDiv.appendChild(subtitle);
  }else{
    const subtitle = document.createElement('p');
    subtitle.className = 'sub';
    subtitle.textContent = offerData.cardDescription || '';
    innerDiv.appendChild(subtitle);
  }

  const button = document.createElement('button');
  button.className = 'btn';
  button.textContent = offerData.cardLinkText || 'Apply Now';

  const cardLink = (offerData.cardLink || '').replace(/^https:\/\/applyonline\.hdfcbank\.com/,getSubmitBaseUrl());
  
  const isSSO = journeyKey !== 'INSURANCE_NPA' && journeyKey !== 'TERM_INSURANCE_NPA' && journeyKey !== 'PIXEL_CC';
  
  if (isSSO && userContext) {
    // SSO: Prevent default, handle SSO flow
    button.addEventListener('click', async (e) => {
      e.preventDefault();

      globals.form.properties.cardTitle = offerData.title;
      globals.form.properties.offerType = journeyKey;
      globals.form.properties.buttonText = offerData.cardLinkText;
      const analyticsEvent = {
        payload: {
          response: {
            submitter: {
              $name: 'offerClick',
              $type: 'button',
            }
          }
        },
        _target: {
          properties: {
            triggerEventName: 'offerClick'
          }
        }
      };

      
      triggerAnalytics(analyticsEvent, globals.form, 'click');
      await handleOfferSsoRedirection(
        journeyKey,
        cardLink,
        userContext.mobileNumber,
        userContext.dateOfBirth,
        userContext.journeyID,
        userContext.journeyName,
        globals
      );
    });
  } else {
    button.onclick = () => {
      if (cardLink && cardLink !== '#') {
        window.open(cardLink, '_blank');
      }
    };
  }

  innerDiv.appendChild(button);
  cardDiv.appendChild(innerDiv);
  return cardDiv;
}

/**
 * Renders offer cards in both desktop grid and mobile swiper layouts
 * @param {Element} block - The block element
 * @param {Array} finalResponse - Array of offer data
 * @param {Object} userContext - User context data
 * @param {Object} globals - Global scope object
 */
function renderOfferCards(block, finalResponse, userContext, globals) {
  if (!finalResponse || finalResponse.length === 0) {
    block.innerHTML = '<p class="offer-card-message">No offers available at this time.</p>';
    return;
  }

  // Create main container
  const mainContainer = document.createElement('div');
  mainContainer.className = "offer-card-container";
  
  // Add title
  const title = document.createElement('h2');
  title.className = 'offers-title';
  title.textContent = 'Exciting offers curated for you';
  mainContainer.appendChild(title);

  // 1. DESKTOP GRID
  const desktopGrid = document.createElement('div');
  desktopGrid.className = 'offers-grid';
  
  finalResponse.forEach(({ key, value }) => {
    const cardDiv = createOfferCardElement(value, key, userContext, globals);
    desktopGrid.appendChild(cardDiv);
  });
  
  mainContainer.appendChild(desktopGrid);

  // 2. MOBILE SWIPER
  const swiperContainer = document.createElement('div');
  swiperContainer.className = 'swiper offer-swiper';
  
  const swiperWrapper = document.createElement('div');
  swiperWrapper.className = 'swiper-wrapper';
  
  finalResponse.forEach(({ key, value }) => {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    
    const cardDiv = createOfferCardElement(value, key, userContext, globals);
    slide.appendChild(cardDiv);
    swiperWrapper.appendChild(slide);
  });
  
  swiperContainer.appendChild(swiperWrapper);
  
  // Add pagination
  const pagination = document.createElement('div');
  pagination.className = 'swiper-pagination';
  swiperContainer.appendChild(pagination);
  
  mainContainer.appendChild(swiperContainer);

  // Clear block and append
  block.textContent = '';
  block.appendChild(mainContainer);
  
  // Initialize Swiper after DOM is ready
  setTimeout(() => {
    initializeSwiper();
  }, 100);
}

/**
 * Initializes Swiper carousel for mobile view
 * Loads Swiper library if not already loaded
 */
function initializeSwiper() {
  // Check if Swiper is available
  if (typeof Swiper === 'undefined') {
    console.warn('Swiper not loaded. Loading from CDN...');
    
    // Load Swiper JS
    const swiperJS = document.createElement('script');
    swiperJS.src = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
    swiperJS.onload = () => {
      new Swiper('.offer-swiper', {
        slidesPerView: 1.1,
        spaceBetween: 16,
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        breakpoints: {
          768: { enabled: false }
        }
      });
    };
    document.head.appendChild(swiperJS);
  } else {
    // Swiper already loaded
    new Swiper('.offer-swiper', {
      slidesPerView: 1.1,
      spaceBetween: 16,
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      breakpoints: {
        768: { enabled: false }
      }
    });
  }
}
async function loadOfferCards(element, fieldModel, form) {
  const tokenField = form.resolveQualifiedName('$form.hiddenFieldsPanel.Id_token_jwt');
  const token = tokenField?.value;
  
  const mobileNumber = form.resolveQualifiedName('$form.loginFragment.loginPanel.mobileNumberWrapper.mobileNumber')?.value;
  const dateOfBirth = form.properties?.dateOfBirth;
  
  if (!mobileNumber || !dateOfBirth) {
    element.innerHTML = '<p class="offer-card-message">Please complete the login form.</p>';
    return;
  }
  
  try {
    element.innerHTML = '<div class="offer-card-loading">Loading your offers...</div>';

    const constructedGlobals = {
      form:{
        $properties:{
          mobileNumber: mobileNumber.length > 10 ? mobileNumber.toString() : "91" + mobileNumber.toString(),
          dateOfBirth: dateOfBirth,
          journeyID: form.properties?.journeyID || form.properties?.journeyId || "",
          journeyName: form.properties?.journeyName || "",
          Id_token_jwt: token
        }
      }
    };

    const globals = {
      form: form,
      functions: {
        dispatchEvent: (target, eventName, payload) => {
          target.dispatchEvent(new CustomEvent(eventName, {
            detail: payload,
            bubbles: true
          }));
        },
        exportData: () => form.exportData(),
        setProperty: (field, props) => form.setProperty(field, props)
      },
      field: fieldModel
    };
    
    const finalResponse = await initOfferCards(constructedGlobals);
    
    if (!finalResponse || finalResponse.length === 0) {
      element.innerHTML = '<p class="offer-card-message">No offers available at this time.</p>';
      return;
    }
    
    const userContext = {
      mobileNumber: mobileNumber,
      dateOfBirth: dateOfBirth,
      journeyID: form.properties?.journeyID || '',
      journeyName: form.properties?.journeyName || ''
    };
    renderOfferCards(element, finalResponse, userContext, globals);
    
  } catch (error) {
    console.error('API ERROR]', error);
    element.innerHTML = '<div class="offer-card-error">Unable to load offers. Please try again.</div>';
  }
}

export default async function decorate(fieldDiv, fieldJson, parentElement, formId) {
  fieldDiv.classList.add('offer-card');
  subscribe(fieldDiv, formId, async (element, fieldModel) => {
    // INITIALIZATION CHECK - Run immediately if already visible
    if (fieldModel.visible === true) {
      await loadOfferCards(element, fieldModel, fieldModel.form);
    }
    
    // VISIBILITY CHANGE LISTENER - For normal flow
    fieldModel.subscribe(async (event) => {
      const changes = event.payload?.changes || [];
      for (const change of changes) {
        if (change.propertyName === 'visible' && change.currentValue === true) {
          await loadOfferCards(element, fieldModel, fieldModel.form);
        }
      }
    });
  });
}
