import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Car from "../models/Car.js";
import nodemailer from "nodemailer";
import crypto from "crypto";

// Generate JWT Token
const generateToken = (userId) => {
  const payload = userId;
  return jwt.sign(payload, process.env.JWT_SECRET);
};

// Email configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();
const passwordResetOtpStore = new Map();

// Test endpoint to check environment variables
export const testConfig = async (req, res) => {
  try {
    const hasEmailUser = !!process.env.MAIL_USER;
    const hasEmailPass = !!process.env.MAIL_PASS;
    const emailUser = process.env.MAIL_USER
      ? process.env.MAIL_USER.substring(0, 3) + "***"
      : "NOT_SET";

    res.json({
      success: true,
      message: "Config check",
      config: {
        hasEmailUser,
        hasEmailPass,
        emailUser,
      },
    });
  } catch (error) {
    res.json({
      success: false,
      message: "Config check failed",
      error: error.message,
    });
  }
};

// Test email endpoint to check email template
export const testEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ success: false, message: "Email is required" });
    }

    const testOtp = "123456";

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "Test Email - Royal Cars",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                    <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: bold;">Royal Cars</h1>
                            <div style="width: 50px; height: 3px; background: linear-gradient(to right, #2563eb, #3b82f6); margin: 10px auto;"></div>
                        </div>
                        
                        <h2 style="color: #1f2937; text-align: center; margin-bottom: 20px;">Test Email</h2>
                        
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hello,</p>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                            This is a test email to check the template formatting and the tagline at the bottom.
                        </p>
                        
                        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 25px 0; border: 2px solid #bbf7d0;">
                            <p style="color: #166534; margin: 0 0 10px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Test Code</p>
                            <h1 style="color: #15803d; font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold; text-shadow: 0 2px 4px rgba(21, 128, 61, 0.1);">${testOtp}</h1>
                        </div>
                        
                        <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center;">
                            <p style="color: #6b7280; margin: 0; font-size: 14px;">
                                Best regards,<br>
                                <strong style="color: #2563eb;">Royal Cars</strong>
                            </p>
                            <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
                                Drive in luxury, travel with confidence 🚗✨
                            </p>
                        </div>
                    </div>
                </div>
            `,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: "Test email sent successfully",
    });
  } catch (error) {
    console.log("Test Email Error:", error.message);
    res.json({ success: false, message: "Failed to send test email" });
  }
};

// Send OTP
export const sendOtp = async (req, res) => {
  try {
    console.log("Send OTP request received:", req.body);
    const { email } = req.body;

    if (!email) {
      console.log("Error: Email is required");
      return res.json({ success: false, message: "Email is required" });
    }

    // Check if email environment variables are set
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.log("Email configuration missing:", {
        hasEmailUser: !!process.env.MAIL_USER,
        hasEmailPass: !!process.env.MAIL_PASS,
      });
      return res.json({
        success: false,
        message: "Email service not configured",
      });
    }

    console.log("Checking if user exists for email:", email);
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("User already exists:", email);
      return res.json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    console.log("Generated OTP for", email, ":", otp);

    // Store OTP with expiration (5 minutes)
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      attempts: 0,
    });

    // Send OTP via email
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "Email Verification - Royal Cars",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                    <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: bold;">Royal Cars</h1>
                            <div style="width: 50px; height: 3px; background: linear-gradient(to right, #2563eb, #3b82f6); margin: 10px auto;"></div>
                        </div>
                        
                        <h2 style="color: #1f2937; text-align: center; margin-bottom: 20px;">Email Verification</h2>
                        
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hello,</p>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                            Thank you for choosing Royal Car Rental! To complete your registration, please use the following verification code:
                        </p>
                        
                        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 25px 0; border: 2px solid #bbf7d0;">
                            <p style="color: #166534; margin: 0 0 10px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                            <h1 style="color: #15803d; font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold; text-shadow: 0 2px 4px rgba(21, 128, 61, 0.1);">${otp}</h1>
                        </div>
                        
                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                            <p style="color: #92400e; margin: 0; font-size: 14px;">
                                This code is valid for <strong>5 minutes only</strong>. Please verify your email promptly.
                            </p>
                        </div>
                        
                        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 25px;">
                            If you didn't create an account with Royal Car Rental, please ignore this email.
                        </p>
                        
                        <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center;">
                            <p style="color: #6b7280; margin: 0; font-size: 14px;">
                                Best regards,<br>
                                <strong style="color: #2563eb;">Royal Cars</strong>
                            </p>
                            <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
                                Drive in luxury, travel with confidence
                            </p>
                        </div>
                    </div>
                </div>
            `,
    };

    console.log("Attempting to send email to:", email);
    console.log(
      "Email template being used:",
      mailOptions.html.substring(0, 200) + "..."
    );
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully to:", email);

    res.json({
      success: true,
      message: "OTP sent successfully to your email",
    });
  } catch (error) {
    console.log("Send OTP Error Details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.json({
      success: false,
      message: "Failed to send OTP. Please try again.",
    });
  }
};

// Verify OTP
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const storedOtpData = otpStore.get(email);

    if (!storedOtpData) {
      return res.json({ success: false, message: "OTP not found or expired" });
    }

    // Check if OTP is expired
    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(email);
      return res.json({ success: false, message: "OTP has expired" });
    }

    // Check attempts (max 3 attempts)
    if (storedOtpData.attempts >= 3) {
      otpStore.delete(email);
      return res.json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    // Verify OTP
    if (storedOtpData.otp !== otp) {
      storedOtpData.attempts += 1;
      return res.json({ success: false, message: "Invalid OTP" });
    }

    // OTP is valid - remove from store
    otpStore.delete(email);

    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: "OTP verification failed" });
  }
};

// Send Password Reset OTP
export const sendPasswordResetOtp = async (req, res) => {
  try {
    console.log("Send Password Reset OTP request received:", req.body);
    const { email } = req.body;

    if (!email) {
      console.log("Error: Email is required");
      return res.json({ success: false, message: "Email is required" });
    }

    // Check if email environment variables are set
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.log("Email configuration missing");
      return res.json({
        success: false,
        message: "Email service not configured",
      });
    }

    console.log("Checking if user exists for email:", email);
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      console.log("User not found:", email);
      return res.json({
        success: false,
        message: "No account found with this email address",
      });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    console.log("Generated Password Reset OTP for", email, ":", otp);

    // Store OTP with expiration (10 minutes for password reset)
    passwordResetOtpStore.set(email, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: 0,
    });

    // Send OTP via email
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: "Password Reset - Royal Cars",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                    <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: bold;">Royal Cars</h1>
                            <div style="width: 50px; height: 3px; background: linear-gradient(to right, #2563eb, #3b82f6); margin: 10px auto;"></div>
                        </div>
                        
                        <h2 style="color: #1f2937; text-align: center; margin-bottom: 20px;">Password Reset Request</h2>
                        
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">Hello,</p>
                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                            We received a request to reset your password for your Royal Cars account. Use the following verification code to proceed:
                        </p>
                        
                        <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 25px 0; border: 2px solid #bbf7d0;">
                            <p style="color: #166534; margin: 0 0 10px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Password Reset Code</p>
                            <h1 style="color: #15803d; font-size: 36px; margin: 0; letter-spacing: 8px; font-weight: bold; text-shadow: 0 2px 4px rgba(21, 128, 61, 0.1);">${otp}</h1>
                        </div>
                        
                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                            <p style="color: #92400e; margin: 0; font-size: 14px;">
                                This code is valid for <strong>10 minutes only</strong>. If you didn't request a password reset, please ignore this email.
                            </p>
                        </div>
                        
                        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-top: 25px;">
                            For security reasons, this code will expire in 10 minutes. If you need a new code, please request another password reset.
                        </p>
                        
                        <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; text-align: center;">
                            <p style="color: #6b7280; margin: 0; font-size: 14px;">
                                Best regards,<br>
                                <strong style="color: #2563eb;">Royal Cars</strong>
                            </p>
                            <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
                                Drive in luxury, travel with confidence
                            </p>
                        </div>
                    </div>
                </div>
            `,
    };

    console.log("Attempting to send password reset email to:", email);
    await transporter.sendMail(mailOptions);
    console.log("Password reset email sent successfully to:", email);

    res.json({
      success: true,
      message: "Password reset OTP sent successfully to your email",
    });
  } catch (error) {
    console.log("Send Password Reset OTP Error Details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.json({
      success: false,
      message: "Failed to send password reset OTP. Please try again.",
    });
  }
};

// Verify Password Reset OTP (without resetting password)
export const verifyPasswordResetOtp = async (req, res) => {
  try {
    console.log("Verify Password Reset OTP request received:", req.body);
    const { email, otp } = req.body;

    if (!email || !otp) {
      console.log("Missing email or OTP:", { email: !!email, otp: !!otp });
      return res.json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    console.log("Looking for stored OTP data for email:", email);
    const storedOtpData = passwordResetOtpStore.get(email);
    console.log("Stored OTP data:", storedOtpData ? { 
      hasOtp: !!storedOtpData.otp, 
      expiresAt: new Date(storedOtpData.expiresAt),
      attempts: storedOtpData.attempts,
      currentTime: new Date()
    } : "No data found");

    if (!storedOtpData) {
      console.log("No OTP data found for email:", email);
      return res.json({
        success: false,
        message: "OTP not found or expired. Please request a new password reset.",
      });
    }

    // Check if OTP is expired
    if (Date.now() > storedOtpData.expiresAt) {
      console.log("OTP expired for email:", email);
      passwordResetOtpStore.delete(email);
      return res.json({
        success: false,
        message: "OTP has expired. Please request a new password reset.",
      });
    }

    // Check attempts (max 3 attempts)
    if (storedOtpData.attempts >= 3) {
      console.log("Too many attempts for email:", email);
      passwordResetOtpStore.delete(email);
      return res.json({
        success: false,
        message: "Too many failed attempts. Please request a new password reset.",
      });
    }

    // Verify OTP
    console.log("Comparing OTPs - Received:", otp, "Stored:", storedOtpData.otp);
    if (storedOtpData.otp !== otp) {
      storedOtpData.attempts += 1;
      console.log("OTP mismatch. Attempts now:", storedOtpData.attempts);
      return res.json({ success: false, message: "Invalid OTP" });
    }

    console.log("OTP verified successfully for email:", email);
    // OTP is valid, but don't delete it yet (we'll need it for password reset)
    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.log("Verify Password Reset OTP Error:", error.message);
    res.json({
      success: false,
      message: "OTP verification failed. Please try again.",
    });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const storedOtpData = passwordResetOtpStore.get(email);

    if (!storedOtpData) {
      return res.json({
        success: false,
        message:
          "OTP not found or expired. Please request a new password reset.",
      });
    }

    // Check if OTP is expired
    if (Date.now() > storedOtpData.expiresAt) {
      passwordResetOtpStore.delete(email);
      return res.json({
        success: false,
        message: "OTP has expired. Please request a new password reset.",
      });
    }

    // Check attempts (max 3 attempts)
    if (storedOtpData.attempts >= 3) {
      passwordResetOtpStore.delete(email);
      return res.json({
        success: false,
        message:
          "Too many failed attempts. Please request a new password reset.",
      });
    }

    // Verify OTP
    if (storedOtpData.otp !== otp) {
      storedOtpData.attempts += 1;
      return res.json({ success: false, message: "Invalid OTP" });
    }

    // Find user and update password
    const user = await User.findOne({ email });
    if (!user) {
      passwordResetOtpStore.delete(email);
      return res.json({
        success: false,
        message: "User not found",
      });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Remove OTP from store
    passwordResetOtpStore.delete(email);

    res.json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.log("Reset Password Error:", error.message);
    res.json({
      success: false,
      message: "Password reset failed. Please try again.",
    });
  }
};

// Register User
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, mobile, drivingLicense, otpVerified } =
      req.body;

    if (!name || !email || !password || password.length < 6) {
      return res.json({
        success: false,
        message:
          "Fill all the fields and password must be at least 6 characters",
      });
    }

    // Check if OTP was verified (for new registrations)
    if (!otpVerified) {
      return res.json({
        success: false,
        message: "Email verification required",
      });
    }

    // Validate mobile number (10 digits)
    if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
      return res.json({
        success: false,
        message: "Mobile number must be exactly 10 digits",
      });
    }

    // Validate driving license
    if (!drivingLicense || drivingLicense.trim() === "") {
      return res.json({
        success: false,
        message: "Driving license number is required",
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.json({ success: false, message: "User already exists" });
    }

    // Check if mobile number is already registered
    const mobileExists = await User.findOne({ mobile });
    if (mobileExists) {
      return res.json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      mobile,
      drivingLicense: drivingLicense.trim(),
      emailVerified: true, // Mark as verified since OTP was confirmed
    });
    const token = generateToken(user._id.toString());
    res.json({ success: true, token, message: "Registration successful" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Login User
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(user._id.toString());
    res.json({ success: true, token });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Admin Login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for admin credentials
    if (email === "aniket.singh9322@gmail.com" && password === "Vicky@123") {
      // Create a temporary admin user object for token generation
      const adminId = "admin_" + Date.now(); // Temporary admin ID
      const token = generateToken(adminId);

      return res.json({
        success: true,
        token,
        message: "Admin login successful",
      });
    }

    // If not admin credentials, try regular user login
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(user._id.toString());
    res.json({ success: true, token });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get User data
export const getUserData = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId).select("-password");
    res.json({ success: true, user });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get all cars
export const getCars = async (req, res) => {
  try {
    const cars = await Car.find();
    res.json({ success: true, cars });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
