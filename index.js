const ServerInterface = require('./ServerInterface');
const AkaTalkBot = require('./AkaTalkBot');
const fs = require('fs');

const bot = new AkaTalkBot({
    token: process.env.TOKEN || fs.readFileSync('./token').toString()
});

const serverInterface = new ServerInterface(bot);
serverInterface.initialize();
serverInterface.start(process.env.PORT || 8080);

bot.start();
