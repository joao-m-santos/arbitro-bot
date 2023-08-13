import { setTimeout } from 'node:timers/promises';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  SlashCommandBuilder,
  Snowflake,
  userMention,
} from 'discord.js';

import { cancelMatch } from './util/actions.ts';
import { EloTableEntry, getEmbed, getFinalEmbed } from './util/helpers.ts';
import { TEAM_SIZE } from '../../util/team.ts';
import { Command } from '../../types.ts';
import { IMatch } from '../../database/schemas/match.ts';

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

    const teamA: Array<Snowflake> = [];
    const teamB: Array<Snowflake> = [];

    const votesA: Array<{ id: Snowflake; fromTeam: boolean }> = [];
    const votesB: Array<{ id: Snowflake; fromTeam: boolean }> = [];

    let match: IMatch | null;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttonTeamA, buttonTeamB);
    const response = await interaction.editReply({
      embeds: [getEmbed(teamA, teamB)],
      components: [row],
    });

    const cancelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(buttonCancel);
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
        if (!match && teamA.length === TEAM_SIZE && teamB.length === TEAM_SIZE) {
          match = (await client.database.createMatch(teamA, teamB)) as IMatch;

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

          const winRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            buttonWinTeamA,
            buttonWinTeamB
          );

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
          let eloTableA: Array<EloTableEntry> = [];
          let eloTableB: Array<EloTableEntry> = [];

          for (const id of teamA) {
            const player = await client.database.getPlayer(id);
            if (!player) {
              console.error('Player not found');
              return;
            }
            eloTableA.push({ id, startElo: player.elo, endElo: 0 });
          }
          for (const id of teamB) {
            const player = await client.database.getPlayer(id);
            if (!player) {
              console.error('Player not found');
              return;
            }
            eloTableB.push({ id, startElo: player.elo, endElo: 0 });
          }

          if (!match) {
            console.error('Match not registered');
            return;
          }
          await client.database.finishMatch(match, isWinTeamA ? 'A' : 'B');

          for (const id of teamA) {
            const player = await client.database.getPlayer(id);
            if (!player) {
              console.error('Player not found');
              return;
            }
            (eloTableA.find((entry) => entry.id === id) as EloTableEntry).endElo = player.elo;
          }
          for (const id of teamB) {
            const player = await client.database.getPlayer(id);
            if (!player) {
              console.error('Player not found');
              return;
            }
            (eloTableB.find((entry) => entry.id === id) as EloTableEntry).endElo = player.elo;
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
} as Command;
