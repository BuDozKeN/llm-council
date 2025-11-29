# SimpleAF - Business Context

**For LLM Council Decision-Making**

---

## Company Overview

**Simple AF Jobs** is a semantic AI-powered recruitment platform by The Ally Venture. The platform automates candidate screening for recruiters and hiring managers using Claude AI to semantically assess and rank candidates—not through keyword matching, but through reasoning about whether a candidate's profile genuinely matches job requirements.

**Stage:** Late beta / Early revenue (first paying customer: 2025-11-28)
**Funding:** Bootstrapped, funds limited, revenue-critical

---

## What The Platform Does

1. **Captures job requirements** via voice conversation with AI assistant "Alexandra" or document upload
2. **Builds LinkedIn Sales Navigator search strategies** automatically
3. **Semantically assesses and ranks candidates** using Claude AI reasoning
4. **Generates evidence-backed reports** where every recommendation is defensible and traceable

**Key Output:** Ranked candidate shortlists with evidence trails showing exactly why each candidate was recommended or rejected.

---

## Target Market

**Primary Customers:** Small businesses, particularly contingency recruiters who need:
- Fast, affordable screening at volume
- Quality output they can trust without hours of review
- Evidence-based recommendations for client defensibility

**Industries Validated:** Legal, Executive, Finance, Compliance professionals

---

## Pricing & Business Model

- **Price:** $49 USD per analysis
- **Cost:** ~$20 per analysis (fixed $10 + $0.05/candidate, max 200 candidates)
- **Margin:** ~$29 per analysis (~59%)
- **Future:** Subscription tiers planned

---

## Competitive Positioning

| Competitor | Price | Simple AF Advantage |
|------------|-------|---------------------|
| LinkedIn Recruiter + AI | ~$9,000/year | 180x cheaper per search |
| Juicebox | ~$170/month | Better quality output, evidence-based |

**One-Line Differentiator:** Simple AF delivers evidence-based candidate rankings where every recommendation is traceable to job requirements—quality output recruiters can trust at $49 vs $9,000+/year or poor-quality cheap alternatives.

---

## Decision-Making Priorities

When advising Simple AF Jobs, the council should prioritize in this order:

1. **Automation** - Platform must self-run with minimal human intervention
2. **Revenue / Cash Flow** - Recoup expenses, funds are limited
3. **User Acquisition** - Get paying users on the platform
4. **Exit Potential** - Building to sell (long-term)

---

## Non-Negotiables (Sacred Cows)

- **Evidence-based output is mandatory** - Every result must be defensible and traceable to job requirements
- **Quality over speed** - Output must be solid enough that recruiters don't need extensive review
- The "defensibility principle": recommendations must be litigation-proof

---

## Current Constraints & Risks

**Key Bottleneck:** Founder/CTO currently does manual work that should be automated
- Founder built all prompts, QC processes, assessment logic
- Time spent on tasks that shouldn't require founder involvement

**Critical Risk:** Single developer dependency
- One developer in India ($1,000/week)
- Limited visibility into implementation
- If developer leaves, business continuity at risk
- Founder has the "brains" (prompts, logic), developer has the code

**Working On:** Automating manual steps to reduce founder dependency

---

## Technology Context

- **Backend:** Python 3.x
- **Web Interface:** Streamlit
- **Primary LLM:** Claude API
- **Voice Agents:** VAPI
- **AI Assistant Name:** Alexandra

Tech stack choices are NOT constraints—council can suggest alternatives if beneficial.

---

## How The Platform Works (Process Flow)

```
1. JOB BRIEF CAPTURE
   → Voice call with Alexandra OR document upload
   → Gathers: title, location, skills, target companies, exclusions
   → Output: Structured job brief

2. LINKEDIN SEARCH STRATEGY
   → Maps requirements to LinkedIn filters
   → Builds Boolean search
   → Output: Sales Navigator URL

3. CANDIDATE EXPORT
   → Recruiter runs search, downloads up to 200 candidates

4. ALEXANDRA PROFILER (Core AI)
   → Literal checks (location, exclusions, profile quality)
   → Semantic assessment (Claude AI reasoning about matches)
   → Dimensional scoring (0-100% across domain, competencies, experience)
   → Red flag detection (founders, retired, overqualified)
   → Output: Scored/ranked candidates with evidence

5. REPORT DELIVERY
   → QC Report (internal)
   → Client Report (evidence for each match)
   → Client Shortlist (top candidates)
```

**Scoring Bands:**
- 80-100% = STRONG MATCH (recommend)
- 60-79% = GOOD MATCH (consider)
- 40-59% = MODERATE (manual review)
- Below 40% = Exclude

---

## Council Guidance

When making recommendations for Simple AF Jobs:

1. **Be practical** - Startup with limited resources, no time for over-engineering
2. **Prioritize revenue impact** - Will this help get/retain paying customers?
3. **Consider automation** - Does this reduce founder dependency?
4. **Protect quality** - Never compromise the evidence-based output principle
5. **Think exit** - Does this make the company more attractive to acquire?

**Avoid suggesting:**
- Enterprise-scale solutions that don't fit current stage
- Approaches that sacrifice output quality for speed
- High-cost solutions when cheaper alternatives exist
