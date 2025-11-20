//backend/controllers/adminSuspiciousIPController.js
import db from "../db.js";

/* ============================================================
   GET: Last 10 Suspicious IPs (Used in admin sidebar preview)
   ============================================================ */
export async function getRecentSuspiciousIPs(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT 
          s.*, 
          COALESCE(b.status, 'not_blocked') AS block_status,
          b.automatic
       FROM suspicious_ips s
       LEFT JOIN blocked_ips b 
         ON s.ip_address = b.ip_address
        AND b.status IN ('blocked','unblocked')
       ORDER BY s.last_seen DESC
       LIMIT 10`
    );

    res.json({ data: rows });
  } catch (err) {
    console.error("❌ Error loading suspicious IPs:", err);
    res.status(500).json({ error: "Failed to load suspicious IPs." });
  }
}

/* ============================================================
   GET: Suspicious IP Details (/details/:id)
   Pagination added (page + pageSize)
   ============================================================ */
export async function getSuspiciousIPDetails(req, res) {
  try {
    // دریافت IP مستقیم از URL
    const ip_address = req.params.ip;

    if (!ip_address) {
      return res.status(400).json({ error: "IP address is required." });
    }

    // صفحه‌بندی
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.max(
      Math.min(parseInt(req.query.pageSize, 10) || 10, 100),
      1
    );
    const offset = (page - 1) * pageSize;

    // شمارش تعداد Incidentها
    const countResult = await db.query(
      `SELECT COUNT(*) AS total
       FROM suspicious_ips
       WHERE ip_address = $1`,
      [ip_address]
    );

    const total = parseInt(countResult.rows[0].total || "0", 10);
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;

    // دریافت Incidentهای صفحه فعلی
    const incidentsResult = await db.query(
      `SELECT id, suspicious_type, severity_level, count_attempts, first_seen, last_seen
       FROM suspicious_ips
       WHERE ip_address = $1
       ORDER BY last_seen DESC
       LIMIT $2 OFFSET $3`,
      [ip_address, pageSize, offset]
    );

    // دریافت Meta (blocked/unblocked, reason, etc.)
    const metaResult = await db.query(
      `SELECT
        s.ip_address,
        s.resolved,
        s.resolved_at,
        u_resolve.email AS resolved_by_email,
        COALESCE(b.status, 'not_blocked') AS block_status,
        b.reason AS block_reason,
        b.blocked_by,
        b.blocked_at,
        b.unblocked_by,
        b.unblocked_reason,
        b.unblocked_at,
        b.automatic,
        u1.email AS blocked_by_email,
        u2.email AS unblocked_by_email
      FROM suspicious_ips s
      LEFT JOIN blocked_ips b ON b.ip_address = s.ip_address
      LEFT JOIN users u1 ON b.blocked_by = u1.id
      LEFT JOIN users u2 ON b.unblocked_by = u2.id
      LEFT JOIN users u_resolve ON s.resolved_by = u_resolve.id
      WHERE s.ip_address = $1
      ORDER BY s.last_seen DESC
      LIMIT 1`,
      [ip_address]
    );

    return res.json({
      incidents: incidentsResult.rows,
      pagination: { page, pageSize, total, totalPages },
      meta: metaResult.rows[0] || {},
    });

  } catch (err) {
    console.error("❌ Error fetching Suspicious IP full logs:", err);
    res.status(500).json({ error: "Failed to load full IP log." });
  }
}

/* ============================================================
   POST: Manually Block an IP (Admin + Superadmin)
   ============================================================ */
export async function blockIPManually(req, res) {
  try {
    const { ip_address, reason } = req.body;
    const adminId = req.user?.id;

    if (!ip_address || !reason)
      return res.status(400).json({ error: "IP address and reason are required." });

    // Prevent blocking an already blocked IP
    const existing = await db.query(
      `SELECT id FROM blocked_ips 
       WHERE ip_address=$1 AND status='blocked'`,
      [ip_address]
    );

    if (existing.rowCount)
      return res.status(409).json({ error: "IP is already blocked." });

    // Insert into blocked_ips
    await db.query(
      `INSERT INTO blocked_ips
        (ip_address, reason, status, blocked_by, blocked_at, automatic)
       VALUES ($1, $2, 'blocked', $3, NOW(), false)`,
      [ip_address, reason, adminId]
    );

    // Resolve suspicious logs for this IP
    await db.query(
      `UPDATE suspicious_ips 
       SET resolved = true,
           resolved_at = NOW(),
           resolved_by = $1
       WHERE ip_address = $2`,
      [adminId, ip_address]
    );

    res.json({ success: true, message: "IP blocked successfully." });
  } catch (err) {
    console.error("❌ Manual block error:", err);
    res.status(500).json({ error: "Failed to block IP." });
  }
}
/* ============================================================
   POST: Unblock IP (Superadmin Only)
   ============================================================ */
export async function unblockIP(req, res) {
  try {
    const { ip_address, reason } = req.body;
    const admin = req.user;

    if (!ip_address || !reason)
      return res.status(400).json({ error: "IP address and reason are required." });

    if (admin.role !== "superadmin")
      return res.status(403).json({ error: "Only super admins can unblock IPs." });

    const { rowCount } = await db.query(
      `UPDATE blocked_ips
       SET status='unblocked',
           unblocked_reason=$1,
           unblocked_by=$2,
           unblocked_at=NOW()
       WHERE ip_address=$3 AND status='blocked'`,
      [reason, admin.id, ip_address]
    );

    if (!rowCount)
      return res.status(404).json({ error: "No active block found for this IP." });

    // resolve suspicious record
    await db.query(
      `UPDATE suspicious_ips
       SET resolved = true,
           resolved_at = NOW(),
           resolved_by = $1
       WHERE ip_address = $2`,
      [admin.id, ip_address]
    );

    res.json({ success: true, message: "IP unblocked successfully." });
  } catch (err) {
    console.error("❌ Unblock error:", err);
    res.status(500).json({ error: "Failed to unblock IP." });
  }
}

/* ============================================================
   GET: Total unresolved Suspicious IPs (for Sidebar Badge)
   ============================================================ */
export async function getSuspiciousIPCount(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*) FROM suspicious_ips WHERE resolved = false`
    );

    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (err) {
    console.error("❌ Error counting suspicious IPs:", err);
    res.status(500).json({ error: "Failed to count suspicious IPs." });
  }
}

/* ============================================================
   GET: Suspicious IPs with Filters + Pagination  
   **Modified to aggregate by IP**  
   ============================================================ */
export async function getSuspiciousIPs(req, res) {
  try {
    const {
      ip,
      type,
      severity,
      status,
      page = 1,
      pageSize = 10,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const sizeNum = Math.max(Math.min(parseInt(pageSize, 10) || 10, 100), 1);
    const offset = (pageNum - 1) * sizeNum;

    const params = [];
    let where = `WHERE 1=1`;

    if (ip) {
      params.push(`%${ip}%`);
      where += ` AND s.ip_address ILIKE $${params.length}`;
    }

    if (type) {
      params.push(type);
      where += ` AND EXISTS (
        SELECT 1 FROM suspicious_ips si
        WHERE si.ip_address = s.ip_address
          AND si.suspicious_type = $${params.length}
      )`;
    }

    if (severity) {
      params.push(severity);
      where += ` AND EXISTS (
        SELECT 1 FROM suspicious_ips si
        WHERE si.ip_address = s.ip_address
          AND si.severity_level = $${params.length}
      )`;
    }

    if (status === "blocked") {
      where += ` AND b.status = 'blocked'`;
    } else if (status === "unblocked") {
      where += ` AND b.status = 'unblocked'`;
    } else if (status === "not_blocked") {
      where += ` AND b.status IS NULL`;
    }

    const baseFrom = `
      FROM suspicious_ips s
      LEFT JOIN blocked_ips b
        ON s.ip_address = b.ip_address
       AND b.status IN ('blocked','unblocked')
    `;

    /* -------------------------------
       COUNT (unique IPs)
    --------------------------------*/
    const countSql = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT s.ip_address
        ${baseFrom}
        ${where}
        GROUP BY s.ip_address
      ) grouped
    `;
    const countResult = await db.query(countSql, params);
    const total = parseInt(countResult.rows[0]?.total || "0", 10);
    const totalPages = total > 0 ? Math.ceil(total / sizeNum) : 1;

    /* -------------------------------
       DATA (aggregated per IP)
    --------------------------------*/
    const dataSql = `
      SELECT
        s.ip_address,
        ARRAY_AGG(DISTINCT s.suspicious_type) AS suspicious_types,
        ARRAY_AGG(DISTINCT s.severity_level) AS severity_levels,
        SUM(s.count_attempts) AS total_attempts,
        COALESCE(b.status, 'not_blocked') AS block_status,
        b.automatic
      ${baseFrom}
      ${where}
      GROUP BY s.ip_address, b.status, b.automatic
      ORDER BY MAX(s.last_seen) DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;
    const dataParams = [...params, sizeNum, offset];
    const { rows } = await db.query(dataSql, dataParams);

    res.json({
      data: rows,
      pagination: {
        page: pageNum,
        pageSize: sizeNum,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error("❌ Error filtering suspicious IPs:", err);
    res.status(500).json({ error: "Failed to load suspicious IPs." });
  }
}

/* ============================================================
   GET: Count of Unblocked Suspicious IPs
   ============================================================ */
export async function getUnblockedSuspiciousCount(req, res) {
  try {
    const { rows } = await db.query(`
      SELECT COUNT(*) 
      FROM (
        SELECT s.ip_address
        FROM suspicious_ips s
        LEFT JOIN blocked_ips b
          ON s.ip_address = b.ip_address 
         AND b.status IN ('blocked','unblocked')
        WHERE b.status IS NULL
        GROUP BY s.ip_address
      ) grouped
    `);

    res.json({ count: parseInt(rows[0].count, 10) });
  } catch (err) {
    console.error("❌ Error getting unblocked suspicious count:", err);
    res.status(500).json({ error: "Failed to get count." });
  }
}
