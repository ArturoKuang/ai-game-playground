import path from 'node:path';

export const MEMORY_DIR = path.resolve(process.cwd(), 'memory');
export const DEFAULT_DB_PATH = path.join(MEMORY_DIR, 'system.sqlite');

export const MARKDOWN_OUTPUTS = {
  currentPrinciples: path.join(MEMORY_DIR, 'current_principles.md'),
  currentAntiPatterns: path.join(MEMORY_DIR, 'current_anti_patterns.md'),
  blindSpots: path.join(MEMORY_DIR, 'blind_spots.md'),
  designerBrief: path.join(MEMORY_DIR, 'designer_brief.md'),
  engineerBrief: path.join(MEMORY_DIR, 'engineer_brief.md'),
  playtesterPacket: path.join(MEMORY_DIR, 'playtester_packet.md'),
  runSummary: path.join(MEMORY_DIR, 'run_summary.md'),
};

export const ROLE_BUDGETS = {
  designer: { min: 8, max: 12 },
  engineer: { min: 6, max: 10 },
  playtester: { min: 1, max: 3 },
};

export const PRINCIPLE_TYPES = ['principle', 'anti_pattern', 'procedure', 'open_question'];
export const PRINCIPLE_STATUSES = ['candidate', 'emerging', 'validated', 'contested', 'deprecated'];
export const RETRIEVAL_FEEDBACK = ['useful', 'irrelevant', 'misleading', 'unknown'];

export const ENGINEER_THRESHOLD_LINES = [
  'Solvability must stay at 100%.',
  'Structural Fit: board→input, moves→operations, win→goal — all three must be yes.',
  'Efficiency Gap must be ≥ 20% (L5 vs L2). Below 15% is an auto-kill.',
  'Wasted Work Ratio must be ≥ 30% (L2 extra moves vs L5 at D3). Below 20% is an auto-kill.',
  'Difficulty Breakpoint must land at D3-D4. D1 or D5/never is an auto-kill.',
  'Difficulty Scaling must be monotonic (L2 win rate D1→D5). Non-monotonic is an auto-kill.',
  'Decision Density must be > 60%. Below 40% is an auto-kill.',
];

export const PLAYTEST_RUBRIC = [
  'Does the player understand the rules without concept lineage, prior metrics, or target intent?',
  'What intuitive strategy appears first, and does it evolve under pressure?',
  'What plain-language pattern does the player report after repeated play?',
  'Do the reports reveal confusion, boredom, or a transferable insight?',
];

export const PLAYTEST_PROTOCOL = [
  'Play blind. Do not read code, concept history, prior metrics, or expected strategy.',
  'Run one intuitive session first, then a more strategic session, then a harder-pressure session.',
  'Write down the strategy that actually emerged in plain English.',
  'Report bugs, confusion points, surprise moments, boring moments, and the strongest moment of insight.',
];

export const DEFAULT_METRIC_DEFINITIONS = [
  // === Algorithm Gate metrics ===
  {
    metricKey: 'solvability',
    namespace: 'global',
    label: 'Solvability',
    scaleType: 'ratio',
    description: 'Share of generated puzzles solved by the strongest solver. Must be 100%.',
  },
  {
    metricKey: 'structural_fit',
    namespace: 'leetcode',
    label: 'Structural Fit',
    scaleType: 'ordinal',
    description: 'Binary check: board→input, moves→operations, win→goal. Score 0-3 (count of yes).',
  },
  {
    metricKey: 'difficulty_breakpoint',
    namespace: 'leetcode',
    label: 'Difficulty Breakpoint',
    scaleType: 'ordinal',
    description: 'First difficulty where wrong strategy (L2) fails ≥20% or performs >30% worse than L5. Target: D3-D4.',
  },
  {
    metricKey: 'efficiency_gap',
    namespace: 'leetcode',
    label: 'Efficiency Gap',
    scaleType: 'ratio',
    description: '(L2_moves - L5_moves) / L2_moves averaged at D3. Target: ≥ 0.20.',
  },
  {
    metricKey: 'wasted_work_ratio',
    namespace: 'leetcode',
    label: 'Wasted Work Ratio',
    scaleType: 'ratio',
    description: '(L2_moves - L5_moves) / L5_moves averaged at D3. Target: ≥ 0.30.',
  },
  {
    metricKey: 'difficulty_scaling',
    namespace: 'leetcode',
    label: 'Difficulty Scaling',
    scaleType: 'ordinal',
    description: 'Whether L2 win rate drops monotonically D1→D5. 1=monotonic, 0=non-monotonic.',
  },
  // === Fun Gate metrics (solver-computable) ===
  {
    metricKey: 'decision_density',
    namespace: 'leetcode',
    label: 'Decision Density',
    scaleType: 'ratio',
    description: 'Fraction of moves with ≥2 meaningful options across L5 solutions at D3. Target: > 0.60.',
  },
  // === Fun Gate metrics (playtester-reported) ===
  {
    metricKey: 'comprehension_speed',
    namespace: 'leetcode',
    label: 'Comprehension Speed',
    scaleType: 'count',
    description: 'Moves until playtester understood rules. Target: ≤ 5.',
  },
  {
    metricKey: 'dead_moments',
    namespace: 'leetcode',
    label: 'Dead Moments',
    scaleType: 'count',
    description: 'Taps that produced no visible response. Target: 0.',
  },
  {
    metricKey: 'confusion_count',
    namespace: 'leetcode',
    label: 'Confusion Count',
    scaleType: 'count',
    description: 'Moments of genuine confusion during play. Target: ≤ 2.',
  },
  {
    metricKey: 'strategy_shifts',
    namespace: 'leetcode',
    label: 'Strategy Shifts',
    scaleType: 'count',
    description: 'Distinct strategy changes D1→D5. Target: ≥ 1.',
  },
  {
    metricKey: 'replay_pull',
    namespace: 'leetcode',
    label: 'Replay Pull',
    scaleType: 'ordinal',
    description: 'Would playtester immediately play again? 1-5 scale. Target: ≥ 3.',
  },
  {
    metricKey: 'best_moment_intensity',
    namespace: 'leetcode',
    label: 'Best Moment Intensity',
    scaleType: 'ordinal',
    description: 'How satisfying was the peak moment? 1-5 scale. Target: ≥ 3.',
  },
  // === Optional diagnostics ===
  {
    metricKey: 'algorithm_alignment',
    namespace: 'leetcode',
    label: 'Algorithm Alignment',
    scaleType: 'ratio',
    description: 'Diagnostic: % of L5 moves matching target algorithm pattern.',
  },
  {
    metricKey: 'counterintuitive_moves',
    namespace: 'global',
    label: 'Counterintuitive Moves',
    scaleType: 'count',
    description: 'Diagnostic: steps where heuristic worsens in optimal path.',
  },
  // === System metrics ===
  {
    metricKey: 'prediction_error',
    namespace: 'global',
    label: 'Prediction Error',
    scaleType: 'real',
    description: 'Gap between predicted and actual scorecard outcomes.',
  },
  {
    metricKey: 'iterations_to_keep',
    namespace: 'global',
    label: 'Iterations To Keep',
    scaleType: 'count',
    description: 'How many cycles a concept needed before it became keep-worthy.',
  },
  {
    metricKey: 'retrieval_usefulness_rate',
    namespace: 'global',
    label: 'Retrieval Usefulness Rate',
    scaleType: 'ratio',
    description: 'Share of audited retrieval items marked useful.',
  },
];
