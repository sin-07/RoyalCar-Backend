// API: Get bookings for all cars owned by the current owner

import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";

// Returns: [{ carId, isBookedNow, nextAvailableAt, currentBooking, bookings: [..] }]
export const getOwnerCarBookings = async (req, res) => {
  try {
    let { _id, role } = req.user;
    if (role !== "owner") {
      return res.json({ success: false, message: "Unauthorized" });
    }
    // Ensure _id is ObjectId for query
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.json({ success: true, carBookings: [] });
    }
    _id = new mongoose.Types.ObjectId(_id);
    console.log('[getOwnerCarBookings] Using owner _id:', _id, 'Type:', typeof _id);
    // Get all cars for this owner
    const cars = await Car.find({ owner: _id });
    console.log('[getOwnerCarBookings] Cars found for owner', _id, ':', cars.map(c => ({_id: c._id, brand: c.brand, model: c.model, owner: c.owner})));
    const now = new Date();
    // Extra debug: print all car IDs for this owner
    const carIds = cars.map(c => c._id);
    console.log('[getOwnerCarBookings] Car IDs for owner:', carIds);
    // For each car, get all confirmed bookings
    const carBookings = await Promise.all(
      cars.map(async (car) => {
        // Extra debug: print booking query for this car
        console.log(`[getOwnerCarBookings] Querying bookings for carId: ${car._id} (type: ${typeof car._id})`);
        const bookings = await Booking.find({ car: car._id, status: "confirmed" });
        // Debug: Print car and booking info
        console.log(`Car: ${car._id} (${car.brand} ${car.model})`);
        console.log(`[getOwnerCarBookings] Bookings found for carId ${car._id}:`, bookings.map(b => b._id));
        bookings.forEach(b => {
          console.log(`  Booking: ${b._id} | ${b.pickupDate} ${b.pickupTime} - ${b.returnDate} ${b.returnTime} | Status: ${b.status}`);
        });
        // Find if car is currently booked
        let isBookedNow = false;
        let currentBooking = null;
        let nextAvailableAt = null;
        for (const b of bookings) {
          // Normalize time to HH:MM:SS if needed
          function normalizeTime(t) {
            if (!t) return "00:00:00";
            if (t.length === 5) return t + ":00"; // HH:MM -> HH:MM:00
            return t;
          }
          const start = new Date(`${b.pickupDate}T${normalizeTime(b.pickupTime)}Z`);
          const end = new Date(`${b.returnDate}T${normalizeTime(b.returnTime)}Z`);
          console.log(`    Checking: now=${now.toISOString()} start=${start.toISOString()} end=${end.toISOString()}`);
          if (now.getTime() >= start.getTime() && now.getTime() <= end.getTime()) {
            isBookedNow = true;
            currentBooking = b;
            nextAvailableAt = end;
            break;
          }
          // If not booked now, find the next available time
          if (now.getTime() < start.getTime() && (!nextAvailableAt || start.getTime() < nextAvailableAt.getTime())) {
            nextAvailableAt = start;
          }
        }
        console.log(`  Result: isBookedNow=${isBookedNow}`);
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
