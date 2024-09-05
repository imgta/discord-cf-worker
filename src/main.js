import { AutoRouter } from 'itty-router';
import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
import { ASK, HELLO, STATUS } from './commands.js';
import { editInteractMsg, triggerTyping } from './utils/misc.js';

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

router.post('/', async (request, env, ctx) => {
    const { isValid, interaction } = await server.verifyDiscordRequest(request, env);
    if (!isValid || !interaction) { return new Response('Bad request signature.', { status: 401 }); }

    const { type, data } = interaction;

    // `PING` message used during initial webhook handshake--required to configure webhook in dev portal
    if (type === InteractionType.PING) { return new JsonResponse({ type: InteractionResponseType.PONG }); }
    
    // most user slash commands will be `APPLICATION_COMMAND`.
    if (type === InteractionType.APPLICATION_COMMAND) {
        const user = interaction.member.user.global_name;
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

        const [modelName] = data.custom_id.split(';');
        if (data.custom_id) { content = `Calling ${modelName}...`; }

        ctx.waitUntil(callWorkersAI(env, interaction, data));

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
});

router.all('*', () => new Response('Not Found.', { status: 404 }));

async function verifyDiscordRequest(request, env) {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();
    const isValid = signature && timestamp && (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));
    
    if (!isValid) { return { isValid }; }

    return { interaction: JSON.parse(body), isValid };
}

async function callWorkersAI(env, interaction, data) {
    let content = 'Unknown selection.';
    const [modelName, modelId, prompt] = data.custom_id.split(';');

    const body = {
        messages: [
            {
                role: 'system',
                content: 'You are a friendly and resourceful assistant that loves answering questions',
            },
            { role: 'user', content: prompt },
        ],
    };

    await triggerTyping(env.DISCORD_TOKEN, interaction.message.channel_id);

    const res = await env.AI.run(modelId, body);
    if (res?.response) { content = `[${modelName}]: ${res.response}`; };

    await editInteractMsg(env.DISCORD_TOKEN, interaction, content);
}

async function sendChannelMsg(token, channelId, content) {
    try {
        await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bot ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}

export default server;
