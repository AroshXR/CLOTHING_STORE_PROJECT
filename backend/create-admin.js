const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function createAdmin({ username, email, address, password }) {
  if (typeof username !== 'string' || !username.trim() || username.length > 80 ||
      typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof address !== 'string' || !address.trim() ||
      typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password) > 72) {
    throw new Error('Provide a name, valid email, address, and password of at least 12 characters and at most 72 bytes.');
  }
  const identity = { username: username.trim(), email: email.trim().toLowerCase() };
  if (await User.exists({ $or: [{ username: identity.username }, { email: identity.email }] })) {
    throw new Error('An account already uses that name or email. No existing account was changed.');
  }
  return User.create({ ...identity, address: address.trim(), password: await bcrypt.hash(password, 12), type: 'Admin', role: 'admin' });
}

async function run() {
  const path = require('path');
  require('dotenv').config({ path: [path.join(__dirname, '.env.local'), path.join(__dirname, '.env')] });
  if (!process.env.MONGODB_URI) throw new Error('Configure MONGODB_URI in .env.local first.');
  if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal. Passwords are entered without echo.');
  const { Writable } = require('stream');
  const output = new Writable({ write(chunk, encoding, done) { if (!output.hidden) process.stdout.write(chunk, encoding); done(); } });
  const rl = require('readline').createInterface({ input: process.stdin, output, terminal: true });
  const ask = (question, hidden = false) => new Promise(resolve => {
    output.hidden = false;
    rl.question(question, answer => { output.hidden = false; if (hidden) process.stdout.write('\n'); resolve(answer); });
    output.hidden = hidden;
  });
  try {
    const username = await ask('Administrator username: ');
    const email = await ask('Administrator email: ');
    const address = await ask('Business address: ');
    const password = await ask('Password (at least 12 characters): ', true);
    if (password !== await ask('Confirm password: ', true)) throw new Error('Passwords do not match.');
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DBNAME, serverSelectionTimeoutMS: 30000 });
    await createAdmin({ username, email, address, password });
    console.log('Administrator created. Sign in and open Admin Hub -> Site Settings.');
  } finally { rl.close(); await mongoose.disconnect(); }
}
if (require.main === module) run().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { createAdmin };
