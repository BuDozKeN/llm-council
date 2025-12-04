"""
Knowledge Curator for AI Council.

Analyzes conversations and suggests updates to business context files.
Maintains structured, section-aware knowledge management.
Updated: 2025-12-05
"""

import re
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from .openrouter import query_model
from .context_loader import CONTEXTS_DIR
from .config import CHAIRMAN_MODEL


def parse_context_sections(content: str) -> List[Dict[str, Any]]:
    """
    Parse a markdown context file into sections with metadata.

    Returns list of sections with:
    - heading: The section heading text
    - level: Heading level (1-6)
    - content: The text content under this heading
    - line_start: Starting line number
    - line_end: Ending line number
    """
    lines = content.split('\n')
    sections = []
    current_section = None

    for i, line in enumerate(lines):
        # Match markdown headings
        heading_match = re.match(r'^(#{1,6})\s+(.+)$', line)

        if heading_match:
            # Save previous section if exists
            if current_section:
                current_section['line_end'] = i - 1
                current_section['content'] = '\n'.join(
                    lines[current_section['line_start']:i]
                ).strip()
                sections.append(current_section)

            # Start new section
            level = len(heading_match.group(1))
            heading = heading_match.group(2).strip()
            current_section = {
                'heading': heading,
                'level': level,
                'line_start': i,
                'line_end': None,
                'content': ''
            }

    # Don't forget the last section
    if current_section:
        current_section['line_end'] = len(lines) - 1
        current_section['content'] = '\n'.join(
            lines[current_section['line_start']:]
        ).strip()
        sections.append(current_section)

    return sections


def extract_last_updated(content: str) -> Optional[str]:
    """Extract the 'Last Updated' date from context content."""
    match = re.search(r'\*\*Last Updated:\*\*\s*(\d{4}-\d{2}-\d{2})', content)
    if match:
        return match.group(1)
    return None


def build_section_summary(sections: List[Dict[str, Any]]) -> str:
    """Build a human-readable summary of sections for the LLM."""
    summary_lines = []
    for section in sections:
        indent = "  " * (section['level'] - 1)
        # Truncate content for summary
        content_preview = section['content'][:200].replace('\n', ' ')
        if len(section['content']) > 200:
            content_preview += "..."
        summary_lines.append(f"{indent}• {section['heading']}")
    return '\n'.join(summary_lines)


def format_conversation_for_analysis(conversation: Dict[str, Any]) -> str:
    """Format a conversation into readable text for the curator."""
    formatted_parts = []

    for msg in conversation.get('messages', []):
        if msg.get('role') == 'user':
            formatted_parts.append(f"USER: {msg.get('content', '')}")
        elif msg.get('role') == 'assistant':
            # Get the final answer from stage3
            stage3 = msg.get('stage3', {})
            response = stage3.get('response') or stage3.get('content', '')
            if response:
                formatted_parts.append(f"AI COUNCIL ANSWER: {response}")

    return '\n\n'.join(formatted_parts)


async def analyze_conversation_for_updates(
    conversation: Dict[str, Any],
    business_id: str,
    department_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze a conversation and suggest updates to the business context.

    Args:
        conversation: The conversation to analyze
        business_id: The business whose context to update
        department_id: Optional department to focus on

    Returns:
        Dict with 'suggestions' list and 'analyzed_at' timestamp
    """
    # Load current context
    context_file = CONTEXTS_DIR / business_id / "context.md"
    if not context_file.exists():
        return {
            'suggestions': [],
            'error': 'Business context file not found',
            'analyzed_at': datetime.now().isoformat()
        }

    context_content = context_file.read_text(encoding='utf-8')
    sections = parse_context_sections(context_content)
    last_updated = extract_last_updated(context_content)
    section_summary = build_section_summary(sections)

    # Format conversation for analysis
    conversation_text = format_conversation_for_analysis(conversation)

    if not conversation_text.strip():
        return {
            'suggestions': [],
            'message': 'No conversation content to analyze',
            'analyzed_at': datetime.now().isoformat()
        }

    # Build the curator prompt
    prompt = f"""You are a Knowledge Curator for a business context document. Your job is to analyze a conversation and identify information that should be added to or updated in the business knowledge base.

CURRENT BUSINESS CONTEXT STRUCTURE:
The document has the following sections:
{section_summary}

Last Updated: {last_updated or 'Unknown'}

CONVERSATION TO ANALYZE:
{conversation_text}

CURRENT FULL CONTEXT:
{context_content[:8000]}{'...[truncated]' if len(context_content) > 8000 else ''}

YOUR TASK:
1. Identify any NEW information from the conversation that should be stored in the knowledge base
2. Identify any information that CONTRADICTS or UPDATES existing information
3. For each finding, determine which DEPARTMENT this belongs to:
   - "company" = Company-wide information (general strategy, company overview, financials)
   - "marketing" = Marketing strategies, campaigns, channels, content
   - "sales" = Sales processes, pipelines, customer acquisition
   - "cto" = Technical decisions, architecture, development
   - "operations" = Operations, processes, workflows
4. For each finding, specify the section name and format the proposed_text as CLEAN, READABLE TEXT

FORMATTING RULES FOR proposed_text:
- Start with a clear TITLE on its own line (e.g., "10.7 AI Departments Strategy")
- Write in plain, simple English - no jargon or technical formatting
- Use bullet points with "•" for lists when helpful
- Add blank lines between paragraphs for readability
- Keep it conversational and easy to read
- A busy person should understand it in 10 seconds
- NO markdown formatting (no **, no ###, no tables, no pipes)

Respond in JSON format ONLY. No other text. Use this exact structure:
{{
  "suggestions": [
    {{
      "section": "Section Name",
      "type": "update",
      "department": "company",
      "current_text": "The existing text that needs updating",
      "proposed_text": "10.7 AI Departments Strategy\n\nWe decided to build virtual AI departments within AxCouncil rather than hiring human staff. The founder will use AxCouncil itself to create internal departments that provide hands-on guidance.\n\nWhy this approach works:\n• Keeps us as a solo founder operation\n• No extra cost beyond what we already pay for AI\n• We get to use our own product every day\n\nThe departments include:\n• Advisory Council for big-picture strategy\n• CTO Council for writing code and technical work\n• CMO Council for marketing copy and campaigns",
      "reason": "Why this update is important"
    }},
    {{
      "section": "New Section Name",
      "type": "add",
      "department": "marketing",
      "current_text": null,
      "proposed_text": "Campaign Strategy Q1 2025\n\nWe're planning to launch an awareness campaign for the AI Council product.\n\nWhere we'll promote it:\n• LinkedIn posts\n• Twitter/X threads\n• YouTube explainer videos\n\nWhat we want people to know:\n• AI helps you make better decisions\n• Less mental load for busy founders",
      "reason": "Why this should be added",
      "after_section": "Section Name to insert after"
    }}
  ],
  "summary": "Brief one-sentence summary of findings"
}}

If there are no updates needed, return: {{"suggestions": [], "summary": "No actionable updates found in this conversation."}}

Important:
- Only suggest updates for FACTUAL business information (numbers, dates, strategies, decisions)
- Do NOT suggest updating general descriptions or static content
- Focus on information that would become outdated or incorrect if not updated
- Be conservative - only suggest changes that are clearly warranted by the conversation
- ALWAYS include the "department" field to indicate where this should be saved"""

    # Query the LLM
    messages = [
        {"role": "user", "content": prompt}
    ]

    response = await query_model(CHAIRMAN_MODEL, messages, timeout=60.0)

    if not response or not response.get('content'):
        return {
            'suggestions': [],
            'error': 'Failed to get response from curator model',
            'analyzed_at': datetime.now().isoformat()
        }

    # Parse the JSON response
    try:
        content = response['content'].strip()
        # Handle markdown code blocks
        if content.startswith('```'):
            content = re.sub(r'^```(?:json)?\n?', '', content)
            content = re.sub(r'\n?```$', '', content)

        # Fix common JSON issues from LLMs
        # Remove trailing commas before } or ]
        content = re.sub(r',(\s*[}\]])', r'\1', content)

        # Try parsing with strict=False first (allows control chars in strings)
        try:
            decoder = json.JSONDecoder(strict=False)
            result, _ = decoder.raw_decode(content)
        except json.JSONDecodeError:
            # If that fails, try more aggressive cleaning
            # Remove all control characters except structural whitespace
            cleaned = []
            in_string = False
            escape_next = False
            for char in content:
                if escape_next:
                    cleaned.append(char)
                    escape_next = False
                    continue
                if char == '\\' and in_string:
                    cleaned.append(char)
                    escape_next = True
                    continue
                if char == '"' and not escape_next:
                    in_string = not in_string
                    cleaned.append(char)
                    continue

                # Inside strings, replace control chars with space
                if in_string:
                    if ord(char) < 32 and char not in '\t':
                        cleaned.append(' ')
                    else:
                        cleaned.append(char)
                else:
                    # Outside strings, keep structural whitespace
                    if ord(char) >= 32 or char in '\n\r\t':
                        cleaned.append(char)

            content = ''.join(cleaned)
            result = json.loads(content)
        result['analyzed_at'] = datetime.now().isoformat()
        result['business_id'] = business_id

        # Enrich suggestions with section metadata
        for suggestion in result.get('suggestions', []):
            # Find matching section
            for section in sections:
                if section['heading'].lower() == suggestion.get('section', '').lower():
                    suggestion['section_level'] = section['level']
                    suggestion['section_line'] = section['line_start']
                    break

            # Add last updated info
            suggestion['last_updated'] = last_updated

        return result

    except json.JSONDecodeError as e:
        return {
            'suggestions': [],
            'error': f'Failed to parse curator response: {str(e)}',
            'raw_response': response['content'][:500],
            'analyzed_at': datetime.now().isoformat()
        }


def get_context_file_for_department(business_id: str, department: str) -> Path:
    """
    Get the appropriate context file path based on department.

    Args:
        business_id: The business folder name
        department: The department ID ("company" for main context, or department ID)

    Returns:
        Path to the context.md file
    """
    if department == "company" or not department:
        # Company-wide context goes to main context.md
        return CONTEXTS_DIR / business_id / "context.md"
    else:
        # Department-specific context goes to departments/{dept}/context.md
        # Map common aliases to proper department IDs
        dept_mapping = {
            "cto": "technology",
            "cmo": "marketing",
            "cfo": "finance",
            "coo": "operations",
            "marketing": "marketing",
            "sales": "sales",
            "legal": "legal",
            "finance": "finance",
            "technology": "technology",
            "operations": "operations",
            "executive": "executive"
        }
        dept_id = dept_mapping.get(department.lower(), department.lower())
        return CONTEXTS_DIR / business_id / "departments" / dept_id / "context.md"


def apply_suggestion(
    business_id: str,
    suggestion: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Apply a single suggestion to the appropriate context file.

    Args:
        business_id: The business to update
        suggestion: The suggestion dict with section, type, department, proposed_text, etc.

    Returns:
        Dict with 'success' boolean and 'message'
    """
    # Determine which file to update based on department
    department = suggestion.get('department', 'company')
    context_file = get_context_file_for_department(business_id, department)

    if not context_file.exists():
        # Create the department context file if it doesn't exist
        if department != "company":
            context_file.parent.mkdir(parents=True, exist_ok=True)
            dept_name = department.replace('-', ' ').title()
            initial_content = f"""# {dept_name} Department Context

> **Last Updated:** {datetime.now().strftime('%Y-%m-%d')}
> **Organisation:** {business_id}

---

## Department Overview

*To be populated via Knowledge Curator*

## Knowledge Base

"""
            context_file.write_text(initial_content, encoding='utf-8')
        else:
            return {'success': False, 'message': 'Context file not found'}

    content = context_file.read_text(encoding='utf-8')

    suggestion_type = suggestion.get('type', 'add')
    section_name = suggestion.get('section', '')
    proposed_text = suggestion.get('proposed_text', '')
    current_text = suggestion.get('current_text')

    if suggestion_type == 'update':
        # For updates, try to find and replace the section content
        # First try exact match if current_text is provided
        if current_text and current_text in content:
            new_content = content.replace(current_text, proposed_text, 1)
        else:
            # Fallback: Find the section by heading and append the new content
            # This handles cases where the section exists but content has changed
            section_pattern = rf'^(#{1,6})\s+{re.escape(section_name)}\s*$'
            matches = list(re.finditer(section_pattern, content, re.MULTILINE))

            if matches:
                match = matches[0]
                level = len(match.group(1))

                # Find the end of this section (next heading of same or higher level)
                remaining = content[match.end():]
                next_section = re.search(rf'^#{{{1},{level}}}\s+', remaining, re.MULTILINE)

                if next_section:
                    # Replace section content up to next section
                    section_end = match.end() + next_section.start()
                    new_content = (
                        content[:match.end()].rstrip() +
                        '\n\n' + proposed_text + '\n\n' +
                        content[section_end:].lstrip()
                    )
                else:
                    # Section is at the end - replace everything after heading
                    new_content = (
                        content[:match.end()].rstrip() +
                        '\n\n' + proposed_text + '\n'
                    )
            else:
                # Section doesn't exist - treat as add
                new_content = content.rstrip() + '\n\n## ' + section_name + '\n\n' + proposed_text + '\n'
    elif suggestion_type == 'add':
        # Find the section to add after
        after_section = suggestion.get('after_section', section_name)

        # Find the section in content
        section_pattern = rf'^(#{1,6})\s+{re.escape(after_section)}\s*$'
        matches = list(re.finditer(section_pattern, content, re.MULTILINE))

        if matches:
            # Find the end of this section (next heading of same or higher level)
            match = matches[0]
            level = len(match.group(1))

            # Find next section of same or higher level
            remaining = content[match.end():]
            next_section = re.search(rf'^#{{{1},{level}}}\s+', remaining, re.MULTILINE)

            if next_section:
                insert_pos = match.end() + next_section.start()
            else:
                insert_pos = len(content)

            # Insert the new content
            new_content = (
                content[:insert_pos].rstrip() +
                '\n\n' + proposed_text + '\n\n' +
                content[insert_pos:].lstrip()
            )
        else:
            # Append to end if section not found
            new_content = content.rstrip() + '\n\n' + proposed_text + '\n'
    else:
        return {'success': False, 'message': f'Unknown suggestion type: {suggestion_type}'}

    # Update the "Last Updated" date
    today = datetime.now().strftime('%Y-%m-%d')
    new_content = re.sub(
        r'\*\*Last Updated:\*\*\s*\d{4}-\d{2}-\d{2}',
        f'**Last Updated:** {today}',
        new_content
    )

    # Write back
    try:
        context_file.write_text(new_content, encoding='utf-8')
        dept_label = department if department != "company" else "company-wide"
        return {
            'success': True,
            'message': f'Successfully applied {suggestion_type} to "{section_name}" ({dept_label} context)',
            'updated_at': today,
            'department': department,
            'file_path': str(context_file.relative_to(CONTEXTS_DIR.parent))
        }
    except Exception as e:
        return {'success': False, 'message': f'Failed to write file: {str(e)}'}


def get_section_content(business_id: str, section_name: str) -> Optional[str]:
    """Get the full content of a specific section."""
    context_file = CONTEXTS_DIR / business_id / "context.md"
    if not context_file.exists():
        return None

    content = context_file.read_text(encoding='utf-8')
    sections = parse_context_sections(content)

    for section in sections:
        if section['heading'].lower() == section_name.lower():
            return section['content']

    return None
