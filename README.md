<p align="center">
  <img src="assets/logo.png" alt="Wall Paprika" width="200" />
</p>

# Wall Paprika

*Spice up your wallpaper!*

A lightweight menu bar app for macOS that automatically rotates your desktop wallpaper using high-resolution photos from [Unsplash](https://unsplash.com) collections. A free, open-source alternative to [Irvue](https://apps.apple.com/us/app/irvue-desktop-wallpapers/id1039633667?mt=12).

## Features

- Subscribe to any number of Unsplash collections by pasting a URL
- Automatic wallpaper rotation on a configurable interval
- Global hotkey to skip to the next wallpaper
- Photos fetched at up to 4K resolution (3840px) for crisp display on any monitor
- Rolling batch of ~10 images on disk for instant, lag-free rotations
- Photographer attribution shown in the menu bar
- Lives entirely in the menu bar — no dock icon, minimal resource usage
- All data stays local — no telemetry, no tracking

## Prerequisites

- macOS 13+

## Installation

### Download (recommended)

> **Note:** The pre-built `.zip` is for macOS on Apple Silicon (M1/M2/M3/M4) only. Intel Mac users should build from source.

1. Go to the [latest release](https://github.com/jdell98/wall-paprika/releases/latest)
2. Download the `.zip` file
3. Extract it and drag `Wall Paprika.app` to `/Applications`

### Build from source

Requires [Node.js](https://nodejs.org/) v18+ and npm.

```bash
# 1. Clone the repo
git clone https://github.com/jdell98/wall-paprika.git

# 2. Install dependencies
cd wall-paprika && npm install

# 3. Build and package the app
npm run package

# 4. Move to Applications
cp -r dist/mac-arm64/Wall\ Paprika.app /Applications/
```

Launch **Wall Paprika** from Applications or Spotlight. After initial setup, the app lives in your menu bar.

### Bypassing Gatekeeper

The app is unsigned, so macOS will block it on first launch. Use one of these methods:

**Option A — Terminal (recommended):**
```bash
xattr -cr /Applications/Wall\ Paprika.app
```

**Option B — System Settings:**
1. Go to **System Settings → Privacy & Security**
2. Find the "Wall Paprika" blocked message and click **Open Anyway**

**Option C — Right-click:**
1. Right-click (or Control-click) `Wall Paprika.app` in `/Applications`
2. Select **Open** from the context menu
3. Click **Open** in the confirmation dialog

You only need to do this once.

## Setup

Wall Paprika requires your own free Unsplash API key:

1. Go to [unsplash.com/developers](https://unsplash.com/developers) and create a free account
2. Click **New Application**, accept the terms, and give it any name
3. Copy your **Access Key** from the application page
4. On first launch, Wall Paprika will prompt you to paste this key and validate it

## Usage

### Adding collections

1. Find a collection you like on [unsplash.com](https://unsplash.com) (e.g. `https://unsplash.com/collections/079sD7qKlrY/spring-wallpapers`)
2. Open **Preferences** from the tray menu
3. Paste the collection URL into the input field and click **Add**
4. The app fetches the collection metadata and begins downloading wallpapers

Add as many collections as you want. Photos from all collections are pooled together — a larger collection naturally appears more often.

### Rotating wallpapers

- **Automatic:** Set a rotation interval in Preferences (minutes, hours, days, weeks, months)
- **Manual:** Click **Next wallpaper** in the tray menu
- **Hotkey:** Configure a global keyboard shortcut in Preferences

### Tray menu

The menu bar icon gives you quick access to:

- Current wallpaper info with photographer attribution
- **View on Unsplash** — opens the photo's page in your browser
- **Next wallpaper** — immediate rotation
- **Preferences** — manage collections, settings, and API key

## Development

```bash
# Start in dev mode (hot reload for renderer)
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload (webpack watch + dev server) |
| `npm run build` | Compile TypeScript and bundle all processes |
| `npm run package` | Build and package into a `.app` bundle |
| `npm run typecheck` | Run `tsc --noEmit` strict type checking |
| `npm run lint` | ESLint + Prettier check |
| `npm test` | Run unit tests with Vitest |

### Project Structure

```
src/
  main/              Electron main process
    index.ts           App entry, tray setup, lifecycle
    wallpaper.ts       Set wallpaper via AppleScript
    batch-manager.ts   Image batch download and management
    rotation.ts        Wallpaper rotation orchestration
    unsplash.ts        Unsplash API client
    photo-pool.ts      Photo metadata pool and shown tracking
    store.ts           Persistent settings and state
    ipc.ts             IPC handler registration
  renderer/          React UI (preferences window)
    App.tsx            Tabbed preferences interface
    pages/             Page components (Setup, Collections)
    components/        Reusable UI components
  shared/            Shared TypeScript types
  preload.ts         Context bridge for secure IPC
assets/              Tray icons
```

### Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes and ensure `npm run typecheck` and `npm test` pass
4. Submit a pull request

## License

MIT

## Credits

- Photos provided by [Unsplash](https://unsplash.com)
- Inspired by [Irvue](https://irvue.tumblr.com)
