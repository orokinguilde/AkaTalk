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
        const toDateMin = midnight + 1000 * 60 * 60 * 16;
        const toDateMax = toDateMin + 1000 * 60;
        const now = Date.now();

        if(toDateMin < now && now < toDateMax && !messageSent)
        {
            const guild = this.bot.client.guilds.filter(g => g.name === 'Orokin Guilde Académie').first();
            if(guild)
            {
                const usr = guild.members
                    .map(m => m.user)
                    .filter(u => u.username.indexOf('(general_shark)') !== -1)
                    [0];

                if(usr)
                {
                    messageSent = true;
                    usr.createDM().then(dm => {
                        dm.send(`C'est AkaTalk qui te parle ; Akamelia m'a programmée pour te passer un petit message accompagné de plein de bisous tout doux, aujourd'hui, à 16h de l'après midi. Si tu reçois ça à la bonne heure (en un seul exemplaire), alors elle va être super contente! hihihi ^^
Voici le message :

:hearts: :hearts: :hearts: :hearts: :hearts: :hearts: :hearts: :rabbit: :hearts: :hearts: :hearts: :hearts: :hearts:
:hearts: :rabbit: :hearts: :hearts: :rabbit: :hearts: :hearts: :hearts: :hearts: :hearts: :hearts: :hearts: :rabbit:
:hearts: :hearts: :hearts: :hearts: :hearts: :hearts: :hearts: :hearts: :hearts: :rabbit: :hearts: :hearts: :hearts:

Rho, des lapinous se sont encore cachés dans le champ de coeurs... Ils sont vraiment trop coquins ces lapinous! ^^
Je suis persuadée que tu manques beaucoup à Akamelia aujourd'hui ^^

*(Si tu as envie de répondre, ne le fais pas ici, je ne délivre que les messages d'Aka moi, na! ^^)*`, { split: true });
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
