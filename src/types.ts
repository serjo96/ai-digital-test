export interface SourceRow {
  row_id: string;
  supplier: string;
  supplier_sku: string;
  raw_title: string;
  raw_specs: string;
  price: string;
  stock: number;
}

export interface PriceResult {
  raw: string;
  amount: string | null;
  currency: 'GBP' | 'EUR' | 'USD' | null;
  status: 'parsed' | 'missing' | 'unknown_currency' | 'unsupported_format';
  assumption: string | null;
}

export interface NormalizedRow {
  source: SourceRow;
  titleKey: string;
  price: PriceResult;
  outcome: 'grouped' | 'non_product' | 'review';
  groupId: string | null;
  reasons: string[];
}

export interface BaselineGroup {
  id: string;
  rowIds: string[];
  titleKey: string;
  method: 'exact_normalized_title' | 'compatible_identity';
}

export interface BaselineResult {
  rows: NormalizedRow[];
  groups: BaselineGroup[];
}

export type Pair = [string, string];
export interface EvalCase {
  id: string;
  family: string;
  split: 'development' | 'holdout';
  status: 'provisional' | 'human_verified';
  reviewedBy: string | null;
  reviewedAt: string | null;
  rowIds: string[];
  expectedGroups: string[][];
  nonProductRowIds: string[];
  unknownPairs: Pair[];
  explanation: string;
}

export interface Labels {
  version: string;
  cases: EvalCase[];
}

export interface Ratio {
  numerator: number;
  denominator: number;
  value: number | null;
}

export interface Evaluation {
  split: 'development';
  status: 'provisional' | 'human_verified' | 'not_evaluated';
  caseCount: number;
  evaluatedRows: number;
  tp: number;
  fp: number;
  fn: number;
  precision: Ratio;
  recall: Ratio;
  unknownPairs: number;
  unevaluatedPairs: Pair[];
  errors: { kind: 'false_merge' | 'missed_pair'; pair: Pair }[];
  nonProducts: { correct: number; checked: number; errors: string[] };
}

export interface RunReport {
  schemaVersion: '1' | '2';
  rulesVersion: 'B0-v1' | 'B1-v1' | 'B1-v2';
  runId: string;
  createdAt: string;
  status: 'success';
  mode: 'code-only';
  code: { commit: string | null; dirty: boolean | null; implementationHash: string };
  hashes: { feed: string; taxonomy: string; labels: string; config: string; checks?: string };
  config: { titleNormalization: string; dollarCurrency: string; split: 'development'; baseline?: 'b0' | 'b1' };
  audit: {
    inputRows: number;
    accountedRows: number;
    lostRows: number;
    duplicateAssignments: number;
    suppliers: number;
    taxonomySize: number;
    emptySpecs: number;
    emptyTitles: number;
    emptyPrices: number;
    normalizedTitles: number;
    nonProducts: number;
    reviewRows: number;
    groups: number;
    groupedRows: number;
    repeatedGroups: number;
    priceStatuses: Record<string, number>;
  };
  evaluation: Evaluation;
  generation: null;
  verifier: null;
  api: { calls: 0; errors: 0; tokens: 0; cost: 0 };
  wallTimeMs: number;
  decisionsHash: string;
  metrics?: import('./metrics.js').Metric[];
  checks?: import('./quality.js').QualityEvaluation;
  timing?: { protocol: 'cli-through-result-v1'; node: string; platform: string; arch: string; pipelineMs: number };
}
