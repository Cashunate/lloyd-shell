# Lloyd shell

The self-hosted **shell** for [Lloyd](https://lloyd-platform.vercel.app) — your AI
chief of staff. This app runs on **your** infrastructure and holds your data and
connector credentials. The thinking (orchestration, memory, model routing) runs
in the hosted **Lloyd engine**, switched on by your entitlement key.

> Brain (hosted, ours) ↔ hands (local, yours). Your data and keys never leave
> your environment.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FCashunate%2Flloyd-shell&env=LLOYD_ENTITLEMENT_KEY&envDescription=Your%20Lloyd%20entitlement%20key%20(issued%20when%20you%20subscribe))

One click deploys your own copy to Vercel and prompts you for your entitlement
key. Prefer to run it elsewhere? Clone and host it anywhere that runs Next.js.

## Run locally

```bash
git clone https://github.com/Cashunate/lloyd-shell
cd lloyd-shell
cp .env.example .env.local      # then paste your entitlement key
npm install
npm run dev                     # http://localhost:3000
```

## Configure

| Variable | Required | What it is |
| --- | --- | --- |
| `LLOYD_ENTITLEMENT_KEY` | yes | Issued when you subscribe. Authorises this shell to reach the engine. Keep it secret. |
| `LLOYD_ENGINE_URL` | no | The hosted engine endpoint. Defaults to `https://lloyd-platform.vercel.app`. |

`GET /api/health` reports liveness and whether your key is configured (it never
returns the key itself).

## Customise

This repo is yours. Open it in [Claude Code](https://claude.com/claude-code) and
tailor Lloyd's surfaces and connectors to how your team works — the engine keeps
the intelligence current; the shell is yours to shape.

## Support

Email [nathan@cashugroup.com](mailto:nathan@cashugroup.com).
