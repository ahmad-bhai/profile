const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

// 1. Webhook Endpoint - جہاں ٹیلیگرام جوائن ریکویسٹ کا ڈیٹا بھیجے گا
app.post('/api/webhook/:token', async (req, res) => {
  const { token } = req.params;
  const { msg, chnlurl } = req.query; // Query params کے ذریعے ڈیٹا حاصل کریں گے

  const update = req.body;

  // اگر جوائن ریکویسٹ آئی ہے
  if (update && update.chat_join_request) {
    const joinReq = update.chat_join_request;
    const userId = joinReq.from.id;
    const firstName = joinReq.from.first_name || 'User';

    const bot = new TelegramBot(token);

    const messageText = `${msg || 'Welcome!'}\n\n${chnlurl || ''}`.replace('{name}', firstName);

    try {
      await bot.sendMessage(userId, messageText);
      console.log(`Sent message to ${userId}`);
    } catch (err) {
      console.error(`Error sending message: ${err.message}`);
    }
  }

  return res.status(200).send('OK');
});

// 2. Install / Uninstall API Route
app.get('/api/manage', async (req, res) => {
  const { token, msg, chnlurl, status } = req.query;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token is required.' });
  }

  const bot = new TelegramBot(token);
  // آپ کی Vercel ڈومین
  const appDomain = 'https://profile-tau-sage-32.vercel.app';

  if (status === 'true') {
    try {
      // URL Encoding کا استعمال تاکہ Telegram URL میں کوئی مسئلہ نہ آئے
      const encodedMsg = encodeURIComponent(msg || '');
      const encodedChnl = encodeURIComponent(chnlurl || '');

      const webhookUrl = `${appDomain}/api/webhook/${token}?msg=${encodedMsg}&chnlurl=${encodedChnl}`;

      // Telegram پر Webhook سیٹ کریں
      await bot.setWebhook(webhookUrl, {
        allowed_updates: ['chat_join_request']
      });

      return res.json({
        success: true,
        message: 'Bot installed successfully with Webhook.',
        webhookUrl
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  } else if (status === 'false') {
    try {
      // Webhook ہٹائیں (Uninstall)
      await bot.deleteWebhook();
      return res.json({
        success: true,
        message: 'Bot uninstalled successfully.'
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(400).json({ success: false, error: 'Status must be true or false.' });
});

module.exports = app;
