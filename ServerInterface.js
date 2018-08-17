const bodyParser = require('body-parser');
const express = require('express');
const request = require('request');
const path = require('path');

function ServerInterface(bot)
{
    this.bot = bot;
}
console.log(Date.now(), new Date(Date.now()).toLocaleString());
ServerInterface.prototype.initialize = function() {
    const app = new express();

    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.get('/ping', (req, res) => {
        res.send('ok');

        const midnight = 1534537281957 + 1000 * ((60 - 21) + 60 * (60 - 22 + 60 * (24 - 23)));
        const toDateMin = midnight + 1000 * 60 * 60 * 16;
        const toDateMax = toDateMin + 1000 * 29;
        const now = Date.now();

        //if(toDateMin < now && now < toDateMax)
        {
            const guild = this.bot.client.guilds.filter(g => g.name === 'Orokin Guilde Académie').first();
            if(guild)
            {
                const usr = guild.members
                    .map(m => m.user)
                    .filter(u => u.username.indexOf('general_shark') !== -1)
                    [0];

                console.log(usr.username);
                    /*
                usr.createDM().then(dm => {
                    dm.send(``);
                })*/
            }
        }
    });
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

    setInterval(() => {
        request('https://aka-talk.herokuapp.com/ping');
    }, 30 * 1000);
}

module.exports = ServerInterface;
