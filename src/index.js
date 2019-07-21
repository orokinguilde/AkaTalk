const fs = require('fs');

process.env = fs.existsSync('./env.json') ? JSON.parse(fs.readFileSync('./env.json')) : process.env;

let changed;
do
{
    changed = false;
    for(const key in process.env)
    {
        const oldValue = process.env[key];
        let newValue = oldValue.toString();
        
        for(const keyToReplace in process.env)
        {
            newValue = newValue.replace(new RegExp('\{\s*' + keyToReplace + '\s*\}', 'img'), process.env[keyToReplace]);
        }

        if(oldValue !== newValue)
        {
            changed = true;
            process.env[key] = newValue;
        }
    }
} while(changed);

console.log('ENV', process.env);

const AkaTalkBot = require('./AkaTalkBot2');

const bot = new AkaTalkBot({
    token: process.env.TOKEN
});

bot.start();
