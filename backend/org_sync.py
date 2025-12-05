"""Organization structure sync utility.

This module keeps the company context.md synchronized with the config.json
org structure (departments and roles). It generates an auto-managed section
that reflects the current organizational structure.
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

# Base directory for business contexts
CONTEXTS_DIR = Path(__file__).parent.parent / "councils" / "organisations"

# Markers for the auto-generated section
ORG_SECTION_START = "<!-- AUTO-GENERATED: ORGANIZATION STRUCTURE - DO NOT EDIT MANUALLY -->"
ORG_SECTION_END = "<!-- END AUTO-GENERATED: ORGANIZATION STRUCTURE -->"


def load_business_config(business_id: str) -> Optional[Dict[str, Any]]:
    """Load the config.json for a business."""
    config_file = CONTEXTS_DIR / business_id / "config.json"

    if not config_file.exists():
        return None

    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading config for {business_id}: {e}")
        return None


def generate_org_structure_markdown(config: Dict[str, Any]) -> str:
    """
    Generate the markdown content for the organization structure section.

    Args:
        config: The business config.json contents

    Returns:
        Formatted markdown string for the org structure
    """
    departments = config.get('departments', [])

    if not departments:
        return ""

    today = datetime.now().strftime("%Y-%m-%d")

    lines = [
        ORG_SECTION_START,
        "",
        "## 14. Organization Structure",
        "",
        f"> Auto-synced from config.json on {today}",
        "",
        "### 14.1 Departments & Roles",
        "",
        "| Department | Roles |",
        "|------------|-------|",
    ]

    for dept in departments:
        dept_name = dept.get('name', dept.get('id', 'Unknown'))
        roles = dept.get('roles', [])

        if roles:
            role_names = [r.get('name', r.get('id', '')) for r in roles]
            roles_str = ", ".join(role_names)
        else:
            roles_str = "*No roles defined*"

        lines.append(f"| {dept_name} | {roles_str} |")

    lines.append("")
    lines.append("### 14.2 Department Details")
    lines.append("")

    for dept in departments:
        dept_name = dept.get('name', dept.get('id', 'Unknown'))
        dept_desc = dept.get('description', '')
        roles = dept.get('roles', [])

        lines.append(f"**{dept_name}**")
        if dept_desc:
            lines.append(f": {dept_desc}")
        lines.append("")

        if roles:
            for role in roles:
                role_name = role.get('name', role.get('id', ''))
                role_desc = role.get('description', '')
                if role_desc:
                    lines.append(f"- **{role_name}** - {role_desc}")
                else:
                    lines.append(f"- **{role_name}**")
            lines.append("")

    lines.append(ORG_SECTION_END)

    return "\n".join(lines)


def sync_org_structure_to_context(business_id: str) -> Dict[str, Any]:
    """
    Sync the organization structure from config.json to context.md.

    This function:
    1. Reads the current config.json
    2. Generates the org structure markdown
    3. Updates context.md with the new section (replacing existing if present)
    4. Updates the "Last Updated" date in context.md

    Args:
        business_id: The business folder ID

    Returns:
        Dict with success status and message
    """
    config = load_business_config(business_id)

    if not config:
        return {
            'success': False,
            'message': f"Could not load config for business '{business_id}'"
        }

    context_file = CONTEXTS_DIR / business_id / "context.md"

    if not context_file.exists():
        return {
            'success': False,
            'message': f"Context file not found for business '{business_id}'"
        }

    try:
        content = context_file.read_text(encoding='utf-8')

        # Generate new org structure section
        org_section = generate_org_structure_markdown(config)

        # Check if auto-generated section already exists
        if ORG_SECTION_START in content:
            # Replace existing section
            pattern = re.escape(ORG_SECTION_START) + r'.*?' + re.escape(ORG_SECTION_END)
            content = re.sub(pattern, org_section, content, flags=re.DOTALL)
        else:
            # Find where to insert (before Appendices if present, otherwise at end)
            appendix_match = re.search(r'\n## Appendices\b', content)

            if appendix_match:
                # Insert before Appendices
                insert_pos = appendix_match.start()
                content = content[:insert_pos] + "\n" + org_section + "\n" + content[insert_pos:]
            else:
                # Append at end (before final note if present)
                final_note_match = re.search(r'\n\*Document maintained by', content)
                if final_note_match:
                    insert_pos = final_note_match.start()
                    content = content[:insert_pos] + "\n" + org_section + "\n" + content[insert_pos:]
                else:
                    # Just append at end
                    content = content.rstrip() + "\n\n" + org_section + "\n"

        # Update the Last Updated date at the top
        today = datetime.now().strftime("%Y-%m-%d")
        content = re.sub(
            r'>\s*\*\*Last Updated:\*\*\s*[\d-]+',
            f'> **Last Updated:** {today}',
            content
        )

        # Write back
        context_file.write_text(content, encoding='utf-8')

        return {
            'success': True,
            'message': f"Organization structure synced successfully for '{business_id}'",
            'updated_at': today
        }

    except Exception as e:
        return {
            'success': False,
            'message': f"Error syncing org structure: {str(e)}"
        }


def add_role_to_department(
    business_id: str,
    department_id: str,
    role_id: str,
    role_name: str,
    role_description: str = ""
) -> Dict[str, Any]:
    """
    Add a new role to a department and sync to context.md.

    Args:
        business_id: The business folder ID
        department_id: The department to add the role to
        role_id: The role ID (lowercase, hyphenated)
        role_name: The display name for the role
        role_description: Optional description of the role

    Returns:
        Dict with success status and message
    """
    config_file = CONTEXTS_DIR / business_id / "config.json"

    if not config_file.exists():
        return {
            'success': False,
            'message': f"Config not found for business '{business_id}'"
        }

    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)

        # Find the department
        dept_found = False
        for dept in config.get('departments', []):
            if dept.get('id') == department_id:
                dept_found = True

                # Check if role already exists
                roles = dept.setdefault('roles', [])
                existing_ids = [r.get('id') for r in roles]

                if role_id in existing_ids:
                    return {
                        'success': False,
                        'message': f"Role '{role_id}' already exists in department '{department_id}'"
                    }

                # Add the new role
                new_role = {
                    'id': role_id,
                    'name': role_name,
                    'description': role_description
                }
                roles.append(new_role)
                break

        if not dept_found:
            return {
                'success': False,
                'message': f"Department '{department_id}' not found"
            }

        # Save config
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

        # Sync to context.md
        sync_result = sync_org_structure_to_context(business_id)

        if sync_result['success']:
            return {
                'success': True,
                'message': f"Role '{role_name}' added to {department_id} and synced to context",
                'role': new_role
            }
        else:
            return {
                'success': True,
                'message': f"Role '{role_name}' added to config but sync failed: {sync_result['message']}",
                'role': new_role,
                'sync_warning': sync_result['message']
            }

    except Exception as e:
        return {
            'success': False,
            'message': f"Error adding role: {str(e)}"
        }


def add_department(
    business_id: str,
    department_id: str,
    department_name: str,
    department_description: str = "",
    roles: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Add a new department to a business and sync to context.md.

    Args:
        business_id: The business folder ID
        department_id: The department ID (lowercase, hyphenated)
        department_name: The display name for the department
        department_description: Optional description
        roles: Optional list of roles [{'id': '', 'name': '', 'description': ''}, ...]

    Returns:
        Dict with success status and message
    """
    config_file = CONTEXTS_DIR / business_id / "config.json"

    if not config_file.exists():
        return {
            'success': False,
            'message': f"Config not found for business '{business_id}'"
        }

    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)

        # Check if department already exists
        existing_ids = [d.get('id') for d in config.get('departments', [])]

        if department_id in existing_ids:
            return {
                'success': False,
                'message': f"Department '{department_id}' already exists"
            }

        # Create new department
        new_dept = {
            'id': department_id,
            'name': department_name,
            'description': department_description or f"{department_name} department",
            'roles': roles or []
        }

        config.setdefault('departments', []).append(new_dept)

        # Save config
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

        # Sync to context.md
        sync_result = sync_org_structure_to_context(business_id)

        if sync_result['success']:
            return {
                'success': True,
                'message': f"Department '{department_name}' added and synced to context",
                'department': new_dept
            }
        else:
            return {
                'success': True,
                'message': f"Department '{department_name}' added but sync failed: {sync_result['message']}",
                'department': new_dept,
                'sync_warning': sync_result['message']
            }

    except Exception as e:
        return {
            'success': False,
            'message': f"Error adding department: {str(e)}"
        }
