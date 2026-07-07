# WorkOS — Personal CRM & Project Management PWA

WorkOS (by Anass Elhafdaoui) is a self-contained, full-stack personal CRM and project management platform built as a Progressive Web App (PWA). It is optimized for mobile-first access on the iPhone (Add to Home Screen) and any Chromium-based desktop browser, offering real-time sync across devices.

## 🚀 Features

- **Neumorphic Professional UI**: Customized Light Mode with soft shadows (`#E2E6EC`), gorgeous gradients, and typography using DM Serif Display and Geist.
- **5 Business Divisions**: Built around fixed folders representing Agencement, Développement, Divers, Importation, and Étude Technique, with color coding synchronized across all modules.
- **File Manager**: Drag-and-drop file upload, folder nesting, and file management backed by Supabase Storage.
- **Gantt Chart**: A custom timeline representation of tasks with progress tracking, start/end dates, subtask support, and a blocked status styling.
- **Calendar**: React FullCalendar v6 with division color coding, side drawers, "Add to Google Calendar" links, and a secure iCal feed URL.
- **iCal iOS Sync**: A secure feed that pulls all calendar events directly into your iPhone Calendar app.
- **Drawing Canvas & Mind Map**: Full-screen canvas powered by Fabric.js with tools for lines, circles, boxes, text, freehand drawing, and auto-saves to Supabase.
- **Web Push Notifications**: Toast alerts and notifications for upcoming event reminders.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router) — TypeScript
- **Styling**: Tailwind CSS + Neumorphic System
- **Database / Auth**: Supabase (PostgreSQL + Auth + Storage Buckets)
- **PWA Integration**: `next-pwa`
- **Calendar**: FullCalendar v6 React Plugin
- **Drawing Canvas**: Fabric.js

---

## ⚙️ Local Setup Instructions

1. **Clone or copy the project files** to your local environment.
2. Open your terminal in the directory `C:\Users\PCµ\Desktop\CrmAnass\workos-app`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy the environment variables template and fill in your keys:
   ```bash
   copy .env.example .env.local
   ```

### Environment Variables Guide

Edit your `.env.local` file with the following configurations:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL (from Settings > API).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon API key.
- `SUPABASE_SERVICE_ROLE_KEY`: Server-only secret key (from Settings > API > service_role).
- `ICAL_SECRET_TOKEN`: A random secret token of your choice to protect your iCal feed.
- `VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY`: Generate these by running `npx web-push generate-vapid-keys` in your terminal.

---

## 🗄️ Supabase Project Setup

1. **Create Database Schema**:
   Copy the contents of `supabase/migrations/001_initial_schema.sql` and run them in the **SQL Editor** of your Supabase dashboard. This creates all 6 database tables, indexes, and enables Row Level Security (RLS) policies.
   
2. **Setup Storage Buckets**:
   Go to the **Storage** section in your Supabase Dashboard:
   - Create a private bucket named `files` (disable public read access, authenticated uploads only).
   - Create a public bucket named `canvases` (for canvas thumbnail public previews).

3. **Enable Storage Policies**:
   Make sure you apply the RLS policies for storage objects. You can uncomment the storage lines at the end of the `supabase/migrations/001_initial_schema.sql` file and run them in the SQL Editor, or configure them through the UI:
   - For `files`: Allow all operations (select, insert, delete) only for `authenticated` users.
   - For `canvases`: Allow public `select` to anyone, and allow `insert` and `update` only to `authenticated` users.

4. **Create Your User**:
   Navigate to **Authentication** > **Users** > **Add User** in Supabase and create your personal login credentials (email and password). WorkOS is designed as a single-user space.

---

## 📱 iPhone PWA Installation

1. Open your deployed WorkOS URL in **Safari** on your iPhone.
2. Tap the **Share** button at the bottom of the screen (square with an up arrow).
3. Scroll down and select **Add to Home Screen** (Sur l'écran d'accueil).
4. Tap **Add**. The app will now appear on your home screen with its premium custom logo and run as a standalone, distraction-free app.

### 📅 iCal Subscription Setup on iPhone

To sync your WorkOS events directly to your native iOS Calendar app with color codes:
1. Open the **Settings** app on your iPhone.
2. Go to **Calendar** (Calendrier) > **Accounts** (Comptes) > **Add Account** (Ajouter un compte).
3. Select **Other** (Autre) > **Add Subscribed Calendar** (Ajouter un calendrier avec abonnement).
4. In the Server field, enter your deployed server feed URL:
   ```text
   https://<your-vercel-domain>.vercel.app/api/calendar/ical?token=<your_ical_secret_token>
   ```
5. Tap **Next**, verify the options, and save. All your events will appear natively inside your iOS calendar.

---

## 🚀 Deploiement sur Vercel

1. Push your code to a private GitHub repository.
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. Add all environment variables from `.env.local` to the Vercel project configuration.
5. Click **Deploy**. Vercel will build and host your app with automatic CI/CD.
