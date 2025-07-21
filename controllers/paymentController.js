import Razorpay from "razorpay";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import { sendConfirmationEmail } from '../services/emailService.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

// 📌 Utility to parse "9:00 PM" ➜ "21:00"
function parseTimeTo24Hour(timeStr) {
  const [time, meridian] = timeStr.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (meridian === "PM" && h !== 12) h += 12;
  if (meridian === "AM" && h === 12) h = 0;
  return { hours: h, minutes: m };
}

// ✅ Create Razorpay Order
export const createOrder = async (req, res) => {
  try {
    const { bookingId, customer, testAmount } = req.body;
    const booking = await Booking.findById(bookingId).populate("car");

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    // Attach customer data to booking
    booking.firstName = customer.firstName;
    booking.lastName = customer.lastName;
    booking.email = customer.email;
    booking.phone = customer.phone;
    booking.license = customer.license;

    let totalPrice;

    // Use test amount if provided, otherwise calculate from booking details
    if (testAmount) {
      totalPrice = testAmount / 100; // Convert paise to rupees for storing in booking
      console.log(`🧪 Test Mode: Using test amount of ₹${totalPrice}`);
    } else {
      // Calculate hour difference
      const pickupTime = new Date(
        `${booking.pickupDate}T${timeTo24String(booking.pickupTime)}:00`
      );
      const returnTime = new Date(
        `${booking.returnDate}T${timeTo24String(booking.returnTime)}:00`
      );

      const durationInHours = Math.ceil(
        (returnTime - pickupTime) / (1000 * 60 * 60)
      );

      const hourlyRate = booking.car.pricePerDay / 24;
      totalPrice = Math.ceil(hourlyRate * durationInHours);
    }

    booking.price = totalPrice;
    await booking.save();

    const order = await razorpay.orders.create({
      amount: testAmount || (totalPrice * 100), // Use testAmount directly if provided, otherwise convert totalPrice to paise
      currency: "INR",
      receipt: `rc-${bookingId}`,
    });

    res.json({ success: true, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

function timeTo24String(time) {
  const { hours, minutes } = parseTimeTo24Hour(time);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

// ✅ Save Payment Transaction
export const saveTransaction = async (req, res) => {
  try {
    const {
      bookingId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body;
    
    console.log("💾 Saving transaction for booking:", bookingId);
    
    const booking = await Booking.findById(bookingId).populate("car");

    if (!booking) {
      console.error("❌ Booking not found:", bookingId);
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    // Update booking with payment details
    booking.isPaid = true;
    booking.status = "confirmed";
    booking.paymentDetails = {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      paidAt: new Date()
    };

    await booking.save();
    console.log("✅ Transaction saved successfully for booking:", bookingId);

    // Send response immediately
    res.json({ success: true, message: "Payment saved successfully" });

    // Send email asynchronously with detailed logging
    console.log("📧 Attempting to send email to:", booking.email);
    console.log("📧 Booking data for email:", {
      id: booking._id,
      customerName: `${booking.firstName} ${booking.lastName}`,
      email: booking.email,
      phone: booking.phone,
      carDetails: booking.car ? `${booking.car.brand} ${booking.car.model}` : 'Car details missing'
    });
    
    sendConfirmationEmail(booking)
      .then(() => {
        console.log("✅ Email sent successfully to:", booking.email);
      })
      .catch(emailError => {
        console.error("❌ Email sending failed:", emailError);
        console.error("❌ Full error details:", emailError.message);
        console.error("❌ Error stack:", emailError.stack);
      });

  } catch (err) {
    console.error("❌ Transaction saving failed:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to save transaction" });
  }
};

// ✅ Webhook (optional, enhance later)
export const webhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];
  const body = req.body;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(body))
    .digest("hex");

  if (signature !== expectedSignature) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid signature" });
  }

  const paymentEntity = body.payload.payment.entity;
  const email = paymentEntity.email;

  try {
    const booking = await Booking.findOne({ email });
    if (booking) {
      booking.isPaid = true;
      booking.status = "confirmed"; // Update status to confirmed
      await booking.save();
      await sendConfirmationEmail(booking);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
