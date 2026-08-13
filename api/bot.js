const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// 1. Webhook Endpoint - جوائن ریکویسٹ اور /start دونوں کو ہینڈل کرے گا
app.post('/api/webhook/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { msg, chnlurl } = req.query;
    const update = req.body;

    const decodedMsg = decodeURIComponent(msg || 'APNE CHANNELKA LINK LGALENA OKK AHMAD BHAI');
    const decodedChnl = decodeURIComponent(chnlurl || '');
    const messageText = `${decodedMsg}\n\n${decodedChnl}`.trim();

    let targetUserId = null;

    // کیس 1: اگر کسی ممبر نے چینل میں Join Request بھیجی ہو
    if (update && update.chat_join_request) {
      targetUserId = update.chat_join_request.user_chat_id;
    } 
    // کیس 2: اگر کسی یوزر نے بوٹ کو ڈائریکٹ /start بھیجا ہو
    else if (update && update.message && update.message.text === '/start') {
      targetUserId = update.message.chat.id;
    }

    // اگر دونوں میں سے کوئی بھی ایونٹ ہوا ہو تو میسج بھیجیں
    if (targetUserId) {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: targetUserId,
        text: messageText,
        parse_mode: 'Markdown'
      });
      console.log(`Message successfully sent to user: ${targetUserId}`);
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook processing error:', err.message);
    return res.status(200).send('OK'); // Telegram کو 200 ہی دیں تاکہ سرور لوپ نہ بنے
  }
});

// 2. Main Manage Route (Install / Uninstall)
app.get('/api/manage', async (req, res) => {
  try {
    const { token, msg, chnlurl, status } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token parameter missing.' });
    }

    const appDomain = 'https://profile-tau-sage-32.vercel.app';

    if (status === 'true') {
      const encodedMsg = encodeURIComponent(msg || '');
      const encodedChnl = encodeURIComponent(chnlurl || '');
      const webhookUrl = `${appDomain}/api/webhook/${token}?msg=${encodedMsg}&chnlurl=${encodedChnl}`;

      // Telegram Webhook سیٹ کریں (chat_join_request اور message دونوں ایونٹس کی اجازت دیں)
      const response = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['chat_join_request', 'message']
      });

      if (response.data && response.data.ok) {
        return res.json({
          success: true,
          message: 'Bot installed successfully with Join Request & /start handlers!',
          webhookUrl
        });
      } else {
        return res.status(400).json({
          success: false,
          error: response.data.description || 'Failed to set webhook.'
        });
      }
    } else if (status === 'false') {
      // Webhook ختم کریں (Uninstall)
      const response = await axios.get(`https://api.telegram.org/bot${token}/deleteWebhook`);

      if (response.data && response.data.ok) {
        return res.json({
          success: true,
          message: 'Bot uninstalled successfully.'
        });
      } else {
        return res.status(400).json({
          success: false,
          error: response.data.description || 'Failed to delete webhook.'
        });
      }
    }

    return res.status(400).json({ success: false, error: 'Status must be true or false.' });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.response?.data?.description || error.message
    });
  }
});

module.exports = app;
