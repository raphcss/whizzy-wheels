const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 1000
  },
  bet: {
    type: Number
  }
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;
