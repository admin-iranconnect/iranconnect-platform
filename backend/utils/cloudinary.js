// backend/utils/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload buffer directly to Cloudinary via stream
 */
export async function uploadToCloudinary(buffer, fileName, folder = "uploads_secure", mimetype = "") {
  return new Promise((resolve, reject) => {
    // ✅ تشخیص نوع فایل برای جلوگیری از خرابی PDF یا WEBP
    let resourceType = "image";
    if (
      mimetype &&
      (mimetype.includes("pdf") ||
        mimetype.includes("webp") ||
        mimetype.includes("zip") ||
        mimetype.includes("doc") ||
        mimetype.includes("msword") ||
        mimetype.includes("application"))
    ) {
      resourceType = "raw";
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: fileName.replace(/\.[^/.]+$/, ""), // حذف پسوند از نام
        resource_type: resourceType, // 🔹 تغییر هوشمندانه نوع فایل
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
 * Delete file from Cloudinary by URL
 */
export async function deleteFromCloudinary(imageUrl) {
  try {
    if (!imageUrl || !imageUrl.includes("res.cloudinary.com")) {
      console.warn("⚠️ No valid Cloudinary URL provided. Skipping delete.");
      return null;
    }

    // 📦 استخراج public_id از URL
    const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
    if (!match || !match[1]) {
      console.warn("⚠️ Could not extract public_id from URL:", imageUrl);
      return null;
    }

    const publicId = match[1];

    // 🗑 حذف فایل از Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`🧹 Deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (err) {
    console.error("❌ Error deleting from Cloudinary:", err.message);
    return null;
  }
}
