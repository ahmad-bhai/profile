const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

// 1. Webhook Endpoint - ٹیلیگرام کی طرف سے آنے والے میسجز کے لیے
app.post('/api/webhook/:token', async (req, res) => {
  const { token } = req.params;
  const { msg, chnlurl } = req.query;

  const update = req.body;

  if (update && update.chat_join_request) {
    const joinReq = update.chat_join_request;
    const userId = joinReq.from.id;
    const firstName = joinReq.from.first_name || 'User';

    const bot = new TelegramBot(token);
    const messageText = `${msg || 'Welcome!'}\n\n${chnlurl || ''}`.replace('{name}', firstName);

    try {
      await bot.sendMessage(userId, messageText);
    } catch (err) {
      console.error(`Error sending message: ${err.message}`);
    }
  }

  return res.status(200).send('OK');
});

// 2. Main Manage Route
app.get('/api/manage', async (req, res) => {
  const { token, msg, chnlurl, status } = req.query;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token parameter missing.' });
  }

  const bot = new TelegramBot(token);
  const appDomain = 'https://magic-scripts.vercel.app';

  if (status === 'true') {
    try {
      const encodedMsg = encodeURIComponent(msg || '');
      const encodedChnl = encodeURIComponent(chnlurl || '');

      const webhookUrl = `${appDomain}/api/webhook/${token}?msg=${encodedMsg}&chnlurl=${encodedChnl}`;

      await bot.setWebhook(webhookUrl, {
        allowed_updates: ['chat_join_request']
      });

      return res.json({
        success: true,
        message: 'Bot installed successfully with Webhook!',
        webhookUrl
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  } else if (status === 'false') {
    try {
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

// 3. Fallback Route (اگر کوئی غلط Endpoint پر جائے)
app.use((req, res) => {
  res.status(404).json({
    error: 'API Endpoint Not Found. Make sure you use /api/manage'
  });
});

module.exports = app;
