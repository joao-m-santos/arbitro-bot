import mongoose, { Types } from 'mongoose';
import { Snowflake } from 'discord.js';

import { calculateElo } from '../util/elo.ts';
import { Teams } from '../util/team.ts';

import matchSchema, { IMatch } from './schemas/match.ts';
import playerSchema, { IPlayer } from './schemas/player.ts';

class Database {
  #url: string;
  #databaseName: string = 'test';

  #matchModel?: mongoose.Model<IMatch>;
  #playerModel?: mongoose.Model<IPlayer>;

  constructor(url: string, dbName: string) {
    this.#url = url;
    this.#databaseName = dbName;

    this.#connect().then(() => {
      this.#matchModel = mongoose.model<IMatch>('Match', matchSchema);
      this.#playerModel = mongoose.model<IPlayer>('Player', playerSchema);

      console.log('[Database] Models registered.');
    });
  }

  async #connect() {
    try {
      await mongoose.connect(this.#url, { dbName: this.#databaseName });
      console.log('[Database] Connected to DB!');
    } catch (error) {
      console.error('[Database]', error);
    }
  }

  async getPlayer(id: Snowflake) {
    try {
      return await this.#playerModel?.findOne({ discord_id: id });
    } catch (error) {
      console.error('[Database]', error);
      return null;
    }
  }

  async getAllPlayers() {
    try {
      return await this.#playerModel?.find();
    } catch (error) {
      console.error('[Database]', error);
      return null;
    }
  }

  async #mapDiscordIdsToPlayers(players: Array<Snowflake>) {
    return (await Promise.all(
      players.map((id) => {
        // Finds it or creates it
        return this.#playerModel?.findOneAndUpdate(
          { discord_id: id },
          { discord_id: id },
          { returnDocument: 'after', upsert: true }
        );
      })
    )) as Array<IPlayer>;
  }

  #getTeamElo(team: Array<IPlayer>) {
    return team.reduce((sum, player) => sum + player.elo, 0) / team.length;
  }

  async createMatch(teamA: Array<Snowflake>, teamB: Array<Snowflake>) {
    const refTeamA = await this.#mapDiscordIdsToPlayers(teamA);
    const refTeamB = await this.#mapDiscordIdsToPlayers(teamB);

    try {
      const eloTeamA = this.#getTeamElo(refTeamA);
      const eloTeamB = this.#getTeamElo(refTeamB);

      return (await this.#matchModel?.create({
        team_a: refTeamA,
        team_b: refTeamB,
        elo_a: eloTeamA,
        elo_b: eloTeamB,
      })) as IMatch;
    } catch (error) {
      console.error('[Database]', error);
      return null;
    }
  }

  async #registerMatchInPlayer(id: Types.ObjectId, enemyTeamElo: number, won: boolean) {
    const playerDoc = (await this.#playerModel?.findById(id)) as IPlayer;

    if (!playerDoc) console.error('[Database] Player not found -', id);

    const eloDifference = calculateElo(playerDoc.elo, enemyTeamElo, won ? 1 : 0);
    return await this.#playerModel?.findByIdAndUpdate(id, {
      $inc: {
        [won ? 'wins' : 'losses']: 1,
        elo: eloDifference,
      },
    });
  }

  async finishMatch(match: IMatch, winner: keyof typeof Teams) {
    try {
      for (const id of match.team_a) {
        await this.#registerMatchInPlayer(id, match.elo_b, winner === 'A');
      }
      for (const id of match.team_b) {
        await this.#registerMatchInPlayer(id, match.elo_a, winner === 'B');
      }

      return await this.#matchModel?.findByIdAndUpdate(
        match._id,
        { status: 'completed', winner },
        { returnDocument: 'after' }
      );
    } catch (error) {
      console.error('[Database]', error);
      return null;
    }
  }
}

export default Database;
