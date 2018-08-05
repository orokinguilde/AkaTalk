const AkaTalkBot = require('./AkaTalkBot');

const bot = new AkaTalkBot({
    token: process.env.TOKEN
});

bot.start();
