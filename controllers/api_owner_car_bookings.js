// API: Get bookings for all cars owned by the current owner

import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";

// Returns: [{ carId, isBookedNow, nextAvailableAt, currentBooking, bookings: [..] }]
export const getOwnerCarBookings = async (req, res) => {
  try {
    const { _id, role } = req.user;
    if (role !== "owner") {
      return res.json({ success: false, message: "Unauthorized" });
    }
    // If admin/fake owner, skip query to avoid ObjectId cast error
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.json({ success: true, carBookings: [] });
    }
    // Get all cars for this owner
    const cars = await Car.find({ owner: _id });
    const now = new Date();
    // For each car, get all confirmed bookings
    const carBookings = await Promise.all(
      cars.map(async (car) => {
        const bookings = await Booking.find({ car: car._id, status: "confirmed" });
        // Find if car is currently booked
        let isBookedNow = false;
        let currentBooking = null;
        let nextAvailableAt = null;
        for (const b of bookings) {
          const start = new Date(`${b.pickupDate}T${b.pickupTime}`);
          const end = new Date(`${b.returnDate}T${b.returnTime}`);
          if (now >= start && now <= end) {
            isBookedNow = true;
            currentBooking = b;
            nextAvailableAt = end;
            break;
          }
          // If not booked now, find the next available time
          if (now < start && (!nextAvailableAt || start < nextAvailableAt)) {
            nextAvailableAt = start;
          }
        }
        return {
          carId: car._id,
          isBookedNow,
          nextAvailableAt,
          currentBooking,
          bookings,
        };
      })
    );
    res.json({ success: true, carBookings });
  } catch (error) {
    console.error("getOwnerCarBookings error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
