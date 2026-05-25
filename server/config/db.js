const mongoose = require('mongoose');

// Cache connection in serverless environments
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI).then((mongoose) => {
      console.log(`MongoDB connected: ${mongoose.connection.host}`);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error(`MongoDB connection error: ${e.message}`);
    throw e;
  }

  return cached.conn;
};

module.exports = connectDB;
