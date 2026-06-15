# Deploying the Game Server

The Colyseus server has to run somewhere public for multiplayer to
work in production. Without it, the browser tries `ws://127.0.0.1:2567`
(itself) and silently fails.

This guide uses **Fly.io** — free machine tier, WebSocket-native, low
cold-start. The same Dockerfile works on Render, Railway, or any
container host.

## One-time setup

1. **Install flyctl** (only if you don't have it):
   ```bash
   # macOS / Linux
   curl -L https://fly.io/install.sh | sh

   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```
2. **Sign in**:
   ```bash
   fly auth signup     # or `fly auth login` if you already have an account
   ```

## First deploy

From `apps/game-server/`:

```bash
cd apps/game-server
fly launch --copy-config --name ghostsignal-game-server --region iad --no-deploy
fly deploy
```

`--copy-config` makes Fly read the existing `fly.toml` instead of
re-asking. If the chosen `--name` is taken, pick a different one and
update `fly.toml` to match.

After `fly deploy` finishes, you'll get a URL like
`https://ghostsignal-game-server.fly.dev`. Verify it:

```bash
curl https://ghostsignal-game-server.fly.dev/healthz
# → ok
```

## Wire the web app

The Phaser client reads `NEXT_PUBLIC_GAME_SERVER_URL` at build time
(falls back to `ws://127.0.0.1:2567` for local dev). Set the prod
value on Vercel:

```bash
vercel env add NEXT_PUBLIC_GAME_SERVER_URL production
# Paste: wss://ghostsignal-game-server.fly.dev
```

Then redeploy the web app (Vercel → trigger a redeploy on `main`).

## Subsequent deploys

```bash
cd apps/game-server
fly deploy
```

CI integration (auto-deploy on push) is a future task; for now this
is manual.

## Cost note

The `[[vm]]` block in `fly.toml` requests `shared-cpu-1x` with 256 MB
RAM — the smallest tier. Fly's free allowance covers up to 3 such
machines 24/7. Beyond ~50 concurrent rooms or steady high CPU we'd
need to scale up (`fly scale vm shared-cpu-1x --memory 512`).
