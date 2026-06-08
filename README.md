# VisionStore — Lenskart-style Eyewear E-commerce Platform

Production-ready eyewear e-commerce platform built with Next.js 14, Supabase, Cloudinary, Gmail SMTP and WhatsApp Cloud API.

---

## 🏗️ Architecture

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend + API | Next.js 14 (App Router) on Vercel | UI, serverless functions |
| Database + Auth | Supabase (Postgres + Auth) | All data, user auth, RLS |
| File Storage | Cloudinary | Product images (WebP), invoice PDFs |
| Email | Gmail SMTP (Nodemailer) | Transactional + marketing emails |
| WhatsApp | Meta WhatsApp Cloud API | Order updates (2 msgs only) |

---

## 🚀 Quick Start

### 1. Clone & install

```bash
git clone <repo>
cd lenskart-clone
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL editor
3. Enable Google OAuth in Authentication → Providers
4. Copy your project URL and anon key

### 3. Set up Cloudinary

1. Create account at [cloudinary.com](https://cloudinary.com)
2. Get cloud name, API key, and API secret from dashboard

### 4. Set up Gmail SMTP

1. Enable 2-Factor Authentication on your Gmail
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create an App Password for "Mail"

### 5. Set up WhatsApp Cloud API

1. Create Meta Developer account and app
2. Set up WhatsApp Business API
3. Create and get approved for two message templates:
   - `order_confirmed_v1` — Order confirmed with invoice link
   - `ready_for_pickup_v1` — Ready for pickup notification
4. Get Phone Number ID and Access Token

### 6. Configure environment variables

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 7. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
lenskart-clone/
├── app/
│   ├── page.tsx                    # Homepage (SSG, 10min cache)
│   ├── products/
│   │   ├── page.tsx                # Product listing (SSG + client filters)
│   │   └── [slug]/page.tsx         # Product detail (SSG, 5min ISR)
│   ├── cart/page.tsx               # Shopping cart (client)
│   ├── checkout/page.tsx           # Checkout (client)
│   ├── orders/[id]/page.tsx        # Order confirmation
│   ├── wishlist/page.tsx           # Wishlist (client)
│   ├── store/page.tsx              # Store locator (SSG)
│   ├── booking/
│   │   ├── page.tsx                # Book visit (client)
│   │   └── confirmed/page.tsx      # Booking confirmation
│   ├── auth/
│   │   ├── login/page.tsx          # Login/signup
│   │   └── callback/route.ts       # OAuth callback
│   ├── admin/
│   │   ├── layout.tsx              # Admin layout (auth guard)
│   │   ├── page.tsx                # Dashboard
│   │   ├── products/page.tsx       # Product management
│   │   ├── orders/page.tsx         # Order management
│   │   ├── stores/page.tsx         # Store management
│   │   ├── bookings/page.tsx       # Booking management
│   │   └── marketing/page.tsx      # Email campaigns
│   ├── api/
│   │   ├── place-order/route.ts    # Create order
│   │   ├── generate-invoice/       # PDF generation + Cloudinary
│   │   ├── send-email/route.ts     # Transactional emails
│   │   ├── send-whatsapp/route.ts  # WhatsApp (2 msgs only)
│   │   ├── send-marketing-email/   # Admin campaigns
│   │   └── admin/upload-image/     # Cloudinary image upload
│   └── unsubscribe/page.tsx        # Email unsubscribe
├── components/
│   ├── Navbar.tsx
│   ├── StoreList.tsx
│   ├── product/
│   │   ├── ProductCard.tsx
│   │   ├── ProductFilters.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ProductGallery.tsx
│   │   ├── ProductActions.tsx
│   │   └── ReviewList.tsx
│   ├── lens/
│   │   └── LensFlowModal.tsx
│   ├── cart/
│   └── admin/
│       └── AdminSidebar.tsx
├── hooks/
│   └── useCart.ts
├── lib/
│   ├── supabase.ts
│   ├── cloudinary.ts
│   ├── email.ts
│   ├── whatsapp.ts
│   ├── invoice.ts
│   └── rate-limit.ts
├── types/
│   └── index.ts
└── supabase/
    └── schema.sql
```

---

## ⚡ Performance Rules (Enforced)

- **SSG** for Home, Products listing, Product pages (revalidate: 5–10 min)
- **Client-side** for filters, search, cart, lens flow
- **Debounced search** at 400ms — no API on every keystroke
- **Pagination** max 24 items per page
- **Images**: WebP only, max 300KB, 4–6 per product, `f_auto q_auto`
- **Queries**: Always `.range()`, never `select('*')` without limits
- **Caching**: 5-min in-memory cache for product data

---

## 📲 WhatsApp Rules (Strict)

Only **2 messages** are ever sent per order:

1. **Order Confirmed** — triggered after invoice generation, includes invoice PDF link + store
2. **Ready for Pickup** — triggered by admin manually changing order status

Both have duplicate-prevention flags (`whatsapp_confirmed_sent`, `whatsapp_ready_sent`) stored in the `orders` table. A message can never be sent twice.

---

## 📧 Email Rules

**Transactional (auto):**
- Order confirmation (with invoice link)
- Booking confirmation

**Marketing (admin-only):**
- Admin-triggered from `/admin/marketing`
- Only sends to `email_opt_in = true` users
- Batches of 50 with 2-second delays between batches
- Every email includes an unsubscribe link
- Campaign status tracked to prevent duplicates

---

## 🗄️ Database Cleanup

Run this SQL periodically (or set up a Supabase cron):

```sql
-- Delete abandoned carts older than 7 days
DELETE FROM cart_items WHERE updated_at < NOW() - INTERVAL '7 days';

-- Clean old campaign recipients
DELETE FROM campaign_recipients WHERE sent_at < NOW() - INTERVAL '90 days';
```

---

## 🚀 Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Add all environment variables from `.env.example` in the Vercel dashboard.

**Note for PDF generation on Vercel:** Replace `puppeteer-core` with `@sparticuz/chromium`:

```bash
npm install @sparticuz/chromium puppeteer-core
```

And update `lib/invoice.ts`:

```ts
import chromium from '@sparticuz/chromium'
const executablePath = await chromium.executablePath()
```

---

## 🛡️ Security

- Row Level Security (RLS) enabled on all tables
- Admin routes protected by server-side role check
- API routes protected by rate limiting
- Image uploads validated (type + size) before Cloudinary
- No sensitive keys exposed to client
- WhatsApp/email sent only by server-side API routes
