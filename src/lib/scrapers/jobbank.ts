import crypto from 'crypto'
import type { RawJob } from './indeed'

const SEARCH_TERMS = [
  'IT project manager',
  'program manager technology',
  'hospitality technology',
  'hotel IT',
  'PMS implementation',
]

// Province codes to search (excluding QC)
const PROVINCES = ['ON', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'NT', 'YT']

interface JobBankResult {
  title: string
  business: { operating_name?: string } | string
  location: { city?: string; province?: string }
  noc?: string
  date_posted?: string
  job_id?: string
  apply_url?: string
}

export async function scrapeJobBank(): Promise<RawJob[]> {
  const allJobs: RawJob[] = []
  const seen = new Set<string>()

  for (const term of SEARCH_TERMS) {
    for (const province of PROVINCES) {
      const params = new URLSearchParams({
        searchstring: term,
        locationstring: province,
        period: '1',  // last 24 hours
        sort: 'M',    // most recent
        pgm: 'employment',
        fmt: 'json',
      })

      try {
        const res = await fetch(`https://www.jobbank.gc.ca/jobsearch/jobsearch?${params}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; job-ai-bot/1.0)',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) continue
        const data = await res.json()

        const results: JobBankResult[] = data?.results || data?.jobs || []
        for (const job of results) {
          const title = job.title || ''
          const company = typeof job.business === 'string'
            ? job.business
            : job.business?.operating_name || 'Unknown'
          const city = job.location?.city || ''
          const prov = job.location?.province || province
          const location = city ? `${city}, ${prov}` : prov
          const jobId = job.job_id || job.noc || ''
          const url = job.apply_url || `https://www.jobbank.gc.ca/jobsearch/jobposting/${jobId}`
          const postedAt = job.date_posted ? new Date(job.date_posted).toISOString() : new Date().toISOString()

          if (!title || !url) continue
          const externalId = crypto.createHash('md5').update(url).digest('hex')
          if (seen.has(externalId)) continue
          seen.add(externalId)

          allJobs.push({
            externalId,
            title,
            company,
            location,
            province: prov,
            url,
            description: `${title} at ${company} in ${location}`,
            source: 'jobbank',
            postedAt,
          })
        }
      } catch {
        // Continue on error
      }
    }
  }

  return allJobs
}
