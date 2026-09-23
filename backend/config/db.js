const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the MONGO_URI from the .env file.
 * Throws a clear error if the connection string is missing or wrong.
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error(
        'MONGO_URI is not defined. Did you create backend/.env from .env.example?'
      );
    }
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    console.log(`Database name: ${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection ERROR: ${error.message}`);
    console.error('--------------------------------------------------');
    console.error('FIX CHECKLIST:');
    console.error('1. Is MongoDB installed and running? (service name: MongoDB)');
    console.error('2. Did you fill MONGO_URI in backend/.env?');
    console.error('3. If using Atlas, is your IP whitelisted and password correct?');
    console.error('4. Check that dotenv is loaded before connectDB is called.');
    console.error('--------------------------------------------------');
    process.exit(1);
  }
};

module.exports = connectDB;