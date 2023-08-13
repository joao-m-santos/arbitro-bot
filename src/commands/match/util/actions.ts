import { ButtonInteraction, Message } from 'discord.js';

export async function cancelMatch(mainMessage: Message, interaction: ButtonInteraction) {
  // Update original message.
  await mainMessage.edit({ content: 'Match cancelled.', embeds: [], components: [] });

  try {
    // Clear ephemeral message content.
    await interaction.update({
      content: 'Match cancelled. Use `/match` to create another one.',
      components: [],
    });
  } catch (error) {
    console.error(error);
  }
}
