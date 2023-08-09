import mongoose from 'mongoose';

import { BASE_ELO } from '../../elo.js';

const playerSchema = new mongoose.Schema({
  discord_id: { type: Number, required: true },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  elo: { type: Number, default: BASE_ELO },
});

export default playerSchema;
