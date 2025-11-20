// backend/middleware/cacheImage.js
import fs from "fs";
import path from "path";
import axios from "axios";

const cacheDir = path.join(process.cwd(), "cache", "images");
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

/**
 * 🧩 دریافت و کش‌کردن تصاویر Cloudinary
 * GET /cdn/:filename?url=https://res.cloudinary.com/...
 */
export async function serveCachedImage(req, res) {
  try {
    const { url } = req.query;
    if (!url || !url.startsWith("http")) {
      return res.status(400).json({ error: "Invalid image URL" });
    }

    const filename = path.basename(url.split("?")[0]); // مثلا image.png
    const localPath = path.join(cacheDir, filename);

    // 🟢 اگر فایل در کش موجود است
    if (fs.existsSync(localPath)) {
      const stats = fs.statSync(localPath);
      const ageDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      if (ageDays < 7) {
        return res.sendFile(localPath);
      }
      // حذف کش قدیمی
      fs.unlinkSync(localPath);
    }

    // 🟠 دانلود از Cloudinary
    const response = await axios.get(url, { responseType: "arraybuffer" });
    fs.writeFileSync(localPath, response.data);
    res.setHeader("Content-Type", response.headers["content-type"]);
    return res.sendFile(localPath);
  } catch (err) {
    console.error("❌ Cache image error:", err.message);
    return res.status(500).json({ error: "Image fetch failed" });
  }
}
