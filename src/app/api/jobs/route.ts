import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { calculateMatchScore } from '@/lib/skill-matcher'
import { ApplicationStatus } from '@/lib/types'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as ApplicationStatus | null
  const noFilter = searchParams.get('noFilter') === '1' // bypass for non-new stages

  if (status === 'new') {
    // Last 24 hours only
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('jobs')
      .select('*, applications(*)')
      .gte('found_at', since)
      .order('found_at', { ascending: false })
      .limit(300)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Keep only jobs with no application yet
    const unworked = (data || []).filter(
      (j: any) => !j.applications || j.applications.length === 0
    )

    // Score each job and filter to 50%+ match OR title match
    const scored = unworked
      .map((j: any) => {
        const match = calculateMatchScore(j.title, j.description)
        return { ...j, match_score: match.score, matched_skills: match.matchedSkills, title_match: match.titleMatch, qualifies: match.qualifies }
      })
      .filter((j: any) => j.qualifies)
      .sort((a: any, b: any) => {
        // Hospitality first, then by score, then by recency
        if (a.industry === 'hospitality' && b.industry !== 'hospitality') return -1
        if (b.industry === 'hospitality' && a.industry !== 'hospitality') return 1
        return b.match_score - a.match_score
      })

    return NextResponse.json(scored)
  }

  // For pipeline stages (tailoring, review, applied etc.) — show all
  const { data, error } = await supabase
    .from('applications')
    .select('*, job:jobs(*)')
    .eq('status', status || 'new')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = (data || []).map((app: any) => {
    if (!app.job) return app
    const match = calculateMatchScore(app.job.title, app.job.description)
    return { ...app, match_score: match.score, matched_skills: match.matchedSkills }
  })

  // Hospitality first
  enriched.sort((a: any, b: any) => {
    if (a.job?.industry === 'hospitality' && b.job?.industry !== 'hospitality') return -1
    if (b.job?.industry === 'hospitality' && a.job?.industry !== 'hospitality') return 1
    return (b.match_score || 0) - (a.match_score || 0)
  })

  return NextResponse.json(enriched)
}
