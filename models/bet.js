const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true
  },
  carId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Bet = mongoose.model('Bet', betSchema);

module.exports = Bet;