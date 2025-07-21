import ImageKit from "imagekit";
import 'dotenv/config';

console.log('ImageKit config - Public Key:', process.env.IMAGEKIT_PUBLIC_KEY ? 'SET' : 'NOT SET');
console.log('ImageKit config - Private Key:', process.env.IMAGEKIT_PRIVATE_KEY ? 'SET' : 'NOT SET');
console.log('ImageKit config - URL Endpoint:', process.env.IMAGEKIT_URL_ENDPOINT ? 'SET' : 'NOT SET');

var imagekit = new ImageKit({
    publicKey : process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey : process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint : process.env.IMAGEKIT_URL_ENDPOINT
});

export default imagekit;