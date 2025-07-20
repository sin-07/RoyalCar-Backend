import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

const bookingSchema = new mongoose.Schema(
  {
    car: { type: ObjectId, ref: "Car", required: true },
    user: { type: ObjectId, ref: "User", required: true },
    owner: { type: ObjectId, ref: "User", required: true },

    // ✅ DATE stored separately
    pickupDate: { type: String, required: true },
    returnDate: { type: String, required: true },

    // ✅ TIME RANGE stored separately for conflict check
    pickupTime: { type: String, required: true },
    returnTime: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    price: { type: Number, required: true },

    license: { type: String },
    email: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    phone: { type: String },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
