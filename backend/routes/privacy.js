// backend/routes/privacy.js
import express from "express";
import { submitDataRemovalRequest } from "../controllers/privacyController.js";

const router = express.Router();

// 🧩 POST /api/privacy/data-removal
router.post("/data-removal", submitDataRemovalRequest);

export default router;
