//backend/routes/uploads.js
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
// ✅ Secure upload route (new)
import secureUpload from "../middleware/uploadSecure.js";
import { handleSecureUpload } from "../controllers/uploadsController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.post("/secure", secureUpload.single("file"), handleSecureUpload);

// NOTE: this starter does not actually upload to S3. It simulates and returns a placeholder URL.
router.post('/logo', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const filename = uuidv4() + '-' + req.file.originalname.replace(/\s+/g, '_');
  // In production: upload to S3 and return real URL.
  const fakeUrl = `https://cdn.iranconnect.example/${filename}`;
  res.json({ url: fakeUrl });
});

export default router;
