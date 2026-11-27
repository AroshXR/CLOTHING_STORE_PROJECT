const jwt = require('jsonwebtoken');
const User = require('../models/User');
const HttpError = require('../utils/HttpError');
const isAdmin = user => user?.type === 'Admin' || user?.role === 'admin';
const protect = async (req, res, next) => {
  const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ status: 'error', message: 'Authentication required' });
  if (!process.env.JWT_SECRET) return next(new HttpError(503, 'Authentication is not configured'));
  try {
    const decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded.id !== 'string' || !/^[a-f\d]{24}$/i.test(decoded.id)) throw new Error('Invalid subject');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ status: 'error', message: 'Account not found' });
    if (!User.schema.path('type').enumValues.includes(user.type)) return res.status(401).json({ status: 'error', message: 'This account type is no longer supported' });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.message === 'Invalid subject') {
      return res.status(401).json({ status: 'error', message: 'Your session is invalid or expired. Please sign in again.' });
    }
    next(error);
  }
};
const adminOnly = (req, res, next) => isAdmin(req.user) ? next() : res.status(403).json({ status: 'error', message: 'Administrator access required' });
const ownerOnly = (req, res, next) => (isAdmin(req.user) || req.user?.role === 'owner') ? next() : res.status(403).json({ status: 'error', message: 'Outfit owner access required' });
const selfOrAdmin = (req, res, next) => {
  if (!isAdmin(req.user) && String(req.params.id) !== String(req.user?._id)) return res.status(403).json({ status: 'error', message: 'You cannot access another account' });
  next();
};
const applicantAccess = async (req, res, next) => {
  if (isAdmin(req.user)) return next();
  const Applicant = require('../models/ApplicantModel');
  if (!/^[a-f\d]{24}$/i.test(req.params.id || '')) return res.status(400).json({ message: 'Invalid application ID' });
  const application = await Applicant.findById(req.params.id).select('gmail');
  if (!application || application.gmail.toLowerCase() !== req.user.email.toLowerCase()) return res.status(404).json({ message: 'Application not found' });
  next();
};
const optionalAuth = (req, res, next) => req.headers.authorization ? protect(req, res, next) : next();
module.exports = { protect, optionalAuth, adminOnly, ownerOnly, selfOrAdmin, applicantAccess, isAdmin };
