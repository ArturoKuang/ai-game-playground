import fs from 'node:fs';

import {
  ENGINEER_THRESHOLD_LINES,
  MARKDOWN_OUTPUTS,
  MEMORY_DIR,
  PLAYTEST_PROTOCOL,
  PLAYTEST_RUBRIC,
} from './config.mjs';
import {
  getLatestBriefByRole,
  getLatestRun,
  listOpenQuestionsAndWarnings,
  listPrinciples,
} from './service.mjs';

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

  const files = [
    [MARKDOWN_OUTPUTS.currentPrinciples, currentPrinciplesMd],
    [MARKDOWN_OUTPUTS.currentAntiPatterns, antiPatternsMd],
    [MARKDOWN_OUTPUTS.blindSpots, blindSpotsMd],
    [MARKDOWN_OUTPUTS.designerBrief, renderBrief(designerBrief, 'Designer')],
    [MARKDOWN_OUTPUTS.engineerBrief, renderBrief(engineerBrief, 'Engineer')],
    [MARKDOWN_OUTPUTS.playtesterPacket, playtesterPacket],
    [MARKDOWN_OUTPUTS.runSummary, runSummaryMd],
  ];

  for (const [filePath, content] of files) {
    fs.writeFileSync(filePath, content);
  }

  return {
    files: files.map(([filePath]) => filePath),
    thresholds: ENGINEER_THRESHOLD_LINES,
  };
}
