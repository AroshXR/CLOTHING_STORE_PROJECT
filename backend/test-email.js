require('dotenv').config({ path: [require('path').join(__dirname, '.env.local'), require('path').join(__dirname, '.env')] });
const nodemailer = require('nodemailer');
const { getEmailBranding } = require('./services/siteSettingsService');
// Run explicitly to send a test message to your configured installation inbox.
async function testEmail() {
  const recipient = process.env.STOCK_ALERT_EMAIL || process.env.EMAIL_USER || process.env.SMTP_USER;
  if (!recipient) throw new Error('Configure STOCK_ALERT_EMAIL, EMAIL_USER or SMTP_USER first');
  const transporter = nodemailer.createTransport(process.env.SMTP_HOST
    ? { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587, secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
    : { service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
  await transporter.verify();
  const brand = await getEmailBranding();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.EMAIL_USER || process.env.SMTP_USER,
    to: recipient,
    subject: 'Inventory email configuration test',
    html: '<h1>Email system working</h1><p>Test message from ' + brand.name + '.</p>'
  });
  console.log('Test email sent to the configured installation inbox.');
}
if (require.main === module) testEmail().catch(error => { console.error('Email test failed:', error.message); process.exitCode = 1; });
module.exports = testEmail;
