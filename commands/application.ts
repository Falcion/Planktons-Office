import { SlashCommandBuilder, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, PermissionFlagsBits, Colors } from 'discord.js';

import fs from 'fs-extra';
import crc32 from 'crc/crc32';

const CHANNELS_IDS = JSON.parse(fs.readFileSync('./app-settings.json').toString());
const LOCALES = JSON.parse(fs.readFileSync('./commands/locales.json').toString());

//@ts-ignore-error
var delay = ms => new Promise(res => setTimeout(res, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('application')
        .setDescription(LOCALES['INIT_APPLY']['en-US'])
        .setDescriptionLocalization('en-US', LOCALES['INIT_APPLY']['en-US'])
        .setDescriptionLocalization('en-GB', LOCALES['INIT_APPLY']['en-US'])
        .setDMPermission(false),

    //@ts-ignore-error
    async execute(interaction) {
        await interaction.reply('Bot has created a specified ticket and mentioned you! Read specified context for application procedure.');

        const crcHash = crc32(interaction.id);
        await interaction.guild.channels.create({
            name: `app-${crcHash}`,
            type: ChannelType.GuildText,
            parent: interaction.channel.parent.id,
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
        //@ts-ignore-error
        .then(async ticketChannel => {
            console.info(new Date().toLocaleString() + ' - User required an application ticket. Created it successfully!');
            console.info(new Date().toLocaleString() + ` - Created channels context: [${ticketChannel}]`);

            const row = new ActionRowBuilder()
            .addComponents(
                                new ButtonBuilder()
                                .setLabel('[ru-RU] INFO')
                                .setStyle(ButtonStyle.Danger)
                                .setCustomId('ru_info'),
                                new ButtonBuilder()
                                .setLabel('[en-US] INFO')
                                .setStyle(ButtonStyle.Danger)
                                .setCustomId('en_info'));

            const introApplyMessage = `${LOCALES['INTRO_APPLY']['en-US']}\n— <@${interaction.user.id}>\n** **`;

            await ticketChannel.send({ content: introApplyMessage, components: [row] });

            //@ts-ignore-error
            const buttonHandler = click => click.user.id === interaction.user.id;
            const interactionButtons = ticketChannel.createMessageComponentCollector({ buttonHandler, time: 1000 * 60 * 15 });

            //@ts-ignore-error
            const messageFilter = msg => msg.author.id === interaction.user.id;
            const messageCollector = ticketChannel.createMessageCollector({ messageFilter, time: 1000 * 60 * 15 });

            //@ts-ignore-error
            interactionButtons.on('collect', async event => {
                const { customId } = event;

                switch(customId) {
                    case 'ru_info':
                        await event.reply({ content: LOCALES['BUTTON_INFO']['ru'], ephemeral: true });
                        break;

                    case 'en_info':
                        await event.reply({ content: LOCALES['BUTTON_INFO']['en-US'], ephemeral: true });
                        break;
                    
                    default:
                        await event.reply({ content: 'Unexpected error had been handled! Check the bot\'s status either status of API!', ephemeral: true});
                        break;
                }
            });

            //@ts-ignore-error
            messageCollector.on('end', async data => {
                if(data.size == 0 || data == null || data == undefined) {
                    await ticketChannel.send('You didn\'t send anything in answer at this ticket! You DO realise the consenquences of this style of bot usage: be ensure next time you ready for an application sending procedure, but now, this ticket is going to be deleted in half a minute!')
                    //@ts-ignore-error
                    .then(async exceptionMessage => {
                        const messageId = exceptionMessage.channel.id;

                        await delay(30000);

                        await exceptionMessage.guild.channels.delete(`${messageId}`);
                    })
                    //@ts-ignore-error   
                    .catch(error => {
                        console.error(error);
                     });
                }

                if(data.size == 0 || data == null || data == undefined)
                    return;

                const unmergedMessage: string[] = [];

                for(const message of data) {
                    //@ts-ignore-error
                    for(const messageContext of message) {
                        //@ts-ignore-error
                        const messageContent = messageContext.content;

                        if(messageContent != undefined || messageContent != null || messageContent != '') {
                            unmergedMessage.push(messageContent);
                        }
                    }
                }

                let application = unmergedMessage.join('\n');

                application = application.substring(1, application.length);

                if(application.length >= 2000) {
                    const { user } = interaction;

                    await user.send({ content: LOCALES['ERROR_OVERFLOW']['en-US'] });

                    await delay(30000);

                    await ticketChannel.delete()
                    .then(() => {
                        console.info(new Date().toLocaleString() + ' - A custom ticket was deleted because of overflow of chars problem!');
                    })
                    .catch(console.error);

                    return;
                }

                await ticketChannel.send({ content: 'Procedure of collecting application\'s context has been ended! Please, wait for an an answer from administration and if this ticket will disappear, this means you didn\'t pass the check!', ephemeral: true });

                interaction.guild.channels.fetch(CHANNELS_IDS['adminsAppliesChannelId'])
                //@ts-ignore-error
                .then(async adminAppliesChannel => {
                    const embed = new EmbedBuilder()
                                    .setTitle('Application has been handled!')
                                    .setDescription(null)
                                    .setFooter({ text: 'Event handling message: system-purposes only.' })
                                    .setColor(Colors.Green)
                                    .setFields(
                                        [
                                            { 
                                                name: 'APPLICATION\'s AUTHOR:', 
                                                value: `<@${interaction.user.id}>`, 
                                                inline: false, 
                                            }, 
                                            { 
                                                name: 'APPLICATION\'s ID:', 
                                                value: `${crcHash}`, 
                                                inline: false 
                                            }
                                        ]
                                    )
                                    .setTimestamp();

                    await adminAppliesChannel.send({ content: application, embeds: [embed] })
                    //@ts-ignore-error
                    .then(async applyCheckingStatus => {
                        await applyCheckingStatus.react('❎');
                        await applyCheckingStatus.react('✅');

                        const applicationsOrder = require('./../applies-order.json');

                        const applicationObject = {
                            'adminsChannelMessageId': applyCheckingStatus.id,
                            'publicChannelMessageId': '',
                            'publicChannelAdditionId': '',
                            'ticketChannelsId': ticketChannel.id,
                            'ticketAuthorsId': interaction.user.id,
                            'isAccepted': false,
                            'ticketHashesId': crcHash,
                            'applicationContents': application
                        };

                        applicationsOrder.push(applicationObject);

                        const applicationsJSON = JSON.stringify(applicationsOrder, null, 4);

                        await fs.writeFile('applies-order.json', applicationsJSON)
                        .then(() => {
                            console.info(new Date().toLocaleString() + ' - Written an unchecked application\'s ID in specified JSON!');
                        })
                        
                        .catch(error => {
                            console.error(error);
                        });
                    })
                    //@ts-ignore-error
                    .catch(error => {
                        console.error(error);
                    });
                })
                //@ts-ignore-error
                .catch(error => {
                    console.error(error);
                }); 
            });
        })
        //@ts-ignore-error
        .catch(error => {
            console.error(error);
        });
    }
}