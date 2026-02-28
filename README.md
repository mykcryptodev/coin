# Coin

A React Native app built with Expo for tracking and managing your crypto portfolio.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn** or **bun**
- **Expo CLI**: Install globally with `npm install -g expo-cli`
- **iOS Simulator** (macOS) or **Android Emulator** or physical device with **Expo Go** app

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/mykcryptodev/coin.git
cd coin
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
bun install
```

### 3. Set up environment variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your API keys and configuration.

### 4. Start the development server

```bash
npx expo start
```

This will start the Expo development server. You'll see a QR code in the terminal.

### 5. Run on your device or simulator

- **iOS Simulator**: Press `i` in the terminal
- **Android Emulator**: Press `a` in the terminal
- **Physical device**: Scan the QR code with the **Expo Go** app

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo development server |
| `npm run android` | Run on Android device/emulator |
| `npm run ios` | Run on iOS simulator |
| `npm run web` | Run in web browser |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |
| `npm run reset-project` | Reset project to fresh state |

## Tech Stack

- **Framework**: React Native + Expo
- **Navigation**: Expo Router
- **State Management**: Convex
- **Wallet/CDP**: Coinbase CDP SDK
- **UI**: React Native + Skia for graphics
- **Testing**: Jest + React Native Testing Library

## Project Structure

```
├── app/                 # App routes (Expo Router)
├── components/          # Reusable components
│   └── __tests__/      # Component tests
├── hooks/              # Custom React hooks
├── constants/          # App constants
├── convex/             # Convex backend
├── assets/             # Images, fonts, etc.
└── scripts/            # Utility scripts
```

## Troubleshooting

### Metro bundler issues
```bash
npx expo start --clear
```

### iOS build issues
```bash
cd ios && pod install && cd ..
```

### Reset to fresh state
```bash
npm run reset-project
```

## Development

### Adding a new route
Create a file in `app/` directory. Expo Router uses file-based routing.

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Submit a pull request

## License

Private - All rights reserved.
