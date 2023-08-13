import { CommandInteraction, Client, Collection, SlashCommandBuilder } from 'discord.js';
import Database from './database/index.ts';

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: CommandInteraction, client: ExtendedClient) => Promise<void>;
}

export interface ExtendedClient extends Client {
  commands: Collection<string, Command>;
  database: Database;
}
