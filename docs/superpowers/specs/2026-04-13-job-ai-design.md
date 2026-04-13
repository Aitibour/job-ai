# Job AI — Design Spec
**Date:** 2026-04-13  
**Status:** Approved  

---

## Context

Abdellah Ait Ibour is a Senior IT Project/Program Manager (PMP, 10 years) based in Toronto, ON, specializing in hospitality technology (Oracle OPERA Cloud, Simphony POS, IT PMO). He needs a 24/7 automated job search system that:

- Finds the latest IT/PM job postings in Canada (excluding Quebec) across all major job boards
- Prioritizes hospitality industry roles but covers all related industries
- Rewrites his CV per job description in a humanized, ATS-aligned style (no dashes/bullets)
- Gives him a dashboard to review tailored CVs, apply manually, and track all applications
- Stores a frozen copy of every CV sent + the job description it was tailored against, so he can review and improve over time

---

## Architecture

**Stack:** GitHub Actions + Python (scraper) · Supabase PostgreSQL (database + storage) · Next.js on Vercel (dashboard) · Claude API Sonnet 4.6 (CV tailoring)

```
Job Sites → GitHub Actions (Python + JobSpy) → Supabase → Next.js Dashboard → Claude API
                every 2h, Canada excl. QC              ⇄        ↓
                last 24h only                               PDF output
```

### Layer 1 — Job Sources (via JobSpy, free open-source)
LinkedIn, Indeed, Glassdoor, ZipRecruiter, Job Bank (direct scrape). Additional boards (Workopolis, Eluta, Monster, SimplyHired, Talent.com) covered where JobSpy supports or via RSS/direct scrape.

### Layer 2 — Scraper (GitHub Actions)
- Runs every 2 hours via GitHub Actions cron
- Python script using `JobSpy` library
- Searches all provinces except Quebec (ON, BC, AB, MB, SK, NS, NB, PE, NL)
- Filters to last 24 hours only (`hours_old=24`)
- Deduplicates by `external_id` before inserting to Supabase
- Auto-tags each job with `industry` (hospitality | tech | healthcare | finance | real-estate | retail | gov | other)
- Hospitality detection: company name or JD contains hotel, resort, casino, Marriott, Hilton, IHG, Hyatt, Fairmont, Accor, OPERA, Simphony, etc.

### Layer 3 — Database (Supabase)

**`jobs` table**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| title | text | |
| company | text | |
| location | text | |
| province | text | |
| source | text | linkedin\|indeed\|glassdoor\|ziprecruiter\|jobbank\|other |
| url | text | Direct apply URL |
| description | text | Full job description text |
| industry | text | hospitality\|tech\|healthcare\|finance\|real-estate\|retail\|gov\|other |
| posted_at | timestamptz | When job was posted |
| found_at | timestamptz | When our scraper found it |
| external_id | text UNIQUE | Source-specific ID for deduplication |

**`applications` table**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| job_id | uuid FK → jobs.id | |
| status | text | new\|tailoring\|review\|applied\|interview\|rejected |
| applied_at | timestamptz | Set when user clicks "Mark Applied" |
| notes | text | User notes on the application |
| created_at | timestamptz | |

**`cv_versions` table**
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| job_id | uuid FK → jobs.id | |
| cv_content | text | Humanized prose CV (no dashes) |
| pdf_url | text | Supabase Storage URL of generated PDF |
| jd_snapshot | text | Full job description text frozen at time of tailoring |
| jd_pdf_url | text | Supabase Storage URL of job description PDF (optional) |
| ats_score | int | 0–100 ATS alignment score returned by Claude |
| keywords_matched | text[] | Keywords from JD found in tailored CV |
| version | int | 1, 2, 3… allows re-tailoring and comparison |
| created_at | timestamptz | |

### Layer 4 — Dashboard (Next.js on Vercel)

**Pipeline C layout** — sidebar pipeline stages + job detail panel

Sidebar stages (with count badges):
- **New** — scraped, not yet actioned
- **CV Tailoring** — Claude is currently rewriting
- **Review** — tailored CV ready, awaiting user approval
- **Applied** — user clicked Apply, date + company logged
- **Interview** — user got a response
- **Rejected** — closed out

Job detail panel shows:
- Company, title, location, source, posted date, found date
- Industry tag (🏨 Hospitality badge shown prominently if applicable)
- ATS score badge
- Tabs: **CV Sent** · **Job Description** · **Side by Side** · **Improve CV →**
- CV Sent tab: humanized prose, download PDF button, re-tailor button (creates v2)
- Job Description tab: frozen JD snapshot saved at tailoring time
- Side by Side tab: CV and JD in two columns for manual comparison
- Improve CV: triggers a new Claude call with v(n+1), user can add notes/instructions

Application log (bottom or separate tab):
| Company | Job Title | Source | Found | Applied | Status |
Sortable, filterable by industry/status/province.

**Hospitality-first sorting:** Jobs tagged `hospitality` always appear at the top of every pipeline stage.

### Layer 5 — CV Tailoring (Claude API)

**Trigger:** User clicks "Tailor CV" on any job in the dashboard.

**Prompt behaviour:**
1. Receives: base CV (Abdellah's full resume) + job description
2. Rewrites in **humanized prose** — no bullet points, no dashes, confident past-tense sentences that combine related achievements into flowing paragraphs
3. Leads with impact numbers naturally woven in (95% on-time delivery, zero outages, 90% OPEX reduction)
4. For **hospitality roles**: leads with OPERA Cloud migrations, Marriott/Barcelo/Mandarin Oriental experience, go-live track record
5. For **non-hospitality roles**: leads with PMP, PMO governance, infrastructure credentials, Azure/VMware/Cisco expertise
6. Returns: tailored CV text + ATS score (0–100) + list of matched keywords
7. CV text, PDF, ATS score, keywords, and full JD snapshot saved together in `cv_versions`

**PDF generation:** react-pdf renders the humanized CV into a clean 2-page PDF. Stored in Supabase Storage.

---

## Search Parameters

**Job titles searched (all runs):**
IT Manager, IT Director, Project Manager IT, Program Manager, IT Operations Manager, IT Operations, System Administrator, Network Administrator, PMO Manager, IT Infrastructure Manager, Network Engineer, IT Support Manager, Administrateur Réseau, Administrateur Système

**Provinces:** ON, BC, AB, MB, SK, NS, NB, PE, NL (Quebec excluded)

**Time window:** Last 24 hours only (`hours_old=24`)

**Industry priority:**
1. Hospitality (Hotels, Resorts, Casino/Gaming, Food & Beverage, Travel & Tourism, Property Management)
2. Real Estate, Healthcare, Retail/Facilities, Tech/MSP, Finance/Banking, Government/Public Sector

---

## Key Constraints

- **Semi-automated only** — system finds and tailors, user decides to apply
- **No auto-submit** — "Apply" button opens the job URL; user submits manually
- **Humanized CV** — no dashes, no bullet points, flowing prose paragraphs
- **Full audit trail** — every cv_versions row stores both the CV sent AND the JD it was tailored against, with a version number
- **Free tier** — GitHub Actions (2000 min/mo free), Supabase (free tier), Vercel (free tier), Claude API (~$0.03/CV)

---

## Verification

1. **Scraper:** Trigger GitHub Actions workflow manually → confirm new rows appear in Supabase `jobs` table with correct province, industry tag, and `posted_at` within last 24h
2. **Deduplication:** Run scraper twice → confirm no duplicate `external_id` rows
3. **CV tailoring:** Click "Tailor CV" on a job → confirm `cv_versions` row created with `cv_content` (prose, no dashes), `ats_score`, `keywords_matched`, `jd_snapshot` all populated
4. **PDF:** Confirm PDF URL resolves and document contains humanized prose
5. **Pipeline:** Change application status → confirm sidebar count updates and job moves to correct stage
6. **Hospitality sort:** Mix of hospitality and non-hospitality jobs → confirm hospitality jobs appear first in each stage
7. **Application log:** Mark a job as Applied → confirm `applied_at` timestamp recorded, row appears in log with company + job title + source + date
8. **Side-by-side review:** Open a past application → confirm CV Sent tab shows frozen CV prose, Job Description tab shows frozen JD snapshot
9. **Re-tailor (v2):** Click "Improve CV" with notes → confirm new `cv_versions` row with `version=2` created alongside original `version=1`
