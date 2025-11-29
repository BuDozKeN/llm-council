# SimpleAF - Business Context

**For LLM Council Decision-Making**
**Last Updated:** 2025-11-29

---

## Company Overview

**Platform Name:** Simple AF Jobs
**Organization:** The Ally Venture
**Product:** Alexandra Copilot (AC)
**AI Assistant:** Alexandra

**Simple AF Jobs** is a semantic AI-powered recruitment platform that automates candidate screening for recruiters and hiring managers. It captures job requirements through voice conversations with an AI assistant (Alexandra) or document upload, automatically builds LinkedIn Sales Navigator search strategies, and then uses Claude AI to semantically assess and rank every candidate—not through keyword matching, but through reasoning about whether a candidate's profile evidence genuinely matches the job requirements. The platform generates evidence-backed shortlists and client reports where every recommendation is defensible and traceable back to what the client actually asked for.

**Stage:** Late beta / Early revenue (first paying customer: 2025-11-28)
**Funding:** Bootstrapped, funds drying up, revenue-critical

---

## Team & Ownership Structure

**Ownership:**
- 50% - Founder/CTO (technology decision-maker, calls shots on technology, built all prompts/logic/QC)
- 50% - Partner company (research company, ~5 years old, multiple shareholders)

**Team:**
- Founder/CTO - Built all prompts, QC processes, assessment logic
- Developer (India) - $1,000 USD/week, implements platform code

---

## The Problem We Solve

**For Recruiters:**
- Manually reviewing 100+ LinkedIn profiles takes hours
- Inconsistent screening—different recruiters apply different criteria
- No defensibility—hard to explain why candidates were recommended or rejected
- Quality risk—keyword matching misses good candidates who describe skills differently
- No audit trail for decisions

**Our Solution:**
- AI reviews ALL candidates consistently using semantic understanding
- Every decision backed by evidence traceable to job requirements
- Client reports show: "You asked for X, we found Y in candidate Z's profile"
- Platform designed to be "litigation-proof"—the job brief acts as a contract
- Fast, quick, and cheap for recruiters who need volume

---

## Target Market

**Primary Target:** Small businesses, particularly contingency recruiters

**Why them:**
- They need fast, quick, and cheap solutions
- Volume-based work where manual screening is a bottleneck
- Can't afford enterprise recruitment tools

**Current Status:** Beta testing with different industries and styles to validate product-market fit.

**Industries Validated:**
- Legal professionals (Solicitors - Commercial, Regulatory, Corporate)
- Executive-level roles (VP of Talent, Strategy Managers)
- Finance professionals (M&A advisors, Commercial negotiators)
- Compliance specialists

**Scope:** Any industry that does NOT require multiple LinkedIn searches. One solid search strategy per job.

---

## Pricing & Business Model

**Current Model:** Fixed price per analysis

- **Price:** $49 USD per analysis
- **Fixed cost:** $10 per analysis
- **Variable cost:** $0.05 per candidate analyzed
- **Maximum candidates:** 200 per analysis
- **Raw cost to Simple AF:** ~$20 per analysis
- **Gross margin:** ~$29 per analysis (~59%)

**Future Plans:** Subscription tiers (not yet implemented)

---

## Competitive Positioning

| Platform | Pricing | Strengths | Weaknesses |
|----------|---------|-----------|------------|
| **LinkedIn Recruiter + AI** | ~$6,000/year license + ~$3,000/year AI per recruiter (~$9,000/year total) | Market leader, integrated with LinkedIn data | Expensive, enterprise-focused |
| **Juicebox** | ~$160-170/month flat fee | Cheap, fast output, access to dataset, limited searches | **Poor quality output** - recruiters spend significant time reviewing results |
| **Simple AF** | $49 per analysis, unlimited users | Evidence-based quality, semantic AI, defensible output | Early stage, manual bottleneck |

**One-Line Differentiator:** Simple AF delivers evidence-based candidate rankings where every recommendation is traceable to job requirements—so recruiters get quality output they can trust without spending hours reviewing, at $49 per search vs $9,000+/year for LinkedIn or quality issues with cheaper alternatives.

**Key Advantage vs Juicebox:** Quality of output. Competitors provide fast, cheap results but recruiters waste time reviewing poor matches. Simple AF provides evidence-based, defensible output.

---

## How The Platform Works (Detailed Process Flow)

### STEP 1: JOB BRIEF CAPTURE

**Option A:** Recruiter calls Alexandra (voice AI assistant)
- Job Brief Manager asks natural conversation questions

**Option B:** Recruiter provides a document
- Alexandra Copilot (AC) extracts requirements

**Information gathered:**
- Job title, location, remote type
- Must-have skills, nice-to-have skills
- Activity keywords (what they do day-to-day)
- Target companies, exclusions
- Expected candidate pool size
- Domain expert insights

**OUTPUT:** Structured job brief

### STEP 2: LINKEDIN SEARCH STRATEGY

- Takes structured job brief
- Maps requirements to LinkedIn filter codes
- Builds Boolean search with iterative refinement
- Goal: ONE solid search (not multiple searches)

**OUTPUT:** LinkedIn Sales Navigator URL

### STEP 3: CANDIDATE EXPORT

- Recruiter runs LinkedIn search
- Downloads candidate list (up to 200 candidates max)

**OUTPUT:** Candidate data for analysis

### STEP 4: ALEXANDRA PROFILER (Core AI Screening)

**Literal Checks (Hard Vetos):**
- Location compatibility
- Excluded company check
- Profile quality check

**Semantic Assessment (Claude AI reasoning):**
- Reads full candidate profile
- Reasons about matches semantically
- Example: "Selling financial data to M&A teams" = "M&A advisory experience"
- This catches qualified candidates that keyword-based systems would miss

**Dimensional Scoring (0-100%):**
- Domain/Sector match: 30-50% weight
- Core competencies: 35% weight
- Experience profile: 10-25% weight
- Geographic feasibility: 0-20% weight
- Critical qualifiers: 5% weight

**Red Flag Detection:**
- Founders (won't take employed role)
- Retired candidates
- Overqualified/underqualified
- Fractional/interim roles

**OUTPUT:** Scored and ranked candidates with evidence

### STEP 5: REPORT DELIVERY

- **QC_REPORT.md** (Internal) - Full analysis, all candidates
- **CLIENT_REPORT.md** (Client-Facing) - Evidence for each match
- **CLIENT_SHORTLIST.md** (Summary) - Top candidates for interview

**Scoring Bands:**
- 80-100% = STRONG MATCH (recommend)
- 60-79% = GOOD MATCH (consider)
- 40-59% = MODERATE MATCH (manual review)
- 20-39% = WEAK MATCH (exclude)
- <20% = NOT SUITABLE (exclude)

---

## The Defensibility Principle

> "Provide RELEVANCE justified by EVIDENCE that we can either EXPLICITLY get from the client or INFER via semantic AI with HIGH CERTAINTY"

**In Practice:**
```
CLIENT SAYS → WE CAPTURE → WE ACT → WE DELIVER

Example:
- CLIENT: "I need someone with M&A experience"
- CAPTURED: Job brief records "M&A Experience" as requirement
- ACTION: Profiler assesses each candidate for M&A experience
- DELIVERY: Report shows: ✅ YES | HIGH | "Led due diligence on 15 transactions"
```

**Why This Matters:**
- Job brief is effectively a CONTRACT with the client
- Every recommendation traceable back to requirements
- Every rejection documented with evidence
- Platform designed to be litigation-proof

---

## Current State & Roadmap

### What Works Today:
- Platform delivers value—recruiters keep using it (validated)
- Voice capture with Alexandra (Job Brief Manager)
- LinkedIn search strategy generation
- Alexandra Profiler semantic AI analysis
- Evidence-based report generation

### Current Bottleneck:
- Requires CTO time doing manual work
- Relies on Claude Code to run prompts manually
- Automation not yet complete in the system
- Platform exists but workflow requires human intervention

### Near-Term Roadmap:
- Automate the manual steps currently requiring CTO intervention
- Complete platform automation end-to-end

### Ultimate Goal:
1. User calls Alexandra OR provides a document
2. Alexandra Copilot (AC) interacts with user to gather all necessary information
3. Extract candidate data from Core Signal (large LinkedIn dataset)
4. Return ranked candidates with evidence based on conversation/documentation
5. **Results delivered within the hour**

### Core Signal Integration:
Future data source—a comprehensive LinkedIn dataset that will replace manual Sales Navigator exports and enable faster, more scalable candidate sourcing.

---

## Decision-Making Priorities

When advising Simple AF Jobs, the council should prioritize in this order:

1. **Automation** - Platform must self-run with minimal human intervention
2. **Revenue / Cash Flow** - Recoup high expenses, funds are drying up
3. **User Acquisition** - Get paying users on the platform
4. **Exit Potential** - Build to sell (long-term goal)

**Context:** The company is bootstrapped and needs to generate revenue soon. First paying customer acquired on 2025-11-28. Prior to this, beta testing with free users in exchange for feedback.

---

## Non-Negotiables (Sacred Cows)

- **Evidence-based output is non-negotiable** - Every result must be defensible
- **Quality over speed** - Output must be so solid that recruiters don't need to review extensively
- The "defensibility principle": recommendations must be litigation-proof

**What's NOT a constraint for council decisions:**
- Tech stack choices (Python, Streamlit, etc.) - operational detail
- AI provider choices (Claude, OpenAI) - operational detail

---

## Current Constraints & Risks

### Primary Bottleneck: Founder/CTO
- Founder does manual work that should be automated
- Founder built all the prompts, QC processes, and assessment logic
- No qualified staff to take this over currently
- Time spent on tasks that shouldn't require founder involvement

### Key Business Risk: Single Developer Dependency
- One developer in India ($1,000 USD/week)
- No visibility or control over what he does
- He implemented the platform code
- **Critical risk: If he leaves, the business could collapse**
- Founder has the "brains" (prompts, logic), developer has the implementation

**Working On:** Automating manual steps to reduce founder dependency and enable the platform to self-run.

---

## Technology Stack

- **Backend:** Python 3.x
- **Web Interface:** Streamlit
- **Primary LLM:** Claude API (claude-3-5-sonnet)
- **Fallback LLM:** OpenAI API
- **Voice Agents:** VAPI
- **File Processing:** PyPDF2, JSON
- **Session Storage:** Local filesystem (JSON-based)

Tech stack choices are NOT constraints—council can suggest alternatives if beneficial.

---

## Traction & Validation

**Current Stage:** Late beta / Early revenue

**Traction:**
- Beta users testing for free in exchange for feedback
- First paying customer: 2025-11-28
- Recruiters keep using it (product-market fit signal)

**Validation:**
- Platform delivers value that users return for
- Multiple industries tested (legal, executive, finance)
- Evidence-based approach differentiates from competitors

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
- Solutions that increase founder dependency
