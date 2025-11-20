// backend/controllers/adminBlockedIPController.js
import db from "../db.js";

/* ============================================================
   GET: List Blocked IPs with Filters + Pagination
   (ONLY 1 record per IP — no repetition, clean output)
============================================================ */
export async function getBlockedIPs(req, res) {
  try {
    const {
      ip,
      status,
      page = 1,
      pageSize = 10,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const sizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 100);
    const offset = (pageNum - 1) * sizeNum;

    const params = [];
    let where = `WHERE 1=1`;

    if (ip) {
      params.push(`%${ip}%`);
      where += ` AND b.ip_address ILIKE $${params.length}`;
    }

    if (status) {
      params.push(status);
      where += ` AND b.status = $${params.length}`;
    }

    /* -------------------------------
       COUNT — clean count (no join)
    --------------------------------*/
    const countSql = `
      SELECT COUNT(*) AS total
      FROM blocked_ips b
      ${where}
    `;
    const countResult = await db.query(countSql, params);
    const total = parseInt(countResult.rows[0]?.total || "0", 10);
    const totalPages = Math.ceil(total / sizeNum);

    /* -------------------------------
       DATA — clean list, no repetition
    --------------------------------*/
    const dataSql = `
      SELECT
        b.*,
        u1.email AS blocked_by_email
      FROM blocked_ips b
      LEFT JOIN users u1 ON b.blocked_by = u1.id
      ${where}
      ORDER BY b.blocked_at DESC
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
    console.error("❌ Error loading blocked IPs:", err);
    res.status(500).json({ error: "Failed to load blocked IPs." });
  }
}

/* ============================================================
   GET: Blocked IP Details
   (Shows full single blocked record for this IP)
============================================================ */
export async function getBlockedIPDetails(req, res) {
  try {
    const ip = req.params.ip;

    const { rows } = await db.query(
      `
      SELECT
        b.*,
        u1.email AS blocked_by_email
      FROM blocked_ips b
      LEFT JOIN users u1 ON b.blocked_by = u1.id
      WHERE b.ip_address = $1
      ORDER BY b.blocked_at DESC
      LIMIT 1
      `,
      [ip]
    );

    res.json(rows.length ? rows[0] : {});
  } catch (err) {
    console.error("❌ Error fetching blocked IP details:", err);
    res.status(500).json({ error: "Failed to load IP details." });
  }
}

/* ============================================================
   POST: Unblock IP (Superadmin Only)
============================================================ */
export async function unblockBlockedIP(req, res) {
  try {
    const { ip_address, reason } = req.body;
    const admin = req.user;

    if (!ip_address || !reason)
      return res.status(400).json({ error: "IP address and reason are required." });

    if (admin.role !== "superadmin")
      return res.status(403).json({ error: "Only superadmins can unblock IPs." });

    const { rowCount } = await db.query(
      `
      UPDATE blocked_ips
      SET status='unblocked',
          unblocked_reason=$1,
          unblocked_by=$2,
          unblocked_at=NOW()
      WHERE ip_address=$3 AND status='blocked'
      `,
      [reason, admin.id, ip_address]
    );

    if (!rowCount)
      return res.status(404).json({ error: "No active block found for this IP." });

    res.json({ success: true, message: "IP unblocked successfully." });
  } catch (err) {
    console.error("❌ Error unblocking IP:", err);
    res.status(500).json({ error: "Failed to unblock IP." });
  }
}
