import { sendConfirmationEmail } from './services/emailService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testEmailWithLogo = async () => {
  try {
    console.log('🧪 Testing email with logo...');
    
    // Check if email credentials are available
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.error('❌ Email credentials not configured in .env file');
      console.log('Please ensure MAIL_USER and MAIL_PASS are set in your .env file');
      return;
    }

    console.log('✅ Email credentials found');
    console.log('📧 Email user:', process.env.MAIL_USER);

    // Create mock booking data for testing
    const mockBooking = {
      _id: '507f1f77bcf86cd799439011',
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com', // Replace with your actual test email address
      phone: '+91 9876543210',
      address: 'Test Address, Mumbai, Maharashtra',
      price: 7500,
      pickupDate: new Date(),
      returnDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days later
      pickupTime: '10:00 AM',
      returnTime: '10:00 AM',
      pickupLocation: 'Mumbai International Airport',
      car: {
        brand: 'Mercedes-Benz',
        model: 'S-Class',
        year: 2024,
        category: 'Luxury Sedan',
        licensePlate: 'MH-01-RC-2024',
        pricePerDay: 2500
      },
      paymentDetails: {
        razorpay_payment_id: 'pay_test123456789abcdef',
        razorpay_order_id: 'order_test123456789abcdef',
        razorpay_signature: 'signature_test123456789abcdef',
        paymentMethod: 'Credit Card'
      }
    };

    console.log('📧 Sending test email to:', mockBooking.email);
    console.log('🚗 Vehicle:', `${mockBooking.car.brand} ${mockBooking.car.model}`);
    console.log('💰 Amount:', `₹${mockBooking.price}`);

    await sendConfirmationEmail(mockBooking);
    
    console.log('✅ Test email sent successfully!');
    console.log('📋 Invoice number: RC-2025-439011');
    console.log('🖼️  Logo should be displayed next to "ROYAL CARS" heading');
    console.log('📎 PDF invoice attached');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Full error:', error);
  }
};

// Run the test
testEmailWithLogo();
