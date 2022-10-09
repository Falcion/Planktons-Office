import { Client, GatewayIntentBits, Partials, Collection, TextChannel, EmbedBuilder, Colors } from 'discord.js';
import fs from 'fs-extra';
import path from 'node:path';

const CHANNELS_IDS = JSON.parse(fs.readFileSync('./app-settings.json').toString());

import dotenv from 'dotenv';

//@ts-ignore-error
var delay = ms => new Promise(res => setTimeout(res, ms));

if(fs.pathExistsSync('.env') == false) {
    fs.createFileSync('.env');

    const envPattern = 'BOT_TOKEN=\nDEV_ID=\nCLIENT_ID=\nGUILD_ID=';

    fs.writeFileSync('.env', envPattern);
}
else {
    dotenv.config();
}

if(fs.pathExistsSync('applies-order.json') == false) {
    fs.createFileSync('applies-order.json');

    const appliesPattern: any = [];

    fs.writeFileSync('applies-order.json', JSON.stringify(appliesPattern))
}

if(fs.pathExistsSync('app-settings.json') == false) {
    const settingPattern = {
        adminsAppliesChannelId: -1,
        publicAppliesChannelId: -1 
    };

    fs.writeFileSync('app-settings.json', JSON.stringify(settingPattern, null, 4));
}

const client = new Client({
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction
    ],
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
]});

//@ts-ignore-error
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

for(let i = 0; i < commandFiles.length; i++) {
    const file = commandFiles[i];
    const filePath = path.join(commandsPath, file);

    const command = require(filePath);

    //@ts-ignore-error
    client.commands.set(command.data.name, command);
}

client.once('ready', () => {
    client.user?.setPresence({
        activities: [{
            name: 'API',
            type: 5
        }],
        status: 'dnd',
    });

    console.log('Bot is ready!');
});

client.on('messageCreate', async message => {
    if(message.author.bot) return;

    if(message.author.id === process.env.DEV_ID) {
        if(message.content.includes(`<@${process.env.CLIENT_ID}>`)) {
            await message.reply(`Hello to you too, I am <@${process.env.CLIENT_ID}>! My main purpose is to receive and simple control of applications from users, redirect them to your discretion and then send them for public review!`);
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if(reaction.partial) { 
        try { 
            await reaction.fetch(); 
        } catch (error) { 
            console.error(error); return; 
        } 
    }

    //@ts-ignore-error
    if(user.bot) return;
    
    const messageId = reaction.message.id;

    const applicationsOrder = require('./applies-order.json');

    //@ts-ignore-error
    const application = applicationsOrder.find(apply => apply['adminsChannelMessageId'] === `${messageId}`)
    
    if(application) {
        if(reaction.emoji.name === '✅') {
            /*! Re-send it in public channel for criticise.*/

            await reaction.message.guild?.channels.fetch(CHANNELS_IDS['publicAppliesChannelId'])
            //@ts-ignore-error
            .then(async publicAppliesChannel => {
                const applicationContents = application['applicationContents'];
                const applicationAuthorsId = application['ticketAuthorsId'];
                const applicationId = application['ticketHashesId'];

                //@ts-ignore-error
                await publicAppliesChannel.send({ content: applicationContents})
                //@ts-ignore-error
                .then(async publicDomainMessage => {
                    const publicEmbed = new EmbedBuilder()
                                    .setTitle('Application had been published!')
                                    .setDescription(null)
                                    .setFooter({ text: 'Event handling message: system-purposes only.' })
                                    .setColor(Colors.Green)
                                    .setFields(
                                        [
                                            { 
                                                name: 'APPLICATION\'s AUTHOR:', 
                                                value: `<@${applicationAuthorsId}>`, 
                                                inline: false, 
                                            }, 
                                            { 
                                                name: 'APPLICATION\'s ID:', 
                                                value: `${applicationId}`, 
                                                inline: false 
                                            }
                                        ]
                                    )
                                    .setTimestamp();

                    await publicDomainMessage.reply({ content: '', embeds: [publicEmbed] })
                    //@ts-ignore-error
                    .then(async publicDomainEmbed => {
                        console.info(new Date().toLocaleString() + ` - Published a ticket with any dependent context! Ticket\'s ID is: ${applicationId}`);

                        application['isAccepted'] = true;
                        application['publicChannelMessageId'] = `${publicDomainMessage.id}`;
                        application['publicChannelAdditionId'] = `${publicDomainEmbed.id}`;

                        //@ts-ignore-error
                        let newApplicationOrder = applicationsOrder.filter(object => object['adminsChannelMessageId'] != `${messageId}`);

                        newApplicationOrder.push(application);

                        await fs.writeFile('applies-order.json', JSON.stringify(newApplicationOrder, null, 4));
                    })
                    //@ts-ignore-error
                    .catch(error);
                })
                //@ts-ignore-error
                .catch(console.error);
            })
            //@ts-ignore-error
            .catch(console.error);
        }
        if(reaction.emoji.name === '❎' && application['isAccepted'] == false) {
            const applicationsChannelId = application['ticketChannelsId'];

            //@ts-ignore-error
            let newApplicationOrder = applicationsOrder.filter(object => object['adminsChannelMessageId'] != `${messageId}`);

            await fs.writeFile('applies-order.json', JSON.stringify(newApplicationOrder, null, 4));

            console.info(new Date().toLocaleString() + ` - Deleted a ticket with any dependent context! Ticket\'s ID is: ${application['ticketHashesId']}`);
            //@ts-ignore-error
            reaction.message.reply({ content: 'Beginning of the procedure to delete the application channel, JSON context and other leftovers.', ephemeral: true })
            //@ts-ignore-error
            .then(async deleteMessage => {
                await delay(5000);

                await reaction.message.delete();
                await reaction.message.guild?.channels.fetch(applicationsChannelId)
                //@ts-ignore-error
                .then(async ticketChannelParsed => {
                    ticketChannelParsed?.delete();

                    await delay(1500);

                    await deleteMessage.delete();
                })
                //@ts-ignore-error
                .catch(error => {
                    console.error(error);
                });
            })
            .catch(console.error)
        }
    }
});

client.on('interactionCreate', async interaction => {
    if(!interaction.isChatInputCommand() || !interaction.isButton) return;

    const { commandName } = interaction;

    //@ts-ignore-error
    const command = interaction.client.commands.get(commandName);

    if(!command)
        return;

    try {
        await command.execute(interaction);
    //@ts-ignore-error
    } catch(error) {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        console.error(error);
    }
});

client.login(process.env.BOT_TOKEN);