import { SlashCommandBuilder, ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, PermissionFlagsBits, Colors, Message, Collection, ChatInputCommandInteraction, BaseGuildTextChannel, TextChannel, GuildTextBasedChannel, CollectorOptions, CollectorFilter, ButtonInteraction, MessageComponentType, MessageActionRowComponentBuilder, GuildBasedChannel, AnyThreadChannel, SelectMenuInteraction, CacheType, DMChannel } from 'discord.js';

import fs from 'fs-extra';
import crc32 from 'crc/crc32';

const CHANNELS_IDS = JSON.parse(fs.readFileSync('./app-settings.json').toString());
const LOCALES = JSON.parse(fs.readFileSync('./commands/locales.json').toString());

var delay = (ms: number | undefined) => new Promise(res => setTimeout(res, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('application')
        .setDescription(LOCALES['INIT_APPLY']['en-US'])
        .setDescriptionLocalization('en-US', LOCALES['INIT_APPLY']['en-US'])
        .setDescriptionLocalization('en-GB', LOCALES['INIT_APPLY']['en-US'])
        .setDMPermission(false),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply('Bot has created a specified ticket and mentioned you! Read specified context for application procedure.');
        
        const crcHash = crc32(interaction.id);

        if(interaction.guild && interaction.channel) {
            //@ts-ignore-error
            const parentId = (interaction.channel as GuildTextBasedChannel).parent?.id;

            await interaction.guild.channels.create({
                name: `app-${crcHash}`,
                type: ChannelType.GuildText,
                parent: parentId,
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
            .then(async (ticketChannel: TextChannel) => {
                console.info(new Date().toLocaleString() + ' - User required an application ticket. Created it successfully!');
                console.info(new Date().toLocaleString() + ` - Created channels context: [${ticketChannel}]`);
    
                const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                .addComponents(
                                    new ButtonBuilder()
                                    .setLabel('[ru-RU] INFO')
                                    .setStyle(ButtonStyle.Danger)
                                    .setCustomId('ru_info'),
                                    new ButtonBuilder()
                                    .setLabel('[en-US] INFO')
                                    .setStyle(ButtonStyle.Danger)
                                    .setCustomId('en_info'));
    
                const introApplyMessage = `${LOCALES['INTRO_APPLY']['en-US']}\nDate and time of application's reading procedure ending: » ${new Date().toLocaleString()} « \n\n— <@${interaction.user.id}>\n** **`;
    
                //@ts-ignore-error
                await ticketChannel.send({ content: introApplyMessage, components: [row] });
    
                //@ts-ignore-error
                const interactionButtons = ticketChannel.createMessageComponentCollector({ time: 8000 });
                //@ts-ignore-error
                const messageCollector = ticketChannel.createMessageCollector({ time: 8000 });
    
                interactionButtons.on('collect', async (event: SelectMenuInteraction<CacheType> | ButtonInteraction<CacheType>) => {
                    if(event.user.id === interaction.user.id) {
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
                    }
                });
    
                messageCollector.on('collect', async (message: Message) => {
                    if(message.author.id === interaction.user.id) {
                        await message.react('✍');
                    }
                });
    
                messageCollector.on('end', async (data: Collection<string, Message>) => {
                    if(data.size == 0 || data == null || data == undefined) {
                        //@ts-ignore-error
                        await ticketChannel.send('You didn\'t send anything in answer at this ticket! You DO realise the consenquences of this style of bot usage: be ensure next time you ready for an application sending procedure, but now, this ticket is going to be deleted in half a minute!')
                        .then(async (exceptionMessage: Message<boolean>) => {
                            //@ts-ignore-error
                            const messageId: string = exceptionMessage.channel.id;
                                
                            await delay(30000);
    
                            // if exception message is not in guild (for Typescript)
                            if(exceptionMessage.inGuild()) {
                                await exceptionMessage.guild.channels.delete(`${messageId}`);
                            }
                        })
                        .catch((error:Error) => {
                            console.error(error);
                         });
                    }
    
                    if(data.size == 0 || data == null || data == undefined)
                        return;
    
                    const unmergedMessage: string[] = [];
    
                    for(const message of data) {
                        for(const messageContext of message) {
                            // if APIs return is string, we skip this, because Discord in good cases
                            // will return only Message as object!
                            if(typeof(messageContext) == typeof('')) continue;
                            else {
                                const messageContent = (messageContext as Message<boolean>).content;
                                const messageAuthorId = (messageContext as Message<boolean>).author.id;
    
                                if(messageAuthorId === interaction.user.id) {
                                    if(messageContent != undefined || messageContent != null || messageContent != '') {
                                        unmergedMessage.push(messageContent);
                                    }
                                }
                            }
                        }
                    }
    
                    let application = unmergedMessage.join('\n');
    
                    if(application.length >= 2000) {
                        const { user } = interaction;
                        
                        //@ts-ignore-error
                        await user.send({ content: LOCALES['ERROR_OVERFLOW']['en-US'] });
    
                        await delay(30000);
                        
                        //@ts-ignore-error
                        await ticketChannel.delete()
                        .then(() => {
                            console.info(new Date().toLocaleString() + ' - A custom ticket was deleted because of overflow of chars problem!');
                        })
                        .catch(console.error);
    
                        return;
                    }
                    
                    //@ts-ignore-error
                    await ticketChannel.send({ content: 'Procedure of collecting application\'s context has been ended! Please, wait for an an answer from administration and if this ticket will disappear, this means you didn\'t pass the check!' });
    
                    interaction.guild?.channels.fetch(CHANNELS_IDS['adminsAppliesChannelId'])
                    .then(async (adminAppliesChannel: GuildBasedChannel | null) => {
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
    
                        //@ts-ignore-error
                        await adminAppliesChannel.send({ content: application, embeds: [embed] })
                        .then(async (applyCheckingStatus: Message<true>) => {
                            await applyCheckingStatus.react('❎');
                            await applyCheckingStatus.react('✅');
    
                            const applicationsOrder = require('./../applies-order.json');
    
                            const applicationObject = {
                                'adminsChannelMessageId': applyCheckingStatus.id,
                                'publicChannelMessageId': '',
                                'publicChannelAdditionId': '',
                                //@ts-ignore-error
                                'ticketChannelsId': ticketChannel.id,
                                'ticketAuthorsId': interaction.user.id,
                                'isAccepted': false,
                                'isChecked': false,
                                'ticketHashesId': crcHash,
                                'applicationDate': new Date().toLocaleString(),
                                'applicationContents': application
                            };
    
                            applicationsOrder.push(applicationObject);
    
                            const applicationsJSON = JSON.stringify(applicationsOrder, null, 4);
    
                            await fs.writeFile('applies-order.json', applicationsJSON)
                            .then(() => {
                                console.info(new Date().toLocaleString() + ' - Written an unchecked application\'s ID in specified JSON!');
                            })
                            
                            .catch((error: Error) => {
                                console.error(error);
                            });
                        })
                        .catch((error: Error) => {
                            console.error(error);
                        });
                    })
                    .catch((error: Error) => {
                        console.error(error);
                    }); 
                })
            })
            .catch((error: Error) => {
                console.error(error);
            });
        }
    }
}