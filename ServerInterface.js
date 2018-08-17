const bodyParser = require('body-parser');
const express = require('express');
const request = require('request');
const path = require('path');

function ServerInterface(bot)
{
    this.bot = bot;
}
let messageSent = false;
ServerInterface.prototype.initialize = function() {
    const app = new express();

    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.get('/ping', (req, res) => {
        res.send('ok');

        const midnight = 1534537281957 + 1000 * ((60 - 21) + 60 * (60 - 22 + 60 * (24 - 23)));
        //const toDateMin = midnight + 1000 * 60 * 60 * 16;
        const toDateMin = midnight - 1000 * 60 * 53;
        const toDateMax = toDateMin + 1000 * 60;
        const now = Date.now();

        if(toDateMin < now && now < toDateMax && !messageSent)
        {
            const guild = this.bot.client.guilds.filter(g => g.name === 'Orokin Guilde Académie').first();
            if(guild)
            {
                const usr = guild.members
                    .map(m => m.user)
                    .filter(u => u.username.indexOf('Akamelia') === 0)
                    [0];
                console.log(usr.username);

                if(usr && usr.username === 'Akamelia')
                {
                    messageSent = true;
                    usr.createDM().then(dm => {
                        /*dm.send(`C'est AkaTalk qui te parle ; Akamelia m'a programmée pour te passer un petit message accompagné de plein de bisous, aujourd'hui, à 16h de l'après midi. Si tu reçois ça à la bonne heure, c'est qu'elle a bien fait son travail! hihihi ^^
Voici le message : :hearts: :hearts: :hearts: :hearts: :hearts: :hearts: :hearts: :hearts: :hearts: :hearts:
Je suis persuadée que tu manques beaucoup à Akamelia aujourd'hui ^^

*Ne pas répondre ici ^^*`);*/
                        dm.send(`.`);
                    })
                }
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
