const mongoose = require('mongoose');

const raceSchema = new mongoose.Schema({
  active: {
    type: Boolean,
    default: false
  },
  winners: [{
    type: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  cars: [{
    name: {
      type: String
    },
    speed: {
      type: Number
    }
  }]
});

const Race = mongoose.model('Race', raceSchema);

module.exports = Race;
