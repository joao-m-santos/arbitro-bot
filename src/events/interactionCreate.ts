import { BaseInteraction, Events } from 'discord.js';

import { ExtendedClient } from '../types.ts';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: BaseInteraction, client: ExtendedClient) {
    if (!interaction.isChatInputCommand()) return;

    const command = (interaction.client as ExtendedClient).commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}`);
      console.error(error);
    }
  },
};
