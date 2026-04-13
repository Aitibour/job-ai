import crypto from 'crypto'
import type { JobSource } from '@/lib/types'

export interface RawJob {
  externalId: string
  title: string
  company: string
  location: string
  province: string
  url: string
  description: string
  source: JobSource
  postedAt: string
}

const JOB_TITLES = [
  'IT project manager',
  'IT program manager',
  'senior project manager technology',
  'hospitality technology manager',
  'PMS implementation manager',
  'hotel IT manager',
]

const PROVINCES: Record<string, string> = {
  'Ontario': 'ON',
  'British Columbia': 'BC',
  'Alberta': 'AB',
  'Manitoba': 'MB',
  'Saskatchewan': 'SK',
  'Nova Scotia': 'NS',
  'New Brunswick': 'NB',
  'Newfoundland': 'NL',
  'Prince Edward Island': 'PE',
  'Northwest Territories': 'NT',
  'Nunavut': 'NU',
  'Yukon': 'YT',
}

function detectProvince(location: string): string {
  const loc = location.toUpperCase()
  for (const [name, code] of Object.entries(PROVINCES)) {
    if (loc.includes(name.toUpperCase()) || loc.includes(`, ${code}`)) return code
  }
  return 'CA'
}

function extractText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (!match) return ''
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .trim()
}

function parseItems(rssXml: string): RawJob[] {
  const itemMatches = rssXml.matchAll(/<item>([\s\S]*?)<\/item>/gi)
  const jobs: RawJob[] = []

  for (const match of itemMatches) {
    const item = match[1]
    const title = extractText(item, 'title')
    const url = extractText(item, 'link') || extractText(item, 'guid')
    const description = extractText(item, 'description')
    const pubDate = extractText(item, 'pubDate')
    const location = extractText(item, 'location') || ''

    // Indeed puts "company - location" in the title sometimes
    let company = extractText(item, 'source') || ''
    if (!company) {
      // Try to extract from description
      const compMatch = description.match(/company:\s*([^\n<]+)/i)
      company = compMatch ? compMatch[1].trim() : 'Unknown'
    }

    if (!title || !url) continue

    const externalId = crypto.createHash('md5').update(url).digest('hex')
    const postedAt = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
    const province = detectProvince(location)

    jobs.push({ externalId, title, company, location, province, url, description, source: 'indeed', postedAt })
  }

  return jobs
}

export async function scrapeIndeed(): Promise<RawJob[]> {
  const allJobs: RawJob[] = []
  const seen = new Set<string>()

  for (const query of JOB_TITLES) {
    const encodedQuery = encodeURIComponent(query)
    // Canada-wide, last 1 day
    const url = `https://www.indeed.com/rss?q=${encodedQuery}&l=Canada&fromage=1&sort=date&radius=100`

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; job-ai-bot/1.0)' },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) continue
      const xml = await res.text()
      const jobs = parseItems(xml)

      for (const job of jobs) {
        // Skip Quebec
        const loc = job.location.toLowerCase()
        if (loc.includes('québec') || loc.includes('quebec') || loc.includes(', qc') || job.province === 'QC') continue
        if (!seen.has(job.externalId)) {
          seen.add(job.externalId)
          allJobs.push(job)
        }
      }
    } catch {
      // Continue to next query on error
    }
  }

  return allJobs
}
