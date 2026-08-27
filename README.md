# OMARCHY VM

GCP Virtual Machine control panel with a dark, terminal-inspired UI.

## Features

- Google OAuth2 authentication
- Real-time VM status monitoring with configurable polling
- VM lifecycle control: start, stop, reset, suspend, resume
- Serial port console output
- Disk and network interface details
- Keyboard shortcuts (`Ctrl+S` power, `Ctrl+R` refresh, `Ctrl+,` settings)
- Activity log with timestamped entries

## Architecture

```
omarchy-vm/
├── public/                  # Frontend (static files served by Express)
│   ├── index.html           # Main HTML structure
│   ├── styles.css           # Dark terminal aesthetic CSS
│   └── app.js               # Client-side logic (OAuth, polling, UI)
├── server/                  # Backend
│   ├── src/
│   │   ├── routes/
│   │   │   └── vm.js        # VM API route definitions
│   │   ├── services/
│   │   │   └── gcp.js       # GCP Compute Engine API client
│   │   └── middleware/
│   │       └── vm.js        # Auth & param validation middleware
│   ├── server.js            # Express app entry point
│   ├── server.test.js       # API tests (Node test runner + supertest)
│   └── package.json         # Server dependencies
├── docs/
│   └── concepts/            # Design concept mockups
├── .gitignore
├── .nvmrc                   # Node version
├── README.md
└── package.json             # Root scripts
```

## Prerequisites

- [Node.js](https://nodejs.org) >= 20
- [pnpm](https://pnpm.io) (install: `npm install -g pnpm`)
- A GCP project with Compute Engine API enabled
- An OAuth 2.0 Client ID (Web application type)

## Setup

```bash
# Install dependencies
pnpm install

# Option A: Run as Desktop App (Electron for Windows)
pnpm run app:dev

# Option B: Run as Web Server only
pnpm run dev
# Then open http://localhost:3000 in your browser
```

## Build Windows Installer / Executable (.exe)

```bash
# Build installer (NSIS) and portable .exe in the dist/ folder
pnpm run app:build:win

# Or generate the unpacked application directory
pnpm run app:build:dir
```

## GCP Configuration

1. Go to [Google Cloud Console > APIs & Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (type: Web application)
3. Add `http://localhost:3000` to Authorized JavaScript origins and Redirect URIs
4. Copy the Client ID and paste it in the login screen

## Testing

```bash
cd server
pnpm test
```

## API Endpoints

| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| GET    | `/api/vm/status`      | VM instance status   |
| GET    | `/api/vm/details`     | Full VM details      |
| POST   | `/api/vm/start`       | Start the VM         |
| POST   | `/api/vm/stop`        | Stop the VM          |
| POST   | `/api/vm/reset`       | Reset the VM         |
| POST   | `/api/vm/suspend`     | Suspend the VM       |
| POST   | `/api/vm/resume`      | Resume the VM        |
| GET    | `/api/vm/serial-port` | Serial console output|

All endpoints require `?project=X&zone=Y&instance=Z` query params and `Authorization: Bearer <token>` header.

## License

MIT
