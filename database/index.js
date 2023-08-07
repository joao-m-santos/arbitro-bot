import mongoose from 'mongoose';

import { calculateElo } from '../elo.js';

import playerSchema from './schemas/player.js';
import matchSchema from './schemas/match.js';

class Database {
  #url;
  #databaseName = 'test';
  #models;

  constructor(url, dbName) {
    this.#url = url;
    this.#databaseName = dbName;

    this.#connect().then(() => this.#registerModels());
  }

  async #connect() {
    try {
      await mongoose.connect(this.#url, { dbName: this.#databaseName });
      console.log('[Database] Connected to DB!');
    } catch (error) {
      console.error(error);
    }
  }

  #registerModels() {
    this.#models = {
      Player: mongoose.model('Player', playerSchema),
      Match: mongoose.model('Match', matchSchema),
    };
    console.log('[Database] Models registered:', Object.keys(this.#models));
  }

  async getPlayer(id) {
    try {
      return await this.#models.Player.findOne({ discord_id: id });
    } catch (error) {
      console.log('[Database]', error);
      return null;
    }
  }

  async getAllPlayers() {
    try {
      return await this.#models.Player.find();
    } catch (error) {
      console.log('[Database]', error);
      return null;
    }
  }

  async #mapDiscordIdsToPlayers(players) {
    return await Promise.all(
      players.map((id) => {
        // Finds it or creates it
        return this.#models.Player.findOneAndUpdate(
          { discord_id: id },
          { discord_id: id },
          { returnDocument: 'after', upsert: true }
        );
      })
    );
  }

  #getTeamElo(team) {
    return team.reduce((sum, player) => sum + player.elo, 0) / team.length;
  }

  async createMatch(teamA, teamB) {
    const refTeamA = await this.#mapDiscordIdsToPlayers(teamA);
    const refTeamB = await this.#mapDiscordIdsToPlayers(teamB);

    try {
      const eloTeamA = await this.#getTeamElo(refTeamA);
      const eloTeamB = await this.#getTeamElo(refTeamB);

      return await this.#models.Match.create({
        team_a: refTeamA,
        team_b: refTeamB,
        elo_a: eloTeamA,
        elo_b: eloTeamB,
      });
    } catch (error) {
      console.log('[Database]', error);
      return null;
    }
  }

  async finishMatch(match, winner) {
    try {
      for (const id of match.team_a) {
        const playerDoc = await this.#models.Player.findById(id);

        const eloDifference = calculateElo(playerDoc.elo, match.elo_b, winner === 'A' ? 1 : 0);
        await this.#models.Player.findByIdAndUpdate(id, {
          $inc: {
            [winner === 'A' ? 'wins' : 'losses']: 1,
            elo: eloDifference,
          },
        });
      }

      for (const id of match.team_b) {
        const playerDoc = await this.#models.Player.findById(id);

        const eloDifference = calculateElo(playerDoc.elo, match.elo_a, winner === 'B' ? 1 : 0);
        await this.#models.Player.findByIdAndUpdate(id, {
          $inc: {
            [winner === 'B' ? 'wins' : 'losses']: 1,
            elo: eloDifference,
          },
        });
      }

      return await this.#models.Match.findByIdAndUpdate(
        match._id,
        { status: 'completed', winner },
        { returnDocument: 'after' }
      );
    } catch (error) {
      console.log('[Database]', error);
      return null;
    }
  }
}

export default Database;
