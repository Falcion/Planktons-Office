/*
 * General function of creating and sending application into the server.
 =========================================================================
 * ID: APPLICATION,
 * DM: NONE,
 * DESC: initializes the application collection process and creates ticket 
 *       for you to write the necessary information.
 */

import { COMMAND_NAME, COMMAND_DM } from './context/resolve-applications.ts.json';

/* ======================================================================= */

import { ActionRowBuilder, CacheType, ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, APIEmbedFooter, APIEmbedField, ButtonInteraction, GuildMember } from 'discord.js';
import { PrismaClient } from '@prisma/client';

import * as RU_LOCALES from '../data/locales/ru.json';
import * as EN_LOCALES from '../data/locales/en.json';

import * as fs from 'fs-extra';

module.exports = {
    data: new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription(EN_LOCALES['resapcmd01'])
    .setDescriptionLocalization('en-US', EN_LOCALES['resapcmd01'])
    .setDescriptionLocalization('en-GB', EN_LOCALES['resapcmd01'])
    .setDescriptionLocalization('ru', RU_LOCALES['resapcmd01'])
    .setDMPermission(COMMAND_DM),

    async execute(interaction: ChatInputCommandInteraction<CacheType>) {
        const annotation = EN_LOCALES['resapcmd02'];

        await interaction.reply({ content: annotation, ephemeral: true });

        if(interaction.inGuild() == false)
            throw new Error('Interaction was made not on the server when command requires it!');

        if(interaction.channel?.type != 0)
            throw new Error('An API error: chat-input interaction was caught into non-text channel!');

        const roles_map = interaction.member?.roles.valueOf();

        console.log(roles_map);
    }
}

