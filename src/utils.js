/**
 * Makes Discord API request using the given token, handling both JSON and FormData paylods.
 */
export async function discordRequest(token, method = 'GET', endpoint, body = null) {
    const isForm = body instanceof FormData;

    const headers = { Authorization: `Bot ${token}` };
    if (!isForm && body) { headers['Content-Type'] = 'application/json'; }

    const res = await fetch(`https://discord.com/api/v10${endpoint}`, {
        method,
        headers,
        body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`Discord API Error: ${res.status} ${res.statusText} - ${error}`);
    }

    return res;
}

export async function triggerTyping(token, channelId) {
    return discordRequest(token, 'POST', `/channels/${channelId}/typing`);
}

export async function sendChannelMsg(token, channelId, content) {
    return discordRequest(token, 'POST', `/channels/${channelId}/messages`, { content });
}
