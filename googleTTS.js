const googleTTS = require('google-tts-api');
const request = require('request');

function tts(message, language) {

    return googleTTS(message, language, 1)
        .then(function(url) {
            return request
                .get(url)
                .on('response', function(response) {
                    if ( response.headers['content-length'] < 1024 ) 
                        this.end();
                });
        });
}

module.exports = function(options) {
    return tts(options.message, options.language);
};
