HOSPITALITY_KEYWORDS = [
    'hotel', 'resort', 'motel', 'inn', 'lodge', 'spa', 'casino',
    'marriott', 'hilton', 'ihg', 'hyatt', 'fairmont', 'accor',
    'four seasons', 'wyndham', 'best western', 'intercontinental',
    'sheraton', 'westin', 'mandarin oriental', 'barcelo',
    'opera cloud', 'opera pms', 'simphony', 'micros', 'pms migration',
    'hospitality', 'food and beverage', 'f&b', 'restaurant', 'catering',
    'travel', 'tourism', 'airline', 'airbnb', 'property management',
]

TECH_KEYWORDS = ['software', 'saas', 'startup', 'tech company', 'msp', 'it services', 'cloud provider']
HEALTHCARE_KEYWORDS = ['hospital', 'clinic', 'health', 'medical', 'pharma', 'dental', 'nursing']
FINANCE_KEYWORDS = ['bank', 'insurance', 'financial', 'investment', 'credit union', 'fintech', 'accounting']
REAL_ESTATE_KEYWORDS = ['real estate', 'property', 'reit', 'construction', 'developer', 'cbre', 'jll']
RETAIL_KEYWORDS = ['retail', 'grocery', 'store', 'warehouse', 'logistics', 'supply chain', 'facilities']
GOV_KEYWORDS = ['government', 'municipal', 'federal', 'provincial', 'public sector', 'city of', 'ministry']


def tag_industry(title: str, company: str, description: str) -> str:
    text = f"{title} {company} {description}".lower()
    if any(kw in text for kw in HOSPITALITY_KEYWORDS):
        return 'hospitality'
    if any(kw in text for kw in HEALTHCARE_KEYWORDS):
        return 'healthcare'
    if any(kw in text for kw in FINANCE_KEYWORDS):
        return 'finance'
    if any(kw in text for kw in REAL_ESTATE_KEYWORDS):
        return 'real-estate'
    if any(kw in text for kw in RETAIL_KEYWORDS):
        return 'retail'
    if any(kw in text for kw in GOV_KEYWORDS):
        return 'gov'
    if any(kw in text for kw in TECH_KEYWORDS):
        return 'tech'
    return 'other'
