const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const service = require('../services/siteSettingsService');
router.get('/manifest.webmanifest', async (req, res) => {
  const settings = await service.getPublicSettings();
  const apiOrigin = process.env.PUBLIC_API_URL || req.protocol + '://' + req.get('host');
  const siteOrigin = (process.env.PUBLIC_SITE_URL || req.get('Origin') || apiOrigin).replace(/\/+$/, '');
  res.set('Cache-Control', 'no-store').type('application/manifest+json').json({
    name: settings.name, short_name: settings.name.slice(0, 24), description: settings.tagline,
    id: siteOrigin + '/', start_url: siteOrigin + '/', scope: siteOrigin + '/',
    display: 'standalone', theme_color: settings.primaryColor, background_color: '#ffffff',
    icons: [{ src: settings.logoUrl ? new URL(settings.logoUrl, apiOrigin).href : siteOrigin + '/favicon.svg', sizes: 'any' }]
  });
});
router.get('/', async (_req, res) => res.set('Cache-Control', 'no-store').json({ status: 'ok', data: await service.getPublicSettings() }));
router.put('/', protect, adminOnly, async (req, res) => res.json({ status: 'ok', data: await service.update(req.body, req.user._id) }));
module.exports = router;
