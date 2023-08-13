import mongoose, { Document } from 'mongoose';
import { Snowflake } from 'discord.js';

import { BASE_ELO } from '../../util/elo.ts';

export interface IPlayer extends Document {
  discord_id: Snowflake;
  wins: number;
  losses: number;
  elo: number;
}

const playerSchema = new mongoose.Schema<IPlayer>({
  discord_id: { type: String, required: true },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  elo: { type: Number, default: BASE_ELO },
});

export default playerSchema;
