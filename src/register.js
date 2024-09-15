import process from 'node:process';
import { consola } from 'consola';
import dotenv from 'dotenv';
import * as commands from './commands.js';

dotenv.config();

const { DISCORD_APPLICATION_ID: appId, DISCORD_TOKEN: token } = process.env;
if (!appId || !token) { throw new Error('Discord credentials invalid or missing.'); }

const commandsArr = Object.values(commands);

await registerCommands(appId, token, commandsArr);

async function registerCommands(appId, token, commands) {
    consola.start(`Registering ${commands.length} commands...`);

    try {
        const res = await fetch(
            `https://discord.com/api/v10/applications/${appId}/commands`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bot ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(commands),
            }
        );

        const data = await res.json();
        if (res.ok) {
            consola.success('All commands registered!');
            consola.info(JSON.stringify(data, null, 2));
        } else {
            consola.error(`Command registration failed: ${JSON.stringify(data, null, 2)}`);
        }
    } catch (err) {
        console.error(err);
        throw err;
    }
}
