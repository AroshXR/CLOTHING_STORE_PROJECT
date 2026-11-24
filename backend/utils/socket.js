const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isAdmin } = require('../middleware/auth');

let ioInstance = null;

function initSocket(server) {
  if (ioInstance) return ioInstance;
  ioInstance = new Server(server, {
    cors: {
      origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(value => value.trim()).filter(Boolean),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: false
    }
  });

  // Applicant events contain private recruitment information.
  ioInstance.use(async (socket, next) => {
    try {
      if (!process.env.JWT_SECRET || typeof socket.handshake.auth?.token !== 'string') throw new Error('Authentication required');
      const decoded = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      if (typeof decoded.id !== 'string' || !/^[a-f\d]{24}$/i.test(decoded.id)) throw new Error('Invalid session');
      const user = await User.findById(decoded.id).select('_id type role');
      if (!user || !isAdmin(user)) throw new Error('Administrator access required');
      socket.data.userId = String(user._id);
      next();
    } catch (_) { next(new Error('Administrator authentication required')); }
  });

  ioInstance.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
}

function getIO() {
  return ioInstance;
}

module.exports = { initSocket, getIO };
