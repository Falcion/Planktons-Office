const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

const fs = require('fs-extra');

const configuration = require('./../.env.json'); 
const commands_lang = require('./commands-lang.json');

const TEXT_CHANNEL = ChannelType.GuildText;
const BUTTON_STYLE = ButtonStyle.Danger;

var crc32 = function(r){for(var a,o=[],c=0;c<256;c++){a=c;for(var f=0;f<8;f++)a=1&a?3988292384^a>>>1:a>>>1;o[c]=a}for(var n=-1,t=0;t<r.length;t++)n=n>>>8^o[255&(n^r.charCodeAt(t))];return(-1^n)>>>0};
var delay = ms => new Promise(res => setTimeout(res, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('init-apply')
        .setDMPermission(false)
        .setDescriptionLocalization('ru', commands_lang['INIT_APPLY']['ru_RU'][0])
        .setDescriptionLocalization('en-US', commands_lang['INIT_APPLY']['en_US'][0])
        .setDescriptionLocalization('en-GB', commands_lang['INIT_APPLY']['en_US'][0]),

    async execute(interaction) {
        await interaction.reply('Bot has created a specified ticket and mentioned you! Read specified context for application procedure.');

        const hashes = crc32(interaction.user.id);

        const parent_ids = interaction.channel.parent.id,
              default_id = interaction.guild.roles.everyone.id;

        await interaction.guild.channels.create({
            name: hashes,
            type: TEXT_CHANNEL,
            parent: parent_ids,
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
                    id: default_id,
                    deny: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages
                    ]
                }
            ]
        })
        .then(async res => {
            console.info(new Date().toLocaleString() + ' - User required an application ticket. Created it successfully!');
            console.info(new Date().toLocaleString() + ` - Created channels context: [${res}]`);

            const row = new ActionRowBuilder()
                                            .addComponents(
                                                new ButtonBuilder()
                                                .setLabel('[ru-RU] INFO')
                                                .setStyle(BUTTON_STYLE)
                                                .setCustomId('ru_info'),
                                                new ButtonBuilder()
                                                .setLabel('[en-US] INFO')
                                                .setStyle(BUTTON_STYLE)
                                                .setCustomId('en_info'),
                                            );

            const message_cst = [
                '',
                commands_lang['INTRO_APPLY']['en_US'][0],
                '',
                `— <@${interaction.user.id}>`,
                '** **',
            ]

            await res.send({ content: message_cst.join('\n'), components: [row]});

            const button_handler = click => click.user.id === interaction.user.id;
            const interaction_bt = res.createMessageComponentCollector({ button_handler, time: 8000});
            
            const message_filter = msg => msg.author.id === interaction.user.id;
            const read_collector = res.createMessageCollector({ message_filter, time: 8000});

            interaction_bt.on('collect', async event => {
                const custom_id = event.customId;

                switch(custom_id) {
                    case 'ru_info':
                        await event.reply('Parameters for application: [RU_PLACEHOLDER].');
                        break;
                    
                    case 'en_info':
                        await event.reply('Parameters for application: [EN_PLACEHOLDER].');
                        break;

                    default:
                        await event.reply('Unexpected error had been handled! Check the bot\'s status either status of API!');
                        break;
                }

            });

            read_collector.on('end', async data => {
                if(data.size == 0) {
                    await res.send('You didn\'t send anything in answer at this ticket! You DO realise the consenquences of this category of bot usage: be ensure next time you ready for an application sending procedure!')
                             .then(async msg => {
                                const msg_id = msg.channel.id;

                                await delay(5000);

                                await msg.guild.channels.delete(`${msg_id}`);

                                console.error(new Date().toLocaleString() + ' - A message collector of async application didn\'t collect anything from channel! Imply checking an API or user just send nothing in answer.');
                             })
                             .catch(error => {
                                console.error(error);
                             });
                }
                    
                
                const ADMINS_CHANNEL_ID = configuration['ADMINS_CHANNEL_ID'];

                interaction.guild.channels.fetch(`${ADMINS_CHANNEL_ID}`)
                .then(async adm_res => {
                    const append_data = []

                    for(chunk of data) {
                        const content = chunk.content;

                        append_data.push(content);
                    }

                    const merged_data = append_data.join('\n');

                    /*
                     * Checking on max size of message that have been declared by APIs restrictions
                     * If bigger than MAX, sending information about it to user and after pause,
                     * delete the required ticket within returning undefined (just stops function).
                     */

                    if(merged_data.length >= 2000) {
                        const author = interaction.user;

                        await author.send({ content: commands_lang['ERROR_OVERFLOW']['en_US'][0]});

                        delay(20000);

                        await res.delete();

                        return;
                    }


                })
                .catch(error => {
                    console.error(error);
                });
            });
        })  
        .catch(error => {
            console.error(error);
        });
    }
}