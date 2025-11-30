"""Context loader for multi-tenant AI Council with department, channel, and style support."""

import os
from pathlib import Path
from typing import Optional, List, Dict

# Base directories for all contexts (within councils structure)
COUNCILS_DIR = Path(__file__).parent.parent / "councils"
CONTEXTS_DIR = COUNCILS_DIR / "organisations"
DEPARTMENTS_DIR = COUNCILS_DIR / "departments"
STYLES_DIR = COUNCILS_DIR / "styles"


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


def load_department_persona(department_id: str) -> Optional[str]:
    """
    Load the persona for a specific department.

    Args:
        department_id: The department ID (e.g., 'marketing', 'sales')

    Returns:
        The persona content as a string, or None if not found
    """
    if not department_id:
        return None

    # Try to load from personas subfolder first (new structure)
    dept_dir = DEPARTMENTS_DIR / department_id
    persona_file = dept_dir / "personas" / "cmo.md"  # Default persona for now

    # Fall back to _base.md if no personas folder
    if not persona_file.exists():
        persona_file = dept_dir / "_base.md"

    if not persona_file.exists():
        return None

    try:
        with open(persona_file, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading persona for {department_id}: {e}")
        return None


def load_channel_context(department_id: str, channel_id: str) -> Optional[str]:
    """
    Load the channel-specific context for a department.

    Args:
        department_id: The department ID (e.g., 'marketing')
        channel_id: The channel ID (e.g., 'linkedin', 'x', 'email')

    Returns:
        The channel context as a string, or None if not found
    """
    if not department_id or not channel_id:
        return None

    channel_file = DEPARTMENTS_DIR / department_id / "channels" / f"{channel_id}.md"

    if not channel_file.exists():
        return None

    try:
        with open(channel_file, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading channel {channel_id} for {department_id}: {e}")
        return None


def load_style_context(style_id: str) -> Optional[str]:
    """
    Load the style/voice context.

    Args:
        style_id: The style ID (e.g., 'ann-friedman')

    Returns:
        The style context as a string, or None if not found
    """
    if not style_id:
        return None

    # Check authors subfolder first
    style_file = STYLES_DIR / "authors" / f"{style_id}.md"

    # Fall back to tones subfolder
    if not style_file.exists():
        style_file = STYLES_DIR / "tones" / f"{style_id}.md"

    if not style_file.exists():
        return None

    try:
        with open(style_file, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading style {style_id}: {e}")
        return None


def get_system_prompt_with_context(
    business_id: Optional[str] = None,
    department_id: Optional[str] = None,
    channel_id: Optional[str] = None,
    style_id: Optional[str] = None
) -> Optional[str]:
    """
    Generate a system prompt that includes all selected contexts.

    Args:
        business_id: The business to load context for, or None for no context
        department_id: The department persona to load (e.g., 'marketing')
        channel_id: The channel context to load (e.g., 'linkedin')
        style_id: The writing style to load (e.g., 'ann-friedman')

    Returns:
        System prompt string with all contexts combined, or None if no context
    """
    sections = []

    # Load department persona (this becomes the primary identity)
    persona = load_department_persona(department_id) if department_id else None
    if persona:
        sections.append(f"""=== YOUR ROLE & PERSONA ===

{persona}

=== END ROLE & PERSONA ===""")

    # Load channel-specific guidance
    channel = load_channel_context(department_id, channel_id) if channel_id and department_id else None
    if channel:
        sections.append(f"""=== CHANNEL GUIDANCE ===

{channel}

=== END CHANNEL GUIDANCE ===""")

    # Load writing style
    style = load_style_context(style_id) if style_id else None
    if style:
        sections.append(f"""=== WRITING STYLE ===

{style}

=== END WRITING STYLE ===""")

    # Load business context
    business = load_business_context(business_id) if business_id else None
    if business:
        sections.append(f"""=== BUSINESS CONTEXT ===

{business}

=== END BUSINESS CONTEXT ===""")

    # If no contexts at all, return None
    if not sections:
        return None

    # Build the system prompt
    intro = "You are an AI advisor participating in an AI Council."

    if persona:
        # If there's a persona, let it define the identity
        intro = ""

    instructions = """
When responding:
1. Stay in character according to your role and persona
2. Consider the business's stated priorities and constraints
3. Apply the channel and style guidelines when applicable
4. Be practical and specific, avoiding generic advice"""

    system_prompt = f"""{intro}

{chr(10).join(sections)}
{instructions}
"""

    return system_prompt.strip()
