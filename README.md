# Wall Paprika

Menu bar app for macOS that rotates desktop wallpapers from Unsplash collections.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm

## Local Development

```bash
# Clone the repo
git clone https://github.com/<owner>/wall-paprika.git
cd wall-paprika

# Install dependencies
npm install

# Start in dev mode (hot reload for renderer)
npm run dev
```

Then launch Electron separately pointing at the built output, or use `npm run build && npx electron .` to test the full app.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload (webpack watch + dev server) |
| `npm run build` | Compile TypeScript and bundle all processes |
| `npm run package` | Build and package into a `.app` bundle |
| `npm run typecheck` | Run `tsc --noEmit` strict type checking |
| `npm run lint` | ESLint + Prettier check |

## Building the App

```bash
npm run package
```

This produces `dist/mac-arm64/Wall Paprika.app`. Drag it to `/Applications` or run it directly.

Since the app is unsigned, on first launch: right-click the `.app` > **Open** to bypass Gatekeeper.

## Project Structure

```
src/
  main/          Electron main process (tray, IPC)
  renderer/      React UI (preferences window)
  shared/        Shared TypeScript types
  preload.ts     Context bridge for secure IPC
assets/          Tray icons
```

## License

MIT
