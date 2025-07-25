// Script to update old Booking documents to add startDateTime and endDateTime as ISO strings
// Run with: node server/scripts/fix-old-bookings-datetime.js

import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.DB_URL;

async function fixOldBookings() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const bookings = await Booking.find({ $or: [ { startDateTime: { $exists: false } }, { endDateTime: { $exists: false } } ] });
  let updated = 0;
  for (const b of bookings) {
    let changed = false;
    if (!b.startDateTime && b.pickupDate && b.pickupTime) {
      b.startDateTime = new Date(`${b.pickupDate}T${b.pickupTime}`).toISOString();
      changed = true;
    }
    if (!b.endDateTime && b.returnDate && b.returnTime) {
      b.endDateTime = new Date(`${b.returnDate}T${b.returnTime}`).toISOString();
      changed = true;
    }
    if (changed) {
      await b.save();
      updated++;
      console.log(`Updated booking ${b._id}`);
    }
  }
  console.log(`Done. Updated ${updated} bookings.`);
  await mongoose.disconnect();
}

fixOldBookings().catch(e => { console.error(e); process.exit(1); });
