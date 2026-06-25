const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Global error handlers to prevent server crashes on Puppeteer/file-lock errors
process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global WhatsApp Client state
let client = null;
let clientStatus = 'DISCONNECTED'; // DISCONNECTED, INITIALIZING, QR_RECEIVED, CONNECTED, FAILURE
let qrCodeDataUrl = null;
let lastError = null;
let clientInfo = null;

// Initialize WhatsApp Web Client
function initializeWhatsAppClient() {
  if (client && (clientStatus === 'CONNECTED' || clientStatus === 'INITIALIZING' || clientStatus === 'QR_RECEIVED')) {
    console.log(`WhatsApp client already exists in state: ${clientStatus}`);
    return;
  }

  // If there was an existing failed/disconnected client, destroy it
  if (client) {
    try {
      console.log('Destroying previous WhatsApp client instance...');
      client.destroy();
    } catch (e) {
      console.error('Error destroying client:', e);
    }
    client = null;
  }

  clientStatus = 'INITIALIZING';
  qrCodeDataUrl = null;
  lastError = null;
  clientInfo = null;

  console.log('Initializing WhatsApp client...');

  try {
    const os = require('os');
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: path.join(os.tmpdir(), 'wwebjs_auth')
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // Helps inside lightweight containers/VMs
          '--disable-gpu',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
      }
    });

    client.on('qr', async (qr) => {
      console.log('QR Code received, converting to Data URL...');
      clientStatus = 'QR_RECEIVED';
      try {
        qrCodeDataUrl = await qrcode.toDataURL(qr);
      } catch (err) {
        console.error('Failed to generate QR data URL:', err);
        lastError = 'Failed to generate QR Code image';
      }
    });

    client.on('ready', () => {
      console.log('WhatsApp client is READY!');
      clientStatus = 'CONNECTED';
      qrCodeDataUrl = null;
      clientInfo = {
        pushname: client.info.pushname,
        wid: client.info.wid
      };
    });

    client.on('authenticated', () => {
      console.log('WhatsApp authenticated successfully.');
    });

    client.on('auth_failure', (msg) => {
      console.error('WhatsApp authentication failure:', msg);
      clientStatus = 'FAILURE';
      lastError = msg || 'Authentication failed';
    });

    client.on('disconnected', (reason) => {
      console.log('WhatsApp client was disconnected:', reason);
      clientStatus = 'DISCONNECTED';
      qrCodeDataUrl = null;
      clientInfo = null;
    });

    client.initialize().catch((err) => {
      console.error('Error during client.initialize():', err);
      clientStatus = 'FAILURE';
      lastError = err.message || 'Initialization failed';
    });

  } catch (err) {
    console.error('Failed to create WhatsApp Client instance:', err);
    clientStatus = 'FAILURE';
    lastError = err.message || 'Failed to start';
  }
}

// Helper: format phone number to @c.us format
function formatWhatsAppNumber(phone) {
  // Strip all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // If it's a 10 digit Indian mobile number, prepend 91 (India country code)
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  // Return formatted number
  if (!cleaned.endsWith('@c.us')) {
    cleaned = cleaned + '@c.us';
  }
  
  return cleaned;
}

// Endpoint: GET Status of Client
app.get('/api/whatsapp/status', (req, res) => {
  return res.status(200).json({
    success: true,
    status: clientStatus,
    qrCodeDataUrl: qrCodeDataUrl,
    clientInfo: clientInfo,
    error: lastError
  });
});

// Endpoint: POST Initialize Client
app.post('/api/whatsapp/initialize', (req, res) => {
  initializeWhatsAppClient();
  return res.status(200).json({
    success: true,
    message: 'WhatsApp initialization process started',
    status: clientStatus
  });
});

// Endpoint: POST Send Message
app.post('/api/whatsapp/send-message', async (req, res) => {
  const { phone, message, pdfFilename, attachments } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'Missing phone or message in request body' });
  }

  if (clientStatus !== 'CONNECTED' || !client) {
    return res.status(400).json({ error: 'WhatsApp client is not connected' });
  }

  const formattedPhone = formatWhatsAppNumber(phone);

  try {
    // Validate that the number is actually registered on WhatsApp
    console.log(`Checking if number ${formattedPhone} is registered on WhatsApp...`);
    const isRegistered = await client.isRegisteredUser(formattedPhone);
    if (!isRegistered) {
      console.warn(`Number ${formattedPhone} is NOT registered on WhatsApp!`);
      return res.status(400).json({
        success: false,
        error: `The phone number ${phone} is not registered on WhatsApp.`
      });
    }

    // Force WhatsApp Web to find/create the chat thread first (resolves unsaved contacts issue)
    console.log(`Locating chat thread for ${formattedPhone}...`);
    const chat = await client.getChatById(formattedPhone);

    console.log(`Sending WhatsApp message to: ${formattedPhone}`);
    const response = await chat.sendMessage(message);
    console.log(`Message successfully sent to ${formattedPhone}: ${response.id.id}`);

    // If there is a pdfFilename, send it from screenshots directory using manual base64 read
    if (pdfFilename) {
      const filePath = path.join(process.cwd(), 'screenshots', pdfFilename);
      if (fs.existsSync(filePath)) {
        console.log(`Loading local PDF guide: ${pdfFilename} as base64...`);
        const fileData = fs.readFileSync(filePath, { encoding: 'base64' });
        const media = new MessageMedia('application/pdf', fileData, pdfFilename);
        console.log(`Sending PDF guide attachment to ${formattedPhone}...`);
        const mediaResponse = await chat.sendMessage(media);
        console.log(`Media attachment "${pdfFilename}" successfully sent to ${formattedPhone}: ${mediaResponse.id.id}`);
      } else {
        console.warn(`File not found: ${filePath}`);
      }
    }

    // If there are manual base64 attachments, send them
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        console.log(`Sending manual attachment "${att.filename}" to ${formattedPhone}`);
        const mimeType = att.mimeType || att.mimetype || 'application/pdf';
        const media = new MessageMedia(mimeType, att.content, att.filename);
        const mediaResponse = await chat.sendMessage(media);
        console.log(`Manual attachment "${att.filename}" successfully sent to ${formattedPhone}: ${mediaResponse.id.id}`);
      }
    }

    return res.status(200).json({
      success: true,
      messageId: response.id.id
    });
  } catch (error) {
    console.error(`Failed to send WhatsApp message to ${formattedPhone}:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed sending WhatsApp message'
    });
  }
});

// Endpoint: POST Logout & Reset
app.post('/api/whatsapp/logout', async (req, res) => {
  console.log('Logging out from WhatsApp...');
  try {
    if (client) {
      await client.logout();
      await client.destroy();
    }
  } catch (err) {
    console.error('Error during WhatsApp logout/destroy:', err);
  } finally {
    client = null;
    clientStatus = 'DISCONNECTED';
    qrCodeDataUrl = null;
    clientInfo = null;
    lastError = null;

    // Delete session storage folder
    const os = require('os');
    const sessionPath = path.join(os.tmpdir(), 'wwebjs_auth');
    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log('WhatsApp auth folder cleared.');
      } catch (rmErr) {
        console.error('Could not delete auth folder:', rmErr);
      }
    }
  }

  return res.status(200).json({
    success: true,
    message: 'Logged out and state reset successfully'
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Local WhatsApp automation server is running on http://localhost:${PORT}`);
  
  // Auto-initialize on server startup to restore saved sessions automatically
  initializeWhatsAppClient();
});
