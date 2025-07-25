// 📁 controllers/bookingController.js

import Booking from "../models/Booking.js";
import Car from "../models/Car.js";

// ✅ Check car availability
// 📁 controllers/bookingController.js

export const checkAvailabilityOfCar = async (req, res) => {
  try {
    const { pickupDateTime, returnDateTime } = req.body;

    const pickup = new Date(pickupDateTime);
    const ret = new Date(returnDateTime);

    if (!pickup || !ret || ret <= pickup) {
      return res.json({
        success: false,
        message: "Invalid pickup or return time.",
      });
    }

    const cars = await Car.find({ isAvailable: true });
    const availableCars = [];

    for (const car of cars) {
      // Only check confirmed bookings for availability
      const bookings = await Booking.find({ 
        car: car._id, 
        status: "confirmed" 
      });

      let available = true;
      let nextAvailableDate = null;

      for (const booking of bookings) {
        const bookedStart = new Date(`${booking.pickupDate}T${booking.pickupTime}`);
        const bookedEnd = new Date(`${booking.returnDate}T${booking.returnTime}`);

        // Overlaps?
        if (pickup < bookedEnd && ret > bookedStart) {
          available = false;
          if (!nextAvailableDate || bookedEnd > new Date(nextAvailableDate)) {
            nextAvailableDate = bookedEnd;
          }
        }
      }

      availableCars.push({
        car,
        available,
        availableAt: nextAvailableDate,
      });
    }

    return res.json({ success: true, cars: availableCars });
  } catch (err) {
    console.error("checkAvailabilityOfCar error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ✅ Create booking
export const createBooking = async (req, res) => {
  // Debug logging for troubleshooting
  console.log("[createBooking] req.user:", req.user);
  console.log("[createBooking] req.body:", req.body);
  try {
    const { pickupDateTime, returnDateTime, car } = req.body;

    const pickup = new Date(pickupDateTime);
    const ret = new Date(returnDateTime);
    const now = new Date();

    const durationMs = ret - pickup;
    const durationMins = durationMs / (1000 * 60);

    // Allow immediate bookings (remove 24-hour restriction)
    if (pickup <= now) {
      return res.json({
        success: false,
        message: "Pickup time must be in the future.",
      });
    }

    // Allow shorter bookings (minimum 1 hour instead of 24 hours)
    if (durationMins < 60) {
      return res.json({
        success: false,
        message: "Booking must be at least 1 hour long.",
      });
    }

    // Only check for conflicts with confirmed bookings
    const existing = await Booking.find({ 
      car, 
      status: "confirmed" 
    });
    const isConflict = existing.some((b) => {
      const bStart = new Date(`${b.pickupDate}T${b.pickupTime}`);
      const bEnd = new Date(`${b.returnDate}T${b.returnTime}`);
      return pickup < bEnd && ret > bStart;
    });

    if (isConflict) {
      return res.json({
        success: false,
        message: "Car is already booked during this time.",
      });
    }

    const carData = await Car.findById(car);
    const pricePerDay = carData.pricePerDay;
    
    // Calculate price based on hours for more flexible pricing
    const durationHours = Math.ceil(durationMins / 60);
    const pricePerHour = pricePerDay / 24; // Convert daily rate to hourly
    const totalPrice = Math.ceil(durationHours * pricePerHour);

    const booking = await Booking.create({
      user: req.user._id,
      car,
      owner: carData.owner,
      pickupDate: pickupDateTime.split("T")[0],
      pickupTime: pickupDateTime.split("T")[1],
      returnDate: returnDateTime.split("T")[0],
      returnTime: returnDateTime.split("T")[1],
      price: totalPrice,
      status: "confirmed",
    });

    // Debug: Print types and values for linkage troubleshooting
    console.log('[createBooking] Booking created:', booking);
    console.log('[createBooking] booking.car:', booking.car, 'Type:', typeof booking.car);
    console.log('[createBooking] booking.owner:', booking.owner, 'Type:', typeof booking.owner);
    console.log('[createBooking] carData._id:', carData._id, 'Type:', typeof carData._id);
    console.log('[createBooking] carData.owner:', carData.owner, 'Type:', typeof carData.owner);
    console.log('[createBooking] req.user._id:', req.user._id, 'Type:', typeof req.user._id);

    return res.json({ success: true, bookingId: booking._id });
  } catch (err) {
    console.error("createBooking error:", err);
    return res.status(500).json({ success: false, message: "Booking error" });
  }
};

// ✅ Get user bookings
export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("car")
      .sort({ createdAt: -1 });

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error("getUserBookings error:", err);
    return res.json({ success: false, message: err.message });
  }
};

// ✅ Get owner bookings
export const getOwnerBookings = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const bookings = await Booking.find({ owner: req.user._id })
      .populate("car")
      .sort({ createdAt: -1 });

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error("getOwnerBookings error:", err);
    return res.json({ success: false, message: err.message });
  }
};

// ✅ Get specific booking by ID
export const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate("car");

    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    return res.json({ success: true, booking });
  } catch (err) {
    console.error("getBookingById error:", err);
    return res.json({ success: false, message: err.message });
  }
  } catch (err) {
    console.error("getBookingById error:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Server error: " + err.message 
    });
  }
};

// ✅ Export booking status changer

export const changeBookingStatus = async (req, res) => {
  try {
    const { bookingId, status } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking || booking.owner.toString() !== req.user._id.toString()) {
      return res.json({
        success: false,
        message: "Unauthorized or booking not found.",
      });
    }

    booking.status = status;
    await booking.save();

    return res.json({ success: true, message: "Status updated." });
  } catch (err) {
    console.error("changeBookingStatus error:", err);
    return res.json({ success: false, message: err.message });
  }
};
