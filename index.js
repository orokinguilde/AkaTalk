const fs = require('fs');

process.env = fs.existsSync('./env.json') ? JSON.parse(fs.readFileSync('./env.json')) : process.env;

const ServerInterface = require('./ServerInterface');
const AkaTalkBot = require('./AkaTalkBot');

const bot = new AkaTalkBot({
    token: process.env.TOKEN
});

const serverInterface = new ServerInterface(bot);
serverInterface.initialize();
serverInterface.start(process.env.PORT || 8080);

bot.start();
