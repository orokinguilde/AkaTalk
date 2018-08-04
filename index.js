const Discord = require('discord.js');
const watsonTTS = require('./watsonTTS');
const googleTTS = require('./googleTTS');
const fs = require('fs');

function AkaTalkBot(options)
{
    if(!options)
        throw new Error('options must be specified');
    if(!options.token)
        throw new Error('options.token must be specified');
    if(!options.language)
        options.language = 'fr';
    if(!options.pourcentage)
        options.pourcentage = '+5%';
    
    this.options = options;
    this.tts = this.options.tts || watsonTTS;

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
 * @param {string} pourcentage 
 * @return {string}
 */
AkaTalkBot.prototype.frequency = function(pourcentage) {
    if(pourcentage !== undefined)
        this.options.pourcentage = pourcentage;
    
    return this.options.pourcentage;
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
        {
            voiceChannel.leave()
            voiceChannel.join().then(connection => this._connection = connection);
        }
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
    
    console.log('I', message);
    this.tts({
        message: message,
        language: this.language(),
        format: undefined,
        frequency: this.frequency()
    }).then(stream => {
        const fileName = 'audio' + Math.random() + '.wav';
        const destStream = fs.createWriteStream(fileName);
        console.log('O', message);

        destStream.on('close', () => {
            console.log('E', message);
            setTimeout(() => {
                //const connection = voiceChannel.connection;
                //this.currentVoiceChannel().join().then((connection) => {

                    const connection = this._connection;
                    connection.playFile(fileName).on('end', () => {
                        console.log('ED', message);
                        process.nextTick(() => {
                            if(callback)
                                callback(true);
                            
                            setTimeout(() => {
                                try
                                {
                                    fs.unlinkSync(fileName);
                                }
                                catch(ex)
                                { }
                            }, 10000);
                        })
                    });
                //})
            }, 500);
        });
        
        const play_padding = message.length < 20;
        
        if(play_padding)
        {
            const b = fs.createReadStream('./padding.mp3');

            stream.pipe(destStream, { end: false });
            stream.on('error', (e) => {
                reject(e);
            });
            stream.on('end', () => {
                b.pipe(destStream);
                b.on('error', (e) => {
                    reject(e);
                });
            });
        }
        else
        {
            stream.pipe(destStream);
            stream.on('error', (e) => {
                reject(e);
            });
        }
/*
        stream
            .pipe(destStream)
            .on('close', () => {
                console.log('E', message);
                setTimeout(() => {
                    //const connection = voiceChannel.connection;
                    this.currentVoiceChannel().join().then((connection) => {

                        //const connection = this._connection;
                        connection.playFile(fileName).on('end', () => {
                            console.log('ED', message);
                            process.nextTick(() => {
                                if(callback)
                                    callback(true);
                                
                                setTimeout(() => {
                                    try
                                    {
                                        fs.unlinkSync(fileName);
                                    }
                                    catch(ex)
                                    { }
                                }, 10000);
                            })
                        });
                    })
                }, 500);
            });*/
    });

    return true;
};

AkaTalkBot.prototype.log = function() {
    console.log.apply(arguments);
};
AkaTalkBot.prototype.error = function() {
    console.error.apply(arguments);
};

AkaTalkBot.prototype.findUserVoiceChannelByUser = function(message) {
    const userVoiceChannels = message.guild.channels
        .filter(channel => channel.constructor.name === 'VoiceChannel')
        .filter(voiceChannel => voiceChannel.speakable && voiceChannel.joinable)
        .filter(voiceChannel => voiceChannel.members.some(user => user.id === message.author.id))
        .array();

    return userVoiceChannels[0];
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
        exec(/^\s*!lang\s+([^\s]+)\s*$/, (lang) => {
            this.log('CHANGED LANG TO', lang);
            const language = this.language(lang);
            message.reply(`Changed language to : ${language}`);
        })

        // !freq <pourcentage>
        exec(/^\s*!freq\s+([\+\-]?[^\s]+)\s*$/, (pourcentage) => {
            this.log('CHANGED LANG TO', pourcentage);
            const frequency = this.frequency(pourcentage);
            message.reply(`Changed frequency to : ${frequency}`);
        })

        // !voice <voice>
        exec(/^\s*!voice\s+(google|watson)\s*$/, (voice) => {
            this.log('CHANGED VOICE TO', voice);

            switch(voice.toLowerCase())
            {
                case 'google':
                    this.tts = googleTTS;
                    message.reply(`Switched to Google`);
                    break;

                case 'watson':
                    this.tts = watsonTTS;
                    message.reply(`Switched to Watson`);
                    break;

                default:
                    message.reply(`Voice not recognized`);
                    break;
            }
        })
        
        // !follow
        exec(/^\s*!follow\s*$/, () => {
            this.log('START FOLLOW');

            this.currentVoiceChannel(this.findUserVoiceChannelByUser(message) || null);
            this.followedUser(message.author);
            message.reply(`Following my sweet master ${message.author.username}`);
        })
        
        // !unfollow
        exec(/^\s*!unfollow\s*$/, () => {
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
