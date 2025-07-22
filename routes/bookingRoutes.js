// 📁 routes/bookingRoutes.js

import express from "express";

import {
  checkAvailabilityOfCar,
  createBooking,
  getUserBookings,
  getOwnerBookings,
  getBookingById,
  changeBookingStatus,
} from "../controllers/bookingController.js";
import { createManualBooking } from "../controllers/manualBookingController.js";

import { protect } from "../middleware/auth.js";

const bookingRouter = express.Router();


bookingRouter.post("/check-availability", checkAvailabilityOfCar);
bookingRouter.post("/create", protect, createBooking);
bookingRouter.post("/manual-booking", protect, createManualBooking); // <-- NEW
bookingRouter.get("/user", protect, getUserBookings);
bookingRouter.get("/owner", protect, getOwnerBookings);
bookingRouter.get("/:bookingId", getBookingById); // ✅ New route for getting specific booking
bookingRouter.post("/change-status", protect, changeBookingStatus); // ✅ error fixed!

export default bookingRouter;
