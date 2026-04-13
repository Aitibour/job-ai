import crypto from 'crypto'
import type { RawJob } from './indeed'

const APP_ID = process.env.ADZUNA_APP_ID!
const APP_KEY = process.env.ADZUNA_APP_KEY!

// ─── Full job title spectrum: technician → admin → supervisor → manager ───
const SEARCH_TERMS = [
  // Technician / Support (entry–mid)
  'IT technician',
  'IT support technician',
  'desktop support technician',
  'help desk technician',
  'network technician',
  'systems technician',
  'field technician IT',
  'IT support specialist',
  'technical support specialist',
  // Administrator (mid)
  'IT administrator',
  'systems administrator',
  'network administrator',
  'infrastructure administrator',
  'senior systems administrator',
  'cloud administrator',
  // Supervisor / Team Lead (mid-senior)
  'IT supervisor',
  'IT team lead',
  'systems supervisor',
  'technical supervisor',
  // Manager (senior)
  'IT manager',
  'IT project manager',
  'IT program manager',
  'infrastructure manager',
  'systems manager',
  'technology manager',
  'senior IT manager',
  'PMO manager',
  'delivery manager IT',
  'digital transformation manager',
  'hospitality technology manager',
]

// ─── All provinces except QC — major cities + province fallbacks ──────────
const SEARCH_LOCATIONS: { where: string; province: string }[] = [
  // Ontario — high volume
  { where: 'Toronto',        province: 'ON' },
  { where: 'Ottawa',         province: 'ON' },
  { where: 'Mississauga',    province: 'ON' },
  { where: 'Hamilton',       province: 'ON' },
  { where: 'Kitchener',      province: 'ON' },
  // British Columbia
  { where: 'Vancouver',      province: 'BC' },
  { where: 'Victoria',       province: 'BC' },
  { where: 'Kelowna',        province: 'BC' },
  // Alberta
  { where: 'Calgary',        province: 'AB' },
  { where: 'Edmonton',       province: 'AB' },
  // Smaller provinces by name (fewer jobs, one search covers all)
  { where: 'Manitoba',       province: 'MB' },
  { where: 'Saskatchewan',   province: 'SK' },
  { where: 'Nova Scotia',    province: 'NS' },
  { where: 'New Brunswick',  province: 'NB' },
  { where: 'Newfoundland',   province: 'NL' },
  { where: 'Prince Edward Island', province: 'PE' },
  { where: 'Yukon',          province: 'YT' },
]

const PROVINCE_FROM_LOCATION: Record<string, string> = {
  Toronto: 'ON', Ottawa: 'ON', Mississauga: 'ON', Hamilton: 'ON', Kitchener: 'ON',
  Vancouver: 'BC', Victoria: 'BC', Kelowna: 'BC',
  Calgary: 'AB', Edmonton: 'AB',
  Manitoba: 'MB', Saskatchewan: 'SK', 'Nova Scotia': 'NS',
  'New Brunswick': 'NB', Newfoundland: 'NL', 'Prince Edward Island': 'PE', Yukon: 'YT',
}

interface AdzunaJob {
  id: string
  title: string
  company?: { display_name: string }
  location?: { display_name: string; area?: string[] }
  description: string
  redirect_url: string
  created: string
}

function detectProvince(location: string, area?: string[], fallback = 'CA'): string {
  const text = (area?.join(' ') || location).toUpperCase()
  const map: Record<string, string> = {
    'ONTARIO': 'ON', 'BRITISH COLUMBIA': 'BC', 'ALBERTA': 'AB', 'MANITOBA': 'MB',
    'SASKATCHEWAN': 'SK', 'NOVA SCOTIA': 'NS', 'NEW BRUNSWICK': 'NB',
    'NEWFOUNDLAND': 'NL', 'PRINCE EDWARD': 'PE', 'YUKON': 'YT',
    'NORTHWEST': 'NT', 'NUNAVUT': 'NU',
    'TORONTO': 'ON', 'OTTAWA': 'ON', 'MISSISSAUGA': 'ON', 'HAMILTON': 'ON',
    'KITCHENER': 'ON', 'WATERLOO': 'ON', 'LONDON': 'ON', 'BRAMPTON': 'ON',
    'MARKHAM': 'ON', 'BURLINGTON': 'ON', 'WINDSOR': 'ON', 'BARRIE': 'ON',
    'VANCOUVER': 'BC', 'VICTORIA': 'BC', 'KELOWNA': 'BC', 'BURNABY': 'BC',
    'SURREY': 'BC', 'RICHMOND': 'BC', 'ABBOTSFORD': 'BC',
    'CALGARY': 'AB', 'EDMONTON': 'AB', 'RED DEER': 'AB', 'LETHBRIDGE': 'AB',
    'WINNIPEG': 'MB', 'BRANDON': 'MB',
    'SASKATOON': 'SK', 'REGINA': 'SK',
    'HALIFAX': 'NS', 'SYDNEY': 'NS',
    'MONCTON': 'NB', 'FREDERICTON': 'NB', 'SAINT JOHN': 'NB',
    'CHARLOTTETOWN': 'PE',
  }
  for (const [k, v] of Object.entries(map)) if (text.includes(k)) return v
  return fallback
}

function isQuebec(location: string, area?: string[]): boolean {
  const text = (area?.join(' ') || location).toLowerCase()
  return ['québec', 'quebec', 'montréal', 'montreal', 'laval', 'longueuil',
          ', qc', 'québec province'].some(x => text.includes(x))
}

async function fetchAdzuna(term: string, where: string): Promise<AdzunaJob[]> {
  const params = new URLSearchParams({
    app_id: APP_ID,
    app_key: APP_KEY,
    what: term,
    where,
    max_days_old: '3',
    results_per_page: '50',
    sort_by: 'date',
  })
  try {
    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/ca/search/1?${params}`,
      { signal: AbortSignal.timeout(12000) })
    if (!res.ok) return []
    const data = await res.json()
    return data?.results || []
  } catch { return [] }
}

export async function scrapeAdzuna(): Promise<RawJob[]> {
  const seen = new Set<string>()
  const allJobs: RawJob[] = []

  // Fire all in parallel — ~31 terms × 17 locations = ~527 calls, batched
  const tasks = SEARCH_TERMS.flatMap(term =>
    SEARCH_LOCATIONS.map(loc => fetchAdzuna(term, loc.where).then(jobs =>
      jobs.map(j => ({ job: j, provinceFallback: loc.province }))
    ))
  )

  const settled = await Promise.allSettled(tasks)
  const results = settled.flatMap(r => r.status === 'fulfilled' ? r.value : [])

  for (const { job, provinceFallback } of results) {
    const location = job.location?.display_name || ''
    if (isQuebec(location, job.location?.area)) continue

    const externalId = crypto.createHash('md5').update(job.id).digest('hex')
    if (seen.has(externalId)) continue
    seen.add(externalId)

    allJobs.push({
      externalId,
      title: job.title,
      company: job.company?.display_name || 'Unknown',
      location,
      province: detectProvince(location, job.location?.area, provinceFallback),
      url: job.redirect_url,
      description: job.description,
      source: 'other',
      postedAt: job.created ? new Date(job.created).toISOString() : new Date().toISOString(),
    })
  }

  return allJobs
}
