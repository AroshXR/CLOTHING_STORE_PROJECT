require('dotenv').config({ path: [require('path').join(__dirname, '.env.local'), require('path').join(__dirname, '.env')] });
const mongoose = require('mongoose');
const http = require('http');
const createApp = require('./createApp');
const app = createApp();
async function start() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error('MONGODB_URI and JWT_SECRET must be configured');
  await mongoose.connect(process.env.MONGODB_URI, {
    family: 4, serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000,
    retryWrites: true, w: 'majority', dbName: process.env.MONGODB_DBNAME
  });
  const server = http.createServer(app);
  require('./utils/socket').initSocket(server);
  require('./services/reminderScheduler').startReminderScheduler();
  server.listen(process.env.PORT || 5001, () => console.log('Backend server started'));
  return server;
}
if (require.main === module) start().catch(error => { console.error('Backend startup failed:', error.message); process.exitCode = 1; });
module.exports = app;
module.exports.start = start;

