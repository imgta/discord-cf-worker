import process from 'node:process';
import dotenv from 'dotenv';
import { consola } from 'consola';
import * as commands from './commands.js';

dotenv.config();

const { DISCORD_APPLICATION_ID: appId, DISCORD_TOKEN: token } = process.env;
if (!appId || !token) { throw new Error('Discord credentials invalid or missing.'); }

const commandsArr = Object.values(commands);

const res = await registerCommands(appId, token, commandsArr);

if (res.ok) {
    consola.success('All commands registered!');
    const data = await res.json();
    consola.info(JSON.stringify(data, null, 2));
}

async function registerCommands(appId, token, commands) {
    try {
        const res = await fetch(
            `https://discord.com/api/v10/applications/${appId}/commands`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bot ${token}`,
                },
                body: JSON.stringify(commands),
            }
        );
        return res;
    } catch (err) {
        console.error(err);
        throw err;
    }
}
