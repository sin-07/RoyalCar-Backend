import 'dotenv/config';

console.log('Environment variables:');
console.log('IMAGEKIT_PUBLIC_KEY:', process.env.IMAGEKIT_PUBLIC_KEY ? 'SET' : 'NOT SET');
console.log('IMAGEKIT_PRIVATE_KEY:', process.env.IMAGEKIT_PRIVATE_KEY ? 'SET' : 'NOT SET');
console.log('IMAGEKIT_URL_ENDPOINT:', process.env.IMAGEKIT_URL_ENDPOINT ? 'SET' : 'NOT SET');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');

if (process.env.IMAGEKIT_PUBLIC_KEY) {
  console.log('IMAGEKIT_PUBLIC_KEY value:', process.env.IMAGEKIT_PUBLIC_KEY);
}
