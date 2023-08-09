import { Client, Events } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client<true>) {
    console.log(`\nReady! Logged in as ${client.user.tag}`);
  },
};
