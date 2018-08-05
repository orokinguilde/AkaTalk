const googleTTS = require('google-tts-api');
const request = require('request');
const fs = require('fs');

const textTransformations = fs.readFileSync('./googleTextTransformations.json');

function tts(message, language, frequency)
{
    const regexMatcher = /^\/(.+)\/$/;

    for(const key in textTransformations)
    {
        const match = regexMatcher.exec(key);

        if(match && match.length > 1)
        {
            const regex = new RegExp(match[1], 'mg');
            text = text.replace(regex, textTransformations[key]);
        }
        else
        {
            const regex = new RegExp(`(?:\\s|^)${key}(?:\\s|$)`, 'img');
            text = text.replace(regex, ' ' + textTransformations[key] + ' ');
        }
    }

    message = message
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

    return googleTTS(message, language, speed)
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