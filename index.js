require('dotenv').config();

const fs = require('fs-extra');

const { Client, GatewayIntentBits } = require('discord.js');

(async () => {
    if (await fs.pathExists('.env') == false) {
        await fs.ensureFile('.env')
        .then(() => {
            console.info(new Date().toLocaleString() + ' • Created configuration file!');
        })
        .catch(err => {
            console.error(err);
        })

        const pattern = ['AUTH_TOKEN=NULL', '', 'CLIENT_ID=NULL', '', 'GUILD_ID=NULL', 'ADMINS_CHANNEL_ID=NULL', 'PUBLIC_CHANNEL_ID=NULL']

        await fs.writeFile('.env', pattern.join('\n'));

        process.abort();
    }
    else
        console.info(new Date().toLocaleString() + ' • A configuration\'s ENV file already exists!');
    
    const client = new Client({ partials: ['CHANNEL'], intents: [GatewayIntentBits.Guilds] });

    client.once('ready', () => {
        console.info(new Date().toLocaleString() + ' • Ready!');
    });
    
    client.login(process.env.AUTH_TOKEN);
})();