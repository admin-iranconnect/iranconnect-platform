// backend/routes/contact.js
import express from "express";
import rateLimit from "express-rate-limit";
import { submitContactRequest } from "../controllers/contactController.js";

const router = express.Router();

// محدودسازی درخواست‌ها
const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 دقیقه
  max: 2,
  message: { error: "Too many contact requests. Try again later." },
});

router.post("/", contactLimiter, submitContactRequest);

export default router;
