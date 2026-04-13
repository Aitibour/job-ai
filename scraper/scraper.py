import os
import hashlib
from datetime import datetime, timezone
from dotenv import load_dotenv
from jobspy import scrape_jobs
from supabase import create_client, Client
from industry_tagger import tag_industry

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# All provinces except Quebec
LOCATIONS = [
    "Toronto, Ontario", "Vancouver, British Columbia", "Calgary, Alberta",
    "Edmonton, Alberta", "Winnipeg, Manitoba", "Saskatoon, Saskatchewan",
    "Halifax, Nova Scotia", "Fredericton, New Brunswick",
    "Charlottetown, Prince Edward Island", "St. John's, Newfoundland",
]

JOB_TITLES = [
    "IT Manager", "IT Director", "Project Manager IT", "Program Manager IT",
    "IT Operations Manager", "System Administrator", "Network Administrator",
    "PMO Manager", "IT Infrastructure Manager", "IT Support Manager",
    "Network Engineer", "Administrateur Reseau",
]

def make_external_id(source: str, job_id: str) -> str:
    raw = f"{source}:{job_id}"
    return hashlib.md5(raw.encode()).hexdigest()

def scrape_and_insert():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    inserted = 0
    skipped = 0

    for location in LOCATIONS:
        for title in JOB_TITLES:
            print(f"Scraping: {title} in {location}")
            try:
                jobs = scrape_jobs(
                    site_name=["linkedin", "indeed", "glassdoor", "zip_recruiter"],
                    search_term=title,
                    location=location,
                    results_wanted=20,
                    hours_old=24,
                    country_indeed="Canada",
                )
            except Exception as e:
                print(f"  Error scraping {title} / {location}: {e}")
                continue

            for _, row in jobs.iterrows():
                job_id_raw = str(row.get("id", "")) or f"{row.get('title','')}_{row.get('company','')}"
                external_id = make_external_id(str(row.get("site", "other")), job_id_raw)

                description = str(row.get("description", "") or "")
                title_val = str(row.get("title", "") or "")
                company_val = str(row.get("company", "") or "")
                industry = tag_industry(title_val, company_val, description)

                # Parse province from location
                loc_str = str(row.get("location", location))
                province = location.split(",")[1].strip() if "," in location else "Ontario"

                record = {
                    "title": title_val,
                    "company": company_val,
                    "location": loc_str,
                    "province": province,
                    "source": str(row.get("site", "other")),
                    "url": str(row.get("job_url", "") or ""),
                    "description": description[:50000],  # cap at 50k chars
                    "industry": industry,
                    "posted_at": str(row.get("date_posted") or datetime.now(timezone.utc).isoformat()),
                    "external_id": external_id,
                }

                try:
                    supabase.table("jobs").insert(record).execute()
                    inserted += 1
                except Exception:
                    skipped += 1  # duplicate external_id — expected

    print(f"Done. Inserted: {inserted}, Skipped (duplicates): {skipped}")

if __name__ == "__main__":
    scrape_and_insert()
