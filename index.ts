import { Client, Collection, Partials, GatewayIntentBits, APIEmbedField, APIEmbedFooter } from 'discord.js';
import { PrismaClient } from '@prisma/client';

import * as fs from 'fs-extra';
import * as readerENV from 'dotenv';

import APPLICATION_JSON from './commands/context/application.ts.json';

import { out, read_json } from './modules/simplifiers';
import { gen_embed } from './modules/discord-simplifiers';

/*
 * Fixing an TS type error: object of commands declare in client's object.
 */

declare module 'discord.js' {
    export interface Client {
      commands: Collection<unknown, unknown>
    }
}

(async () => {

    /*
     * We are checking every configuration file on its existing and other
     * JSON-alike context, like, is data typed into or is it in correct format.
     * 
     * ENV config is parsed once at bot's client process, so we can require it direct
     * in code string.
     */

    if (await fs.pathExists('.env') == false) {
        await fs.createFile('.env');

        const environment_pattern: string[] = [
            '# ID of a developer\'s server either on which bot will work locally.',
            'GUILDS_ID=',
            '# ID of a bot\'s client.',
            'CLIENT_ID=',
            '',
            'BOT_TOKEN=',
            '',
            '# Main context information about database which bot connects to.',
            'DATABASE_NAME=',
            'DATABASE_USER=',
            'DATABASE_PASSWORD=',
            'DATABASE_HOST=',
        ];

        await fs.writeFile('.env', environment_pattern.join('\n'));

        out('Created an ENV configuration file! Ensure typing required context in it and don\'t forget to setup the prisma!');

        return;
    }

    if (await fs.pathExists('./database/applications.db') == false) {
        out('There is no any APPLICATIONS database! Please, use SQLite engine with prisma schemas and setup it!');

        return;
    }

    if (await fs.pathExists('app-settings.json') == false) {
        await fs.createFile('app-settings.json');

        const settings_pattern: object = {
            "PUBLIC_APPLIES_CHANNEL_ID": "-1",
            "ADMINS_APPLIES_CHANNEL_ID": "-1",
            "JUDGES_APPLIES_CHANNEL_ID": "-1",
            "APPLICATIONS_MAX": 50,
            "APPLICATIONS_CUR": 0,
            "APPLICATIONS_BAN": false
        };

        /*
         * Here we are using JSON's stringify because host of the bot needs to type data in it.
         * So, for better formattings and better readability we use pattern for this string.
         * 
         * Also, keep in mind, that JSON shuffles the structure of given JSON object by bytes:
         * in kinda strange way, you can say that writing direct JSON sorts given object (array).
         */

        await fs.writeFile('app-settings.json', JSON.stringify(settings_pattern, undefined, 4));

        out('Created an JSON representation of basic settings and context via bot\'s functionality!');

        return;
    }

    if (await fs.pathExists('data/ignored-mods.json') == false) {
        await fs.createFile('data/ignored-mods.json');

        /*
         * JSON of an applications is dynamic and nullable: it gets information
         * from user's input and so, its just an array at the start.
         */ 

        await fs.writeFile('data/ignored-mods.json', JSON.stringify([]));
    }

    if (await fs.pathExists('data/judges-array.json') == false) {
        await fs.createFile('data/judges-array.json');

        /*
         * JSON of judges list is dynamic and nullable: it gets information
         * from dev's input and so, its just an array at the start.
         */

        await fs.writeFile('data/judges-array.json', JSON.stringify([]));
    }

    readerENV.config();

    const prisma = new PrismaClient();

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

    const commands_path = `${__dirname}` + `/` + `commands`;
    const command_files = fs.readdirSync(commands_path).filter(file => file.endsWith('.ts'));

    for(let i = 0; i < command_files.length; i++) {
        const file = command_files[i];
        const file_path = commands_path + `/` + file;

        /*
         * We are using dynamic import because its easy and fast (and stable) version of requiring module
         * via typescript super-set.
         */

        await import(file_path)
        .then(io => {
            const command: any = io as object;

            client.commands.set(command.data.name, command);
        });
    }

    await prisma.$connect()
                .then(async () => {
                    out('Prisma has been connected successfully! Bot is now reaching final stage in setup!');
                })
                .catch((error: Error) => {
                    console.error(error);
                });
    
    client.once('ready', async () => {
        client.user?.setPresence({
            activities: [{
                name: 'ROBO-COFFEE!',
                type: 5
            }],
            status: 'dnd',
        });
    
        /*
         *  Debugging and catching any context information which bot could handle via its setup.
         */
    
        const APP_SETTINGS = await read_json('./app-settings.json');
    
        const array_of_settings = [
            APP_SETTINGS['PUBLIC_APPLIES_CHANNEL_ID'],
            APP_SETTINGS['ADMINS_APPLIES_CHANNEL_ID'],
            APP_SETTINGS['JUDGES_APPLIES_CHANNEL_ID'],
            APP_SETTINGS['APPLICATIONS_MAX'],
            APP_SETTINGS['APPLICATIONS_CUR']
        ];
    
        for(const setting of array_of_settings)
            if (typeof(setting) == 'undefined')
                throw new Error('JSON settings of bot\'s process are undefined!');
    
        /*
         * Fetching channels through API for their direct-context debugging.
         */
    
        const PUBLIC_CHANNEL_ID = APP_SETTINGS['PUBLIC_APPLIES_CHANNEL_ID'];
        const ADMINS_CHANNEL_ID = APP_SETTINGS['ADMINS_APPLIES_CHANNEL_ID'];
        const JUDGES_CHANNEL_ID = APP_SETTINGS['JUDGES_APPLIES_CHANNEL_ID'];
    
        client.guilds.fetch(`${process.env.GUILDS_ID}`)
        .then(res => {
            if (!res.channels.cache.find(PUBLIC_CHANNEL => PUBLIC_CHANNEL.id === PUBLIC_CHANNEL_ID) ||
                !res.channels.cache.find(ADMINS_CHANNEL => ADMINS_CHANNEL.id === ADMINS_CHANNEL_ID) ||
                !res.channels.cache.find(JUDGES_CHANNEL => JUDGES_CHANNEL.id === JUDGES_CHANNEL_ID))
                throw new Error('Error via parsing/finding specified for bot channels: check typed IDs and current server.');
            else
                out('Successfully parsed specified channels from JSON-IDs strings!');
        })
        .catch((error: Error) => {
            console.error(error);
        });
    
        out('Bot is ready to work!');
    });

    /* INTERVALIZED MODULE: blocking bot's functions on weekends.
     ------------------------------------------------------------
     * Bot already must accept any applications anytime, but so admins and judges must do:
     * so bot will take some time-schedule about pausing its functionality.
     * 
     * Bot will check weekend days every twelve hours (or in seconds): 43,200,000 in defined.
     */

    setInterval(async () => {

        /*
         * Entering and using array of days of week for better visual and more comforting code.
         */

        const weekdays = [ 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday' ];

        const day = weekdays[new Date().getDay()];

        const APP_SETTINGS = await read_json('./app-settings.json');

        switch(day) {
            case 'sunday':
                out('Parsed day with ID of ["SUNDAY"]: this is a curfew day! From now, bot will disable all of its functionality!');
                
                APP_SETTINGS['APPLICATIONS_BAN'] = true;
                break;
            case 'saturday':
                out('Parsed day with ID of ["SATURDAY"]: this is a curfew day! From now, bot will disable all of its functionality!');

                APP_SETTINGS['APPLICATIONS_BAN'] = true;
                break;
            default:
                out('Parsed day with ID non-of weekends, so there is procedure of unblocking started!');

                APP_SETTINGS['APPLICATIONS_BAN'] = false;
                break;
        }

        await fs.writeFile('./app-settings.json', JSON.stringify(APP_SETTINGS, undefined, 4));

    }, 43200000);

     /* EVENT HANDLER: reactions handling function.
     ---------------------------------------------
     * Via main task of this bot, it needs to read any reaction that happens on specified server
     * for functions of administration by administration: which means what it means.
     * 
     * With help of different types of submodules, this function requires only to check the final
     * reaction and defines the result of application's check procedure (either by judges).
     */
    
    client.on('messageReactionAdd', async (reaction, user) => {
        if(reaction.partial) {
            try {
                await reaction.fetch();
            }
            catch (error) {
                console.error(error); return;
            }
        }
    
        if(user.bot) return;

        const APP_SETTINGS = await read_json('./app-settings.json');

        if(reaction.message.channel.id !== APP_SETTINGS['ADMINS_APPLIES_CHANNEL_ID']) return;
    
        const message_ids = reaction.message.id;

        const queries_obj = await prisma.queries.findFirst({
            where: {
                ADMINS_CHANNEL_MESSAGE_ID: message_ids
            }
        });
    
        if(queries_obj) {

            /*
             * APPLICATION ACCEPTED.
             =======================
             * If an application had been accepted by the administration which were checking current application,
             * bot is gonna save any context within an application and resend it to the judges and public domain,
             * this type of applications will count in weekly's limits.
             */
    
            if(reaction.emoji.name === '✅') {
                await reaction.message.guild?.channels.fetch(APP_SETTINGS['PUBLIC_APPLIES_CHANNEL_ID'])
                .then(async PUBLIC_CHANNEL => {
    
                    /*
                     * Throwing undefined value of an event and not error, so
                     * this code just does nothing when he can't find the specified IDs.
                     */
    
                    if (!PUBLIC_CHANNEL)
                        throw new Error('Error has occured via parsing [PUBLIC_CHANNEL]: delete bot\'s process and rewrite its JSON configuration!');
    
                    out('Update ["APPLICATIONS_CUR"] of current value!');
    
                    APP_SETTINGS['APPLICATIONS_CUR'] += 1;
    
                    await fs.writeFile('app-settings.json', JSON.stringify(APP_SETTINGS, undefined, 4));

                    const APPLICATION_CONTENT = queries_obj['APPLICATION_CONTENT']!;
                    
                    /*
                     * We are evoking each possible type of fetched channel, because ID could be
                     * re-assigned to wrong object from APIs.
                     * 
                     * Throwing an error, because bot needs EXACT type of channel for its appropriate work.
                     */
    
                    switch(PUBLIC_CHANNEL.type) {
    
                        /*
                         * Parsing fetched channel's types by different codes with help of
                         * guild's based type (ignoring non-guild).
                         *
                         * Link to API: https://discord.com/developers/docs/resources/channel/
                         */
    
                        case 0:
                            await (PUBLIC_CHANNEL)?.send({ content: APPLICATION_CONTENT })
                            .then(async PUBLIC_MESSAGE => {
                                out('Bot resent the application\'s data successfully! Application ID: ' + queries_obj['TICKET_CONTEXT_ID']);

                                const AUTHORS_ID = `<@` + `${queries_obj['TICKET_AUTHORS_ID']}` + `>`;
                                const CONTEXT_ID = queries_obj['TICKET_CONTEXT_ID'];

                                const footer: APIEmbedFooter = { text: 'Embed API: system-handling message.', icon_url: `${client.user?.avatarURL()}` };
    
                                const fields: APIEmbedField[] = [
                                    { name: "APPLICATION's AUTHOR:", value: AUTHORS_ID },
                                    { name: "APPLICATION's ID:", value: CONTEXT_ID },
                                    { name: "APPLICATION's STATUS:", value: `- **IS_ACCEPTED:** ${queries_obj['IS_ACCEPTED'] ? 'TRUE' : 'FALSE'} \n - **IS_REVIEWED:** ${queries_obj['IS_REVIEWED'] ? 'TRUE' : 'FALSE'}` }
                                ];
    
                                const embed = gen_embed('Got an application.', null, footer, fields, 'vivid_pink', user?.avatarURL(), null);
    
                                await PUBLIC_MESSAGE.reply({ content: '', embeds: [embed] })
                                .then(async PUBLIC_CONTEXT => {
                                    await prisma.queries.update({
                                        where: {
                                            TICKET_CONTEXT_ID: queries_obj.TICKET_CONTEXT_ID,
                                        },
                                        data: {
                                            IS_ACCEPTED: true,
    
                                            PUBLIC_CHANNEL_MESSAGE_ID: PUBLIC_MESSAGE.id,
                                            PUBLIC_CHANNEL_CONTEXT_ID: PUBLIC_CONTEXT.id,
                                        }
                                    });
                                })
                                .catch((error: Error) => {
                                    console.error(error);
                                });
                            })
                            .catch((error: Error) => {
                                console.error(error);
                            });
    
                            break;
                        case 2:
                            throw new Error('Parsed wrong type: GUILD_VOICE');
                        case 4:
                            throw new Error('Parsed wrong type: GUILD_CATEGORY');
                        case 5:
                            throw new Error('Parsed wrong type: GUILD_ANNOUNCEMENT');
                        case 10:
                            throw new Error('Parsed wrong type: ANNOUNCEMENT_THREAD');
                        case 11:
                            throw new Error('Parsed wrong type: PUBLIC_THREAD');
                        case 12:
                            throw new Error('Parsed wrong type: PRIVATE_THREAD');
                        case 13:
                            throw new Error('Parsed wrong type: GUILD_STAGE_VOICE');
                        case 15:
                            throw new Error('Parsed wrong type: GUILD_FORUM');
                    }
                })
                .catch((error: Error) => {
                    console.error(error);
                });
            }
            
            /*
             * APPLICATION DECLINED.
             =======================
             * If an application had been unwelcomed/declined by the administration which were checking current application,
             * bot is gonna remove any valuable context from memory about this application, unwelcomed applications doesn't
             * count in weekly's limits.
             */
    
            else if(reaction.emoji.name === '❎' && queries_obj.IS_ACCEPTED == false) {
                out('Deleting the unaccepted application context!');
    
                reaction.message.reply('Deleting the unaccepted application context: any required data will be logged into bot and specified channels!')
                .then(async DISWELCOMED_MESSAGE => {
                    await reaction.message.delete();

                    const TICKET_CHANNEL_ID = queries_obj.TICKET_CHANNEL_ID;

                    if (!TICKET_CHANNEL_ID)
                        throw undefined;

                    await prisma.queries.delete({
                        where: {
                            TICKET_CONTEXT_ID: queries_obj.TICKET_CONTEXT_ID
                        }
                    })

                    await reaction.message.guild?.channels.fetch(TICKET_CHANNEL_ID)
                    .then(async APPLICATION_CHANNEL => {
                        out('Procedure of deleting an application had been ended!');
    
                        await APPLICATION_CHANNEL?.delete();
                        await DISWELCOMED_MESSAGE?.delete();
                    })
                    .catch((error: Error) => {
                        console.error(error);
                    })
                })
                .catch((error: Error) => {
                    console.error(error);
                })
            }
        }
    });
    
    /*
     * EVENT HANDLER: interactions handling function.
     ------------------------------------------------
     * For new Discord API there are some changes: now bots are restricted in functionality of
     * reading commands from default messages, bot needs to use special gateway of slash commands.
     */
    
    client.on('interactionCreate', async (interaction) => {
        if(!interaction.isChatInputCommand() || !interaction.isButton) return;
    
        const command_name = interaction.commandName;

        if(command_name === APPLICATION_JSON.COMMAND_NAME) {
            const APP_SETTINGS = await read_json('./app-settings.json');

            if(APP_SETTINGS['APPLICATIONS_BAN']) {
                await interaction.reply('Unfortunately, bot currently doesn\'t accept any applications because of curfew, so please, wait when new week starts and send it again!');

                return;
            }

            if(APP_SETTINGS['APPLICATIONS_CUR'] >= APP_SETTINGS['APPLICATIONS_MAX']) {
                await interaction.reply('Unfortunately, server met the maximum amount of currently accepted applications: please, wait until new week and sent it again!');

                return;
            }
        }
    
        const command: any = interaction.client.commands.get(command_name);
    
        if(!command) return;
    
        command.execute(interaction)
        .then(() => {
            out('Executed command or custom interaction!');
        })
        .catch((error: Error) => {
            console.error(error);
        });
    });
    
    client.login(process.env.BOT_TOKEN);
})();