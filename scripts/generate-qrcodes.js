const qr = require('qrcode');
const path = require('path');
const fs = require('fs');

const iosLink = "https://apps.apple.com/in/app/gryphon-academy/id6778033799";
const androidLink = "https://play.google.com/store/apps/details?id=com.connecthq.eventpass";

const assetsDir = path.join(__dirname, '..', 'assets', 'images');

// Ensure assets/images exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const iosPath = path.join(assetsDir, 'ios-qr.png');
const androidPath = path.join(assetsDir, 'android-qr.png');

async function generateQRs() {
  try {
    // Generate iOS QR Code
    await qr.toFile(iosPath, iosLink, {
      color: {
        dark: '#01224E', // Matching the app's theme color
        light: '#FFFFFF'
      },
      width: 512,
      margin: 2
    });
    console.log(`Successfully generated iOS QR code at: ${iosPath}`);

    // Generate Android QR Code
    await qr.toFile(androidPath, androidLink, {
      color: {
        dark: '#01224E', // Matching the app's theme color
        light: '#FFFFFF'
      },
      width: 512,
      margin: 2
    });
    console.log(`Successfully generated Android QR code at: ${androidPath}`);
  } catch (err) {
    console.error('Error generating QR codes:', err);
  }
}

generateQRs();
