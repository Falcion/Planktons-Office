import { Collection } from 'discord.js';

import * as fs from 'fs-extra';
import * as readerENV from 'dotenv';
import * as sequalize from 'sequelize';

import { out } from './modules/simplifiers';

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

        fs.writeFileSync('.env', environment_pattern.join('\n'));

        out('Created an ENV configuration file! Ensure typing required context in it!');

        return;
    }

    if (await fs.pathExists('./database/applications.db') == false) {
        out('There is no any APPLICATIONS database! Please, use SQLite engine and setup it!');

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

    const seq = new sequalize.Sequelize({
        dialect: 'sqlite',
        
    });
})();
