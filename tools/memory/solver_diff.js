import fs from 'node:fs';

// Pre-build gate that parses a spec file's Solver Strategies section and
// verifies the L2 (wrong strategy) and L5 (optimal strategy) solvers are
// structurally different *before* engineering effort is spent.
//
// Spec format:
//
//   ## Solver Strategies
//
//   ### L2 (Wrong Strategy)
//   - Name: <slug>
//   - Approach: <one line>
//   - Information access: <pattern>
//   - Termination: <pattern>
//
//   ### L5 (Optimal Strategy)
//   - Name: <slug>
//   - Approach: <one line>
//   - Information access: <pattern>
//   - Termination: <pattern>
//   - Algorithm keyword: <comma-separated keywords>
//
//   ### Structural Differences
//   - <diff 1>
//   - <diff 2>
//   - <diff 3>
//
// Rules:
//   1. L2 and L5 strategy names must differ (slugified).
//   2. At least one of (Approach | Information access | Termination) must differ verbatim.
//   3. At least two bullet points under Structural Differences.
//   4. L5 must declare at least one Algorithm keyword.

const SECTION_HEADER = /^##\s+Solver Strategies\s*$/i;
const L2_HEADER = /^###\s+L2\b/i;
const L5_HEADER = /^###\s+L5\b/i;
const DIFFS_HEADER = /^###\s+Structural Differences\s*$/i;
const NEXT_L2_SECTION = /^##\s+/;
const BULLET = /^\s*-\s+(.*)$/;

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseBulletField(line) {
  const match = BULLET.exec(line);
  if (!match) return null;
  const text = match[1];
  const colonIdx = text.indexOf(':');
  if (colonIdx === -1) return { key: null, value: text.trim() };
  return {
    key: text.slice(0, colonIdx).trim().toLowerCase(),
    value: text.slice(colonIdx + 1).trim(),
  };
}

function extractSection(lines, startIdx, endMatcher) {
  const collected = [];
  for (let i = startIdx; i < lines.length; i += 1) {
    if (endMatcher(lines[i])) return { lines: collected, endIdx: i };
    collected.push(lines[i]);
  }
  return { lines: collected, endIdx: lines.length };
}

function parseStrategyBlock(lines) {
  const fields = {};
  for (const line of lines) {
    const bullet = parseBulletField(line);
    if (!bullet || !bullet.key) continue;
    fields[bullet.key] = bullet.value;
  }
  return fields;
}

function parseDifferencesBlock(lines) {
  const bullets = [];
  for (const line of lines) {
    const match = BULLET.exec(line);
    if (match && match[1].trim().length > 0) bullets.push(match[1].trim());
  }
  return bullets;
}

export function parseSolverStrategies(specText) {
  const lines = specText.split(/\r?\n/);

  // locate Solver Strategies section
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (SECTION_HEADER.test(lines[i])) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) {
    return { found: false, errors: ['Spec is missing a `## Solver Strategies` section.'] };
  }

  // find end (next ## header or EOF)
  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    if (NEXT_L2_SECTION.test(lines[i])) {
      end = i;
      break;
    }
  }

  const section = lines.slice(start, end);
  const errors = [];

  const findSubsection = (headerRegex) => {
    for (let i = 0; i < section.length; i += 1) {
      if (headerRegex.test(section[i])) {
        const { lines: body } = extractSection(section, i + 1, (line) => /^###\s+/.test(line));
        return body;
      }
    }
    return null;
  };

  const l2Body = findSubsection(L2_HEADER);
  const l5Body = findSubsection(L5_HEADER);
  const diffsBody = findSubsection(DIFFS_HEADER);

  if (!l2Body) errors.push('Missing `### L2 (Wrong Strategy)` subsection.');
  if (!l5Body) errors.push('Missing `### L5 (Optimal Strategy)` subsection.');
  if (!diffsBody) errors.push('Missing `### Structural Differences` subsection.');

  const l2 = l2Body ? parseStrategyBlock(l2Body) : {};
  const l5 = l5Body ? parseStrategyBlock(l5Body) : {};
  const differences = diffsBody ? parseDifferencesBlock(diffsBody) : [];

  return { found: true, errors, l2, l5, differences };
}

export function checkSolverDiff({ specPath, specText }) {
  const text = specText ?? (specPath ? fs.readFileSync(specPath, 'utf8') : '');
  if (!text) {
    return { valid: false, errors: ['No spec content provided (pass --spec <path> or --text).'] };
  }

  const parsed = parseSolverStrategies(text);
  if (!parsed.found) {
    return { valid: false, errors: parsed.errors };
  }

  const errors = [...parsed.errors];
  const warnings = [];

  const l2Name = slugify(parsed.l2.name);
  const l5Name = slugify(parsed.l5.name);

  if (!l2Name) errors.push('L2 section is missing `- Name:` field.');
  if (!l5Name) errors.push('L5 section is missing `- Name:` field.');
  if (l2Name && l5Name && l2Name === l5Name) {
    errors.push(
      `L2 and L5 strategy names are identical ("${l2Name}"). ` +
        'The wrong strategy must have a distinct name from the optimal strategy.',
    );
  }

  const compareKeys = ['approach', 'information access', 'termination'];
  const differingKeys = compareKeys.filter((key) => {
    const a = (parsed.l2[key] || '').toLowerCase().trim();
    const b = (parsed.l5[key] || '').toLowerCase().trim();
    return a.length > 0 && b.length > 0 && a !== b;
  });
  const emptyKeys = compareKeys.filter((key) => !parsed.l2[key] || !parsed.l5[key]);

  if (emptyKeys.length > 0) {
    warnings.push(
      `L2/L5 strategy fields missing for: ${emptyKeys.join(', ')}. ` +
        'Fill in Approach, Information access, and Termination for both strategies.',
    );
  }

  if (differingKeys.length === 0) {
    errors.push(
      'L2 and L5 share the same Approach / Information access / Termination. ' +
        'At least one dimension must differ structurally, or L2 is just L5 with different constants.',
    );
  }

  if (parsed.differences.length < 2) {
    errors.push(
      `Structural Differences needs at least 2 bullets (found ${parsed.differences.length}). ` +
        'List concrete behavioral gaps: information access pattern, termination condition, ' +
        'complexity class, data structure used, etc.',
    );
  }

  const algorithmKeyword = parsed.l5['algorithm keyword'] || parsed.l5['algorithm keywords'];
  if (!algorithmKeyword) {
    errors.push(
      'L5 section is missing `- Algorithm keyword:` field. ' +
        'Declare the algorithm family the optimal strategy implements (e.g. "two-pointer, early-exit").',
    );
  }

  // Heuristic: Equilibrium-style trap — L2 described as "sum-guided" but still converges
  // the same way as L5. Flag if L2 description contains any of the L5 keywords.
  if (algorithmKeyword && parsed.l2.approach) {
    const keywords = algorithmKeyword
      .split(/[,;]/)
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    const l2Lower = parsed.l2.approach.toLowerCase();
    const leakedKeywords = keywords.filter((k) => k.length > 2 && l2Lower.includes(k));
    if (leakedKeywords.length > 0) {
      warnings.push(
        `L2 approach description contains L5 algorithm keywords (${leakedKeywords.join(', ')}). ` +
          'If L2 is actually doing the optimal algorithm under a different name, the efficiency ' +
          'gap will collapse. Make L2 a genuinely different strategy.',
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    l2: parsed.l2,
    l5: parsed.l5,
    differences: parsed.differences,
    differingDimensions: differingKeys,
  };
}
