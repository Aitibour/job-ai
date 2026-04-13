import crypto from 'crypto'
import type { RawJob } from './indeed'

const APP_ID = process.env.ADZUNA_APP_ID!
const APP_KEY = process.env.ADZUNA_APP_KEY!

const SEARCH_TERMS = [
  // Project / Program management
  'IT project manager',
  'IT program manager',
  'senior project manager technology',
  'PMS implementation manager',
  'hospitality technology manager',
  'digital transformation manager',
  'PMO manager',
  'delivery manager IT',
  // Manager level
  'IT manager',
  'senior IT manager',
  'infrastructure manager',
  'systems manager',
  'technology manager',
  // Administrator level
  'IT administrator',
  'systems administrator',
  'infrastructure administrator',
  'network administrator',
  'senior systems administrator',
]

// Target: Ontario, BC, New Brunswick — specific cities for best coverage
const PROVINCE_CITIES: Record<string, string[]> = {
  ON: ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton',
       'Kitchener', 'London Ontario', 'Markham', 'Waterloo', 'Burlington'],
  BC: ['Vancouver', 'Victoria', 'Kelowna', 'Burnaby', 'Surrey', 'Richmond'],
  NB: ['Moncton', 'Fredericton', 'Saint John New Brunswick'],
}

const ALL_CITIES = Object.values(PROVINCE_CITIES).flat()

interface AdzunaJob {
  id: string
  title: string
  company?: { display_name: string }
  location?: { display_name: string; area?: string[] }
  description: string
  redirect_url: string
  created: string
  salary_min?: number
  salary_max?: number
}

function detectProvince(location: string, area?: string[]): string {
  const text = (area?.join(' ') || location).toUpperCase()
  const map: Record<string, string> = {
    'ONTARIO': 'ON', 'BRITISH COLUMBIA': 'BC', 'NEW BRUNSWICK': 'NB',
    'TORONTO': 'ON', 'OTTAWA': 'ON', 'MISSISSAUGA': 'ON', 'BRAMPTON': 'ON',
    'HAMILTON': 'ON', 'KITCHENER': 'ON', 'WATERLOO': 'ON', 'MARKHAM': 'ON',
    'LONDON': 'ON', 'BURLINGTON': 'ON', 'WINDSOR': 'ON', 'BARRIE': 'ON',
    'VANCOUVER': 'BC', 'VICTORIA': 'BC', 'KELOWNA': 'BC', 'BURNABY': 'BC',
    'SURREY': 'BC', 'RICHMOND': 'BC', 'ABBOTSFORD': 'BC', 'COQUITLAM': 'BC',
    'MONCTON': 'NB', 'FREDERICTON': 'NB', 'SAINT JOHN': 'NB', 'DIEPPE': 'NB',
  }
  for (const [k, v] of Object.entries(map)) if (text.includes(k)) return v
  return 'CA'
}

function isExcluded(location: string, area?: string[]): boolean {
  const text = (area?.join(' ') || location).toLowerCase()
  // Keep only ON, BC, NB — exclude everything else
  const excluded = [
    'québec', 'quebec', 'montréal', 'montreal', 'laval', 'longueuil',
    'alberta', 'calgary', 'edmonton', 'manitoba', 'winnipeg',
    'saskatchewan', 'regina', 'saskatoon', 'nova scotia', 'halifax',
    'prince edward', 'newfoundland', 'northwest', 'yukon', 'nunavut',
  ]
  return excluded.some(x => text.includes(x))
}

async function fetchAdzuna(term: string, where: string): Promise<AdzunaJob[]> {
  const params = new URLSearchParams({
    app_id: APP_ID,
    app_key: APP_KEY,
    what: term,
    where,
    max_days_old: '1',
    results_per_page: '50',
    sort_by: 'date',
  })
  try {
    const res = await fetch(
      `https://api.adzuna.com/v1/api/jobs/ca/search/1?${params}`,
      { signal: AbortSignal.timeout(12000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data?.results || []
  } catch {
    return []
  }
}

export async function scrapeAdzuna(): Promise<RawJob[]> {
  const seen = new Set<string>()
  const allJobs: RawJob[] = []

  // Batch all fetches: every search term × every target city
  const tasks: Promise<AdzunaJob[]>[] = []
  for (const term of SEARCH_TERMS) {
    for (const city of ALL_CITIES) {
      tasks.push(fetchAdzuna(term, city))
    }
  }

  const settled = await Promise.allSettled(tasks)
  const results = settled.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  for (const job of results) {
    const location = job.location?.display_name || ''
    if (isExcluded(location, job.location?.area)) continue

    const externalId = crypto.createHash('md5').update(job.id).digest('hex')
    if (seen.has(externalId)) continue
    seen.add(externalId)

    allJobs.push({
      externalId,
      title: job.title,
      company: job.company?.display_name || 'Unknown',
      location,
      province: detectProvince(location, job.location?.area),
      url: job.redirect_url,
      description: job.description,
      source: 'other',
      postedAt: job.created ? new Date(job.created).toISOString() : new Date().toISOString(),
    })
  }

  return allJobs
}
