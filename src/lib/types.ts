export type Industry =
  | 'hospitality'
  | 'tech'
  | 'healthcare'
  | 'finance'
  | 'real-estate'
  | 'retail'
  | 'gov'
  | 'other'

export type JobSource =
  | 'linkedin'
  | 'indeed'
  | 'glassdoor'
  | 'ziprecruiter'
  | 'jobbank'
  | 'other'

export type ApplicationStatus =
  | 'new'
  | 'tailoring'
  | 'review'
  | 'applied'
  | 'interview'
  | 'rejected'

export interface Job {
  id: string
  title: string
  company: string
  location: string
  province: string
  source: JobSource
  url: string
  description: string
  industry: Industry
  posted_at: string
  found_at: string
  external_id: string
}

export interface Application {
  id: string
  job_id: string
  status: ApplicationStatus
  applied_at: string | null
  notes: string | null
  created_at: string
  job?: Job
}

export interface CvVersion {
  id: string
  job_id: string
  cv_content: string
  pdf_url: string | null
  jd_snapshot: string
  jd_pdf_url: string | null
  ats_score: number
  keywords_matched: string[]
  version: number
  created_at: string
}
