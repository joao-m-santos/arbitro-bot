import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  async execute(interaction, client) {
    console.log(client);
    await interaction.reply('Pong!');
  },
};
