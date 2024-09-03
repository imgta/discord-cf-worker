import { AutoRouter } from 'itty-router';
import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
import { ASK, HELLO, STATUS } from './commands.js';

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

    const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID } = env;
    const { type, data, member } = interaction;
    const user = member.user.global_name;

    try {
        // `PING` message used during initial webhook handshake--required to configure webhook in dev portal
        if (type === InteractionType.PING) { return new JsonResponse({ type: InteractionResponseType.PONG }); }
    
        // most user slash commands will be `APPLICATION_COMMAND`.
        if (type === InteractionType.APPLICATION_COMMAND) {
            switch (data.name.toLowerCase()) {
                case STATUS.name: {
                    const input = data.options[0].value;
                    return new JsonResponse({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: { content: ['beep', 'boop'].includes(input.toLowerCase()) ? 'Beep boop.' : 'All systems go!' },
                    });
                }
                
                case HELLO.name: {
                    return new JsonResponse({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: { content: `Hello there, ${user}!` },
                    });
                }
    
                case ASK.name: {
                    const prompt = data.options.find(opt => opt.name === 'question').value;
                    return new JsonResponse({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            custom_id: 'ai_modal',
                            content: `Choose an AI Model:`,
                            components: [{
                                type: 1, // action row
                                components: [
                                    {
                                        type: 2, // button
                                        style: 1,
                                        label: 'Meta Llama 3',
                                        custom_id: `Meta Llama 3;@cf/meta/llama-3.1-8b-instruct;${prompt}`,
                                    },
                                    {
                                        type: 2, // button
                                        style: 1,
                                        label: 'Minstral 7B',
                                        custom_id: `Minstral 7B;@hf/mistral/mistral-7b-instruct-v0.2;${prompt}`,
                                    },
                                ]
                            }]
                        },
                    });
                }
    
                default:
                    return new JsonResponse(
                        { error: 'Unhandled or unknown command.' },
                        { status: 400 }
                    );
            }
        }
    
        // response to button interaction
        if (type === InteractionType.MESSAGE_COMPONENT) {
            let content = 'Unknown selection.';
            const [modelName, modelId, prompt] = data.custom_id.split(';');

            if (data.custom_id) { content = `${modelName} selected.`; }

            const res = await callWorkersAI(CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, modelId, prompt);

            if (res) { content = JSON.stringify(res); }
            
            return new JsonResponse({
                type: InteractionResponseType.UPDATE_MESSAGE,
                data: { content, components: [] }, // set empty components array to remove buttons
            });
        }
    
        console.error(`Unhandled command type: ${type}`);
        return new JsonResponse(
            { error: `Unhandled command type: ${type}` },
            { status: 400 }
        );
    } catch (error) {
        console.error(error);
        throw error;
    }
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

async function callWorkersAI(apiToken, accountId, model, input) {
    const body = JSON.stringify({
        messages: [
            {
                role: 'system',
                content: 'You are a friendly and resourceful assistant that loves answering questions',
            },
            { role: 'user', content: input, },
        ],
    });

    try {
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiToken}` },
            body,
        });
        const data = await res.json();
        if (!res.ok) { console.error(data); }
        return data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export default server;