import fs from 'fs';
import path from 'path';
import 'dotenv/config';

import { Client, Collection, GatewayIntentBits } from 'discord.js';

import Database from './database/index.ts';
import { __dirname } from './util.ts';
import { ExtendedClient } from './types.ts';

const { BOT_TOKEN: token, DB_URI: dbUrl, DB_NAME: dbName } = process.env;

// Create a new client instance
// @ts-ignore
const client: ExtendedClient = new Client<true>({ intents: [GatewayIntentBits.Guilds] });

client.database = new Database(dbUrl as string, dbName as string);

client.commands = new Collection();

async function loadCommands() {
  const foldersPath = path.join(__dirname, 'commands');
  const commandFolders = fs.readdirSync(foldersPath);
  let commandCount = 0;

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.ts'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = (await import(filePath)).default;
      // Set a new item in the Collection with the key as the command name and the value as the exported module
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandCount++;
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }

  console.log(`\nLoaded ${commandCount} commands from ${commandFolders.length} folders.`);
}

async function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.ts'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = (await import(filePath)).default;
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }

  console.log(`\nLoaded ${eventFiles.length} events.`);
}

await loadCommands();
await loadEvents();

// Log in to Discord with your client's token
client.login(token);
