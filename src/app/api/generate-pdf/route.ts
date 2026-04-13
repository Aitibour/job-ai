import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { CvDocument } from '@/lib/CvDocument'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { cv_version_id } = await req.json()

  if (!cv_version_id) return NextResponse.json({ error: 'cv_version_id required' }, { status: 400 })

  const { data: cvVersion, error } = await supabase
    .from('cv_versions')
    .select('*')
    .eq('id', cv_version_id)
    .single()

  if (error || !cvVersion) return NextResponse.json({ error: 'CV version not found' }, { status: 404 })

  // Generate PDF buffer
  const buffer = await renderToBuffer(
    createElement(CvDocument, { cvContent: cvVersion.cv_content })
  )

  // Upload to Supabase Storage
  const filename = `cv_${cv_version_id}_v${cvVersion.version}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('cv-pdfs')
    .upload(filename, buffer, { contentType: 'application/pdf', upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('cv-pdfs')
    .getPublicUrl(filename)

  // Save pdf_url to cv_versions
  await supabase
    .from('cv_versions')
    .update({ pdf_url: publicUrl })
    .eq('id', cv_version_id)

  return NextResponse.json({ pdf_url: publicUrl })
}
