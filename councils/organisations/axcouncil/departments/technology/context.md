# Technology Department Context

> **Last Updated:** 2025-12-06
> **Organisation:** AxCouncil

---

## Department Overview

Technical execution and development guidance for AxCouncil.

## Roles

- **CTO** - Chief Technology Officer: Technical strategy and architecture decisions
- **Developer** - Development guidance and code implementation
- **DevOps** - Deployment, infrastructure, and CI/CD

## CTO Council Setup

Models - 5 models via OpenRouter (Claude, GPT, Gemini, Grok, DeepSeek) - We have the option to include more via OpenRouter if needed.

Framework Prompt - "Bootstrap Technical Guide" - assumes basic Python/GitHub skills, no DevOps experience; provides step-by-step instructions with exact commands and code to copy-paste

Query Format - Include skill level, what you know, request exact steps, commands, and error handling

Escalation Path - If the task takes more than 4-6 hours, CTO Council writes an Upwork freelancer brief instead (this is to be discussed first).

## Technical Stack

| Component | Technology | Status |
|-----------|------------|--------|
| Backend | Python 3.10+ with FastAPI | Running on port 8001 |
| Frontend | React 19 with Vite | Running on port 5173 |
| Database | Supabase PostgreSQL | LIVE - connected from localhost |
| Hosting | Render (free tier) | Account created, NOT deployed |
| LLM API | OpenRouter | Active |

## Current Architecture State (December 2025)

**What's Working:**
- Local development environment fully functional
- Supabase database integration COMPLETE
- Conversations now persist to cloud database
- All CRUD operations working (create, read, list, delete)

**Key Backend Files:**
- `database.py` - NEW: Supabase client connection
- `storage.py` - REWRITTEN: Uses Supabase instead of JSON files

**Next Major Task:**
- Deploy to Render (backend) and Vercel/Netlify (frontend)

## Active Projects

| Project | Status | Description |
|---------|--------|-------------|
| Supabase Migration | COMPLETE | Moved from JSON files to PostgreSQL |
| Render Deployment | NOT STARTED | Account created, no deployment done |
| User Authentication | PLANNED | Will use Supabase Auth |

## Knowledge Base

**Security Notes:**
- RLS (Row Level Security) is DISABLED on all Supabase tables
- Using anon key for database access
- Will need to enable RLS before public deployment

---

*This context is loaded alongside the company context when Technology department is selected.*
