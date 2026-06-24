const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/api/send-email', async (req, res) => {
  const { smtpConfig, mailOptions } = req.body;

  if (!smtpConfig || !mailOptions) {
    return res.status(400).json({ error: 'Missing smtpConfig or mailOptions in request body' });
  }

  // Set up the transporter
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: parseInt(smtpConfig.port, 10),
    secure: smtpConfig.secure, // true for port 465, false for other ports
    auth: {
      user: smtpConfig.auth.user,
      pass: smtpConfig.auth.pass,
    },
    // Useful for Office365 to bypass TLS connection errors
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  });

  const attachments = [];
  // Automatically attach file from local filesystem if specified
  if (mailOptions.pdfFilename) {
    attachments.push({
      filename: mailOptions.pdfFilename,
      path: path.join(process.cwd(), 'assets', 'images', mailOptions.pdfFilename)
    });
  }



  // Automatically attach horizontal email banners inline (CID)
  if (mailOptions.bannerImage) {
    attachments.push({
      filename: mailOptions.bannerImage,
      path: path.join(process.cwd(), 'assets', 'images', mailOptions.bannerImage),
      cid: 'email_banner'
    });
  } else {
    // Fallbacks
    if (mailOptions.sphereBanner) {
      attachments.push({
        filename: 'synergy_sphere_download_banner.png',
        path: path.join(process.cwd(), 'assets', 'images', 'synergy_sphere_download_banner.png'),
        cid: 'email_banner'
      });
    } else if (mailOptions.masterclassBanner) {
      attachments.push({
        filename: 'masterclass_download_banner.png',
        path: path.join(process.cwd(), 'assets', 'images', 'masterclass_download_banner.png'),
        cid: 'email_banner'
      });
    }
  }

  // Support manual attachments passed from UI
  if (mailOptions.attachments && mailOptions.attachments.length > 0) {
    attachments.push(...mailOptions.attachments);
  }

  try {
    // Verify connection configuration
    await transporter.verify();

    // Send mail
    const info = await transporter.sendMail({
      from: `"${smtpConfig.fromName || 'Gryphon Academy'}" <${smtpConfig.fromEmail || smtpConfig.auth.user}>`,
      to: mailOptions.to,
      subject: mailOptions.subject,
      text: mailOptions.text,
      html: mailOptions.html,
      attachments: attachments,
    });

    console.log(`Email successfully sent to ${mailOptions.to}: ${info.messageId}`);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error(`Failed to send email to ${mailOptions.to}:`, error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Local nodemailer mail server is running on http://localhost:${PORT}`);
});
