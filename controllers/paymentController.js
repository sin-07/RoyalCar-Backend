import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import Booking from "../models/Booking.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

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

    // Send email asynchronously (don't wait for it)
    sendConfirmationEmail(booking).catch(emailError => {
      console.error("📧 Email sending failed (but payment was saved):", emailError.message);
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

// ✅ Send PDF Receipt & Confirmation Email
async function sendConfirmationEmail(booking) {
  const { PassThrough } = await import("stream");
  const QRCode = await import("qrcode");
  const doc = new PDFDocument({ margin: 40 });
  const stream = new PassThrough();

  const pdfPromise = new Promise((resolve, reject) => {
    const buffers = [];
    stream.on("data", (data) => buffers.push(data));
    stream.on("end", () => resolve(Buffer.concat(buffers)));
    stream.on("error", reject);
  });

  doc.pipe(stream);

  // Logo
  const logoPath = path.resolve("assets/logo/Royal_Cars.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 30, { width: 100 });
  }

  // Header
  doc.fontSize(24).fillColor("black").text("Payment Receipt", 0, 100, {
    align: "center",
    underline: true,
  });

  doc.moveDown(2);

  // Info Table
  doc.fontSize(13);
  const labelX = 50;
  const valueX = 200;
  const lineHeight = 24;
  let y = doc.y;

  const row = (label, value) => {
    doc.fillColor("#444").font("Helvetica-Bold").text(label, labelX, y);
    doc
      .fillColor("black")
      .font("Helvetica")
      .text(value || "N/A", valueX, y);
    y += lineHeight;
  };

  row("Name:", `${booking.firstName} ${booking.lastName}`);
  row("Email:", booking.email);
  row("Phone:", booking.phone);
  row("Booking ID:", booking._id.toString());
  row("Car ID:", `${booking.car?.brand} ${booking.car?.model}`);
  row("Pickup Date:", new Date(booking.pickupDate).toLocaleString());
  row("Return Date:", new Date(booking.returnDate).toLocaleString());
  row("Amount Paid:", `₹${booking.price}`);

  doc.moveDown(2);
  doc
    .fontSize(12)
    .fillColor("black")
    .text("Thank you for booking with Royal Cars!", {
      align: "center",
    });

  doc.moveDown(4);
  doc
    .fillColor("gray")
    .fontSize(12)
    .text("Authorized Signature", { align: "right" });

  // QR Code
  const qrData = `https://royalcars.co.in/support?booking=${booking._id}`;
  const qrImage = await QRCode.toDataURL(qrData);
  doc.image(qrImage, doc.page.width - 130, y, { width: 80 });

  doc.moveDown(2);
  doc
    .fontSize(10)
    .fillColor("gray")
    .text("Need help? support@royalcars.com | +91-99999-99999", {
      align: "center",
    });

  const year = new Date().getFullYear();
  doc
    .fontSize(10)
    .fillColor("gray")
    .text(`© ${year} Royal Cars. All rights reserved.`, { align: "center" });

  doc.end();
  const pdfBuffer = await pdfPromise;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const mailOptions = {
    from: "Royal Cars <no-reply@royalcars.com>",
    to: booking.email,
    subject: "Payment Confirmation - Royal Cars",
    html: `
      <h2>Thank you, ${booking.firstName}!</h2>
      <p>Your payment of ₹${booking.price} has been successfully received.</p>
      <p>Please find the receipt attached.</p>
    `,
    attachments: [
      {
        filename: `receipt-${booking._id}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent");
  } catch (err) {
    console.error("❌ Email error:", err);
  }
}
