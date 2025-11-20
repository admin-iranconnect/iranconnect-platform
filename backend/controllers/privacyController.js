// backend/controllers/privacyController.js
import pool from "../db.js";
import nodemailer from "nodemailer";

/**
 * Handle data removal or update requests.
 * Saves the request to the database and sends a notification email to admin.
 */
export async function submitDataRemovalRequest(req, res) {
  try {
    const { business_name, contact_email, request_type, message } = req.body;

    if (!business_name || !contact_email || !request_type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Insert into PostgreSQL
    const result = await pool.query(
      `INSERT INTO data_removal_requests 
        (business_name, contact_email, request_type, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [business_name, contact_email, request_type, message]
    );

    // ✅ Optional: send email notification to admin
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.ADMIN_EMAIL,
            pass: process.env.ADMIN_PASS,
          },
        });

        await transporter.sendMail({
          from: `"IranConnect" <no-reply@iranconnect.org>`,
          to: process.env.ADMIN_EMAIL,
          subject: `🗑️ New ${request_type.toUpperCase()} Request - ${business_name}`,
          html: `
            <h3>New Data Removal/Update Request</h3>
            <p><b>Business:</b> ${business_name}</p>
            <p><b>Email:</b> ${contact_email}</p>
            <p><b>Type:</b> ${request_type}</p>
            <p><b>Message:</b> ${message || "(none)"}</p>
            <p><small>Created at: ${result.rows[0].created_at}</small></p>
          `,
        });

        console.log(`📧 Email sent to admin for request ID ${result.rows[0].id}`);
      } catch (mailErr) {
        console.warn("⚠️ Email notification failed:", mailErr.message);
      }
    } else {
      console.warn("⚠️ Skipping email notification (missing credentials)");
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Error handling data removal request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
