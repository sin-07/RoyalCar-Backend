import express from 'express';
import { sendConfirmationEmail } from '../services/emailService.js';
import Booking from '../models/Booking.js';

const router = express.Router();

// Test route to send professional invoice email
router.post('/test-email/:bookingId', async (req, res) => {
  try {
    console.log('🧪 Test email route called for booking:', req.params.bookingId);
    
    const booking = await Booking.findById(req.params.bookingId).populate('car');
    
    if (!booking) {
      console.log('❌ Booking not found:', req.params.bookingId);
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    console.log('📧 Found booking:', {
      id: booking._id,
      email: booking.email,
      firstName: booking.firstName,
      lastName: booking.lastName,
      car: booking.car ? `${booking.car.brand} ${booking.car.model}` : 'No car data'
    });

    // Check for required email environment variables
    console.log('🔍 Checking environment variables...');
    console.log('MAIL_USER exists:', !!process.env.MAIL_USER);
    console.log('MAIL_PASS exists:', !!process.env.MAIL_PASS);
    
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      return res.status(500).json({
        success: false,
        message: 'Email credentials not configured',
        debug: {
          MAIL_USER: !!process.env.MAIL_USER,
          MAIL_PASS: !!process.env.MAIL_PASS
        }
      });
    }
    
    await sendConfirmationEmail(booking);
    
    res.json({ 
      success: true, 
      message: 'Professional invoice email sent successfully!',
      invoiceNumber: `RC-${new Date().getFullYear()}-${booking._id.toString().slice(-6).toUpperCase()}`,
      sentTo: booking.email
    });
    
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email',
      error: error.message,
      stack: error.stack
    });
  }
});

// Test route to check environment variables
router.get('/check-env', (req, res) => {
  res.json({
    emailConfigured: !!(process.env.MAIL_USER && process.env.MAIL_PASS),
    MAIL_USER: process.env.MAIL_USER ? `${process.env.MAIL_USER.substring(0, 3)}***@${process.env.MAIL_USER.split('@')[1]}` : 'Not set',
    MAIL_PASS: process.env.MAIL_PASS ? '***configured***' : 'Not set',
    NODE_ENV: process.env.NODE_ENV || 'development'
  });
});

// Test route with mock booking data
router.post('/test-email-mock', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required in request body'
      });
    }

    console.log('🧪 Creating mock booking for email test...');
    
    // Create mock booking data
    const mockBooking = {
      _id: '507f1f77bcf86cd799439011', // Mock ObjectId
      firstName: 'Test',
      lastName: 'Customer',
      email: email,
      phone: '9876543210',
      price: 5000,
      pickupDate: new Date(),
      returnDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      pickupTime: '10:00 AM',
      returnTime: '10:00 AM',
      pickupLocation: 'Mumbai Airport',
      car: {
        brand: 'Mercedes',
        model: 'S-Class',
        year: 2024,
        category: 'Luxury',
        licensePlate: 'MH-01-AB-1234',
        pricePerDay: 5000
      },
      paymentDetails: {
        razorpay_payment_id: 'pay_test123456789',
        razorpay_order_id: 'order_test123456789',
        razorpay_signature: 'signature_test123456789'
      }
    };

    console.log('📧 Sending test email to:', email);
    
    await sendConfirmationEmail(mockBooking);
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully!',
      sentTo: email,
      invoiceNumber: `RC-${new Date().getFullYear()}-439011`
    });
    
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

export default router;
