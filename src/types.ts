export type GameMeta = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  component: React.ComponentType;
};

export type GuessResult = 'correct' | 'misplaced' | 'wrong';
