export async function triggerTyping(token, channelId) {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/typing`, {
        method: 'POST',
        headers: { Authorization: `Bot ${token}` },
    });
}

export async function sendChannelMsg(token, channelId, content) {
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
