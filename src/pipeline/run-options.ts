export interface RunOptions {
  feed: string;
  taxonomy: string;
  labels: string;
  out: string;
  runId: string;
  baseline?: 'b0' | 'b1' | 'b2' | 'b3';
  checks?: string;
  split?: 'development' | 'holdout';
  aiRows?: string[];
  aiPairs?: [string, string][];
  aiConfig?: string;
  aiMode?: 'live' | 'replay';
  aiCache?: string;
  semanticChecks?: string;
  aiTask?: 'extraction' | 'matching';
  aiCohort?: 'development' | 'full_input';
  claimChecks?: string;
  generatedChecks?: string;
  stage4Gate?: string;
  publicationSource?: string;
  retryFrom?: string;
  prepareWeb?: boolean;
}
