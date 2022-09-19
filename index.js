const fs = require('fs-extra');

const path = require('node:path');

const { Client, Collection, GatewayIntentBits, ActivityType } = require('discord.js');

(async () => {
    if (await fs.pathExists('.env') == false) {
        await fs.createFile('.env')
                .then(() => {
                    console.info(new Date().toLocaleString() + ' - Created an ENV file successfully.');
                })
                .catch(error => {
                    console.error(new Date().toLocaleString() + error);
                });

        const pattern = [
            'TOKEN=',
            '',
            'CLIENT_ID=',
            'GUILDS_ID=',
        ];

        await fs.writeFile('.env', pattern.join('\n'))
                .then(() => {
                    console.info(new Date().toLocaleString() + ' - Written a pattern in ENV configuration module!');
                })
                .catch(error => {
                    console.error(new Date().toLocaleString() + error);
                });
    }
    else {
        let _dotenv = require('dotenv').config();

        console.info(new Date().toLocaleString() + ' - A configuration\'s ENV file already exists! Using DOTENV to put in environment variables.');
    }

    if (await fs.pathExists('applies-order.json') == false) {
        await fs.createFile('applies-order.json')
                .then(() => {
                    console.info(new Date().toLocaleString() + ' - Created a JSON application handler file successfully.');
                })
                .catch(error => {
                    console.error(new Date().toLocaleString() + error);
                });

        const pattern_non = [ ]

        await fs.writeFile('applies-order.json', JSON.stringify(pattern_non))
                .then(() => {
                    console.info(new Date().toLocaleString() + ' - Written a pattern into application handler JSON representation!');
                })
                .catch(error => {
                    console.error(new Date().toLocaleString() + error);
                });
    }
    if (await fs.pathExists('.env.json') == false) {
        await fs.createFile('.env.json')
                .then(() => {
                    console.info(new Date().toLocaleString() + ' - Created a ENV-JSON application file successfully.');
                })
                .catch(error => {
                    console.error(new Date().toLocaleString() + error);
                });

        const pattern_cfg = {
            'ADMINS_CHANNEL_ID': "-1",
            'PUBLIC_CHANNEL_ID': "-1",
            'MEMBERS_ROLES_IDS': "-1"
        }

        const pattern_data = JSON.stringify(pattern_cfg, undefined, 4);

        await fs.writeFile('.env.json', pattern_data);
    }

    const client = new Client({
        partials: [
            'CHANNEL',
            'MESSAGE',
            'REACTION'
        ],
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions,  
            GatewayIntentBits.MessageContent]
    });

    client.commands = new Collection();

    const commands_path = path.join(__dirname, 'commands');
    const command_files = await (await fs.readdir(commands_path)).filter(file => file.endsWith('.js'));

    for(let i = 0; i < command_files.length; i++) {
        const file = command_files[i];
        const file_path = path.join(commands_path, file);

        const command = require(file_path);

        client.commands.set(command.data.name, command);
    }

    client.once('ready', () => {
        console.info(new Date().toLocaleString() + ' - The client is ready for work!');

        client.user.setPresence({
            activities: [{
                name: 'API',
                type: 5
            }],
            status: 'dnd'
        });
    });

    client.on('messageReactionAdd', async (reaction, user) => {
        if(reaction.partial) { try { await reaction.fetch(); } catch (error) { console.error(error); return; } }
    
        if(user.bot) return;
        
        const message_id = reaction.message.id;

        const applies_order = require('./applies-order.json');

        if(applies_order.find(object => object['ADMINS_MESSAGE_ID'] === `${message_id}`)) {
            if(reaction.emoji.name === '✅') {
                /*! Re-send it in public channel for criticise.*/

                /*
                 * Required stack for this type of work you can access.
                 * Use fetch function for specified message either get it from emoji (if its in emoji),
                 * otherwise, use object system with channels and other stuff (you have in mind this, OK).
                 */
            }
            if(reaction.emoji.name === '❎') {
                await reaction.message.delete();
            }
        }
    });

    client.on('interactionCreate', async interaction => {
        if(!interaction.isChatInputCommand()) return;

        const command_name = interaction.commandName;

        const command = interaction.client.commands.get(command_name);

        if(!command)
            return;

        try {
            await command.execute(interaction);
        } catch(error) {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });

            console.error(error);
        }
    });

    client.login(process.env.TOKEN);
})();