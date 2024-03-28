const mongoose = require('mongoose');

// Définir le schéma de la voiture
const carSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    speed: {
        type: Number,
        required: true
    }
});

// Créer le modèle de voiture à partir du schéma
const Car = mongoose.model('Car', carSchema);

// Exporter le modèle de voiture pour l'utiliser dans d'autres parties de l'application
module.exports = Car;