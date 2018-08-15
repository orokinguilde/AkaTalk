const AkaTalkBot = require('./AkaTalkBot');
const fs = require('fs');

const bot = new AkaTalkBot({
    token: process.env.TOKEN || fs.readFileSync('./token').toString()
});

bot.start();
