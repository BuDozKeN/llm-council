"""Configuration for the LLM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

# OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Council members - list of OpenRouter model identifiers
# Using stable, well-known model IDs
COUNCIL_MODELS = [
    "google/gemini-2.0-flash-001",       # Gemini (fast, reliable)
    "openai/gpt-4o-2024-11-20",          # GPT-4o (latest stable)
    "anthropic/claude-3.5-sonnet",       # Claude 3.5 Sonnet
    "x-ai/grok-2-1212",                  # Grok 2
    "deepseek/deepseek-chat",            # DeepSeek
]

# Chairman models - synthesizes final response (with fallbacks)
# Will try each in order until one succeeds
CHAIRMAN_MODELS = [
    "anthropic/claude-3.5-sonnet",       # Primary
    "google/gemini-2.0-flash-001",       # Fallback 1
    "openai/gpt-4o-2024-11-20",          # Fallback 2
]

# For backwards compatibility
CHAIRMAN_MODEL = CHAIRMAN_MODELS[0]

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Data directory for conversation storage
DATA_DIR = "data/conversations"
