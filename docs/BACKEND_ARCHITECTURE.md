# TwistMS Backend & Seller Ecosystem Architecture (Powered by Supabase)

## Overview
This document outlines the complete backend architecture, database schema, authentication lifecycle, automated post-expiration engine, and seller analytics dashboard built for **TwistMS Real Estate**.

---

## 1. Core Architecture & Features

### 1.1 Account & Identity Management (Supabase Auth)
- **Roles**: Sellers (`seller`), Real Estate Agents (`agent`), and Buyers (`buyer`).
- **Profiles Table (`public.profiles`)**: Automatically synced via PostgreSQL trigger `on_auth_user_created` whenever a user registers through Supabase Auth.
- **Attributes Tracked**:
  - `full_name`, `email`, `phone`, `agency_name`, `avatar_url`
  - `current_plan`: The active syndication tier (`Free`, `Paid`, `Premium`).
  - `plan_selected_at`: Timestamp of tier selection.

### 1.2 Zero-Barrier Plan Selection (No Payment Gateway)
- As requested, **no payment gateway or checkout wall is enforced**. Users directly select their desired plan during account creation, listing creation, or anytime inside the Seller Dashboard.
- Plans activate instantaneously:
  - **Free Plan ($0)**: Designed for individual homeowners. **Posts automatically expire and are erased after 90 days**.
  - **Paid Verified ($49)**: Verified Deed badge, 180-day duration, prioritized search ranking.
  - **Premium Elite ($129)**: Full-year 365-day nationwide syndication and top homepage spotlight.

### 1.3 Automatic 90-Day Post Expiration & Erasure Engine
- **Trigger-Level Calculation**:
  When a property is created with `plan = 'Free'`, a PostgreSQL trigger automatically sets:
  ```sql
  expires_at := NOW() + INTERVAL '90 days';
  ```
- **Automated Scheduled Cleanup (`pg_cron`)**:
  A PostgreSQL function `erase_expired_free_listings()` runs nightly to permanently erase Free plan posts older than 90 days:
  ```sql
  DELETE FROM public.properties
  WHERE plan = 'Free' AND expires_at < NOW();
  ```
- **Public Visibility Enforcement**:
  Row Level Security (RLS) policies prevent expired listings from appearing in public search queries while allowing the seller to review their status in their dashboard.

### 1.4 Seller Analytics & Views Tracking
- **Individual Post Views**:
  Every listing tracks real-time views in `public.properties.views_count` and records historical visitor timestamps in `public.property_views`.
- **Atomic RPC Tracking**:
  A PostgreSQL stored procedure `record_property_view(property_id, viewer_id)` increments views atomically without race conditions.
- **Seller Dashboard Metrics**:
  - Total views across all seller listings
  - Average views per post
  - Active listings vs expired listings
  - Individual post performance with 90-day countdown progress bars
  - Direct buyer inquiry messages and lead status

### 1.5 Buyer-to-Seller Lead Inquiries
- Visitors viewing any property detail page can submit a direct inquiry.
- Inquiries are recorded in `public.inquiries` and routed directly to the property owner's Seller Dashboard under **Buyer Inquiries**, complete with sender name, email, phone, and message.

### 1.6 Direct Seller Contact & Verified Google Maps Pin System
- **Accurate Seller Details**:
  Each listing explicitly captures the seller's full name, email address, and direct phone/WhatsApp number.
  The property details page dynamically routes:
  - 📞 **Direct Call Button**: Links to `tel:<seller_phone>`.
  - ✉️ **Direct Email Button**: Links to `mailto:<seller_email>`.
  - 💬 **WhatsApp Direct Chat**: Links directly to `https://wa.me/<seller_phone>?text=...` with a prefilled inquiry for that specific property ID and title.
- **Verified Map Pin & GPS Navigation**:
  - The submission form prompts sellers for their **Google Maps Location link / Map Pin URL** (e.g. from Google Maps "Share" -> "Copy link").
  - On the property detail page, a dedicated **"Open in Google Maps ↗"** button opens the exact pin/coordinates in Google Maps on mobile or desktop for live GPS directions.
  - An interactive Google Maps satellite/street view iframe is seamlessly embedded.
- **Resilient Dual-Storage Engine**:
  Seller contact info and the Google Maps pin URL are stored via a dual-strategy (native database columns + embedded metadata in listing descriptions), guaranteeing that listings created on any phone or device retain complete seller contact and map details even if database schema migrations are pending.

---

## 2. Supabase Setup Instructions (Step-by-Step)

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a new project.
2. Under **Project Settings -> API**, copy your:
   - **Project URL**
   - **anon / public key**

### Step 2: Configure Environment Variables
Create a `.env` file in the project root:
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Compatible with Next.js / Vercel:
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

### Step 3: Run SQL Schema & Permissions
1. Open your Supabase Dashboard and click on **SQL Editor**.
2. Open `supabase/schema.sql` from this repository, paste the entire content, and click **Run**.
3. Open `supabase/fix_permissions.sql`, paste the entire content, and click **Run** (this ensures public read/write permissions for property views, inquiries, and seller contact columns).

### Step 4: Enable Automated 90-Day Purge Cron
1. In the Supabase SQL Editor, run `supabase/cron_setup.sql`.
2. This activates `pg_cron` to execute `erase_expired_free_listings()` daily at 00:00 UTC.

---

## 3. Plug-and-Play Offline Fallback
The frontend includes a seamless dual-mode client (`src/lib/supabase.js`):
- If Supabase environment variables are provided, it connects to live Supabase Postgres & Auth.
- If running locally without Supabase credentials, it automatically falls back to an in-browser local storage database with demo data, mock view tracking, and instant plan selection so developers can test immediately!

---

## 4. Production Deployment Guide (Vercel, Netlify, Cloudflare Pages)

### Deploy to Vercel
1. Push this repository to GitHub or GitLab.
2. Import the repository in [Vercel](https://vercel.com).
3. In **Build & Development Settings**:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`: `https://your-project-id.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `your-anon-key-here`
5. Click **Deploy**.

### Deploy to Netlify
1. Connect repository in [Netlify](https://netlify.com).
2. Set Build command: `npm run build`.
3. Set Publish directory: `dist`.
4. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Deploy site.
