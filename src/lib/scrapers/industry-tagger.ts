import type { Industry } from '@/lib/types'

const HOSPITALITY = ['hotel', 'resort', 'motel', 'inn', 'lodge', 'spa', 'casino',
  'marriott', 'hilton', 'ihg', 'hyatt', 'fairmont', 'accor', 'four seasons',
  'wyndham', 'best western', 'intercontinental', 'sheraton', 'westin',
  'mandarin oriental', 'opera cloud', 'opera pms', 'simphony', 'micros',
  'pms migration', 'hospitality', 'food and beverage', 'f&b', 'restaurant',
  'catering', 'travel', 'tourism', 'airline', 'airbnb', 'property management']
const HEALTHCARE = ['hospital', 'clinic', 'health', 'medical', 'pharma', 'dental', 'nursing']
const FINANCE = ['bank', 'insurance', 'financial', 'investment', 'credit union', 'fintech', 'accounting']
const REAL_ESTATE = ['real estate', 'reit', 'construction', 'developer', 'cbre', 'jll']
const RETAIL = ['retail', 'grocery', 'store', 'warehouse', 'logistics', 'supply chain', 'facilities']
const GOV = ['government', 'municipal', 'federal', 'provincial', 'public sector', 'city of', 'ministry']
const TECH = ['software', 'saas', 'startup', 'tech company', 'msp', 'it services', 'cloud provider']

export function tagIndustry(title: string, company: string, description: string): Industry {
  const text = `${title} ${company} ${description}`.toLowerCase()
  if (HOSPITALITY.some(kw => text.includes(kw))) return 'hospitality'
  if (HEALTHCARE.some(kw => text.includes(kw))) return 'healthcare'
  if (FINANCE.some(kw => text.includes(kw))) return 'finance'
  if (REAL_ESTATE.some(kw => text.includes(kw))) return 'real-estate'
  if (RETAIL.some(kw => text.includes(kw))) return 'retail'
  if (GOV.some(kw => text.includes(kw))) return 'gov'
  if (TECH.some(kw => text.includes(kw))) return 'tech'
  return 'other'
}
