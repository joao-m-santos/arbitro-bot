import mongoose, { Document, Types } from 'mongoose';

import { TEAM_SIZE, Teams } from '../../util/team.ts';

export interface IMatch extends Document {
  date: Date;
  status: 'started' | 'completed' | 'cancelled';
  team_a: Array<Types.ObjectId>;
  team_b: Array<Types.ObjectId>;
  elo_a: number;
  elo_b: number;
  winner?: keyof typeof Teams;
}

function teamValidator(v: Array<Types.ObjectId>) {
  return v.length === TEAM_SIZE;
}

function winnerValidator(v: string) {
  return !v || v === 'A' || v === 'B';
}

const matchSchema = new mongoose.Schema<IMatch>({
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'started' },
  team_a: {
    type: [{ type: Types.ObjectId, ref: 'Player' }],
    validate: { validator: teamValidator },
    required: true,
  },
  team_b: {
    type: [{ type: Types.ObjectId, ref: 'Player' }],
    validate: { validator: teamValidator },
    required: true,
  },
  elo_a: { type: Number, required: true },
  elo_b: { type: Number, required: true },
  winner: { type: String, validate: { validator: winnerValidator } },
});

export default matchSchema;
