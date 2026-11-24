# Stride

A free opportunity discovery platform for Pakistani university students. Stride brings scholarships, internships, competitions, hackathons, fellowships, research positions, and programs into one searchable place, so students don't have to hunt across scattered pages and social media posts.

**Live site:** [https://YOUR-LIVE-URL](https://YOUR-LIVE-URL)

## Features

- **Browse and filter** opportunities by type, city, and deadline, with server-side pagination and URL-based filters you can share or bookmark
- **Search** with debounced input across titles and organizations
- **Featured and latest** opportunities on the landing page, pulled live from the database
- **Save opportunities** and track each one through saved, applied, finalist, won, or rejected, with private notes
- **Deadline alerts** for saved opportunities closing within seven days
- **Accounts** with email sign-up, password reset, change password, and account deletion
- **Submit an opportunity** for organizations and students who want to contribute listings
- **Contact form** for feedback and partnership inquiries
- **Admin panel** for reviewing and managing listings
- **Automatic cleanup** of expired opportunities after a seven-day grace period

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Supabase (PostgreSQL, Auth, Row Level Security, Edge Functions, `pg_cron`) |
| Forms | Formspree |
| Analytics | Google Analytics |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 18 or later
- A Supabase project
- A Formspree form (for the contact page)

### Installation

```bash
git clone https://github.com/Hooriya31/<repo-name>.git
cd <repo-name>
npm install
```

### Environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_KEY=your_supabase_anon_key
VITE_FORMSPREE_ID=your_formspree_form_id
VITE_GA_ID=your_google_analytics_measurement_id
```

### Run locally

```bash
npm run dev
```

The app runs at `http://localhost:5173` by default.

### Build for production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
  components/    Reusable UI components
  context/       Auth and saved-opportunities state
  pages/         Route-level pages (Auth, Account, Saved, Contact, Admin)
  lib/           Supabase client and helpers
public/          Static assets, icons, robots.txt, sitemap.xml
```

## Security

- Row Level Security is enabled on all user-facing tables
- Admin access is verified against an `admins` table
- Account deletion runs through a Supabase Edge Function using a service-role client
- Never commit your `.env` file or any service-role key

## Roadmap

- Custom domain and branded email
- Scraper for Pakistani opportunity sources
- Featured listings for organizations

## Contact

Questions, feedback, or listings to share: stride.pak@gmail.com

## Author

Built by [Hooriya](https://www.linkedin.com/in/hooriya-ahmad-ha31) ([@Hooriya31](https://github.com/Hooriya31)).
