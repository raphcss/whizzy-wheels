const express = require('express');
const mongoose = require('mongoose');
const Race = require('./models/race');
const Car = require('./models/car');
const Bet = require('./models/bet');

const app = express();
app.use(express.json())
const PORT = process.env.PORT || 4000;

let currentRace = null; // Stocker la course active
let raceInterval = null; // Stocker l'intervalle pour les étapes de la course

// Connexion à la base de données MongoDB
mongoose.connect('mongodb://localhost:27017/whizzy_wheels', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  // Démarrer une nouvelle course au démarrage du serveur
  startNewRace();
})
.catch(err => console.error('Error connecting to MongoDB:', err));

async function deleteExistingCars() {
  try {
    await Car.deleteMany({}); // Supprimer toutes les voitures existantes
    console.log('Existing cars deleted');
  } catch (err) {
    console.error('Error deleting existing cars:', err);
    throw err;
  }
}

async function startNewRace() {
  try {
    // Vérifiez s'il y a déjà une course en cours
    if (currentRace) {
      console.log('There is already an active race');
      return;
    }
    
    // Supprimez les voitures existantes de la base de données
    await deleteExistingCars();

    // Générez les voitures pour la nouvelle course
    const cars = await generateCars();

    // Créez la nouvelle course dans la base de données
    currentRace = await Race.create({ active: true, winners: [], cars, createdAt: new Date()});

    console.log('New race started:', currentRace);

    // Démarrez les étapes de la course
    raceInterval = setInterval(runRaceSteps, 90000); // 90 secondes (30s de paris + 60s de course)
  } catch (err) {
    console.error('Error starting race:', err);
  }
}

// Fonction pour générer des voitures pour la course
async function generateCars() {
  try {
    const numCars = Math.floor(Math.random() * (7 - 3 + 1)) + 3;
    const cars = [];

    for (let i = 0; i < numCars; i++) {
      const speed = Math.floor(Math.random() * (150 - 80 + 1)) + 80; // Vitesse aléatoire entre 80 et 150
      cars.push({ name: `Car ${i + 1}`, speed });
    }

    // Enregistrez les voitures dans la base de données
    const createdCars = await Car.create(cars);

    return createdCars;
  } catch (err) {
    console.error('Error generating cars:', err);
    throw err;
  }
}


async function closeBettingPhase() {
  try {
    // Mettez à jour la course active pour fermer la phase de paris
    await Race.findByIdAndUpdate(currentRace._id, { bettingPhaseClosed: true });
    console.log('Betting phase closed');
  } catch (err) {
    console.error('Error closing betting phase:', err);
  }
}

async function simulateRace() {
  try {
    // Supposons que la course se déroule ici...
    console.log('Race simulated');
    // Ici, vous pouvez écrire la logique pour simuler la course
  } catch (err) {
    console.error('Error simulating race:', err);
  }
}

async function displayLeaderboardAndRewards() {
  try {
    // Supposons que le classement soit calculé ici...
    console.log('Leaderboard displayed and rewards distributed');
    // Ici, vous pouvez écrire la logique pour afficher le classement et distribuer les récompenses
  } catch (err) {
    console.error('Error displaying leaderboard and distributing rewards:', err);
  }
}

async function closeCurrentRace() {
  try {
    if (currentRace) {
      await Race.findByIdAndUpdate(currentRace._id, { active: false });
      console.log('Race closed:', currentRace);
      currentRace = null; // Réinitialiser la variable currentRace après la fermeture de la course
    }
  } catch (err) {
    console.error('Error closing race:', err);
    throw err; // Propager l'erreur pour la gérer plus haut si nécessaire
  }
}

async function endRace() {
  try {
    // Mettez à jour la course active pour la marquer comme terminée
    await Race.findByIdAndUpdate(currentRace._id, { active: false });
    console.log('Race ended');
    // Ici, vous pouvez écrire la logique pour nettoyer les données ou effectuer d'autres actions à la fin de la course
  } catch (err) {
    console.error('Error ending race:', err);
  }
}

// Fonction pour exécuter les étapes de la course
async function runRaceSteps() {
  try {
    // Vérifiez s'il y a une course active
    if (!currentRace) {
      console.log('No active race');
      clearInterval(raceInterval); // Arrêtez l'intervalle si aucune course active n'est trouvée
      return;
    }

    // Fermez les paris de la course
    console.log('Closing betting phase');
    await closeBettingPhase(); // Appel à la fonction pour fermer les paris

    // Simulez la course
    console.log('Running race');
    await simulateRace(); // Appel à la fonction pour simuler la course

    // Affichez le classement et distribuez les récompenses
    console.log('Displaying leaderboard and distributing rewards');
    await displayLeaderboardAndRewards(); // Appel à la fonction pour afficher le classement et distribuer les récompenses

    // Terminez la course
    console.log('Ending race');
    await endRace(); // Appel à la fonction pour terminer la course et nettoyer les données

    // Démarrer une nouvelle course
    startNewRace();
  } catch (err) {
    console.error('Error running race steps:', err);
  }
}

// Gestionnaire d'événement pour la fermeture du serveur
process.on('SIGINT', async () => {
  await closeCurrentRace();
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

// Route pour démarrer une nouvelle course
app.post('/api/start-race', async (req, res) => {
  try {
    await startNewRace();
    res.json({ message: 'New race started' });
  } catch (err) {
    console.error('Error starting race:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Route pour récupérer les détails de la course en cours
app.get('/api/current-race', async (req, res) => {
  try {
    // Trouver la course active dans la base de données
    const currentRace = await Race.findOne({ active: true });
    // Récupérer toutes les voitures depuis la base de données
    const cars = await Car.find();
    res.json({ currentRace, cars }); // Assurez-vous de renvoyer currentRace
  } catch (err) {
    console.error('Error fetching current race:', err);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/api/cars', async (req, res) => {
  try {
    // Récupérer toutes les voitures depuis la base de données
    const cars = await Car.find();
    // Envoyer les données des voitures en tant que réponse
    res.json(cars);
  } catch (error) {
    // En cas d'erreur, envoyer une réponse d'erreur
    console.error('Error fetching cars:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route pour placer un pari sur une voiture
app.post('/api/place-bet', async (req, res) => {
  try {
    const { userId, carId, amount } = req.body;
    
    // Vérifiez si la course est active
    if (!currentRace) {
      return res.status(400).json({ error: 'No active race' });
    }

    // Vérifiez si les paris sont ouverts
    const bettingPhase = checkBettingPhase(); // Fonction pour vérifier si les paris sont ouverts
    if (!bettingPhase) {
      return res.status(400).json({ error: 'Betting phase is closed' });
    }

    // Vérifiez si la voiture existe dans la course
    const carExists = await Car.findById(carId);
    if (!carExists) {
      return res.status(400).json({ error: 'Car not found in current race' });
    }

    // Créer un nouvel objet Bet pour enregistrer le pari dans la base de données
    const newBet = new Bet({
      discordId: userId,
      carId: carId,
      amount: amount,
      createdAt: new Date(),
    });

    // Enregistrer le pari dans la base de données
    await newBet.save();

    res.json({ success: true, message: 'Bet placed successfully' });
  } catch (err) {
    console.error('Error placing bet:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Fonction pour vérifier si les paris sont ouverts
// Fonction pour vérifier si les paris sont ouverts
function checkBettingPhase() {
  // Vérifiez si la course est active
  if (!currentRace || !currentRace.active) {
    return false; // Si la course n'est pas active, les paris ne sont pas ouverts
  }

  // Obtenez la date actuelle
  const currentTime = new Date();

  // Définissez la durée de la phase de paris en millisecondes (par exemple, 30 secondes)
  const bettingPhaseDuration = 30 * 1000; // 30 secondes

  // Calculez le temps limite pour la phase de paris en ajoutant la durée à l'heure de début de la course
  console.log(currentRace.createdAt)
  console.log(currentRace.createdAt.getTime())
  const bettingPhaseEndTime = new Date(currentRace.createdAt.getTime() + bettingPhaseDuration);

  // Vérifiez si le temps actuel est inférieur à la fin de la phase de paris
  if (currentTime < bettingPhaseEndTime) {
    return true; // Si le temps actuel est inférieur à la fin de la phase de paris, les paris sont ouverts
  } else {
    return false; // Sinon, la phase de paris est terminée
  }
}

// Autres routes et configurations...

// Lancer le serveur
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // Exporter votre application Express
