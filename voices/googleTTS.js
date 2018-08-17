const ttsManager = require('../ttsManager');
const googleTTS = require('google-tts-api');
const request = require('request');
const fs = require('fs');

const textTransformations = ttsManager.openTransformFile('googleTextTransformations.json');

function tts(text, language, frequency)
{
    text = ttsManager.transform(text, textTransformations);

    text = text
        .replace(/\^\^/img, '')
        .replace(/ç/img, 's');

    let speed = 1;
    const frequencyMatch = /\s*(\+|-)?(\d+)%\s*/img.exec(frequency || '');
    if(frequencyMatch)
    {
        try
        {
            speed = 1 + parseInt(frequencyMatch[frequencyMatch.length - 1]) / 100;
            if(frequencyMatch.length === 3 && frequencyMatch[1] === '-')
            {
                speed = 1 - (speed - 1);
            }
        }
        catch(ex)
        {
            console.error(ex);
        }
    }

    return googleTTS(text, language, speed)
        .then(function(url) {
            return request
                .get(url)
                .on('response', function(response) {
                    if(response.headers['content-length'] < 1024)
                        this.end();
                });
        });
}

module.exports = function(options) {
    return tts(options.message, options.language, options.frequency);
};
