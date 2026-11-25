const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { protect, adminOnly, isAdmin } = require('./middleware/auth');

module.exports = function createApp() {
  const app = express();
  app.disable('x-powered-by');
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(value => value.trim()).filter(Boolean);
  app.use(cors({ origin(origin, done) {
    if (!origin || origins.includes(origin)) return done(null, true);
    const error = new Error('Origin is not allowed'); error.statusCode = 403; done(error);
  }, allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'] }));
  app.use(express.json({ limit: '1mb' }));
  app.use((_req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); });

  app.get('/uploads/resumes/:filename', protect, async (req, res) => {
    const Applicant = require('./models/ApplicantModel');
    if (path.basename(req.params.filename) !== req.params.filename) return res.sendStatus(400);
    const query = { 'resume.filename': req.params.filename };
    if (!isAdmin(req.user)) query.gmail = req.user.email.toLowerCase();
    const application = await Applicant.findOne(query);
    if (!application) return res.sendStatus(404);
    const file = path.join(__dirname, 'uploads', 'resumes', application.resume.filename);
    if (!fs.existsSync(file)) return res.sendStatus(404);
    res.download(file, application.resume.originalName || 'resume');
  });
  app.use('/uploads/resumes', (_req, res) => res.sendStatus(404));
  app.get('/uploads/:filename', require('./middleware/auth').optionalAuth, require('./controllers/ImageAccessController').serve);

  const routers = {
    '/site-settings': './routes/SiteSettingsRoutes',
    '/users': './routes/UserRoutes', '/applicant': './routes/ApplicantRoutes', '/jobs': './routes/JobRoutes',
    '/supplier': './routes/SupplierRoutes', '/cloth-customizer': './routes/ClothCustomizerRoutes',
    '/customizer-prices': './routes/CustomizerPricesRoutes', '/upload': './routes/UploadRoutes',
    '/payment': './routes/PaymentRoutes', '/inventory': './routes/InventoryRoutes', '/clothing': './routes/ClothingRoutes',
    '/analytics': './routes/AnalyticsRoutes', '/orders': './routes/OrderRoutes',
    '/api/tailors': './routes/TailorRoutes', '/api/custom-orders': './routes/CustomOrderRoutes',
    '/api/owner': './routes/ownerRoutes', '/api/booking': './routes/bookingRoutes'
  };
  for (const [prefix, file] of Object.entries(routers)) app.use(prefix, require(file));
  const auth = require('./controllers/AuthController');
  app.post('/register', auth.register);
  app.post('/login', auth.login);
  app.use((_req, res) => res.status(404).json({ status: 'error', message: 'Route not found' }));
  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode || (['ValidationError', 'CastError', 'MulterError'].includes(error.name) ? 400 : error.code === 11000 ? 409 : 500);
    if (statusCode >= 500) console.error('Request failed:', error.name);
    res.status(statusCode).json({ status: 'error', message: statusCode >= 500 && !error.statusCode ? 'Internal server error' : error.code === 11000 ? 'A conflicting record already exists' : error.message });
  });
  return app;
};
