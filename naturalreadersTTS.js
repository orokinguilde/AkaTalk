const ttsManager = require('./ttsManager');
const request = require('request');
const fs = require('fs');

const textTransformations = JSON.parse(fs.readFileSync('naturalreadersTextTransformations.json'));

const voices = {
    alice: {
        r: 0,
        s: 1,
        l: 0,
        v: 'aca'
    },
    marie: {
        r: 10,
        s: 1,
        l: 0,
        v: 'mac'
    }
};

function tts(text, language, format, frequency, voice)
{
    text = ttsManager.transform(text, textTransformations);

    return new Promise((resolve, reject) => {

        if(text.trim().length === 0)
        {
            reject();
        }
        else
        {
            const stream = request.post({
                url: `https://prt0c2rsyg.execute-api.us-east-1.amazonaws.com/Prod/tts?r=${voice.r}&s=${voice.s}&l=${voice.l}&v=${voice.v}&t=${encodeURIComponent(text)}`,
                //url: 'http://localhost:1900/?r=10&s=1&l=0&v=mac&t=' + encodeURIComponent(text),
                method: 'POST',
                //form: {"t":text},
                body: JSON.stringify({t: text}),
                //body: 't=' + encodeURIComponent('ça va bien, merci x!'),
                headers: {
                    'accept': '*/*',
                    'accept-encoding': 'gzip, deflate, br',
                    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                    'cache-control': 'no-cache',
                    //'content-type': 'application/x-www-form-urlencoded',
                    //'content-type': 'application/json',
                    'dnt': '1',
                    'origin': 'https://www.naturalreaders.com',
                    'pragma': 'no-cache',
                    'referer': 'https://www.naturalreaders.com/online/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36 OPR/54.0.2952.71',
                }
            });

            resolve(stream);
        }
    });
}

function createFn(voice) {
    return function(options) {
        return tts(options.message, options.language, options.format, options.frequency, voice);
    };
}

module.exports = createFn(voices.alice);
module.exports.alice = createFn(voices.alice);
module.exports.marie = createFn(voices.marie);
