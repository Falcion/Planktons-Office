import { Client, GatewayIntentBits, Partials, Collection, TextChannel, EmbedBuilder, Colors, GuildTextBasedChannel, GuildBasedChannel, Message, Guild } from 'discord.js';
import fs from 'fs-extra';
import path from 'node:path';

const CHANNELS_IDS = JSON.parse(fs.readFileSync('./app-settings.json').toString());

import dotenv from 'dotenv';

declare module "discord.js" {
    export interface Client {
      commands: Collection<unknown, any>
    }
}

var delay = (ms: number | undefined) => new Promise(res => setTimeout(res, ms));

if(fs.pathExistsSync('.env') == false) {
    fs.createFileSync('.env');

    const envPattern = 'BOT_TOKEN=\nDEV_ID=\nCLIENT_ID=\nGUILD_ID=';

    fs.writeFileSync('.env', envPattern);
}
else {
    dotenv.config();
}

if(fs.pathExistsSync('sessions-lock.json') == false) {
    fs.createFile('sessions-lock.json');

    const sessionsPattern: any = {
        'CURRENT_APPLIES': 0,
        'NUMBERS_JUDGING': 1,
        'JUDJES_IDS': [
            `${process.env.DEV_ID}`
        ]
    };

    fs.writeFileSync('sessions-lock.json', JSON.stringify(sessionsPattern, null, 4));
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

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

for(let i = 0; i < commandFiles.length; i++) {
    const file = commandFiles[i];
    const filePath = path.join(commandsPath, file);

    const command = require(filePath);

    client.commands.set(command.data.name, command);
}

client.once('ready', () => {
    client.user?.setPresence({
        activities: [{
            //name: 'IN-DEV',
            name: 'API',
            type: 5
        }],
        status: 'dnd',
    });

    console.log(new Date().toLocaleString() + ' - Bot is ready!');

    try {
        client.guilds.fetch(`${process.env.GUILD_ID}`).then(async (res: Guild) => {
            //@ts-ignore-error
            const adminsChannel = res.channels.cache.find((channel1: GuildBasedChannel) => channel1.id === CHANNELS_IDS['adminsAppliesChannelId']);
            //@ts-ignore-error
            const publicChannel = res.channels.cache.find((channel2: GuildBasedChannel) => channel2.id === CHANNELS_IDS['publicAppliesChannelId']);

            if(!adminsChannel || !publicChannel)
                console.warn(new Date().toLocaleString() + ' - Failed to parse guild\'s specified in JSON channels! Please, restart bot with correct data!');
            else
                console.info(new Date().toLocaleString() + ' - Parsed channels successfully!');
        });
    } catch(error) {
        console.error(error);
    }
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

    const application = applicationsOrder.find((apply: any) => apply['adminsChannelMessageId'] === `${messageId}`)
    
    if(application) {
        if(reaction.emoji.name === '✅') {
            /*! Re-send it in public channel for criticise.*/

            await reaction.message.guild?.channels.fetch(CHANNELS_IDS['publicAppliesChannelId'])
            .then(async (publicAppliesChannel: GuildBasedChannel | null) => {
                const applicationContents = application['applicationContents'];
                const applicationAuthorsId = application['ticketAuthorsId'];
                const applicationId = application['ticketHashesId'];

                //@ts-ignore-error
                await (publicAppliesChannel as GuildTextBasedChannel).send({ content: applicationContents})
                .then(async (publicDomainMessage: Message<true>) => {
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
                    .then(async (publicDomainEmbed: Message<true>) => {
                        console.info(new Date().toLocaleString() + ` - Published a ticket with any dependent context! Ticket\'s ID is: ${applicationId}`);

                        application['isAccepted'] = true;
                        application['publicChannelMessageId'] = `${publicDomainMessage.id}`;
                        application['publicChannelAdditionId'] = `${publicDomainEmbed.id}`;

                        let newApplicationOrder = applicationsOrder.filter((object: any) => object['adminsChannelMessageId'] != `${messageId}`);

                        newApplicationOrder.push(application);

                        await fs.writeFile('applies-order.json', JSON.stringify(newApplicationOrder, null, 4));
                    })
                    .catch(console.error);
                })
                .catch(console.error);
            })
            .catch(console.error);
        }
        if(reaction.emoji.name === '❎' && application['isAccepted'] == false) {
            const applicationsChannelId = application['ticketChannelsId'];

            let newApplicationOrder = applicationsOrder.filter((object: any) => object['adminsChannelMessageId'] != `${messageId}`);

            await fs.writeFile('applies-order.json', JSON.stringify(newApplicationOrder, null, 4));

            console.info(new Date().toLocaleString() + ` - Deleted a ticket with any dependent context! Ticket\'s ID is: ${application['ticketHashesId']}`);

            reaction.message.reply({ content: 'Beginning of the procedure to delete the application channel, JSON context and other leftovers.' })
            .then(async (deleteMessage: Message<boolean>) => {
                await delay(5000);

                await reaction.message.delete();
                await reaction.message.guild?.channels.fetch(applicationsChannelId)
                
                .then(async (ticketChannelParsed: GuildBasedChannel | null) => {
                    ticketChannelParsed?.delete();

                    await delay(1500);

                    await deleteMessage.delete();
                })
                .catch((error: Error) => {
                    console.error(error);
                });
            })
            .catch((error: Error) => {
                console.error(error);
            });
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
    } catch(error) {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        console.error(error);
    }
});

// checking every hour -> on saturday 12:00 and if 
setInterval(async () => {
    let dayOftheWeek = new Date().getDay();
    let timeOftheDay = new Date().getHours();

    // if its saturday and > 12:00
    if(dayOftheWeek == 6) {
        const appSettings = require('./app-settings.json');

        appSettings['isClosed'] = true;

        await fs.writeFile('app-settings.json', JSON.stringify(appSettings, null, 4));
    }
    else {
        const appSettings = require('./app-settings.json');

        appSettings['isClosed'] = false;

        await fs.writeFile('app-settings.json', JSON.stringify(appSettings, null, 4));
    }
}, 3600000);

client.login(process.env.BOT_TOKEN);