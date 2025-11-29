# SimpleAF - Business Context

**For LLM Council Decision-Making**
**Last Updated:** 2025-11-30

---

## Company Overview

**Platform Name:** Simple AF Jobs
**Organization:** The Ally Venture
**Product:** Alexandra Copilot (AC)
**AI Assistant:** Alexandra

**Simple AF Jobs** is a semantic AI-powered recruitment platform that automates candidate screening for recruiters and hiring managers. It captures job requirements through voice conversations with an AI assistant (Alexandra) or document upload, automatically builds LinkedIn Sales Navigator search strategies, and then uses Claude AI to semantically assess and rank every candidate—not through keyword matching, but through reasoning about whether a candidate's profile evidence genuinely matches the job requirements. The platform generates evidence-backed shortlists and client reports where every recommendation is defensible and traceable back to what the client actually asked for.

**Stage:** Late beta / Early revenue (first paying customer: 2025-11-28)
**Funding:** Bootstrapped, 100% self-funded (not open to angel investment)

---

## Financial Position (The "Survival Number")

### Monthly Burn: ~$10,000/month
- Developer (India): $4,000/month
- Core Signal (future data source): $1,500/month (not yet active)
- Tech stack, hosting, APIs: ~$4,500/month (buffer included)

### Runway: 12 months from November 2025
- Cash available to sustain operations through late 2026
- Conservative estimate with safety margin built in

### Founder Personal Need: $0 for 12 months
- Founder does not require income draw from the business
- Full runway available for growth/operations

---

## Team & Ownership Structure

**Ownership:**
- 50% - Founder/CTO (technology decision-maker, calls shots on technology, built all prompts/logic/QC)
- 50% - Partner company (research company, ~5 years old, multiple shareholders)

**Partner Alignment:**
- Both partners want the same thing: $5M minimum exit in ~18 months
- Fully aligned on price and timeline
- No conflict between partners on strategy

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

**Current Status:** Still in beta—validating ICP with early customers.

### Ideal Customer Profile (Early Signals)

**Best Fit:**
- Recruiters working on *hard-to-find* roles (niche skills, obscure titles, specific combinations of experience)
- Contingency recruiters who need speed and precision

**Less Ideal Fit:**
- Roles that are easy to search (e.g., standard tech roles, legal recruiters searching for common titles within corporates)
- Corporate/enterprise clients—they typically require fixed monthly pricing, which cannot yet be offered

**Agency Size:** Too early to determine whether solo recruiters or 10-person agencies show stronger engagement.

### Strategic ICP Question (Unresolved)

| Role Type | Characteristics | Trade-off |
|-----------|-----------------|-----------|
| **"Easy" roles** | Clear titles (SDR, Sales, Finance) | Easier to search, faster to serve, but may be lower-value |
| **"Hard" roles** | Niche skills, obscure titles, specific experience combos | More iteration required, but justifies premium pricing and differentiates |

**Council Question:** Should we focus on "easy" roles to build volume and refine operations, or target "hard" roles to differentiate and justify premium pricing?

### Industries Validated:
- Legal professionals (Solicitors - Commercial, Regulatory, Corporate)
- Executive-level roles (VP of Talent, Strategy Managers)
- Finance professionals (M&A advisors, Commercial negotiators)
- Compliance specialists

**Scope:** Any industry that does NOT require multiple LinkedIn searches. One solid search strategy per job.

---

## Pricing & Business Model

**Current Model:** Fixed price per analysis (pay-per-job, not subscription)

- **Price:** $49 USD per analysis
- **Fixed cost:** $10 per analysis
- **Variable cost:** $0.05 per candidate analyzed
- **Maximum candidates:** 200 per analysis
- **Raw cost to Simple AF:** ~$20 per analysis
- **Gross margin:** ~$29 per analysis (~59%)

### Pricing Rationale: The "Why The Fuck Not?" Price
$49 is a no-brainer entry point designed to eliminate friction and encourage trial. At this price, the decision to purchase requires minimal deliberation.

**Competitor Comparison:** Juicebox charges ~$179/month on a subscription model. Simple AF charges per job, not per month—aligning cost directly with value delivered.

**Higher Price Points ($99–$149):** Not yet tested. Open question: given the "litigation-proof" quality positioning, should higher price points be trialled?

### Pricing Feedback Received
- One prospect at earlier $75 price point: *"If you can provide relevancy, you're doing extremely well"*
- At $49, no pushback received (neither "too expensive" nor "suspiciously cheap")
- **Founder's instinct:** Based on competitor pricing (Juicebox ~$179/month), $49/job feels very cheap—but prioritising volume, usage, and feedback over margin optimisation at this stage

**Council Question:** Once we have 20–30 paying customers, should we A/B test $79 or $99 price points?

### Target Usage Model
**Baseline:** Minimum 10 searches per month per client

Revenue model assumes a "happy" recruiter will run at least 10 job searches per month. This is the baseline for sustainable unit economics.

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

## Current Operations & Manual Process

### Automation Level: ~60% Automated / 40% Manual

**Turnaround:** Next business day delivery

### What's AUTOMATED:
- AI voice agent (Alexandra) captures job briefs via phone or platform
- Notification system alerts team to new briefs
- Transcript extraction via Claude Code (using GitHub markdown)
- Sales Navigator search strategy generation (boolean filters, URL creation)
- Candidate data scraping from Sales Navigator into platform (15–20 min runtime)
- Candidate sorting against must-have/good-to-have criteria
- JSON file generation with candidate data
- Alexandra Profiler runs candidate reports against job brief

### What's MANUAL (founder-dependent):
1. Copy-pasting job brief into Claude Code
2. Iterating with Claude Code on search strategy until satisfied
3. Verifying candidate count in LinkedIn before confirming search
4. Final review and shortlisting based on Alexandra Profiler output

### Technical Blocker:
**None.** This is a resource constraint, not a technical limitation. Developer is prioritising client-facing experience (polished UI, seamless user journey) over backend automation. Strategic decision: product should *feel* fully automated to customers whilst manual work happens "under the hood" in the interim. Developer is actively closing this gap.

**Current Model:** Service (manual) → **Future Model:** SaaS (automated with Core Signal)

### Why Manual Process Exists (Intentional):
1. **Learning phase** - Understanding edge cases and failure modes
2. **Quality control** - CTO validates every output before delivery
3. **Prompt refinement** - Continuous improvement of assessment logic
4. **Trust building** - Ensure output quality before automating
5. **LinkedIn grey area** - Manual keeps liability on recruiter's account

### The Bridge Model: Founder → Operator → Full Automation

**Strategy:** Bridge the gap between "founder-dependent manual work" and "fully automated SaaS" with a low-cost human operator.

**Phase 1 (Current):** Founder runs every analysis to master and refine prompts. Each iteration improves reliability and reduces decision-making required.

**Phase 2 (Near-term):** Hire operator from Eastern Europe or India at ~**€600/month**.

**The Alexandra Copilot Workflow with Operator:**
1. Client calls Alexandra (AI voice agent) → call transcript generated automatically
2. System automatically runs Transcript Extract and Sales Navigator Strategy
3. **Human intervention:** €600/month operator interacts with Alexandra Copilot to refine and finalise the Sales Navigator search strategy (outputs LinkedIn URL)
4. Operator shares URL with platform → platform scrapes and returns candidates
5. JSON candidate data automatically processed by Alexandra Profiler against job transcript
6. Final shortlist delivered to client

**Economics:** At €600/month, operator cost covered by ~21 analyses (at $29 margin). This allows scaling beyond founder capacity without requiring full automation or six-figure developer salaries.

**Phase 3 (End State):** Core Signal integration removes need for Sales Navigator scraping entirely—full automation with zero human intervention.

**Key Point:** Every analysis the founder runs today is an investment in process documentation. When the operator joins, they inherit a battle-tested playbook, not a blank canvas.

---

## Customer Acquisition Strategy

### Current Approach: LinkedIn Campaigns
- Targeted outreach to contingency recruiters
- Focus on small recruitment agencies
- Emphasize speed, cost, and quality differentiators

### Sales Messaging:
- "$49 per search vs $9,000/year for LinkedIn Recruiter"
- "Evidence-based output you can trust without hours of review"
- "Results delivered next business day"

### Conversion Funnel & Metrics:

| Stage | Metric | Raw Numbers |
|-------|--------|-------------|
| LinkedIn DMs sent | Baseline | ~100 |
| DM → Interest/Accept | 10–15% | ~10–15 people |
| Interest → Trial (3 free analyses) | ~100% of interested | ~10–15 enter trial |
| Trial → Paid | ~20–30% (estimated) | ~3 conversions |
| **End-to-end (DM → Paid)** | **~3%** | Pending validation |

**Caveat:** These are preliminary estimates. First paying customer was a warm referral, not cold outreach. Stripe only recently integrated—30 days of data needed for validation.

**Funnel Model:** Standard SaaS free-trial approach—offer 3 free searches to demonstrate value before conversion.

**Council Question:** Is 3% end-to-end conversion reasonable for early-stage B2B SaaS?

---

## Legal & Compliance

### Liability Framework:
- **Key principle:** Liability rests with the recruiter, NOT Simple AF
- Platform provides analysis and recommendations
- Recruiters make final hiring decisions
- Evidence-based output provides audit trail for recruiter's defense

### LinkedIn Terms of Service:
- **Current approach:** Grey area with Sales Navigator exports
- Manual data export by recruiter (their account, their risk)
- **Future solution:** Core Signal integration eliminates ToS concerns
- Core Signal = legitimate LinkedIn dataset with proper licensing

### Data Protection:
- No candidate PII stored long-term
- Analysis data retained for client delivery only
- Platform designed with privacy by design principles

---

## Code Ownership & IP Risks

### Current Situation: ⚠️ HIGH RISK
- **No NDA in place** with developer (yet)
- Developer implemented platform code
- **Developer HAS access to prompts** - prompts are NOT kept separate
- CTO owns the know-how, customers, clients; developer is the tech brain

**Developer can currently deploy independently.** He has access to:
- The code repository
- Server keys
- API accounts

**Why we accept this risk:**
- Non-technical founders with no alternative
- Six-figure in-house developer not financially viable
- Proceeding with eyes open; prioritising legal protection upon UK incorporation

### Developer Relationship & Incentive Plan:
- Developer knows about the exit strategy goal
- **Plan:** Offer phantom/ghost shares in the company as incentive
- **Goal:** Give developer vested interest in success + dividends as company grows

**Timeline:** Immediately upon UK company incorporation.

Once the UK entity is established:
1. Execute an NDA agreement with the developer
2. Issue phantom/ghost shares to ensure long-term alignment and incentivisation

This is recognised as a **binary risk factor** and will be addressed as a priority.

### Founder Access (Bus Factor Mitigated):
- **Full GitHub access:** YES - Founder has complete repository access
- **Database access:** YES - Founder has direct access
- **Hosting/infrastructure access:** YES - Founder controls all systems
- **Could disconnect developer today:** YES - Core platform would survive
- **Documentation:** Limited to what's in GitHub (code comments, README)

### Risk Assessment:
- **Mitigated:** If developer leaves, founder retains full access to codebase
- **Remaining risk:** Founder not deeply technical, would need time to onboard replacement
- **Positive:** Good chunk of work preserved even without developer
- Developer has implementation knowledge but founder controls access

### Mitigation Strategy:
- Establish NDA/IP assignment agreement
- Improve documentation beyond code comments
- Long-term: Reduce dependency on single developer

---

## User Experience & Friction Points

### Friction Points Identified:
1. Manual export from LinkedIn Sales Navigator (user effort)
2. Wait time for next-business-day delivery
3. Learning curve for job brief capture
4. No self-service dashboard yet

### Improvements Made:
- Voice capture option (call Alexandra) reduces friction
- Document upload alternative for existing JDs
- Structured report format for easy review
- Clear scoring bands for quick decision-making

### Planned Improvements:
- Core Signal integration (eliminates manual export)
- Same-hour turnaround (automation)
- Self-service dashboard
- Progress tracking during analysis

---

## Current State & Roadmap

### What Works Today:
- Platform delivers value—recruiters keep using it (validated)
- Voice capture with Alexandra (Job Brief Manager)
- LinkedIn search strategy generation
- Alexandra Profiler semantic AI analysis
- Evidence-based report generation

### Current Bottleneck:
- Requires CTO time doing manual work (~1h15m per analysis)
- Relies on Claude Code to run prompts manually
- Automation not yet complete in the system
- Platform exists but workflow requires human intervention

### Near-Term Roadmap:
- Hire operations person to handle manual execution
- Automate the manual steps currently requiring CTO intervention
- Complete platform automation end-to-end
- Establish proper IP/NDA agreements with developer

### Automation Timeline Estimate:
**Developer's estimate:** Automating the Sales Navigator search strategy generation inside the app will take **minimum 2 weeks of full-time work**.

**Caveat:** Dependent on no competing priorities. If urgent work arises (bug fixes, client-facing features), timeline will slip.

**Council Question:** Should we ring-fence these 2 weeks immediately, or is the €600/month operator bridge sufficient to buy more time?

### Ultimate Goal:
1. User calls Alexandra OR provides a document
2. Alexandra Copilot (AC) interacts with user to gather all necessary information
3. Extract candidate data from Core Signal (large LinkedIn dataset)
4. Return ranked candidates with evidence based on conversation/documentation
5. **Results delivered within the hour**

### Core Signal Integration:
Future data source—a comprehensive LinkedIn dataset that will replace manual Sales Navigator exports and enable faster, more scalable candidate sourcing. This also resolves LinkedIn ToS grey areas.

**Target Timeline:** Early January 2025 (~4–5 weeks from November 2025)

This is a priority integration that moves the platform from "grey area" Sales Navigator scraping to a compliant, "white hat" data source.

**Dependency:** Developer bandwidth—not a revenue milestone. Work needs to commence as soon as possible to meet this timeline.

---

## Exit Strategy (The Exit Horizon)

### CLARIFICATION: NOT "Sell Now"
- **No intention to sell immediately**
- Plan is to BUILD → GET CUSTOMERS → GENERATE REVENUE → SELL in 18 months
- No burnout, no cash panic, no partner conflict, no inbound offer
- This is a planned growth-to-exit strategy, not a fire sale

### Timeline: 18 months maximum
- **Rationale:** AI moves fast; window of opportunity is limited
- Must achieve exit-ready state by mid-2027

### Target Exit Number: $5 million (minimum)
- 50/50 ownership split = $2.5 million per partner
- "Life-changing number" that makes both founders happy
- Both partners fully aligned on this number and timeline

### Exit Flexibility
**Position:** Not rigidly attached to $5M figure.

If a credible offer of **€3M with a clean exit in 12 months** were presented, it would be seriously considered. A faster, cleaner path may be preferable to maximising the number.

**Implication for Council:** May optimise for maximum profitability and clean financials rather than aggressive growth, if that accelerates the exit timeline.

### Investment Appetite: 100% Bootstrapped
- **NOT open to angel investors** or outside funding
- Must achieve exit through organic revenue growth
- All growth funded from runway + revenue

### Exit Valuation (Knowledge Gap)
Standard multiples for tech/SaaS exits are unknown to founder. Council guidance needed on:
- What revenue multiple is realistic (3x? 5x? Higher for IP-heavy businesses?)
- Whether $5M target should be based on ARR or technology/IP valuation
- What ARR milestone is needed to command that valuation

### Target Acquirers (Hypothesis Needed)
No current hypothesis on likely acquirer. Possible categories for Council to explore:

| Category | Examples | Rationale |
|----------|----------|-----------|
| **Competitor** | LinkedIn, Juicebox | Acquire to kill or absorb features |
| **Customer Upstream** | Large recruitment agency | Seeking competitive differentiation |
| **Platform** | Greenhouse, Ashby, Bullhorn (ATS providers) | Add sourcing capabilities to existing platform |

Council input requested on which category to prioritise and how to position accordingly.

### Founder Role Post-Exit
**Position:** Open to earn-out of up to 12 months maximum.

Willing to support a transition period for continuity, but a multi-year (2+ year) earn-out is not desirable. A clean break after 12 months would be the preferred outcome.

---

## Decision-Making Priorities

When advising Simple AF Jobs, the council should prioritize in this order:

1. **Automation** - Platform must self-run with minimal human intervention
2. **Revenue / Cash Flow** - Generate revenue to extend runway and prove value
3. **User Acquisition** - Get paying users on the platform
4. **Exit Potential** - Build to sell within 18 months

**Context:** The company is bootstrapped with 12 months runway. First paying customer acquired on 2025-11-28. Must reach exit-ready state within 18 months while staying 100% bootstrapped.

---

## Non-Negotiables (Sacred Cows)

- **Evidence-based output is non-negotiable** - Every result must be defensible
- **Quality over speed** - Output must be so solid that recruiters don't need to review extensively
- The "defensibility principle": recommendations must be litigation-proof

**What's NOT a constraint for council decisions:**
- Tech stack choices (Python, Streamlit, etc.) - operational detail
- AI provider choices (Claude, OpenAI) - operational detail

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

## Traction & Validation (Sales Reality)

**Current Stage:** Late beta / Early revenue

**Traction:**
- Beta users testing for free in exchange for feedback
- **First paying customer:** 2025-11-28
- Stripe payments just integrated (this week)
- Following up on feedback from beta testers

**Sales Data (Honest Assessment):**
- **Total paying customers:** 1
- **Additional sales since Nov 28:** No (Nov 28 was Friday, today is Nov 29)
- **Repeat purchase data:** None yet (too early)
- **First customer acquisition method:** Warm referral from Greg (50% co-owner)—not a cold outreach conversion
- **Sales target:** Start selling actively in November-December 2025

### Drop-off Reasons (Early Signals)
- **Primary reason cited:** "No budget"
- **Secondary factors:** Still gathering data; several meetings scheduled
- **Caveat:** Very early stage—free trial users still active, no clear patterns yet

**Commitment:** Will report structured feedback to Council after 10+ trial completions.

**Pipeline / Potential Buyers:**
- **Company buyers (acquirers):** Starting from zero - no list of potential acquirers yet
- **Platform users (customers):** YES - have recruiters wanting to USE the platform
- Pipeline consists of potential USERS, not potential company buyers
- Need to build acquirer list as part of exit strategy

**Validation:**
- Platform delivers value that beta users return for
- Multiple industries tested (legal, executive, finance, compliance)
- Evidence-based approach differentiates from competitors
- Quality of output validated by recruiter feedback

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

---

## Key Decisions Pending Council Input

*Last Updated: 2025-11-30*

| Area | Current Status | Risk | Council Input Needed |
|------|----------------|------|---------------------|
| Funnel Conversion | ~3% DM→Paid (estimated) | Unknown | Is 3% reasonable for early-stage B2B SaaS? |
| Automation Priority | 2 weeks dev time required | Medium | Ring-fence now or use operator bridge? |
| Developer IP | Can deploy independently; no NDA | **HIGH** | Acknowledged as binary risk |
| ICP Strategy | Easy vs hard roles unresolved | Low | Focus on volume (easy) or differentiation (hard)? |
| Pricing | $49 "WTFN"; no pushback yet | Low | A/B test $79–$99 at 20–30 customers? |
| Exit Flexibility | Open to €3M clean exit | N/A | Optimise for profitability over growth? |
| LinkedIn Grey Area | Willing to operate 6–9 months | Medium | Acknowledged; Core Signal by Jan 2025 |
| Exit Multiple | Unknown | Medium | Council to advise on realistic range |
| Acquirer Hypothesis | Categories identified, no targets | Medium | Which category to prioritise? |
| Drop-off Reasons | "No budget" cited | Unknown | Gather data from next 10 trials |

### Summary: Risk Levels

| Risk Level | Items |
|------------|-------|
| **HIGH** | Developer IP (can deploy independently) |
| **Medium** | Automation priority, LinkedIn ToS, Exit multiple unknown, Acquirer targeting |
| **Low** | ICP strategy, Pricing |
| **Unknown** | Funnel conversion validity, Drop-off patterns |
