const TextToSpeechV1 = require('watson-developer-cloud/text-to-speech/v1');
const Readable = require('stream').Readable;

const credentials = {
    url: 'https://stream.watsonplatform.net/text-to-speech/api',
    username: '0cc74568-af4c-44c9-b062-6dc0ea226ad2',
    password: 'ttaU7qrCF6hW'
};

const textToSpeech = new TextToSpeechV1({
    username: credentials.username,
    password: credentials.password
});

const languages = {
    'en-US-1': 'Allison',
    'en-US-2': 'Lisa',
    'en-US-3': 'Michael',
    'en-US': 'Allison',
    'en-GB': 'Kate',
    'es-ES-1': 'Enrique',
    'es-ES-2': 'Laura',
    'es-ES': 'Laura',
    'es-LA': 'Sofia',
    'es-US': 'Sofia',
    'de-DE-1': 'Dieter',
    'de-DE-2': 'Birgit',
    'de-DE': 'Birgit',
    'fr-FR': 'Renee',
    'it-IT': 'Francesca',
    'ja-JP': 'Emi',
    'pt-BR': 'Isabela'
};
const fallbackLanguages = {
    'en': 'en-US',
    'fr': 'fr-FR',
    'es': 'es-ES',
    'de': 'de-DE',
    'it': 'it-IT',
    'ja': 'ja-JP',
    'pt': 'pt-BR'
};
const defaultLanguage = 'fr-FR';

const audioFormats = [
    'audio/basic',
    'audio/flac',
    'audio/l16;rate=nnnn',
    'audio/ogg',
    'audio/ogg;codecs=opus',
    'audio/ogg;codecs=vorbis',
    'audio/mp3',
    'audio/mpeg',
    'audio/mulaw;rate=nnnn',
    'audio/wav',
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/webm;codecs=vorbis'
];
const defaultAudioFormat = 'audio/wav';

/**
 * Récupère le nom complet de la voix en fonction de la langue.
 * 
 * @param {string} language Langue de la voix
 * @returns {string} Nom complet de la voix
 */
function getVoice(language)
{
    language = fallbackLanguages[language] || language || defaultLanguage;

    return language + '_' + languages[language] + 'Voice';
}

/**
 * Transforme le texte vers un format XML.
 * 
 * Code(s) interpretée(s) :
 * * /xxx => pause de xxx ms
 * 
 * @returns {string} Texte transformé
 * @param {string} text Texte à transformer
 */
function mutateText(text)
{
    const mutatedText = text.replace(/\/(\d+)/img, '<break time="$1ms"/>');

    return `
        <speak version="1.0">
            <prosody rate="+10%">
                ${mutatedText}
            </prosody>
        </speak>
    `;
}

/**
 * Récupère le texte en flux audio en utilisant Watson <3
 * 
 * @param {string} message Message à lire
 * @param {string} language Langue du message
 * @param {string=} format Format audio du flux de sortie
 * @returns {Promise<Readable>}
 */
function tts(message, language, format)
{
    const params = {
        text: mutateText(message),
        voice: getVoice(language),
        accept: format || defaultAudioFormat
    };

    return new Promise((resolve, reject) => {
        textToSpeech.synthesize(params, (e, audioArray) => {
            if(e)
                return reject(e);
            
            // Correction du header pour le format audio WAV
            if(params.accept.toLowerCase().indexOf('wav') > -1)
                textToSpeech.repairWavHeader(audioArray);

            // Transforme le tableau en stream
            const audioStream = new Readable();
            audioStream._read = () => {};
            audioStream.push(audioArray);
            audioStream.push(null);

            resolve(audioStream);
        });
    });
}

module.exports = tts;
