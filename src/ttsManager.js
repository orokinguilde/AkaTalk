const path = require('path');
const fs = require('fs');

module.exports = {
    openTransformFile: function() {
        const args = [ __dirname, 'voices' ];
        for(const value of arguments)
            args.push(value);

        const filePath = path.join.apply(path, args);
        return JSON.parse(fs.readFileSync(filePath).toString());
    },
    transform: function(text, textTransformations)
    {
        const regexMatcher = /^\/(.+)\/$/;

        for(const key in textTransformations)
        {
            const match = regexMatcher.exec(key);

            if(match && match.length > 1)
            {
                const regex = new RegExp(match[1], 'mg');
                text = text.replace(regex, textTransformations[key]);
            }
            else
            {
                const regex = new RegExp(`(?:\\s|^)${key}(?:\\s|$)`, 'img');
                text = text.replace(regex, ' ' + textTransformations[key] + ' ');
            }
        }

        return text;
    }
}