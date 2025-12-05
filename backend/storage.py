"""JSON-based storage for conversations."""

import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from .config import DATA_DIR


def ensure_data_dir():
    """Ensure the data directory exists."""
    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)


def get_conversation_path(conversation_id: str) -> str:
    """Get the file path for a conversation."""
    return os.path.join(DATA_DIR, f"{conversation_id}.json")


def create_conversation(conversation_id: str) -> Dict[str, Any]:
    """
    Create a new conversation.

    Args:
        conversation_id: Unique identifier for the conversation

    Returns:
        New conversation dict
    """
    ensure_data_dir()

    now = datetime.utcnow().isoformat() + 'Z'
    conversation = {
        "id": conversation_id,
        "created_at": now,
        "last_updated": now,
        "title": "New Conversation",
        "messages": []
    }

    # Save to file
    path = get_conversation_path(conversation_id)
    with open(path, 'w') as f:
        json.dump(conversation, f, indent=2)

    return conversation


def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Load a conversation from storage.

    Args:
        conversation_id: Unique identifier for the conversation

    Returns:
        Conversation dict or None if not found
    """
    path = get_conversation_path(conversation_id)

    if not os.path.exists(path):
        return None

    with open(path, 'r') as f:
        return json.load(f)


def save_conversation(conversation: Dict[str, Any]):
    """
    Save a conversation to storage.

    Args:
        conversation: Conversation dict to save
    """
    ensure_data_dir()

    path = get_conversation_path(conversation['id'])
    with open(path, 'w') as f:
        json.dump(conversation, f, indent=2)


def list_conversations() -> List[Dict[str, Any]]:
    """
    List all conversations with at least one message (metadata only).
    Empty conversations (0 messages) are excluded and deleted.

    Returns:
        List of conversation metadata dicts, sorted by last_updated (newest first)
    """
    ensure_data_dir()

    conversations = []
    empty_files = []

    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.json'):
            path = os.path.join(DATA_DIR, filename)
            with open(path, 'r') as f:
                data = json.load(f)
                message_count = len(data["messages"])

                # Skip and mark for deletion conversations with 0 messages
                if message_count == 0:
                    empty_files.append(path)
                    continue

                # Fallback to created_at if last_updated doesn't exist (for older conversations)
                last_updated = data.get("last_updated", data["created_at"])

                # Return metadata only for conversations with messages
                conversations.append({
                    "id": data["id"],
                    "created_at": data["created_at"],
                    "last_updated": last_updated,
                    "title": data.get("title", "New Conversation"),
                    "message_count": message_count,
                    "archived": data.get("archived", False)
                })

    # Clean up empty conversation files
    for path in empty_files:
        try:
            os.remove(path)
        except Exception as e:
            print(f"Failed to delete empty conversation file {path}: {e}")

    # Sort by last_updated time, newest first
    conversations.sort(key=lambda x: x["last_updated"], reverse=True)

    return conversations


def add_user_message(conversation_id: str, content: str):
    """
    Add a user message to a conversation.

    Args:
        conversation_id: Conversation identifier
        content: User message content
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["messages"].append({
        "role": "user",
        "content": content
    })

    # Update last_updated timestamp
    conversation["last_updated"] = datetime.utcnow().isoformat() + 'Z'

    save_conversation(conversation)


def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]],
    stage2: List[Dict[str, Any]],
    stage3: Dict[str, Any],
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
        label_to_model: Optional mapping of anonymous labels to model names
        aggregate_rankings: Optional list of aggregate rankings from peer review
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    message = {
        "role": "assistant",
        "stage1": stage1,
        "stage2": stage2,
        "stage3": stage3
    }

    # Add metadata if provided
    if label_to_model is not None:
        message["label_to_model"] = label_to_model
    if aggregate_rankings is not None:
        message["aggregate_rankings"] = aggregate_rankings

    conversation["messages"].append(message)

    # Update last_updated timestamp
    conversation["last_updated"] = datetime.utcnow().isoformat() + 'Z'

    save_conversation(conversation)


def update_conversation_title(conversation_id: str, title: str):
    """
    Update the title of a conversation.

    Args:
        conversation_id: Conversation identifier
        title: New title for the conversation
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["title"] = title
    # Update last_updated timestamp
    conversation["last_updated"] = datetime.utcnow().isoformat() + 'Z'
    save_conversation(conversation)


def archive_conversation(conversation_id: str, archived: bool = True):
    """
    Archive or unarchive a conversation.

    Args:
        conversation_id: Conversation identifier
        archived: True to archive, False to unarchive
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["archived"] = archived
    # Update last_updated timestamp
    conversation["last_updated"] = datetime.utcnow().isoformat() + 'Z'
    save_conversation(conversation)


def delete_conversation(conversation_id: str) -> bool:
    """
    Permanently delete a conversation.

    Args:
        conversation_id: Conversation identifier

    Returns:
        True if deleted, False if not found
    """
    path = get_conversation_path(conversation_id)

    if not os.path.exists(path):
        return False

    os.remove(path)
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
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    # Store curator history
    if "curator_history" not in conversation:
        conversation["curator_history"] = []

    conversation["curator_history"].append({
        "analyzed_at": datetime.utcnow().isoformat() + 'Z',
        "business_id": business_id,
        "suggestions_count": suggestions_count,
        "accepted_count": accepted_count,
        "rejected_count": rejected_count
    })

    # Update last_updated timestamp
    conversation["last_updated"] = datetime.utcnow().isoformat() + 'Z'
    save_conversation(conversation)


def get_curator_history(conversation_id: str) -> Optional[List[Dict[str, Any]]]:
    """
    Get curator run history for a conversation.

    Args:
        conversation_id: Conversation identifier

    Returns:
        List of curator run records or None if conversation not found
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        return None

    return conversation.get("curator_history", [])
