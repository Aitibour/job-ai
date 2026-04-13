export const BASE_CV = `
ABDELLAH AIT IBOUR
Senior Program and Project Manager | IT Hospitality Technology
Toronto, ON | +1 438 795 9488 | a.aitibour@mail.com

PROFESSIONAL SUMMARY
Ten years running technology programs for hotels, the kind where a bad go-live means guests cannot check in at 2 a.m. I have migrated Oracle OPERA Cloud and Simphony POS across 20+ properties in three countries, replaced an HMS platform at a 158-key luxury resort, and led Marriott's post-merger Starwood technology cutover across Morocco. I build PMOs where none existed, govern multi-million-dollar budgets, and deliver on time. 95% on-time delivery. Zero revenue-impacting outages at any go-live. 90% OPEX reduction from a data centre I rebuilt from scratch.

CERTIFICATIONS
PMP · ServiceNow CSA · ServiceNow ITSM · AZ-104 Microsoft Azure Administrator · NSE4 Fortinet Network Security Expert · VCP VMware Certified Professional · MCSE · CCNP Cisco Certified Network Professional

EXPERIENCE

Senior IT Project and Program Manager | Hippowize | Nov 2025–Present | Toronto, ON
Built the project governance framework from the ground up including charters, WBS, RAID logs, and a SteerCo reporting cadence that cut ad-hoc status requests by 60%. Achieved 92% on-time delivery across concurrent technology programs using a hybrid Agile and Waterfall model, reducing critical risk exposure by 35% through bi-weekly RAID reviews. Designed Power BI executive dashboards improving leadership confidence scores by 40%. Managed three external vendor relationships simultaneously without a single missed contractual milestone.

IT PMO, Project and Program Manager | Barcelo Hotel Group | Jan 2024–Nov 2025 | North Africa (3 Countries)
Directed the Oracle OPERA Cloud PMS migration across 20+ properties in Morocco, Algeria, and Tunisia, moving the full portfolio off Opera v5 with zero guest-impacting outages. Led the Oracle Simphony POS Cloud migration in parallel, integrating with PMS, kitchen display, and reporting systems across all properties. Delivered a group-wide cybersecurity audit including SIEM deployment using Microsoft Sentinel, reducing security incidents by 30%. Built the enterprise PMO from scratch, governing 16+ concurrent IT projects at 95% on-time delivery with CAPEX/OPEX variance reporting to the regional CTO. Renegotiated vendor contracts, cutting IT spend by 15% without impacting service levels.

Senior Project Manager | Mandarin Oriental | Dec 2021–Dec 2023 | Marrakech, Morocco
Led the HMS migration at the Mandarin Oriental Marrakech, a 158-key resort across 20 hectares, reconnecting every operational interface across the property. Migrated the Key Management System across all 158 rooms, improving system uptime to 98%. Rebuilt the data centre by replacing on-premise servers with a VMware ESXi virtualised environment, cutting hardware failures by 30% and OPEX by 90%. Managed five concurrent projects under a shared CAPEX budget, achieving 12% spend optimisation and 25% improvement in delivery predictability.

IT Program Manager | M7 Services | Jan 2020–Dec 2021 | Houston, TX (Remote)
Managed cloud migration and enterprise system upgrade programs across distributed sites, cutting system downtime by 30%. Delivered every program 10% under budget through disciplined CAPEX and OPEX controls. Coordinated multi-site IT teams across time zones at 95% milestone completion. Built IT governance and risk frameworks that reduced incidents by 25%.

IT Project Manager | Marriott International | Nov 2017–Sep 2019 | Marrakech and Fez, Morocco
Led the full technology cutover covering Opera PMS, Simphony POS, hardware, CRM, and ancillary systems across all Morocco properties following the Starwood merger. Achieved GPNS certification for all Marriott Morocco properties. Delivered all projects 20% ahead of plan and cut operational costs by 12%.

IT Project Manager | Golden Tulip Hotels | 2015–Nov 2017 | Morocco
Led Oracle OPERA PMS Cloud migration and Simphony POS Cloud rollout across the Golden Tulip Morocco portfolio with zero outages. Rebuilt data centre with VMware ESXi virtualisation, cutting failures and OPEX by 90%. Upgraded full network stack across all properties.

EDUCATION
M.Sc. Systems, Networks and Information Security Engineering — FST Settat, Morocco (2013–2016)
Diploma Networks and Computer Systems — ISTA NTIC Safi (2011–2013)
`

export function buildTailorPrompt(jobDescription: string, isHospitality: boolean): string {
  return `You are an expert CV writer. Rewrite the candidate's CV specifically tailored to the job description below.

RULES — follow all of them strictly:
1. Write in confident, first-person implied past tense (no "I" needed, just "Directed...", "Built...", "Led...")
2. NO bullet points. NO dashes. NO hyphens as list markers. Write flowing prose paragraphs only.
3. Combine related achievements into single compelling sentences with numbers woven in naturally.
4. Lead with impact metrics (%, $, time saved) — never bury them at the end.
5. Match keywords from the job description naturally throughout — do not keyword-stuff.
6. Keep the CV to 2 pages worth of content. Be selective — include only what is most relevant to THIS role.
7. Do not invent or exaggerate anything. Rephrase only.
${isHospitality ? `8. HOSPITALITY ROLE: Lead the experience section with Oracle OPERA Cloud migrations, Marriott/Barcelo/Mandarin Oriental track record, and zero-downtime go-lives. These are the most relevant credentials.` : `8. NON-HOSPITALITY ROLE: Lead with PMP, PMO governance, IT infrastructure, Azure/VMware/Cisco/Fortinet credentials. Hospitality context can be mentioned as scale/complexity evidence but should not dominate.`}

OUTPUT FORMAT — return a JSON object with exactly these fields:
{
  "cv_content": "The full tailored CV as flowing prose (no dashes, no bullets). Use \\n\\n between sections.",
  "ats_score": <integer 0-100 representing how well the CV aligns with the job description>,
  "keywords_matched": ["keyword1", "keyword2", ...]
}

---
CANDIDATE'S BASE CV:
${BASE_CV}

---
JOB DESCRIPTION:
${jobDescription}
`
}
