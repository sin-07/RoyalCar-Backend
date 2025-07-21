// Royal Cars Email Test with Logo
// Instructions: 
// 1. Update the email address in testEmail variable below
// 2. Run: node test-email-with-logo.js
// 3. Check your inbox for the professional invoice with logo

import { sendConfirmationEmail } from './services/emailService.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// UPDATE THIS WITH YOUR TEST EMAIL ADDRESS
const testEmail = 'Amukeshpatel222@gmail.com'; // Using your configured email for testing

const runEmailTest = async () => {
  console.log('🎯 Royal Cars - Email Logo Test');
  console.log('================================');
  
  try {
    // Verify email credentials
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.error('❌ Email credentials missing!');
      console.log('Please ensure MAIL_USER and MAIL_PASS are set in .env file');
      return;
    }

    // Verify logo file exists
    const logoPath = path.resolve('assets/logo/Royal_Cars.png');
    if (!fs.existsSync(logoPath)) {
      console.error('❌ Logo file not found at:', logoPath);
      return;
    }

    console.log('✅ Email credentials configured');
    console.log('✅ Logo file found:', logoPath);
    console.log('📧 From:', process.env.MAIL_USER);
    console.log('📧 To:', testEmail);
    
    if (testEmail === 'your-email@example.com') {
      console.log('⚠️  Please update the testEmail variable with your actual email address');
      return;
    }

    // Create comprehensive test booking
    const testBooking = {
      _id: '507f1f77bcf86cd799439011',
      firstName: 'Test',
      lastName: 'Customer', 
      email: testEmail,
      phone: '+91 9876543210',
      address: '123 Test Street, Mumbai, Maharashtra 400001',
      price: 12500,
      pickupDate: new Date(),
      returnDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      pickupTime: '09:00 AM',
      returnTime: '09:00 AM',
      pickupLocation: 'Chhatrapati Shivaji International Airport',
      car: {
        brand: 'BMW',
        model: '7 Series',
        year: 2024,
        category: 'Luxury Executive',
        licensePlate: 'MH-01-RC-7777',
        pricePerDay: 2500
      },
      paymentDetails: {
        razorpay_payment_id: 'pay_test_BMW7series_2024',
        razorpay_order_id: 'order_test_royalcars_001',
        razorpay_signature: 'sig_test_secure_payment',
        paymentMethod: 'UPI'
      }
    };

    console.log('\n🚗 Test Booking Details:');
    console.log(`   Vehicle: ${testBooking.car.brand} ${testBooking.car.model} (${testBooking.car.year})`);
    console.log(`   Duration: 5 days`);
    console.log(`   Total: ₹${testBooking.price}`);
    console.log(`   Pickup: ${testBooking.pickupLocation}`);

    console.log('\n📧 Sending email with embedded logo...');
    
    const startTime = Date.now();
    await sendConfirmationEmail(testBooking);
    const duration = Date.now() - startTime;

    console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
    console.log(`⏱️  Time taken: ${duration}ms`);
    console.log('📋 Invoice: RC-2025-439011');
    console.log('🖼️  Logo: Embedded next to ROYAL CARS heading');
    console.log('📎 PDF: Professional invoice attached');
    console.log('📱 Responsive: Mobile-friendly email template');
    
    console.log('\n📮 Check your inbox for:');
    console.log('   ✓ Royal Cars logo displayed in email header');
    console.log('   ✓ Professional invoice PDF attachment');
    console.log('   ✓ Responsive design for mobile/desktop');
    console.log('   ✓ Complete booking and payment details');

  } catch (error) {
    console.error('\n❌ EMAIL TEST FAILED');
    console.error('Error:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check Gmail app password in .env file');
      console.log('   - Ensure 2FA is enabled on Gmail account');
      console.log('   - Verify MAIL_USER and MAIL_PASS are correct');
    }
  }
};

console.log('🎬 Starting Royal Cars Email Test...\n');
runEmailTest();
