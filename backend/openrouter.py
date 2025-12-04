"""OpenRouter API client for making LLM requests."""

import httpx
import json
from typing import List, Dict, Any, Optional, AsyncGenerator
from .config import OPENROUTER_API_KEY, OPENROUTER_API_URL


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 120.0
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via OpenRouter API.

    Args:
        model: OpenRouter model identifier (e.g., "openai/gpt-4o")
        messages: List of message dicts with 'role' and 'content'
        timeout: Request timeout in seconds

    Returns:
        Response dict with 'content' and optional 'reasoning_details', or None if failed
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 4096,  # Explicit limit to prevent truncation (especially for DeepSeek)
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()

            data = response.json()
            message = data['choices'][0]['message']

            return {
                'content': message.get('content'),
                'reasoning_details': message.get('reasoning_details')
            }

    except httpx.TimeoutException as e:
        print(f"[TIMEOUT] Model {model}: Request timed out after {timeout}s", flush=True)
        return None
    except httpx.HTTPStatusError as e:
        print(f"[HTTP ERROR] Model {model}: Status {e.response.status_code} - {e.response.text[:200]}", flush=True)
        return None
    except Exception as e:
        print(f"[ERROR] Model {model}: {type(e).__name__}: {e}", flush=True)
        return None


async def query_model_stream(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 120.0
) -> AsyncGenerator[str, None]:
    """
    Query a single model via OpenRouter API with streaming.

    Args:
        model: OpenRouter model identifier (e.g., "openai/gpt-4o")
        messages: List of message dicts with 'role' and 'content'
        timeout: Request timeout in seconds

    Yields:
        Text chunks as they arrive from the model
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "max_tokens": 4096,  # Explicit limit to prevent truncation (especially for DeepSeek)
    }

    try:
        print(f"[STREAM START] {model}: Connecting...", flush=True)
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            ) as response:
                response.raise_for_status()
                print(f"[STREAM CONNECTED] {model}: Status {response.status_code}", flush=True)

                line_count = 0
                token_count = 0
                first_data_logged = False
                async for line in response.aiter_lines():
                    line_count += 1
                    if line.startswith("data: "):
                        data_str = line[6:]  # Remove "data: " prefix
                        if data_str.strip() == "[DONE]":
                            print(f"[STREAM DONE] {model}: Received [DONE] after {line_count} lines, {token_count} tokens", flush=True)
                            break
                        try:
                            data = json.loads(data_str)
                            # Log first data packet to see structure
                            if not first_data_logged:
                                print(f"[STREAM FIRST DATA] {model}: {json.dumps(data)[:500]}", flush=True)
                                first_data_logged = True

                            # Check for error response
                            if 'error' in data:
                                error_msg = data['error'].get('message', 'Unknown error')
                                print(f"[STREAM ERROR RESPONSE] {model}: {error_msg}", flush=True)
                                yield f"[Error: {error_msg}]"
                                break

                            delta = data.get('choices', [{}])[0].get('delta', {})
                            # Check both 'content' and 'reasoning' fields (Gemini uses 'reasoning')
                            content = delta.get('content', '')
                            if not content:
                                content = delta.get('reasoning', '')
                            if content:
                                token_count += 1
                                yield content
                        except json.JSONDecodeError:
                            print(f"[STREAM JSON ERROR] {model}: Failed to parse: {data_str[:100]}", flush=True)
                            continue

                if line_count == 0:
                    print(f"[STREAM EMPTY] {model}: No lines received!", flush=True)
                elif token_count == 0:
                    print(f"[STREAM NO TOKENS] {model}: {line_count} lines but 0 tokens!", flush=True)

    except httpx.TimeoutException as e:
        print(f"[TIMEOUT] Model {model}: Streaming timed out after {timeout}s", flush=True)
        yield f"[Error: Timeout after {timeout}s]"
    except httpx.HTTPStatusError as e:
        error_msg = f"Status {e.response.status_code}"
        print(f"[HTTP ERROR] Model {model}: {error_msg} - {e.response.text[:200]}", flush=True)
        yield f"[Error: {error_msg}]"
    except Exception as e:
        print(f"[ERROR] Model {model}: {type(e).__name__}: {e}", flush=True)
        yield f"[Error: {str(e)}]"


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]]
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Query multiple models in parallel.

    Args:
        models: List of OpenRouter model identifiers
        messages: List of message dicts to send to each model

    Returns:
        Dict mapping model identifier to response dict (or None if failed)
    """
    import asyncio

    # Create tasks for all models
    tasks = [query_model(model, messages) for model in models]

    # Wait for all to complete
    responses = await asyncio.gather(*tasks)

    # Map models to their responses
    return {model: response for model, response in zip(models, responses)}
