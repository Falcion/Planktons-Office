import * as fs from 'fs-extra';
import * as readerENV from 'dotenv';

import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';

import { out } from './modules/simplifiers';

out('Starting an asycnhronous deployment of commands into an bot\'s application!');

readerENV.config();

(async () => {
    const commands: any = [];
    const commands_path = `${__dirname}` + `/commands`;

    const command_files = fs.readdirSync(commands_path).filter(file => file.endsWith('.ts')); 

    for(const file of command_files) {
        const file_path = commands_path + `/` + `${file}`;

        const commandJS = await import(file_path);

        commands.push(commandJS.data.toJSON());
    }

    if (!process.env.BOT_TOKEN || !process.env.CLIENT_ID || !process.env.GUILDS_ID)
        throw new Error('Uncaugth exception! Environmental vars are undefined!');

    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

    rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILDS_ID), { body: commands })
        .then(() => out('Success at register an application commands.'))
        .catch((error: Error) => {
            console.error(error);
        });
})();