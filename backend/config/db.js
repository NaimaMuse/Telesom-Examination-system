const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    throw new Error('Server configuration error: MONGODB_URI is not set');
  }

  const conn = await mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 10_000,
    ...(process.env.MONGO_REQUIRE_TLS === 'true' ? {tls:true,tlsAllowInvalidCertificates:false,tlsAllowInvalidHostnames:false,tlsInsecure:false} : {}),
  });
  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
