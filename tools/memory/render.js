import fs from 'node:fs';

import {
  ENGINEER_THRESHOLD_LINES,
  KNOWN_MECHANIC_FAMILIES,
  LEETCODE_DIR,
  MARKDOWN_OUTPUTS,
  MEMORY_DIR,
  PLAYTEST_PROTOCOL,
  PLAYTEST_RUBRIC,
} from './config.js';
import {
  detectContradictions,
  getLatestBriefByRole,
  getLatestRun,
  listOpenQuestionsAndWarnings,
  listPrinciples,
  listPrinciplesWithEvidence,
  portfolioReview,
} from './service.js';

function heading(title) {
  return `# ${title}\n\n`;
}

function formatPrinciple(principle) {
  const tags = principle.tags?.length ? principle.tags.join(', ') : 'none';
  const why = principle.why_it_matters ? `- Why it matters: ${principle.why_it_matters}\n` : '';
  return `## ${principle.title}\n- Namespace: ${principle.namespace}\n- Type: ${principle.principle_type}\n- Status: ${principle.status}\n- Confidence: ${Number(principle.confidence).toFixed(2)}\n- Scope tags: ${tags}\n${why}- Statement: ${principle.statement}\n`;
}

function formatBriefItem(item) {
  if (item.source_type === 'principle') {
    return `## ${item.source.title}\n- Source: principle\n- Rank: ${item.rank_score.toFixed(2)}\n- Feedback: ${item.usefulness_feedback}\n- Status: ${item.source.status}\n- Confidence: ${Number(item.source.confidence).toFixed(2)}\n- Tags: ${item.tags.join(', ') || 'none'}\n- Statement: ${item.source.statement}\n`;
  }

  if (item.source_type === 'concept') {
    return `## ${item.source.canonical_name}\n- Source: concept\n- Rank: ${item.rank_score.toFixed(2)}\n- Feedback: ${item.usefulness_feedback}\n- Status: ${item.source.current_status}\n- Tags: ${item.tags.join(', ') || 'none'}\n- Summary: ${item.source.summary || 'No summary recorded.'}\n`;
  }

  if (item.source_type === 'version') {
    return `## ${item.source.canonical_name} v${item.source.version_no}\n- Source: version\n- Rank: ${item.rank_score.toFixed(2)}\n- Feedback: ${item.usefulness_feedback}\n- Decision: ${item.source.decision || 'pending'}\n- Tags: ${item.tags.join(', ') || 'none'}\n- Hypothesis: ${item.source.hypothesis || 'No hypothesis recorded.'}\n- Notes: ${item.source.notes || 'No notes recorded.'}\n`;
  }

  if (item.source_type === 'playtest') {
    return `## Calibration Example: ${item.source.canonical_name}\n- Source: playtest\n- Rank: ${item.rank_score.toFixed(2)}\n- Feedback: ${item.usefulness_feedback}\n- Strategy mode: ${item.source.strategy_mode}\n- Blind pattern: ${item.source.blind_pattern || 'Not recorded'}\n- Report summary: ${item.source.report_summary || 'No summary recorded.'}\n`;
  }

  return `## ${item.source_type}\n- Rank: ${item.rank_score.toFixed(2)}\n- Feedback: ${item.usefulness_feedback}\n`;
}

function renderBrief(brief, role) {
  if (!brief) {
    return heading(`${role} Brief`) + '_No retrieval brief has been generated yet._\n';
  }

  let output = heading(`${role} Brief`);
  output += `_Generated from the SQLite memory store on ${brief.created_at}._\n\n`;
  output += `Task: ${brief.task}\n\n`;
  output += `${brief.summary}\n\n`;

  if (brief.thresholds?.length) {
    output += '## Thresholds\n';
    for (const line of brief.thresholds) {
      output += `- ${line}\n`;
    }
    output += '\n';
  }

  if (!brief.items.length) {
    output += '_No ranked retrieval items were found for this brief._\n';
    return output;
  }

  for (const item of brief.items) {
    output += `${formatBriefItem(item)}\n`;
  }

  return output;
}

function renderLearnings(db) {
  const allPrinciples = listPrinciplesWithEvidence(db, { excludeDeprecated: true });
  const antiPatterns = allPrinciples.filter((p) => p.principle_type === 'anti_pattern');
  const patterns = allPrinciples.filter(
    (p) => p.principle_type === 'principle' || p.principle_type === 'procedure',
  );

  // Group by tag (algorithm topic)
  const topicMap = new Map();
  for (const principle of [...patterns, ...antiPatterns]) {
    for (const tag of principle.tags) {
      if (!topicMap.has(tag)) topicMap.set(tag, []);
      topicMap.get(tag).push(principle);
    }
    if (principle.tags.length === 0) {
      if (!topicMap.has('uncategorized')) topicMap.set('uncategorized', []);
      topicMap.get('uncategorized').push(principle);
    }
  }

  let md = `# Algorithm Game Design Learnings

This file is auto-generated from the SQLite memory store. Do not edit manually.
Run \`node tools/memory-cli.js render\` to regenerate.

> **Rule: Never add a learning without evidence. Never keep a learning that contradicts newer evidence.**

---

## How to Use This File

1. **Before designing**: Read the relevant section for the algorithm family you're targeting.
2. **After each cycle**: Learnings are auto-recorded via \`record-decision --learnings\` and rendered here.

---

## Proven Patterns

`;

  if (patterns.length === 0) {
    md += '_No proven patterns recorded yet._\n';
  } else {
    for (const p of patterns) {
      const evidenceList = p.evidence
        .map((e) => `${e.canonical_name} v${e.version_no}, ${e.decision || 'pending'}`)
        .join('; ');
      md += `- **${p.title}** (${p.status}, confidence ${Number(p.confidence).toFixed(2)}) — ${p.statement}`;
      if (evidenceList) md += ` (Evidence: ${evidenceList})`;
      md += '\n\n';
    }
  }

  md += `---

## Anti-Patterns

`;

  if (antiPatterns.length === 0) {
    md += '_No anti-patterns recorded yet._\n';
  } else {
    for (const p of antiPatterns) {
      const evidenceList = p.evidence
        .map((e) => `${e.canonical_name} v${e.version_no}, ${e.decision || 'pending'}`)
        .join('; ');
      md += `- **${p.title}** (${p.status}, confidence ${Number(p.confidence).toFixed(2)}) — ${p.statement}`;
      if (evidenceList) md += ` (Evidence: ${evidenceList})`;
      md += '\n\n';
    }
  }

  md += `---

## Algorithm-Specific Notes

`;

  if (topicMap.size === 0) {
    md += '_No topic-specific notes yet._\n';
  } else {
    for (const [topic, principles] of topicMap) {
      md += `### ${topic}\n`;
      for (const p of principles) {
        const typeLabel = p.principle_type === 'anti_pattern' ? 'AVOID' : 'USE';
        md += `- **[${typeLabel}]** ${p.title}: ${p.statement}`;
        if (p.why_it_matters) md += ` — _Why: ${p.why_it_matters}_`;
        md += '\n';
      }
      md += '\n';
    }
  }

  md += `---

## Changelog

_Generated from principle_evidence table. See memory/system.sqlite for full history._
`;

  return md;
}

function renderPortfolioReview(db, namespace = 'leetcode') {
  const report = portfolioReview(db, { namespace });

  let md = heading('Portfolio Review');
  md += '_Generated from the SQLite memory store. Read this BEFORE designing a new concept._\n\n';
  md += `- Namespace: ${report.namespace || namespace}\n`;
  md += `- Total kept versions: ${report.totalKept}\n`;
  md += `- Dominant mechanic: ${report.dominantFamily || 'none yet'}`;
  if (report.dominantFamily) {
    md += ` (${Math.round(report.concentrationRatio * 100)}% of keeps)`;
  }
  md += '\n\n';

  if (report.warnings.length) {
    md += '## ⚠ Warnings\n\n';
    for (const warning of report.warnings) {
      md += `- ${warning}\n`;
    }
    md += '\n';
  }

  md += '## Mechanic Family Distribution\n\n';
  if (report.families.length === 0) {
    md += '_No kept versions have mechanic:* tags yet. Backfill with `create-version --tags ["mechanic:<family>"]`._\n\n';
  } else {
    md += '| Family | Keeps | Share | Recent examples |\n';
    md += '|---|---|---|---|\n';
    for (const family of report.families) {
      const examples = family.examples
        .slice(0, 3)
        .map((e) => `${e.conceptName} v${e.versionNo}`)
        .join(', ');
      md += `| \`${family.family}\` | ${family.count} | ${Math.round(family.share * 100)}% | ${examples} |\n`;
    }
    md += '\n';
  }

  md += '## Diversity Constraint\n\n';
  md += 'Before accepting a new concept, check: ';
  md += 'is the proposed mechanic family in the last 2 keeps? ';
  md += 'If yes, the designer must either (a) pick a different family, or ';
  md += '(b) justify why repeating this mechanic teaches a genuinely different insight.\n\n';

  md += '## Known Mechanic Families\n\n';
  md += 'Use one of these as a `mechanic:<family>` tag, or invent a new slug:\n\n';
  for (const family of KNOWN_MECHANIC_FAMILIES) {
    md += `- \`mechanic:${family}\`\n`;
  }
  md += '\n';

  if (report.unknownFamilyVersions.length) {
    md += '## Untagged Keeps (needs backfill)\n\n';
    for (const row of report.unknownFamilyVersions) {
      md += `- ${row.conceptName} v${row.versionNo}\n`;
    }
    md += '\n';
  }

  return md;
}

function renderContradictions(db, namespace = 'leetcode') {
  const report = detectContradictions(db, { namespace });

  let md = heading('Contradictions & Belief Drift');
  md += '_Generated from the SQLite memory store. Surfaces principles whose evidence may have shifted._\n\n';
  md += `- Namespace: ${report.namespace || namespace}\n`;
  md += `- Contested principles: ${report.summary.contestedCount}\n`;
  md += `- Principles with contradicting evidence: ${report.summary.contradictedCount}\n`;
  md += `- Stale validated principles (no support in 90+ days): ${report.summary.staleCount}\n\n`;

  if (
    report.summary.contestedCount === 0 &&
    report.summary.contradictedCount === 0 &&
    report.summary.staleCount === 0
  ) {
    md += '_No contradictions detected. All principles have consistent evidence._\n';
    return md;
  }

  if (report.contested.length) {
    md += '## Contested / Deprecated Principles\n\n';
    md += 'These principles have accumulated contradicting evidence and should be reviewed:\n\n';
    for (const p of report.contested) {
      md += `### ${p.title}\n`;
      md += `- Status: **${p.status}** (confidence ${Number(p.confidence).toFixed(2)})\n`;
      md += `- Supports: ${p.support_count} / Contradicts: ${p.contradict_count}\n`;
      if (p.last_supported_at) md += `- Last supported: ${p.last_supported_at}\n`;
      if (p.last_contradicted_at) md += `- Last contradicted: ${p.last_contradicted_at}\n`;
      md += `- Statement: ${p.statement}\n\n`;
    }
  }

  if (report.contradictedPrinciples.length) {
    md += '## Principles with Contradicting Evidence\n\n';
    for (const entry of report.contradictedPrinciples) {
      md += `### ${entry.title}\n`;
      md += `- Current status: ${entry.status} (confidence ${Number(entry.confidence).toFixed(2)})\n`;
      md += `- Contradicting evidence:\n`;
      for (const c of entry.contradictions) {
        md += `  - ${c.conceptName} v${c.versionNo} (${c.decision || 'pending'}), weight ${c.weight}, effect ${c.effectSize}`;
        if (c.note) md += ` — _${c.note}_`;
        md += '\n';
      }
      md += '\n';
    }
  }

  if (report.staleValidated.length) {
    md += '## Stale Validated Principles (no recent support)\n\n';
    md += 'These were validated but have not been supported by new evidence in 90+ days. ';
    md += 'Consider retiring or re-validating.\n\n';
    for (const p of report.staleValidated) {
      md += `- **${p.title}** (last supported ${p.last_supported_at})\n`;
    }
    md += '\n';
  }

  md += '## Next Steps\n\n';
  md += '1. For contested principles: run `distill` to decide whether to revise, split, or retire.\n';
  md += '2. For stale principles: generate a retrieval brief that asks if they still apply.\n';
  md += '3. Add new evidence via `add-evidence --json \'{"principleId":"...","relationType":"support|contradict",...}\'`.\n';
  md += '4. Run `recompute-beliefs` after adding evidence.\n';

  return md;
}

export function renderMarkdownSurfaces(db, { runId } = {}) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });

  const currentPrinciples = listPrinciples(db, { excludeDeprecated: true }).filter(
    (item) =>
      ['validated', 'emerging', 'candidate'].includes(item.status) &&
      ['principle', 'procedure'].includes(item.principle_type),
  );
  const antiPatterns = listPrinciples(db, {
    principleType: 'anti_pattern',
    excludeDeprecated: true,
  });
  const blindSpots = listOpenQuestionsAndWarnings(db);
  const designerBrief = getLatestBriefByRole(db, 'designer');
  const engineerBrief = getLatestBriefByRole(db, 'engineer');
  const playtesterBrief = getLatestBriefByRole(db, 'playtester');
  const latestRun = getLatestRun(db, runId);

  let currentPrinciplesMd = heading('Current Principles');
  currentPrinciplesMd += `_Generated from the SQLite memory store._\n\n`;
  if (currentPrinciples.length === 0) {
    currentPrinciplesMd += '_No principles are stored yet._\n';
  } else {
    for (const principle of currentPrinciples) {
      currentPrinciplesMd += `${formatPrinciple(principle)}\n`;
    }
  }

  let antiPatternsMd = heading('Current Anti-Patterns');
  antiPatternsMd += `_Generated from the SQLite memory store._\n\n`;
  if (antiPatterns.length === 0) {
    antiPatternsMd += '_No anti-patterns are stored yet._\n';
  } else {
    for (const principle of antiPatterns) {
      antiPatternsMd += `${formatPrinciple(principle)}\n`;
    }
  }

  let blindSpotsMd = heading('Blind Spots');
  blindSpotsMd += `_Generated from the SQLite memory store._\n\n`;
  if (blindSpots.openQuestions.length === 0 && blindSpots.contested.length === 0) {
    blindSpotsMd += '_No open questions or contested beliefs are stored yet._\n';
  } else {
    if (blindSpots.openQuestions.length) {
      blindSpotsMd += '## Open Questions\n\n';
      for (const question of blindSpots.openQuestions) {
        blindSpotsMd += `${formatPrinciple(question)}\n`;
      }
    }
    if (blindSpots.contested.length) {
      blindSpotsMd += '## Contested Principles\n\n';
      for (const warning of blindSpots.contested) {
        blindSpotsMd += `${formatPrinciple(warning)}\n`;
      }
    }
  }

  let playtesterPacket = heading('Playtester Packet');
  playtesterPacket += '_Blind protocol only. Do not append concept history, metrics, or intended strategy._\n\n';
  playtesterPacket += '## Protocol\n';
  for (const line of PLAYTEST_PROTOCOL) {
    playtesterPacket += `- ${line}\n`;
  }
  playtesterPacket += '\n## Rubric\n';
  for (const line of PLAYTEST_RUBRIC) {
    playtesterPacket += `- ${line}\n`;
  }
  if (playtesterBrief?.items?.length) {
    playtesterPacket += '\n## Optional Calibration Example\n\n';
    for (const item of playtesterBrief.items) {
      playtesterPacket += `${formatBriefItem(item)}\n`;
    }
  }

  let runSummaryMd = heading('Run Summary');
  if (!latestRun) {
    runSummaryMd += '_No runs have been recorded yet._\n';
  } else {
    runSummaryMd += `- Run ID: ${latestRun.run_id}\n`;
    runSummaryMd += `- Namespace: ${latestRun.namespace}\n`;
    runSummaryMd += `- Loop type: ${latestRun.loop_type}\n`;
    runSummaryMd += `- Status: ${latestRun.status}\n`;
    runSummaryMd += `- Started: ${latestRun.started_at}\n`;
    runSummaryMd += `- Ended: ${latestRun.ended_at || 'still active'}\n`;
    runSummaryMd += `- Summary: ${latestRun.summary || 'No summary recorded.'}\n`;
    runSummaryMd += `- Scorecards in run: ${latestRun.scorecardCount}\n`;
    runSummaryMd += `- Playtests in run: ${latestRun.playtestCount}\n`;
    runSummaryMd += `- Principles created in run: ${latestRun.principleCount}\n\n`;
    runSummaryMd += `- Bugs in run: ${latestRun.bugCount}\n`;
    runSummaryMd += `- Open bugs: ${latestRun.openBugCount}\n`;
    runSummaryMd += `- Blocking open bugs: ${latestRun.blockingOpenBugCount}\n\n`;

    if (latestRun.versions.length) {
      runSummaryMd += '## Versions\n';
      for (const version of latestRun.versions) {
        runSummaryMd += `- ${version.canonical_name} v${version.version_no}: ${version.decision || 'pending'}\n`;
      }
      runSummaryMd += '\n';
    }

    if (latestRun.recentBugs.length) {
      runSummaryMd += '## Recent Bugs\n';
      for (const bug of latestRun.recentBugs) {
        const blocking = bug.blocking ? 'blocking' : 'non-blocking';
        runSummaryMd += `- ${bug.canonical_name} v${bug.version_no}: [${bug.severity}] ${bug.title} -> ${bug.status} (${blocking})\n`;
      }
      runSummaryMd += '\n';
    }
  }

  const learningsMd = renderLearnings(db);
  const portfolioMd = renderPortfolioReview(db, latestRun?.namespace || 'leetcode');
  const contradictionsMd = renderContradictions(db, latestRun?.namespace || 'leetcode');

  fs.mkdirSync(LEETCODE_DIR, { recursive: true });

  const files = [
    [MARKDOWN_OUTPUTS.currentPrinciples, currentPrinciplesMd],
    [MARKDOWN_OUTPUTS.currentAntiPatterns, antiPatternsMd],
    [MARKDOWN_OUTPUTS.blindSpots, blindSpotsMd],
    [MARKDOWN_OUTPUTS.designerBrief, renderBrief(designerBrief, 'Designer')],
    [MARKDOWN_OUTPUTS.engineerBrief, renderBrief(engineerBrief, 'Engineer')],
    [MARKDOWN_OUTPUTS.playtesterPacket, playtesterPacket],
    [MARKDOWN_OUTPUTS.runSummary, runSummaryMd],
    [MARKDOWN_OUTPUTS.portfolioReview, portfolioMd],
    [MARKDOWN_OUTPUTS.contradictions, contradictionsMd],
    [MARKDOWN_OUTPUTS.learnings, learningsMd],
  ];

  for (const [filePath, content] of files) {
    fs.writeFileSync(filePath, content);
  }

  return {
    files: files.map(([filePath]) => filePath),
    thresholds: ENGINEER_THRESHOLD_LINES,
  };
}
