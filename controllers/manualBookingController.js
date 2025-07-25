import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import emailService from "../services/emailService.js";

// Admin/owner marks a car as booked for a custom time (offline booking)
export const createManualBooking = async (req, res) => {
  try {
    const { carId, startDateTime, endDateTime, name, email, payment } = req.body;
    if (!carId || !startDateTime || !endDateTime || !name || !email) {
      return res.json({ success: false, message: "Missing required fields." });
    }

    const car = await Car.findById(carId);
    if (!car) return res.json({ success: false, message: "Car not found." });

    // Always store ISO datetime for status logic
    const pickupISO = new Date(startDateTime).toISOString();
    const returnISO = new Date(endDateTime).toISOString();

    // Check for conflicts with existing confirmed bookings (using ISO datetimes)
    const existing = await Booking.find({ car: carId, status: "confirmed" });
    const isConflict = existing.some((b) => {
      // Try to use ISO datetimes if present, else fallback to old fields
      const bStart = b.startDateTime ? new Date(b.startDateTime) : new Date(`${b.pickupDate}T${b.pickupTime}`);
      const bEnd = b.endDateTime ? new Date(b.endDateTime) : new Date(`${b.returnDate}T${b.returnTime}`);
      return new Date(pickupISO) < bEnd && new Date(returnISO) > bStart;
    });
    if (isConflict) {
      return res.json({ success: false, message: "Car is already booked during this time." });
    }

    // Create a fake user for offline bookings if needed
    let offlineUser = await User.findOne({ email: "admin-offline@system.local" });
    if (!offlineUser) {
      offlineUser = await User.create({
        name: "Offline Admin",
        email: "admin-offline@system.local",
        password: "offline-booking", // not used
        role: "owner"
      });
    }

    const booking = await Booking.create({
      user: offlineUser._id,
      car: carId,
      owner: car.owner,
      pickupDate: startDateTime.split("T")[0],
      pickupTime: startDateTime.split("T")[1],
      returnDate: endDateTime.split("T")[0],
      returnTime: endDateTime.split("T")[1],
      startDateTime: pickupISO,
      endDateTime: returnISO,
      price: typeof payment === 'number' ? payment : 0,
      status: "confirmed",
      firstName: name,
      email: email,
    });

    // Debug: Log booking and owner after creation
    console.log('[ManualBooking] Created booking:', booking);
    console.log('[ManualBooking] Booking owner:', car.owner, 'Car:', carId);

    // Send professional receipt email with PDF invoice
    try {
      await emailService.sendConfirmationEmail({
        ...booking.toObject(),
        car: car,
        // Fill in any missing fields for the template
        firstName: name,
        lastName: "",
        paymentDetails: { paymentMethod: "Offline/Manual" },
        pickupLocation: "Offline/Manual Booking",
      });
    } catch (mailErr) {
      console.error("Failed to send professional receipt email:", mailErr);
    }

    return res.json({ success: true, booking });
  } catch (err) {
    console.error("createManualBooking error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
