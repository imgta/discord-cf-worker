import { AutoRouter } from 'itty-router';
import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
import { HELLO, STATUS } from './commands.js';

class JsonResponse extends Response {
    constructor(body, init) {
        const jsonBody = JSON.stringify(body);
        init = init || { headers: { 'content-type': 'application/json;charset=UTF-8' }, };
        super(jsonBody, init);
    }
}

const router = AutoRouter();

const server = { verifyDiscordRequest, fetch: router.fetch };

router.get('/', (request, env) => { return new Response(`👋 AppID: ${env.DISCORD_APPLICATION_ID}`); });

router.post('/', async (request, env) => {
    const { isValid, interaction } = await server.verifyDiscordRequest(request, env);
    if (!isValid || !interaction) { return new Response('Bad request signature.', { status: 401 }); }

    // console.log('interaction', interaction);
    const { type, data } = interaction;

    // `PING` message used during initial webhook handshake--required to configure webhook in dev portal
    if (type === InteractionType.PING) {
        return new JsonResponse({ type: InteractionResponseType.PONG, });
    }

    // most user commands will come as `APPLICATION_COMMAND`.
    if (type === InteractionType.APPLICATION_COMMAND) {
        switch (data.name.toLowerCase()) {
            case STATUS.name: {
                const arg = data.options[0].value;
                return new JsonResponse({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: ['beep', 'boop'].includes(arg.toLowerCase()) ? 'Beep boop.' : 'All systems go!' },
                });
            }
            case HELLO.name: {
                const username = interaction.member.user.global_name;
                return new JsonResponse({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: `Hello there, ${username}!` },
                });
            }
            default:
                return new JsonResponse(
                    { error: 'Unhandled or unknown command.' },
                    { status: 400 }
                );
        }
    }

    console.error(`Unhandled command type: ${type}`);
    return new JsonResponse(
        { error: `Unhandled command type: ${type}` },
        { status: 400 }
    );
});

router.all('*', () => new Response('Not Found.', { status: 404 }));

async function verifyDiscordRequest(request, env) {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();
    const isValidRequest =
        signature &&
        timestamp &&
        (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));

    if (!isValidRequest) { return { isValid: false }; }

    return { interaction: JSON.parse(body), isValid: true };
}

export default server;
