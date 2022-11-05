import { APIEmbedField, ButtonBuilder, EmbedAuthorOptions, EmbedBuilder, EmbedFooterOptions, ComponentType } from "discord.js";

import * as fs from 'fs-extra';
import * as discordJS from 'discord.js';

import { out } from '../modules/simplifiers';

export const STYLES = discordJS.ButtonStyle;
export const COMPONENTS = discordJS.ComponentType;

/*
 * Function of generation an embeds row for better code readability and re-usage:
 ================================================================================
 * code requires anything for building defined for bot's courage embed rows, could throw when
 * variables that cannot be undefined ARE undefined.
 */

 export function gen_embed(headers: string, contents: string | null, footer: EmbedFooterOptions | null, fields: APIEmbedField[], id_color: number | string, URLs: string | null, author: EmbedAuthorOptions | null) {
    
    /*
     * Checking some params on undefined.
     */

    if(!headers)
        throw new Error('Undefined string throwed into Embeds API!');
    if(!fields || fields.length < 1)
        throw new Error('Undefined string throwed into Embeds API!');

    const ASSIGNED_COLOR = parse_colors(id_color);

    const embeds = new EmbedBuilder()
                  .setTitle(headers)
                  .setFooter(footer)
                  .setAuthor(author)
                  .addFields(fields)
                  .setDescription(contents)
                  .setColor(ASSIGNED_COLOR)
                  .setThumbnail(URLs)
                  .setTimestamp();

    return embeds;
}

/*
 *  Function generating a button row builder: without URL support.
 */

export function gen_button(label: string, style: number, id: string) {
    
    /*
     * Checking some params on undefined.
     */

    if(!label)
        throw new Error('Undefined string throwed into Button API!');
    if(!id)
        throw new Error('Undefined string throwed into Embeds API!');

    if(!style) 
        style = STYLES.Link;

    /*
     * STYLES CODINGS:
     =================
     * 0 -> DANGER;
     * 1 -> LINK;
     * 2 -> PRIMARY;
     * 3 -> SECONDARY;
     * 4 -> SUCCESS;
     */

    if (style == 0)
        style = STYLES.Danger;
    else if(style == 1)
        style = STYLES.Link;
    else if(style == 2)
        style = STYLES.Primary;
    else if(style == 3)
        style = STYLES.Secondary;
    else if(style == 4)
        style = STYLES.Success;

    return new ButtonBuilder()
    .setLabel(label)
    .setStyle(style)
    .setCustomId(id);
}

/*
 * Function parsing colors IDs into decimals values for EmbedsAPI.
 =================================================================
 * Both parsing from enumerables IDs or name-strings into specified decimals values.
 * Using built-in values from DiscordJS open-source codes.
 * 
 * Link to the Gist of origin of DECIMAL/HEX codes is defined.
 */

export function parse_colors(id: string | number) {

    if(!id)
        return 0x000000;

    /*
     *  Parsing to decimals of colors into EmbedsAPI.
     =================================================
     * For addition context about HEX and decimals into colors of DiscordJS API.
     * If you want to know specified dictionary, read the docs.
     *
     * Gist: https://gist.github.com/thomasbnt/b6f455e2c7d743b796917fa3c205f812?permalink_comment_id=3656937#gistcomment-3656937
     */

    if (typeof(id) == 'string') {
        switch(id) {
            case 'default':
                return 0x000000;
            case 'white':
                return 0xffffff;
            case 'aqua':
                return 0x1abc9c;
            case 'green':
                return 0x57f287;
            case 'blue':
                return 0x3498db;
            case 'yellow':
                return 0xfee75c;
            case 'purple':
                return 0x9b59b6;
            case 'vivid_pink':
                return 0xe91e63;
            case 'fuschia':
                return 0xeb459e;
            case 'gold':
                return 0xf1c40f;
            case 'orange':
                return 0xe67e22;
            case 'red':
                return 0xed4245;
            case 'grey':
                return 0x95a5a6;
            case 'navy':
                return 0x34495e;
            case 'dark_aqua':
                return 0x11806a;
            case 'dark_green':
                return 0x1f8b4c;
            case 'dark_blue':
                return 0x206694;
            case 'dark_purple':
                return 0x71368a;
            case 'dark_vivid_pink':
                return 0xad1457;
            case 'dark_gold':
                return 0xc27c0e;
            case 'dark_orange':
                return 0xa84300;
            case 'dark_red':
                return 0x992d22;
            case 'dark_grey':
                return 0x979c9f;
            case 'darker_grey':
                return 0x7f8c8d;
            case 'pale_grey':
                return 0xbcc0c0;
            case 'dark_navy':
                return 0x2c3e50;
            case 'amoled_purple':
                return 0x5865f2;
            case 'default_grey':
                return 0x99aab5;
            case 'amoled_black': 
                return 0x2c2f33;
            case 'pale_black':
                return 0x23272a;
        }
    }
    if (typeof(id) == 'number') {
        switch(id) {
            case 0:
                return 0x000000;
            case 1:
                return 0xffffff;
            case 2:
                return 0x1abc9c;
            case 3:
                return 0x57f287;
            case 4:
                return 0x3498db;
            case 5:
                return 0xfee75c;
            case 6:
                return 0x9b59b6;
            case 7:
                return 0xe91e63;
            case 8:
                return 0xeb459e;
            case 9:
                return 0xf1c40f;
            case 10:
                return 0xe67e22;
            case 11:
                return 0xed4245;
            case 12:
                return 0x95a5a6;
            case 13:
                return 0x34495e;
            case 14:
                return 0x11806a;
            case 15:
                return 0x1f8b4c;
            case 16:
                return 0x206694;
            case 17:
                return 0x71368a;
            case 18:
                return 0xad1457;
            case 19:
                return 0xc27c0e;
            case 20:
                return 0xa84300;
            case 21:
                return 0x992d22;
            case 22:
                return 0x979c9f;
            case 23:
                return 0x7f8c8d;
            case 24:
                return 0xbcc0c0;
            case 25:
                return 0x2c3e50;
            case 26:
                return 0x5865f2;
            case 27:
                return 0x99aab5;
            case 28: 
                return 0x2c2f33;
            case 29:
                return 0x23272a;
        }
    }

    return 0x000000;
}

/* 
 * One-string function to generate an attachment from buffer.
 ============================================================
 */

export async function gen_attach(resolve_path: string) { return new discordJS.AttachmentBuilder(await fs.readFile(resolve_path)); }
