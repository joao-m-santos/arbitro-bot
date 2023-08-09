import { EmbedBuilder, SlashCommandBuilder, userMention } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Shows the current leaderboard.'),
  async execute(interaction, client) {
    const players = await client.database.getAllPlayers();

    const embed = new EmbedBuilder().setTitle('🏆 Leaderboard');

    if (players.length) {
      players.sort((playerA, playerB) => playerB.elo - playerA.elo);

      const formattedPlayerTags = players
        .map(({ discord_id }) => userMention(discord_id))
        .join('\n');
      const formattedWL = players.map(({ wins, losses }) => `${wins}/${losses}`).join('\n');
      const formattedElo = players.map(({ elo }) => `**${elo}**`).join('\n');

      embed.addFields(
        { name: 'Player', value: formattedPlayerTags, inline: true },
        { name: 'W/L', value: formattedWL, inline: true },
        { name: 'Elo rating', value: formattedElo, inline: true }
      );
    } else {
      embed.setDescription('No players registered.');
    }

    await interaction.reply({ embeds: [embed] });
  },
};
