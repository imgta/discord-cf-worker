# Discord Cloudflare Deployment
Host your discord bot on Cloudflare with basic AI commands using Cloudflare Workers AI.

## Discord App Setup
1. Create a new discord application in your [Discord Portal](https://discord.com/developers/applications)
2. Navigate to the `Bot` settings on the left sidebar, or go to `https://discord.com/developers/applications/<application-id>/bot`
3. Copy your discord application token to set as your environment variable later
4. Navigate to the `OAuth2` settings
5. Enable the following permissions under `OAuth2 URL Generator`
```md
SCOPES
- [x] bot
- [x] applications.commands

BOT PERMISSIONS > TEXT PERMISSIONS
- [x] Send Messages
- [x] Use Slash Commands
```
6. Copy and navigate to the `GENERATED URL` and go through the OAuth flow
7. Find your guild and channel ids by right-clicking a discord channel and copying the link, e.g. `https://discord.com/channels/<DISCORD_GUILD_ID>/<DISCORD_CHANNEL_ID>`

## Quick Start  
1. Clone repository and install dependencies
```
pnpm install
```
2. Register all slash commands
```
npm run register
```
3. Create a `.dev.vars` populated with the necessary environment variables:
```env
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_WORKERS_GATEWAY_ID=...
DISCORD_TOKEN=...
DISCORD_PUBLIC_KEY=...
DISCORD_APPLICATION_ID=...
DISCORD_GUILD_ID=...
DISCORD_CHANNEL_ID=...
```
3. Create a new Cloudflare Worker and pass these environment variables in the `Variables and Secrets` section of your worker dashboard
4. After pushing changes to main and successful deployment via GitHub Actions, set your Cloudlfare Worker URL, e.g. `<worker-name>.<subdomain>.workers.dev`, as your [Discord app's](https://discord.com/developers/applications) `INTERACTIONS ENDPOINT URL` and save
5. Try using the `/hello` command in your channel

## Local Testing
1. Start wrangler
```
npm run dev
```
2. Tunnel localhost to live, accessible URL endpoint
```
npm run tun
```
3. Set the tunnel URL as your [Discord app's](https://discord.com/developers/applications) `INTERACTIONS ENDPOINT URL` and save
4. Try using the `/hello` command in your channel
