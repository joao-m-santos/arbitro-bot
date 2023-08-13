import 'dotenv/config';

export const TEAM_SIZE = parseInt(process.env.TEAM_SIZE as string, 10) || 5;

export const Teams = {
  A: {
    emoji: '🟦',
    label: 'A',
  },
  B: {
    emoji: '🟥',
    label: 'B',
  },
};

export function teamLabel(team: keyof typeof Teams) {
  return `**${Teams[team].emoji} Team ${Teams[team].label}**`;
}
