import fs from 'fs-extra';
import path from 'node:path';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const commands: any = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

for(const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    commands.push(command.data.toJSON());
}

if(process.env.BOT_TOKEN != undefined && process.env.CLIENT_ID != undefined && process.env.GUILD_ID != undefined) {
    const rest = new REST({ version: '10'}).setToken(process.env.BOT_TOKEN);

    //@ts-ignore-error
    rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands })
        .then(() => console.log('Successfully registered application commands.'))
        .catch(console.error);
}