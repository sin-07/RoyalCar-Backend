import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
};

// Generate Professional Invoice HTML
const generateInvoiceHTML = (booking) => {
  const invoiceData = {
    invoiceNumber: `RC-${new Date().getFullYear()}-${booking._id
      .toString()
      .slice(-6)
      .toUpperCase()}`,
    invoiceDate: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    customerName: `${booking.firstName} ${booking.lastName}`,
    customerEmail: booking.email,
    customerPhone: booking.phone,
    customerAddress: booking.address || "Address not provided",

    carDetails: {
      brand: booking.car?.brand || "N/A",
      model: booking.car?.model || "N/A",
      year: booking.car?.year || "N/A",
      licensePlate: booking.car?.licensePlate || "N/A",
      category: booking.car?.category || "N/A",
    },

    rentalPeriod: {
      pickupDate: new Date(booking.pickupDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      pickupTime: booking.pickupTime,
      returnDate: new Date(booking.returnDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      returnTime: booking.returnTime,
      duration: calculateDuration(booking.pickupDate, booking.returnDate),
      pickupLocation: booking.pickupLocation || "To be confirmed",
    },

    pricing: {
      baseRate: booking.car?.pricePerDay || 0,
      days: Math.ceil(
        (new Date(booking.returnDate) - new Date(booking.pickupDate)) /
          (1000 * 60 * 60 * 24)
      ),
      subtotal: booking.price * 0.85, // Assuming 85% is base rate
      insurance: booking.price * 0.05, // 5% insurance
      serviceFee: booking.price * 0.05, // 5% service fee
      tax: booking.price * 0.05, // 5% tax
      total: booking.price,
      currency: "₹",
    },

    paymentMethod: `${
      booking.paymentDetails?.paymentMethod || "Online Payment"
    } ****${booking.paymentDetails?.razorpay_payment_id?.slice(-4) || "****"}`,
    transactionId: booking.paymentDetails?.razorpay_payment_id || "N/A",
    status: "Confirmed",
  };

  return `
<!-- Responsive Royal Cars Invoice Template -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Royal Cars Invoice</title>

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(145deg, #a7f3d0, #10b981); /* ✅ Green gradient */
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    .email-container {
      max-width: 600px;
      width: 100%;
      margin: 20px auto;
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
    }

    .header {
      background: linear-gradient(135deg, #14532d, #166534); /* Dark green header */
      color: #fff;
      padding: 30px 20px;
      text-align: center;
    }

    .header h1 {
      font-size: 26px;
      margin-bottom: 5px;
    }

    .header p {
      font-size: 14px;
      color: #ccc;
    }

    .crown-icon {
      font-size: 24px;
      margin-right: 10px;
    }

    .invoice-info {
      background-color: rgba(255, 255, 255, 0.08);
      padding: 15px;
      border-radius: 10px;
      margin-top: 20px;
      text-align: left;
    }

    .status-badge {
      display: inline-block;
      background: #22c55e;
      color: white;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 12px;
      margin-left: 5px;
    }

    .content {
      padding: 30px 20px;
    }

    .section {
      margin-bottom: 30px;
    }

    .section-header {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #222;
    }

    .info-card {
      background: #f0fdf4;
      border-left: 5px solid #15803d;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .vehicle-card {
      border-left-color: #14532d;
    }

    .rental-period,
    .payment-info,
    .price-total {
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      padding: 20px;
      border-radius: 12px;
    }

    .period-table,
    .price-table,
    .payment-table {
      width: 100%;
      border-collapse: collapse;
    }

    .period-item,
    .price-row td,
    .payment-table td {
      padding: 8px;
      font-size: 14px;
    }

    .duration {
      font-size: 22px;
      font-weight: bold;
      color: #047857;
    }

    .pricing-header {
      background-color: #14532d;
      color: #fff;
      padding: 12px 16px;
      border-radius: 10px 10px 0 0;
      font-size: 16px;
    }

    .total-amount {
      font-size: 20px;
      font-weight: bold;
      color: #065f46;
      text-align: right;
    }

    .footer {
      background: #d1fae5;
      text-align: center;
      padding: 20px;
      font-size: 13px;
      color: #065f46;
    }

    .footer .support {
      font-weight: bold;
      color: #064e3b;
      margin-bottom: 8px;
      display: block;
    }

    /* Responsive Design */
    @media only screen and (max-width: 768px) {
      .content, .header, .footer {
        padding-left: 15px !important;
        padding-right: 15px !important;
      }

      .duration {
        font-size: 18px;
      }

      .period-table tr,
      .price-table tr,
      .payment-table tr {
        display: block;
        width: 100%;
      }

      .period-table td,
      .price-table td,
      .payment-table td {
        display: block;
        width: 100% !important;
        text-align: left !important;
      }

      .total-amount {
        text-align: left;
        margin-top: 10px;
      }
    }
  </style>
</head>

<body>
  <div class="email-container">
    <div class="header">
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
        <img src="cid:logo" alt="Royal Cars Logo" style="width: 50px; height: 50px; margin-right: 15px; vertical-align: middle;" />
        <h1 style="margin: 0; display: inline-block;">ROYAL CARS</h1>
      </div>
      <p>Premium Luxury Vehicle Rentals</p>

      <div class="invoice-info">
        <h2>INVOICE</h2>
        <p><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</p>
        <p><strong>Date:</strong> ${invoiceData.invoiceDate}</p>
        <p><strong>Status:</strong> <span class="status-badge">${
          invoiceData.status
        }</span></p>
      </div>
    </div>

    <div class="content">
      <div class="section">
        <div class="section-header">👤 Customer Details</div>
        <div class="info-card">
          <p><strong>Name:</strong> ${invoiceData.customerName}</p>
          <p><strong>Email:</strong> ${invoiceData.customerEmail}</p>
          <p><strong>Phone:</strong> ${invoiceData.customerPhone}</p>
          <p><strong>Address:</strong> ${invoiceData.customerAddress}</p>
        </div>
      </div>

      <div class="section">
        <div class="section-header">🚗 Vehicle Info</div>
        <div class="info-card vehicle-card">
          <p><strong>Vehicle:</strong> ${invoiceData.carDetails.brand} ${
    invoiceData.carDetails.model
  }</p>
          <p><strong>Year:</strong> ${invoiceData.carDetails.year}</p>
          <p><strong>Category:</strong> ${invoiceData.carDetails.category}</p>
          <p><strong>License Plate:</strong> ${
            invoiceData.carDetails.licensePlate
          }</p>
        </div>
      </div>

      <div class="section">
        <div class="section-header">📅 Rental Period</div>
        <div class="rental-period">
          <table class="period-table">
            <tr>
              <td class="period-item">
                <h4>PICKUP</h4>
                <p>${invoiceData.rentalPeriod.pickupDate}</p>
                <p>${invoiceData.rentalPeriod.pickupTime}</p>
                <p>📍 ${invoiceData.rentalPeriod.pickupLocation}</p>
              </td>
              <td class="period-item">
                <h4>RETURN</h4>
                <p>${invoiceData.rentalPeriod.returnDate}</p>
                <p>${invoiceData.rentalPeriod.returnTime}</p>
                <p>📍 ${invoiceData.rentalPeriod.pickupLocation}</p>
              </td>
              <td class="period-item">
                <h4>DURATION</h4>
                <p class="duration">${invoiceData.rentalPeriod.duration}</p>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <div class="section">
        <div class="pricing-header">💰 Pricing Breakdown</div>
        <div class="pricing-card">
          <table class="price-table">
            <tr class="price-row">
              <td>Base Rate × ${invoiceData.pricing.days} day(s)</td>
              <td style="text-align: right;">${
                invoiceData.pricing.currency
              }${invoiceData.pricing.subtotal.toFixed(2)}</td>
            </tr>
            <tr class="price-row">
              <td>Insurance</td>
              <td style="text-align: right;">${
                invoiceData.pricing.currency
              }${invoiceData.pricing.insurance.toFixed(2)}</td>
            </tr>
            <tr class="price-row">
              <td>Service Fee</td>
              <td style="text-align: right;">${
                invoiceData.pricing.currency
              }${invoiceData.pricing.serviceFee.toFixed(2)}</td>
            </tr>
            <tr class="price-row">
              <td>Tax</td>
              <td style="text-align: right;">${
                invoiceData.pricing.currency
              }${invoiceData.pricing.tax.toFixed(2)}</td>
            </tr>
          </table>
          <div class="price-total mt-2">
            <table class="price-table">
              <tr>
                <td>Total</td>
                <td class="total-amount">${
                  invoiceData.pricing.currency
                }${invoiceData.pricing.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">💳 Payment Info</div>
        <div class="payment-info">
          <table class="payment-table">
            <tr>
              <td><strong>Payment Method:</strong></td>
              <td>${invoiceData.paymentMethod}</td>
            </tr>
            <tr>
              <td><strong>Transaction ID:</strong></td>
              <td>${invoiceData.transactionId}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>

    <div class="footer">
      <span class="support">Thank you for booking with Royal Cars!</span>
      <p>Need help? Contact support@royalcars.com or +1 (800) ROYAL-CAR</p>
      <p>This is an automated invoice. Terms apply.</p>
    </div>
  </div>
</body>
</html>
    `;
};

// Calculate duration between dates
const calculateDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "1 day";
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays === 7) return "1 week";
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months`;
  return `${Math.ceil(diffDays / 365)} years`;
};

// Enhanced PDF Generator
const generateProfessionalPDF = async (booking) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const stream = new PassThrough();

  const pdfPromise = new Promise((resolve, reject) => {
    const buffers = [];
    stream.on("data", (data) => buffers.push(data));
    stream.on("end", () => resolve(Buffer.concat(buffers)));
    stream.on("error", reject);
  });

  doc.pipe(stream);

  // Full-page top-to-bottom gradient: green-500 (#22c55e) to white (#ffffff)
  const pageGradient = doc.linearGradient(0, 0, 0, doc.page.height)
    .stop(0, "#22c55e") // green-500
    .stop(1, "#ffffff"); // white
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(pageGradient);
  doc.restore();

  // Logo
  const logoPath = path.resolve("assets/logo/Royal_Cars.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 30, { width: 80 });
  }

  // Company info
  doc
    .fillColor("white")
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("ROYAL CARS", 150, 44, { lineBreak: false });

  doc
    .fontSize(12)
    .font("Helvetica")
    .text("Premium Luxury Vehicle Rentals", 150, 70);

  // Removed small green gradient background for ROYAL CARS heading to avoid overlap with full-page gradient

  // Invoice info
  doc.fontSize(20).font("Helvetica-Bold").text("INVOICE", 400, 40);

  const invoiceNumber = `RC-${new Date().getFullYear()}-${booking._id
    .toString()
    .slice(-6)
    .toUpperCase()}`;
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`Invoice #: ${invoiceNumber}`, 400, 70)
    .text(`Date: ${new Date().toLocaleDateString()}`, 400, 85)
    .text("Status: CONFIRMED", 400, 100);

  // Reset to black for content
  doc.fillColor("black");

  // Customer details
  let y = 180;
  doc.fontSize(14).font("Helvetica-Bold").text("CUSTOMER DETAILS", 50, y);

  y += 25;
  doc
    .fontSize(11)
    .font("Helvetica")
    .text(`Name: ${booking.firstName} ${booking.lastName}`, 50, y)
    .text(`Email: ${booking.email}`, 50, y + 15)
    .text(`Phone: ${booking.phone}`, 50, y + 30);

  // Vehicle details
  doc.fontSize(14).font("Helvetica-Bold").text("VEHICLE DETAILS", 300, 180);

  doc
    .fontSize(11)
    .font("Helvetica")
    .text(`Vehicle: ${booking.car?.brand} ${booking.car?.model}`, 300, 205)
    .text(`Year: ${booking.car?.year}`, 300, 220)
    .text(`Category: ${booking.car?.category}`, 300, 235);

  // Rental period
  y = 280;
  doc.fontSize(14).font("Helvetica-Bold").text("RENTAL PERIOD", 50, y);

  y += 25;
  doc
    .fontSize(11)
    .font("Helvetica")
    .text(
      `Pickup: ${new Date(booking.pickupDate).toLocaleDateString()} at ${
        booking.pickupTime
      }`,
      50,
      y
    )
    .text(
      `Return: ${new Date(booking.returnDate).toLocaleDateString()} at ${
        booking.returnTime
      }`,
      50,
      y + 15
    )
    .text(
      `Location: ${booking.pickupLocation || "To be confirmed"}`,
      50,
      y + 30
    );

  // Pricing table
  y = 380;
  doc.fontSize(14).font("Helvetica-Bold").text("PRICING BREAKDOWN", 50, y);

  y += 30;

  // Table headers
  doc.rect(50, y, 500, 25).fill("#f3f4f6").stroke();
  doc
    .fillColor("black")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Description", 60, y + 8)
    .text("Amount", 450, y + 8);

  y += 25;

  // Table rows
  const rows = [
    [
      `Base Rate (₹${booking.car?.pricePerDay || 0} × ${Math.ceil(
        (new Date(booking.returnDate) - new Date(booking.pickupDate)) /
          (1000 * 60 * 60 * 24)
      )} days)`,
      `₹${(booking.price * 0.85).toFixed(2)}`,
    ],
    ["Insurance Coverage", `₹${(booking.price * 0.05).toFixed(2)}`],
    ["Service Fee", `₹${(booking.price * 0.05).toFixed(2)}`],
    ["Tax & Fees", `₹${(booking.price * 0.05).toFixed(2)}`],
  ];

  rows.forEach((row, index) => {
    if (index % 2 === 0) {
      doc.rect(50, y, 500, 20).fill("#f9fafb").stroke();
    }
    doc
      .fillColor("black")
      .fontSize(10)
      .font("Helvetica")
      .text(row[0], 60, y + 6)
      .text(row[1], 450, y + 6);
    y += 20;
  });

  // Total
  doc.rect(50, y, 500, 30).fill("#374151").stroke();
  doc
    .fillColor("white")
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("TOTAL AMOUNT", 60, y + 8)
    .text(`₹${booking.price.toFixed(2)}`, 450, y + 8);

  // Payment info
  y += 60;
  doc
    .fillColor("black")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("PAYMENT INFORMATION", 50, y);

  y += 20;
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      `Payment Method: Online Payment ****${
        booking.paymentDetails?.razorpay_payment_id?.slice(-4) || "****"
      }`,
      50,
      y
    )
    .text(
      `Transaction ID: ${booking.paymentDetails?.razorpay_payment_id || "N/A"}`,
      50,
      y + 15
    );

  // QR Code
  try {
    const qrData = `https://royalcars.co.in/support?booking=${booking._id}`;
    const qrImage = await QRCode.toDataURL(qrData);
    doc.image(qrImage, 450, y - 50, { width: 60 });

    doc.fontSize(8).text("Scan for support", 450, y + 20);
  } catch (error) {
    console.log("QR code generation failed:", error);
  }

  // Footer
  doc
    .fontSize(10)
    .fillColor("gray")
    .text(
      "Thank you for choosing Royal Cars! For support: support@royalcars.com",
      50,
      doc.page.height - 80,
      {
        align: "center",
      }
    );

  doc
    .fontSize(8)
    .text(
      `© ${new Date().getFullYear()} Royal Cars. All rights reserved.`,
      50,
      doc.page.height - 60,
      {
        align: "center",
      }
    );

  doc.end();
  return await pdfPromise;
};

// Enhanced Email Sender
export const sendConfirmationEmail = async (booking) => {
  try {
    console.log("📧 Starting email generation process...");
    console.log("📧 Booking data received:", {
      id: booking._id,
      email: booking.email,
      firstName: booking.firstName,
      lastName: booking.lastName,
      carBrand: booking.car?.brand,
      carModel: booking.car?.model,
      price: booking.price,
    });

    // Validate required email environment variables
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      throw new Error(
        "Email credentials not configured. Please check MAIL_USER and MAIL_PASS environment variables."
      );
    }

    console.log("📧 Email credentials found, creating transporter...");
    const transporter = createTransporter();

    console.log("📧 Generating HTML content...");
    const htmlContent = generateInvoiceHTML(booking);

    console.log("📧 Generating PDF attachment...");
    const pdfBuffer = await generateProfessionalPDF(booking);

    const invoiceNumber = `RC-${new Date().getFullYear()}-${booking._id
      .toString()
      .slice(-6)
      .toUpperCase()}`;
    console.log("📧 Invoice number generated:", invoiceNumber);

    const mailOptions = {
      from: {
        name: "Royal Cars",
        address: process.env.MAIL_USER,
      },
      to: booking.email,
      subject: `✅ Payment Confirmed - Invoice ${invoiceNumber} | Royal Cars`,
      html: htmlContent,
      attachments: [
        {
          filename: `RoyalCars-Invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
        {
          filename: "Royal_Cars_Logo.png",
          path: path.resolve("assets/logo/Royal_Cars.png"),
          cid: "logo", // Content ID for embedding in HTML
          contentType: "image/png",
        },
      ],
    };

    console.log("📧 Sending email to:", booking.email);
    console.log("📧 Email from:", process.env.MAIL_USER);

    await transporter.sendMail(mailOptions);
    console.log(
      `✅ Professional invoice email sent successfully to ${booking.email}`
    );
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    console.error("❌ Full error:", error);
    throw error;
  }
};

export default { sendConfirmationEmail };
