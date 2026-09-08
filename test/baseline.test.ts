import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertAccounting, baseline, parsePrice, TAXONOMY, titleKey, validateInputs } from '../src/baseline.js';
import type { SourceRow } from '../src/types.js';

export const row = (id: string, title = 'Widget', overrides: Partial<SourceRow> = {}): SourceRow => ({
  row_id: id, supplier: 'Supplier', supplier_sku: id, raw_title: title, raw_specs: '', price: '$10', stock: 0, ...overrides,
});

test('money uses exact decimal strings for every supported format and arbitrary size', () => {
  for (const [raw, amount, currency] of [
    ['£264.99', '264.99', 'GBP'], ['769,99 EUR', '769.99', 'EUR'], ['USD 187', '187.00', 'USD'],
    ['$129', '129.00', 'USD'], ['$0.10', '0.10', 'USD'], ['USD 0007.5', '7.50', 'USD'],
    ['$9007199254740993.99', '9007199254740993.99', 'USD'], [' £119.00 ', '119.00', 'GBP'],
  ]) {
    const price = parsePrice(raw!);
    assert.equal(price.amount, amount); assert.equal(price.currency, currency); assert.equal(price.raw, raw);
    assert.equal(price.status, 'parsed');
  }
  assert.match(parsePrice('$0').assumption!, /USD/);
  assert.equal(parsePrice('0').status, 'unknown_currency');
  assert.equal(parsePrice('0').currency, null);
  assert.equal(parsePrice('0').amount, '0.00');
  assert.equal(parsePrice(' ').status, 'missing');
  for (const raw of ['USD 1,000', '$1.999', 'NaN', '-2 EUR', 'JPY 10', '1.234,56 EUR']) {
    assert.equal(parsePrice(raw).status, 'unsupported_format');
    assert.equal(parsePrice(raw).amount, null);
  }
});

test('input validation rejects bad types, stock, IDs, supplier/SKU and taxonomy', () => {
  assert.throws(() => validateInputs({}, TAXONOMY), /array/);
  assert.throws(() => validateInputs([], TAXONOMY), /nonempty/);
  assert.throws(() => validateInputs([null], TAXONOMY), /object/);
  assert.throws(() => validateInputs([{ ...row('a'), price: 4 }], TAXONOMY), /price/);
  const incomplete: Partial<SourceRow> = row('a'); delete incomplete.raw_specs;
  assert.throws(() => validateInputs([incomplete], TAXONOMY), /raw_specs/);
  for (const stock of [-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => validateInputs([row('a', 'x', { stock })], TAXONOMY), /stock/);
  assert.throws(() => validateInputs([row(' ')], TAXONOMY), /blank/);
  assert.throws(() => validateInputs([row('a'), row('a')], TAXONOMY), /duplicate row_id/);
  assert.throws(() => validateInputs([row('a'), row('b', 'x', { supplier_sku: 'a' })], TAXONOMY), /supplier\/SKU/);
  assert.throws(() => validateInputs([row('a')], [...TAXONOMY.slice(1), 'new_category']), /taxonomy/);
  assert.throws(() => validateInputs([row('a')], [...TAXONOMY.slice(1), 'other']), /taxonomy/);
  assert.equal(validateInputs([row('a'), row('b', 'x', { supplier: 'Other', supplier_sku: 'a' })], TAXONOMY).length, 2);
});

test('normalization preserves variants, punctuation, capacity and accessories', () => {
  assert.equal(titleKey('  NIMBUS\t2   speaker\n'), 'nimbus 2 speaker');
  const titles = ['Nimbus 2', 'Nimbus 2 Pro', 'AeroBuds Pro', 'AeroBuds Pro replacement ear tips', 'SSD 1TB', 'SSD 2TB', 'WH-880N', 'WH880N'];
  const result = baseline(titles.map((t, i) => row(String(i), t)));
  assert.equal(result.groups.length, titles.length);
});

test('non-products depend on content, while zero stock and empty specs remain valid', () => {
  const input = [
    row('ordinary-id', '*** PRICE DROP *** see attached sheet', { stock: 9 }),
    row('another-id', 'TEST ROW DO NOT IMPORT', { stock: 12 }),
    row('blank', ''), row('pallet', 'MIXED PALLET - ASSORTED ELECTRONICS'),
    row('row_f4de4c72c5', 'Real lamp'), row('missing-title', '', { raw_specs: '12W speaker' }),
    row('pallet-product', 'Pallet-shaped desk lamp'),
  ];
  const result = baseline(input);
  assertAccounting(input, result);
  assert.equal(result.rows.filter(r => r.outcome === 'non_product').length, 4);
  assert.equal(result.rows.find(r => r.source.row_id === 'row_f4de4c72c5')?.outcome, 'grouped');
  assert.equal(result.rows.find(r => r.source.row_id === 'missing-title')?.outcome, 'review');
  assert.equal(result.rows.find(r => r.source.row_id === 'pallet-product')?.outcome, 'grouped');
});

test('source offers are preserved; same supplier multiple SKUs and empty specs may group', () => {
  const input = [row('a', 'QUILL 3 DESK LAMP', { stock: 17 }), row('b', 'Quill 3 desk lamp', { stock: 29 })];
  const snapshot = structuredClone(input);
  const result = baseline(input);
  assert.deepEqual(input, snapshot);
  assert.equal(result.groups.length, 1);
  assert.equal(result.rows[0]!.source.stock, 17);
  assert.equal(result.rows[1]!.source.stock, 29);
  assert.equal('stock' in result.groups[0]!, false);
  result.rows[0]!.source.raw_specs = 'changed copy';
  assert.equal(input[0]!.raw_specs, '');
});

test('accounting detects loss and double assignment, including non-products', () => {
  const input = [row('a'), row('b'), row('c', '')];
  const good = baseline(input); assertAccounting(input, good);
  const lost = structuredClone(good); lost.rows.pop();
  assert.throws(() => assertAccounting(input, lost), /lost/);
  const duplicate = structuredClone(good); duplicate.groups[0]!.rowIds.push('a');
  assert.throws(() => assertAccounting(input, duplicate), /double/);
  const rejected = structuredClone(good); rejected.groups[0]!.rowIds.push('c');
  assert.throws(() => assertAccounting(input, rejected), /non-group/);
});

test('all supplied inputs are accounted for and decisions survive reversed input order', async () => {
  const feed: unknown = JSON.parse(await readFile('supplier_feed.json', 'utf8'));
  const taxonomy: unknown = JSON.parse(await readFile('taxonomy.json', 'utf8'));
  const input = validateInputs(feed, taxonomy); const result = baseline(input);
  assertAccounting(input, result);
  assert.equal(input.length, 220);
  assert.equal(result.rows.length, 220);
  assert.equal(result.rows.filter(r => r.outcome === 'non_product').length, 4);
  assert.equal(result.groups.reduce((n, g) => n + g.rowIds.length, 0), 216);
  assert.equal(result.groups.length, 165);
  assert.equal(result.rows.filter(r => r.price.status === 'parsed').length, 217);
  assert.deepEqual(result, baseline([...input].reverse()));
});
