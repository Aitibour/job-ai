import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { tagIndustry } from '@/lib/scrapers/industry-tagger'
import { scrapeIndeed } from '@/lib/scrapers/indeed'
import { scrapeJobBank } from '@/lib/scrapers/jobbank'

export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  let inserted = 0
  let skipped = 0
  const errors: string[] = []

  try {
    const [indeedJobs, jobbankJobs] = await Promise.allSettled([
      scrapeIndeed(),
      scrapeJobBank(),
    ])

    const allJobs = [
      ...(indeedJobs.status === 'fulfilled' ? indeedJobs.value : []),
      ...(jobbankJobs.status === 'fulfilled' ? jobbankJobs.value : []),
    ]

    if (indeedJobs.status === 'rejected') errors.push(`Indeed: ${indeedJobs.reason}`)
    if (jobbankJobs.status === 'rejected') errors.push(`JobBank: ${jobbankJobs.reason}`)

    for (const job of allJobs) {
      const industry = tagIndustry(job.title, job.company, job.description)

      const { error } = await supabase
        .from('jobs')
        .insert({
          title: job.title,
          company: job.company,
          location: job.location,
          province: job.province,
          source: job.source,
          url: job.url,
          description: job.description,
          industry,
          posted_at: job.postedAt,
          found_at: new Date().toISOString(),
          external_id: job.externalId,
        })

      if (error) {
        if (error.code === '23505') {
          // Duplicate external_id — expected
          skipped++
        } else {
          errors.push(`Insert error: ${error.message}`)
        }
      } else {
        inserted++
      }
    }

    return NextResponse.json({
      status: 'ok',
      total: allJobs.length,
      inserted,
      skipped,
      errors: errors.length ? errors : undefined,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
