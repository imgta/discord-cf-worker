const DISCORD_URL = 'https://discord.com/api/v10/channels';

async function discordRequest(token, endpoint, method = 'GET', body = null) {
    const headers = { Authorization: `Bot ${token}` };
    if (body) { headers['Content-Type'] = 'application/json'; }

    const options = {
        method,
        headers,
        ...(body && { body: JSON.stringify(body) }),
    };

    const res = await fetch(`${DISCORD_URL}${endpoint}`, options);
    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Discord API Error: ${res.status} ${res.statusText} - ${error}`);
    }

    return res;
}

export async function triggerTyping(token, channelId) {
    return discordRequest(token, `/${channelId}/typing`, 'POST');
}

export async function sendChannelMsg(token, channelId, content) {
    return discordRequest(token, `/${channelId}/messages`, 'POST', { content });
}
