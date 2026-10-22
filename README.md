# Chakki Fresh

An experimental Next.js storefront for freshly milled flour and spice blends in Lucknow. Customers can browse curated blends, build custom mixes, and manage their cart, addresses, and orders.

## Tech stack

- Next.js 14 with the App Router
- React 18 and TypeScript
- Supabase for data storage
- Tailwind CSS

## Getting started

### Requirements

- Node.js 20 or later
- A Supabase project

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

   Keep service-role keys and other secrets private. Never use a service-role key as a `NEXT_PUBLIC_` variable or commit `.env.local`.

3. In the Supabase SQL Editor, run [`schema.sql`](./schema.sql) to create and seed the tables used by the app.

4. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Optional integrations

Phone OTP delivery uses Twilio when these variables are configured; without Twilio, the development endpoint returns an OTP for local testing:

```dotenv
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

Payments and WhatsApp order notifications also require provider credentials. Configure these only on the server and keep them out of source control:

```dotenv
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
TWILIO_WHATSAPP_FROM=
ADMIN_WHATSAPP_NUMBER=
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run the Next.js lint command |

## Project status

This project is a work in progress. Configure Supabase and any desired integrations before using flows that depend on them. The authentication and database policies in the current MVP schema are not suitable for production use without a security review and hardening.
