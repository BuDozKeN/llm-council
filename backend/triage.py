"""Triage module for pre-council question analysis.

Ensures questions have the 4 key constraints before going to the council:
1. WHO - Who will execute? (Founder/Developer/Operator)
2. GOAL - Survival (cash now) vs Exit Value (long-term)?
3. BUDGET - $0 or willing to invest?
4. RISK - Speed vs Quality/Defensibility?
"""

import json
from typing import Dict, Any, List, Optional
from .openrouter import query_model

# Use a fast, cheap model for triage
TRIAGE_MODEL = "google/gemini-2.0-flash-001"

TRIAGE_PROMPT = """You are a triage assistant for an AI Council that advises a bootstrapped startup.

Your job is to check if the user's CURRENT QUESTION contains the 4 key constraints needed for good advice. If any are missing from THEIR QUESTION, you MUST ask for them.

THE 4 CONSTRAINTS (all 4 are required for each new question):

1. WHO (Executor): Who will physically execute the solution for THIS specific task?
   - Founder (manual, limited time)
   - Developer (technical, currently bottlenecked)
   - Operator (hired help, if available)

2. GOAL (Context): What's the objective for THIS specific initiative?
   - Survival: Need cash flow NOW to extend runway
   - Exit Value: Building IP/metrics for future exit

3. BUDGET: What can be spent on THIS specific thing?
   - $0: Must use existing tools/resources only
   - Investment: Willing to spend $X amount

4. RISK (Quality Trade-off): What's the quality constraint for THIS task?
   - Speed: Can sacrifice quality for velocity
   - Defensibility: Cannot compromise quality

CRITICAL RULES:
- ONLY extract constraints that are EXPLICITLY stated in the user's question
- Do NOT assume constraints from business context - that's background info only
- Each question needs its own specific constraints, even if you know the business defaults
- If the user asks "Do we need billboards?" without specifying WHO will handle it, BUDGET for it, etc., those are MISSING
- You must ask about missing constraints - don't fill them in from context

RESPONSE FORMAT (JSON):

{
  "ready": false,
  "constraints": {
    "who": "only if explicitly stated in question, otherwise null",
    "goal": "only if explicitly stated in question, otherwise null",
    "budget": "only if explicitly stated in question, otherwise null",
    "risk": "only if explicitly stated in question, otherwise null"
  },
  "missing": ["who", "goal", "budget", "risk"],
  "questions": "Friendly, conversational message asking for the missing information. Be specific to their topic.",
  "enhanced_query": "Only populate if ready=true. The question enhanced with extracted constraints."
}

FORMAT YOUR QUESTIONS AS A BULLETED LIST - this is critical for readability:

Example good response:
"Before the council weighs in on billboards, a few quick questions:

• **Who's handling this?** Are you doing this yourself, or hiring an agency?
• **Budget?** What can you spend on outdoor advertising?
• **Goal?** Is this for immediate brand awareness or long-term positioning?
• **Speed vs quality?** Do we need this fast, or does it need to be perfect?"

Keep each bullet SHORT and scannable. One question per bullet. Use **bold** for the key word.

USER INPUT TO ANALYZE:
"""

FOLLOWUP_PROMPT = """You are continuing a triage conversation. The user has provided additional information to clarify their question.

Previous context:
{context}

User's new response:
{response}

Re-analyze and update the constraints based on what the user has NOW explicitly told you.

Respond with JSON:

{{
  "ready": true/false,
  "constraints": {{
    "who": "value from user's responses, or null if still not specified",
    "goal": "value from user's responses, or null if still not specified",
    "budget": "value from user's responses, or null if still not specified",
    "risk": "value from user's responses, or null if still not specified"
  }},
  "missing": ["list any constraints still not specified by the user"],
  "questions": "If not ready, use BULLET POINTS to ask for remaining info. Keep it short and scannable.",
  "enhanced_query": "If ready, combine the original question with all the constraint info into a clear query."
}}

FORMAT: Use bullet points (•) with **bold** labels. One short question per bullet. Example:
"Thanks! Just need a couple more things:

• **Budget?** Roughly how much can you spend?
• **Timeline?** Do we need this fast or can we take our time?"
"""


async def analyze_for_triage(
    user_input: str,
    business_context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze user input for the 4 required constraints.

    Returns:
        Dict with ready, constraints, missing, questions, and enhanced_query
    """
    messages = []

    # Add business context as background info only (NOT for filling constraints)
    if business_context:
        messages.append({
            "role": "system",
            "content": f"""BACKGROUND INFO ONLY (do NOT use this to fill in constraints - ask the user):
{business_context}

This is just so you understand the business. You must still ask the user about WHO/GOAL/BUDGET/RISK for their specific question."""
        })

    messages.append({
        "role": "user",
        "content": TRIAGE_PROMPT + user_input
    })

    response = await query_model(TRIAGE_MODEL, messages, timeout=30.0)

    if response is None:
        # Fallback: assume ready if triage fails
        return {
            "ready": True,
            "constraints": {"who": None, "goal": None, "budget": None, "risk": None},
            "missing": [],
            "questions": None,
            "enhanced_query": user_input,
            "error": "Triage analysis failed, proceeding with original query"
        }

    # Parse the JSON response
    content = response.get('content', '')

    try:
        # Extract JSON from the response (handle markdown code blocks)
        if '```json' in content:
            json_str = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            json_str = content.split('```')[1].split('```')[0].strip()
        else:
            json_str = content.strip()

        result = json.loads(json_str)

        # Ensure all required fields exist
        result.setdefault('ready', False)
        result.setdefault('constraints', {})
        result.setdefault('missing', [])
        result.setdefault('questions', None)
        result.setdefault('enhanced_query', user_input)

        return result

    except json.JSONDecodeError:
        # If JSON parsing fails, try to be helpful
        return {
            "ready": False,
            "constraints": {"who": None, "goal": None, "budget": None, "risk": None},
            "missing": ["who", "goal", "budget", "risk"],
            "questions": "I'd like to understand your question better. Could you tell me:\n\n1. **Who** will execute this? (You as founder, your developer, or someone else?)\n2. **Goal**: Is this about immediate cash flow or building long-term value?\n3. **Budget**: Do you have money to spend, or must this be $0?\n4. **Risk**: Can we prioritize speed, or is quality non-negotiable?",
            "enhanced_query": user_input
        }


async def continue_triage(
    original_query: str,
    previous_constraints: Dict[str, Any],
    user_response: str,
    business_context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Continue triage conversation with additional user input.

    Args:
        original_query: The original user question
        previous_constraints: Previously extracted constraints
        user_response: User's response to triage questions
        business_context: Optional business context

    Returns:
        Updated triage result
    """
    context = f"""Original question: {original_query}

Previously extracted constraints:
- WHO: {previous_constraints.get('who', 'Not specified')}
- GOAL: {previous_constraints.get('goal', 'Not specified')}
- BUDGET: {previous_constraints.get('budget', 'Not specified')}
- RISK: {previous_constraints.get('risk', 'Not specified')}
"""

    prompt = FOLLOWUP_PROMPT.format(context=context, response=user_response)

    messages = []

    if business_context:
        messages.append({
            "role": "system",
            "content": f"""BACKGROUND INFO ONLY (do NOT use this to fill in constraints):
{business_context}

Only use constraints the user has explicitly stated in their responses."""
        })

    messages.append({
        "role": "user",
        "content": prompt
    })

    response = await query_model(TRIAGE_MODEL, messages, timeout=30.0)

    if response is None:
        # Merge what we have and proceed
        return {
            "ready": True,
            "constraints": previous_constraints,
            "missing": [],
            "questions": None,
            "enhanced_query": f"{original_query}\n\nAdditional context: {user_response}",
            "error": "Follow-up analysis failed, proceeding with available information"
        }

    content = response.get('content', '')

    try:
        if '```json' in content:
            json_str = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            json_str = content.split('```')[1].split('```')[0].strip()
        else:
            json_str = content.strip()

        result = json.loads(json_str)
        result.setdefault('ready', False)
        result.setdefault('constraints', previous_constraints)
        result.setdefault('missing', [])
        result.setdefault('questions', None)
        result.setdefault('enhanced_query', original_query)

        return result

    except json.JSONDecodeError:
        # Assume we have enough, proceed
        return {
            "ready": True,
            "constraints": previous_constraints,
            "missing": [],
            "questions": None,
            "enhanced_query": f"{original_query}\n\nAdditional context: {user_response}"
        }
