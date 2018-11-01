const ttsManager = require('../ttsManager');
const request = require('request');

const textTransformations = ttsManager.openTransformFile('naturalreadersTextTransformations.json');

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
    },
    juliette: {
        r: 8,
        s: 1,
        l: 0,
        v: 'att'
    },
    emmanuel: {
        r: 9,
        s: 1,
        l: 0,
        v: 'mac'
    },
    bruno: {
        r: 1,
        s: 1,
        l: 0,
        v: 'aca'
    },
    louice: {
        r: 22,
        s: 1,
        l: 0,
        v: 'aca'
    },
    alain: {
        r: 7,
        s: 1,
        l: 0,
        v: 'att'
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
                method: 'POST',
                body: JSON.stringify({t: text}),
                headers: {
                    'accept': '*/*',
                    'accept-encoding': 'gzip, deflate, br',
                    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                    'cache-control': 'no-cache',
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
module.exports.juliette = createFn(voices.juliette);
module.exports.emmanuel = createFn(voices.emmanuel);
module.exports.bruno = createFn(voices.bruno);
module.exports.louice = createFn(voices.louice);
module.exports.alain = createFn(voices.alain);
