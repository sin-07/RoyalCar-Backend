// Simple standalone email test
import { sendConfirmationEmail } from './services/emailService.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing email with logo...');

const mockBooking = {
  _id: '507f1f77bcf86cd799439011',
  firstName: 'John',
  lastName: 'Doe',
  email: 'amukeshpatel222@gmail.com',
  phone: '+91 9876543210',
  address: 'Test Address, Mumbai',
  price: 5000,
  pickupDate: new Date(),
  returnDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  pickupTime: '10:00 AM',
  returnTime: '10:00 AM',
  pickupLocation: 'Mumbai Airport',
  car: {
    brand: 'Mercedes',
    model: 'S-Class',
    year: 2024,
    category: 'Luxury',
    licensePlate: 'MH-01-AB-1234',
    pricePerDay: 2500
  },
  paymentDetails: {
    razorpay_payment_id: 'pay_test123456789',
    paymentMethod: 'Online Payment'
  }
};

sendConfirmationEmail(mockBooking)
  .then(() => {
    console.log('✅ Email sent successfully!');
    console.log('🖼️  Logo should appear next to ROYAL CARS');
    console.log('📧 Check inbox for professional invoice');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Email failed:', error.message);
    process.exit(1);
  });
