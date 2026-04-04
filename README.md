# Revnex Lead Capture Platform

Revnex is a unified lead-capture SaaS for service businesses such as med spas, dentists, roofers, plumbers, and law offices.

The current MVP is built as one shared platform with one auth system, one database, and one dashboard. The first active feature is missed-call-to-SMS. The website chatbot is planned and scaffolded, but not fully implemented yet.

## Project Overview

The platform is designed so multiple lead-capture channels can live in the same codebase without becoming separate products.

Current channel:

- Missed-call-to-SMS via Twilio voice and SMS webhooks

Planned channel:

- Website chatbot popup

Shared platform capabilities:

- Clerk authentication
- Multi-business and multi-location data model
- Shared leads, conversations, messages, calls, and settings
- Shared dashboard UI
- Shared service layer for business access, lead handling, messages, and business hours

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Clerk
- Twilio
- Vercel

## Architecture

### Shared Platform

The Revnex codebase is intentionally structured as one platform application instead of one app per channel.

Shared layers:

- `app/dashboard/*`
  - one protected dashboard for all channel features
- `prisma/schema.prisma`
  - one shared schema for businesses, locations, leads, conversations, messages, calls, appointments, and settings
- `lib/auth.ts`
  - Clerk-backed business access checks
- `lib/prisma.ts`
  - Prisma client singleton
- `lib/services/*`
  - shared business logic for leads, messages, business hours, Twilio, and missed-call orchestration

### Feature Modules

Feature-specific logic lives in focused modules instead of being spread through route handlers and pages.

Examples:

- `lib/services/missed-call-service.ts`
  - missed-call-to-SMS business logic
- `lib/services/channels/chatbot.service.ts`
  - placeholder chat conversation and message helpers for future website chat
- `app/api/webhooks/twilio/*`
  - Twilio-specific endpoints
- `app/api/chatbot/*`
  - placeholder structure for future chat APIs

### Shared Platform vs Feature Modules

Shared platform responsibilities:

- authentication
- business scoping
- database models
- dashboard shell
- lead records
- conversation records
- message records
- business hours
- settings persistence

Feature module responsibilities:

- deciding when automation should run
- channel-specific webhook handling
- channel-specific reply behavior
- future chat session and intake flow

This keeps the current SMS feature production-minded without locking the app into an SMS-only architecture.

## Current Feature Status

Implemented now:

- protected dashboard
- shared lead and conversation model
- Twilio voice webhook ingestion
- Twilio call status handling
- inbound SMS handling
- missed-call auto-reply flow
- editable missed-call rule settings
- editable business hours
- editable chatbot settings placeholders

Planned later:

- website chatbot widget
- public chat embed delivery
- AI or scripted chat response logic
- chat handoff workflows

## Local Setup

### 1. Install dependencies

```powershell
npm install
```

### 2. Create local environment file

```powershell
Copy-Item .env.example .env
```

### 3. Fill in required environment variables

Update `.env` with:

- PostgreSQL connection string
- Clerk publishable key
- Clerk secret key
- Twilio account SID
- Twilio auth token
- Twilio phone number
- public app URL

### 4. Generate Prisma client

```powershell
npm run prisma:generate
```

### 5. Run Prisma migration

```powershell
npm run prisma:migrate -- --name init
```

### 6. Seed demo data

```powershell
npm run prisma:seed
```

### 7. Start the dev server

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Clerk Setup

### 1. Create a Clerk application

In the Clerk dashboard:

- create a new application
- enable email or your preferred login method
- copy the publishable key
- copy the secret key

### 2. Add Clerk environment variables

Set these in `.env`:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### 3. Configure allowed URLs

In Clerk, add your local and deployed URLs as allowed origins and redirect URLs.

Typical local URLs:

- `http://localhost:3000`
- `http://localhost:3000/sign-in`
- `http://localhost:3000/sign-up`
- `http://localhost:3000/dashboard`

Typical production URLs:

- `https://your-vercel-domain.vercel.app`
- `https://your-custom-domain.com`

### 4. Create an initial platform user record

Clerk handles authentication, but the app also needs a matching `User` record in the database tied to a `Business`.

For local setup, the seed script creates:

- demo business
- demo location
- demo owner user record

If you sign in with a different Clerk account, you will still need an app-level `User` row with:

- `clerkUserId`
- `businessId`
- `email`
- `role`

## PostgreSQL Setup

You can use local PostgreSQL, Neon, Supabase Postgres, Railway Postgres, or another standard Postgres provider.

### Local example

1. Install PostgreSQL.
2. Create a database named `revnex`.
3. Set `DATABASE_URL` in `.env`.

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/revnex"
```

## Prisma Commands

Generate client:

```powershell
npm run prisma:generate
```

Create and apply migration locally:

```powershell
npm run prisma:migrate -- --name init
```

Seed demo data:

```powershell
npm run prisma:seed
```

Open Prisma Studio:

```powershell
npm run prisma:studio
```

## Seeded Demo Data

The seed script creates:

- business: `Revnex Demo Med Spa`
- one demo location
- one phone number
- one missed call rule
- one chatbot settings placeholder record
- Monday through Saturday business hours
- one demo lead
- one demo conversation
- demo messages
- one demo missed call

## Twilio Setup

### 1. Create a Twilio account

Create a Twilio account and complete phone verification if required.

### 2. Buy or provision a Twilio phone number

The number should support:

- Voice
- SMS

### 3. Add Twilio environment variables

Set these in `.env`:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### 4. Add the Twilio number to the app

In the dashboard:

- go to `/dashboard/channels`
- add the Twilio phone number
- optionally assign it to a location
- enable both voice and SMS

## Twilio Webhook URL Setup

Twilio needs public URLs. For local testing, use a tunnel such as ngrok or Cloudflare Tunnel.

Assume your public base URL is:

```text
https://your-public-url.example
```

### Voice webhook

Configure the Twilio phone number Voice webhook to:

```text
POST /api/webhooks/twilio/voice
```

Full example:

```text
https://your-public-url.example/api/webhooks/twilio/voice
```

### Call status webhook

Configure Twilio call status callback to:

```text
POST /api/webhooks/twilio/status
```

Full example:

```text
https://your-public-url.example/api/webhooks/twilio/status
```

### SMS webhook

Configure the Twilio phone number Messaging webhook to:

```text
POST /api/webhooks/twilio/sms
```

Full example:

```text
https://your-public-url.example/api/webhooks/twilio/sms
```

### App URL environment variable

Set:

```env
NEXT_PUBLIC_APP_URL="https://your-public-url.example"
```

This is important for webhook signature verification and for building callback-aware behavior.

## Manual Testing for Missed-Call SMS

### Prep

Before testing, make sure:

- the business has at least one location
- the location has business hours
- the location has an enabled missed-call rule
- a Twilio number is assigned and has SMS enabled
- Twilio webhooks point to the correct public URLs

### Test flow

1. Start the app locally or deploy it.
2. Make sure the app is publicly reachable.
3. Call the Twilio number from another phone.
4. Do not answer the call.
5. Wait for the status callback and delay window.
6. Confirm the system does the following:
   - creates a `Call` record
   - maps the Twilio number to the correct location
   - marks the call as missed
   - finds or creates a `Lead`
   - finds or creates an SMS `Conversation`
   - checks business hours
   - sends the configured SMS reply if allowed
   - writes the outbound SMS into the shared `Message` table
   - marks `call.smsSent = true`

### Test inbound SMS replies

Reply to the Twilio SMS with:

- `book`
- `hours`
- `address`
- `stop`
- random free text

Confirm the app:

- associates the inbound SMS with the correct lead
- stores it in the shared `Message` table
- attaches it to an SMS `Conversation`
- sends the expected keyword-based response
- opts the lead out when `stop` is received

## Dashboard Areas

Shared dashboard routes:

- `/dashboard`
- `/dashboard/locations`
- `/dashboard/leads`
- `/dashboard/calls`
- `/dashboard/messages`
- `/dashboard/settings`
- `/dashboard/channels`

Channel-specific configuration lives inside the shared dashboard rather than separate products.

## Chatbot Status

The website chatbot is planned and scaffolded, but not fully implemented.

What already exists:

- `ChatbotSettings` model
- dashboard editor for chatbot settings
- placeholder chatbot service files
- placeholder chat API route structure
- shared `Lead`, `Conversation`, and `Message` support for `CHAT`

What is not implemented yet:

- website widget
- public embed script
- AI responses
- live operator handoff
- chat lead routing UX

## Vercel Deployment

### 1. Push the project to GitHub

Commit and push the codebase to a GitHub repository.

### 2. Create a Vercel project

In Vercel:

- import the repository
- select the Next.js framework preset

### 3. Add environment variables in Vercel

Add all production values from `.env.example`:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `NEXT_PUBLIC_APP_URL`

Set `NEXT_PUBLIC_APP_URL` to the final deployed domain.

### 4. Run Prisma in deployment workflow

Make sure your deployment process includes a production migration step before live traffic depends on schema changes.

Typical approach:

- run `prisma migrate deploy` in CI/CD or a release step

### 5. Update Clerk production URLs

Add your production Vercel domain and custom domain to Clerk allowed URLs.

### 6. Update Twilio webhooks

Point Twilio Voice, Status Callback, and Messaging webhooks to the deployed production URLs.

## Recommended File/Folder Mental Model

Important areas:

- `app/`
  - routes, pages, and API handlers
- `app/api/webhooks/twilio/`
  - Twilio webhook endpoints
- `app/api/chatbot/`
  - future chat endpoint structure
- `lib/services/`
  - shared domain services
- `lib/services/channels/`
  - channel-specific orchestration
- `prisma/`
  - schema and seed logic

## Final Manual Checklist Outside VS Code

- Create a PostgreSQL database.
- Create a Clerk application.
- Add Clerk local redirect URLs.
- Create or buy a Twilio number with Voice and SMS enabled.
- Set all required environment variables.
- Run Prisma migration.
- Run the seed script.
- Start the app or deploy it.
- Add the Twilio phone number in `/dashboard/channels`.
- Configure at least one location in `/dashboard/locations`.
- Configure business hours in `/dashboard/settings`.
- Configure a missed-call rule in `/dashboard/settings`.
- Expose the app publicly for webhook testing.
- Set Twilio Voice webhook URL.
- Set Twilio Call Status Callback URL.
- Set Twilio Messaging webhook URL.
- Sign into the app through Clerk.
- Make a real missed test call.
- Confirm the missed call created records in the dashboard or database.
- Reply by SMS and confirm inbound message handling.
- Verify `stop` opts the lead out.
- Leave chatbot disabled until the website widget and chat runtime are implemented.
