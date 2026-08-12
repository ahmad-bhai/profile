const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// 1. Webhook Endpoint
app.post('/api/webhook/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { msg, chnlurl } = req.query;
    const update = req.body;

    if (update && update.chat_join_request) {
      const joinReq = update.chat_join_request;
      const userId = joinReq.from.id;
      const firstName = joinReq.from.first_name || 'User';

      const decodedMsg = decodeURIComponent(msg || 'Welcome!');
      const decodedChnl = decodeURIComponent(chnlurl || '');
      const messageText = `${decodedMsg}\n\n${decodedChnl}`.replace('{name}', firstName);

      // Axios کا استعمال کریں تاکہ Node.js Crash نہ ہو
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: userId,
        text: messageText,
        parse_mode: 'Markdown'
      });
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(200).send('OK'); // Telegram کو 200 ہی دیں تاکہ وہ بار بار میسج نہ بھیجے
  }
});

// 2. Main Manage Route
app.get('/api/manage', async (req, res) => {
  try {
    const { token, msg, chnlurl, status } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token parameter missing.' });
    }

    const appDomain = 'https://magic-scripts.vercel.app';

    if (status === 'true') {
      const encodedMsg = encodeURIComponent(msg || '');
      const encodedChnl = encodeURIComponent(chnlurl || '');
      const webhookUrl = `${appDomain}/api/webhook/${token}?msg=${encodedMsg}&chnlurl=${encodedChnl}`;

      const response = await axios.post(`https://api.telegram.org/bot${token}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['chat_join_request']
      });

      if (response.data && response.data.ok) {
        return res.json({
          success: true,
          message: 'Bot installed successfully with Webhook!',
          webhookUrl
        });
      } else {
        return res.status(400).json({
          success: false,
          error: response.data.description || 'Failed to set webhook on Telegram.'
        });
      }
    } else if (status === 'false') {
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
          
