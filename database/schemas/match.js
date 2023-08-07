import mongoose from 'mongoose';

/**
 * Valid statuses: 'started', 'completed', 'cancelled'
 */

function teamValidator(v) {
  return v.length === 2;
}

function winnerValidator(v) {
  return !v || v === 'A' || v === 'B';
}

const matchSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'started' },
  team_a: {
    type: [{ type: mongoose.Types.ObjectId, ref: 'Player' }],
    validate: { validator: teamValidator },
    required: true,
  },
  team_b: {
    type: [{ type: mongoose.Types.ObjectId, ref: 'Player' }],
    validate: { validator: teamValidator },
    required: true,
  },
  elo_a: { type: Number, required: true },
  elo_b: { type: Number, required: true },
  winner: { type: String, validate: { validator: winnerValidator } },
});

export default matchSchema;
