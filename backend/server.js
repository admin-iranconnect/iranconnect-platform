process.env.TZ = 'UTC';

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import businessRoutes from "./routes/businesses.js";
import uploadRoutes from "./routes/uploads.js";
import adminUserRoutes from "./routes/admin_users.js";
import adminStatsRoutes from "./routes/admin_stats.js";
import pool from "./db.js";
import adminBusinessRoutes from "./routes/admin_businesses.js";
import adminBusinessesRoutes from "./routes/admin_businesses.js";
import adminUsersRoutes from "./routes/admin_users.js";
import { fileURLToPath } from "url";
import privacyRoutes from "./routes/privacy.js";
import businessClaimsRoutes from "./routes/businessClaims.js";
import adminClaimsRoutes from "./routes/adminClaims.js";
import consentRoutes from "./routes/consent.js";
import policyRoutes from "./routes/policies.js";
import adminConsentsRoutes from "./routes/admin_consents.js";
import bulkEmailRoutes from "./routes/admin_bulkEmail.js";
import adminSecurityLogsRoutes from "./routes/admin_securityLogs.js";
import requestsRouter from "./routes/requests.js";
import ownerRouter from "./routes/owner.js";
import adminRequestsRouter from "./routes/admin_requests.js";
import contactRoutes from "./routes/contact.js";
import adminContactRequestsRoutes from "./routes/admin_contactRequests.js";
import cookieParser from "cookie-parser";
import cdnRouter from "./routes/cdn.js";
import adminFileLogsRoutes from "./routes/admin_fileLogs.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import adminLoginAttemptsRoutes from "./routes/admin_loginAttempts.js";
import { handle404 } from "./middleware/handle404.js";
import { checkSensitivePaths } from "./middleware/checkSensitivePaths.js";
import { detectBurst } from "./middleware/burstDetector.js";
import { detectUserAgentAnomaly } from "./middleware/uaDetector.js";
import adminBlockedIPsRoutes from "./routes/admin_blockedIPs.js";
import adminSuspiciousIPsRoutes from "./routes/admin_suspiciousIPs.js";

/* ========================================================
   🔐 Load environment variables securely
   ======================================================== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

// ❌ چاپ کردن value واقعی secret (خیلی خطرناک بود)
// console.log(`🔑 JWT_SECRET Loaded (${process.env.JWT_SECRET.length} chars)`);

// ✔ نسخه امن‌تر:
if (process.env.JWT_SECRET) {
  console.log(`🔑 JWT_SECRET Loaded (length: ${process.env.JWT_SECRET.length})`);
} else {
  console.warn("⚠️ WARNING: JWT_SECRET is missing in .env!");
}

console.log("📦 NODE_ENV =", process.env.NODE_ENV || "undefined");


/* ========================================================
   🚀 Initialize
   ======================================================== */
const app = express();

app.set("trust proxy", 1);

app.use(globalLimiter);

/* ========================================================
   🌐 CORS
   ======================================================== */
app.use(
  cors({
    origin: ["http://localhost:3000", process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* Uploads directory CORS */
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

app.use("/cdn", cdnRouter);
app.use("/uploads", express.static(path.resolve("uploads")));

/* ========================================================
   🔒 Security middleware
   ======================================================== */
app.use(helmet());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* ========================================================
   🧪 Health check
   ======================================================== */
app.get("/", (req, res) => res.send("✅ IranConnect API Running"));

/* ========================================================
   📌 Routes
   ======================================================== */
app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/admin/businesses", adminBusinessRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/stats", adminStatsRoutes);
app.use("/api/admin/businesses", adminBusinessesRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/privacy", privacyRoutes);
app.use("/api/businesses", businessClaimsRoutes);
app.use("/api/admin/claims", adminClaimsRoutes);
app.use("/api/users/consent", consentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/admin/consents", adminConsentsRoutes);
app.use("/api/admin/bulk-email", bulkEmailRoutes);
app.use("/api/admin/security-logs", adminSecurityLogsRoutes);
app.use("/api/requests", requestsRouter);
app.use("/api/owner", ownerRouter);
app.use("/uploads", express.static("uploads"));
app.use("/api/admin/requests", adminRequestsRouter);
app.use("/api/contact", contactRoutes);
app.use("/api/admin/contact-requests", adminContactRequestsRoutes);
app.use("/api/admin/files", adminFileLogsRoutes);
app.use("/api/admin/login-attempts", adminLoginAttemptsRoutes);
app.use("/api/admin/blocked-ips", adminBlockedIPsRoutes);
app.use("/api/admin/suspicious-ips", adminSuspiciousIPsRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/business-claims", businessClaimsRoutes);
app.use("/api/businesses", businessClaimsRoutes);

app.use(cookieParser());

/* ========================================================
   🛡 Suspicious Activity Detectors
   ======================================================== */
app.use(checkSensitivePaths);
app.use(detectBurst);
app.use(detectUserAgentAnomaly);

/* ========================================================
   ⚠️ 404 Handler
   ======================================================== */
app.use(handle404);

/* ========================================================
   🟢 Test DB Connection
   ======================================================== */
pool
  .connect()
  .then((client) => {
    client.release();
    console.log("✅ Connected to PostgreSQL");
  })
  .catch((err) => console.error("❌ Database connection error", err.stack));

/* ========================================================
   🚀 Start Server
   ======================================================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
