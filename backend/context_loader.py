"""Business context loader for multi-tenant AI Council."""

import os
from pathlib import Path
from typing import Optional, List, Dict

# Base directory for business contexts (within councils structure)
CONTEXTS_DIR = Path(__file__).parent.parent / "councils" / "organisations"


def list_available_businesses() -> List[Dict[str, str]]:
    """
    List all available business contexts.

    Returns:
        List of dicts with 'id' and 'name' for each business
    """
    businesses = []

    if not CONTEXTS_DIR.exists():
        return businesses

    for item in CONTEXTS_DIR.iterdir():
        if item.is_dir() and not item.name.startswith('_'):
            # Try to get a friendly name from the context file
            context_file = item / "context.md"
            name = item.name.replace('-', ' ').title()

            if context_file.exists():
                # Try to extract name from first heading
                try:
                    with open(context_file, 'r', encoding='utf-8') as f:
                        first_line = f.readline().strip()
                        if first_line.startswith('# '):
                            # Extract name, remove " - Business Context" suffix if present
                            name = first_line[2:].split(' - ')[0].strip()
                except Exception:
                    pass

            businesses.append({
                'id': item.name,
                'name': name
            })

    return sorted(businesses, key=lambda x: x['name'])


def load_business_context(business_id: str) -> Optional[str]:
    """
    Load the context for a specific business.

    Args:
        business_id: The folder name of the business (e.g., 'simple-af-jobs')

    Returns:
        The combined context as a string, or None if not found
    """
    business_dir = CONTEXTS_DIR / business_id

    if not business_dir.exists():
        return None

    context_file = business_dir / "context.md"

    if not context_file.exists():
        return None

    try:
        with open(context_file, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading context for {business_id}: {e}")
        return None


def get_system_prompt_with_context(
    business_id: Optional[str] = None,
    department_id: Optional[str] = None,
    channel_id: Optional[str] = None,
    style_id: Optional[str] = None
) -> Optional[str]:
    """
    Generate a system prompt that includes business context.

    Args:
        business_id: The business to load context for, or None for no context
        department_id: Optional department persona (future use)
        channel_id: Optional channel context (future use)
        style_id: Optional writing style (future use)

    Returns:
        System prompt string with business context, or None if no context
    """
    # Note: department_id, channel_id, style_id are accepted but not yet implemented
    # They're included for compatibility with streaming functions

    if not business_id:
        return None

    context = load_business_context(business_id)

    if not context:
        return None

    system_prompt = f"""You are an AI advisor participating in an AI Council. You are helping make decisions for a specific business. Read the business context carefully and ensure all your advice is relevant and appropriate for this company's situation, priorities, and constraints.

=== BUSINESS CONTEXT ===

{context}

=== END BUSINESS CONTEXT ===

When responding:
1. Consider the business's stated priorities and constraints
2. Be practical given their current stage and resources
3. Reference specific aspects of their business when relevant
4. Avoid generic advice that ignores their context
"""

    return system_prompt
