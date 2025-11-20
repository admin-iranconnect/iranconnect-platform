// backend/controllers/claimController.js
import pool from "../db.js";
import path from "path";
import { uploadToCloudinary } from "../utils/cloudinary.js";


/* 🧩 تولید کد تصادفی با فرمت IC-XXXXXX */
function randomToken() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `IC-${num}`;
}

/* 🟢 POST /api/businesses/:id/claim/start */
export async function startClaim(req, res) {
  const client = await pool.connect();
  try {
    const businessId = parseInt(req.params.id, 10);
    const {
      email,
      phone,
      full_name,
      applicant_role,
      description,
      humanAnswer,
      correctAnswer,
    } = req.body;

    if (!businessId || !email || !phone) {
      return res
        .status(400)
        .json({ error: "Missing required fields: businessId, email or phone" });
    }

    if (
      !humanAnswer ||
      !correctAnswer ||
      humanAnswer.trim() !== correctAnswer.trim()
    ) {
      return res.status(400).json({ error: "Human verification failed" });
    }

    const bizRes = await client.query(
      "SELECT id, name, phone, owner_verified, owner_email FROM businesses WHERE id=$1",
      [businessId]
    );
    if (bizRes.rowCount === 0)
      return res.status(404).json({ error: "Business not found" });

    const biz = bizRes.rows[0];
    if (biz.owner_verified) {
      return res.status(409).json({
        error:
          "This business has already been verified by its owner and cannot be claimed again.",
      });
    }

    const normalize = (n) => (n ? n.replace(/\D/g, "") : "");
    const phoneMatches =
      normalize(biz.phone) && normalize(biz.phone) === normalize(phone);
    const adminReviewNeeded = !phoneMatches;

    const claimToken = randomToken();

    let documentUrl = null;
    if (req.file) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(req.file.originalname);
      const cloudFileName = req.file.fieldname + "-" + uniqueSuffix + ext;

      try {
        const cloud = await uploadToCloudinary(req.file.buffer, cloudFileName, "business_claims", req.file.mimetype);
        documentUrl = cloud.secure_url;
      } catch (err) {
        console.error("❌ Cloudinary upload error:", err.message);
        documentUrl = null;
      }
    }

    const existingClaim = await client.query(
      `SELECT id, status 
       FROM business_claims 
       WHERE business_id=$1 AND email=$2 
       ORDER BY created_at DESC LIMIT 1`,
      [businessId, email]
    );

    if (
      existingClaim.rowCount > 0 &&
      ["pending", "pending_review", "verified"].includes(
        existingClaim.rows[0].status
      )
    ) {
      return res.status(409).json({
        error:
          "You already have a pending claim for this business. Please wait for admin review.",
      });
    }

    await client.query("BEGIN");

    /* ✅ درج در business_claims */
    const claimResult = await client.query(
      `INSERT INTO business_claims 
        (business_id, user_id, full_name, email, phone, applicant_role, description, document_url, claim_token, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
       RETURNING id`,
      [
        businessId,
        req.user?.id || null,
        full_name,
        email,
        phone,
        applicant_role,
        description,
        documentUrl,
        claimToken,
        adminReviewNeeded ? "pending_review" : "pending",
      ]
    );

    const claimId = claimResult.rows[0].id;

    /* ✅ درج لاگ در جدول business_requests */
    try {
      const seqRes = await client.query(`SELECT nextval('ticket_seq_bc') AS seq`);
      const seq = seqRes.rows[0].seq;
      const ticketCode = `IC-BC${String(seq).padStart(7, "0")}`;

      await client.query(
        `INSERT INTO business_requests
          (user_id, business_id, claim_id, request_type, ticket_seq, ticket_code, status, ip_address, user_agent, created_at)
         VALUES ($1,$2,$3,'claim',$4,$5,$6,$7,$8,NOW())`,
        [
          req.user?.id || null,
          businessId,
          claimId,
          seq,
          ticketCode,
          adminReviewNeeded ? "pending_review" : "pending",
          req.ip,
          req.get("User-Agent"),
        ]
      );
      console.log(`🧾 Logged business_request for claim → ${ticketCode}`);
    } catch (logErr) {
      console.warn("⚠️ Failed to create business_request record:", logErr.message);
    }

    await client.query("COMMIT");

    console.log(
      `✅ Claim created for business ID ${businessId} (${email}) by user_id=${req.user?.id || "NULL"}`
    );

    return res.json({
      success: true,
      claim_token: claimToken,
      admin_review_needed: adminReviewNeeded,
      message: adminReviewNeeded
        ? "Your request is pending admin review. Please keep your code safe until contacted."
        : "Your claim has been submitted successfully. Keep this code safe.",
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ startClaim error:", err);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
}

/* 🟢 verifyClaim — بدون تغییر */
export async function verifyClaim(req, res) {
  try {
    const businessId = parseInt(req.params.id, 10);
    const { email, code } = req.body;

    if (!businessId || !email || !code)
      return res
        .status(400)
        .json({ error: "Missing businessId, email or verification code" });

    return res.json({
      success: false,
      message:
        "Direct code verification is disabled. Please wait for admin contact.",
    });
  } catch (err) {
    console.error("❌ verifyClaim error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
