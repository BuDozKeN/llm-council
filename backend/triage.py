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
TRIAGE_MODEL = "google/gemini-2.5-flash"

TRIAGE_PROMPT = """You are a triage assistant for an AI Council that advises a bootstrapped startup.

Your job is to analyze the user's question/topic and extract 4 key constraints. If any are missing or unclear, you must ask for them.

THE 4 CONSTRAINTS:

1. WHO (Executor): Who will physically execute the solution?
   - Founder (manual, limited time)
   - Developer (technical, currently bottlenecked)
   - Operator (hired help, if available)

2. GOAL (Context): What's the primary objective?
   - Survival: Need cash flow NOW to extend runway
   - Exit Value: Building IP/metrics for future $5M exit

3. BUDGET: What can be spent on this?
   - $0: Must use existing tools/resources only
   - Investment: Willing to spend $X amount

4. RISK (Quality Trade-off): What's the quality constraint?
   - Speed: Can sacrifice quality for velocity
   - Defensibility: Cannot compromise quality (e.g., "litigation-proof" is non-negotiable)

ANALYSIS INSTRUCTIONS:

Analyze the user's input and respond with a JSON object:

{
  "ready": true/false,
  "constraints": {
    "who": "extracted value or null",
    "goal": "extracted value or null",
    "budget": "extracted value or null",
    "risk": "extracted value or null"
  },
  "missing": ["list of missing constraint names"],
  "questions": "If not ready, a friendly message asking for the missing information. Be specific about what you need.",
  "enhanced_query": "If ready, the original query enhanced with the extracted constraints for the council."
}

IMPORTANT:
- Be generous in interpretation - if the user implies something, extract it
- Only mark as missing if truly unclear
- Your questions should be conversational and specific to their topic
- The enhanced_query should preserve their original question but add context

USER INPUT TO ANALYZE:
"""

FOLLOWUP_PROMPT = """You are continuing a triage conversation. The user has provided additional information.

Previous context:
{context}

New user response:
{response}

Re-analyze with the new information and respond with the same JSON format:

{
  "ready": true/false,
  "constraints": {
    "who": "extracted value or null",
    "goal": "extracted value or null",
    "budget": "extracted value or null",
    "risk": "extracted value or null"
  },
  "missing": ["list of missing constraint names"],
  "questions": "If not ready, ask for remaining missing information.",
  "enhanced_query": "If ready, combine all information into an enhanced query for the council."
}
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

    # Add business context if available
    if business_context:
        messages.append({
            "role": "system",
            "content": f"Business context for reference:\n{business_context}"
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
            "content": f"Business context for reference:\n{business_context}"
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
