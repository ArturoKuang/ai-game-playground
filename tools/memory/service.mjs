import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

import {
  DEFAULT_DB_PATH,
  DEFAULT_METRIC_DEFINITIONS,
  ENGINEER_THRESHOLD_LINES,
  ROLE_BUDGETS,
} from './config.mjs';
import { SCHEMA_SQL } from './schema.mjs';

function nowIso() {
  return new Date().toISOString();
}

function clamp(min, max, value) {
  return Math.max(min, Math.min(max, value));
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function openDb(dbPath = DEFAULT_DB_PATH) {
  ensureDirectory(path.dirname(dbPath));
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

function queryAll(db, sql, params = {}) {
  return db.prepare(sql).all(params);
}

function queryGet(db, sql, params = {}) {
  return db.prepare(sql).get(params);
}

function execute(db, sql, params = {}) {
  return db.prepare(sql).run(params);
}

function withTransaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function requireFields(input, fields) {
  for (const field of fields) {
    if (input[field] === undefined || input[field] === null || input[field] === '') {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

function ensureMetricDefinitions(db) {
  for (const definition of DEFAULT_METRIC_DEFINITIONS) {
    execute(
      db,
      `
        INSERT INTO metric_definitions (metric_key, namespace, label, scale_type, description)
        VALUES ($metricKey, $namespace, $label, $scaleType, $description)
        ON CONFLICT(metric_key) DO UPDATE SET
          namespace = excluded.namespace,
          label = excluded.label,
          scale_type = excluded.scale_type,
          description = excluded.description
      `,
      definition,
    );
  }
}

function makeTagId(namespace, label) {
  return `${namespace}:${slugify(label)}`;
}

function upsertTags(db, namespace, labels = []) {
  const normalized = unique(labels.map((label) => String(label).trim()).filter(Boolean));
  const tagIds = [];

  for (const label of normalized) {
    const tagId = makeTagId(namespace, label);
    execute(
      db,
      `
        INSERT INTO tags (tag_id, namespace, label)
        VALUES ($tagId, $namespace, $label)
        ON CONFLICT(tag_id) DO UPDATE SET label = excluded.label
      `,
      { tagId, namespace, label },
    );
    tagIds.push(tagId);
  }

  return tagIds;
}

function replaceLinks(db, tableName, ownerKey, ownerId, tagIds) {
  execute(db, `DELETE FROM ${tableName} WHERE ${ownerKey} = $ownerId`, { ownerId });
  for (const tagId of tagIds) {
    execute(
      db,
      `INSERT OR IGNORE INTO ${tableName} (${ownerKey}, tag_id) VALUES ($ownerId, $tagId)`,
      { ownerId, tagId },
    );
  }
}

function getRunNamespace(db, runId) {
  const row = queryGet(db, 'SELECT namespace FROM runs WHERE run_id = $runId', { runId });
  if (!row) throw new Error(`Unknown run_id: ${runId}`);
  return row.namespace;
}

function getEntityTags(db, sourceType, sourceId) {
  if (sourceType === 'concept') {
    return queryAll(
      db,
      `
        SELECT t.label
        FROM concept_tags ct
        JOIN tags t ON t.tag_id = ct.tag_id
        WHERE ct.concept_id = $sourceId
      `,
      { sourceId },
    ).map((row) => row.label);
  }

  if (sourceType === 'version') {
    return queryAll(
      db,
      `
        SELECT t.label
        FROM version_tags vt
        JOIN tags t ON t.tag_id = vt.tag_id
        WHERE vt.version_id = $sourceId
      `,
      { sourceId },
    ).map((row) => row.label);
  }

  if (sourceType === 'principle') {
    return queryAll(
      db,
      `
        SELECT t.label
        FROM principle_tags pt
        JOIN tags t ON t.tag_id = pt.tag_id
        WHERE pt.principle_id = $sourceId
      `,
      { sourceId },
    ).map((row) => row.label);
  }

  return [];
}

function auditAdjustment(db, sourceType, sourceId) {
  const rows = queryAll(
    db,
    `
      SELECT usefulness_feedback AS feedback, COUNT(*) AS count
      FROM retrieval_items
      WHERE source_type = $sourceType
        AND source_id = $sourceId
        AND usefulness_feedback IS NOT NULL
      GROUP BY usefulness_feedback
    `,
    { sourceType, sourceId },
  );

  if (rows.length === 0) return 0;

  const weights = {
    useful: 1,
    irrelevant: -0.35,
    misleading: -0.8,
    unknown: 0,
  };

  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const weighted = rows.reduce((sum, row) => sum + row.count * (weights[row.feedback] ?? 0), 0);
  return clamp(-0.2, 0.2, (weighted / total) * 0.2);
}

function statusWeight(sourceType, row) {
  if (sourceType === 'principle') {
    const map = {
      validated: 1,
      emerging: 0.8,
      candidate: 0.45,
      contested: 0.25,
      deprecated: 0.05,
    };
    return map[row.status] ?? 0.4;
  }

  const normalized = String(row.current_status || row.decision || '').toLowerCase();
  const map = {
    keep: 1,
    kept: 1,
    frozen: 0.95,
    iterate: 0.65,
    active: 0.6,
    candidate: 0.55,
    kill: 0.45,
    killed: 0.45,
    deprecated: 0.1,
  };
  return map[normalized] ?? 0.5;
}

function recencyScore(timestamp) {
  if (!timestamp) return 0.35;
  const ageDays = Math.max(0, (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24));
  return clamp(0, 1, 1 - ageDays / 60);
}

function evidenceDiversity(row) {
  if (!row) return 0.4;
  const concepts = Number(row.distinct_concepts || 0);
  const runs = Number(row.distinct_runs || 0);
  return clamp(0, 1, 0.2 + concepts * 0.2 + runs * 0.1);
}

function scopeOverlap(taskTags, sourceTags) {
  const requested = unique(taskTags.map((tag) => String(tag).trim().toLowerCase()));
  if (requested.length === 0) return 1;
  const available = new Set(sourceTags.map((tag) => String(tag).trim().toLowerCase()));
  const overlap = requested.filter((tag) => available.has(tag)).length;
  return overlap / requested.length;
}

function namespaceMatch(runNamespace, rowNamespace) {
  if (rowNamespace === runNamespace) return 1;
  if (rowNamespace === 'global') return 0.7;
  return 0;
}

function rankingScore(db, runNamespace, taskTags, sourceType, row) {
  const tags = getEntityTags(db, sourceType, row.id);
  const overlap = scopeOverlap(taskTags, tags);

  if (taskTags.length > 0 && overlap <= 0) {
    return null;
  }

  const baseRank =
    0.4 * overlap +
    0.2 * namespaceMatch(runNamespace, row.namespace) +
    0.15 * statusWeight(sourceType, row) +
    0.1 * Number(row.confidence ?? 0.5) +
    0.1 * evidenceDiversity(row) +
    0.05 * recencyScore(row.timestamp);

  return clamp(0, 1, baseRank + auditAdjustment(db, sourceType, row.id));
}

function fetchPrincipleRows(db, runNamespace, options = {}) {
  const statuses = options.statuses?.length ? options.statuses : null;
  const types = options.types?.length ? options.types : null;
  const params = { runNamespace };

  const clauses = ['(namespace = $runNamespace OR namespace = \'global\')', 'retrieval_enabled = 1'];
  if (!options.includeDeprecated) clauses.push("status != 'deprecated'");
  if (statuses) {
    const placeholders = statuses.map((status, index) => {
      params[`status${index}`] = status;
      return `$status${index}`;
    });
    clauses.push(`status IN (${placeholders.join(', ')})`);
  }
  if (types) {
    const placeholders = types.map((type, index) => {
      params[`type${index}`] = type;
      return `$type${index}`;
    });
    clauses.push(`principle_type IN (${placeholders.join(', ')})`);
  }

  return queryAll(
    db,
    `
      SELECT
        principle_id AS id,
        namespace,
        title,
        statement,
        why_it_matters,
        status,
        confidence,
        principle_type,
        distinct_concepts,
        distinct_runs,
        support_count,
        contradict_count,
        avg_effect_size,
        COALESCE(last_validated_at, last_supported_at, last_contradicted_at) AS timestamp
      FROM principles
      WHERE ${clauses.join(' AND ')}
    `,
    params,
  );
}

function fetchConceptRows(db, runNamespace, statuses = []) {
  const params = { runNamespace };
  const clauses = ['(namespace = $runNamespace OR namespace = \'global\')'];
  if (statuses.length) {
    const placeholders = statuses.map((status, index) => {
      params[`status${index}`] = status;
      return `$status${index}`;
    });
    clauses.push(`LOWER(current_status) IN (${placeholders.join(', ')})`);
  }

  return queryAll(
    db,
    `
      SELECT
        concept_id AS id,
        namespace,
        canonical_name,
        current_status,
        summary,
        created_at AS timestamp
      FROM concepts
      WHERE ${clauses.join(' AND ')}
    `,
    params,
  );
}

function fetchVersionRows(db, runNamespace) {
  return queryAll(
    db,
    `
      SELECT
        cv.version_id AS id,
        c.namespace,
        c.canonical_name,
        cv.version_no,
        cv.decision,
        cv.hypothesis,
        cv.notes,
        cv.created_at AS timestamp
      FROM concept_versions cv
      JOIN concepts c ON c.concept_id = cv.concept_id
      WHERE c.namespace = $runNamespace OR c.namespace = 'global'
    `,
    { runNamespace },
  );
}

function fetchCalibrationPlaytests(db, runNamespace) {
  return queryAll(
    db,
    `
      SELECT
        p.playtest_id AS id,
        c.namespace,
        c.canonical_name,
        p.strategy_mode,
        p.blind_pattern,
        p.report_summary,
        p.created_at AS timestamp
      FROM playtests p
      JOIN concept_versions cv ON cv.version_id = p.version_id
      JOIN concepts c ON c.concept_id = cv.concept_id
      WHERE c.namespace = $runNamespace OR c.namespace = 'global'
      ORDER BY datetime(p.created_at) DESC
      LIMIT 12
    `,
    { runNamespace },
  );
}

function summarizeBrief(role, selections) {
  if (role === 'designer') {
    return `Designer brief with ${selections.length} ranked memory items: principles, anti-patterns, comparable concepts, and blind spots.`;
  }
  if (role === 'engineer') {
    return `Engineer brief with ${selections.length} ranked memory items plus metric thresholds and implementation warnings.`;
  }
  return `Playtester packet with blind protocol and ${selections.length} optional calibration examples.`;
}

function rankAndLimit(db, runNamespace, taskTags, sourceType, rows, limit) {
  return rows
    .map((row) => {
      const score = rankingScore(db, runNamespace, taskTags, sourceType, row);
      if (score === null) return null;
      return { row, score, sourceType };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

function createBriefSelection(db, role, runNamespace, taskTags) {
  if (role === 'designer') {
    const selected = [
      ...rankAndLimit(
        db,
        runNamespace,
        taskTags,
        'principle',
        fetchPrincipleRows(db, runNamespace, { statuses: ['validated', 'emerging'], types: ['principle'] }),
        4,
      ),
      ...rankAndLimit(
        db,
        runNamespace,
        taskTags,
        'principle',
        fetchPrincipleRows(db, runNamespace, { types: ['anti_pattern'] }),
        3,
      ),
      ...rankAndLimit(
        db,
        runNamespace,
        taskTags,
        'concept',
        fetchConceptRows(db, runNamespace, ['kill', 'killed']),
        2,
      ),
      ...rankAndLimit(
        db,
        runNamespace,
        taskTags,
        'concept',
        fetchConceptRows(db, runNamespace, ['keep', 'kept', 'frozen']),
        2,
      ),
      ...rankAndLimit(
        db,
        runNamespace,
        taskTags,
        'principle',
        fetchPrincipleRows(db, runNamespace, { types: ['open_question', 'procedure'] }),
        1,
      ),
    ];

    return selected.slice(0, ROLE_BUDGETS.designer.max);
  }

  if (role === 'engineer') {
    const selected = [
      ...rankAndLimit(db, runNamespace, taskTags, 'version', fetchVersionRows(db, runNamespace), 2),
      ...rankAndLimit(
        db,
        runNamespace,
        taskTags,
        'principle',
        fetchPrincipleRows(db, runNamespace, { types: ['procedure'] }),
        3,
      ),
      ...rankAndLimit(
        db,
        runNamespace,
        taskTags,
        'principle',
        fetchPrincipleRows(db, runNamespace, { types: ['anti_pattern'] }),
        2,
      ),
      ...rankAndLimit(
        db,
        runNamespace,
        taskTags,
        'principle',
        fetchPrincipleRows(db, runNamespace, { types: ['principle'], statuses: ['validated', 'emerging', 'candidate'] }),
        2,
      ),
    ];

    return selected.slice(0, ROLE_BUDGETS.engineer.max);
  }

  return rankAndLimit(db, runNamespace, taskTags, 'playtest', fetchCalibrationPlaytests(db, runNamespace), 1).slice(
    0,
    ROLE_BUDGETS.playtester.max,
  );
}

function syncConceptFromDecision(db, versionId, decision) {
  if (!decision) return;
  const version = queryGet(
    db,
    `
      SELECT version_id, concept_id
      FROM concept_versions
      WHERE version_id = $versionId
    `,
    { versionId },
  );
  if (!version) return;

  execute(
    db,
    `
      UPDATE concepts
      SET
        current_status = $decision,
        best_version_id = CASE
          WHEN LOWER($decision) IN ('keep', 'kept', 'validated', 'frozen') THEN $versionId
          ELSE best_version_id
        END
      WHERE concept_id = $conceptId
    `,
    {
      conceptId: version.concept_id,
      decision: String(decision).toLowerCase(),
      versionId,
    },
  );
}

export function initializeMemorySystem({ dbPath = DEFAULT_DB_PATH } = {}) {
  const db = openDb(dbPath);
  try {
    db.exec(SCHEMA_SQL);
    ensureMetricDefinitions(db);
    return { dbPath };
  } finally {
    db.close();
  }
}

export function createRun(db, input) {
  requireFields(input, ['namespace', 'loopType', 'status']);
  const runId = input.runId || randomUUID();
  execute(
    db,
    `
      INSERT INTO runs (run_id, namespace, loop_type, started_at, ended_at, status, summary)
      VALUES ($runId, $namespace, $loopType, $startedAt, $endedAt, $status, $summary)
    `,
    {
      runId,
      namespace: input.namespace,
      loopType: input.loopType,
      startedAt: input.startedAt || nowIso(),
      endedAt: input.endedAt || null,
      status: input.status,
      summary: input.summary || null,
    },
  );
  return queryGet(db, 'SELECT * FROM runs WHERE run_id = $runId', { runId });
}

export function finishRun(db, input) {
  requireFields(input, ['runId', 'status']);
  execute(
    db,
    `
      UPDATE runs
      SET ended_at = $endedAt, status = $status, summary = COALESCE($summary, summary)
      WHERE run_id = $runId
    `,
    {
      runId: input.runId,
      endedAt: input.endedAt || nowIso(),
      status: input.status,
      summary: input.summary || null,
    },
  );
  return queryGet(db, 'SELECT * FROM runs WHERE run_id = $runId', { runId: input.runId });
}

export function upsertConcept(db, input) {
  requireFields(input, ['namespace', 'canonicalName', 'currentStatus']);
  const conceptId = input.conceptId || randomUUID();
  const existing = queryGet(db, 'SELECT concept_id FROM concepts WHERE concept_id = $conceptId', { conceptId });

  if (existing) {
    execute(
      db,
      `
        UPDATE concepts
        SET
          namespace = $namespace,
          parent_concept_id = $parentConceptId,
          canonical_name = $canonicalName,
          current_status = $currentStatus,
          summary = $summary,
          best_version_id = COALESCE($bestVersionId, best_version_id)
        WHERE concept_id = $conceptId
      `,
      {
        conceptId,
        namespace: input.namespace,
        parentConceptId: input.parentConceptId || null,
        canonicalName: input.canonicalName,
        currentStatus: String(input.currentStatus).toLowerCase(),
        summary: input.summary || null,
        bestVersionId: input.bestVersionId || null,
      },
    );
  } else {
    execute(
      db,
      `
        INSERT INTO concepts (
          concept_id,
          namespace,
          parent_concept_id,
          canonical_name,
          current_status,
          summary,
          best_version_id,
          created_at
        )
        VALUES (
          $conceptId,
          $namespace,
          $parentConceptId,
          $canonicalName,
          $currentStatus,
          $summary,
          $bestVersionId,
          $createdAt
        )
      `,
      {
        conceptId,
        namespace: input.namespace,
        parentConceptId: input.parentConceptId || null,
        canonicalName: input.canonicalName,
        currentStatus: String(input.currentStatus).toLowerCase(),
        summary: input.summary || null,
        bestVersionId: input.bestVersionId || null,
        createdAt: input.createdAt || nowIso(),
      },
    );
  }

  if (input.tags) {
    const tagIds = upsertTags(db, input.namespace, input.tags);
    replaceLinks(db, 'concept_tags', 'concept_id', conceptId, tagIds);
  }

  return queryGet(db, 'SELECT * FROM concepts WHERE concept_id = $conceptId', { conceptId });
}

export function createConceptVersion(db, input) {
  requireFields(input, ['conceptId', 'runId']);
  const versionId = input.versionId || randomUUID();
  const row = queryGet(db, 'SELECT MAX(version_no) AS max_version_no FROM concept_versions WHERE concept_id = $conceptId', {
    conceptId: input.conceptId,
  });
  const versionNo = input.versionNo ?? (Number(row?.max_version_no || 0) + 1);

  execute(
    db,
    `
      INSERT INTO concept_versions (
        version_id,
        concept_id,
        run_id,
        parent_version_id,
        version_no,
        hypothesis,
        decision,
        notes,
        created_at
      )
      VALUES (
        $versionId,
        $conceptId,
        $runId,
        $parentVersionId,
        $versionNo,
        $hypothesis,
        $decision,
        $notes,
        $createdAt
      )
    `,
    {
      versionId,
      conceptId: input.conceptId,
      runId: input.runId,
      parentVersionId: input.parentVersionId || null,
      versionNo,
      hypothesis: input.hypothesis || null,
      decision: input.decision ? String(input.decision).toLowerCase() : null,
      notes: input.notes || null,
      createdAt: input.createdAt || nowIso(),
    },
  );

  const namespace = getRunNamespace(db, input.runId);
  if (input.tags) {
    const tagIds = upsertTags(db, namespace, input.tags);
    replaceLinks(db, 'version_tags', 'version_id', versionId, tagIds);
  }
  syncConceptFromDecision(db, versionId, input.decision);

  return queryGet(db, 'SELECT * FROM concept_versions WHERE version_id = $versionId', { versionId });
}

export function recordDecision(db, input) {
  requireFields(input, ['versionId', 'decision']);
  execute(
    db,
    `
      UPDATE concept_versions
      SET decision = $decision, notes = COALESCE($notes, notes)
      WHERE version_id = $versionId
    `,
    {
      versionId: input.versionId,
      decision: String(input.decision).toLowerCase(),
      notes: input.notes || null,
    },
  );
  syncConceptFromDecision(db, input.versionId, input.decision);
  return queryGet(db, 'SELECT * FROM concept_versions WHERE version_id = $versionId', { versionId: input.versionId });
}

export function createScorecard(db, input) {
  requireFields(input, ['versionId', 'kind', 'authorRole']);
  const scorecardId = input.scorecardId || randomUUID();

  execute(
    db,
    `
      INSERT INTO scorecards (scorecard_id, version_id, kind, author_role, created_at, summary)
      VALUES ($scorecardId, $versionId, $kind, $authorRole, $createdAt, $summary)
    `,
    {
      scorecardId,
      versionId: input.versionId,
      kind: input.kind,
      authorRole: input.authorRole,
      createdAt: input.createdAt || nowIso(),
      summary: input.summary || null,
    },
  );

  for (const metric of toArray(input.metrics)) {
    requireFields(metric, ['metricKey', 'value']);
    execute(
      db,
      `
        INSERT OR REPLACE INTO metric_values (scorecard_id, metric_key, value, rationale)
        VALUES ($scorecardId, $metricKey, $value, $rationale)
      `,
      {
        scorecardId,
        metricKey: metric.metricKey,
        value: Number(metric.value),
        rationale: metric.rationale || null,
      },
    );
  }

  return {
    ...queryGet(db, 'SELECT * FROM scorecards WHERE scorecard_id = $scorecardId', { scorecardId }),
    metrics: queryAll(
      db,
      `
        SELECT metric_key AS metricKey, value, rationale
        FROM metric_values
        WHERE scorecard_id = $scorecardId
        ORDER BY metric_key
      `,
      { scorecardId },
    ),
  };
}

export function createPlaytest(db, input) {
  requireFields(input, ['versionId', 'testerRole', 'strategyMode']);
  const playtestId = input.playtestId || randomUUID();
  execute(
    db,
    `
      INSERT INTO playtests (
        playtest_id,
        version_id,
        tester_role,
        strategy_mode,
        blind_pattern,
        verdict,
        report_summary,
        created_at
      )
      VALUES (
        $playtestId,
        $versionId,
        $testerRole,
        $strategyMode,
        $blindPattern,
        $verdict,
        $reportSummary,
        $createdAt
      )
    `,
    {
      playtestId,
      versionId: input.versionId,
      testerRole: input.testerRole,
      strategyMode: input.strategyMode,
      blindPattern: input.blindPattern || null,
      verdict: input.verdict || null,
      reportSummary: input.reportSummary || null,
      createdAt: input.createdAt || nowIso(),
    },
  );
  return queryGet(db, 'SELECT * FROM playtests WHERE playtest_id = $playtestId', { playtestId });
}

export function reportBug(db, input) {
  requireFields(input, [
    'versionId',
    'title',
    'severity',
    'reproductionSteps',
    'expectedBehavior',
    'actualBehavior',
  ]);
  const bugId = input.bugId || randomUUID();
  execute(
    db,
    `
      INSERT INTO bugs (
        bug_id,
        version_id,
        playtest_id,
        title,
        severity,
        reproduction_steps,
        expected_behavior,
        actual_behavior,
        blocking,
        status,
        created_at,
        closed_at,
        notes
      )
      VALUES (
        $bugId,
        $versionId,
        $playtestId,
        $title,
        $severity,
        $reproductionSteps,
        $expectedBehavior,
        $actualBehavior,
        $blocking,
        $status,
        $createdAt,
        NULL,
        $notes
      )
    `,
    {
      bugId,
      versionId: input.versionId,
      playtestId: input.playtestId || null,
      title: input.title,
      severity: String(input.severity).toLowerCase(),
      reproductionSteps: input.reproductionSteps,
      expectedBehavior: input.expectedBehavior,
      actualBehavior: input.actualBehavior,
      blocking: input.blocking === false ? 0 : 1,
      status: input.status || 'open',
      createdAt: input.createdAt || nowIso(),
      notes: input.notes || null,
    },
  );
  return queryGet(db, 'SELECT * FROM bugs WHERE bug_id = $bugId', { bugId });
}

export function recordBugfix(db, input) {
  requireFields(input, ['bugId', 'engineerRole', 'summary']);
  const bug = queryGet(db, 'SELECT * FROM bugs WHERE bug_id = $bugId', { bugId: input.bugId });
  if (!bug) throw new Error(`Unknown bugId: ${input.bugId}`);

  const fixPassId = input.fixPassId || randomUUID();
  execute(
    db,
    `
      INSERT INTO bug_fix_passes (
        fix_pass_id,
        bug_id,
        engineer_role,
        summary,
        git_commit,
        created_at
      )
      VALUES (
        $fixPassId,
        $bugId,
        $engineerRole,
        $summary,
        $gitCommit,
        $createdAt
      )
    `,
    {
      fixPassId,
      bugId: input.bugId,
      engineerRole: input.engineerRole,
      summary: input.summary,
      gitCommit: input.gitCommit || null,
      createdAt: input.createdAt || nowIso(),
    },
  );

  execute(
    db,
    `
      UPDATE bugs
      SET
        status = 'fixed_pending_qa',
        closed_at = NULL,
        notes = CASE
          WHEN $notes IS NULL THEN notes
          WHEN notes IS NULL OR notes = '' THEN $notes
          ELSE notes || char(10) || $notes
        END
      WHERE bug_id = $bugId
    `,
    {
      bugId: input.bugId,
      notes: input.notes || null,
    },
  );

  return getBugDetails(db, input.bugId);
}

export function recordQaRetest(db, input) {
  requireFields(input, ['bugId', 'testerRole', 'status']);
  const bug = queryGet(db, 'SELECT * FROM bugs WHERE bug_id = $bugId', { bugId: input.bugId });
  if (!bug) throw new Error(`Unknown bugId: ${input.bugId}`);

  const retestId = input.retestId || randomUUID();
  const normalizedStatus = String(input.status).toLowerCase();
  execute(
    db,
    `
      INSERT INTO qa_retest_results (
        retest_id,
        bug_id,
        playtest_id,
        tester_role,
        status,
        notes,
        created_at
      )
      VALUES (
        $retestId,
        $bugId,
        $playtestId,
        $testerRole,
        $status,
        $notes,
        $createdAt
      )
    `,
    {
      retestId,
      bugId: input.bugId,
      playtestId: input.playtestId || null,
      testerRole: input.testerRole,
      status: normalizedStatus,
      notes: input.notes || null,
      createdAt: input.createdAt || nowIso(),
    },
  );

  const bugStatus = normalizedStatus === 'fixed' ? 'fixed_verified' : bug.status === 'wontfix' ? 'wontfix' : 'open';
  const closedAt = normalizedStatus === 'fixed' ? input.createdAt || nowIso() : null;
  execute(
    db,
    `
      UPDATE bugs
      SET
        status = $bugStatus,
        closed_at = $closedAt,
        notes = CASE
          WHEN $notes IS NULL THEN notes
          WHEN notes IS NULL OR notes = '' THEN $notes
          ELSE notes || char(10) || $notes
        END
      WHERE bug_id = $bugId
    `,
    {
      bugId: input.bugId,
      bugStatus,
      closedAt,
      notes: input.notes || null,
    },
  );

  return getBugDetails(db, input.bugId);
}

export function createArtifact(db, input) {
  requireFields(input, ['versionId', 'artifactType', 'filePath']);
  const artifactId = input.artifactId || randomUUID();
  execute(
    db,
    `
      INSERT INTO artifacts (
        artifact_id,
        version_id,
        artifact_type,
        file_path,
        git_commit,
        created_at
      )
      VALUES (
        $artifactId,
        $versionId,
        $artifactType,
        $filePath,
        $gitCommit,
        $createdAt
      )
    `,
    {
      artifactId,
      versionId: input.versionId,
      artifactType: input.artifactType,
      filePath: input.filePath,
      gitCommit: input.gitCommit || null,
      createdAt: input.createdAt || nowIso(),
    },
  );
  return queryGet(db, 'SELECT * FROM artifacts WHERE artifact_id = $artifactId', { artifactId });
}

export function getBugDetails(db, bugId) {
  const bug = queryGet(db, 'SELECT * FROM bugs WHERE bug_id = $bugId', { bugId });
  if (!bug) return null;
  return {
    ...bug,
    fixPasses: queryAll(
      db,
      `
        SELECT *
        FROM bug_fix_passes
        WHERE bug_id = $bugId
        ORDER BY datetime(created_at) DESC
      `,
      { bugId },
    ),
    qaRetests: queryAll(
      db,
      `
        SELECT *
        FROM qa_retest_results
        WHERE bug_id = $bugId
        ORDER BY datetime(created_at) DESC
      `,
      { bugId },
    ),
  };
}

export function listBugs(db, filter = {}) {
  const params = {};
  const clauses = ['1 = 1'];
  if (filter.versionId) {
    params.versionId = filter.versionId;
    clauses.push('version_id = $versionId');
  }
  if (filter.status) {
    params.status = filter.status;
    clauses.push('status = $status');
  }
  if (filter.blockingOnly) {
    clauses.push('blocking = 1');
  }

  return queryAll(
    db,
    `
      SELECT *
      FROM bugs
      WHERE ${clauses.join(' AND ')}
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        datetime(created_at) DESC
    `,
    params,
  );
}

export function upsertPrinciple(db, input) {
  requireFields(input, ['namespace', 'title', 'principleType', 'statement']);
  if (!input.tags || input.tags.length === 0) {
    throw new Error('Principles require at least one scope tag.');
  }

  const slug = input.slug || slugify(input.title);
  const existing = input.principleId
    ? queryGet(db, 'SELECT principle_id, last_validated_at FROM principles WHERE principle_id = $principleId', {
        principleId: input.principleId,
      })
    : queryGet(db, 'SELECT principle_id, last_validated_at FROM principles WHERE slug = $slug', { slug });

  const principleId = existing?.principle_id || input.principleId || randomUUID();
  const status = input.status || 'candidate';
  const confidence = input.confidence ?? 0.3;

  if (existing) {
    execute(
      db,
      `
        UPDATE principles
        SET
          namespace = $namespace,
          slug = $slug,
          title = $title,
          principle_type = $principleType,
          statement = $statement,
          why_it_matters = $whyItMatters,
          status = $status,
          confidence = $confidence,
          created_run_id = COALESCE($createdRunId, created_run_id),
          created_version_id = COALESCE($createdVersionId, created_version_id),
          retrieval_enabled = $retrievalEnabled,
          retrieval_priority = COALESCE($retrievalPriority, retrieval_priority),
          notes = $notes
        WHERE principle_id = $principleId
      `,
      {
        principleId,
        namespace: input.namespace,
        slug,
        title: input.title,
        principleType: input.principleType,
        statement: input.statement,
        whyItMatters: input.whyItMatters || null,
        status,
        confidence,
        createdRunId: input.createdRunId || null,
        createdVersionId: input.createdVersionId || null,
        retrievalEnabled: input.retrievalEnabled === false ? 0 : 1,
        retrievalPriority: input.retrievalPriority ?? null,
        notes: input.notes || null,
      },
    );
  } else {
    execute(
      db,
      `
        INSERT INTO principles (
          principle_id,
          namespace,
          slug,
          title,
          principle_type,
          statement,
          why_it_matters,
          status,
          confidence,
          created_run_id,
          created_version_id,
          retrieval_enabled,
          retrieval_priority,
          notes
        )
        VALUES (
          $principleId,
          $namespace,
          $slug,
          $title,
          $principleType,
          $statement,
          $whyItMatters,
          $status,
          $confidence,
          $createdRunId,
          $createdVersionId,
          $retrievalEnabled,
          $retrievalPriority,
          $notes
        )
      `,
      {
        principleId,
        namespace: input.namespace,
        slug,
        title: input.title,
        principleType: input.principleType,
        statement: input.statement,
        whyItMatters: input.whyItMatters || null,
        status,
        confidence,
        createdRunId: input.createdRunId || null,
        createdVersionId: input.createdVersionId || null,
        retrievalEnabled: input.retrievalEnabled === false ? 0 : 1,
        retrievalPriority: input.retrievalPriority ?? 0,
        notes: input.notes || null,
      },
    );
  }

  const tagIds = upsertTags(db, input.namespace, input.tags);
  replaceLinks(db, 'principle_tags', 'principle_id', principleId, tagIds);
  return queryGet(db, 'SELECT * FROM principles WHERE principle_id = $principleId', { principleId });
}

export function addPrincipleEvidence(db, input) {
  requireFields(input, ['principleId', 'versionId', 'relationType', 'weight', 'effectSize', 'scopeMatch']);
  execute(
    db,
    `
      INSERT OR REPLACE INTO principle_evidence (
        principle_id,
        version_id,
        relation_type,
        weight,
        effect_size,
        scope_match,
        created_at,
        note
      )
      VALUES (
        $principleId,
        $versionId,
        $relationType,
        $weight,
        $effectSize,
        $scopeMatch,
        $createdAt,
        $note
      )
    `,
    {
      principleId: input.principleId,
      versionId: input.versionId,
      relationType: input.relationType,
      weight: Number(input.weight),
      effectSize: clamp(0, 1, Number(input.effectSize)),
      scopeMatch: clamp(0, 1, Number(input.scopeMatch)),
      createdAt: input.createdAt || nowIso(),
      note: input.note || null,
    },
  );
  return queryGet(
    db,
    `
      SELECT *
      FROM principle_evidence
      WHERE principle_id = $principleId
        AND version_id = $versionId
        AND relation_type = $relationType
    `,
    {
      principleId: input.principleId,
      versionId: input.versionId,
      relationType: input.relationType,
    },
  );
}

export function recomputeBeliefs(db, { namespace } = {}) {
  const params = {};
  const namespaceClause = namespace ? 'WHERE namespace = $namespace' : '';
  if (namespace) params.namespace = namespace;

  const principles = queryAll(
    db,
    `
      SELECT principle_id, namespace, status, confidence, last_validated_at
      FROM principles
      ${namespaceClause}
    `,
    params,
  );

  const updated = [];

  for (const principle of principles) {
    const evidenceRows = queryAll(
      db,
      `
        SELECT
          pe.relation_type,
          pe.weight,
          pe.effect_size,
          pe.scope_match,
          pe.created_at,
          cv.run_id,
          cv.concept_id
        FROM principle_evidence pe
        JOIN concept_versions cv ON cv.version_id = pe.version_id
        WHERE pe.principle_id = $principleId
      `,
      { principleId: principle.principle_id },
    );

    const supportStrength = evidenceRows
      .filter((row) => row.relation_type === 'support')
      .reduce((sum, row) => sum + row.weight * row.scope_match * (0.5 + 0.5 * row.effect_size), 0);

    const contradictStrength = evidenceRows
      .filter((row) => row.relation_type === 'contradict')
      .reduce((sum, row) => sum + row.weight * row.scope_match * (0.5 + 0.5 * row.effect_size), 0);

    const supportCount = evidenceRows.filter((row) => row.relation_type === 'support').length;
    const contradictCount = evidenceRows.filter((row) => row.relation_type === 'contradict').length;
    const distinctConcepts = unique(
      evidenceRows
        .filter((row) => row.relation_type === 'support' || row.relation_type === 'contradict')
        .map((row) => row.concept_id),
    ).length;
    const distinctRuns = unique(
      evidenceRows
        .filter((row) => row.relation_type === 'support' || row.relation_type === 'contradict')
        .map((row) => row.run_id),
    ).length;
    const effectRows = evidenceRows.filter((row) => row.relation_type === 'support' || row.relation_type === 'contradict');
    const avgEffectSize = effectRows.length
      ? effectRows.reduce((sum, row) => sum + row.effect_size, 0) / effectRows.length
      : 0;

    const lastSupportedAt =
      evidenceRows
        .filter((row) => row.relation_type === 'support')
        .map((row) => row.created_at)
        .sort()
        .at(-1) || null;

    const lastContradictedAt =
      evidenceRows
        .filter((row) => row.relation_type === 'contradict')
        .map((row) => row.created_at)
        .sort()
        .at(-1) || null;

    const runCount = queryGet(
      db,
      `
        SELECT COUNT(*) AS count
        FROM runs
        WHERE namespace = $namespace
          AND ($lastSupportedAt IS NULL OR datetime(started_at) > datetime($lastSupportedAt))
      `,
      {
        namespace: principle.namespace,
        lastSupportedAt,
      },
    ).count;

    const runsSinceLastSupport = Number(runCount || 0);
    const staleRunBlocks = Math.floor(runsSinceLastSupport / 3);

    const diversityBonus =
      Math.min(0.15, 0.05 * Math.max(0, distinctConcepts - 1)) +
      Math.min(0.1, 0.03 * Math.max(0, distinctRuns - 1));

    const recencyBonus = Math.max(0, 0.1 - 0.01 * runsSinceLastSupport);
    const stalenessPenalty = 0.02 * staleRunBlocks;

    const confidence = clamp(
      0.05,
      0.95,
      0.3 +
        0.18 * supportStrength -
        0.22 * contradictStrength +
        diversityBonus +
        recencyBonus -
        stalenessPenalty,
    );

    let status = 'candidate';
    if (confidence >= 0.65 && supportCount >= 3 && distinctConcepts >= 2) {
      status = 'validated';
    } else if (confidence >= 0.45) {
      status = 'emerging';
    }

    if (contradictStrength > 0 && (supportStrength === 0 || contradictStrength >= 0.6 * supportStrength)) {
      status = 'contested';
    }

    if (contradictStrength > supportStrength && confidence < 0.45 && runsSinceLastSupport >= 3) {
      status = 'deprecated';
    }

    const lastValidatedAt = status === 'validated' ? nowIso() : principle.last_validated_at || null;
    const retrievalPriority = clamp(0, 1, confidence + supportCount * 0.03 - contradictCount * 0.05);

    execute(
      db,
      `
        UPDATE principles
        SET
          status = $status,
          confidence = $confidence,
          last_supported_at = $lastSupportedAt,
          last_contradicted_at = $lastContradictedAt,
          last_validated_at = $lastValidatedAt,
          retrieval_priority = $retrievalPriority,
          support_count = $supportCount,
          contradict_count = $contradictCount,
          distinct_concepts = $distinctConcepts,
          distinct_runs = $distinctRuns,
          avg_effect_size = $avgEffectSize
        WHERE principle_id = $principleId
      `,
      {
        principleId: principle.principle_id,
        status,
        confidence,
        lastSupportedAt,
        lastContradictedAt,
        lastValidatedAt,
        retrievalPriority,
        supportCount,
        contradictCount,
        distinctConcepts,
        distinctRuns,
        avgEffectSize,
      },
    );

    updated.push({
      principleId: principle.principle_id,
      status,
      confidence,
      supportCount,
      contradictCount,
      distinctConcepts,
      distinctRuns,
      avgEffectSize,
    });
  }

  return updated;
}

export function createRetrievalBrief(db, input) {
  requireFields(input, ['runId', 'role', 'task']);
  if (!ROLE_BUDGETS[input.role]) {
    throw new Error(`Unknown role for retrieval brief: ${input.role}`);
  }
  const runNamespace = input.namespace || getRunNamespace(db, input.runId);
  const taskTags = unique(toArray(input.tags));
  const briefId = input.briefId || randomUUID();
  const selections = createBriefSelection(db, input.role, runNamespace, taskTags);

  execute(
    db,
    `
      INSERT INTO retrieval_briefs (brief_id, run_id, role, task, created_at, summary)
      VALUES ($briefId, $runId, $role, $task, $createdAt, $summary)
    `,
    {
      briefId,
      runId: input.runId,
      role: input.role,
      task: input.task,
      createdAt: input.createdAt || nowIso(),
      summary: summarizeBrief(input.role, selections),
    },
  );

  for (const selection of selections) {
    execute(
      db,
      `
        INSERT INTO retrieval_items (item_id, brief_id, source_type, source_id, rank_score, usefulness_feedback)
        VALUES ($itemId, $briefId, $sourceType, $sourceId, $rankScore, 'unknown')
      `,
      {
        itemId: randomUUID(),
        briefId,
        sourceType: selection.sourceType,
        sourceId: selection.row.id,
        rankScore: selection.score,
      },
    );
  }

  return getBriefDetails(db, briefId);
}

export function auditRetrievalBrief(db, input) {
  requireFields(input, ['briefId', 'feedback']);

  for (const feedback of input.feedback) {
    if (feedback.itemId) {
      execute(
        db,
        `
          UPDATE retrieval_items
          SET usefulness_feedback = $usefulnessFeedback
          WHERE brief_id = $briefId
            AND item_id = $itemId
        `,
        {
          briefId: input.briefId,
          itemId: feedback.itemId,
          usefulnessFeedback: feedback.usefulnessFeedback,
        },
      );
      continue;
    }

    execute(
      db,
      `
        UPDATE retrieval_items
        SET usefulness_feedback = $usefulnessFeedback
        WHERE brief_id = $briefId
          AND source_type = $sourceType
          AND source_id = $sourceId
      `,
      {
        briefId: input.briefId,
        sourceType: feedback.sourceType,
        sourceId: feedback.sourceId,
        usefulnessFeedback: feedback.usefulnessFeedback,
      },
    );
  }

  return getBriefDetails(db, input.briefId);
}

function sourceRecordForItem(db, item) {
  if (item.source_type === 'principle') {
    return queryGet(
      db,
      `
        SELECT
          principle_id AS id,
          namespace,
          title,
          statement,
          why_it_matters,
          status,
          confidence,
          principle_type
        FROM principles
        WHERE principle_id = $id
      `,
      { id: item.source_id },
    );
  }

  if (item.source_type === 'concept') {
    return queryGet(
      db,
      `
        SELECT
          concept_id AS id,
          namespace,
          canonical_name,
          current_status,
          summary
        FROM concepts
        WHERE concept_id = $id
      `,
      { id: item.source_id },
    );
  }

  if (item.source_type === 'version') {
    return queryGet(
      db,
      `
        SELECT
          cv.version_id AS id,
          c.namespace,
          c.canonical_name,
          cv.version_no,
          cv.hypothesis,
          cv.decision,
          cv.notes
        FROM concept_versions cv
        JOIN concepts c ON c.concept_id = cv.concept_id
        WHERE cv.version_id = $id
      `,
      { id: item.source_id },
    );
  }

  if (item.source_type === 'artifact') {
    return queryGet(
      db,
      `
        SELECT
          artifact_id AS id,
          artifact_type,
          file_path,
          git_commit
        FROM artifacts
        WHERE artifact_id = $id
      `,
      { id: item.source_id },
    );
  }

  return queryGet(
    db,
    `
      SELECT
        p.playtest_id AS id,
        c.namespace,
        c.canonical_name,
        p.strategy_mode,
        p.blind_pattern,
        p.verdict,
        p.report_summary
      FROM playtests p
      JOIN concept_versions cv ON cv.version_id = p.version_id
      JOIN concepts c ON c.concept_id = cv.concept_id
      WHERE p.playtest_id = $id
    `,
    { id: item.source_id },
  );
}

export function getBriefDetails(db, briefId) {
  const brief = queryGet(db, 'SELECT * FROM retrieval_briefs WHERE brief_id = $briefId', { briefId });
  if (!brief) return null;

  const items = queryAll(
    db,
    `
      SELECT *
      FROM retrieval_items
      WHERE brief_id = $briefId
      ORDER BY rank_score DESC, rowid ASC
    `,
    { briefId },
  ).map((item) => ({
    ...item,
    source: sourceRecordForItem(db, item),
    tags: getEntityTags(db, item.source_type, item.source_id),
  }));

  return {
    ...brief,
    items,
    thresholds: brief.role === 'engineer' ? ENGINEER_THRESHOLD_LINES : [],
  };
}

export function getLatestBriefByRole(db, role) {
  const row = queryGet(
    db,
    `
      SELECT brief_id
      FROM retrieval_briefs
      WHERE role = $role
      ORDER BY datetime(created_at) DESC
      LIMIT 1
    `,
    { role },
  );
  return row ? getBriefDetails(db, row.brief_id) : null;
}

export function getLatestRun(db, runId = null) {
  const row = runId
    ? queryGet(db, 'SELECT * FROM runs WHERE run_id = $runId', { runId })
    : queryGet(
        db,
        `
          SELECT *
          FROM runs
          ORDER BY datetime(started_at) DESC
          LIMIT 1
        `,
      );

  if (!row) return null;

  const versions = queryAll(
    db,
    `
      SELECT
        cv.version_id,
        cv.version_no,
        cv.hypothesis,
        cv.decision,
        cv.notes,
        c.canonical_name,
        c.current_status
      FROM concept_versions cv
      JOIN concepts c ON c.concept_id = cv.concept_id
      WHERE cv.run_id = $runId
      ORDER BY c.canonical_name, cv.version_no
    `,
    { runId: row.run_id },
  );

  const scorecardCount = queryGet(
    db,
    'SELECT COUNT(*) AS count FROM scorecards sc JOIN concept_versions cv ON cv.version_id = sc.version_id WHERE cv.run_id = $runId',
    { runId: row.run_id },
  ).count;
  const playtestCount = queryGet(
    db,
    'SELECT COUNT(*) AS count FROM playtests p JOIN concept_versions cv ON cv.version_id = p.version_id WHERE cv.run_id = $runId',
    { runId: row.run_id },
  ).count;
  const principleCount = queryGet(
    db,
    'SELECT COUNT(*) AS count FROM principles WHERE created_run_id = $runId',
    { runId: row.run_id },
  ).count;
  const bugCount = queryGet(
    db,
    'SELECT COUNT(*) AS count FROM bugs b JOIN concept_versions cv ON cv.version_id = b.version_id WHERE cv.run_id = $runId',
    { runId: row.run_id },
  ).count;
  const openBugCount = queryGet(
    db,
    `SELECT COUNT(*) AS count
     FROM bugs b
     JOIN concept_versions cv ON cv.version_id = b.version_id
     WHERE cv.run_id = $runId
       AND b.status IN ('open', 'fixed_pending_qa')`,
    { runId: row.run_id },
  ).count;
  const blockingOpenBugCount = queryGet(
    db,
    `SELECT COUNT(*) AS count
     FROM bugs b
     JOIN concept_versions cv ON cv.version_id = b.version_id
     WHERE cv.run_id = $runId
       AND b.blocking = 1
       AND b.status IN ('open', 'fixed_pending_qa')`,
    { runId: row.run_id },
  ).count;
  const recentBugs = queryAll(
    db,
    `
      SELECT b.bug_id, b.title, b.severity, b.status, b.blocking, c.canonical_name, cv.version_no
      FROM bugs b
      JOIN concept_versions cv ON cv.version_id = b.version_id
      JOIN concepts c ON c.concept_id = cv.concept_id
      WHERE cv.run_id = $runId
      ORDER BY datetime(b.created_at) DESC
      LIMIT 10
    `,
    { runId: row.run_id },
  );

  return {
    ...row,
    versions,
    scorecardCount,
    playtestCount,
    principleCount,
    bugCount,
    openBugCount,
    blockingOpenBugCount,
    recentBugs,
  };
}

export function listPrinciples(db, filter = {}) {
  const params = {};
  const clauses = ['1 = 1'];
  if (filter.namespace) {
    params.namespace = filter.namespace;
    clauses.push('namespace = $namespace');
  }
  if (filter.principleType) {
    params.principleType = filter.principleType;
    clauses.push('principle_type = $principleType');
  }
  if (filter.excludeDeprecated) {
    clauses.push("status != 'deprecated'");
  }

  return queryAll(
    db,
    `
      SELECT *
      FROM principles
      WHERE ${clauses.join(' AND ')}
      ORDER BY
        CASE status
          WHEN 'validated' THEN 1
          WHEN 'emerging' THEN 2
          WHEN 'candidate' THEN 3
          WHEN 'contested' THEN 4
          ELSE 5
        END,
        confidence DESC,
        title ASC
    `,
    params,
  ).map((row) => ({
    ...row,
    tags: getEntityTags(db, 'principle', row.principle_id),
  }));
}

export function listOpenQuestionsAndWarnings(db) {
  return {
    openQuestions: listPrinciples(db, { principleType: 'open_question', excludeDeprecated: true }),
    contested: queryAll(
      db,
      `
        SELECT *
        FROM principles
        WHERE status = 'contested'
        ORDER BY confidence DESC, title ASC
      `,
    ).map((row) => ({
      ...row,
      tags: getEntityTags(db, 'principle', row.principle_id),
    })),
  };
}

export function recordCycle(db, payload) {
  return withTransaction(db, () => {
    let run = null;

    if (payload.runId) {
      run = queryGet(db, 'SELECT * FROM runs WHERE run_id = $runId', { runId: payload.runId });
      if (!run) {
        throw new Error(`Unknown runId for record-cycle: ${payload.runId}`);
      }
    } else if (payload.run) {
      run = createRun(db, payload.run);
    } else {
      run = createRun(db, {
        namespace: payload.namespace,
        loopType: payload.loopType || 'cycle',
        status: 'active',
        summary: payload.summary || null,
      });
    }

    const namespace = payload.namespace || run.namespace;
    const concept = payload.concept
      ? upsertConcept(db, {
          namespace,
          ...payload.concept,
        })
      : null;

    const version = payload.version
      ? createConceptVersion(db, {
          runId: run.run_id,
          conceptId: payload.version.conceptId || concept?.concept_id,
          ...payload.version,
        })
      : null;

    const predictedScorecard = payload.predictedScorecard
      ? createScorecard(db, {
          versionId: version.version_id,
          kind: 'predicted',
          ...payload.predictedScorecard,
        })
      : null;

    const actualScorecard = payload.actualScorecard
      ? createScorecard(db, {
          versionId: version.version_id,
          kind: 'actual',
          ...payload.actualScorecard,
        })
      : null;

    const playtests = toArray(payload.playtests).map((playtest) =>
      createPlaytest(db, { versionId: version.version_id, ...playtest }),
    );
    const bugs = toArray(payload.bugs).map((bug) =>
      reportBug(db, { versionId: version.version_id, ...bug }),
    );

    const artifacts = toArray(payload.artifacts).map((artifact) =>
      createArtifact(db, { versionId: version.version_id, ...artifact }),
    );
    const bugfixes = toArray(payload.bugfixes).map((bugfix) => recordBugfix(db, bugfix));
    const qaRetests = toArray(payload.qaRetests).map((retest) => recordQaRetest(db, retest));

    if (payload.decision) {
      recordDecision(db, { versionId: version.version_id, ...payload.decision });
    }

    const emittedPrinciples = [];
    for (const emission of toArray(payload.distillation?.emissions)) {
      const principle = upsertPrinciple(db, {
        namespace,
        createdRunId: run.run_id,
        createdVersionId: version?.version_id || emission.createdVersionId,
        ...emission,
      });
      emittedPrinciples.push(principle);

      for (const evidence of toArray(emission.evidence)) {
        addPrincipleEvidence(db, {
          principleId: principle.principle_id,
          versionId: evidence.versionId || version.version_id,
          ...evidence,
        });
      }
    }

    const beliefUpdates = payload.distillation ? recomputeBeliefs(db, { namespace }) : [];
    return {
      run,
      concept,
      version,
      predictedScorecard,
      actualScorecard,
      playtests,
      bugs,
      artifacts,
      bugfixes,
      qaRetests,
      emittedPrinciples,
      beliefUpdates,
    };
  });
}

export function withDatabase(dbPath, work) {
  const db = openDb(dbPath);
  try {
    return work(db);
  } finally {
    db.close();
  }
}
