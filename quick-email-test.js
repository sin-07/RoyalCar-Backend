// Quick Email Test - Royal Cars with Logo
import { sendConfirmationEmail } from './services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Royal Cars Email Test Starting...');
console.log('=====================================');

// Test booking data
const testBooking = {
  _id: '507f1f77bcf86cd799439011',
  firstName: 'Test',
  lastName: 'User',
  email: 'amukeshpatel222@gmail.com', // Your configured email
  phone: '+91 9876543210',
  address: 'Test Address, Mumbai, Maharashtra',
  price: 8500,
  pickupDate: new Date(),
  returnDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
  pickupTime: '10:00 AM',
  returnTime: '10:00 AM',
  pickupLocation: 'Mumbai International Airport',
  car: {
    brand: 'BMW',
    model: 'X7',
    year: 2024,
    category: 'Luxury SUV',
    licensePlate: 'MH-01-RC-2024',
    pricePerDay: 2500
  },
  paymentDetails: {
    razorpay_payment_id: 'pay_test_BMW_X7_2024',
    razorpay_order_id: 'order_test_royal_cars',
    razorpay_signature: 'sig_test_payment',
    paymentMethod: 'Credit Card'
  }
};

console.log('📧 Test Email Details:');
console.log(`   To: ${testBooking.email}`);
console.log(`   Vehicle: ${testBooking.car.brand} ${testBooking.car.model}`);
console.log(`   Amount: ₹${testBooking.price}`);
console.log(`   Duration: 3 days`);

console.log('\n🔄 Sending email...');

sendConfirmationEmail(testBooking)
  .then(() => {
    console.log('\n✅ EMAIL TEST SUCCESSFUL!');
    console.log('🖼️  Logo: Should appear next to "ROYAL CARS"');
    console.log('📄 PDF: Professional invoice attached');
    console.log('📱 Mobile: Responsive email template');
    console.log('📬 Check your inbox now!');
  })
  .catch(error => {
    console.error('\n❌ EMAIL TEST FAILED');
    console.error('Error:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Email credential issue detected');
      console.log('   - Check .env file for MAIL_USER and MAIL_PASS');
      console.log('   - Ensure Gmail app password is correct');
    }
  });
