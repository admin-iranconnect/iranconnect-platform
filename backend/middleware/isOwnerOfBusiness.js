// backend/middleware/isOwnerOfBusiness.js
import db from "../db.js";

/**
 * 🧩 بررسی مالک بودن کاربر برای یک بیزینس
 * این middleware باید قبل از ایجاد درخواست update یا delete اجرا شود
 */
export async function isOwnerOfBusiness(req, res, next) {
  const businessId =
    req.body.business_id || req.query.business_id || req.params.business_id;
  if (!businessId)
    return res.status(400).json({ error: "business_id is required" });

  try {
    const { rows } = await db.query(
      "SELECT owner_email, owner_verified FROM businesses WHERE id=$1",
      [businessId]
    );

    if (!rows.length)
      return res.status(404).json({ error: "Business not found" });

    const biz = rows[0];
    if (!biz.owner_verified || biz.owner_email !== req.user.email) {
      return res.status(403).json({
        error: "You are not the verified owner of this business.",
      });
    }

    next();
  } catch (err) {
    console.error("❌ isOwnerOfBusiness error:", err.message);
    res.status(500).json({ error: "Server error verifying ownership" });
  }
}
