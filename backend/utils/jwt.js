const jwt = require('jsonwebtoken');
module.exports = userId => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  return jwt.sign({ id: String(userId) }, process.env.JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });
};
