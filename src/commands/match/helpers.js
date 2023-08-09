export async function cancelMatch(mainMessage, interaction) {
  // Update original message.
  console.log('cancelMatch type:', mainMessage.constructor.name);
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
