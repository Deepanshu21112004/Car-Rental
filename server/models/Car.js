const mongoose = require('mongoose');
const schema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        brand: { type: String, required: true },
        model: String,
        year: { type: Number, required: true },
        description: { type: String, required: true },
        hourlyRate: { type: Number, required: true, min: 1 },
        fuelType: {
            type: String,
            enum: ['Petrol', 'Diesel', 'Electric', 'Hybrid'],
            default: 'Petrol',
        },
        transmission: { type: String, enum: ['Automatic', 'Manual'], default: 'Automatic' },
        seats: { type: Number, default: 5 },
        features: [String],
        images: [String],
        location: { type: String, default: 'Amritsar' },
        isAvailable: { type: Boolean, default: true },
    },
    { timestamps: true }
);
module.exports = mongoose.model('Car', schema);
