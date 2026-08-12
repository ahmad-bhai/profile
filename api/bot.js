const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

// ایکٹو بوٹس کے انسٹنسز کو میموری میں محفوظ رکھنے کے لیے
const activeBots = {};

/**
 * URL Pattern:
 * /api/token={token}/msg={msg}/chnl={chnlurl}/{status}
 * 
 * status = true  (To install & run bot)
 * status = false (To uninstall & stop bot)
 */
app.get('/api/token=:token/msg=:msg/chnl=:chnlurl/:status', (req, res) => {
  const { token, msg, chnlurl, status } = req.params;

  // 1. بوٹ بند / ان انسٹال (Status = false)
  if (status === 'false') {
    if (activeBots[token]) {
      try {
        activeBots[token].stopPolling();
        delete activeBots[token];
        return res.json({
          success: true,
          message: 'Bot uninstalled and stopped successfully.'
        });
      } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
    } else {
      return res.json({
        success: true,
        message: 'Bot was not running or already uninstalled.'
      });
    }
  }

  // 2. بوٹ چلانے / انسٹال کرنے کے لیے (Status = true)
  if (status === 'true') {
    try {
      // اگر بوٹ پہلے سے چل رہی ہے تو پرانی کو پہلے سٹاپ کریں
      if (activeBots[token]) {
        activeBots[token].stopPolling();
      }

      // نیا Telegram Bot انسٹنس (Polling Mode)
      const bot = new TelegramBot(token, { polling: true });

      // جوائن ریکویسٹ کا ایونٹ
      bot.on('chat_join_request', async (joinReq) => {
        const userId = joinReq.from.id;
        const firstName = joinReq.from.first_name || 'User';

        // میسج کو فارمیٹ کریں اور چینل کا لنک شامل کریں
        const textToSend = `${msg}\n\n${chnlurl}`.replace('{name}', firstName);

        try {
          // ممبر کو پرسنل چیٹ (DM) میں میسج بھیجیں
          await bot.sendMessage(userId, textToSend);
          console.log(`[Success] Sent message to ${userId}`);
        } catch (error) {
          console.error(`[Error] Failed to send message to ${userId}:`, error.message);
        }
      });

      // بوٹ کو میموری میں محفوظ رکھیں
      activeBots[token] = bot;

      return res.json({
        success: true,
        message: 'Bot installed and started successfully.',
        config: {
          token,
          message: msg,
          channelUrl: chnlurl
        }
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Failed to start bot',
        error: err.message
      });
    }
  }

  return res.status(400).json({ success: false, message: 'Invalid status parameter. Use true or false.' });
});

// Local test یا Vercel کے لیے Server Export
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
  
