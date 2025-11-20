// backend/routes/policies.js
import express from "express";
import jwt from "jsonwebtoken";
import db from "../db.js";

const router = express.Router();

/* Helper: تولید نسخه جدید */
function nextVersion(latest) {
  if (!latest) return "v1.0";
  const num = parseFloat(latest.replace("v", "")) + 0.1;
  return `v${num.toFixed(1)}`;
}

/* 🧩 دریافت تمام پالیسی‌ها (ادمین) */
router.get("/admin", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.email AS created_by_email
       FROM policies p
       LEFT JOIN users u ON p.created_by = u.id
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching policies:", err);
    res.status(500).json({ error: "Server error fetching policies" });
  }
});

/* 🧩 افزودن پالیسی جدید (ادمین) */
router.post("/admin", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Missing token" });
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { type, lang, content } = req.body;
    if (!type || !lang || !content)
      return res.status(400).json({ error: "Missing fields" });

    const user = await db.query("SELECT role FROM users WHERE id=$1", [
      decoded.id,
    ]);
    if (!user.rows.length || user.rows[0].role !== "admin")
      return res.status(403).json({ error: "Access denied" });

    const last = await db.query(
      "SELECT version FROM policies WHERE type=$1 AND lang=$2 ORDER BY created_at DESC LIMIT 1",
      [type, lang]
    );

    const newVersion = nextVersion(last.rows[0]?.version);

    const insert = await db.query(
      "INSERT INTO policies (type, lang, version, content, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [type, lang, newVersion, content, decoded.id]
    );

    res.json(insert.rows[0]);
  } catch (err) {
    console.error("Error adding policy:", err);
    res.status(500).json({ error: "Server error adding policy" });
  }
});

/* 🧩 ویرایش پالیسی (افزودن نسخه جدید خودکار) */
router.put("/admin/:id", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Missing token" });
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { id } = req.params;
    const { type, lang, content } = req.body;

    const old = await db.query("SELECT * FROM policies WHERE id=$1", [id]);
    if (!old.rows.length) return res.status(404).json({ error: "Policy not found" });

    const last = await db.query(
      "SELECT version FROM policies WHERE type=$1 AND lang=$2 ORDER BY created_at DESC LIMIT 1",
      [old.rows[0].type, old.rows[0].lang]
    );

    const newVersion = nextVersion(last.rows[0]?.version);

    const insert = await db.query(
      "INSERT INTO policies (type, lang, version, content, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [old.rows[0].type, old.rows[0].lang, newVersion, content, decoded.id]
    );

    res.json(insert.rows[0]);
  } catch (err) {
    console.error("Error updating policy:", err);
    res.status(500).json({ error: "Server error updating policy" });
  }
});

/* 🧩 حذف پالیسی */
router.delete("/admin/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM policies WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting policy:", err);
    res.status(500).json({ error: "Server error deleting policy" });
  }
});

/* 🕓 تاریخچه نسخه‌ها (Admin) */
router.get("/admin/history/:type/:lang", async (req, res) => {
  try {
    const { type, lang } = req.params;
    const history = await db.query(
      `SELECT p.*, u.email AS created_by_email
       FROM policies p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.type=$1 AND p.lang=$2
       ORDER BY created_at DESC`,
      [type, lang]
    );
    res.json(history.rows);
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: "Server error fetching history" });
  }
});

/* 🔁 بازگردانی نسخه قبلی */
router.post("/admin/restore/:id", async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Missing token" });
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { id } = req.params;

    const old = await db.query("SELECT * FROM policies WHERE id=$1", [id]);
    if (!old.rows.length) return res.status(404).json({ error: "Policy not found" });

    const { type, lang, content } = old.rows[0];

    const last = await db.query(
      "SELECT version FROM policies WHERE type=$1 AND lang=$2 ORDER BY created_at DESC LIMIT 1",
      [type, lang]
    );

    const newVersion = nextVersion(last.rows[0]?.version);

    const restored = await db.query(
      "INSERT INTO policies (type, lang, version, content, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [`${type}`, `${lang}`, `${newVersion} (restored)`, content, decoded.id]
    );

    res.json(restored.rows[0]);
  } catch (err) {
    console.error("Error restoring policy:", err);
    res.status(500).json({ error: "Server error restoring policy" });
  }
});

/* 🧩 دریافت آخرین نسخه برای نمایش عمومی */
router.get("/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const lang = req.query.lang || "en";

    const result = await db.query(
      "SELECT * FROM policies WHERE type=$1 AND lang=$2 ORDER BY created_at DESC LIMIT 1",
      [type, lang]
    );
    if (!result.rows.length)
      return res.status(404).json({ error: "Policy not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching latest policy:", err);
    res.status(500).json({ error: "Server error fetching latest policy" });
  }
});

export default router;
