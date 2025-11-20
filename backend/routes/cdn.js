//backend/routes/cdn.js
import express from "express";
import { serveCachedImage } from "../middleware/cacheImage.js";

const router = express.Router();

router.get("/", serveCachedImage);

export default router;
