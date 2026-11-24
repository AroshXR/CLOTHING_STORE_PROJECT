const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const file = path.join(__dirname, '.env');
const localFile = path.join(__dirname, '.env.local');
const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
let local = fs.existsSync(localFile) ? fs.readFileSync(localFile, 'utf8') : '';
const keys = new Set(local.split(/\r?\n/).map(line => /^\s*([\w]+)\s*=/.exec(line)?.[1]).filter(Boolean));
for (const line of source.split(/\r?\n/)) {
  const key = /^\s*([\w]+)\s*=/.exec(line)?.[1];
  if (key && !keys.has(key)) { local += '\n' + line; keys.add(key); }
}
if (!/^\s*JWT_SECRET\s*=\s*\S+/m.test(local)) local += '\nJWT_SECRET=' + randomBytes(48).toString('hex') + '\n';
fs.writeFileSync(localFile, local.trim() + '\n', { mode: 0o600 });
fs.writeFileSync(file, '# Local credentials are stored in the ignored .env.local file.\n# Use .env.example as a non-secret deployment reference.\n');
console.log('Local settings retained in backend/.env.local. No credential values were displayed.');
