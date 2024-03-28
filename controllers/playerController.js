// Exemple de contrôleur pour créer un nouveau joueur
const Player = require('../models/player');

const playerController = {};

playerController.createPlayer = async (discordId, username) => {
  try {
    let player = await Player.findOne({ discordId });
    if (player) {
      return { error: 'Player already exists' };
    }

    player = new Player({ discordId, username });
    await player.save();

    return { player };
  } catch (err) {
    console.error(err);
    return { error: 'Internal Server Error' };
  }
};

module.exports = playerController;