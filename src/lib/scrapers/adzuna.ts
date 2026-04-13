import crypto from 'crypto'
import type { RawJob } from './indeed'

const APP_ID = process.env.ADZUNA_APP_ID!
const APP_KEY = process.env.ADZUNA_APP_KEY!

const SEARCH_TERMS = [
  'IT project manager',
  'IT program manager',
  'senior project manager technology',
  'hospitality technology manager',
  'hotel IT manager',
  'PMS implementation manager',
  'Opera Cloud project manager',
  'technology project manager',
]

interface AdzunaJob {
  id: string
  title: string
  company?: { display_name: string }
  location?: { display_name: string; area?: string[] }
  description: string
  redirect_url: string
  created: string
}

function detectProvince(location: string): string {
  const loc = location.toUpperCase()
  const map: Record<string, string> = {
    'ONTARIO': 'ON', 'BRITISH COLUMBIA': 'BC', 'ALBERTA': 'AB',
    'MANITOBA': 'MB', 'SASKATCHEWAN': 'SK', 'NOVA SCOTIA': 'NS',
    'NEW BRUNSWICK': 'NB', 'NEWFOUNDLAND': 'NL', 'PRINCE EDWARD': 'PE',
    ', ON': 'ON', ', BC': 'BC', ', AB': 'AB', ', MB': 'MB',
    ', SK': 'SK', ', NS': 'NS', ', NB': 'NB', ', NL': 'NL',
    'TORONTO': 'ON', 'VANCOUVER': 'BC', 'CALGARY': 'AB', 'EDMONTON': 'AB',
    'WINNIPEG': 'MB', 'OTTAWA': 'ON', 'HAMILTON': 'ON', 'KITCHENER': 'ON',
    'HALIFAX': 'NS', 'VICTORIA': 'BC', 'KELOWNA': 'BC',
  }
  for (const [key, code] of Object.entries(map)) {
    if (loc.includes(key)) return code
  }
  return 'CA'
}

export async function scrapeAdzuna(): Promise<RawJob[]> {
  const allJobs: RawJob[] = []
  const seen = new Set<string>()

  for (const term of SEARCH_TERMS) {
    const params = new URLSearchParams({
      app_id: APP_ID,
      app_key: APP_KEY,
      what: term,
      where: 'canada',
      max_days_old: '1',
      results_per_page: '50',
      sort_by: 'date',
    })

    try {
      const res = await fetch(
        `https://api.adzuna.com/v1/api/jobs/ca/search/1?${params}`,
        { signal: AbortSignal.timeout(15000) }
      )
      if (!res.ok) continue

      const data = await res.json()
      const results: AdzunaJob[] = data?.results || []

      for (const job of results) {
        const location = job.location?.display_name || ''

        // Skip Quebec
        const loc = location.toLowerCase()
        if (
          loc.includes('québec') || loc.includes('quebec') ||
          loc.includes(', qc') || loc.includes('montreal') ||
          loc.includes('montréal') || loc.includes('laval')
        ) continue

        const province = detectProvince(location)
        const externalId = crypto.createHash('md5').update(job.id).digest('hex')
        if (seen.has(externalId)) continue
        seen.add(externalId)

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
    } catch {
      // Continue on error
    }
  }

  return allJobs
}
