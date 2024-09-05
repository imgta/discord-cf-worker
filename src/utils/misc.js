export async function triggerTyping(token, channelId) {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/typing`, {
        method: 'POST',
        headers: { Authorization: `Bot ${token}` },
    });
}

export async function editInteractMsg(token, interaction, content) {
    try {
        await fetch(`https://discord.com/api/v10/channels/${interaction.message.channel_id}/messages/${interaction.message.id}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bot ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content, components: [] }),
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
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
