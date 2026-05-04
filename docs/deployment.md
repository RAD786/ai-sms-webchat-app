# Revnex Deployment Guide

This guide covers production-minded deployment for the existing Revnex platform on Vercel with PostgreSQL, Clerk, and Twilio.

## Deployment target

Recommended production stack:

- hosting: Vercel
- database: Supabase Postgres
- auth: Clerk
- telephony: Twilio

## Required environment variables

Set these in Vercel for every deployed environment that should function end to end:

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

Production notes:

- `DATABASE_URL`
  - pooled runtime connection
- `DIRECT_URL`
  - direct connection for migrations
- `NEXT_PUBLIC_APP_URL`
  - must be the exact deployed base URL, for example `https://app.clientdomain.com`

## Vercel deployment

### 1. Connect the repository

1. Push the codebase to GitHub.
2. Import the repo into Vercel.
3. Keep the Next.js framework preset.

### 2. Add environment variables

In Vercel project settings, add:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `NEXT_PUBLIC_APP_URL`

### 3. Run Prisma migrations safely

For production, use:

```powershell
npx prisma migrate deploy
```

Recommended rule:

- local development: `prisma migrate dev`
- production: `prisma migrate deploy`

Do not use:

- `prisma migrate dev` in production
- `prisma db push` as a production migration strategy

### 4. Seed guidance

Only run the seed script when you intentionally want demo/sample data.

Appropriate places:

- local development
- demo/staging environments
- temporary preview environments meant for demos

Not appropriate as a default production step:

- real client production databases

## Supabase connection guidance

Use both Supabase connection styles correctly:

### `DATABASE_URL`

Use the pooled connection string.

Typical traits:

- pooler hostname
- often port `6543`
- used by the app during runtime

### `DIRECT_URL`

Use the direct database connection string.

Typical traits:

- direct database host
- often port `5432`
- used for Prisma migrations

## Clerk production setup

1. Create or select the Clerk application for the environment.
2. Add:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
3. Add the production app domain to Clerk:
   - allowed origins
   - sign-in redirect URLs
   - sign-up redirect URLs
   - dashboard redirect URLs

Typical production URLs:

- `https://app.clientdomain.com`
- `https://app.clientdomain.com/sign-in`
- `https://app.clientdomain.com/sign-up`
- `https://app.clientdomain.com/dashboard`

## Twilio production setup

1. Confirm the Twilio number supports Voice and SMS.
2. Add:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
3. In the Revnex dashboard:
   - add the Twilio number in `/dashboard/channels`
   - assign it to the correct location
   - keep `voiceEnabled` on
   - keep `smsEnabled` on if automation should send

## Exact Twilio webhook URLs to configure

If the deployed domain is:

```text
https://app.clientdomain.com
```

Then configure the Twilio number with these exact URLs:

### Voice webhook

```text
https://app.clientdomain.com/api/webhooks/twilio/voice
```

Method:

- `POST`

### Call status callback

```text
https://app.clientdomain.com/api/webhooks/twilio/status
```

Method:

- `POST`

### Messaging webhook

```text
https://app.clientdomain.com/api/webhooks/twilio/sms
```

Method:

- `POST`

## First production verification pass

After deploy:

1. Run `npx prisma migrate deploy`.
2. Sign into the dashboard through Clerk.
3. Confirm the business and location exist.
4. Confirm the live Twilio number is present and assigned.
5. Confirm business hours and message templates are saved.
6. Make a real missed call.
7. Confirm:
   - call record created
   - lead matched or created
   - SMS sent if enabled
8. Review `/dashboard/diagnostics` for any unmatched numbers or failures.

## New client onboarding checklist

Use this exact flow for a new client launch:

1. Provision database access and set `DATABASE_URL` plus `DIRECT_URL`.
2. Create or connect the Clerk app and set Clerk keys.
3. Deploy the app to the client domain in Vercel.
4. Set `NEXT_PUBLIC_APP_URL` to the final live domain.
5. Run `npx prisma migrate deploy`.
6. Provision the client Twilio number.
7. Configure the exact Twilio webhook URLs.
8. In the dashboard:
   - create the location
   - add the number
   - assign it to the location
   - save hours
   - save templates
   - save booking link
9. Make a real missed-call test.
10. Check the diagnostics page before handing off the client.
