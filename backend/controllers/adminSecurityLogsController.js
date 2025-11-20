// backend/controllers/adminSecurityLogsController.js
import db from "../db.js";

/**
 * 📜 Get Security Logs (Password Reset)
 * Combines data from reset_pass_requests + reset_pass_emails
 */
export async function getSecurityLogs(req, res) {
  try {
    const { status } = req.query;

    let query = `
      SELECT 
        r.id,
        r.email,
        r.status,
        r.ip_address,
        r.user_agent,
        r.created_at,
        r.expires_at,
        r.used_at,
        ARRAY(
          SELECT e.status 
          FROM reset_pass_emails e 
          WHERE e.reset_request_id = r.id
        ) AS related_emails
      FROM reset_pass_requests r
      ORDER BY r.created_at DESC
      LIMIT 500
    `;

    if (status && status !== "all") {
      query = `
        SELECT 
          r.id,
          r.email,
          r.status,
          r.ip_address,
          r.user_agent,
          r.created_at,
          r.expires_at,
          r.used_at,
          ARRAY(
            SELECT e.status 
            FROM reset_pass_emails e 
            WHERE e.reset_request_id = r.id
          ) AS related_emails
        FROM reset_pass_requests r
        WHERE r.status = $1
        ORDER BY r.created_at DESC
        LIMIT 500
      `;
      const result = await db.query(query, [status]);
      return res.json(result.rows);
    } else {
      const result = await db.query(query);
      return res.json(result.rows);
    }
  } catch (err) {
    console.error("getSecurityLogs ERROR:", err);
    res.status(500).json({ error: "Failed to load logs" });
  }
}
