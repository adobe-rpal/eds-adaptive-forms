import { subscribe } from '../../rules/index.js';
import { resolveAssetUrl } from '../../../../creditcard/functions.js';

const FALLBACK_FEATURES_MULTI = 3;
const FALLBACK_FEATURES_SINGLE = 6;

function findByName(form, name) {
  let found = null;
  form.visit((f) => {
    if (f?.name === name) found = f;
  });
  return found;
}

function transformKeyBenefitHtml(html) {
  return String(html).replace(
    /<div\s+class="cc-benefit-icon"\s+data-icon="([^"]+)"\s*>\s*<\/div>/gi,
    (_, icon) => `<img class="cc-benefit-icon" src="${resolveAssetUrl(`/icons/${icon}`)}" alt="" width="24" height="24" loading="lazy" onerror="this.style.display='none'">`,
  );
}

function formatFeesValue(card) {
  const fee = card.annualFee || card.joiningFee || card.renewalFee || '0';
  return `₹${fee}`;
}

function composeBenefitsHtml(card) {
  if (!card) return '';
  const features = Array.isArray(card.features) ? card.features : [];
  const parts = [];
  if (card.product) parts.push(`<h3>${card.product}</h3>`);
  if (card.cardLine) parts.push(`<p>${card.cardLine}</p>`);
  if (features.length > 0) {
    parts.push(`<ul>${features.map((f) => `<li>${f}</li>`).join('')}</ul>`);
  }
  return parts.join('');
}

function buildSingleCardLayout(card, featureLimit, props, onMoreBenefits) {
  const wrap = document.createElement('div');
  wrap.className = 'cc-selector__single';
  wrap.dataset.tileIndex = '0';

  // Hidden radio keeps the AEM model.value in sync; visually hidden via CSS.
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.dataset.fieldType = 'radio-group';
  radio.dataset.index = '0';
  radio.className = 'cc-selector__radio cc-selector__radio--hidden';
  radio.checked = true;
  radio.disabled = true;
  wrap.appendChild(radio);

  if (card.productCode) {
    const facia = document.createElement('img');
    facia.className = 'cc-selector__single-facia';
    facia.src = resolveAssetUrl(card.productCode);
    facia.alt = card.product || '';
    facia.loading = 'lazy';
    facia.width = 280;
    facia.height = 176;
    facia.onerror = () => { facia.hidden = true; };
    wrap.appendChild(facia);
  }

  const content = document.createElement('div');
  content.className = 'cc-selector__single-content';

  const header = document.createElement('div');
  header.className = 'cc-selector__single-header';
  const title = document.createElement('h3');
  title.className = 'cc-selector__single-title';
  title.textContent = props.singleCardLayoutTitle || 'Features & Benefits';
  header.appendChild(title);
  const viewAll = document.createElement('button');
  viewAll.type = 'button';
  viewAll.className = 'cc-selector__view-all';
  viewAll.dataset.action = 'open-benefits';
  viewAll.innerHTML = `${props.viewAllBenefitsLabel || 'View All Benefits'} <span aria-hidden="true">›</span>`;
  viewAll.addEventListener('click', (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    onMoreBenefits(card);
  });
  header.appendChild(viewAll);
  content.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'cc-selector__feature-grid';
  const benefits = Array.isArray(card.keyBenefits) ? card.keyBenefits.slice(0, featureLimit) : [];
  benefits.forEach((html) => {
    const item = document.createElement('div');
    item.className = 'cc-selector__feature-item';
    item.innerHTML = transformKeyBenefitHtml(html);
    grid.appendChild(item);
  });
  content.appendChild(grid);

  const feesRow = document.createElement('div');
  feesRow.className = 'cc-selector__fees-row';

  const joining = document.createElement('span');
  joining.className = 'cc-selector__fees-pill';
  const joiningLbl = document.createElement('span');
  joiningLbl.className = 'cc-selector__fees-pill-label';
  joiningLbl.textContent = props.joiningFeesLabel || 'Joining Fees';
  const joiningVal = document.createElement('strong');
  joiningVal.className = 'cc-selector__fees-pill-value';
  joiningVal.textContent = `₹${card.joiningFee || '0'}`;
  joining.append(joiningLbl, joiningVal);
  feesRow.appendChild(joining);

  const renewal = document.createElement('span');
  renewal.className = 'cc-selector__fees-pill';
  const renewalLbl = document.createElement('span');
  renewalLbl.className = 'cc-selector__fees-pill-label';
  renewalLbl.textContent = props.renewalFeesLabel || 'Renewal Fees';
  const renewalVal = document.createElement('strong');
  renewalVal.className = 'cc-selector__fees-pill-value';
  renewalVal.textContent = `₹${card.annualFee || card.renewalFee || '0'}`;
  renewal.append(renewalLbl, renewalVal);
  feesRow.appendChild(renewal);

  content.appendChild(feesRow);

  if (card.annualFeesMessage) {
    const note = document.createElement('p');
    note.className = 'cc-selector__fees-note';
    note.textContent = card.annualFeesMessage;
    content.appendChild(note);
  }

  wrap.appendChild(content);
  return wrap;
}

function buildTile(card, idx, featureLimit, props, isRecommended, radioName, isSingle, onMoreBenefits) {
  const tile = document.createElement('div');
  tile.className = 'cc-selector__tile';
  tile.dataset.tileIndex = String(idx);

  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.dataset.fieldType = 'radio-group';
  radio.dataset.index = String(idx);
  radio.className = 'cc-selector__radio';
  radio.name = radioName;
  if (isSingle) {
    radio.checked = true;
    radio.disabled = true;
  }
  tile.appendChild(radio);

  if (isRecommended) {
    const badge = document.createElement('span');
    badge.className = 'cc-selector__badge';
    badge.textContent = props.recommendedBadgeLabel || 'Recommended';
    tile.appendChild(badge);
  }

  const name = document.createElement('h3');
  name.className = 'cc-selector__name';
  name.textContent = card.product || '';
  tile.appendChild(name);

  const tagline = document.createElement('p');
  tagline.className = 'cc-selector__tagline';
  tagline.textContent = card.cardLine || '';
  tile.appendChild(tagline);

  if (card.productCode) {
    const facia = document.createElement('img');
    facia.className = 'cc-selector__facia';
    facia.src = resolveAssetUrl(card.productCode);
    facia.alt = card.product || '';
    facia.loading = 'lazy';
    facia.width = 320;
    facia.height = 200;
    facia.onerror = () => { facia.hidden = true; };
    tile.appendChild(facia);
  }

  const features = document.createElement('ul');
  features.className = 'cc-selector__features';
  const benefits = Array.isArray(card.keyBenefits)
    ? card.keyBenefits.slice(0, featureLimit)
    : [];
  features.innerHTML = benefits.map((html) => `<li>${transformKeyBenefitHtml(html)}</li>`).join('');
  tile.appendChild(features);

  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'cc-selector__more-benefits';
  moreBtn.dataset.action = 'open-benefits';
  moreBtn.innerHTML = `${props.moreBenefitsLabel || 'More Benefits'} <span aria-hidden="true">›</span>`;
  moreBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    onMoreBenefits(card);
  });
  tile.appendChild(moreBtn);

  const feesRow = document.createElement('div');
  feesRow.className = 'cc-selector__fees';
  const feesLabel = document.createElement('span');
  feesLabel.className = 'cc-selector__fees-label';
  feesLabel.textContent = props.joiningRenewalFeesLabel || 'Joining / Renewal Fees';
  feesRow.appendChild(feesLabel);
  const feesValue = document.createElement('span');
  feesValue.className = 'cc-selector__fees-value';
  feesValue.textContent = formatFeesValue(card);
  feesRow.appendChild(feesValue);
  tile.appendChild(feesRow);

  if (card.annualFeesMessage) {
    const note = document.createElement('p');
    note.className = 'cc-selector__fees-note';
    note.textContent = card.annualFeesMessage;
    tile.appendChild(note);
  }

  if (isRecommended) tile.classList.add('is-recommended');
  if (card.isAnnualFeeWaiverAvailable === 'Yes') tile.classList.add('has-fee-waiver');

  return tile;
}

function syncSelectedRadio(element, enumList, value) {
  if (!Array.isArray(enumList)) return;
  const idx = value
    ? enumList.findIndex((c) => c?.cardProductCode === value?.cardProductCode)
    : -1;
  element.querySelectorAll('[data-tile-index]').forEach((tile) => {
    const i = parseInt(tile.dataset.tileIndex, 10);
    const radio = tile.querySelector('input[type="radio"]');
    if (radio && !radio.disabled) radio.checked = (i === idx);
    tile.classList.toggle('is-selected', i === idx);
  });
}

export default function decorate(element, fieldJson, container, formId) {
  const props = fieldJson.properties || {};
  let lastEnum = [];

  subscribe(element, formId, (_el, fieldModel) => {
    function handleMoreBenefits(card) {
      fieldModel.dispatch({
        type: 'custom:moreBenefitsClicked',
        payload: { cardCode: card?.cardProductCode || '' },
      });
      const modal = findByName(fieldModel.form, props.modalPanelName || 'cardBenefitsModal');
      const content = findByName(fieldModel.form, props.contentFieldName || 'cardBenefitsContent');
      if (!modal || !content) {
        console.warn('More Benefits: modal panel or content field not found', {
          modalPanelName: props.modalPanelName,
          contentFieldName: props.contentFieldName,
        });
        return;
      }
      content.value = composeBenefitsHtml(card);
      modal.visible = true;
    }

    function rebuild(cards) {
      lastEnum = Array.isArray(cards) ? cards.filter((c) => c && typeof c === 'object') : [];

      element.innerHTML = '';

      const isSingle = lastEnum.length === 1;
      const featureLimit = isSingle
        ? (Number(props.singleCardFeatureCount) || FALLBACK_FEATURES_SINGLE)
        : (Number(props.tileFeatureCount) || FALLBACK_FEATURES_MULTI);

      const root = document.createElement('div');
      root.className = isSingle ? 'cc-selector cc-selector--single' : 'cc-selector cc-selector--multi';

      if (isSingle) {
        root.appendChild(
          buildSingleCardLayout(lastEnum[0], featureLimit, props, handleMoreBenefits),
        );
      } else {
        const list = document.createElement('div');
        list.className = 'cc-selector__list';
        root.appendChild(list);

        const radioName = `cc-selector-group-${Math.random().toString(36).slice(2, 11)}`;
        lastEnum.forEach((card, idx) => {
          list.appendChild(
            buildTile(card, idx, featureLimit, props, idx === 0, radioName, false, handleMoreBenefits),
          );
        });
      }

      element.appendChild(root);

      if (fieldModel.value) syncSelectedRadio(element, lastEnum, fieldModel.value);
    }

    fieldModel.subscribe((e) => {
      e?.payload?.changes?.forEach((change) => {
        if (change.propertyName === 'enum') {
          rebuild(change.currentValue);
        } else if (change.propertyName === 'value') {
          syncSelectedRadio(element, lastEnum, change.currentValue);
        }
      });
    });

    // Radio change → push value to model.
    element.addEventListener('change', (ev) => {
      ev.stopPropagation();
      const idx = parseInt(ev.target.dataset.index, 10);
      if (!Number.isNaN(idx) && Array.isArray(fieldModel.enum)) {
        fieldModel.value = fieldModel.enum[idx];
      }
    });

    // Tile-wide click → select the radio. More Benefits has its own per-button listener.
    element.addEventListener('click', (ev) => {
      if (ev.target.closest('input[type="radio"]')) return;
      if (ev.target.closest('[data-action="open-benefits"]')) return;
      const tile = ev.target.closest('[data-tile-index]');
      if (!tile) return;
      const radio = tile.querySelector('input[type="radio"]');
      if (radio && !radio.disabled && !radio.checked) radio.click();
    });
  });

  return element;
}