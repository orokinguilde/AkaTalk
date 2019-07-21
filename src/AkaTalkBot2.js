const Discord = require('discord.js');

const watsonTTS = require('./voices/watsonTTS');

const textToSpeechManagers = {
    Watson: watsonTTS
};
    
function Player()
{
    this.streams = [];
}
Player.prototype.setVoiceChannelConnection = function(voiceChannelConnection) {
    this.voiceChannelConnection = voiceChannelConnection;
}
Player.prototype.getVoiceChannelConnection = function() {
    return this.voiceChannelConnection;
}
Player.prototype.hasVoiceChannelConnection = function() {
    return !!this.voiceChannelConnection;
}
Player.prototype.playStream = function(stream) {
    this.streams.push(stream);

    if(this.streams.length === 1)
    {
        this.runNextInQueue();
    }
}
Player.prototype.runNextInQueue = async function() {
    if(this.streams.length > 0)
    {
        await this.directPlayStream(this.streams[0]);
        
        this.streams.shift();
        this.runNextInQueue();
    }
}
Player.prototype.directPlayStream = function(stream) {
    const connection = this.getVoiceChannelConnection();
    const streamDispatcher = connection.playStream(stream, {
        seek: 0,
        volume: 1,
        bitrate: 48000
    });

    return new Promise((resolve, reject) => {
        streamDispatcher.on('error', reject);
        streamDispatcher.on('end', () => resolve());
    });
}

function AkaTalkBot(options)
{
    if(!options)
        throw new Error('options must be specified');
    if(!options.token)
        throw new Error('options.token must be specified');
    options = JSON.parse(JSON.stringify(options)); // clone les options
    
    this.options = options;

    if(!options.noInitialization)
        this.initialize();
}

AkaTalkBot.prototype.log = function() {
    console.log.apply(console, arguments);
};
AkaTalkBot.prototype.error = function() {
    console.error.apply(console, arguments);
};

AkaTalkBot.prototype.voiceEngine = function() {
    return {
        tts: textToSpeechManagers.Watson,
        name: 'Watson'
    };
};

AkaTalkBot.prototype.initialize = function() {
    const client = new Discord.Client();

    client.on('ready', () => {
        this.log('I am ready!');

        this.botUser = client.user;
        this.botUser.setAvatar(this.options.avatar || 'https://hdwallpaperim.com/wp-content/uploads/2017/08/22/392150-women-face-mouth-fantasy_art-space-universe-lights-stars-digital_art-simple_background-artwork-atmosphere.jpg');
        this.botUser.setActivity(this.options.activity || 'dire tout haut ce que l\'on pense tout bas');
    });
    
    client.on('error', (error) => {
        this.error(error);
    });
    
    let talkChannelId = undefined;
    const player = new Player();
    
    client.on('message', async (message) => {

        if(message.author.username.trim().toLowerCase() !== process.env.TALKER_USERNAME.trim().toLowerCase())
            return;

        if(message.content && message.content.match(/^!akatalk$/))
        {
            if(talkChannelId)
            {
                talkChannelId = undefined;
                message.reply('Disabled talking here.');
            }
            else
            {
                talkChannelId = message.channel.id;
                message.reply('Enabled talking here.');
            }
        }

        if(talkChannelId && player.hasVoiceChannelConnection())
        {
            let text = message.content;
            if(text && text.trim().match(/^[a-zA-Z0-9"'`]/))
            {
                text = text
                    .replace(/:[^ ]+:/img, '')
                    .replace(/\^\^/img, '')
                    .replace(/:3/img, '')
                    .replace(/[`'"]/img, '')
                    .replace(/([^\s]+)\s*\[([^\]]*)\]/img, '$2')
                    .trim();
                    
                if(text)
                {
                    const stream = /*await*/ this.voiceEngine().tts({
                        message: text,
                        language: 'fr'
                    });

                    if(stream)
                    {
                        //stream.pipe(require('fs').createWriteStream('./a.webm'));

                        player.playStream(stream);
                    }
                }
            }
        }
    });

    client.on('voiceStateUpdate', async (oldMember, newMember) => {
        if(newMember.user.username.trim().toLowerCase() === process.env.TALKER_USERNAME.trim().toLowerCase())
        {
            if(newMember.voiceChannel)
            {
                player.setVoiceChannelConnection(await newMember.voiceChannel.join());
            }
            else
            {
                player.setVoiceChannelConnection(undefined);
                oldMember.voiceChannel.leave();
            }
        }
    });
    
    this.client = client;
};
AkaTalkBot.prototype.start = function() {
    this.client.login(this.options.token);
};

module.exports = AkaTalkBot;
