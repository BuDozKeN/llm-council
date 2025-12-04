"""FastAPI backend for LLM Council."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import json
import asyncio

from . import storage
from .council import run_full_council, generate_conversation_title, stage1_collect_responses, stage1_stream_responses, stage2_collect_rankings, stage2_stream_rankings, stage3_synthesize_final, stage3_stream_synthesis, calculate_aggregate_rankings
from .context_loader import list_available_businesses, load_business_context
from . import leaderboard
from . import triage

app = FastAPI(title="LLM Council API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:3000"],
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


# Triage endpoints
class TriageRequest(BaseModel):
    """Request for triage analysis."""
    content: str
    business_id: Optional[str] = None


class TriageContinueRequest(BaseModel):
    """Request to continue triage with additional info."""
    original_query: str
    previous_constraints: Dict[str, Any]
    user_response: str
    business_id: Optional[str] = None


@app.post("/api/triage/analyze")
async def analyze_triage(request: TriageRequest):
    """
    Analyze a user's question for the 4 required constraints.
    Returns whether ready to proceed or what questions to ask.
    """
    # Load business context if specified
    business_context = None
    if request.business_id:
        business_context = load_business_context(request.business_id)

    result = await triage.analyze_for_triage(
        request.content,
        business_context=business_context
    )

    return result


@app.post("/api/triage/continue")
async def continue_triage_conversation(request: TriageContinueRequest):
    """
    Continue triage conversation with user's additional information.
    """
    business_context = None
    if request.business_id:
        business_context = load_business_context(request.business_id)

    result = await triage.continue_triage(
        original_query=request.original_query,
        previous_constraints=request.previous_constraints,
        user_response=request.user_response,
        business_context=business_context
    )

    return result


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


# Export endpoint
@app.get("/api/conversations/{conversation_id}/export")
async def export_conversation_markdown(conversation_id: str):
    """
    Export a conversation as a formatted Markdown file.
    Returns the markdown content with proper headers and formatting.
    """
    conversation = storage.get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Build the markdown content
    md_lines = []

    # Header
    md_lines.append(f"# {conversation.get('title', 'AI Council Conversation')}")
    md_lines.append("")
    md_lines.append(f"**Date:** {conversation.get('created_at', 'Unknown')[:10]}")
    md_lines.append("")
    md_lines.append("---")
    md_lines.append("")

    # Process each message pair
    for msg in conversation.get("messages", []):
        if msg.get("role") == "user":
            md_lines.append("## Question")
            md_lines.append("")
            md_lines.append(msg.get("content", ""))
            md_lines.append("")

        elif msg.get("role") == "assistant":
            # Stage 3 - Final Answer (most important for knowledge base)
            stage3 = msg.get("stage3", {})
            if stage3:
                md_lines.append("## AI Council Answer")
                md_lines.append("")
                md_lines.append(stage3.get("content", ""))
                md_lines.append("")

            # Stage 1 - Individual Responses (collapsible for reference)
            stage1 = msg.get("stage1", [])
            if stage1:
                md_lines.append("### Individual Model Responses")
                md_lines.append("")
                md_lines.append("<details>")
                md_lines.append("<summary>Click to expand individual responses</summary>")
                md_lines.append("")
                for response in stage1:
                    model_name = response.get("model", "Unknown Model")
                    content = response.get("content", "")
                    md_lines.append(f"#### {model_name}")
                    md_lines.append("")
                    md_lines.append(content)
                    md_lines.append("")
                md_lines.append("</details>")
                md_lines.append("")

            # Stage 2 - Rankings (summary only)
            stage2 = msg.get("stage2", [])
            if stage2:
                md_lines.append("### Peer Rankings")
                md_lines.append("")
                md_lines.append("<details>")
                md_lines.append("<summary>Click to expand peer rankings</summary>")
                md_lines.append("")
                for ranking in stage2:
                    model_name = ranking.get("model", "Unknown Model")
                    parsed = ranking.get("parsed_ranking", [])
                    if parsed:
                        md_lines.append(f"**{model_name}:** {', '.join(parsed)}")
                    else:
                        md_lines.append(f"**{model_name}:** (no parsed ranking)")
                md_lines.append("")
                md_lines.append("</details>")
                md_lines.append("")

            md_lines.append("---")
            md_lines.append("")

    # Footer
    md_lines.append("*Generated by AI Council*")

    markdown_content = "\n".join(md_lines)

    # Create a safe filename from the title
    safe_title = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in conversation.get('title', 'conversation'))
    safe_title = safe_title.strip().replace(' ', '-')[:50]
    filename = f"{safe_title}.md"

    return Response(
        content=markdown_content,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
