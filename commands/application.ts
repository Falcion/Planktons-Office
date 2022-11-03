/*
 * General function of creating and sending application into the server.
 =========================================================================
 * ID: APPLICATION,
 * DM: NONE,
 * DESC: initializes the application collection process and creates ticket 
 *       for you to write the necessary information.
 */

import { COMMAND_NAME, COMMAND_DM } from './context/application.ts.json';

/* ======================================================================= */

import { ActionRowBuilder, CacheType, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, APIEmbedFooter, APIEmbedField } from 'discord.js';
import crc32 from 'crc/crc32';

import * as APP_SETTINGS from '../app-settings.json';

import * as RU_LOCALES from '../data/locales/ru.json';
import * as EN_LOCALES from '../data/locales/en.json';

import * as fs from 'fs-extra';

import { out, read_json, count, get_time } from '../modules/simplifiers';
import { gen_embed, gen_button, gen_attach } from '../modules/discord-simplifiers';

module.exports = {
    data: new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription(EN_LOCALES['acmd01'])
    .setDescriptionLocalization('en-US', EN_LOCALES['acmd01'])
    .setDescriptionLocalization('en-GB', EN_LOCALES['acmd01'])
    .setDescriptionLocalization('ru', RU_LOCALES['acmd01'])
    .setDMPermission(COMMAND_DM),

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const annotation = EN_LOCALES['acmd02_1'] + '\n' + EN_LOCALES['acmd02_2'];

        const session_id = crc32(interaction.id + interaction.user.username);

        await interaction.reply({ content: annotation, ephemeral: true });

        if(interaction.inGuild() == false)
            throw new Error('Interaction was made not on the server when command requires it!');

        if(interaction.channel?.type != 0)
            throw new Error('An API error: chat-input interaction was caught into non-text channel!');

        const parent_id = interaction.channel.parentId;

        await interaction.guild?.channels.create({
            name: `app-` + `${session_id}`,
            type: 0,
            parent: parent_id,
            position: 1,
            permissionOverwrites: [
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages
                    ]
                },
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages
                    ]
                }
            ]
        })
        .then(async APP_CHANNEL => {
            out('User required an application ticket. Created it successfully!');
            out('Created channel\'s context: [' + `${APP_CHANNEL}` + ']');

            const row = new ActionRowBuilder<any>()
            .addComponents(
                gen_button('[RU] INFO', 4, 'ru_info'),
                gen_button('[EN] INFO', 4, 'en_info')
            );

            const user_tags: string = '<@' + `${interaction.user.id}` + '>';
            const msg_param: string = EN_LOCALES['acmsg_1'] + ('\n' + '\n') + EN_LOCALES['acmsg_2'] + ('\n' + '\n') + '— ' + user_tags;

            await APP_CHANNEL.send({ content: msg_param + '\n' + '** **', components: [row] });

            const message_events = APP_CHANNEL.createMessageCollector({ time: 15000 });
            const buttons_events = APP_CHANNEL.createMessageComponentCollector({ time: 15000 });

            const interactive_ids: Set<string> = new Set<string>();
            const interactive_events: string[] = [];

            buttons_events.on('collect', async pressed => {

                /*
                 *  Essentially checking is this truly a button's event.
                 */

                if(pressed.isButton() == false)
                    throw new Error('Handled wrong event of pressed button: its not button, but collector said it was!');
                
                if(pressed.user.id !== interaction.user.id) {
                    out('Different user tried to use an button not in his context! For the admins, check the rule!');

                    await pressed.user.send('Immediately stop activity in not context of yours! Otherwise, bot will block you from its services!');

                    interactive_ids.add(pressed.user.id);
                    interactive_events.push(pressed.user.id);

                    return;
                }

                const RU_LOCALES_ANSWER: string[] = [
                    '**' + RU_LOCALES['infmsg_1'] + '**',
                    '\n',
                    RU_LOCALES['infmsg_2'],
                    RU_LOCALES['infmsg_3'],
                    RU_LOCALES['infmsg_4']
                ]
                const EN_LOCALES_ANSWER: string[] = [
                    '**' + EN_LOCALES['infmsg_1'] + '**',
                    '\n',
                    EN_LOCALES['infmsg_2'],
                    EN_LOCALES['infmsg_3'],
                    EN_LOCALES['infmsg_4']
                ];

                if(pressed.user.id === interaction.user.id) {
                    const event_id = pressed.customId;

                    switch(event_id) {
                        case 'ru_info':
                            await pressed.reply({ content: RU_LOCALES_ANSWER.join('\n'), ephemeral: true });
                            break;
                        case 'en_info':
                            await pressed.reply({ content: EN_LOCALES_ANSWER.join('\n'), ephemeral: true });
                            break;
                        default:
                            throw new Error('Unknown ID of button\'s event!');
                    }
                }
            });

            buttons_events.on('end', async entries => {
                if(!entries || entries.size < 1) {
                    out('Buttons were NOT used via application procedure! END of BUTTON_HANDLER.');

                    return;
                }

                for(const id of interactive_ids) {
                    if(count(interactive_events, id) >= 5) {
                        const ignored_mods: string[] = await read_json('data/ignored-mods.json');

                        ignored_mods.push(id);

                        await fs.writeJSON('data/ignored-mods.json', ignored_mods);
                    }
                }
            });

            message_events.on('collect', async message => {
                out('Handled message in application specified channel-ticket! Message ID: [#' + message.id + '].');

                const banned_ids: string[] = await read_json('data/ignored-mods.json');

                if(count(banned_ids, message.author.id) != 0)
                    await message?.delete();

                if (message.author.id === interaction.user.id)
                    await message?.react('🗒️');
            });

            message_events.on('end', async shards => {
                if(!shards || shards.size < 1) {
                    await interaction.user.send({ content: EN_LOCALES['shnb'] });

                    await APP_CHANNEL?.delete();

                    out('Automatically deleted application\'s ticket! Removed ID:' + `[${APP_CHANNEL}].`);

                    return;
                }

                const unparsed_messages: string[] = [];

                for(const message of shards) {
                    const message_shard = message[1];

                    if(message_shard.author.id === interaction.user.id)
                        unparsed_messages.push(message_shard['content']);
                }

                const merged_messages: string = unparsed_messages.join('\n');

                if(merged_messages.length >= 2000) {
                    const user = interaction.user;

                    const session_path = './resolves/' + `$attach-${session_id}.txt`;

                    await fs.writeFile(session_path, merged_messages);

                    const attachment = await gen_attach(session_path);

                    await user.send({ content: EN_LOCALES['exoverf'], files: [attachment] });

                    return;
                }

                await APP_CHANNEL.send({ content: EN_LOCALES['acmsg_end'] });

                const ADMIN_APPLIES_CHANNEL = await interaction.guild?.channels.fetch(APP_SETTINGS['ADMINS_APPLIES_CHANNEL_ID']);

                /*
                 * Throwing undefined value of an event and not error, so
                 * this code just does nothing when he can't find the specified IDs.
                 */
    
                if (!ADMIN_APPLIES_CHANNEL)
                    throw new Error('Error has occured via parsing [ADMIN_APPLIES_CHANNEL]: delete bot\'s process and rewrite its JSON configuration!');

                /*
                 * We are evoking each possible type of fetched channel, because ID could be
                 * re-assigned to wrong object from APIs.
                 * 
                 * Throwing an error, because bot needs EXACT type of channel for its appropriate work.
                 */
    
                switch(ADMIN_APPLIES_CHANNEL.type) {
    
                    /*
                     * Parsing fetched channel's types by different codes with help of
                     * guild's based type (ignoring non-guild).
                     *
                     * Link to API: https://discord.com/developers/docs/resources/channel/
                     * 
                     * Current in code, we are ignoring ESLint's rule of ["NO-CASE-DECLARATIONS"] because
                     * we need to save RAM of this process and don't waste it for non-satisfying cases.
                     */

                    case 0:
                        const AUTHORS_ID = `<@` + `${interaction.user.id}` + `>`;
                        const CONTEXT_ID = `${session_id}`;

                        const footer: APIEmbedFooter = { text: 'Embed API: system-handling message.', icon_url: `${interaction.client.user?.avatarURL()}` };

                        const fields: APIEmbedField[] = [
                            { name: "APPLICATION's AUTHOR:", value: AUTHORS_ID },
                            { name: "APPLICATION's ID:", value: CONTEXT_ID },
                            { name: "APPLICATION's STATUS:", value: `- **IS_ACCEPTED:** FALSE \n - **IS_REVIEWED:** FALSE` }
                        ];
                        
                        const EMBED = gen_embed('Got and parsed an application!', null, footer, fields, 'vivid_pink', interaction.user?.avatarURL(), null);

                        const DOMAIN_MESSAGE = await ADMIN_APPLIES_CHANNEL?.send({ content: merged_messages, embeds: [EMBED] });

                        await DOMAIN_MESSAGE.react('❎');
                        await DOMAIN_MESSAGE.react('✅');

                        const applications_array: object[] = await read_json('data/applications.json');

                        const session_time: number = get_time();

                        const APPLICATION: object = {
                            'ADMINS_CHANNEL_MESSAGE_ID': `${DOMAIN_MESSAGE.id}`,
                            'PUBLIC_CHANNEL_MESSAGE_ID': '',
                            'PUBLIC_CHANNEL_CONTEXT_ID': '',
                            'TICKET_CHANNEL_ID': `${APP_CHANNEL.id}`,
                            'TICKET_CONTEXT_ID': `${session_id}`,
                            'TICKET_AUTHORS_ID': `${interaction.user.id}`,
                            'STATUSES': {
                                'IS_ACCEPTED': false,
                                'IS_REVIEWED': false,
                            },
                            'APPLICATION_DATE': `${session_time}`,
                            'APPLICATION_CONTENT': `${merged_messages}`,
                        };
    
                        applications_array.push(APPLICATION);
    
                        await fs.writeJSON('data/applications.json', applications_array);

                        out('Written an unchecked application\'s ID in specified JSON!')
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
            });
        })
        .catch((error: Error) => {
            console.error(error);
        })
    }
}