const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Upload = require('../models/Upload');
const { protect, optionalAuth } = require('../middleware/auth');
const directory = path.join(__dirname, '..', 'uploads');
const imageTypes = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, done) => fs.mkdir(directory, { recursive: true }, error => done(error, directory)),
    filename: (_req, file, done) => done(null, 'image-' + require('crypto').randomUUID() + imageTypes[file.mimetype])
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, done) => done(imageTypes[file.mimetype] ? null : new Error('Only PNG, JPEG, GIF and WebP images are accepted'), Boolean(imageTypes[file.mimetype]))
});
router.post('/image', protect, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'Select an image' });
  try { await Upload.create({ filename: req.file.filename, userId: req.user._id, originalName: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size }); }
  catch (error) { fs.unlink(req.file.path, () => {}); throw error; }
  res.json({ status: 'ok', data: { filename: req.file.filename, url: '/uploads/' + req.file.filename } });
});
router.get('/uploads/:filename', optionalAuth, require('../controllers/ImageAccessController').serve);
module.exports = router;
