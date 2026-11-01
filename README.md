# AK Universe

Marketing site for AK Universe: video services, AI agent subscriptions, quotes, bookings, and customer accounts. It is a Next.js app written in TypeScript and styled with Tailwind. Accounts and data use Supabase, payments use Stripe, and transactional email uses Resend. Production hosting is Vercel.

Pages that have not been rebuilt in React still run from the original static site in `legacy-source/`.

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the keys you have. The dev server starts without every key. Auth, payments, and email need the matching services configured. Do not commit `.env` or `.env.local`.

3. Start the app:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run check:setup` | Report which environment keys and setup steps are still missing |
| `npm run setup:supabase` | Apply Supabase migrations, URLs, email templates, and optional SMTP or Google sign-in |

## More detail

Account setup, DNS, Stripe, Resend, and Vercel are in [SETUP.md](SETUP.md). Current build status is in [PROGRESS.md](PROGRESS.md).
