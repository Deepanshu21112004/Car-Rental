const mongoose = require('mongoose');
async function connectDB() {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing in .env');
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('Mongo DB Connection Error:', error.message);
        process.exit(1);
    }
}
module.exports = connectDB;
