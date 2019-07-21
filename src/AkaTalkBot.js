const CombinedStream = require('combined-stream');
const StorageFile = require('./StorageFile');
const Discord = require('discord.js');
const path = require('path');
const fs = require('fs');

const watsonTTS = require('./voices/watsonTTS');
const googleTTS = require('./voices/googleTTS');
const talkifyTTS = require('./voices/talkifyTTS');
const naturalreadersTTS = require('./voices/naturalreadersTTS');

const textToSpeechManagers = {
    Google: googleTTS,
    Watson: watsonTTS,
    Talkify: talkifyTTS,
    Naturalreaders: naturalreadersTTS,
    'Naturalreaders Marie': naturalreadersTTS.marie,
    'Naturalreaders Alice': naturalreadersTTS.alice,
    'Naturalreaders Juliette': naturalreadersTTS.juliette,
    'Naturalreaders Emmanuel': naturalreadersTTS.emmanuel,
    'Naturalreaders Bruno': naturalreadersTTS.bruno,
    'Naturalreaders Louice': naturalreadersTTS.louice,
    'Naturalreaders Alain': naturalreadersTTS.alain,
};

fs.mkdir('bin', () => {});

function AkaTalkBot(options)
{
    this.noSave(true);

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

    this.options.ttsName = this.options.ttsName || process.env.DEFAULT_VOICE || 'Google';

    if(!options.noInitialization)
        this.initialize();
    if(!options.autoStart)
        this.start();
        
    this.noSave(false);

    this.saveFile = new StorageFile(process.env.STORAGE_FILE_ID);
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

AkaTalkBot.prototype.allowedTextChannel = function(textChannel) {
    if(textChannel !== undefined)
    {
        this.options.textChannel = textChannel ? {
            id: textChannel.id
        } : undefined;
        this.save();
    }
    
    return this.options.textChannel;
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

AkaTalkBot.prototype.pendingTalkStreams = [];

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

    if(message)
    {
        message = message
            .replace(/:[^ ]+:/img, '')
            .replace(/\^\^/img, '')
            .replace(/:3/img, '')
            .replace(/[`'"]/img, '')
            .replace(/([^\s]+)\s*\[([^\]]*)\]/img, '$2');
    }
    
    console.log('I', message);
    const voiceEngine = this.voiceEngine();

        console.log('E', message);

        const getStream = (callback) => {
            voiceEngine.tts({
                message: message,
                language: this.language(),
                format: undefined,
                frequency: this.frequency()
            }).then(stream => {
                //const fileName = path.join(__dirname, '..', 'bin', `audio-${Date.now().toString()}-${Math.random()}.wav`);
                //const destStream = fs.createWriteStream(fileName);
                console.log('O', message);
        
        
                //destStream.on('close', () => {
                //});
        
                const play_padding = message.length < 20;
                let finalStream;
                
                if(play_padding)
                {
                    const b = fs.createReadStream(path.join(__dirname, '..', 'assets', 'padding-2 out of 3.mp3'));
                    
                    const combinedStream = CombinedStream.create();
                    combinedStream.append(stream);
                    combinedStream.append(b);
        
                    finalStream = combinedStream;
                    finalStream = stream;
                }
                else
                {
                    finalStream = stream;
                }

                callback(finalStream);
            });
        }

        getStream((stream) => {

        this.pendingTalkStreams.push({
            stream: (callback) => {
                callback(stream);
            },
            callback: callback
        });

        const runFirstStream = () => {
            const streamInfo = this.pendingTalkStreams[0];

            if(streamInfo)
            {
                console.log('TRY');
                try
                {
                    streamInfo.stream((stream) => {
                        try
                        {
                            const connection = this._connection;
                            const dispatcher = connection.playStream(stream);

                            dispatcher.once('start', () => {
                                connection.player.streamingData.pausedTime = 0;
                            });
                            
                            const bindSpeakingEvent = () => {
                                dispatcher.once('speaking', (isSpeaking) => {
                                    if(!isSpeaking)
                                    {
                                        console.log('ED', message);
                            
                                        process.nextTick(() => {
        
                                            setTimeout(() => {
                                                this.pendingTalkStreams.shift();
                                                runFirstStream();
                                            }, 0);
        
                                            if(streamInfo.callback)
                                                streamInfo.callback(true);
                                        })
                                    }
                                    else
                                    {
                                        bindSpeakingEvent();
                                    }
                                });
                            }
                            
                            bindSpeakingEvent();
        
                            //const dispatcher = connection.playStream(streamInfo.stream)
                            /*
                            connection.playFile(fileName)*/
                        }
                        catch(ex)
                        {
                            console.error(ex);
                            this.pendingTalkStreams.shift();

                            if(streamInfo.callback)
                                streamInfo.callback(false);
                        }
                    })
                    
                }
                catch(ex)
                {
                    console.error(ex);
                    this.pendingTalkStreams.shift();

                    if(streamInfo.callback)
                        streamInfo.callback(false);
                }
            }
            else
            {
                console.log('DONE');
            }
        }

        if(this.pendingTalkStreams.length === 1)
        {
            runFirstStream();
        }
    })
    //});

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

AkaTalkBot.prototype.noSave = function(value) {
    if(value !== undefined)
        this._noSave = value;
    return this._noSave;
}

AkaTalkBot.prototype.save = function(callback, force) {
    if(this.noSave())
        return;

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
        language: this.language(),
        ttsName: this.options.ttsName,
        textChannel: this.options.textChannel
    };

    //fs.writeFile('./state.json', JSON.stringify(state), callback);
    this.saveFile.setContent(JSON.stringify(state), callback);
};
AkaTalkBot.prototype.load = function(callback) {
    callback = callback || (() => {});

    this.saveFile.getContent((e, content) => {
    //fs.readFile('./state.json', (e, content) => {
        if(e || !content)
            return callback(e);
        
        try
        {
            const value = content.toString().trim();

            if(value)
            {
                const state = JSON.parse(value);
                console.log('Last state:', state);

                this.noSave(true);

                this.frequency(state.frequency);
                this.followedUser(state.user);
                this.language(state.language);
                this.mute(state.muted);
                this.voiceEngine(state.ttsName);
                this.allowedTextChannel(state.textChannel);
            }
        }
        catch(ex)
        {
            console.error('Error while loading the previous state: ', ex);
        }
        
        this.noSave(false);

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

    //if(voiceEngineName !== undefined)
    {
        voiceEngineName = (/*voiceEngineName || */'Watson').toLowerCase();

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

        if(changeSuccess)
            this.save();
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

        if(message.author.username.trim().toLowerCase() !== process.env.TALKER_USERNAME.trim().toLowerCase())
            return this.log(`${message.author.username.trim().toLowerCase()} is not ${process.env.TALKER_USERNAME.trim().toLowerCase()}`);

        // !emoji <emoji>
        exec(/^\s*!emoji\s+([^\s]+)\s*$/, (emojiName) => {
            this.log('EMOJI ', emojiName);
            
            const emoji = client.emojis.find('name', emojiName);

            message.delete();

            if(!emoji)
            {
                message.reply(`emoji ${emojiName} introuvable`);
                return;
            }

            message.channel.send(`${emoji}`);
        })
        
        // !react <emoji>
        exec(/^\s*!react\s+([^\s]+)\s*$/, (emojiName) => {
            this.log('REACT', emojiName);
            
            const emoji = client.emojis.find('name', emojiName);

            if(!emoji)
            {
                message.delete();
                message.reply(`emoji ${emojiName} introuvable`);
                return;
            }

            message.channel.fetchMessages().then((messages) => {
                let previousMessage = messages.array()[1];
    
                message.delete();
    
                if(previousMessage)
                {
                    previousMessage.react(emoji);
                }
                else
                {
                    message.reply(`message précédent introuvable`);
                }
            })
        })

        /*
        // !setowner <botName> <ownerName>
        exec(/^\s*!setowner\s+([^\s]+)\s+([^\s]+)\s*$/, (botName, ownerName) => {
            this.log('TARGETED BOT =', botName);
            this.log('CURRENT BOT =', client.user.username);

            if(client.user.username.trim().toLowerCase() === botName.trim().toLowerCase())
            {
                this.log('CURRENT BOT TARGETED ; OWNER =', ownerName);

                message.delete();
                message.reply(`détenteur(se) changé(e) pour : ${ownerName}`);
            }
            else
            {
                this.log('NOT TARGETED');
            }
        })*/

        // !lang <language>
        exec(/^\s*!lang\s+([^\s]+)\s*$/, (lang) => {
            this.log('CHANGED LANG TO', lang);
            const language = this.language(lang);
            
            message.delete();
            message.reply(`langue changée pour : ${language}`);
        })

        // !freq <pourcentage>
        exec(/^\s*!freq\s+([\+\-]?[^\s]+)\s*$/, (pourcentage) => {
            this.log('CHANGED LANG TO', pourcentage);
            const frequency = this.frequency(pourcentage);
            
            message.delete();
            message.reply(`fréquence changée pour : ${frequency}`);
        })

        // !voices
        exec(/^\s*!voices\s*$/, (voice) => {
            this.log('GET VOICES');

            let reply = 'voici les différentes voix :\r\n';
            for(const name in textToSpeechManagers)
            {
                reply += `* ${name}\r\n`;
            }
            
            message.delete();
            message.reply(reply);
        })

        // !voice <voice>
        exec(/^\s*!voice\s+(.+)\s*$/, (voice) => {
            voice = voice.trim();

            this.log('CHANGED VOICE TO', voice);

            const engine = this.voiceEngine(voice);
            
            message.delete();
            if(!engine.changeSuccess)
            {
                message.reply(`la voix ${voice} n'est pas reconnue.`);
            }
            else
            {
                message.reply(`voix changée pour ${engine.name}.`);
            }
        })
        
        // !follow
        exec(/^\s*!follow\s*$/, () => {
            this.log('START FOLLOW');

            this.currentVoiceChannel(this.findUserVoiceChannelByUser(message) || null);
            this.followedUser(message.author);
            this.allowedTextChannel(message.channel);
            
            message.delete();
            message.reply(`je te suis ! :rabbit:`);
        })
        
        // !unfollow
        exec(/^\s*!unfollow\s*$/, () => {
            this.log('START UNFOLLOW');
            this.currentVoiceChannel(null);
            this.followedUser(null);
            this.allowedTextChannel(null);

            message.delete();
            message.reply(`j'arrête de te suivre ! :bear:`);
        })
        
        // !talksite
        exec(/^\s*!talksite\s*$/, () => {
            this.log('TALK SITE');

            message.delete();
            message.reply(`le site est à l'adresse suivante : https://${process.env.HEROKU_NAME}.herokuapp.com/`);
        })
        
        // !mute
        exec(/^\s*!mute\s*$/, () => {
            this.log('MUTE');
            this.mute(true);

            message.delete();
            message.reply(`chuuuuuuuuuut :rabbit:`);
        })
        
        // !status
        exec(/^\s*!status\s*$/, () => {
            this.log('STATUS');

            const followedUser = this.followedUser();
            const frequency = this.frequency();
            const language = this.language();
            const muted = this.mute();
            const voiceEngine = this.voiceEngine();

            message.delete();
            message.reply(`Statut :
 * utilisateur suivi = ${followedUser ? followedUser.username : 'none'}
 * fréquence = ${frequency}
 * langue = ${language}
 * voix = ${voiceEngine.name}
 * muted = ${muted ? 'yes' : 'no'}`);
        })
        
        // !unmute
        exec(/^\s*!unmute\s*$/, () => {
            this.log('UNMUTE');
            this.mute(false);
            
            message.delete();
            message.reply(`prêt(e) à tout dire ! :rabbit:`);
        })
        
        if(!this.mute() && this.currentVoiceChannel())
        {
            const followedUser = this.followedUser();
            const allowedTextChannel = this.allowedTextChannel();

            if(message.author.id === followedUser.id && allowedTextChannel && message.channel.id === allowedTextChannel.id)
            {
                exec(/^\s*([^@!/\\\$\^].+)\s*$/, (text) => {
                    this.log('SAYING', text);
                    this.talk(text, (success) => {
                        if(success)
                        {
                        }
                    });
                });
            }
        }

        /*
        exec(/^@@@(.+)$/, (text) => {
            this.log('SAYING', text);
            this.talk(text, () => {
            });
        })*/
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
