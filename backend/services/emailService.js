const nodemailer = require('nodemailer');

// Gmail SMTP configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

const sendBiltyEmail = async (bilty, recipientEmail, recipientName) => {
  const mailOptions = {
    from: `"Bharat Transport Company" <${process.env.EMAIL_USER || 'your-email@gmail.com'}>`,
    to: recipientEmail,
    subject: `Your Bilty ${bilty.lr_no} - Bharat Transport Company`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #cc0000;">BHARAT TRANSPORT COMPANY</h2>
        <p>Dear ${recipientName},</p>
        <p>Your Bilty has been successfully created with the following details:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;">
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>LR Number:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${bilty.lr_no}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Date:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${new Date(bilty.lr_date).toLocaleDateString('en-IN')}</td>
          </tr>
          <tr style="background: #f5f5f5;">
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>From:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${bilty.from_name}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>To:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${bilty.to_name}</td>
          </tr>
          <tr style="background: #f5f5f5;">
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Grand Total:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">₹ ${bilty.grand_total}</td>
          </tr>
        </table>
        
        <p>You can track your consignment using the LR Number: <strong>${bilty.lr_no}</strong></p>
        
        <p style="margin-top: 30px;">Thank you for choosing Bharat Transport Company!</p>
        
        <div style="border-top: 2px solid #cc0000; padding-top: 10px; margin-top: 20px;">
          <p style="font-size: 12px; color: #666;">
            <strong>Bharat Transport Company</strong><br>
            Head Office: Ward No. 17, Purana Falsa, Pilani Road, Rajgarh, Churu, Rajasthan, 331023<br>
            Email: bharattrsnportcompany@gmail.com
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendBiltyEmail };
