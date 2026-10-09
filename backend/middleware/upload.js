const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Only these image types are allowed (the extension comes from here, not from the user)
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir); },
  filename: function (req, file, cb) {
    cb(null, crypto.randomUUID() + ALLOWED[file.mimetype]);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 },   // 2 MB
  fileFilter: function (req, file, cb) {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    cb(new Error('Only JPG, PNG or WEBP images are allowed.'));
  }
}).single('poster');

// Wrapper so upload errors become a clean JSON message
function uploadPoster(req, res, next) {
  upload(req, res, function (err) {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be 2 MB or smaller.'
        : err.message;
      return res.status(400).json({ message: message });
    }
    next();
  });
}

module.exports = uploadPoster;