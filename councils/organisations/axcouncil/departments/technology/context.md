# Technology Department Context

> **Last Updated:** 2025-12-06 (Authentication System Complete)
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
| Backend | Python 3.10+ with FastAPI | LIVE on Render |
| Frontend | React 19 with Vite | LIVE on Vercel |
| Database | Supabase PostgreSQL | LIVE |
| Authentication | Supabase Auth | LIVE |
| LLM API | OpenRouter | Active |

## Current Architecture State (December 2025)

### Production Deployment - COMPLETE

| Service | URL | Platform |
|---------|-----|----------|
| Frontend | https://ai-council-three.vercel.app | Vercel |
| Backend | Render (check dashboard) | Render |
| Database | Supabase PostgreSQL | Supabase |
| Auth | Supabase Auth | Supabase |

### Authentication System - COMPLETE (Session: 2025-12-06)

**What was implemented:**
- Full Supabase authentication integration
- Email/password sign up and sign in
- Magic link support (email confirmation)
- Password recovery flow ("Forgot password?")
- Password reset form when clicking recovery link
- Protected routes (must login to access app)
- User email displayed in sidebar with Sign Out button

**Key files modified:**
- `frontend/src/AuthContext.jsx` - Auth state management with session persistence
- `frontend/src/components/Login.jsx` - Login/signup/password reset UI
- `frontend/src/App.jsx` - Protected route handling
- `frontend/src/supabase.js` - Supabase client configuration

**Technical challenges solved:**
1. Magic links causing blank page - Fixed by handling URL hash tokens properly
2. PASSWORD_RECOVERY event being overwritten by SIGNED_IN - Added persistent `needsPasswordReset` flag
3. Production build TDZ errors - Moved function definitions before useEffect hooks
4. Variable shadowing in minified builds - Renamed `resetPassword` to `sendPasswordReset`

### Supabase Configuration Required

In Supabase Dashboard > Authentication > URL Configuration:
- **Site URL:** `https://ai-council-three.vercel.app`
- **Redirect URLs:**
  - `https://ai-council-three.vercel.app`
  - `http://localhost:5173`

### Environment Variables

**Frontend (Vercel):**
```
VITE_SUPABASE_URL=https://ywoodvmtbkinopixoyfc.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_API_URL=<backend-render-url>
```

**Backend (Render):**
```
SUPABASE_URL=https://ywoodvmtbkinopixoyfc.supabase.co
SUPABASE_KEY=<service-role-key>
OPENROUTER_API_KEY=<openrouter-key>
```

## Active Projects

| Project | Status | Description |
|---------|--------|-------------|
| Supabase Migration | COMPLETE | Moved from JSON files to PostgreSQL |
| Production Deployment | COMPLETE | Frontend on Vercel, Backend on Render |
| User Authentication | COMPLETE | Supabase Auth with email/password and password recovery |
| Multi-tenant (per-user data) | NOT STARTED | Currently all users see all conversations |
| API Authorization | NOT STARTED | Backend endpoints not protected by auth tokens |

## Security Notes

**Current State:**
- RLS (Row Level Security) is DISABLED on Supabase tables
- Using anon key for database access
- Backend API endpoints are NOT authenticated
- All authenticated users see all conversations (no user isolation)

**Before Public Launch:**
- Enable RLS on all Supabase tables
- Add user_id filtering to conversations
- Protect backend API with Supabase JWT verification
- Consider rate limiting

## Recent Commits (Auth Implementation)

| Commit | Description |
|--------|-------------|
| `85a1b7f` | fix: persist password reset state across auth event changes |
| `58cff69` | fix: move function definitions before useEffect hooks |
| `83d512d` | fix: rename resetPassword to avoid variable shadowing |
| `4720330` | fix: show password reset form during PASSWORD_RECOVERY event |
| `78305dc` | fix auth: handle magic links, password recovery, and add forgot password flow |
| `770d24f` | add Supabase authentication to frontend |

---

*This context is loaded alongside the company context when Technology department is selected.*
