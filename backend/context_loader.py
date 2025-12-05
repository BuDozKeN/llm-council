"""Business context loader for multi-tenant AI Council."""

import os
import json
from pathlib import Path
from typing import Optional, List, Dict, Any

# Base directory for business contexts (within councils structure)
CONTEXTS_DIR = Path(__file__).parent.parent / "councils" / "organisations"

# Project root for accessing CLAUDE.md
PROJECT_ROOT = Path(__file__).parent.parent


def load_technical_documentation() -> Optional[str]:
    """
    Load CLAUDE.md technical documentation from project root.
    This is automatically injected into Technology department context.

    Returns:
        The CLAUDE.md content, or None if not found
    """
    claude_md = PROJECT_ROOT / "CLAUDE.md"

    if not claude_md.exists():
        return None

    try:
        return claude_md.read_text(encoding='utf-8')
    except Exception as e:
        print(f"Error loading CLAUDE.md: {e}")
        return None


def load_business_config(business_id: str) -> Optional[Dict[str, Any]]:
    """
    Load the config.json for a specific business.

    Args:
        business_id: The folder name of the business (e.g., 'simple-af')

    Returns:
        The config dict, or None if not found
    """
    business_dir = CONTEXTS_DIR / business_id
    config_file = business_dir / "config.json"

    if not config_file.exists():
        return None

    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading config for {business_id}: {e}")
        return None


def list_available_businesses() -> List[Dict[str, Any]]:
    """
    List all available business contexts with their configurations.

    Returns:
        List of dicts with 'id', 'name', 'departments', 'styles' for each business
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

            # Load config if available
            config = load_business_config(item.name)

            # Filter departments to only include those with actual content
            all_departments = config.get('departments', []) if config else []
            active_departments = [
                dept for dept in all_departments
                if department_has_content(item.name, dept.get('id', ''))
            ]

            business_entry = {
                'id': item.name,
                'name': name,
                'departments': active_departments,
                'styles': config.get('styles', []) if config else []
            }

            businesses.append(business_entry)

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


def department_has_content(business_id: str, department_id: str) -> bool:
    """
    Check if a department has substantive content (not just empty template).

    Args:
        business_id: The folder name of the business
        department_id: The department ID

    Returns:
        True if department has real content, False if empty/template only
    """
    department_dir = CONTEXTS_DIR / business_id / "departments" / department_id
    context_file = department_dir / "context.md"

    if not context_file.exists():
        return False

    try:
        content = context_file.read_text(encoding='utf-8')

        # Check for template-only indicators
        template_phrases = [
            "*To be populated via Knowledge Curator*",
            "*Department-specific knowledge will be curated here*",
        ]

        # Remove common template sections and check what's left
        lines = content.split('\n')
        substantive_lines = 0

        for line in lines:
            line = line.strip()
            # Skip empty lines, headers, metadata, and template placeholders
            if not line:
                continue
            if line.startswith('#'):
                continue
            if line.startswith('>'):
                continue
            if line.startswith('---'):
                continue
            if line.startswith('*') and line.endswith('*'):
                continue
            if any(phrase in line for phrase in template_phrases):
                continue
            # Skip simple role listings like "- **CTO** -"
            if line.startswith('- **') and line.count('**') == 2 and ':' not in line:
                continue

            # This looks like real content
            substantive_lines += 1

        # Require at least 3 lines of real content
        return substantive_lines >= 3

    except Exception:
        return False


def load_department_context(business_id: str, department_id: str) -> Optional[str]:
    """
    Load the context for a specific department within a business.

    Args:
        business_id: The folder name of the business (e.g., 'axcouncil')
        department_id: The department ID (e.g., 'technology', 'marketing')

    Returns:
        The department context as a string, or None if not found
    """
    department_dir = CONTEXTS_DIR / business_id / "departments" / department_id
    context_file = department_dir / "context.md"

    if not context_file.exists():
        return None

    try:
        with open(context_file, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading department context for {business_id}/{department_id}: {e}")
        return None


def get_department_info(business_id: str, department_id: str) -> Optional[Dict[str, Any]]:
    """
    Get department info including roles from config.

    Args:
        business_id: The folder name of the business
        department_id: The department ID

    Returns:
        Department dict with id, name, description, roles, or None if not found
    """
    config = load_business_config(business_id)
    if not config:
        return None

    for dept in config.get('departments', []):
        if dept.get('id') == department_id:
            return dept

    return None


def get_role_info(business_id: str, department_id: str, role_id: str) -> Optional[Dict[str, Any]]:
    """
    Get role info from the department config.

    Args:
        business_id: The folder name of the business
        department_id: The department ID
        role_id: The role ID

    Returns:
        Role dict with id, name, description, or None if not found
    """
    dept_info = get_department_info(business_id, department_id)
    if not dept_info:
        return None

    for role in dept_info.get('roles', []):
        if role.get('id') == role_id:
            return role

    return None


def get_system_prompt_with_context(
    business_id: Optional[str] = None,
    department_id: Optional[str] = None,
    channel_id: Optional[str] = None,
    style_id: Optional[str] = None,
    role_id: Optional[str] = None
) -> Optional[str]:
    """
    Generate a system prompt that includes business and department context.

    Args:
        business_id: The business to load context for, or None for no context
        department_id: Optional department to load specific context for
        channel_id: Optional channel context (future use)
        style_id: Optional writing style (future use)
        role_id: Optional role within department for persona injection

    Returns:
        System prompt string with business and department context, or None if no context
    """
    if not business_id:
        return None

    # Load company-level context
    company_context = load_business_context(business_id)

    if not company_context:
        return None

    # Check if a specific role is selected for persona injection
    role_info = None
    if role_id and department_id:
        role_info = get_role_info(business_id, department_id, role_id)

    # Build the system prompt - customize intro based on role
    if role_info:
        role_name = role_info.get('name', role_id)
        role_desc = role_info.get('description', '')
        system_prompt = f"""You are the {role_name} for this company. You are participating in an AI Council as a council of {role_name}s - multiple AI models responding as {role_name}s to give diverse perspectives on the same question.

Your role: {role_desc}

Respond from the perspective of a {role_name}. Focus on the aspects of this question that are most relevant to your role and expertise. Be practical and actionable while staying within your domain of responsibility.

Read the business context carefully and ensure all your advice is relevant and appropriate for this company's situation, priorities, and constraints.

=== COMPANY CONTEXT ===

"""
    else:
        system_prompt = """You are an AI advisor participating in an AI Council. You are helping make decisions for a specific business. Read the business context carefully and ensure all your advice is relevant and appropriate for this company's situation, priorities, and constraints.

=== COMPANY CONTEXT ===

"""
    system_prompt += company_context
    system_prompt += "\n\n=== END COMPANY CONTEXT ===\n"

    # Dynamically inject active departments info
    config = load_business_config(business_id)
    if config:
        all_departments = config.get('departments', [])
        active_departments = [
            dept for dept in all_departments
            if department_has_content(business_id, dept.get('id', ''))
        ]

        if active_departments:
            system_prompt += "\n=== ACTIVE DEPARTMENTS ===\n\n"
            system_prompt += "This company currently has the following active departments with populated knowledge bases:\n\n"
            system_prompt += "| Department | Description |\n"
            system_prompt += "|------------|-------------|\n"
            for dept in active_departments:
                dept_name = dept.get('name', dept.get('id', ''))
                dept_desc = dept.get('description', 'No description')
                system_prompt += f"| {dept_name} | {dept_desc} |\n"
            system_prompt += "\n=== END ACTIVE DEPARTMENTS ===\n"

    # Load department-specific context if department is specified
    if department_id:
        dept_context = load_department_context(business_id, department_id)
        dept_info = get_department_info(business_id, department_id)

        # Auto-inject CLAUDE.md for Technology department
        if department_id == "technology":
            tech_docs = load_technical_documentation()
            if tech_docs:
                system_prompt += "\n=== TECHNICAL DOCUMENTATION (Auto-synced from CLAUDE.md) ===\n\n"
                system_prompt += "This documentation is automatically loaded from the project's CLAUDE.md file.\n"
                system_prompt += "It reflects the current technical architecture and implementation details.\n\n"
                system_prompt += tech_docs
                system_prompt += "\n\n=== END TECHNICAL DOCUMENTATION ===\n"

        if dept_info:
            dept_name = dept_info.get('name', department_id)
            dept_desc = dept_info.get('description', '')
            roles = dept_info.get('roles', [])

            system_prompt += f"\n=== DEPARTMENT: {dept_name.upper()} ===\n"
            if dept_desc:
                system_prompt += f"\n{dept_desc}\n"

            if roles:
                system_prompt += "\nAvailable Roles:\n"
                for role in roles:
                    role_name = role.get('name', '')
                    role_desc = role.get('description', '')
                    system_prompt += f"- {role_name}: {role_desc}\n"

            if dept_context:
                system_prompt += f"\n{dept_context}\n"

            system_prompt += f"\n=== END {dept_name.upper()} DEPARTMENT ===\n"

    system_prompt += """
When responding:
1. Consider the business's stated priorities and constraints
2. Be practical given their current stage and resources
3. Reference specific aspects of their business when relevant
4. Avoid generic advice that ignores their context
"""

    # Add role-specific guidance if a specific role is selected
    if role_info:
        role_name = role_info.get('name', role_id)
        system_prompt += f"5. Respond AS the {role_name} - stay in character and focus on your role's responsibilities\n"
        system_prompt += f"6. Bring your unique perspective as {role_name} to this question\n"
    # Add department-specific guidance if applicable (but no specific role)
    elif department_id:
        system_prompt += f"5. Focus your advice from the perspective of the {department_id.replace('-', ' ').title()} department\n"

    return system_prompt


def create_department_for_business(business_id: str, department_id: str, department_name: str) -> Dict[str, Any]:
    """
    Create a new department for a business.

    This function:
    1. Creates the department folder structure
    2. Creates an initial context.md template
    3. Updates the config.json to include the new department
    4. Syncs the org structure to context.md

    Args:
        business_id: The business folder ID
        department_id: The department ID (lowercase, hyphenated)
        department_name: The display name for the department

    Returns:
        Dict with success status, department_id, and message

    Raises:
        ValueError: If business doesn't exist or department already exists
    """
    from datetime import datetime
    from .org_sync import sync_org_structure_to_context

    business_dir = CONTEXTS_DIR / business_id

    if not business_dir.exists():
        raise ValueError(f"Business '{business_id}' does not exist")

    # Create department directory
    department_dir = business_dir / "departments" / department_id

    if department_dir.exists():
        raise ValueError(f"Department '{department_id}' already exists for business '{business_id}'")

    # Create the directory
    department_dir.mkdir(parents=True, exist_ok=True)

    # Create initial context.md template
    today = datetime.now().strftime("%Y-%m-%d")
    context_content = f"""# {department_name} Department Context

> Last updated: {today}

## Overview

*Department-specific knowledge will be curated here via the Knowledge Curator.*

## Key Information

*To be populated via Knowledge Curator*

---

*This department context was created on {today}.*
"""

    context_file = department_dir / "context.md"
    context_file.write_text(context_content, encoding='utf-8')

    # Update config.json to include the new department
    config_file = business_dir / "config.json"

    if config_file.exists():
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
    else:
        config = {"departments": [], "styles": []}

    # Check if department already in config
    existing_ids = [d.get('id') for d in config.get('departments', [])]
    if department_id not in existing_ids:
        new_dept = {
            "id": department_id,
            "name": department_name,
            "description": f"{department_name} department knowledge base"
        }
        config.setdefault('departments', []).append(new_dept)

        # Write updated config
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

    # Sync org structure to context.md
    sync_result = sync_org_structure_to_context(business_id)

    return {
        "success": True,
        "department_id": department_id,
        "message": f"Department '{department_name}' created successfully",
        "org_sync": sync_result.get('success', False)
    }
