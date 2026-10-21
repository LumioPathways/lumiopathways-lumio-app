# Lumio Pathways — Mobile App

SEN assessment mobile app for parents and clinicians.

## Stack

- **Expo** (SDK 54) + **Expo Router** (file-based navigation)
- **React Native** 0.76
- **Supabase** — lightweight fetch-based client (no npm package)
- **EAS Build** for App Store / Play Store delivery

## Screens

| Route | Description |
|---|---|
| `/` | Session check → redirect |
| `/auth/sign-in` | Email + password sign in |
| `/auth/sign-up` | Account creation |
| `/onboarding` | Child name + age band entry |
| `/assessment` | 10-question assessment |
| `/results` | Domain scores + recommendations |

## Getting started (local)

```bash
npm install
npx expo start
```

## EAS Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo account
eas login

# Configure project (first time)
eas build:configure

# Development build (iOS Simulator)
eas build --profile development --platform ios

# Production build
eas build --profile production --platform all
```

## Supabase

Project: `amsmbgeycleatljbqlli`  
Row Level Security is enabled on all 25 tables.  
See `lib/supabase.ts` for the fetch-based client.

## Environment

The publishable key is in `lib/supabase.ts`.  
Production secrets (service role key) must **never** go in this repo —
use EAS Secrets: `eas secret:create --name SUPABASE_SERVICE_ROLE_KEY --value <key>`
