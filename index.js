const Discord = require('discord.js');
const tts = require('./watsonTTS');
const fs = require('fs');

function AkaTalkBot(options)
{
    if(!options)
        throw new Error('options must be specified');
    if(!options.token)
        throw new Error('options.token must be specified');
    if(!options.language)
        options.language = 'fr';
    
    this.options = options;

    if(!options.noInitialization)
        this.initialize();
    if(!options.autoStart)
        this.start();
}
AkaTalkBot.execIfMatching = function(regex, message, fn) {
    const match = regex.exec(message);

    if(match && match.length > 0)
    {
        fn({
            match: match,
            message: message
        });
        return true;
    }
    else
    {
        return false;
    }
};

/**
 * @param {string} language 
 * @returns {string}
 */
AkaTalkBot.prototype.language = function(language) {
    if(language !== undefined)
        this.options.language = language;
    
    return this.options.language;
};

/**
 * @param {{ id : number, username : string }} user 
 * @return {{ id : number, username : string }}
 */
AkaTalkBot.prototype.followedUser = function(user) {
    if(user !== undefined)
        this.options.followedUser = user;
    
    return this.options.followedUser;
};

/**
 * @param {Discord.VoiceChannel} voiceChannel 
 * @returns {Discord.VoiceChannel}
 */
AkaTalkBot.prototype.currentVoiceChannel = function(voiceChannel) {
    if(voiceChannel !== undefined)
    {
        if(!voiceChannel || !voiceChannel.speakable)
            voiceChannel = undefined;

        if(this._currentVoiceChannel)
            this._currentVoiceChannel.leave();
        
        if(voiceChannel)
            voiceChannel.join();
        this._currentVoiceChannel = voiceChannel;
    }
    
    return this._currentVoiceChannel;
};

/**
 * @param {string} message 
 * @returns {boolean}
 */
AkaTalkBot.prototype.talk = function(message, callback) {
    const voiceChannel = this.currentVoiceChannel();

    if(!voiceChannel)
    {
        if(callback)
            callback(false);
        return false;
    }
    
    tts(message, this.language()).then(stream => {
        const fileName = 'audio' + Math.random() + '.wav';
        const destStream = fs.createWriteStream(fileName);

        stream
            .pipe(destStream)
            .on('close', () => {
                const connection = voiceChannel.connection;
                connection.playFile(fileName).on('end', () => {
                    if(callback)
                        callback(true);
                    
                    fs.unlink(fileName);
                });
            });
    });

    return true;
};

AkaTalkBot.prototype.log = function() {
    console.log.apply(arguments);
};
AkaTalkBot.prototype.error = function() {
    console.error.apply(arguments);
};

AkaTalkBot.prototype.initialize = function() {
    const client = new Discord.Client();

    client.on('ready', () => {
        this.log('I am ready!');
    });
    
    client.on('error', (error) => {
        this.error(error);
    });
    
    client.on('message', (message) => {
        let executed = false;

        const exec = (regex, fn) => {
            if(executed)
                return;
            
            return AkaTalkBot.execIfMatching(regex, message, (info) => {
                executed = true;
                fn.apply(this, info.match.slice(1));
            });
        };

        // !lang <language>
        exec(/^\s*!lang2\s+([^\s]+)\s*$/, (lang) => {
            this.log('CHANGED LANG TO', lang);
            const language = this.language(lang);
            message.reply(`Changed language to : ${language}`);
        })
        
        // !follow
        exec(/^\s*!follow2\s*$/, () => {
            this.log('START FOLLOW');

            const userVoiceChannels = message.guild.channels
                .filter(channel => channel.constructor.name === 'VoiceChannel')
                .filter(voiceChannel => voiceChannel.speakable && voiceChannel.joinable)
                .filter(voiceChannel => voiceChannel.members.some(user => user.id === message.author.id))
                .array();

            if(userVoiceChannels.length > 0)
                this.currentVoiceChannel(userVoiceChannels[0]);
            else
                this.currentVoiceChannel(null);

            this.followedUser(message.author);
            message.reply(`Following my sweet master ${message.author.username}`);
        })
        
        // !unfollow
        exec(/^\s*!unfollow2\s*$/, () => {
            this.log('START UNFOLLOW');
            this.currentVoiceChannel(null);
            this.followedUser(null);
            message.reply(`Stop following my sweet master ${message.author.username}`);
        })

        if(this.currentVoiceChannel())
        {
            const followedUser = this.followedUser();

            if(message.author.id === followedUser.id)
            {
                exec(/^\s*([a-zA-Z0-9].+)\s*$/, (text) => {
                    this.log('SAYING', text);
                    this.talk(text);
                });
            }
        }
    });

    client.on('voiceStateUpdate', (oldMember, newMember) => {
        const followedUser = this.followedUser();
        this.log('SWITCH CHANNEL', newMember.username, followedUser ? followedUser.username : undefined, !!followedUser);

        if(followedUser && newMember.id === followedUser.id)
        {
            if(newMember.voiceChannel)
            {
                this.currentVoiceChannel(newMember.voiceChannel);
                newMember.voiceChannel.join();
            }
            else
            {
                this.currentVoiceChannel(null);
                oldMember.voiceChannel.leave();
            }
        }
    });
    
    this.client = client;
};
AkaTalkBot.prototype.start = function() {
    this.client.login(this.options.token);
};

const bot = new AkaTalkBot({
    token: process.env.TOKEN
});

bot.start();
