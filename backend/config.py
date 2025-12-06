"""Configuration for the LLM Council."""

import os
from dotenv import load_dotenv

load_dotenv()

# OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Council members - list of OpenRouter model identifiers
# Note: Gemini placed first to avoid potential issues with concurrent streams
COUNCIL_MODELS = [
    "google/gemini-3-pro-preview",
    "openai/gpt-5.1",
    "anthropic/claude-opus-4.5",
    "x-ai/grok-4",
    "deepseek/deepseek-chat-v3-0324",
]

# Chairman models - synthesizes final response (with fallbacks)
# Will try each in order until one succeeds
CHAIRMAN_MODELS = [
    "anthropic/claude-opus-4.5",     # Primary
    "google/gemini-3-pro-preview",   # Fallback 1
    "openai/gpt-5.1",                # Fallback 2
]

# For backwards compatibility
CHAIRMAN_MODEL = CHAIRMAN_MODELS[0]

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Data directory for conversation storage
DATA_DIR = "data/conversations"
