export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  loop_type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL,
  summary TEXT
);

CREATE TABLE IF NOT EXISTS concepts (
  concept_id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  parent_concept_id TEXT REFERENCES concepts(concept_id),
  canonical_name TEXT NOT NULL,
  current_status TEXT NOT NULL,
  summary TEXT,
  best_version_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS concept_versions (
  version_id TEXT PRIMARY KEY,
  concept_id TEXT NOT NULL REFERENCES concepts(concept_id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  parent_version_id TEXT REFERENCES concept_versions(version_id),
  version_no INTEGER NOT NULL,
  hypothesis TEXT,
  decision TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scorecards (
  scorecard_id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES concept_versions(version_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('predicted', 'actual', 'designer_review')),
  author_role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  summary TEXT
);

CREATE TABLE IF NOT EXISTS metric_definitions (
  metric_key TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  label TEXT NOT NULL,
  scale_type TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metric_values (
  scorecard_id TEXT NOT NULL REFERENCES scorecards(scorecard_id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL REFERENCES metric_definitions(metric_key),
  value REAL NOT NULL,
  rationale TEXT,
  PRIMARY KEY (scorecard_id, metric_key)
);

CREATE TABLE IF NOT EXISTS playtests (
  playtest_id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES concept_versions(version_id) ON DELETE CASCADE,
  tester_role TEXT NOT NULL,
  strategy_mode TEXT NOT NULL,
  blind_pattern TEXT,
  verdict TEXT,
  report_summary TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS principles (
  principle_id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  principle_type TEXT NOT NULL CHECK (principle_type IN ('principle', 'anti_pattern', 'procedure', 'open_question')),
  statement TEXT NOT NULL,
  why_it_matters TEXT,
  status TEXT NOT NULL CHECK (status IN ('candidate', 'emerging', 'validated', 'contested', 'deprecated')),
  confidence REAL NOT NULL,
  created_run_id TEXT REFERENCES runs(run_id),
  created_version_id TEXT REFERENCES concept_versions(version_id),
  last_supported_at TEXT,
  last_contradicted_at TEXT,
  last_validated_at TEXT,
  retrieval_enabled INTEGER NOT NULL DEFAULT 1,
  retrieval_priority REAL NOT NULL DEFAULT 0,
  support_count INTEGER NOT NULL DEFAULT 0,
  contradict_count INTEGER NOT NULL DEFAULT 0,
  distinct_concepts INTEGER NOT NULL DEFAULT 0,
  distinct_runs INTEGER NOT NULL DEFAULT 0,
  avg_effect_size REAL NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS principle_evidence (
  principle_id TEXT NOT NULL REFERENCES principles(principle_id) ON DELETE CASCADE,
  version_id TEXT NOT NULL REFERENCES concept_versions(version_id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('support', 'contradict', 'refine', 'inconclusive', 'out_of_scope')),
  weight REAL NOT NULL,
  effect_size REAL NOT NULL,
  scope_match REAL NOT NULL,
  created_at TEXT NOT NULL,
  note TEXT,
  PRIMARY KEY (principle_id, version_id, relation_type)
);

CREATE TABLE IF NOT EXISTS retrieval_briefs (
  brief_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  task TEXT NOT NULL,
  created_at TEXT NOT NULL,
  summary TEXT
);

CREATE TABLE IF NOT EXISTS retrieval_items (
  item_id TEXT PRIMARY KEY,
  brief_id TEXT NOT NULL REFERENCES retrieval_briefs(brief_id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('principle', 'concept', 'version', 'artifact', 'playtest')),
  source_id TEXT NOT NULL,
  rank_score REAL NOT NULL,
  usefulness_feedback TEXT CHECK (usefulness_feedback IN ('useful', 'irrelevant', 'misleading', 'unknown'))
);

CREATE TABLE IF NOT EXISTS tags (
  tag_id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS concept_tags (
  concept_id TEXT NOT NULL REFERENCES concepts(concept_id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
  PRIMARY KEY (concept_id, tag_id)
);

CREATE TABLE IF NOT EXISTS version_tags (
  version_id TEXT NOT NULL REFERENCES concept_versions(version_id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
  PRIMARY KEY (version_id, tag_id)
);

CREATE TABLE IF NOT EXISTS principle_tags (
  principle_id TEXT NOT NULL REFERENCES principles(principle_id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(tag_id) ON DELETE CASCADE,
  PRIMARY KEY (principle_id, tag_id)
);

CREATE TABLE IF NOT EXISTS artifacts (
  artifact_id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES concept_versions(version_id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  git_commit TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bugs (
  bug_id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES concept_versions(version_id) ON DELETE CASCADE,
  playtest_id TEXT REFERENCES playtests(playtest_id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  reproduction_steps TEXT NOT NULL,
  expected_behavior TEXT NOT NULL,
  actual_behavior TEXT NOT NULL,
  blocking INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('open', 'fixed_pending_qa', 'fixed_verified', 'wontfix')),
  created_at TEXT NOT NULL,
  closed_at TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS bug_fix_passes (
  fix_pass_id TEXT PRIMARY KEY,
  bug_id TEXT NOT NULL REFERENCES bugs(bug_id) ON DELETE CASCADE,
  engineer_role TEXT NOT NULL,
  summary TEXT NOT NULL,
  git_commit TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qa_retest_results (
  retest_id TEXT PRIMARY KEY,
  bug_id TEXT NOT NULL REFERENCES bugs(bug_id) ON DELETE CASCADE,
  playtest_id TEXT REFERENCES playtests(playtest_id) ON DELETE SET NULL,
  tester_role TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('fixed', 'still_failing', 'new_issue', 'not_retested')),
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_namespace_started_at ON runs(namespace, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_concepts_namespace_status ON concepts(namespace, current_status);
CREATE INDEX IF NOT EXISTS idx_concept_versions_concept_version ON concept_versions(concept_id, version_no DESC);
CREATE INDEX IF NOT EXISTS idx_concept_versions_run_id ON concept_versions(run_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_version_kind ON scorecards(version_id, kind);
CREATE INDEX IF NOT EXISTS idx_playtests_version_created_at ON playtests(version_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_principles_namespace_status_type ON principles(namespace, status, principle_type);
CREATE INDEX IF NOT EXISTS idx_principle_evidence_principle ON principle_evidence(principle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retrieval_briefs_run_role ON retrieval_briefs(run_id, role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retrieval_items_source ON retrieval_items(source_type, source_id, usefulness_feedback);
CREATE INDEX IF NOT EXISTS idx_tags_namespace_label ON tags(namespace, label);
CREATE INDEX IF NOT EXISTS idx_bugs_version_status ON bugs(version_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_bug_fix_passes_bug_id ON bug_fix_passes(bug_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_retests_bug_id ON qa_retest_results(bug_id, created_at DESC);
`;
