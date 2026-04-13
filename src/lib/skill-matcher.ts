// Skills extracted from Abdellah's CV — used to score job relevance
const CV_SKILLS = [
  // Certifications
  'pmp', 'servicenow', 'azure', 'az-104', 'vmware', 'vcp', 'mcse', 'ccnp', 'fortinet', 'nse4',
  // Hospitality tech
  'opera cloud', 'opera pms', 'opera', 'simphony', 'micros', 'pms', 'hms', 'oracle hospitality',
  'marriott', 'oracle', 'fidelio', 'key management',
  // PM / PMO
  'project management', 'program management', 'pmo', 'agile', 'waterfall', 'scrum',
  'raid', 'wbs', 'stakeholder', 'vendor management', 'risk management', 'governance',
  'capex', 'opex', 'budget', 'steering committee', 'steerco', 'change management',
  // Tech / Infrastructure
  'cloud migration', 'data center', 'data centre', 'infrastructure', 'network',
  'cybersecurity', 'siem', 'sentinel', 'power bi', 'erp', 'crm', 'integration',
  'microsoft', 'azure', 'vmware', 'esxi', 'virtualisation', 'virtualization',
  // Delivery
  'go-live', 'cutover', 'implementation', 'migration', 'rollout', 'digital transformation',
  'on-time delivery', 'milestone', 'portfolio',
]

const TITLE_KEYWORDS = [
  // Technician / Support
  'it technician', 'it support technician', 'desktop support', 'help desk',
  'helpdesk', 'desktop technician', 'network technician', 'systems technician',
  'it support specialist', 'technical support', 'field technician',
  // Administrator
  'it administrator', 'systems administrator', 'system administrator',
  'network administrator', 'infrastructure administrator',
  'senior systems administrator', 'sysadmin', 'cloud administrator',
  // Supervisor / Lead
  'it supervisor', 'it team lead', 'systems supervisor', 'technical supervisor',
  'it lead', 'team lead technology',
  // Manager / Senior
  'it manager', 'senior it manager', 'infrastructure manager',
  'systems manager', 'technology manager', 'it director',
  'it project manager', 'it program manager', 'senior project manager',
  'senior program manager', 'pmo manager', 'pmo director',
  'delivery manager', 'digital transformation manager',
  'hospitality technology', 'hotel it', 'pms implementation', 'opera',
]

export interface MatchResult {
  score: number
  matchedSkills: string[]
  titleMatch: boolean
  qualifies: boolean   // score >= 50 OR titleMatch
}

export function calculateMatchScore(title: string, description: string): MatchResult {
  const text = `${title} ${description}`.toLowerCase()
  const titleLower = title.toLowerCase()

  // Title similarity — does the job title match Abdellah's target roles?
  const titleMatch = TITLE_KEYWORDS.some(kw => titleLower.includes(kw))

  // Skill coverage — how many CV skills appear in the job description
  const matchedSkills = CV_SKILLS.filter(skill => text.includes(skill))
  const score = Math.min(100, Math.round((matchedSkills.length / CV_SKILLS.length) * 100 * 2.2))
  // ×2.2 so a job hitting ~45% of keywords → 100%, keeps scoring realistic

  const qualifies = score >= 20 || titleMatch

  return { score, matchedSkills, titleMatch, qualifies }
}

export function getScoreColor(score: number): { bg: string; text: string; border: string } {
  if (score >= 80) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/40' }
  if (score >= 60) return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' }
  if (score >= 40) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40' }
  return { bg: 'bg-slate-700/50', text: 'text-slate-400', border: 'border-slate-600' }
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
