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
  'Skill-depth should stay above 30%; below 10% is an auto-kill.',
  'Counterintuitive moves should be present; zero across the board is an auto-kill.',
  'Decision entropy should stay within 1.0 to 4.5 unless the mechanic is intentionally binary and justified.',
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
  {
    metricKey: 'solvability',
    namespace: 'global',
    label: 'Solvability',
    scaleType: 'ratio',
    description: 'Share of generated puzzles solved by the strongest solver.',
  },
  {
    metricKey: 'puzzle_entropy',
    namespace: 'global',
    label: 'Puzzle Entropy',
    scaleType: 'real',
    description: 'Log-scaled decision-space mass along the optimal solution path.',
  },
  {
    metricKey: 'skill_depth',
    namespace: 'global',
    label: 'Skill Depth',
    scaleType: 'ratio',
    description: 'Relative performance gap between weak and strong play.',
  },
  {
    metricKey: 'counterintuitive_moves',
    namespace: 'global',
    label: 'Counterintuitive Moves',
    scaleType: 'count',
    description: 'Number of strong moves that initially look locally worse.',
  },
  {
    metricKey: 'drama',
    namespace: 'global',
    label: 'Drama',
    scaleType: 'ratio',
    description: 'How much of the run feels like risk before resolution.',
  },
  {
    metricKey: 'decision_entropy',
    namespace: 'global',
    label: 'Decision Entropy',
    scaleType: 'real',
    description: 'Average Shannon entropy across legal moves.',
  },
  {
    metricKey: 'info_gain_ratio',
    namespace: 'global',
    label: 'Info Gain Ratio',
    scaleType: 'real',
    description: 'How much more informative the best move is than a random move.',
  },
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
    metricKey: 'repeated_failure_rate',
    namespace: 'global',
    label: 'Repeated Failure Rate',
    scaleType: 'ratio',
    description: 'How often the system falls into previously known dead ends.',
  },
  {
    metricKey: 'retrieval_usefulness_rate',
    namespace: 'global',
    label: 'Retrieval Usefulness Rate',
    scaleType: 'ratio',
    description: 'Share of audited retrieval items marked useful.',
  },
  {
    metricKey: 'misleading_retrieval_rate',
    namespace: 'global',
    label: 'Misleading Retrieval Rate',
    scaleType: 'ratio',
    description: 'Share of audited retrieval items marked misleading.',
  },
  {
    metricKey: 'algorithm_alignment',
    namespace: 'leetcode',
    label: 'Algorithm Alignment',
    scaleType: 'ratio',
    description: 'How closely the best strategy matches the intended algorithmic pattern.',
  },
  {
    metricKey: 'greedy_optimal_gap',
    namespace: 'leetcode',
    label: 'Greedy-Optimal Gap',
    scaleType: 'ratio',
    description: 'How much worse greedy play performs than algorithm-aligned play.',
  },
  {
    metricKey: 'difficulty_curve',
    namespace: 'leetcode',
    label: 'Difficulty Curve',
    scaleType: 'real',
    description: 'How reliably difficulty rises across the intended progression.',
  },
  {
    metricKey: 'insight_inflection',
    namespace: 'leetcode',
    label: 'Insight Inflection',
    scaleType: 'ordinal',
    description: 'The difficulty tier where naive play clearly stops working.',
  },
];
