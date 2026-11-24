const multer = require('multer');
const path = require('path');
const fs = require('fs');
const images = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const documents = [...images, 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
module.exports = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, done) => {
      const directory = path.join(__dirname, '..', 'private-uploads');
      fs.mkdir(directory, { recursive: true }, error => done(error, directory));
    },
    filename: (_req, file, done) => done(null, require('crypto').randomUUID() + path.extname(file.originalname).toLowerCase())
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, done) => {
    const allowed = (file.fieldname === 'document' ? documents : images).includes(file.mimetype);
    done(allowed ? null : new Error('Unsupported upload type'), allowed);
  }
});
