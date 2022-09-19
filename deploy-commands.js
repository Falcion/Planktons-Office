const fs = require('fs-extra');

const path = require('node:path');

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');

const dotenv = require('dotenv').config();

const commands = [];
const commands_path = path.join(__dirname, 'commands');

const command_files = fs.readdirSync(commands_path).filter(file => file.endsWith('.js'));

for(let i = 0; i < command_files.length; i++) {
    const file = command_files[i];
    const file_path = path.join(commands_path, file);

    const command = require(file_path);

    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILDS_ID), 
                                                    { body: commands })
	.then(() => {
        console.info(new Date().toLocaleString() + ' - Successfully registered application commands!');
    })
	.catch(error => {
        console.error(error);
    });