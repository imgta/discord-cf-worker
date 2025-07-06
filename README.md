# Discord Cloudflare Deployment
Host your discord bot on Cloudflare with basic AI commands using Cloudflare Workers AI.

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
3. Make sure these environment variables are exposed to your Cloudflare Worker via your Workers & Pages dashboard
4. After pushing changes to main and successful deployment via GitHub Actions, set your Cloudlfare Worker URL as your [Discord app's](https://discord.com/developers/applications) `INTERACTIONS ENDPOINT URL` and save

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
4. Try using the `/hello` command in a channel
