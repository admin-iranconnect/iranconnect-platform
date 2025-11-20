// backend/middleware/upload.js
import multer from "multer";
import path from "path";

/* 📁 مسیر موقت ذخیره فایل‌ها */
const storage = multer.memoryStorage();

/* ✅ محدودسازی نوع فایل‌ها (امنیت بیشتر) */
const allowedTypes = ["image/jpeg", "image/png", "application/pdf", "image/webp"];

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // حداکثر 5 مگابایت
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only PDF, JPG, PNG, and WEBP files are allowed"));
    }
    cb(null, true);
  },
});
