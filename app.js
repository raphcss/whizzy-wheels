const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const passport = require('passport');
const session = require('express-session');
const DiscordStrategy = require('passport-discord').Strategy;
const Player = require('./models/player');
const axios = require('axios');
const socketio = require('socket.io');
const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect('mongodb://localhost:27017/whizzy_wheels', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Error connecting to MongoDB:', err));

app.use(express.json());

// Définir le moteur de modèle EJS et le dossier de vues
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuration de la session
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Initialisation de Passport et de la session
app.use(passport.initialize());
app.use(passport.session());

// Configuration de la stratégie d'authentification Discord
passport.use(new DiscordStrategy({
  clientID: '1222791024578003054',
  clientSecret: 'Zc6njLqNfRGQOMS2sGIzgCb6Ko8esrf5',
  callbackURL: 'http://localhost:3000/auth/discord/callback',
  scope: ['identify', 'guilds', 'email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Recherchez le joueur dans la base de données MongoDB
    let player = await Player.findOne({ discordId: profile.id });

    // Si le joueur n'existe pas, créez un nouveau joueur
    if (!player) {
      player = new Player({
        discordId: profile.id,
        username: profile.username,
        balance: 1000
      });
      await player.save();
    }

    return done(null, player);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const player = await Player.findById(id);
    done(null, player);
  } catch (err) {
    done(err);
  }
});

// Middleware pour vérifier si l'utilisateur est authentifié
const isAuthenticated = (req, res, next) => {
  // Si l'utilisateur est authentifié, continuez
  if (req.isAuthenticated()) {
    return next();
  }
  // Sinon, redirigez l'utilisateur vers la page de connexion
  res.redirect('/auth/discord');
};

// Importer le modèle de voiture (assurez-vous que le chemin est correct)
const Car = require('./models/car');

// Définir la fonction pour récupérer les voitures de la base de données
const fetchCarsFromDatabase = async () => {
    try {
        // Utilisez la méthode find() de Mongoose pour récupérer toutes les voitures
        const cars = await Car.find();
        return cars;
    } catch (error) {
        console.error('Error fetching cars from database:', error);
        return []; // Retournez un tableau vide en cas d'erreur
    }
};

// Routes d'accès sécurisé avec isAuthenticated middleware
app.get('/profile', isAuthenticated, async (req, res) => {
    // Récupérer les informations de l'utilisateur connecté depuis req.user
    const user = req.user;
    // Récupérer les informations sur les voitures en compétition depuis la base de données
    const cars = await fetchCarsFromDatabase();
    // Rendre la vue profile.ejs en passant les données de l'utilisateur et les voitures
    res.render('profile', { user, cars }); 
});

app.get('/race_result', isAuthenticated, (req, res) => {
    res.render('race_result'); 
});

app.get('/race', isAuthenticated, async (req, res) => {
    // Récupérer les informations de l'utilisateur connecté depuis req.user
    const user = req.user;

    try {
        // Récupérer les informations sur la course actuelle depuis l'API
        const currentRaceResponse = await axios.get('http://localhost:4000/api/current-race');
        const currentRaceData = currentRaceResponse.data;
        const currentRace = currentRaceData.currentRace; // Accéder à l'objet de la course

        // Assurez-vous que les données sur la course actuelle sont correctement récupérées
        if (currentRace && currentRace.active) {
            try {
                // Récupérer les informations sur les voitures en compétition depuis l'API
                const carsResponse = await axios.get('http://localhost:4000/api/cars');
                const cars = carsResponse.data;

                // Si une course est active, rendre la vue race.ejs en passant les données de l'utilisateur, les voitures et l'état de la course actuelle
                res.render('race', { user, cars, currentRace }); 
            } catch (carsError) {
                console.error('Error fetching cars information:', carsError);
                res.render('waiting', { error: 'Technical issues. Please try again later.' });
            }
        } else {
            // Si aucune course n'est active, rendre la vue waiting.ejs
            res.render('waiting');
        }
    } catch (raceError) {
        console.error('Error fetching race information:', raceError);
        res.render('waiting', { error: 'Technical issues. Please try again later.' });
    }
});
// Autres routes...

// Route de connexion Discord
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    // Rediriger l'utilisateur vers une page spécifique après l'authentification
    res.redirect('/profile');
  }
);

// Route de déconnexion
app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

// Route d'accueil
app.get('/', (req, res) => {
  // Si l'utilisateur est connecté, redirigez-le vers la page de profil
  if (req.isAuthenticated()) {
    return res.redirect('/profile');
  }
  // Sinon, affichez la page d'accueil
  res.render('start');
});

const Bet = require('./models/bet');

// Lancer le serveur HTTP
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.post('/place_bet', isAuthenticated, async (req, res) => {
    // Logique pour placer un pari
    const { carId, amount } = req.body;
    console.log(req.body); // Affiche les données du pari (carId et amount
    const user = req.user;

    // Vérifier si l'utilisateur a suffisamment de fonds pour le pari
    if (user.balance < amount) {
        return res.status(400).send('Insufficient balance for the bet');
    }

    try {
      const response = await axios.post('http://localhost:4000/api/place-bet', {
            carId: carId,
            amount: amount,
            userId: req.user.discordId,
        });
        if (response.data.success) {
            // Deduct the bet amount from the user's balance
            user.balance -= amount;
            // Save the new balance to the database
            await user.save();
            // Send a success message to the client
            res.send('Bet placed successfully');
        } else {
            // Send an error message to the client
            res.status(400).send(response.data.error);
        }
    } catch (error) {
        console.error('Error placing bet:', error.response.data.error);
    }
});


// Créer une instance de socket.io attachée au serveur
const io = socketio(server);

// Logique pour gérer les étapes de la course et mettre à jour les clients via les sockets WebSocket
const runRaceSteps = async () => {
  try {
    // Récupérer les informations sur la course actuelle depuis l'API
    const currentRaceResponse = await axios.get('http://localhost:4000/api/current-race');
    const currentRaceData = currentRaceResponse.data;
    const currentRace = currentRaceData.currentRace; // Accéder à l'objet de la course

    // Envoyer les détails de la course aux clients via WebSocket
    io.emit('raceStarted', currentRace);

    // TODO: Implémenter les étapes de la course (fermeture des paris, simulation de la course, affichage du classement, etc.)
  } catch (error) {
    console.error('Error running race steps:', error);
    // Gérer les erreurs ici, par exemple en envoyant une réponse d'erreur ou en enregistrant l'erreur dans les journaux
  }
};

// Démarrer l'intervalle pour exécuter les étapes de la course
setInterval(runRaceSteps, 90000); // 90 secondes

// Gestionnaire d'événements pour la connexion des clients WebSocket
io.on('connection', (socket) => {
  console.log('Client connected');

  // Gestionnaire d'événement pour la déconnexion des clients WebSocket
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  })
} );