/**
 * API client for the AI Council backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

// Token getter function - set by the app to provide auth tokens
let getAccessToken = null;

/**
 * Set the function that retrieves the access token.
 * @param {function} getter - Async function that returns the access token
 */
export const setTokenGetter = (getter) => {
  getAccessToken = getter;
};

/**
 * Get headers including Authorization if token is available.
 */
const getAuthHeaders = async () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (getAccessToken) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

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
   * List all conversations for the authenticated user.
   */
  async listConversations() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/conversations`, { headers });
    if (!response.ok) {
      throw new Error('Failed to list conversations');
    }
    return response.json();
  },

  /**
   * Create a new conversation.
   */
  async createConversation() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`,
      { headers }
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
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers,
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
   * @param {string|null} options.role - Optional role for persona injection (e.g., 'cto', 'head-of-ai-people-culture')
   * @param {AbortSignal} options.signal - Optional AbortSignal for cancellation
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, onEvent, options = {}) {
    const { businessId = null, department = 'standard', role = null, signal = null } = options;
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ content, business_id: businessId, department, role }),
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
        if (done) {
          console.log('[SSE Council] Stream ended');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log('[SSE Council] Received chunk:', chunk.length, 'chars');
        buffer += chunk;

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
                console.log('[SSE Council]', event.type, event.model || '');
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
   * Send a chat message (Chairman only, no full council deliberation).
   * Used for follow-up questions after council response.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @param {object} options - Context options
   * @param {string|null} options.businessId - Optional business context ID
   * @param {string|null} options.departmentId - Optional department context ID
   * @param {AbortSignal} options.signal - Optional AbortSignal for cancellation
   * @returns {Promise<void>}
   */
  async sendChatStream(conversationId, content, onEvent, options = {}) {
    const { businessId = null, departmentId = null, signal = null } = options;
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/chat/stream`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content,
          business_id: businessId,
          department_id: departmentId,
        }),
        signal,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send chat message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        while (buffer.includes('\n\n')) {
          const eventEnd = buffer.indexOf('\n\n');
          const eventText = buffer.slice(0, eventEnd);
          buffer = buffer.slice(eventEnd + 2);

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

  /**
   * Export a conversation as Markdown file.
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<void>} - Triggers a file download
   */
  async exportConversation(conversationId) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/export`,
      { headers }
    );
    if (!response.ok) {
      throw new Error('Failed to export conversation');
    }

    // Get the filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'conversation.md';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) {
        filename = match[1];
      }
    }

    // Download the file
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Rename a conversation.
   * @param {string} conversationId - The conversation ID
   * @param {string} title - The new title
   */
  async renameConversation(conversationId, title) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/rename`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ title }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to rename conversation');
    }
    return response.json();
  },

  /**
   * Archive or unarchive a conversation.
   * @param {string} conversationId - The conversation ID
   * @param {boolean} archived - True to archive, false to unarchive
   */
  async archiveConversation(conversationId, archived = true) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/archive`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ archived }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to archive conversation');
    }
    return response.json();
  },

  /**
   * Permanently delete a conversation.
   * @param {string} conversationId - The conversation ID
   */
  async deleteConversation(conversationId) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`,
      {
        method: 'DELETE',
        headers,
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
    return response.json();
  },

  /**
   * Analyze a conversation for potential knowledge base updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} businessId - The business context ID
   * @param {string|null} departmentId - Optional department ID
   * @returns {Promise<{suggestions: Array, summary: string, analyzed_at: string}>}
   */
  async curateConversation(conversationId, businessId, departmentId = null) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/curate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          business_id: businessId,
          department_id: departmentId,
        }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to analyze conversation');
    }
    return response.json();
  },

  /**
   * Apply a suggestion to update the business context.
   * @param {string} businessId - The business context ID
   * @param {object} suggestion - The suggestion object to apply
   * @returns {Promise<{success: boolean, message: string, updated_at: string}>}
   */
  async applySuggestion(businessId, suggestion) {
    const response = await fetch(`${API_BASE}/api/context/apply-suggestion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_id: businessId,
        suggestion: suggestion,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to apply suggestion');
    }
    return response.json();
  },

  /**
   * Get a specific section from the business context.
   * @param {string} businessId - The business context ID
   * @param {string} sectionName - The section name to retrieve
   * @param {string|null} department - Optional department ID to look in department context
   * @returns {Promise<{section: string, content: string, exists: boolean}>}
   */
  async getContextSection(businessId, sectionName, department = null) {
    let url = `${API_BASE}/api/context/${businessId}/section/${encodeURIComponent(sectionName)}`;
    if (department && department !== 'company') {
      url += `?department=${encodeURIComponent(department)}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to get context section');
    }
    return response.json();
  },

  /**
   * Save a record that the curator was run on this conversation.
   * @param {string} conversationId - The conversation ID
   * @param {string} businessId - The business context ID
   * @param {number} suggestionsCount - Total suggestions generated
   * @param {number} acceptedCount - Number of suggestions accepted
   * @param {number} rejectedCount - Number of suggestions rejected
   * @returns {Promise<{success: boolean}>}
   */
  async saveCuratorRun(conversationId, businessId, suggestionsCount, acceptedCount, rejectedCount) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/curator-history`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          business_id: businessId,
          suggestions_count: suggestionsCount,
          accepted_count: acceptedCount,
          rejected_count: rejectedCount,
        }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to save curator run');
    }
    return response.json();
  },

  /**
   * Get curator run history for a conversation.
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<{history: Array}>}
   */
  async getCuratorHistory(conversationId) {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/curator-history`,
      { headers }
    );
    if (!response.ok) {
      throw new Error('Failed to get curator history');
    }
    return response.json();
  },

  /**
   * Get the last updated date from a business context file.
   * @param {string} businessId - The business context ID
   * @returns {Promise<{last_updated: string|null}>}
   */
  async getContextLastUpdated(businessId) {
    const response = await fetch(
      `${API_BASE}/api/context/${businessId}/last-updated`
    );
    if (!response.ok) {
      throw new Error('Failed to get context last updated');
    }
    return response.json();
  },

  /**
   * Create a new department for a business.
   * This scaffolds the department folder structure and creates an initial context file.
   * @param {string} businessId - The business context ID
   * @param {object} department - The department to create
   * @param {string} department.id - The department ID (lowercase, hyphenated)
   * @param {string} department.name - The display name for the department
   * @returns {Promise<{success: boolean, department_id: string, message: string}>}
   */
  async createDepartment(businessId, department) {
    const response = await fetch(
      `${API_BASE}/api/businesses/${businessId}/departments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(department),
      }
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to create department' }));
      throw new Error(error.detail || 'Failed to create department');
    }
    return response.json();
  },
};
