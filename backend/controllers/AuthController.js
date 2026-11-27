const bcrypt = require('bcryptjs');
const User = require('../models/User');
const createToken = require('../utils/jwt');
const HttpError = require('../utils/HttpError');

exports.register = async (req, res) => {
  const { address, password, type = 'Customer' } = req.body;
  if (!['Customer', 'Applicant'].includes(type)) throw new HttpError(403, 'Staff accounts must be created by an administrator');
  const username = String(req.body.username || '').trim(), email = String(req.body.email || '').trim().toLowerCase();
  if (!username || !address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) {
    throw new HttpError(400, 'Username, address, a valid email, and a password of 8 to 72 bytes are required');
  }
  if (await User.findOne({ $or: [{ username }, { email }] })) throw new HttpError(409, 'Username or email is already registered');
  const user = await User.create({ username, address, email, password: await bcrypt.hash(password, 10), type, role: 'customer' });
  res.status(201).json({ status: 'ok', message: 'Account created', data: { id: user._id, username, email, type } });
};
exports.login = async (req, res) => {
  const { username, password, type } = req.body;
  if (typeof username !== 'string' || typeof password !== 'string' || !User.schema.path('type').enumValues.includes(type)) throw new HttpError(400, 'Username, password and a supported account type are required');
  const user = await User.findOne({ username: username.trim(), type });
  if (!user || !(await bcrypt.compare(password, user.password))) throw new HttpError(401, 'Invalid credentials');
  res.json({ status: 'ok', data: { token: createToken(user._id), user: {
    id: user._id, username: user.username, email: user.email, type: user.type, role: user.role
  } } });
};
