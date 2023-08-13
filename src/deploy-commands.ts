import fs from 'fs';
import path from 'path';
import 'dotenv/config';

import { REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from 'discord.js';

import { __dirname } from './util.ts';
import { Command } from './types.ts';

const { CLIENT_ID: clientId, GUILD_ID: guildId, BOT_TOKEN: token } = process.env;

const commands: Array<RESTPostAPIChatInputApplicationCommandsJSONBody> = [];

async function loadCommands() {
  // Grab all the command files from the commands directory you created earlier
  const foldersPath = path.join(__dirname, 'commands');
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    // Grab all the command files from the commands directory you created earlier
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.ts'));
    // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command: Command = (await import(filePath)).default;

      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token as string);

// and deploy your commands!
(async () => {
  try {
    await loadCommands();

    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId as string, guildId as string),
      {
        body: commands,
      }
    );

    console.log(
      `Successfully reloaded ${(data as Array<unknown>).length} application (/) commands.`
    );
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();
