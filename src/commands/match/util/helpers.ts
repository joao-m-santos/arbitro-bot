import { EmbedBuilder, Snowflake, userMention } from 'discord.js';

import { teamLabel } from '../../../util/team.ts';

/**
 * Generates match embed based on two teams.
 */
export function getEmbed(
  teamA: Array<Snowflake>,
  teamB: Array<Snowflake>,
  description?: string,
  matchId?: string,
  eloTeamA?: number,
  eloTeamB?: number
) {
  const defaultDescription = `Teams being made up. Select the team you're in by clicking one of the buttons below.`;
  const valueTeamA = teamA.length
    ? teamA.map((id) => userMention(id)).join('\n')
    : 'Waiting for players...';
  const valueTeamB = teamB.length
    ? teamB.map((id) => userMention(id)).join('\n')
    : 'Waiting for players...';

  const textTeamA = `${teamLabel('A')}${eloTeamA ? ` (elo: ${eloTeamA})` : ''}`;
  const textTeamB = `${teamLabel('B')}${eloTeamB ? ` (elo: ${eloTeamB})` : ''}`;

  const embed = new EmbedBuilder()
    .setTitle('⚔️ New match')
    .setDescription(description || defaultDescription)
    .addFields(
      { name: textTeamA, value: valueTeamA, inline: true },
      { name: textTeamB, value: valueTeamB, inline: true }
    )
    .setTimestamp();

  if (matchId) embed.setFooter({ text: `Match ID: ${matchId}` });

  return embed;
}

export interface EloTableEntry {
  id: Snowflake;
  startElo: number;
  endElo: number;
}

const mapEloTableContent = (array: Array<EloTableEntry>) =>
  array
    .map(({ id, startElo, endElo }) => `${userMention(id)}: **${endElo}** (${endElo - startElo})`)
    .join('\n');

export function getFinalEmbed(
  title: string,
  description: string,
  eloTableA: Array<EloTableEntry>,
  eloTableB: Array<EloTableEntry>
) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .addFields(
      { name: teamLabel('A'), value: mapEloTableContent(eloTableA), inline: true },
      { name: teamLabel('B'), value: mapEloTableContent(eloTableB), inline: true }
    );
}
