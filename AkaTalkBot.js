const Discord = require('discord.js');
const watsonTTS = require('./watsonTTS');
const googleTTS = require('./googleTTS');
const fs = require('fs');

const textToSpeechManagers = {
    Google: googleTTS,
    Watson: watsonTTS
};

function AkaTalkBot(options)
{
    if(!options)
        throw new Error('options must be specified');
    if(!options.token)
        throw new Error('options.token must be specified');
    options = JSON.parse(JSON.stringify(options)); // clone les options

    if(!options.language)
        options.language = 'fr';
    if(!options.frequency)
        options.frequency = '+5%';
    
    this.options = options;
    this.voiceEngine(this.options.ttsName || 'google')

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
    {
        this.options.language = language;
        this.save();
    }
    
    return this.options.language;
};

/**
 * @param {{ id : number, username : string }} user 
 * @return {{ id : number, username : string }}
 */
AkaTalkBot.prototype.followedUser = function(user) {
    if(user !== undefined)
    {
        this.options.followedUser = user;
        this.save();
    }
    
    return this.options.followedUser;
};

/**
 * @param {string} pourcentage 
 * @return {string}
 */
AkaTalkBot.prototype.frequency = function(pourcentage) {
    if(pourcentage !== undefined)
    {
        this.options.frequency = pourcentage;
        this.save();
    }
    
    return this.options.frequency;
};

/**
 * @param {string} muted 
 * @return {string}
 */
AkaTalkBot.prototype.mute = function(muted) {
    if(muted !== undefined)
    {
        this.options.muted = muted;
        this.save();
    }
    
    return this.options.muted;
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
    const voiceEngine = this.voiceEngine();

    voiceEngine.tts({
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

            const connection = this._connection;
            connection.playFile(fileName).on('end', () => {
                console.log('ED', message);

                process.nextTick(() => {
                    if(callback)
                        callback(true);

                    const deleteFile = () => {
                        fs.unlink(fileName, (e) => {
                            if(e)
                            { // Essayer plus tard si la suppremier n'a pas fonctionnée
                                setTimeout(deleteFile, 3000);
                            }
                        });
                    }
                    
                    deleteFile();
                })
            });
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
    });

    return true;
};

AkaTalkBot.prototype.log = function() {
    console.log.apply(console, arguments);
};
AkaTalkBot.prototype.error = function() {
    console.error.apply(console, arguments);
};

AkaTalkBot.prototype.findVoiceChannelsByUser = function(guild, userId) {
    const voiceChannels = guild.channels
        .filter(channel => channel.constructor.name === 'VoiceChannel')
        .filter(voiceChannel => voiceChannel.speakable && voiceChannel.joinable)
        .filter(voiceChannel => voiceChannel.members.some(user => user.id === userId))
        .array();

    return voiceChannels;
};
AkaTalkBot.prototype.findUserVoiceChannelByUser = function(message) {
    return this.findVoiceChannelsByUser(message.guild, message.author.id)[0];
};

AkaTalkBot.prototype.save = function(callback, force) {
    callback = callback || (() => {});

    if(this.options.doNotSave && !force)
        return callback();
    
    const followedUser = this.followedUser();

    const state = {
        user: followedUser ? {
            id: followedUser.id,
            username: followedUser.username
        } : undefined,
        frequency: this.frequency(),
        muted: this.mute(),
        language: this.language()
    };

    fs.writeFile('./state.json', JSON.stringify(state), callback);
};
AkaTalkBot.prototype.load = function(callback) {
    callback = callback || (() => {});

    fs.readFile('./state.json', (e, content) => {
        if(e || !content)
            return callback(e);
        
        const state = JSON.parse(content.toString());

        this.frequency(state.frequency);
        this.followedUser(state.user);
        this.language(state.language);
        this.mute(state.muted);

        callback();
    });
};

AkaTalkBot.prototype.disconnectEverywhere = function(userId) {
    for(const [ guildId, guild ] of this.client.guilds)
    {
        for(const channel of this.findVoiceChannelsByUser(guild, userId || this.botUser.id))
        {
            channel.leave();
        }
    }
};

AkaTalkBot.prototype.voiceEngine = function(voiceEngineName) {
    let changeSuccess = undefined;

    if(voiceEngineName !== undefined)
    {
        voiceEngineName = (voiceEngineName || 'google').toLowerCase();

        changeSuccess = false;
        for(const key in textToSpeechManagers)
        {
            if(key.toLowerCase() === voiceEngineName)
            {
                this.options.ttsName = key;
                changeSuccess = true;
                break;
            }
        }
    }

    return {
        tts: textToSpeechManagers[this.options.ttsName],
        name: this.options.ttsName,
        changeSuccess: changeSuccess
    };
};

AkaTalkBot.prototype.initialize = function() {
    const client = new Discord.Client();

    client.on('ready', () => {
        this.log('I am ready!');

        this.botUser = client.user;
        this.botUser.setActivity(this.options.activity || 'dire tout haut ce que l\'on pense tout bas');

        this.disconnectEverywhere();
        
        if(!this.options.doNotLoad)
            this.load();
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
        exec(/^\s*!voice\s+([^\s]+)\s*$/, (voice) => {
            this.log('CHANGED VOICE TO', voice);

            const engine = this.voiceEngine(voice);
            
            if(!engine.changeSuccess)
            {
                message.reply(`Voice engine ${voice} not recognized`);
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
        
        // !mute
        exec(/^\s*!mute\s*$/, () => {
            this.log('MUTE');
            this.mute(true);
            message.reply(`Muted myself`);
        })
        
        // !status
        exec(/^\s*!status\s*$/, () => {
            this.log('STATUS');

            const followedUser = this.followedUser();
            const frequency = this.frequency();
            const language = this.language();
            const muted = this.mute();

            message.reply(`Status :
 * followed user = ${followedUser ? followedUser.username : 'none'}
 * frequency = ${frequency}
 * language = ${language}
 * muted = ${muted ? 'yes' : 'no'}`);
        })
        
        // !unmute
        exec(/^\s*!unmute\s*$/, () => {
            this.log('UNMUTE');
            this.mute(false);
            message.reply(`Ready to speak!`);
        })

        if(!this.mute() && this.currentVoiceChannel())
        {
            const followedUser = this.followedUser();

            if(message.author.id === followedUser.id)
            {
                exec(/^\s*([a-zA-Z0-9].+)\s*$/, (text) => {
                    if(text.indexOf('@ ') === 0)
                        return;
                    
                    this.log('SAYING', text);
                    this.talk(text);
                });
            }
        }
    });

    client.on('voiceStateUpdate', (oldMember, newMember) => {
        const followedUser = this.followedUser();
        this.log('SWITCH CHANNEL', newMember.user.username, followedUser ? followedUser.username : undefined, !!followedUser);

        if(followedUser && newMember.user.id === followedUser.id)
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

module.exports = AkaTalkBot;
