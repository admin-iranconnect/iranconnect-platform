// backend/middleware/uploadSecure.js
import multer from "multer";
import db from "../db.js";

/**
 * Secure multer middleware:
 * - Memory storage only
 * - File size limit (10 MB)
 * - File extension + MIME validation
 * - Auto log to file_scan_logs (with upload_source)
 */
const storage = multer.memoryStorage();

const allowedMimes = ["image/jpeg", "image/png", "application/pdf", "image/webp"];
const allowedExts = [".jpg", ".jpeg", ".png", ".pdf", ".webp"];

function isAllowed(file) {
  const ext = (file.originalname || "").toLowerCase();
  return allowedMimes.includes(file.mimetype) && allowedExts.some((e) => ext.endsWith(e));
}

const secureUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: async (req, file, cb) => {
    try {
      if (!isAllowed(file)) {
        await logFileScan(req, file, "error", "Invalid file type");
        return cb(new Error("❌ Only PDF, JPG, PNG, and WEBP files are allowed"), false);
      }

      // اگر فایل معتبر بود، ثبت در جدول file_scan_logs
      await logFileScan(req, file, "clean", null);
      cb(null, true);
    } catch (err) {
      console.error("⚠️ uploadSecure log error:", err.message);
      cb(null, true); // حتی اگر لاگ شکست بخوره آپلود ادامه پیدا می‌کنه
    }
  },
});

export default secureUpload;

/* ==========================================
   🧾 Helper: Log upload in file_scan_logs
   ========================================== */
async function logFileScan(req, file, status, errorMsg = null) {
  try {
    // 🔹 تشخیص عنوان فرم یا منبع آپلود
    let uploadSource = detectUploadSource(req);

    await db.query(
      `INSERT INTO file_scan_logs 
       (user_id, file_name, mime_type, file_size, scan_status, ip_address, upload_source, error_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        req.user?.id || null,
        file.originalname,
        file.mimetype,
        file.size,
        status,
        req.ip || null,
        uploadSource,
        errorMsg,
      ]
    );

    console.log(`🧾 File logged → ${file.originalname} (${uploadSource})`);
  } catch (err) {
    console.error("❌ Error logging file scan:", err.message);
  }
}

/* ==========================================
   🔍 Detect upload source dynamically
   ========================================== */
function detectUploadSource(req) {
  // 🔹 اولویت ۱: اگر فرم عنوان یا نوع مشخص دارد
  if (req.body?.form_title) return req.body.form_title.trim();
  if (req.body?.form_name) return req.body.form_name.trim();
  if (req.body?.request_type)
    return `form_${req.body.request_type.trim().toLowerCase()}`; // مثل form_update یا form_claim

  // 🔹 اولویت ۲: مسیر API
  if (req.originalUrl) {
    const cleanUrl = req.originalUrl.replace(/^\/api\//, "").split("?")[0];
    if (cleanUrl.includes("claim/start")) return "claim_form";
    if (cleanUrl.includes("admin/businesses")) return "admin_business_edit";
    if (cleanUrl.includes("requests")) return "business_request";
    if (cleanUrl.includes("businesses/add")) return "admin_add_business";
    return cleanUrl;
  }

  // 🔹 fallback نهایی
  return "unknown_source";
}
