import crypto from 'crypto'
import type { RawJob } from './indeed'

const APP_ID = process.env.ADZUNA_APP_ID!
const APP_KEY = process.env.ADZUNA_APP_KEY!

// All target job titles — IT PM, Managers, Admins
const SEARCH_TERMS = [
  // Project / Program management
  'IT project manager',
  'IT program manager',
  'senior project manager technology',
  'technology program manager',
  'digital transformation manager',
  'PMS implementation manager',
  'hospitality technology manager',
  'Opera Cloud project manager',
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
  // PMO / governance
  'PMO manager',
  'PMO director',
  'delivery manager IT',
]

// Canadian cities to search (excludes QC)
const LOCATIONS = [
  'Toronto', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa',
  'Winnipeg', 'Hamilton', 'Kitchener', 'Halifax', 'Victoria',
  'Mississauga', 'Brampton', 'Markham', 'London Ontario',
  'Kelowna', 'Saskatoon', 'Regina', 'St. John\'s',
]

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
  const loc = (area?.join(' ') || location).toUpperCase()
  const map: Record<string, string> = {
    'ONTARIO': 'ON', 'BRITISH COLUMBIA': 'BC', 'ALBERTA': 'AB',
    'MANITOBA': 'MB', 'SASKATCHEWAN': 'SK', 'NOVA SCOTIA': 'NS',
    'NEW BRUNSWICK': 'NB', 'NEWFOUNDLAND': 'NL', 'PRINCE EDWARD': 'PE',
    'NORTHWEST': 'NT', 'YUKON': 'YT', 'NUNAVUT': 'NU',
    'TORONTO': 'ON', 'VANCOUVER': 'BC', 'CALGARY': 'AB', 'EDMONTON': 'AB',
    'WINNIPEG': 'MB', 'OTTAWA': 'ON', 'HAMILTON': 'ON', 'KITCHENER': 'ON',
    'HALIFAX': 'NS', 'VICTORIA': 'BC', 'KELOWNA': 'BC', 'MARKHAM': 'ON',
    'MISSISSAUGA': 'ON', 'BRAMPTON': 'ON', 'LONDON': 'ON',
    'SASKATOON': 'SK', 'REGINA': 'SK', 'ST. JOHN': 'NL',
  }
  for (const [key, code] of Object.entries(map)) {
    if (loc.includes(key)) return code
  }
  return 'CA'
}

function isQuebec(location: string, area?: string[]): boolean {
  const text = (area?.join(' ') || location).toLowerCase()
  return (
    text.includes('québec') || text.includes('quebec') || text.includes('montréal') ||
    text.includes('montreal') || text.includes('laval') || text.includes('longueuil') ||
    text.includes(', qc') || text.includes('québec province')
  )
}

// Fetch one Adzuna query with optional location
async function fetchAdzuna(term: string, where?: string): Promise<AdzunaJob[]> {
  const params = new URLSearchParams({
    app_id: APP_ID,
    app_key: APP_KEY,
    what: term,
    max_days_old: '1',
    results_per_page: '50',
    sort_by: 'date',
  })
  if (where) params.set('where', where)
  else params.set('country', 'ca')

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

  // Phase 1: broad Canada-wide searches for each title
  const phase1 = await Promise.allSettled(
    SEARCH_TERMS.map(term => fetchAdzuna(term))
  )

  // Phase 2: city-specific searches for top hospitality titles (catches region-specific postings)
  const hospitalityTerms = ['IT project manager', 'IT manager', 'hospitality technology manager', 'Opera Cloud']
  const phase2 = await Promise.allSettled(
    hospitalityTerms.flatMap(term =>
      LOCATIONS.slice(0, 6).map(city => fetchAdzuna(term, city))
    )
  )

  const allResults = [
    ...phase1.flatMap(r => r.status === 'fulfilled' ? r.value : []),
    ...phase2.flatMap(r => r.status === 'fulfilled' ? r.value : []),
  ]

  for (const job of allResults) {
    const location = job.location?.display_name || ''
    if (isQuebec(location, job.location?.area)) continue

    const externalId = crypto.createHash('md5').update(job.id).digest('hex')
    if (seen.has(externalId)) continue
    seen.add(externalId)

    const province = detectProvince(location, job.location?.area)

    allJobs.push({
      externalId,
      title: job.title,
      company: job.company?.display_name || 'Unknown',
      location,
      province,
      url: job.redirect_url,
      description: job.description,
      source: 'other',
      postedAt: job.created ? new Date(job.created).toISOString() : new Date().toISOString(),
    })
  }

  return allJobs
}
