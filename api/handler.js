const { app, initializeDatabase } = require('../backend/server');

let databaseReady;

module.exports = async (req, res) => {
  databaseReady ??= initializeDatabase().catch((error) => {
    databaseReady = undefined;
    throw error;
  });

  try {
    await databaseReady;
  } catch (error) {
    console.error('Database initialization failed', error.name);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 503;
    res.end(JSON.stringify({ success: false, message: 'Database is unavailable' }));
    return;
  }

  return app(req, res);
};
