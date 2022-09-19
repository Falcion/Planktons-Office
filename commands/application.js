const { SlashCommandBuilder, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, PermissionFlagsBits, Colors } = require('discord.js');

const fs = require('fs-extra');

const configuration = require('./../.env.json'); 
const commands_lang = require('./../commands-lang.json');

const TEXT_CHANNEL = ChannelType.GuildText;
const BUTTON_STYLE = ButtonStyle.Danger;

var crc32 = function(r){for(var a,o=[],c=0;c<256;c++){a=c;for(var f=0;f<8;f++)a=1&a?3988292384^a>>>1:a>>>1;o[c]=a}for(var n=-1,t=0;t<r.length;t++)n=n>>>8^o[255&(n^r.charCodeAt(t))];return(-1^n)>>>0};
var delay = ms => new Promise(res => setTimeout(res, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('application')
        .setDMPermission(false)
        .setDescriptionLocalization('ru', commands_lang['INIT_APPLY']['ru_RU'][0])
        .setDescriptionLocalization('en-US', commands_lang['INIT_APPLY']['en_US'][0])
        .setDescriptionLocalization('en-GB', commands_lang['INIT_APPLY']['en_US'][0]),

    async execute(interaction) {
        await interaction.reply('Bot has created a specified ticket and mentioned you! Read specified context for application procedure.');

        const hashes_id = crc32(interaction.user.id);
        const tckt_name = 'app-' + `${hashes_id}`;

        const parent_ids = interaction.channel.parent.id,
              default_id = interaction.guild.roles.everyone.id;

        await interaction.guild.channels.create({
            name: tckt_name,
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

                const undefined_array = [];

                for(const_context of data) {
                    const content = const_context.content;

                    undefined_array.push(content);
                }

                const merged_array = undefined_array.join('\n');

                if(undefined_array.length >= 2000) {
                    const author = interaction.user;

                    await author.send({ content: commands_lang['ERROR_OVERFLOW']['en_US'][0]});

                    await delay(20000);

                    await res.delete()
                             .then(() => {
                                console.info(new Date().toLocaleString() + ' - A custom ticket was deleted because of overflow of chars problem!');
                             })
                             .catch(error => { 
                                console.error(error); 
                             });
                }
                
                const ADMINS_CHANNEL_ID = configuration['ADMINS_CHANNEL_ID'];

                interaction.guild.channels.fetch(`${ADMINS_CHANNEL_ID}`)
                .then(async admin_stream => {   
                    const embed_stream = undefined;

                    /*
                     * Non-prettified constructor of embed message: unreadable without normal formatting.
                     */

                    embed_stream = new EmbedBuilder().setTitle('Application had been handled!').setDescription().setFooter({ text: 'Event handling message: system-purposes only.' }).setColor(Colors.Yellow).setFields([{ name: 'APPLICATION\'s AUTHOR:', value: `<@${interaction.user.id}>`, inline: false, }, { name: 'APPLICATION\'s ID:', value: `${hashes_id}`, inline: false }]).setTimestamp();                        
                    
                    await admin_stream.send({ contents: merged_array })
                                      .then(application => {
                                        application.reply({ content: '', embeds: [embed_stream]})
                                                   .then(async addition => {
                                                    await adm_msg.react('✅');
                                                    await adm_msg.react('❎');
                
                                                    const applies_order = require('./../applies-order.json');
                                                    
                                                    const apply_objects = {
                                                        'ADMINS_MESSAGE_ID': application.id,
                                                        'ADMIN_ADDITION_ID': addition.id,
                                                    };
                
                                                    applies_order.push(apply_objects);
                
                                                    const applies_pattern = JSON.stringify(applies_order, undefined, 4);
                
                                                    await fs.writeFile('applies-order.json', applies_pattern)
                                                            .then(() => {
                                                                console.info(new Date().toLocaleString() + ' - Written an unchecked application\'s ID in specified JSON!');
                                                            })
                                                            .catch(error => {
                                                                console.error(error);
                                                            });
                                                   })
                                                   .catch(error => {
                                                       console.error(error);
                                                   });
                                      })
                                      .catch(error => {
                                          console.error(error);
                                      });
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