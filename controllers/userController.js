import User from "../models/User.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import Car from "../models/Car.js";
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Generate JWT Token
const generateToken = (userId)=>{
    const payload = userId;
    return jwt.sign(payload, process.env.JWT_SECRET)
}

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Test endpoint to check environment variables
export const testConfig = async (req, res) => {
    try {
        const hasEmailUser = !!process.env.MAIL_USER;
        const hasEmailPass = !!process.env.MAIL_PASS;
        const emailUser = process.env.MAIL_USER ? process.env.MAIL_USER.substring(0, 3) + '***' : 'NOT_SET';
        
        res.json({ 
            success: true, 
            message: 'Config check',
            config: {
                hasEmailUser,
                hasEmailPass,
                emailUser
            }
        });
    } catch (error) {
        res.json({ success: false, message: 'Config check failed', error: error.message });
    }
};

// Send OTP
export const sendOtp = async (req, res) => {
    try {
        console.log('Send OTP request received:', req.body);
        const { email } = req.body;

        if (!email) {
            console.log('Error: Email is required');
            return res.json({ success: false, message: 'Email is required' });
        }

        // Check if email environment variables are set
        if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
            console.log('Email configuration missing:', {
                hasEmailUser: !!process.env.MAIL_USER,
                hasEmailPass: !!process.env.MAIL_PASS
            });
            return res.json({ success: false, message: 'Email service not configured' });
        }

        console.log('Checking if user exists for email:', email);
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('User already exists:', email);
            return res.json({ success: false, message: 'User already exists with this email' });
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        console.log('Generated OTP for', email, ':', otp);
        
        // Store OTP with expiration (5 minutes)
        otpStore.set(email, {
            otp,
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
            attempts: 0
        });

        // Send OTP via email
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: email,
            subject: 'Email Verification - Royal Car Rental',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333; text-align: center;">Royal Car Rental</h2>
                    <h3 style="color: #555;">Email Verification</h3>
                    <p>Hello,</p>
                    <p>Thank you for signing up with Royal Car Rental. Please use the following OTP to verify your email address:</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
                    </div>
                    <p>This OTP is valid for 5 minutes only.</p>
                    <p>If you didn't request this verification, please ignore this email.</p>
                    <br>
                    <p>Best regards,<br>Royal Car Rental Team</p>
                </div>
            `
        };

        console.log('Attempting to send email to:', email);
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to:', email);

        res.json({ 
            success: true, 
            message: 'OTP sent successfully to your email' 
        });

    } catch (error) {
        console.log('Send OTP Error Details:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
        res.json({ success: false, message: 'Failed to send OTP. Please try again.' });
    }
};

// Verify OTP
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.json({ success: false, message: 'Email and OTP are required' });
        }

        const storedOtpData = otpStore.get(email);

        if (!storedOtpData) {
            return res.json({ success: false, message: 'OTP not found or expired' });
        }

        // Check if OTP is expired
        if (Date.now() > storedOtpData.expiresAt) {
            otpStore.delete(email);
            return res.json({ success: false, message: 'OTP has expired' });
        }

        // Check attempts (max 3 attempts)
        if (storedOtpData.attempts >= 3) {
            otpStore.delete(email);
            return res.json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
        }

        // Verify OTP
        if (storedOtpData.otp !== otp) {
            storedOtpData.attempts += 1;
            return res.json({ success: false, message: 'Invalid OTP' });
        }

        // OTP is valid - remove from store
        otpStore.delete(email);

        res.json({ 
            success: true, 
            message: 'OTP verified successfully' 
        });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: 'OTP verification failed' });
    }
};

// Register User
export const registerUser = async (req, res)=>{
    try {
        const {name, email, password, mobile, drivingLicense, otpVerified} = req.body

        if(!name || !email || !password || password.length < 6){
            return res.json({success: false, message: 'Fill all the fields and password must be at least 6 characters'})
        }

        // Check if OTP was verified (for new registrations)
        if (!otpVerified) {
            return res.json({success: false, message: 'Email verification required'})
        }

        // Validate mobile number (10 digits)
        if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
            return res.json({success: false, message: 'Mobile number must be exactly 10 digits'})
        }

        // Validate driving license
        if (!drivingLicense || drivingLicense.trim() === '') {
            return res.json({success: false, message: 'Driving license number is required'})
        }

        const userExists = await User.findOne({email})
        if(userExists){
            return res.json({success: false, message: 'User already exists'})
        }

        // Check if mobile number is already registered
        const mobileExists = await User.findOne({mobile})
        if(mobileExists){
            return res.json({success: false, message: 'Mobile number already registered'})
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await User.create({
            name, 
            email, 
            password: hashedPassword, 
            mobile, 
            drivingLicense: drivingLicense.trim(),
            emailVerified: true // Mark as verified since OTP was confirmed
        })
        const token = generateToken(user._id.toString())
        res.json({success: true, token, message: 'Registration successful'})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// Login User
export const loginUser = async (req, res)=>{
    try {
        const {email, password} = req.body

        const user = await User.findOne({email})
        if(!user){
            return res.json({success: false, message: 'Invalid email or password'})
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if(!isMatch){
            return res.json({success: false, message: 'Invalid email or password'})
        }

        const token = generateToken(user._id.toString())
        res.json({success: true, token})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

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
                message: 'Admin login successful'
            });
        }

        // If not admin credentials, try regular user login
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: 'Invalid email or password' });
        }

        const token = generateToken(user._id.toString());
        res.json({ success: true, token });

    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

// Get User data
export const getUserData = async (req, res)=>{
    try {
        const {userId} = req.body
        const user = await User.findById(userId).select('-password')
        res.json({success: true, user})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

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
