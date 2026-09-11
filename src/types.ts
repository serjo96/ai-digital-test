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

export interface ControlledClaimEvaluation {
  status: 'provisional' | 'human_verified' | 'not_evaluated';
  checked: number;
  supported: { allowed: number; total: number; falseBlocks: number };
  unsupported: { blocked: number; total: number; leaked: number };
  disputed: { blocked: number; total: number; leaked: number };
  errors: { caseId: string; expected: string; actual: string | null }[];
}
export interface PublicationSummary {
  products: number;
  drafts: number;
  ready: number;
  withheld: number;
  review: number;
  coveredRows: number;
  repairAttempted: number;
  repairSucceeded: number;
  reasons: Record<string, number>;
}
export interface GeneratedClaimEvaluation {
  status: 'provisional' | 'human_verified' | 'not_evaluated';
  checkedPublishedClaims: number;
  totalPublishedClaims: number;
  fullyCheckedProducts: number;
  totalPublishedProducts: number;
  completedSampleProducts: number;
  requiredSampleProducts: number;
  publishedClaimErrors: number;
  nonAtomicIssueClaims: number;
  unclearCopyIssueClaims: number;
}
export interface RunReport {
  schemaVersion: '1' | '2' | '3' | '4';
  rulesVersion: 'B0-v1' | 'B1-v1' | 'B1-v2' | 'B2-v1' | 'B3-v1';
  runId: string;
  createdAt: string;
  status: 'success' | 'partial';
  mode: 'code-only' | 'live' | 'replay' | 'test';
  code: { commit: string | null; dirty: boolean | null; implementationHash: string };
  hashes: { feed: string; taxonomy: string; labels: string; config: string; checks?: string; semanticChecks?: string; claimChecks?: string; generatedChecks?: string; stage4Gate?: string };
  config: { titleNormalization: string; dollarCurrency: string; split: 'development'; baseline?: 'b0' | 'b1' | 'b2' | 'b3'; ai?: import('./ai/config.js').AiConfig | import('./publication-config.js').Stage4Config; aiTask?: 'extraction' | 'matching'; aiCohort?: 'development' | 'full_input' };
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
  generation: PublicationSummary | null;
  verifier: { controlled: ControlledClaimEvaluation; generated: GeneratedClaimEvaluation } | null;
  api: { calls: number; errors: number; tokens: number | null; cost: number | null; retries?: number; cacheHits?: number; inputTokens?: number | null; outputTokens?: number | null };
  ai?: { targetRows: number; jobs: number; failedJobs: number; origin: 'real' | 'test'; requestHashes: string[];
    roles?: Record<string, import('./ai/contracts.js').AiSummary & { jobs: number; medianWallMs: number | null; p95WallMs: number | null }> };
  semanticChecks?: import('./semantic-quality.js').SemanticEvaluation;
  wallTimeMs: number;
  decisionsHash: string;
  publicationHash?: string;
  metrics?: import('./metrics.js').Metric[];
  checks?: import('./quality.js').QualityEvaluation;
  timing?: { protocol: 'cli-through-result-v1'; node: string; platform: string; arch: string; pipelineMs: number };
}
