"""Supabase-based storage for conversations."""

from datetime import datetime
from typing import List, Dict, Any, Optional
from .database import get_supabase

# Default company ID for AxCouncil (cached after first lookup)
_default_company_id: Optional[str] = None


def get_default_company_id() -> str:
    """Get or lookup the default company ID (AxCouncil)."""
    global _default_company_id
    if _default_company_id is None:
        supabase = get_supabase()
        result = supabase.table('companies').select('id').eq('slug', 'axcouncil').execute()
        if result.data:
            _default_company_id = result.data[0]['id']
        else:
            # If AxCouncil doesn't exist, create it
            result = supabase.table('companies').insert({
                'name': 'AxCouncil',
                'slug': 'axcouncil'
            }).execute()
            _default_company_id = result.data[0]['id']
    return _default_company_id


def create_conversation(conversation_id: str, user_id: str) -> Dict[str, Any]:
    """
    Create a new conversation.

    Args:
        conversation_id: Unique identifier for the conversation
        user_id: ID of the user creating the conversation

    Returns:
        New conversation dict
    """
    supabase = get_supabase()
    now = datetime.utcnow().isoformat() + 'Z'
    company_id = get_default_company_id()

    # Insert into conversations table with user_id
    result = supabase.table('conversations').insert({
        'id': conversation_id,
        'company_id': company_id,
        'user_id': user_id,
        'title': 'New Conversation',
        'created_at': now,
        'updated_at': now,
        'archived': False
    }).execute()

    if not result.data:
        raise Exception(f"Failed to create conversation {conversation_id}")

    # Return in the format the app expects
    return {
        "id": conversation_id,
        "created_at": now,
        "last_updated": now,
        "title": "New Conversation",
        "messages": [],
        "user_id": user_id
    }


def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a conversation from storage.

    Args:
        conversation_id: Unique identifier for the conversation

    Returns:
        Conversation dict or None if not found
    """
    supabase = get_supabase()

    # Get conversation
    conv_result = supabase.table('conversations').select('*').eq('id', conversation_id).execute()

    if not conv_result.data:
        return None

    conv = conv_result.data[0]

    # Get messages for this conversation
    msg_result = supabase.table('messages').select('*').eq('conversation_id', conversation_id).order('created_at').execute()

    messages = []
    for msg in msg_result.data or []:
        if msg['role'] == 'user':
            messages.append({
                "role": "user",
                "content": msg['content']
            })
        else:
            # Assistant message
            message = {
                "role": "assistant",
                "stage1": msg.get('stage1') or [],
                "stage2": msg.get('stage2') or [],
                "stage3": msg.get('stage3') or {}
            }
            if msg.get('label_to_model'):
                message['label_to_model'] = msg['label_to_model']
            if msg.get('aggregate_rankings'):
                message['aggregate_rankings'] = msg['aggregate_rankings']
            messages.append(message)

    return {
        "id": conv['id'],
        "created_at": conv['created_at'],
        "last_updated": conv['updated_at'],
        "title": conv.get('title', 'New Conversation'),
        "archived": conv.get('archived', False),
        "messages": messages,
        "curator_history": conv.get('curator_history') or [],
        "user_id": conv.get('user_id')
    }


def save_conversation(conversation: Dict[str, Any]):
    """
    Save a conversation to storage.
    Note: This is mainly for updating metadata. Messages are saved separately.

    Args:
        conversation: Conversation dict to save
    """
    supabase = get_supabase()

    supabase.table('conversations').update({
        'title': conversation.get('title', 'New Conversation'),
        'updated_at': conversation.get('updated_at', datetime.utcnow().isoformat() + 'Z'),
        'archived': conversation.get('archived', False),
        'curator_history': conversation.get('curator_history')
    }).eq('id', conversation['id']).execute()


def list_conversations(user_id: str) -> List[Dict[str, Any]]:
    """
    List all conversations for a specific user with at least one message (metadata only).

    Args:
        user_id: ID of the user to list conversations for

    Returns:
        List of conversation metadata dicts, sorted by last_updated (newest first)
    """
    supabase = get_supabase()

    # Get all conversations for this user
    result = supabase.table('conversations').select('*').eq('user_id', user_id).order('updated_at', desc=True).execute()

    conversations = []
    for conv in result.data or []:
        # Count messages for this conversation
        msg_count_result = supabase.table('messages').select('id', count='exact').eq('conversation_id', conv['id']).execute()
        message_count = msg_count_result.count or 0

        # Skip conversations with 0 messages
        if message_count == 0:
            # Delete empty conversations
            supabase.table('conversations').delete().eq('id', conv['id']).execute()
            continue

        conversations.append({
            "id": conv['id'],
            "created_at": conv['created_at'],
            "last_updated": conv['updated_at'],
            "title": conv.get('title', 'New Conversation'),
            "message_count": message_count,
            "archived": conv.get('archived', False)
        })

    return conversations


def add_user_message(conversation_id: str, content: str, user_id: str):
    """
    Add a user message to a conversation.

    Args:
        conversation_id: Conversation identifier
        content: User message content
        user_id: ID of the user sending the message
    """
    supabase = get_supabase()
    now = datetime.utcnow().isoformat() + 'Z'

    # Insert message with user_id
    supabase.table('messages').insert({
        'conversation_id': conversation_id,
        'role': 'user',
        'content': content,
        'user_id': user_id,
        'created_at': now
    }).execute()

    # Update conversation last_updated
    supabase.table('conversations').update({
        'updated_at': now
    }).eq('id', conversation_id).execute()


def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any],
    user_id: str,
    label_to_model: Optional[Dict[str, str]] = None,
    aggregate_rankings: Optional[List[Dict[str, Any]]] = None
):
    """
    Add an assistant message with all 3 stages to a conversation.

    Args:
        conversation_id: Conversation identifier
        stage1: List of individual model responses
        stage2: List of model rankings
        stage3: Final synthesized response
        user_id: ID of the user who owns this conversation
        label_to_model: Optional mapping of anonymous labels to model names
        aggregate_rankings: Optional list of aggregate rankings from peer review
    """
    supabase = get_supabase()
    now = datetime.utcnow().isoformat() + 'Z'

    # Build message data with user_id
    message_data = {
        'conversation_id': conversation_id,
        'role': 'assistant',
        'stage1': stage1,
        'stage2': stage2,
        'stage3': stage3,
        'user_id': user_id,
        'created_at': now
    }

    if label_to_model is not None:
        message_data['label_to_model'] = label_to_model
    if aggregate_rankings is not None:
        message_data['aggregate_rankings'] = aggregate_rankings

    # Insert message
    supabase.table('messages').insert(message_data).execute()

    # Update conversation last_updated
    supabase.table('conversations').update({
        'updated_at': now
    }).eq('id', conversation_id).execute()


def update_conversation_title(conversation_id: str, title: str):
    """
    Update the title of a conversation.

    Args:
        conversation_id: Conversation identifier
        title: New title for the conversation
    """
    supabase = get_supabase()
    now = datetime.utcnow().isoformat() + 'Z'

    supabase.table('conversations').update({
        'title': title,
        'updated_at': now
    }).eq('id', conversation_id).execute()


def archive_conversation(conversation_id: str, archived: bool = True):
    """
    Archive or unarchive a conversation.

    Args:
        conversation_id: Conversation identifier
        archived: True to archive, False to unarchive
    """
    supabase = get_supabase()
    now = datetime.utcnow().isoformat() + 'Z'

    supabase.table('conversations').update({
        'archived': archived,
        'updated_at': now
    }).eq('id', conversation_id).execute()


def delete_conversation(conversation_id: str) -> bool:
    """
    Permanently delete a conversation.

    Args:
        conversation_id: Conversation identifier

    Returns:
        True if deleted, False if not found
    """
    supabase = get_supabase()

    # Check if exists
    result = supabase.table('conversations').select('id').eq('id', conversation_id).execute()
    if not result.data:
        return False

    # Delete messages first (foreign key constraint)
    supabase.table('messages').delete().eq('conversation_id', conversation_id).execute()

    # Delete conversation
    supabase.table('conversations').delete().eq('id', conversation_id).execute()

    return True


def save_curator_run(
    conversation_id: str,
    business_id: str,
    suggestions_count: int,
    accepted_count: int,
    rejected_count: int
):
    """
    Record that the curator was run on this conversation.

    Args:
        conversation_id: Conversation identifier
        business_id: Business context that was analyzed
        suggestions_count: Total suggestions generated
        accepted_count: Number of suggestions accepted
        rejected_count: Number of suggestions rejected
    """
    supabase = get_supabase()
    now = datetime.utcnow().isoformat() + 'Z'

    # Get current conversation
    result = supabase.table('conversations').select('curator_history').eq('id', conversation_id).execute()

    if not result.data:
        raise ValueError(f"Conversation {conversation_id} not found")

    curator_history = result.data[0].get('curator_history') or []
    curator_history.append({
        "analyzed_at": now,
        "business_id": business_id,
        "suggestions_count": suggestions_count,
        "accepted_count": accepted_count,
        "rejected_count": rejected_count
    })

    supabase.table('conversations').update({
        'curator_history': curator_history,
        'updated_at': now
    }).eq('id', conversation_id).execute()


def get_curator_history(conversation_id: str) -> Optional[List[Dict[str, Any]]]:
    """
    Get curator run history for a conversation.

    Args:
        conversation_id: Conversation identifier

    Returns:
        List of curator run records or None if conversation not found
    """
    supabase = get_supabase()

    result = supabase.table('conversations').select('curator_history').eq('id', conversation_id).execute()

    if not result.data:
        return None

    return result.data[0].get('curator_history') or []
