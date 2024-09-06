import { AutoRouter } from 'itty-router';
import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
import { ART, ASK, HELLO, STATUS } from './commands.js';
import { sendChannelMsg, triggerTyping } from './utils.js';

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

router.get('/logs', async (request, env) => {
    const cfRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai-gateway/gateways/${env.CLOUDFLARE_WORKERS_GATEWAY_ID}/logs/?direction=desc&per_page=50`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
    });
    const logs = await cfRes.json();

    // construct basic table to visualize json data
    let tableHtml = `<html>
    <head>
        <style>
            table { border-collapse: collapse; width: fit-content; font-family: monospace; }
            th { text-align: center; }
            td { text-align: left; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            th { background-color: #4db8ff; color: white; }
        </style>
    </head>
    <body>
        <h1>Cloudflare Workers AI Gateway Logs</h1>
        <table>
            <tr>
                <th>id</th>
                <th>model</th>
                <th>metadata</th>
                <th>request</th>
                <th>response</th>
                <th>duration (ms)</th>
                <th>status code</th>
                <th>created</th>
            </tr>`;

    logs.result.forEach(log => {
        tableHtml += `
            <tr>
                <td>${log.id}</td>
                <td>${log.model}</td>
                <td>${log.metadata}</td>
                <td>${log.request}</td>
                <td>${log.response}</td>
                <td>${log.duration}</td>
                <td>${log.status_code}</td>
                <td>${log.created_at}</td>
            </tr>`;
    });
    tableHtml += `</table></body></html>`;

    return new Response(tableHtml, { headers: { 'Content-Type': 'text/html' } });
});

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
                const prompt = data.options[0].value;
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
                                    custom_id: `Meta Llama 3;@cf/meta/llama-3-8b-instruct;${prompt}`,
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

            case ART.name: {
                const text = data.options[0].value;
                // const aiData = { custom_id: `Stable Diffusion XL Lightning;@cf/bytedance/stable-diffusion-xl-lightning;${text}` };
                const aiData = { custom_id: `Stable Diffusion XL Base;@cf/stabilityai/stable-diffusion-xl-base-1.0;${text}` };

                ctx.waitUntil(callWorkersAI(env, interaction, aiData));

                return new JsonResponse({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });
            }
    
            default:
                return new JsonResponse({ error: 'Unhandled or unknown command.' }, { status: 400 });
        }
    }
    
    // response to button interaction
    if (type === InteractionType.MESSAGE_COMPONENT) {
        let content = 'Unknown selection.';

        const [modelName] = data.custom_id.split(';');
        if (data.custom_id) { content = `Calling ${modelName}...`; }

        const response = new JsonResponse({
            type: InteractionResponseType.UPDATE_MESSAGE,
            data: { content, components: [] }, // set empty components array to remove buttons
        });

        ctx.waitUntil(callWorkersAI(env, interaction, data));

        return response;
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
    const { token, member, message } = interaction;
    const [modelName, modelId, input] = data.custom_id.split(';');

    const user = member.user.global_name;
    const discordUrl = 'https://discord.com/api/v10';
    const gateway = { id: env.CLOUDFLARE_WORKERS_GATEWAY_ID, skipCache: true, metadata: { user, input } };

    try {
        if (interaction.data.name === 'art') { // text-to-img calls
            const prompt = `${input}, (ultra-detailed), cinematic light, (masterpiece, top quality, best quality, official art, beautiful)`;
            const aiRes = await env.AI.run(
                modelId,
                {
                    prompt,
                    num_steps: 20,
                    strength: 1,
                    guidance: 6.5, // default guidance: 7.5
                    negative_prompt: 'bad anatomy, bad proportions, blurry, cropped, deformed, disfigured, drawing, error, extra fingers, fused fingers, jpeg artifacts, letter, low quality, lowres, malformed limbs, mutated hands, mutation, normal quality, out of frame, poorly drawn face, poorly drawn hands, signature, sketch, text, ugly, watermark, worst quality',
                },
                { gateway },
            );
            
            // consume ReadableStream and create formdata w/ image file
            const stream = new Response(aiRes);
            const imgBuffer = await stream.arrayBuffer();
    
            const formData = new FormData();
            formData.append('content', `Here's your image, ${user}:`);
            formData.append('file', new Blob([imgBuffer], { type: 'image/png' }), 'art.png');
    
            // update original interaction message with image via webhook
            await fetch(`${discordUrl}/webhooks/${env.DISCORD_APPLICATION_ID}/${token}/messages/@original`, {
                method: 'PATCH',
                headers: { Authorization: `Bot ${env.DISCORD_TOKEN}` },
                body: formData,
            });
        } else { // text generation calls
            await triggerTyping(env.DISCORD_TOKEN, message.channel_id); // lasts 10 seconds
    
            const aiRes = await env.AI.run(modelId, { prompt: input }, { gateway });
            const { response } = await aiRes;

            content = `**\`[${modelName}]\`**: ${response}`;

            await fetch(`${discordUrl}/channels/${message.channel_id}/messages/${message.id}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bot ${env.DISCORD_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content }),
            });
        }
    } catch (error) {
        console.error(error);
        await sendChannelMsg(env.DISCORD_TOKEN, env.DISCORD_CHANNEL_ID, error);
    }
}

export default server;
