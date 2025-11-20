//backend/routes/businesses.js
import express from "express";
import db from "../db.js";
import jwt from "jsonwebtoken";

const router = express.Router();

/**
 * 🟩 لیست کشورها (Distinct)
 * GET /api/businesses/countries
 */
router.get("/countries", async (_req, res) => {
  try {
    const r = await db.query(
      "SELECT DISTINCT country FROM businesses WHERE country IS NOT NULL AND country <> '' ORDER BY country ASC"
    );
    res.json(r.rows);
  } catch (err) {
    console.error("GET /businesses/countries error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * 🟦 لیست شهرهای یک کشور (Distinct)
 * GET /api/businesses/cities?country=FR
 */
router.get("/cities", async (req, res) => {
  const { country } = req.query;
  if (!country) return res.status(400).json({ error: "country is required" });

  try {
    const r = await db.query(
      "SELECT DISTINCT city FROM businesses WHERE country=$1 AND city IS NOT NULL AND city <> '' ORDER BY city ASC",
      [country]
    );
    res.json(r.rows);
  } catch (err) {
    console.error("GET /businesses/cities error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * 🟨 کتگوری‌ها در یک شهر خاص
 * GET /api/businesses/categories?country=FR&city=Nice
 */
router.get("/categories", async (req, res) => {
  const { country, city } = req.query;
  if (!country || !city)
    return res.status(400).json({ error: "country and city required" });

  try {
    const sql = `
      SELECT DISTINCT category
      FROM businesses
      WHERE country=$1 AND city=$2 AND category IS NOT NULL AND category <> ''
      ORDER BY category ASC
    `;
    const r = await db.query(sql, [country, city]);
    res.json(r.rows);
  } catch (err) {
    console.error("GET /businesses/categories error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * 🟩 ساب‌کتگوری‌ها در یک شهر و کتگوری خاص
 * GET /api/businesses/subcategories?country=FR&city=Nice&category=Doctor
 */
router.get("/subcategories", async (req, res) => {
  const { country, city, category } = req.query;
  if (!country || !city || !category)
    return res
      .status(400)
      .json({ error: "country, city and category required" });

  try {
    const sql = `
      SELECT DISTINCT sub_category
      FROM businesses
      WHERE country=$1 AND city=$2 AND category=$3
      AND sub_category IS NOT NULL AND sub_category <> ''
      ORDER BY sub_category ASC
    `;
    const r = await db.query(sql, [country, city, category]);
    res.json(r.rows);
  } catch (err) {
    console.error("GET /businesses/subcategories error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * 🟧 دریافت لیست بیزینس‌ها (با فیلترها + limit)
 */
router.get("/", async (req, res) => {
  const { country, city, category, subcategory, q, lat, lng, radius_km } =
    req.query;

  let limit = parseInt(req.query.limit, 10);
  if (isNaN(limit)) limit = 10;
  limit = Math.max(1, Math.min(limit, 50));

  try {
    if (lat && lng && radius_km) {
      const sql = `
        SELECT *, (
          6371 * acos(
            cos(radians($1)) * cos(radians(lat)) *
            cos(radians(lng) - radians($2)) +
            sin(radians($1)) * sin(radians(lat))
          )
        ) AS distance_km
        FROM businesses
        HAVING distance_km <= $3
        ORDER BY distance_km ASC
        LIMIT $4;
      `;
      const r = await db.query(sql, [
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(radius_km),
        limit,
      ]);
      return res.json(r.rows);
    }

    if (!country && !city && !category && !subcategory && !q) {
      const r = await db.query(
        "SELECT * FROM businesses ORDER BY created_at DESC LIMIT $1",
        [limit]
      );
      return res.json(r.rows);
    }

    let sql = "SELECT * FROM businesses WHERE 1=1";
    const params = [];

    if (country) {
      params.push(country);
      sql += ` AND country=$${params.length}`;
    }

    if (city) {
      params.push(city);
      sql += ` AND city=$${params.length}`;
    }

    if (category) {
      params.push(category);
      sql += ` AND category=$${params.length}`;
    }

    if (subcategory) {
      params.push(subcategory);
      sql += ` AND sub_category=$${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (name ILIKE $${params.length} OR address ILIKE $${params.length} OR category ILIKE $${params.length} OR sub_category ILIKE $${params.length})`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const r = await db.query(sql, params);
    res.json(r.rows);
  } catch (err) {
    console.error("GET /businesses error:", err);
    res.status(500).json({ error: "db error" });
  }
});

/**
 * 🟦 دریافت جزئیات بیزینس
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const r = await db.query("SELECT * FROM businesses WHERE id=$1", [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: "not found" });

    const biz = r.rows[0];
    const avg = await db.query(
      "SELECT ROUND(AVG(score)::numeric, 2) AS avg FROM ratings WHERE business_id=$1",
      [id]
    );
    biz.avg_rating = avg.rows[0].avg ? parseFloat(avg.rows[0].avg) : null;

    res.json(biz);
  } catch (err) {
    console.error("GET /businesses/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * 🟨 ثبت امتیاز برای بیزینس
 */
router.post("/:id/ratings", async (req, res) => {
  const { id } = req.params;
  const { score } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ error: "Missing authorization token" });

  const token = authHeader.split(" ")[1];
  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if (!score || score < 1 || score > 5)
    return res.status(400).json({ error: "Score must be between 1 and 5" });

  try {
    const bizCheck = await db.query("SELECT id FROM businesses WHERE id=$1", [
      id,
    ]);
    if (bizCheck.rowCount === 0)
      return res.status(404).json({ error: "Business not found" });

    const existing = await db.query(
      "SELECT id FROM ratings WHERE business_id=$1 AND user_id=$2",
      [id, userId]
    );
    if (existing.rowCount > 0)
      return res
        .status(400)
        .json({ error: "You have already rated this business." });

    await db.query(
      "INSERT INTO ratings (business_id, user_id, score, created_at) VALUES ($1, $2, $3, NOW())",
      [id, userId, score]
    );

    const avgRes = await db.query(
      "SELECT ROUND(AVG(score)::numeric, 2) AS avg FROM ratings WHERE business_id=$1",
      [id]
    );
    const avg = avgRes.rows[0]?.avg || 0;

    await db.query("UPDATE businesses SET avg_rating=$1 WHERE id=$2", [avg, id]);

    res.json({ message: "✅ Rating submitted successfully", average: avg });
  } catch (err) {
    console.error("POST /businesses/:id/ratings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
