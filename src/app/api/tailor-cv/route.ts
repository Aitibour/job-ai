import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase-server'
import { buildTailorPrompt } from './prompt'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { job_id } = await req.json()

  if (!job_id) return NextResponse.json({ error: 'job_id required' }, { status: 400 })

  // 1. Fetch job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', job_id)
    .single()

  if (jobError || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // 2. Set application status to 'tailoring'
  await supabase
    .from('applications')
    .update({ status: 'tailoring' })
    .eq('job_id', job_id)

  // 3. Get next version number
  const { data: existing } = await supabase
    .from('cv_versions')
    .select('version')
    .eq('job_id', job_id)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1
  const isHospitality = job.industry === 'hospitality'

  // 4. Call GPT-4o-mini
  let parsed: { cv_content: string; ats_score: number; keywords_matched: string[] }
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: buildTailorPrompt(job.description, isHospitality),
        },
      ],
    })

    const text = completion.choices[0]?.message?.content || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in OpenAI response')
    parsed = JSON.parse(jsonMatch[0])
  } catch (err: any) {
    await supabase.from('applications').update({ status: 'new' }).eq('job_id', job_id)
    return NextResponse.json({ error: `OpenAI error: ${err.message}` }, { status: 500 })
  }

  // 5. Save cv_version
  const { data: cvVersion, error: cvError } = await supabase
    .from('cv_versions')
    .insert({
      job_id,
      cv_content: parsed.cv_content,
      jd_snapshot: job.description,
      ats_score: parsed.ats_score,
      keywords_matched: parsed.keywords_matched,
      version: nextVersion,
    })
    .select()
    .single()

  if (cvError) return NextResponse.json({ error: cvError.message }, { status: 500 })

  // 6. Set application status to 'review'
  await supabase.from('applications').update({ status: 'review' }).eq('job_id', job_id)

  return NextResponse.json(cvVersion)
}
