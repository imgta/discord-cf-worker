import { Buffer } from 'node:buffer';
import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
import { AutoRouter } from 'itty-router';
import { sendChannelMsg } from './utils.js';

class JsonResponse extends Response {
    constructor(body, init) {
        const jsonBody = JSON.stringify(body);
        init = init || { headers: { 'content-type': 'application/json;charset=UTF-8' }, };
        super(jsonBody, init);
    }
}

const router = AutoRouter();
const server = { verifyDiscordRequest, fetch: router.fetch };

// --------------------------------------------------

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

    // construct basic html table to render gateway logs
    let tableHtml = `<html>
    <head>
        <style>
            table { border-collapse: collapse; width: fit-content; font-family: monospace; }
            th { text-align: center; }
            td { text-overflow: clip; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            th { background-color: #4db8ff; color: white; }
        </style>
    </head>
    <body>
        <h1 style="text-align:center;">Cloudflare Workers AI Gateway Logs</h1>
        <table>
            <tr>
                <th>id</th>
                <th>model</th>
                <th>user</th>
                <th>input</th>
                <th>duration (ms)</th>
                <th>status</th>
                <th>created</th>
            </tr>`;

    logs.result.forEach(log => {
        tableHtml += `
            <tr>
                <td>${log.id}</td>
                <td>${log.metadata.model || log.model}</td>
                <td>${log.metadata.user}</td>
                <td style="max-height:10px;">${log.metadata.input}</td>
                <td style="text-align:center;">${log.duration}</td>
                <td style="text-align:center;">${log.status_code}</td>
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

    // `PING` (1) interaction during initial webhook handshake--required to configure webhook in dev portal
    if (type === InteractionType.PING) { return new JsonResponse({ type: InteractionResponseType.PONG }); }

    // most user slash commands will be type `APPLICATION_COMMAND` (2) interactions
    if (type === InteractionType.APPLICATION_COMMAND) {
        const cmd = data.name;

        if (cmd === 'hello') {
            const user = interaction.member.user.global_name;
            return new JsonResponse({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: `Hello there, ${user}!` },
            });
        } else if (['flux', 'art', 'ask', 'tldr'].includes(cmd)) {
            let aiParams = 'No AI parameters found.';
            const prompt = data.options[0].value;

            if (cmd === 'flux') { aiParams = `FLUX.1-schnell;@cf/black-forest-labs/flux-1-schnell;${prompt}`; }

            if (cmd === 'art') { aiParams = `SDXL-Base 1.0;@cf/stabilityai/stable-diffusion-xl-base-1.0;${prompt}`; }

            if (cmd === 'ask') { aiParams = `Minstral 7B;@hf/mistral/mistral-7b-instruct-v0.2;${prompt}`; }

            if (cmd === 'tldr') { aiParams = `BART Large-CNN;@cf/facebook/bart-large-cnn;${prompt}`; }

            ctx.waitUntil(callWorkersAI(env, cmd, interaction, aiParams));
            return new JsonResponse({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });
        } else {
            return new JsonResponse({ error: 'Unhandled or unknown command.' }, { status: 400 });
        }
    }

    // response to button interaction (3)
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
    return new JsonResponse({ error: `Unhandled command type: ${type}` }, { status: 400 });
});

router.all('*', () => new Response('Not Found.', { status: 404 }));

// --------------------------------------------------

async function callWorkersAI(env, cmd, interaction, aiParams) {
    let body = 'Interaction failed.';
    const { token, member } = interaction;
    const [model, modelId, input] = aiParams.split(';');

    const user = member.user.global_name;
    const discordUrl = 'https://discord.com/api/v10';
    const gateway = { id: env.CLOUDFLARE_WORKERS_GATEWAY_ID, skipCache: true, metadata: { model, user, input } };

    const negative_prompt = 'bad anatomy, bad proportions, blurry, cropped, deformed, deformed anatomy, disfigured, drawing, error, extra fingers, extra limbs, fused fingers, grainy, jpeg artifacts, letter, low quality, low contrast, lowres, malformed limbs, mutated hands, mutation, normal quality, out of frame, poorly drawn face, poorly drawn hands, signature, sketch, text, ugly, watermark, worst quality';

    try {
        if (cmd === 'flux') { // FLUX.1 (schnell) text-to-img generation
            const { image } = await env.AI.run(
                modelId,
                {
                    prompt: `${input}, cinematic, 8k, highly detailed, sharp focus, masterpiece, high quality, perfect lighting`,
                    num_steps: 20, // (1-50)
                    height: 768,
                    width: 1024,
                },
                { gateway },
            );

            body = new FormData();
            body.append('content', `**\`[${model}]:\`** Here's your image, ${user}:`);
            body.append('file', new Blob([Buffer.from(image, 'base64')], { type: 'image/png' }), 'flux_art.png');
        }
        if (cmd === 'art') { // Stable Diffusion XL text-to-img generation
            const aiRes = await env.AI.run(
                modelId,
                {
                    prompt: `${input}, (ultra-detailed), cinematic light, (masterpiece, top quality, best quality, official art, beautiful)`,
                    negative_prompt,
                    height: 1024,
                    width: 1024,
                    num_steps: 20,
                    strength: 1,
                    guidance: 6.5, // default: 7.5
                },
                { gateway },
            );

            // consume ReadableStream and create formdata w/ image file
            const stream = new Response(aiRes);
            const imgBuffer = await stream.arrayBuffer();

            body = new FormData();
            body.append('content', `**\`[${model}]:\`** Here's your image, ${user}:`);
            body.append('file', new Blob([imgBuffer], { type: 'image/png' }), 'art.png');
        }

        if (cmd === 'ask') { // Minstral 7B text generation
            const aiRes = await env.AI.run(modelId, { prompt: input, raw: true }, { gateway });
            const { response } = await aiRes;
            body = { content: `**\`[${model}]:\`** ${response.trim()}` };
        }

        if (cmd === 'tldr') { // BART Large-CNN text summarization
            const aiRes = await env.AI.run(modelId, { input_text: input }, { gateway });
            const { summary } = await aiRes;
            body = { content: `**\`[${model}]:\`** ${summary}` };
        }

        const headers = { Authorization: `Bot ${env.DISCORD_TOKEN}` };
        if (!(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(body);
        }

        // update original interaction message with image via webhook
        await fetch(`${discordUrl}/webhooks/${env.DISCORD_APPLICATION_ID}/${token}/messages/@original`, {
            method: 'PATCH',
            headers,
            body,
        });
    } catch (error) {
        console.error(error);
        await sendChannelMsg(env.DISCORD_TOKEN, env.DISCORD_CHANNEL_ID, error.toString());
    }
}

async function verifyDiscordRequest(request, env) {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();
    const isValid = signature && timestamp && (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));

    if (!isValid) { return { isValid }; }

    return { interaction: JSON.parse(body), isValid };
}

export default server;
