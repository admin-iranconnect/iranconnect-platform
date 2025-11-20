//backend/scripts/cleanup_cache.js
/**
 * 🧹 cleanup_cache.js
 * -----------------------------------------------
 * Script to automatically clean cached Cloudinary images
 * older than X days (default 7 days, configurable via .env)
 *
 * ✅ Can be run manually:   node scripts/cleanup_cache.js
 * ✅ Can be scheduled via cron (runs daily at 10:00 AM)
 * ✅ Reads TTL from .env → CACHE_TTL_DAYS
 * -----------------------------------------------
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const CACHE_DIR = path.join(process.cwd(), "cache", "images");
const TTL_DAYS = parseInt(process.env.CACHE_TTL_DAYS || "7", 10);
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

console.log(`🧭 Cache directory: ${CACHE_DIR}`);
console.log(`🕒 Cleaning files older than ${TTL_DAYS} day(s)...`);

async function cleanupCache() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      console.log("⚠️ Cache directory does not exist. Skipping cleanup.");
      return;
    }

    const now = Date.now();
    const files = fs.readdirSync(CACHE_DIR);

    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > TTL_MS) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️ Deleted old cache file: ${file}`);
        }
      } catch (err) {
        console.warn(`⚠️ Error processing ${file}: ${err.message}`);
      }
    }

    if (deletedCount === 0) {
      console.log("✅ No old cache files found.");
    } else {
      console.log(`✅ Cleanup complete. ${deletedCount} file(s) deleted.`);
    }
  } catch (err) {
    console.error("❌ Error during cache cleanup:", err);
  }
}

cleanupCache();
