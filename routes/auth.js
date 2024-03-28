const express = require('express');
const router = express.Router();
const Player = require('../models/player');

// Route pour créer un nouveau joueur
router.post('/register', async (req, res) => {
  try {
    const { discordId, username } = req.body;

    // Vérifier si le joueur existe déjà
    let player = await Player.findOne({ discordId });
    if (player) {
      return res.status(400).json({ message: 'Player already exists' });
    }

    // Créer un nouveau joueur
    player = new Player({ discordId, username });
    await player.save();

    res.status(200).json({ message: 'Player created successfully', player });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;