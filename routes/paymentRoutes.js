import express from "express";
import { createOrder, saveTransaction } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-order", createOrder);
router.post("/save-transaction", saveTransaction); // ✅ Add this

export default router;
