# 🤖 Arbitro Bot

A Discord bot to register in-house custom games and track player elo rating.

Built in Typescript with [Discord.js](https://github.com/discordjs/discord.js) and [MongoDB](https://www.mongodb.com/).

## Development

1. Clone repo:

   ```shell
   git clone git@github.com:joao-m-santos/arbitro-bot.git
   ```

2. Install dependencies:

   ```shell
   npm install
   ```

3. Add .env file with environment variables:

   ```shell
   cat > .env <<- EOM
   # Config
   TEAM_SIZE=5

   # Discord
   BOT_TOKEN=<Discord CLIENT SECRET>
   CLIENT_ID=<Discord CLIENT ID>
   GUILD_ID=<Discord server CLIENT ID>

   # Database
   DB_URI=<MongoDB connection string>
   DB_NAME=<MongoDB database name>
   EOM
   ```

4. Start the bot:
   ```shell
   npm start
   ```
