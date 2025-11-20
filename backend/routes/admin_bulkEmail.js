// backend/routes/admin_bulkEmail.js
import express from "express";
import multer from "multer";
import {
  sendBulkEmailController,
  getBulkEmailLogs,
  downloadBulkEmailPDF,
  downloadBulkEmailXLSX,
  downloadFilteredBulkEmailReport,
} from "../controllers/adminBulkEmailController.js";

const router = express.Router();

// 🧩 پیکربندی Multer برای دریافت ضمیمه‌ها در حافظه
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
});

// 📩 ارسال ایمیل گروهی (پشتیبانی از فایل ضمیمه)
router.post("/send", upload.array("attachments"), sendBulkEmailController);

// 📜 لیست لاگ‌ها
router.get("/logs", getBulkEmailLogs);

// 🧾 گزارش تکی PDF/XLSX
router.get("/report/:id/pdf", downloadBulkEmailPDF);
router.get("/report/:id/xlsx", downloadBulkEmailXLSX);

// 📊 گزارش فیلترشده (XLSX)
router.get("/report/filter", downloadFilteredBulkEmailReport);

export default router;
