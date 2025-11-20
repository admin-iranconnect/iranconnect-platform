//backend/routes/admin_businesses.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import db from "../db.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"; // ✅ اضافه شد

const router = express.Router();

/* ==========================
   📂 تنظیمات ذخیره فایل‌ها
========================== */
const storage = multer.memoryStorage(); // ✅ فقط در حافظه
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB مثل قبل
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype))
      return cb(new Error("Only JPG, PNG, WEBP are allowed"));
    cb(null, true);
  },
});

/* ==========================
   🧾 افزودن بیزینس جدید
========================== */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const {
      name,
      category,
      sub_category,
      country,
      city,
      address,
      postal_code,
      phone,
      email,
      website,
      location,
      lat,
      lng,
    } = req.body;

    console.log("📦 Received body from frontend:", req.body);
    console.log("📸 File uploaded:", req.file ? req.file.filename : "No file uploaded");

    const required = [
      "name",
      "category",
      "sub_category",
      "country",
      "city",
      "address",
      "postal_code",
      "location",
    ];
    for (const f of required) {
      if (!req.body[f]) {
        return res.status(400).json({ error: `${f} is required` });
      }
    }

    if (!req.file)
      return res.status(400).json({ error: "Picture upload is required" });

    // ✅ حفظ منطق نام‌گذاری فایل مثل قبل
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(req.file.originalname);
    const cloudFileName = req.file.fieldname + "-" + uniqueSuffix + ext;

    // ☁️ آپلود فایل به Cloudinary
    const cloudRes = await uploadToCloudinary(req.file.buffer, cloudFileName, "business_images");
    const imageUrl = cloudRes.secure_url;    

    const sql = `
      INSERT INTO businesses
      (name, category, sub_category, country, city, address, postal_code,
       phone, email, website, location, lat, lng, image_url, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
      RETURNING id
    `;

    const values = [
      name,
      category,
      sub_category,
      country,
      city,
      address,
      postal_code,
      phone || null,
      email || null,
      website || null,
      location,
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null,
      imageUrl,
    ];

    const result = await db.query(sql, values);
    res.json({
      success: true,
      message: "✅ Business added successfully!",
      id: result.rows[0].id,
      image_url: imageUrl,
    });
  } catch (err) {
    console.error("❌ Error adding business:", err);
    res.status(500).json({ error: "Server error adding business" });
  }
});

/* ==========================
   📄 دریافت جزئیات بیزینس (برای صفحه ادیت)
========================== */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const r = await db.query("SELECT * FROM businesses WHERE id=$1", [id]);
    if (r.rowCount === 0)
      return res.status(404).json({ error: "Business not found" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching business:", err);
    res.status(500).json({ error: "Server error fetching business" });
  }
});

/* ==========================
   ✏️ ویرایش بیزینس موجود
========================== */
router.put("/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  try {
    const {
      name,
      category,
      sub_category,
      country,
      city,
      address,
      postal_code,
      phone,
      email,
      website,
      location,
      lat,
      lng,
    } = req.body;

    // بررسی وجود بیزینس
    const existing = await db.query("SELECT * FROM businesses WHERE id=$1", [id]);
    if (existing.rowCount === 0)
      return res.status(404).json({ error: "Business not found" });

    let imageUrl = existing.rows[0].image_url;

    if (req.file) {

      // 🧹 حذف تصویر قبلی از Cloudinary اگر وجود دارد
      if (existing.rows[0].image_url) {
        await deleteFromCloudinary(existing.rows[0].image_url);  
      }  
      // ✅ حفظ منطق نام‌گذاری قبلی
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(req.file.originalname);
      const cloudFileName = req.file.fieldname + "-" + uniqueSuffix + ext;

      // ☁️ آپلود جدید در Cloudinary
      const cloudRes = await uploadToCloudinary(req.file.buffer, cloudFileName, "business_images");
      imageUrl = cloudRes.secure_url;

      // ⚠️ حذف فایل محلی غیرفعال شد (Cloudinary مدیریت می‌کند)
    }

    const sql = `
      UPDATE businesses
      SET name=$1, category=$2, sub_category=$3, country=$4, city=$5,
          address=$6, postal_code=$7, phone=$8, email=$9, website=$10,
          location=$11, lat=$12, lng=$13, image_url=$14, updated_at=NOW()
      WHERE id=$15
      RETURNING *;
    `;

    const values = [
      name,
      category,
      sub_category,
      country,
      city,
      address,
      postal_code,
      phone || null,
      email || null,
      website || null,
      location,
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null,
      imageUrl,
      id,
    ];

    const result = await db.query(sql, values);
    res.json({
      success: true,
      message: "✅ Business updated successfully!",
      business: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating business:", err);
    res.status(500).json({ error: "Server error updating business" });
  }
});


/* ==========================
   📄 دریافت لیست بیزینس‌ها (با قابلیت جستجو)
========================== */
router.get("/", async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim().toLowerCase() : "";
    let sql = `
      SELECT id, name, category, country, city
      FROM businesses
    `;
    let params = [];
    if (q) {
      sql += ` WHERE LOWER(name) LIKE $1 OR LOWER(city) LIKE $1 OR LOWER(category) LIKE $1`;
      params.push(`%${q}%`);
    }
    sql += " ORDER BY id DESC";
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching businesses:", err);
    res.status(500).json({ error: "Database error fetching businesses" });
  }
});

/* ==========================
   ❌ حذف بیزینس
========================== */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const check = await db.query("SELECT image_url FROM businesses WHERE id=$1", [id]);
    if (check.rowCount === 0)
      return res.status(404).json({ error: "Business not found" });

    const imageUrl = check.rows[0].image_url;
    if (imageUrl) {
      await deleteFromCloudinary(imageUrl);
    }

    await db.query("DELETE FROM businesses WHERE id=$1", [id]);
    res.json({
      success: true,
      message: "✅ Business and its image deleted successfully",
    });

  } catch (err) {
    console.error("❌ Error deleting business:", err);
    res.status(500).json({ error: "Server error deleting business" });
  }
});

export default router;
