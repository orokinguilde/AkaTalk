const bodyParser = require('body-parser');
const express = require('express');
const path = require('path');

function ServerInterface(bot)
{
    this.bot = bot;
}
ServerInterface.prototype.initialize = function() {
    const app = new express();

    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'serverInterface.html'));
    });
    app.post('/say', (req, res) => {
        const text = req.body.text;

        this.bot.talk(text, () => {
            res.send('Done');
        })
    });

    this.app = app;
}
ServerInterface.prototype.start = function(port, callback) {
    this.app.listen(port, callback);
}

module.exports = ServerInterface;
