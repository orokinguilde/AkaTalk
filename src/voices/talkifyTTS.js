const ttsManager = require('../ttsManager');
const request = require('request');
const fs = require('fs');

const textTransformations = ttsManager.openTransformFile('./talkifyTextTransformations.json');

function tts(text, language, format, frequency)
{
    text = ttsManager.transform(text, textTransformations);

    return new Promise((resolve, reject) => {
        const stream = request({
            url: 'https://talkify.net/api/speech/v1',
            method: 'GET',
            qs: {
                text: text,
                key: process.env.TALKIFY_KEY,
                voice: 'Hortense'
            },
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'identity;q=1, *;q=0',
                'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'chrome-proxy': 'frfr',
                'Connection': 'keep-alive',
                'DNT': '1',
                'Host': 'talkify.net',
                'Pragma': 'no-cache',
                'Range': 'bytes=0-',
                'Referer': 'https://fiddle.jshell.net/woqw6b6g/76/show/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36 OPR/54.0.2952.71',
            }
        });

        resolve(stream);
    });
}

module.exports = function(options) {
    return tts(options.message, options.language, options.format, options.frequency);
};
