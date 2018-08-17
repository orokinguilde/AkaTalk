const ttsManager = require('./ttsManager');
const Ivona = require('ivona');

const ivona = new Ivona({
    accessKey: 'IVONA_ACCESS_KEY',
    secretKey: 'IVONA_SECRET_KEY'
});

function tts(text, language, format, frequency)
{
    text = ttsManager.transform(text, textTransformations);

    ivona.createVoice(message, {
        body: {
            voice: {
                name: 'Léa',
                language: 'fr-FR',
                gender: 'Female'
            }
        }
    });
}

module.exports = function(options) {
    return tts(options.message, options.language, options.format, options.frequency);
};
