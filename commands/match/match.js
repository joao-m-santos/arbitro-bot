import { setTimeout } from 'node:timers/promises';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
  userMention,
} from 'discord.js';

import { cancelMatch } from './helpers.js';

/**
 * Generates match embed based on two teams.
 * @param {Array<number>} teamA Team A player IDs
 * @param {Array<number>} teamB Team B player IDs
 * @param {?string} description Embed description.
 * @param {?string} matchId An optional match ID to show in footer.
 * @param {?number} eloTeamA An optional elo rating of team A.
 * @param {?number} eloTeamB An optional elo rating of team B.
 * @returns {EmbedBuilder}
 */
function getEmbed(
  teamA,
  teamB,
  description = `Teams being made up. Select the team you're in by clicking one of the buttons below.`,
  matchId,
  eloTeamA,
  eloTeamB
) {
  const valueTeamA = teamA.length
    ? teamA.map((id) => userMention(id)).join('\n')
    : 'Waiting for players...';
  const valueTeamB = teamB.length
    ? teamB.map((id) => userMention(id)).join('\n')
    : 'Waiting for players...';

  const textTeamA = `**🟦 Team A**${eloTeamA ? ` (elo: ${eloTeamA})` : ''}`;
  const textTeamB = `**🟥 Team B**${eloTeamB ? ` (elo: ${eloTeamB})` : ''}`;

  const embed = new EmbedBuilder()
    .setTitle('⚔️ New match')
    .setDescription(description)
    .addFields(
      { name: textTeamA, value: valueTeamA, inline: true },
      { name: textTeamB, value: valueTeamB, inline: true }
    )
    .setTimestamp();

  if (matchId) embed.setFooter({ text: `Match ID: ${matchId}` });

  return embed;
}

function getFinalEmbed(title, description, eloTableA, eloTableB) {
  const mapContent = (array) =>
    array
      .map(({ id, startElo, endElo }) => `${userMention(id)}: **${endElo}** (${endElo - startElo})`)
      .join('\n');

  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .addFields(
      { name: '**🟦 Team A**', value: mapContent(eloTableA), inline: true },
      { name: '**🟥 Team B**', value: mapContent(eloTableB), inline: true }
    );
}

const buttonTeamA = new ButtonBuilder()
  .setCustomId('addTeamA')
  .setLabel('Team A')
  .setStyle(ButtonStyle.Primary);
const buttonTeamB = new ButtonBuilder()
  .setCustomId('addTeamB')
  .setLabel('Team B')
  .setStyle(ButtonStyle.Danger);

const buttonCancel = new ButtonBuilder()
  .setCustomId('cancel')
  .setLabel('Cancel match')
  .setEmoji('❌')
  .setStyle(ButtonStyle.Secondary);

const buttonWinTeamA = new ButtonBuilder()
  .setCustomId('winTeamA')
  .setLabel('Team A won')
  .setStyle(ButtonStyle.Primary);
const buttonWinTeamB = new ButtonBuilder()
  .setCustomId('winTeamB')
  .setLabel('Team B won')
  .setStyle(ButtonStyle.Danger);

// const tenMinutes = 600_000;

export default {
  data: new SlashCommandBuilder().setName('match').setDescription('Starts a lobby for a match.'),
  async execute(interaction, client) {
    await interaction.deferReply();

    const teamA = [];
    const teamB = [];

    const votesA = [];
    const votesB = [];

    let match;

    const row = new ActionRowBuilder().addComponents(buttonTeamA, buttonTeamB);
    const response = await interaction.editReply({
      embeds: [getEmbed(teamA, teamB)],
      components: [row],
    });

    const cancelRow = new ActionRowBuilder().addComponents(buttonCancel);
    const cancelMsg = await interaction.followUp({
      content: 'If you need to cancel this match:',
      components: [cancelRow],
      ephemeral: true,
    });

    const cancelCollector = cancelMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      max: 10,
      maxUsers: 10,
      time: 3_600_000,
    });
    cancelCollector.on('collect', async (i) => {
      if (i.customId === 'cancel') {
        console.log('yo?');
        await cancelMatch(response, i);
        return;
      }
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      max: 10,
      maxUsers: 10,
      time: 3_600_000,
    });

    collector.on('collect', async (i) => {
      const isAddTeamA = i.customId === 'addTeamA';
      const isAddTeamB = i.customId === 'addTeamB';

      if (isAddTeamA || isAddTeamB) {
        if ([...teamA, ...teamB].includes(i.user.id)) {
          // Prevent from re-adding to a team
          await i.reply({ content: 'Already in a team!', ephemeral: true });
          return;
        }

        if (isAddTeamA) {
          teamA.push(i.user.id);
        }

        if (isAddTeamB) {
          teamB.push(i.user.id);
        }

        // If teams are full, start the match
        if (!match && teamA.length === 5 && teamB.length === 5) {
          match = await client.database.createMatch(teamA, teamB);

          const mentionsTeamA = '🟦 **Team A**: ' + teamA.map((id) => userMention(id)).join(', ');
          const mentionsTeamB = '🟥 **Team B**: ' + teamB.map((id) => userMention(id)).join(', ');

          const updateResult = await i.update({
            embeds: [
              getEmbed(
                teamA,
                teamB,
                'Match started. Results buttons will appear in 10 minutes.',
                match._id,
                match.elo_a,
                match.elo_b
              ),
            ],
            components: [],
          });

          await i.followUp({
            content: 'Match started!\n\n' + mentionsTeamA + '\n' + mentionsTeamB,
          });

          await setTimeout(3000);

          const winRow = new ActionRowBuilder().addComponents(buttonWinTeamA, buttonWinTeamB);

          await updateResult.edit({
            embeds: [
              getEmbed(
                teamA,
                teamB,
                `Match in progress. Select a winner after it's over`,
                match._id,
                match.elo_a,
                match.elo_b
              ),
            ],
            components: [winRow],
          });
        } else {
          await i.update({ embeds: [getEmbed(teamA, teamB)] });
        }

        return;
      }

      const isWinTeamA = i.customId === 'winTeamA';
      const isWinTeamB = i.customId === 'winTeamB';

      if (isWinTeamA || isWinTeamB) {
        const voterId = i.user.id;

        if (![...teamA, ...teamB].includes(voterId)) {
          // Prevent voting if not in the match
          await i.reply({
            content: 'You cannot vote because you are not part of this match',
            ephemeral: true,
          });
          return;
        }

        if (
          votesA.find((vote) => vote.id === voterId) ||
          votesB.find((vote) => vote.id === voterId)
        ) {
          // Prevent from re-counting vote
          await i.reply({ content: 'Already voted!', ephemeral: true });
          return;
        }

        if (isWinTeamA) votesA.push({ id: voterId, fromTeam: teamA.includes(voterId) });
        if (isWinTeamB) votesB.push({ id: voterId, fromTeam: teamB.includes(voterId) });

        await i.reply({ content: 'Your vote was counted!', ephemeral: true });

        const isWinnerTeamA = votesA.length > 1 && votesA.find((vote) => !vote.fromTeam);
        const isWinnerTeamB = votesB.length > 1 && votesB.find((vote) => !vote.fromTeam);

        if (isWinnerTeamA || isWinnerTeamB) {
          let eloTableA = [];
          let eloTableB = [];

          for (const id of teamA) {
            const player = await client.database.getPlayer(id);
            eloTableA.push({ id, startElo: player.elo });
          }
          for (const id of teamB) {
            const player = await client.database.getPlayer(id);
            eloTableB.push({ id, startElo: player.elo });
          }

          await client.database.finishMatch(match, isWinTeamA ? 'A' : 'B');

          for (const id of teamA) {
            const player = await client.database.getPlayer(id);
            eloTableA.find((entry) => entry.id === id).endElo = player.elo;
          }
          for (const id of teamB) {
            const player = await client.database.getPlayer(id);
            eloTableB.find((entry) => entry.id === id).endElo = player.elo;
          }

          await interaction.editReply({
            embeds: [
              getEmbed(
                teamA,
                teamB,
                `Match ended. Winner: ${isWinTeamA ? '🟦 **Team A**' : '🟥 **Team B**'}`,
                match._id,
                match.elo_a,
                match.elo_b
              ),
            ],
            components: [],
          });

          await i.followUp({
            embeds: [
              getFinalEmbed(
                `🏆 Match ended: ${isWinTeamA ? '🟦 **Team A**' : '🟥 **Team B**'} won!`,
                'Elo changes:',
                eloTableA,
                eloTableB
              ),
            ],
          });
        }

        return;
      }
    });
  },
};
