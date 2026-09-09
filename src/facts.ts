import { hash } from './baseline.js';
import type { Evidence, Extraction, Fact, ReconciledFact } from './domain.js';
import type { SourceRow } from './types.js';

const number = (s: string) => Number(s.replace(',', '.'));
const rounded = (n: number) => Number(n.toFixed(9));
const massFactors: Record<string, number> = { kg: 1000, g: 1, oz: 28.349523125, lb: 453.59237, lbs: 453.59237 };

// Only literal, supported source forms. Unknown text is retained for stage 3.
export function extract(row: SourceRow): Extraction {
  const facts: Fact[] = [];
  const unparsed: Evidence[] = [];
  for (const field of ['raw_title', 'raw_specs'] as const) {
    const text = row[field];
    const covered = new Set<number>();
    const add = (match: RegExpExecArray, attribute: string, value: Fact['value'], unit: string | null = null,
      conditions: string[] = [], scope: Fact['scope'] = 'product', interval: Fact['interval'] = null, rule = attribute) => {
      const start = match.index; const end = start + match[0].length;
      const clauseStart = Math.max(text.lastIndexOf(';', start), text.lastIndexOf(',', start)) + 1;
      // A quote inside a negated clause is not positive evidence.
      const prefix = text.slice(clauseStart, start);
      if (/\b(?:no|not|without|kein|keine)\b/i.test(prefix)) return;
      if (/\b(?:up to|maximum|max|approx(?:imately)?\.?)\s*$/i.test(prefix)) return;
      if (/\b(?:compatible with|for use with)\b/i.test(prefix)) return;
      const evidence: Evidence = { rowId: row.row_id, field, quote: text.slice(start, end), start, end };
      const body = { attribute, value, unit, scope, conditions: [...conditions].sort(), evidence, rule: `B1:${rule}`, interval };
      facts.push({ id: `fact_${hash(JSON.stringify(body))}`, ...body });
      for (let i = start; i < end; i++) covered.add(i);
    };
    const scan = (pattern: RegExp, fn: (m: RegExpExecArray) => void) => { for (const m of text.matchAll(pattern)) fn(m); };
    scan(/\b(?:weight\s*)?(\d+(?:\.\d+)?)\s*(kg|lbs?|oz|g)\b/gi, m => {
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 8);
      if (/^\s*max\b/i.test(after)) return;
      const factor = massFactors[m[2]!.toLowerCase()]!;
      const amount = number(m[1]!); const precision = 10 ** -(m[1]!.split('.')[1]?.length ?? 0);
      add(m, 'mass', rounded(amount * factor), 'g', [], 'product',
        [rounded((amount - precision / 2) * factor), rounded((amount + precision / 2) * factor)], 'mass-rounding-interval');
    });
    scan(/\b(\d+(?:\.\d+)?)\s*kg\s+max\b/gi, m => add(m, 'max_load', number(m[1]!), 'kg', ['maximum']));
    scan(/\b(up to\s+)?(\d+(?:\.\d+)?)\s*(?:hours?|h|Stunden)\b(?:\s+(?:total\s+)?(?:playback|battery))?(?:\s*(?:with case|\(incl\. charging case\)))?/gi, m => {
      add(m, 'battery_runtime', number(m[2]!), 'h', [/with case|incl\. charging case/i.test(m[0]) ? 'with_case' : 'usage_unspecified', ...(m[1] ? ['up_to'] : [])]);
    });
    scan(/\b(up to\s+)?(\d+(?:\.\d+)?)[ -]*day\s+battery\b/gi, m => add(m, 'battery_runtime', number(m[2]!) * 24, 'h', ['usage_unspecified', ...(m[1] ? ['up_to'] : [])]));
    scan(/\b(up to\s+)?(\d+(?:\.\d+)?)\s*MB\/s(?:\s+(read|write))?\b/gi, m => add(m, 'transfer_speed', number(m[2]!), 'MB/s', [m[3]?.toLowerCase() ?? 'direction_unspecified', ...(m[1] ? ['up_to'] : [])]));
    scan(/\b(\d+(?:\.\d+)?)\s*W\b(?:\s+(output|PD passthrough))?/gi, m => add(m, 'power', number(m[1]!), 'W', [m[2]?.toLowerCase().replaceAll(' ', '_') ?? 'purpose_unspecified']));
    scan(/\b(\d+(?:\.\d+)?)\s*(?:inches|inch|in|Zoll)\b|\b(\d+(?:\.\d+)?)"(?:\s*display)?/gi, m => add(m, 'display_size', number(m[1] ?? m[2]!), 'in', /sleeve|case/i.test(row.raw_title) ? ['compatible_device'] : []));
    scan(/\b(\d+)\s*(GB|TB|terabyte)\b(?:\s*(RAM|memory|storage|SSD))?/gi, m => {
      const unit = m[2]!.toLowerCase() === 'terabyte' ? 'TB' : m[2]!.toUpperCase();
      const role = /ram|memory/i.test(m[3] ?? '') ? 'ram' : /storage|ssd/i.test(m[3] ?? '') || /\b(?:SSD|drive|microSD|card)\b/i.test(row.raw_title) ? 'storage' : 'capacity_unspecified';
      add(m, role, number(m[1]!), unit);
    });
    scan(/\b(?:Bluetooth|BT)\s*(\d+(?:\.\d+)?)\b/gi, m => add(m, 'bluetooth_version', m[1]!));
    scan(/\bUSB[ -]?C\b(?:\s+Ladecase\b)?/gi, m => add(m, 'connector', 'USB-C', null, /Ladecase/i.test(m[0]) ? ['charging_case'] : []));
    scan(/\bUSB\s+(\d+\.\d+)(?:\s*(Gen\d+))?\b/gi, m => add(m, 'usb_version', [m[1], m[2]].filter(Boolean).join(' ')));
    scan(/\bIP(?:X\d|\d{2})\b/gi, m => add(m, 'ip_rating', m[0].toUpperCase()));
    scan(/\b(\d+)\s*ATM\b/gi, m => add(m, 'water_pressure_rating', number(m[1]!), 'ATM'));
    scan(/\bwaterproof to\s+(\d+)\s*m\b/gi, m => add(m, 'water_depth', number(m[1]!), 'm', ['up_to']));
    scan(/\b(\d+)\s*MP\b(?:\s*sensor)?/gi, m => add(m, 'sensor_resolution', number(m[1]!), 'MP'));
    scan(/\b(\d+)x\s+(?:optical zoom|optischer Zoom)\b/gi, m => add(m, 'optical_zoom', number(m[1]!), 'x'));
    scan(/\b4K(?:\s+video at\s+|\/|\s*)(\d+)(?:fps)?\b/gi, m => add(m, /HDMI\s*$/i.test(text.slice(0, m.index)) ? 'video_output' : 'video_recording', `4K@${m[1]}fps`));
    scan(/\b(\d+)[ -]port\b/gi, m => add(m, 'ports', number(m[1]!)));
    scan(/\b(\d+)-in-1\b/gi, m => add(m, 'multifunction_count', number(m[1]!)));
    scan(/\b(\d+)\s*buttons\b/gi, m => add(m, 'buttons', number(m[1]!)));
    scan(/\b(\d+)\s*ohm\b/gi, m => add(m, 'impedance', number(m[1]!), 'ohm'));
    scan(/\b(\d+)\s*(?:yr|year)\s+warranty\b/gi, m => add(m, 'warranty_duration', number(m[1]!), 'year', [], 'offer'));
    scan(/\b(?:OPEN BOX|new in box)\b/gi, m => add(m, 'condition', /open/i.test(m[0]) ? 'open_box' : 'new_in_box', null, [], 'offer'));
    scan(/\b(?:(?:colou?r)[: ]+)?(?:black|schwarz|white|silver|blue|red)\b/gi, m => {
      if (/^\s+(?:tactile\s+)?switch/i.test(text.slice(m.index + m[0].length))) return;
      const value = m[0].replace(/^colou?r[: ]+/i, '').toLowerCase();
      // Standalone spec colour or an explicitly named colour is unambiguous.
      const clause = text.slice(Math.max(text.lastIndexOf(';', m.index), text.lastIndexOf(',', m.index)) + 1).split(/[;,]/)[0]!.trim();
      if (field === 'raw_title' || /^colou?r/i.test(m[0]) || clause.toLowerCase() === m[0].toLowerCase()) add(m, 'color', value === 'schwarz' ? 'black' : value);
    });
    scan(/\b(?:(brown|blue|red)\s+(?:tactile\s+)?switch(?:es)?|tactile (brown|blue|red)|(brown))\b/gi, m => {
      if (/keyboard/i.test(row.raw_title)) add(m, 'switch', (m[1] ?? m[2] ?? m[3])!.toLowerCase());
    });
    const features: [RegExp, string, Fact['value']][] = [
      [/\b(?:ANC|Active noise cancelling|Noise Cancelling)\b/gi, 'noise_cancelling', true],
      [/\b(?:TKL|tenkeyless)\b/gi, 'keyboard_layout', 'TKL'],
      [/\b(?:hot-swap|Hot swappable)\b/gi, 'hot_swappable', true],
      [/\bRGB(?: backlight)?\b/gi, 'backlight', 'RGB'],
      [/\b(?:foldable|faltbar)\b/gi, 'foldable', true],
      [/\bmultipoint\b/gi, 'multipoint', true],
      [/\b(?:HR|Heart rate)\b/gi, 'heart_rate_sensor', true],
      [/\b(?:SpO2|blood oxygen)\b/gi, 'blood_oxygen_sensor', true],
      [/\bAMOLED\b/gi, 'display_technology', 'AMOLED'],
      [/\bGaN\b/gi, 'charger_technology', 'GaN'],
      [/\bstereo pairing\b/gi, 'stereo_pairing', true],
      [/\bpassive\b/gi, 'speaker_amplification', 'passive'],
      [/\b(?:SD-Karte)\b/gi, 'memory_card_format', 'SD'],
      [/\bUHS-I\b/g, 'bus_rating', 'UHS-I'],
      [/\bA2\b/g, 'application_rating', 'A2'],
      [/\bBIA\b/g, 'body_composition_method', 'BIA'],
      [/\bapp sync\b/gi, 'app_sync', true],
      [/\bin-line mic\b/gi, 'inline_microphone', true],
      [/\b3\.5mm\b/gi, 'connector', '3.5mm'],
      [/\bLED\b/g, 'light_source', 'LED'],
      [/\bneoprene\b/gi, 'material', 'neoprene'],
      [/\bSilicone\b/gi, 'material', 'silicone'],
      [/\bfolio\b/gi, 'case_style', 'folio'],
      [/\bauto sleep\/wake\b/gi, 'auto_sleep_wake', true],
    ];
    for (const [pattern, attribute, value] of features) scan(pattern, m => add(m, attribute, value));
    // Preserve incomplete clauses in full, including context around a known token.
    if (field === 'raw_specs') for (const m of text.matchAll(/[^;,]+/g)) {
      const remainder = [...m[0]].map((c, i) => covered.has(m.index + i) ? ' ' : c).join('')
        .replace(/\b(?:and|total|rated|water resistant|water rating|display|battery|Akku|HDMI|BT)\b/gi, '').replace(/[\s+().:/-]/g, '');
      if (remainder) unparsed.push({ rowId: row.row_id, field, quote: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  return { facts: facts.sort((a, b) => a.id.localeCompare(b.id)), unparsed };
}

export function reconcile(facts: Fact[]): ReconciledFact[] {
  const attributes = [...new Set(facts.filter(f => f.scope === 'product').map(f => f.attribute))].sort();
  return attributes.map(attribute => {
    const observations = facts.filter(f => f.scope === 'product' && f.attribute === attribute).sort((a, b) => a.id.localeCompare(b.id));
    const contextKeys = new Set(observations.map(f => JSON.stringify([f.unit, f.conditions])));
    let status: ReconciledFact['status'] = 'agreed';
    let reason = 'same_value_and_conditions';
    if (contextKeys.size > 1) { status = 'incomparable'; reason = 'different_units_or_conditions'; }
    else if (attribute === 'mass' && observations.every(f => f.interval)) {
      const overlap = Math.max(...observations.map(f => f.interval![0])) <= Math.min(...observations.map(f => f.interval![1]));
      status = overlap ? 'agreed' : 'conflict'; reason = overlap ? 'common_mass_rounding_interval' : 'disjoint_mass_rounding_intervals';
    } else if (new Set(observations.map(f => JSON.stringify(f.value))).size > 1) {
      status = 'conflict'; reason = 'different_values_same_conditions';
    }
    const representative = [...observations].sort((a, b) => {
      const width = (f: Fact) => f.interval ? f.interval[1] - f.interval[0] : 0;
      return width(b) - width(a) || a.evidence.rowId.localeCompare(b.evidence.rowId) || a.id.localeCompare(b.id);
    })[0]!;
    return { attribute, observations: observations.map(f => f.id), status, acceptedFactId: status === 'agreed' ? representative.id : null,
      confidence: { level: status === 'agreed' ? 'high' : status === 'conflict' ? 'low' : 'medium', reasons: [reason] } };
  });
}
