import type { CanonicalProduct, Fact, Offer, ReviewItem } from '../../../src/domain.ts';
import type { NormalizedRow, PriceResult } from '../../../src/types.ts';
import type { CatalogSnapshot, ListingView } from './catalog.ts';

const DEMO_NOTICE =
  'Demo data — not a pipeline or AI verification result. These three cards illustrate UI states only.';

function price(raw: string, amount: string, currency: PriceResult['currency']): PriceResult {
  return {
    raw,
    amount,
    currency,
    status: 'parsed',
    assumption: currency === 'USD' && raw.includes('$') ? '$ interpreted as USD (MVP policy)' : null,
  };
}

function row(
  source: NormalizedRow['source'],
  titleKey: string,
  priceResult: PriceResult,
  groupId: string,
): NormalizedRow {
  return {
    source,
    titleKey,
    price: priceResult,
    outcome: 'grouped',
    groupId,
    reasons: [],
  };
}

function evidence(rowId: string, field: 'raw_title' | 'raw_specs', text: string, quote: string) {
  const start = text.indexOf(quote);
  if (start < 0) throw new Error(`demo fixture quote not found in ${field}: ${quote}`);
  return { rowId, field, quote, start, end: start + quote.length };
}

const pivotTitle = 'Pivot wired earbuds';
const pivotSpecs = '3.5mm; in-line mic';
const aeroNordicTitle = 'AeroBuds Pro True Wireless Earbuds - Black';
const aeroNordicSpecs = '20h total with case; ANC; USB-C';
const aeroEuroTitle = 'AEROBUDS PRO / schwarz / ANC';
const aeroEuroSpecs = 'Akku 18h; Active noise cancelling; USB-C Ladecase';
const slateTitle = 'Slate 11 tablet';
const slateSpecs = '';

const factPivotConnector: Fact = {
  id: 'demo_fact_pivot_connector',
  attribute: 'connector',
  value: '3.5mm',
  unit: null,
  scope: 'product',
  conditions: [],
  evidence: evidence('demo_row_pivot', 'raw_specs', pivotSpecs, '3.5mm'),
  rule: 'demo:fixture',
  interval: null,
};

const factPivotMic: Fact = {
  id: 'demo_fact_pivot_mic',
  attribute: 'inline_microphone',
  value: true,
  unit: null,
  scope: 'product',
  conditions: [],
  evidence: evidence('demo_row_pivot', 'raw_specs', pivotSpecs, 'in-line mic'),
  rule: 'demo:fixture',
  interval: null,
};

const factAeroBattery20: Fact = {
  id: 'demo_fact_aero_battery_20',
  attribute: 'battery_runtime',
  value: 20,
  unit: 'h',
  scope: 'product',
  conditions: ['with_case'],
  evidence: evidence('demo_row_aero_nordic', 'raw_specs', aeroNordicSpecs, '20h total with case'),
  rule: 'demo:fixture',
  interval: null,
};

const factAeroBattery18: Fact = {
  id: 'demo_fact_aero_battery_18',
  attribute: 'battery_runtime',
  value: 18,
  unit: 'h',
  scope: 'product',
  conditions: ['with_case'],
  evidence: evidence('demo_row_aero_euro', 'raw_specs', aeroEuroSpecs, 'Akku 18h'),
  rule: 'demo:fixture',
  interval: null,
};

const factAeroAncNordic: Fact = {
  id: 'demo_fact_aero_anc_nordic',
  attribute: 'noise_cancelling',
  value: true,
  unit: null,
  scope: 'product',
  conditions: [],
  evidence: evidence('demo_row_aero_nordic', 'raw_specs', aeroNordicSpecs, 'ANC'),
  rule: 'demo:fixture',
  interval: null,
};

const factAeroAncEuro: Fact = {
  id: 'demo_fact_aero_anc_euro',
  attribute: 'noise_cancelling',
  value: true,
  unit: null,
  scope: 'product',
  conditions: [],
  evidence: evidence('demo_row_aero_euro', 'raw_specs', aeroEuroSpecs, 'Active noise cancelling'),
  rule: 'demo:fixture',
  interval: null,
};

const products: CanonicalProduct[] = [
  {
    id: 'demo_product_pivot',
    rowIds: ['demo_row_pivot'],
    identities: [
      {
        model: 'pivot',
        type: 'earbuds',
        brand: null,
        variants: {},
        conflicts: [],
        evidence: [evidence('demo_row_pivot', 'raw_title', pivotTitle, pivotTitle)],
      },
    ],
    offerIds: ['demo_offer_pivot'],
    category: 'audio_headphones',
    categoryConfidence: { level: 'high', reasons: ['literal_type:earbuds'] },
    identityConfidence: { level: 'high', reasons: ['literal_model_and_compatible_group'] },
    facts: [
      {
        attribute: 'connector',
        observations: [factPivotConnector.id],
        status: 'agreed',
        acceptedFactId: factPivotConnector.id,
        confidence: { level: 'high', reasons: ['same_value_and_conditions'] },
      },
      {
        attribute: 'inline_microphone',
        observations: [factPivotMic.id],
        status: 'agreed',
        acceptedFactId: factPivotMic.id,
        confidence: { level: 'high', reasons: ['same_value_and_conditions'] },
      },
    ],
    reviewIds: [],
  },
  {
    id: 'demo_product_aerobuds',
    rowIds: ['demo_row_aero_nordic', 'demo_row_aero_euro'],
    identities: [
      {
        model: 'aerobuds pro',
        type: 'earbuds',
        brand: null,
        variants: { color: ['black'] },
        conflicts: [],
        evidence: [evidence('demo_row_aero_nordic', 'raw_title', aeroNordicTitle, aeroNordicTitle)],
      },
      {
        model: 'aerobuds pro',
        type: 'earbuds',
        brand: null,
        variants: { color: ['black'] },
        conflicts: [],
        evidence: [evidence('demo_row_aero_euro', 'raw_title', aeroEuroTitle, aeroEuroTitle)],
      },
    ],
    offerIds: ['demo_offer_aero_nordic', 'demo_offer_aero_euro'],
    category: 'audio_headphones',
    categoryConfidence: {
      level: 'high',
      reasons: ['literal_type:earbuds', 'literal_type:earbuds'],
    },
    identityConfidence: { level: 'high', reasons: ['literal_model_and_compatible_group'] },
    facts: [
      {
        attribute: 'battery_runtime',
        observations: [factAeroBattery20.id, factAeroBattery18.id],
        status: 'conflict',
        acceptedFactId: null,
        confidence: { level: 'low', reasons: ['different_values_same_conditions'] },
      },
      {
        attribute: 'noise_cancelling',
        observations: [factAeroAncNordic.id, factAeroAncEuro.id],
        status: 'agreed',
        acceptedFactId: factAeroAncNordic.id,
        confidence: { level: 'high', reasons: ['same_value_and_conditions'] },
      },
    ],
    reviewIds: ['demo_review_aero_conflict'],
  },
  {
    id: 'demo_product_slate',
    rowIds: ['demo_row_slate'],
    identities: [
      {
        model: 'slate 11',
        type: 'tablet',
        brand: null,
        variants: {},
        conflicts: [],
        evidence: [evidence('demo_row_slate', 'raw_title', slateTitle, slateTitle)],
      },
    ],
    offerIds: ['demo_offer_slate'],
    category: 'tablets',
    categoryConfidence: { level: 'high', reasons: ['literal_type:tablet'] },
    identityConfidence: { level: 'medium', reasons: ['unresolved_candidate'] },
    facts: [],
    reviewIds: ['demo_review_slate_missing'],
  },
];

const offers: Offer[] = [
  {
    id: 'demo_offer_pivot',
    rowId: 'demo_row_pivot',
    productId: 'demo_product_pivot',
    supplier: 'clearance-lots',
    sku: 'CL-8488',
    price: price('$190.99', '190.99', 'USD'),
    stock: 482,
    condition: null,
    factIds: [],
  },
  {
    id: 'demo_offer_aero_nordic',
    rowId: 'demo_row_aero_nordic',
    productId: 'demo_product_aerobuds',
    supplier: 'NordicDist',
    sku: 'ND-4417',
    price: price('£89.99', '89.99', 'GBP'),
    stock: 61,
    condition: 'new_in_box',
    factIds: [],
  },
  {
    id: 'demo_offer_aero_euro',
    rowId: 'demo_row_aero_euro',
    productId: 'demo_product_aerobuds',
    supplier: 'EuroStock GmbH',
    sku: 'EU-2201',
    price: price('79,99 EUR', '79.99', 'EUR'),
    stock: 34,
    condition: null,
    factIds: [],
  },
  {
    id: 'demo_offer_slate',
    rowId: 'demo_row_slate',
    productId: 'demo_product_slate',
    supplier: 'Direct2Retail',
    sku: 'DI-1100',
    price: price('$249.00', '249.00', 'USD'),
    stock: 12,
    condition: null,
    factIds: [],
  },
];

const facts: Fact[] = [
  factPivotConnector,
  factPivotMic,
  factAeroBattery20,
  factAeroBattery18,
  factAeroAncNordic,
  factAeroAncEuro,
];

const rows: NormalizedRow[] = [
  row(
    {
      row_id: 'demo_row_pivot',
      supplier: 'clearance-lots',
      supplier_sku: 'CL-8488',
      raw_title: pivotTitle,
      raw_specs: pivotSpecs,
      price: '$190.99',
      stock: 482,
    },
    'pivot wired earbuds',
    price('$190.99', '190.99', 'USD'),
    'demo_product_pivot',
  ),
  row(
    {
      row_id: 'demo_row_aero_nordic',
      supplier: 'NordicDist',
      supplier_sku: 'ND-4417',
      raw_title: aeroNordicTitle,
      raw_specs: aeroNordicSpecs,
      price: '£89.99',
      stock: 61,
    },
    'aerobuds pro true wireless earbuds - black',
    price('£89.99', '89.99', 'GBP'),
    'demo_product_aerobuds',
  ),
  row(
    {
      row_id: 'demo_row_aero_euro',
      supplier: 'EuroStock GmbH',
      supplier_sku: 'EU-2201',
      raw_title: aeroEuroTitle,
      raw_specs: aeroEuroSpecs,
      price: '79,99 EUR',
      stock: 34,
    },
    'aerobuds pro / schwarz / anc',
    price('79,99 EUR', '79.99', 'EUR'),
    'demo_product_aerobuds',
  ),
  row(
    {
      row_id: 'demo_row_slate',
      supplier: 'Direct2Retail',
      supplier_sku: 'DI-1100',
      raw_title: slateTitle,
      raw_specs: slateSpecs,
      price: '$249.00',
      stock: 12,
    },
    'slate 11 tablet',
    price('$249.00', '249.00', 'USD'),
    'demo_product_slate',
  ),
];

const review: ReviewItem[] = [
  {
    id: 'demo_review_aero_conflict',
    rowIds: ['demo_row_aero_nordic', 'demo_row_aero_euro'],
    productIds: ['demo_product_aerobuds'],
    reason: 'fact_conflict:battery_runtime',
    evidence: [factAeroBattery20.evidence, factAeroBattery18.evidence],
    factIds: [factAeroBattery20.id, factAeroBattery18.id],
  },
  {
    id: 'demo_review_slate_missing',
    rowIds: ['demo_row_slate'],
    productIds: ['demo_product_slate'],
    reason: 'missing_specs',
    evidence: [evidence('demo_row_slate', 'raw_title', slateTitle, slateTitle)],
    factIds: [],
  },
];

const listings: Record<string, ListingView> = {
  demo_product_pivot: {
    draftText: 'Pivot wired earbuds with a 3.5mm connector and an in-line microphone.',
    publishedText: 'Pivot wired earbuds with a 3.5mm connector and an in-line microphone.',
    withholdReasons: [],
    reviewFlags: [],
  },
  demo_product_aerobuds: {
    draftText: 'AeroBuds Pro true wireless earbuds with ANC and up to 20 hours battery with case.',
    publishedText: 'AeroBuds Pro true wireless earbuds with active noise cancelling.',
    withholdReasons: ['disputed_claim:battery_runtime'],
    reviewFlags: [review[0]!],
  },
  demo_product_slate: {
    draftText: 'Slate 11 tablet.',
    publishedText: null,
    withholdReasons: ['missing_specs', 'insufficient_evidence'],
    reviewFlags: [review[1]!],
  },
};

export const demoCatalog: CatalogSnapshot = {
  source: 'demo',
  demoNotice: DEMO_NOTICE,
  products,
  offers,
  facts,
  rows,
  review,
  listings,
};
