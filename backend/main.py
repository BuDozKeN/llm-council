"""FastAPI backend for LLM Council."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import json
import asyncio

from . import storage
from .council import run_full_council, generate_conversation_title, stage1_collect_responses, stage1_stream_responses, stage2_collect_rankings, stage2_stream_rankings, stage3_synthesize_final, stage3_stream_synthesis, calculate_aggregate_rankings
from .context_loader import list_available_businesses
from . import leaderboard

app = FastAPI(title="LLM Council API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""
    pass


class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    content: str
    business_id: Optional[str] = None
    department: Optional[str] = "standard"


class ConversationMetadata(BaseModel):
    """Conversation metadata for list view."""
    id: str
    created_at: str
    title: str
    message_count: int


class Conversation(BaseModel):
    """Full conversation with all messages."""
    id: str
    created_at: str
    title: str
    messages: List[Dict[str, Any]]


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "LLM Council API"}


@app.get("/api/businesses")
async def get_businesses():
    """List all available business contexts."""
    return list_available_businesses()


@app.get("/api/conversations", response_model=List[ConversationMetadata])
async def list_conversations():
    """List all conversations (metadata only)."""
    return storage.list_conversations()


@app.post("/api/conversations", response_model=Conversation)
async def create_conversation(request: CreateConversationRequest):
    """Create a new conversation."""
    conversation_id = str(uuid.uuid4())
    conversation = storage.create_conversation(conversation_id)
    return conversation


@app.get("/api/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str):
    """Get a specific conversation with all its messages."""
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@app.post("/api/conversations/{conversation_id}/message")
async def send_message(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and run the 3-stage council process.
    Returns the complete response with all stages.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    # Add user message
    storage.add_user_message(conversation_id, request.content)

    # If this is the first message, generate a title
    if is_first_message:
        title = await generate_conversation_title(request.content)
        storage.update_conversation_title(conversation_id, title)

    # Run the 3-stage council process
    stage1_results, stage2_results, stage3_result, metadata = await run_full_council(
        request.content,
        business_id=request.business_id
    )

    # Add assistant message with all stages
    storage.add_assistant_message(
        conversation_id,
        stage1_results,
        stage2_results,
        stage3_result
    )

    # Return the complete response with metadata
    return {
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "metadata": metadata
    }


@app.post("/api/conversations/{conversation_id}/message/stream")
async def send_message_stream(conversation_id: str, request: SendMessageRequest):
    """
    Send a message and stream the 3-stage council process.
    Returns Server-Sent Events as each stage completes.
    """
    # Check if conversation exists
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if this is the first message
    is_first_message = len(conversation["messages"]) == 0

    async def event_generator():
        try:
            # Add user message
            storage.add_user_message(conversation_id, request.content)

            # Start title generation in parallel (don't await yet)
            title_task = None
            if is_first_message:
                title_task = asyncio.create_task(generate_conversation_title(request.content))

            # Stage 1: Collect responses with streaming
            yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
            stage1_results = []
            async for event in stage1_stream_responses(request.content, business_id=request.business_id):
                if event['type'] == 'stage1_token':
                    # Stream individual tokens
                    yield f"data: {json.dumps(event)}\n\n"
                elif event['type'] == 'stage1_model_complete':
                    # A single model finished
                    yield f"data: {json.dumps(event)}\n\n"
                elif event['type'] == 'stage1_model_error':
                    # A model had an error
                    yield f"data: {json.dumps(event)}\n\n"
                elif event['type'] == 'stage1_all_complete':
                    # All models done - capture results
                    stage1_results = event['data']
                    yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_results})}\n\n"

            # Stage 2: Collect rankings with streaming
            yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
            stage2_results = []
            label_to_model = {}
            aggregate_rankings = []
            async for event in stage2_stream_rankings(request.content, stage1_results, business_id=request.business_id):
                if event['type'] == 'stage2_token':
                    yield f"data: {json.dumps(event)}\n\n"
                elif event['type'] == 'stage2_model_complete':
                    yield f"data: {json.dumps(event)}\n\n"
                elif event['type'] == 'stage2_model_error':
                    yield f"data: {json.dumps(event)}\n\n"
                elif event['type'] == 'stage2_all_complete':
                    stage2_results = event['data']
                    label_to_model = event['label_to_model']
                    aggregate_rankings = event['aggregate_rankings']
                    yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results, 'metadata': {'label_to_model': label_to_model, 'aggregate_rankings': aggregate_rankings}})}\n\n"

            # Stage 3: Synthesize final answer with streaming
            yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
            stage3_result = {}
            async for event in stage3_stream_synthesis(request.content, stage1_results, stage2_results, business_id=request.business_id):
                if event['type'] == 'stage3_token':
                    yield f"data: {json.dumps(event)}\n\n"
                elif event['type'] == 'stage3_error':
                    yield f"data: {json.dumps(event)}\n\n"
                elif event['type'] == 'stage3_complete':
                    stage3_result = event['data']
                    yield f"data: {json.dumps({'type': 'stage3_complete', 'data': stage3_result})}\n\n"

            # Wait for title generation if it was started
            if title_task:
                title = await title_task
                storage.update_conversation_title(conversation_id, title)
                yield f"data: {json.dumps({'type': 'title_complete', 'data': {'title': title}})}\n\n"

            # Save complete assistant message
            storage.add_assistant_message(
                conversation_id,
                stage1_results,
                stage2_results,
                stage3_result
            )

            # Record rankings to leaderboard
            if aggregate_rankings:
                leaderboard.record_session_rankings(
                    conversation_id=conversation_id,
                    department=request.department or "standard",
                    business_id=request.business_id,
                    aggregate_rankings=aggregate_rankings
                )

            # Send completion event
            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            # Send error event
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


# Leaderboard endpoints
@app.get("/api/leaderboard")
async def get_leaderboard_summary():
    """Get full leaderboard summary with overall and per-department rankings."""
    return leaderboard.get_leaderboard_summary()


@app.get("/api/leaderboard/overall")
async def get_overall_leaderboard():
    """Get overall model leaderboard across all sessions."""
    return leaderboard.get_overall_leaderboard()


@app.get("/api/leaderboard/department/{department}")
async def get_department_leaderboard(department: str):
    """Get leaderboard for a specific department."""
    return leaderboard.get_department_leaderboard(department)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
