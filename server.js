const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// 1. Load environment variables from .env file
dotenv.config();

// 2. Initialize database connection
connectDB();

// 3. Initialize Express app
const app = express();

// 4. Basic standard middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Telesom Examination System API is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// 6. 404 handler for unknown routes
app.use(notFound);

// 7. Centralized Error Handler
app.use(errorHandler);

// 8. Start server listening
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
