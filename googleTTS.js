const googleTTS = require('google-tts-api');
const request = require('request');

function tts(message, language, frequency) {

    message = message.replace(/\^\^/img, '');

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
