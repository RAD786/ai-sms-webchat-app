# Revnex Lead Capture Platform

Revnex is a multi-tenant lead capture platform for service businesses. The current production feature is missed-call-to-SMS using Twilio voice and SMS webhooks, with a shared dashboard for businesses, locations, leads, calls, messages, and settings.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Clerk
- Twilio
- Vercel

## Current product surface

Implemented now:

- multi-business auth and access control
- location and phone number setup
- Twilio voice webhook intake
- Twilio call status processing
- inbound SMS processing
- missed-call SMS automation
- business hours and message template settings
- diagnostics page for recent webhook and send issues

Planned next:

- cleaner onboarding UX refinements
- richer reporting
- website chatbot widget and runtime

## Project structure

Important areas:

- `app/dashboard/*`
  - protected operator dashboard
- `app/api/webhooks/twilio/*`
  - Twilio webhook endpoints
- `lib/services/*`
  - business logic for Twilio, missed-call automation, diagnostics, leads, and messaging
- `prisma/schema.prisma`
  - shared multi-tenant data model
- `prisma/migrations/*`
  - schema migrations
- `prisma/seed.ts`
  - local demo seed data

## Environment variables

These variables are required for normal development and deployment.

```env
DATABASE_URL=
DIRECT_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
NEXT_PUBLIC_APP_URL=
```

What each one does:

- `DATABASE_URL`
  - primary Prisma connection string used by the app at runtime
- `DIRECT_URL`
  - direct Postgres connection used for Prisma migrations
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Clerk frontend key for sign-in and session handling
- `CLERK_SECRET_KEY`
  - Clerk backend key for server-side auth
- `TWILIO_ACCOUNT_SID`
  - Twilio account identifier
- `TWILIO_AUTH_TOKEN`
  - Twilio auth token used for API calls and webhook verification
- `TWILIO_PHONE_NUMBER`
  - fallback outbound Twilio number for SMS sends
- `NEXT_PUBLIC_APP_URL`
  - full public base URL for the running app, used for webhook signature verification and public callback behavior

## Local development

### 1. Install dependencies

```powershell
npm install
```

### 2. Create your local environment file

Create `.env.local` and populate the required environment variables listed above.

For local development:

- `DATABASE_URL` can point to local Postgres or Supabase pooler
- `DIRECT_URL` should point to a direct Postgres connection
- `NEXT_PUBLIC_APP_URL` should usually be `http://localhost:3000`

### 3. Generate Prisma client

```powershell
npm run prisma:generate
```

### 4. Apply migrations locally

Use Prisma migrate in development when changing schema locally:

```powershell
npm run prisma:migrate -- --name your_change_name
```

### 5. Seed demo data if you want a polished demo workspace

Local-only demo seed:

```powershell
npm run prisma:seed
```

Use the seed script for:

- local development
- staging/demo environments when you intentionally want sample records

Do not treat seeding as a normal production step for real client databases.

### 6. Run the dev server

```powershell
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

This app works well with Supabase Postgres.

Recommended connection pattern:

- use the Supabase pooler connection for `DATABASE_URL`
- use the direct database connection for `DIRECT_URL`

Typical setup:

- `DATABASE_URL`
  - pooled connection, often port `6543`
- `DIRECT_URL`
  - direct connection, often port `5432`

Why:

- app traffic should go through the pooler
- Prisma migrations should use the direct connection

If you use Supabase:

1. Create a Supabase project.
2. Open the database connection settings.
3. Copy the pooled connection into `DATABASE_URL`.
4. Copy the direct connection into `DIRECT_URL`.
5. Confirm SSL and connection options match Supabase guidance.

## Clerk setup

1. Create a Clerk application.
2. Enable the auth methods you want, usually email sign-in first.
3. Add:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
4. Add allowed origins and redirect URLs for both local and production environments.

Local URLs to allow:

- `http://localhost:3000`
- `http://localhost:3000/sign-in`
- `http://localhost:3000/sign-up`
- `http://localhost:3000/dashboard`

Production URLs to allow:

- `https://your-vercel-domain.vercel.app`
- `https://your-custom-domain.com`
- corresponding `/sign-in`, `/sign-up`, and `/dashboard` routes

Notes:

- Clerk manages identity, but the app also needs `User` rows in the database
- the local demo seed creates demo app users
- in development, the app can auto-provision a development owner if needed

## Twilio setup

1. Create a Twilio account.
2. Buy or provision a Twilio phone number with:
   - Voice
   - SMS
3. Add:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
4. In the Revnex dashboard:
   - create or confirm the location
   - add the live Twilio number in `/dashboard/channels`
   - assign that number to the correct location
   - enable `voiceEnabled`
   - enable `smsEnabled` if missed-call SMS should send
5. In `/dashboard/settings`:
   - save business hours
   - save missed-call templates
   - save booking link
   - enable missed-call texting

## Exact Twilio webhook URLs

Assume your public app URL is:

```text
https://your-app.example.com
```

Set `NEXT_PUBLIC_APP_URL` to that exact base URL.

### Voice webhook URL

```text
https://your-app.example.com/api/webhooks/twilio/voice
```

Twilio config:

- webhook method: `POST`

### Call status callback URL

```text
https://your-app.example.com/api/webhooks/twilio/status
```

Twilio config:

- callback method: `POST`

### Messaging webhook URL

```text
https://your-app.example.com/api/webhooks/twilio/sms
```

Twilio config:

- webhook method: `POST`

For local webhook testing, expose your local app with ngrok or Cloudflare Tunnel and use the public tunnel URL as `NEXT_PUBLIC_APP_URL`.

## Prisma workflow guidance

### Local development

Use migration creation locally:

```powershell
npm run prisma:migrate -- --name descriptive_change_name
```

Use seed data only when you intentionally want demo records:

```powershell
npm run prisma:seed
```

### Production

Use migration deployment only:

```powershell
npx prisma migrate deploy
```

Production guidance:

- do not run `prisma migrate dev` in production
- do not rely on `db push` for production schema changes
- do not seed real client databases as part of normal deployment
- only run seed scripts in production-like environments when you explicitly want demo/sample data

## Dashboard setup flow

For a new live location:

1. Create the business or sign into the correct tenant.
2. Create the location in `/dashboard/locations`.
3. Add the Twilio number in `/dashboard/channels`.
4. Assign the number to the location.
5. Save business hours in `/dashboard/settings`.
6. Save missed-call SMS templates in `/dashboard/settings`.
7. Save the booking link in `/dashboard/settings` or `/dashboard/locations`.
8. Verify the setup checklist shows the location as ready.
9. Make a real test call and test SMS reply.
10. Review `/dashboard/diagnostics` if anything fails.

## New client onboarding checklist

Use this for each new client:

1. Create the Postgres database or provision a new tenant database environment.
2. Add `DATABASE_URL` and `DIRECT_URL`.
3. Create or connect the Clerk app and add Clerk environment variables.
4. Add the correct production domain to Clerk allowed URLs.
5. Provision or transfer the Twilio number.
6. Add Twilio environment variables.
7. Deploy the app and run `prisma migrate deploy`.
8. Set `NEXT_PUBLIC_APP_URL` to the final production domain.
9. Configure the exact Twilio voice, call status, and messaging webhook URLs.
10. In the dashboard, create the client location and assign the Twilio number.
11. Save business hours, booking link, and missed-call templates.
12. Make a real test call and confirm:
    - call logs
    - lead creation or matching
    - outbound SMS sends
    - diagnostics page stays clean or shows actionable errors

## Deployment

Use the dedicated deployment runbook:

- [docs/deployment.md](/c:/Users/ryana/ai-sms-webchat/docs/deployment.md)
