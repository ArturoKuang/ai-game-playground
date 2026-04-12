export type GameMeta = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  component: React.ComponentType;
  /** Algorithm topic from curriculum.md, e.g. "Binary Search" */
  algorithm?: string;
  /** Curriculum tier (1-4) */
  tier?: number;
  /** Related LeetCode problem numbers */
  leetcodeProblems?: number[];
};
