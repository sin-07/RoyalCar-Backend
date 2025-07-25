// --- DEBUG/HELPER: Get booking status for each car ---
import mongoose from "mongoose";

// Helper to get current booking status for a car
export const getCarBookingStatus = async (car) => {
  // Always check all bookings for this car, regardless of owner
  const bookings = await Booking.find({ car: car._id });
  // Find if any booking is active now
  const now = new Date();
  let isBookedNow = false;
  let nextAvailableAt = null;
  let currentBooking = null;
  for (const b of bookings) {
    const start = new Date(b.startDateTime);
    const end = new Date(b.endDateTime);
    if (now >= start && now <= end) {
      isBookedNow = true;
      nextAvailableAt = end;
      currentBooking = b;
      break;
    }
  }
  // Debug log
  console.log(`[BOOKING-DEBUG] Car: ${car._id} (${car.brand} ${car.model}) | Bookings: ${bookings.length} | isBookedNow: ${isBookedNow}`);
  return {
    carId: car._id,
    isBookedNow,
    nextAvailableAt,
    currentBooking: currentBooking ? {
      pickupDate: currentBooking.startDateTime,
      returnDate: currentBooking.endDateTime,
      user: currentBooking.name || currentBooking.email || "-",
    } : null,
  };
};

// --- API: Get booking status for all cars for owner (for debugging) ---
export const getOwnerCarBookings = async (req, res) => {
  try {
    const { _id } = req.user;
    let cars;
    if (_id.toString().startsWith("admin_")) {
      cars = await Car.find({});
    } else {
      cars = await Car.find({ owner: _id });
    }
    // For each car, get booking status
    const carBookings = [];
    for (const car of cars) {
      const status = await getCarBookingStatus(car);
      carBookings.push(status);
    }
    // Debug log
    console.log(`[BOOKING-DEBUG] getOwnerCarBookings: Returning status for ${carBookings.length} cars`);
    res.json({ success: true, carBookings });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
import imagekit from "../configs/imageKit.js";
import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import fs from "fs";

// ✅ Promote a user to owner
export const changeRoleToOwner = async (req, res) => {
  try {
    const { _id } = req.user;
    await User.findByIdAndUpdate(_id, { role: "owner" });
    res.json({ success: true, message: "Now you can list cars" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Add a new car
export const addCar = async (req, res) => {
  try {
    const { _id } = req.user;
    const car = JSON.parse(req.body.carData);
    const imageFile = req.file;

    const fileBuffer = fs.readFileSync(imageFile.path);
    const response = await imagekit.upload({
      file: fileBuffer,
      fileName: imageFile.originalname,
      folder: "/cars",
    });

    const optimizedImageUrl = imagekit.url({
      path: response.filePath,
      transformation: [
        { width: "1280" },
        { quality: "auto" },
        { format: "webp" },
      ],
    });

    let ownerId = _id;
    
    // For admin users with fake ID, find a real user to use as owner
    if (_id.toString().startsWith("admin_")) {
      // Find any user with owner role to use as the owner
      const anyOwner = await User.findOne({ role: "owner" });
      if (anyOwner) {
        ownerId = anyOwner._id;
      } else {
        // If no owner found, create a default admin user in database
        const adminUser = await User.create({
          name: "System Admin",
          email: "aniket.singh9322@gmail.com",
          password: "$2b$10$placeholder", // placeholder password hash
          role: "owner"
        });
        ownerId = adminUser._id;
      }
    }

    await Car.create({
      ...car,
      owner: ownerId,
      image: optimizedImageUrl,
      isAvailable: true,
    });

    res.json({ success: true, message: "Car Added" });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Get all cars listed by owner
export const getOwnerCars = async (req, res) => {
  try {
    const { _id } = req.user;
    
    let cars;
    if (_id.toString().startsWith("admin_")) {
      // Admin can see all cars
      cars = await Car.find({});
    } else {
      // Regular owner sees only their cars
      cars = await Car.find({ owner: _id });
    }
    
    res.json({ success: true, cars });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Toggle availability
export const toggleCarAvailability = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;
    const car = await Car.findById(carId);

    if (car.owner.toString() !== _id.toString()) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    car.isAvailable = !car.isAvailable;
    await car.save();

    res.json({ success: true, message: "Availability Toggled" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Unlist a car
export const deleteCar = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;
    const car = await Car.findById(carId);

    if (car.owner.toString() !== _id.toString()) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    car.owner = null;
    car.isAvailable = false;
    await car.save();

    res.json({ success: true, message: "Car Removed" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Dashboard data
export const getDashboardData = async (req, res) => {
  try {
    const { _id, role } = req.user;

    if (role !== "owner") {
      return res.json({ success: false, message: "Unauthorized" });
    }

    // Check if this is an admin user (fake admin ID starting with "admin_")
    let cars, bookings;
    
    if (_id.toString().startsWith("admin_")) {
      // Admin can see all cars and bookings
      cars = await Car.find({});
      bookings = await Booking.find({})
        .populate("car")
        .sort({ createdAt: -1 });
    } else {
      // Regular owner sees only their cars and bookings
      cars = await Car.find({ owner: _id });
      bookings = await Booking.find({ owner: _id })
        .populate("car")
        .sort({ createdAt: -1 });
    }

    const pending = bookings.filter((b) => b.status === "pending");
    const confirmed = bookings.filter((b) => b.status === "confirmed");
    const monthlyRevenue = confirmed.reduce((sum, b) => sum + b.price, 0);

    const dashboardData = {
      totalCars: cars.length,
      totalBookings: bookings.length,
      pendingBookings: pending.length,
      completedBookings: confirmed.length,
      recentBookings: bookings.slice(0, 3),
      monthlyRevenue,
    };

    res.json({ success: true, dashboardData });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Update user image
export const updateUserImage = async (req, res) => {
  try {
    const { _id } = req.user;

    const fileBuffer = fs.readFileSync(req.file.path);
    const response = await imagekit.upload({
      file: fileBuffer,
      fileName: req.file.originalname,
      folder: "/users",
    });

    const optimizedImageUrl = imagekit.url({
      path: response.filePath,
      transformation: [
        { width: "400" },
        { quality: "auto" },
        { format: "webp" },
      ],
    });

    await User.findByIdAndUpdate(_id, { image: optimizedImageUrl });

    res.json({ success: true, message: "Image Updated" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
