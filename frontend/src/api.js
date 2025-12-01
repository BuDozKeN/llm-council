/**
 * API client for the AI Council backend.
 */

const API_BASE = 'http://localhost:8001';

export const api = {
  /**
   * List all available business contexts.
   */
  async listBusinesses() {
    const response = await fetch(`${API_BASE}/api/businesses`);
    if (!response.ok) {
      throw new Error('Failed to list businesses');
    }
    return response.json();
  },

  /**
   * List all conversations.
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`);
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  /**
   * Get a specific conversation.
   */
  async getConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`
    );
    if (!response.ok) {
      throw new Error('Failed to get conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {string|null} businessId - Optional business context ID
   */
  async sendMessage(conversationId, content, businessId = null) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, business_id: businessId }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @param {object} options - Context options
   * @param {string|null} options.businessId - Optional business context ID
   * @param {string|null} options.department - Optional department for leaderboard tracking
   * @param {AbortSignal} options.signal - Optional AbortSignal for cancellation
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, onEvent, options = {}) {
    const { businessId = null, department = 'standard', signal = null } = options;
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, business_id: businessId, department }),
        signal, // Allow cancellation
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = ''; // Buffer for incomplete SSE events

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (separated by double newlines)
        while (buffer.includes('\n\n')) {
          const eventEnd = buffer.indexOf('\n\n');
          const eventText = buffer.slice(0, eventEnd);
          buffer = buffer.slice(eventEnd + 2);

          // Parse the SSE event
          for (const line of eventText.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const event = JSON.parse(data);
                onEvent(event.type, event);
              } catch (e) {
                console.error('Failed to parse SSE event:', e);
              }
            }
          }
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        onEvent('cancelled', { message: 'Request was cancelled' });
      } else {
        throw e;
      }
    }
  },

  /**
   * Get leaderboard summary (overall + all departments).
   */
  async getLeaderboardSummary() {
    const response = await fetch(`${API_BASE}/api/leaderboard`);
    if (!response.ok) {
      throw new Error('Failed to get leaderboard');
    }
    return response.json();
  },

  /**
   * Get overall leaderboard.
   */
  async getOverallLeaderboard() {
    const response = await fetch(`${API_BASE}/api/leaderboard/overall`);
    if (!response.ok) {
      throw new Error('Failed to get overall leaderboard');
    }
    return response.json();
  },

  /**
   * Get department-specific leaderboard.
   * @param {string} department - The department name
   */
  async getDepartmentLeaderboard(department) {
    const response = await fetch(`${API_BASE}/api/leaderboard/department/${department}`);
    if (!response.ok) {
      throw new Error('Failed to get department leaderboard');
    }
    return response.json();
  },

  /**
   * Analyze a question for triage (check for 4 constraints).
   * @param {string} content - The user's question
   * @param {string|null} businessId - Optional business context ID
   * @returns {Promise<{ready: boolean, constraints: object, missing: string[], questions: string|null, enhanced_query: string}>}
   */
  async analyzeTriage(content, businessId = null) {
    const response = await fetch(`${API_BASE}/api/triage/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, business_id: businessId }),
    });
    if (!response.ok) {
      throw new Error('Failed to analyze triage');
    }
    return response.json();
  },

  /**
   * Continue triage conversation with additional user info.
   * @param {string} originalQuery - The original question
   * @param {object} previousConstraints - Previously extracted constraints
   * @param {string} userResponse - User's response to triage questions
   * @param {string|null} businessId - Optional business context ID
   * @returns {Promise<{ready: boolean, constraints: object, missing: string[], questions: string|null, enhanced_query: string}>}
   */
  async continueTriage(originalQuery, previousConstraints, userResponse, businessId = null) {
    const response = await fetch(`${API_BASE}/api/triage/continue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original_query: originalQuery,
        previous_constraints: previousConstraints,
        user_response: userResponse,
        business_id: businessId,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to continue triage');
    }
    return response.json();
  },
};
