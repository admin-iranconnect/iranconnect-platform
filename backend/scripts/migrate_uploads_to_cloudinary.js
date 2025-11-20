// backend/scripts/migrate_uploads_to_cloudinary.js
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import db from "../db/index.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(process.cwd(), "uploads");

// ✅ تنظیم Cloudinary از .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * 📤 آپلود فایل در Cloudinary
 */
async function uploadToCloudinary(filePath, folder = "uploads_secure") {
  try {
    const res = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "auto",
    });
    return res.secure_url;
  } catch (err) {
    console.error("❌ Cloudinary upload error:", err.message);
    return null;
  }
}

/**
 * 🔍 بررسی و انتقال فایل‌های محلی
 */
async function migrateFiles() {
  console.log("🚀 Starting migration to Cloudinary...");

  // 1️⃣ انتقال تصاویر businesses
  const businesses = await db.query(
    "SELECT id, image_url FROM businesses WHERE image_url LIKE '/uploads/%'"
  );

  let migrated = 0;
  for (const biz of businesses.rows) {
    const filePath = path.join(process.cwd(), biz.image_url.replace(/^\//, ""));
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ File missing: ${filePath}`);
      continue;
    }

    const cloudUrl = await uploadToCloudinary(filePath, "business_images");
    if (cloudUrl) {
      await db.query("UPDATE businesses SET image_url=$1 WHERE id=$2", [
        cloudUrl,
        biz.id,
      ]);
      console.log(`✅ [Business #${biz.id}] Uploaded → ${cloudUrl}`);
      migrated++;
    }
  }

  // 2️⃣ انتقال فایل‌های business_claims
  const claims = await db.query(
    "SELECT id, document_url FROM business_claims WHERE document_url LIKE '/uploads/%'"
  );

  for (const claim of claims.rows) {
    const filePath = path.join(process.cwd(), claim.document_url.replace(/^\//, ""));
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Claim doc missing: ${filePath}`);
      continue;
    }

    const cloudUrl = await uploadToCloudinary(filePath, "claim_docs");
    if (cloudUrl) {
      await db.query("UPDATE business_claims SET document_url=$1 WHERE id=$2", [
        cloudUrl,
        claim.id,
      ]);
      console.log(`✅ [Claim #${claim.id}] Uploaded → ${cloudUrl}`);
      migrated++;
    }
  }

  console.log(`\n🎯 Migration completed successfully!`);
  console.log(`✅ ${migrated} files uploaded to Cloudinary.`);
  process.exit(0);
}

/**
 * 🚀 اجرای اسکریپت
 */
migrateFiles().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
