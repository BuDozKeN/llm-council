import { useState, useEffect } from 'react';
import { api } from '../api';
import './CuratorPanel.css';

// Department display names
const DEPARTMENT_LABELS = {
  company: 'Company-wide',
  marketing: 'Marketing Department',
  sales: 'Sales Department',
  cto: 'CTO / Technical',
  operations: 'Operations',
};

const DEPARTMENT_OPTIONS = [
  { id: 'company', name: 'Company-wide' },
  { id: 'marketing', name: 'Marketing Department' },
  { id: 'sales', name: 'Sales Department' },
  { id: 'cto', name: 'CTO / Technical' },
  { id: 'operations', name: 'Operations' },
];

/**
 * CuratorPanel - Knowledge Curator component
 *
 * Analyzes conversations and suggests updates to the business context.
 * Shows suggestions in a user-friendly format with Accept/Reject/Edit options.
 */
export default function CuratorPanel({
  conversationId,
  businessId,
  departmentId,
  onClose,
}) {
  const [status, setStatus] = useState('idle'); // idle, analyzing, done, error
  const [suggestions, setSuggestions] = useState([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState(null);
  const [processingIndex, setProcessingIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [hasSavedRun, setHasSavedRun] = useState(false);
  const [expandedCards, setExpandedCards] = useState({}); // Track which processed cards are expanded
  const [curatorHistory, setCuratorHistory] = useState([]);
  const [contextLastUpdated, setContextLastUpdated] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Fetch curator history and context last updated on mount
  useEffect(() => {
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const [historyRes, lastUpdatedRes] = await Promise.all([
          api.getCuratorHistory(conversationId),
          api.getContextLastUpdated(businessId)
        ]);
        setCuratorHistory(historyRes.history || []);
        setContextLastUpdated(lastUpdatedRes.last_updated);
      } catch (err) {
        console.error('Failed to fetch curator history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };

    if (conversationId && businessId) {
      fetchHistory();
    }
  }, [conversationId, businessId]);

  // Toggle expansion of a processed card
  const toggleCardExpanded = (index) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Format date for display (YYYY-MM-DD to DD-MM-YYYY)
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    // Handle ISO format (with time)
    const datePart = dateStr.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Determine history status message
  const getHistoryStatus = () => {
    if (!curatorHistory || curatorHistory.length === 0) {
      return { type: 'never', message: 'Curator has never been run on this conversation' };
    }

    const lastRun = curatorHistory[curatorHistory.length - 1];
    const lastRunDate = lastRun.analyzed_at;

    // Check if context has been updated since last curator run
    if (contextLastUpdated) {
      const runDate = new Date(lastRunDate);
      const contextDate = new Date(contextLastUpdated);

      if (contextDate > runDate) {
        return {
          type: 'outdated',
          message: `Last run on ${formatDate(lastRunDate)} - Knowledge base updated since then`,
          lastRun
        };
      }
    }

    return {
      type: 'current',
      message: `Last run on ${formatDate(lastRunDate)} (${lastRun.accepted_count} accepted, ${lastRun.rejected_count} rejected)`,
      lastRun
    };
  };

  // Save curator run when closing
  const handleClose = async () => {
    // Only save if we actually ran the curator and haven't saved yet
    if (status === 'done' && !hasSavedRun) {
      const acceptedCount = suggestions.filter(s => s.status === 'accepted').length;
      const rejectedCount = suggestions.filter(s => s.status === 'rejected').length;

      try {
        await api.saveCuratorRun(
          conversationId,
          businessId,
          suggestions.length,
          acceptedCount,
          rejectedCount
        );
        setHasSavedRun(true);
      } catch (err) {
        console.error('Failed to save curator run:', err);
      }
    }
    onClose();
  };

  const startAnalysis = async () => {
    setStatus('analyzing');
    setError(null);
    setSuggestions([]);

    try {
      const result = await api.curateConversation(
        conversationId,
        businessId,
        departmentId
      );

      if (result.error) {
        setError(result.error);
        setStatus('error');
      } else {
        // Initialize each suggestion with its recommended department
        const suggestionsWithDept = (result.suggestions || []).map(s => ({
          ...s,
          selectedDepartment: s.department || 'company',
        }));
        setSuggestions(suggestionsWithDept);
        setSummary(result.summary || '');
        setStatus('done');
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze conversation');
      setStatus('error');
    }
  };

  const changeDepartment = (index, newDept) => {
    setSuggestions(prev => prev.map((s, i) =>
      i === index ? { ...s, selectedDepartment: newDept } : s
    ));
  };

  const acceptSuggestion = async (index) => {
    const suggestion = suggestions[index];
    setProcessingIndex(index);

    try {
      // Use the selected department when applying
      const suggestionToApply = {
        ...suggestion,
        department: suggestion.selectedDepartment,
      };
      await api.applySuggestion(businessId, suggestionToApply);

      // Mark as accepted
      setSuggestions(prev => prev.map((s, i) =>
        i === index ? { ...s, status: 'accepted' } : s
      ));
    } catch (err) {
      // Mark as failed
      setSuggestions(prev => prev.map((s, i) =>
        i === index ? { ...s, status: 'failed', error: err.message } : s
      ));
    } finally {
      setProcessingIndex(null);
    }
  };

  // Reset a failed suggestion so user can try again
  const retrySuggestion = (index) => {
    setSuggestions(prev => prev.map((s, i) =>
      i === index ? { ...s, status: undefined, error: undefined } : s
    ));
  };

  const rejectSuggestion = (index) => {
    setSuggestions(prev => prev.map((s, i) =>
      i === index ? { ...s, status: 'rejected' } : s
    ));
  };

  const startEditing = (index) => {
    // Use clean text for editing (strip any remaining markdown)
    const cleanText = stripMarkdown(suggestions[index].proposed_text || '');
    setEditingIndex(index);
    setEditedText(cleanText);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditedText('');
  };

  const saveEdit = async () => {
    const index = editingIndex;
    const suggestion = suggestions[index];

    // Update the suggestion with edited text
    const updatedSuggestion = {
      ...suggestion,
      proposed_text: editedText,
      department: suggestion.selectedDepartment,
    };

    setEditingIndex(null);
    setProcessingIndex(index);

    try {
      await api.applySuggestion(businessId, updatedSuggestion);

      setSuggestions(prev => prev.map((s, i) =>
        i === index ? { ...updatedSuggestion, status: 'accepted' } : s
      ));
    } catch (err) {
      setSuggestions(prev => prev.map((s, i) =>
        i === index ? { ...s, status: 'failed', error: err.message } : s
      ));
    } finally {
      setProcessingIndex(null);
    }
  };

  // Strip markdown formatting for clean display
  const stripMarkdown = (text) => {
    if (!text) return '';
    return text
      // Remove headers (### Header)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold (**text** or __text__)
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      // Remove italic (*text* or _text_)
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      // Remove markdown tables (|---|---|)
      .replace(/\|[-:]+\|[-:|\s]+\|/g, '')
      // Clean up table rows but keep content
      .replace(/^\|(.+)\|$/gm, (match, content) => {
        return content.split('|').map(s => s.trim()).filter(s => s).join(' - ');
      })
      // Convert markdown bullets to nice bullets
      .replace(/^[-*+]\s+/gm, '• ')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`(.+?)`/g, '$1')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Parse inline bold (**text**) and render as React elements
  const renderLineWithBold = (text, keyPrefix) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${keyPrefix}-${idx}`}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Format text with visual styling (bold titles, proper spacing)
  const formatDisplayText = (text) => {
    if (!text) return null;

    // Don't strip bold markers - we'll handle them specially
    const cleanText = text
      // Remove headers (### Header)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove markdown tables
      .replace(/\|[-:]+\|[-:|\s]+\|/g, '')
      // Clean up table rows
      .replace(/^\|(.+)\|$/gm, (match, content) => {
        return content.split('|').map(s => s.trim()).filter(s => s).join(' - ');
      })
      // Convert markdown bullets to nice bullets
      .replace(/^[-*+]\s+/gm, '• ')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`(.+?)`/g, '$1')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const lines = cleanText.split('\n');
    const elements = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines but add spacing
      if (!trimmedLine) {
        elements.push(<div key={key++} className="format-spacer" />);
        continue;
      }

      // Title line (first non-empty line, or lines like "10.7 Something")
      if (i === 0 || /^\d+\.\d+\s/.test(trimmedLine)) {
        elements.push(<div key={key++} className="format-title">{trimmedLine}</div>);
        continue;
      }

      // Status line
      if (/^Status:/i.test(trimmedLine)) {
        elements.push(<div key={key++} className="format-status">{trimmedLine}</div>);
        continue;
      }

      // Lines with **bold** pattern (like "**Decision** - explanation")
      if (trimmedLine.includes('**')) {
        elements.push(
          <div key={key++} className="format-label-value">
            {renderLineWithBold(trimmedLine, key)}
          </div>
        );
        continue;
      }

      // Bullet points
      if (trimmedLine.startsWith('•')) {
        elements.push(<div key={key++} className="format-bullet">{trimmedLine}</div>);
        continue;
      }

      // Regular paragraph
      elements.push(<div key={key++} className="format-paragraph">{trimmedLine}</div>);
    }

    return elements;
  };

  // Initial state - show prompt to start analysis
  if (status === 'idle') {
    const historyStatus = getHistoryStatus();

    return (
      <div className="curator-panel">
        <div className="curator-header">
          <div className="curator-icon">📚</div>
          <div className="curator-title">Knowledge Curator</div>
          <button className="curator-close" onClick={handleClose}>×</button>
        </div>
        <div className="curator-content">
          {/* History status banner */}
          {historyLoading ? (
            <div className="curator-history-banner loading">
              <span className="history-icon">⏳</span>
              <span className="history-message">Loading history...</span>
            </div>
          ) : (
            <div className={`curator-history-banner ${historyStatus.type}`}>
              <span className="history-icon">
                {historyStatus.type === 'never' ? '🆕' : historyStatus.type === 'outdated' ? '🔄' : '✓'}
              </span>
              <span className="history-message">{historyStatus.message}</span>
            </div>
          )}

          <p className="curator-intro">
            Would you like me to review this conversation for any valuable insights
            that should be saved to your organisation's knowledge base?
          </p>
          <p className="curator-intro-sub">
            I'll identify new information and updates to existing records,
            showing you exactly where each piece will be stored.
          </p>
          <div className="curator-start-actions">
            <button className="curator-start-btn" onClick={startAnalysis} disabled={historyLoading}>
              {historyStatus.type === 'never' ? 'Analyse Conversation' : 'Run Again'}
            </button>
            <button className="curator-skip-btn" onClick={handleClose}>
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Analyzing state
  if (status === 'analyzing') {
    return (
      <div className="curator-panel">
        <div className="curator-header">
          <div className="curator-icon">📚</div>
          <div className="curator-title">Knowledge Curator</div>
        </div>
        <div className="curator-content curator-loading">
          <div className="curator-spinner"></div>
          <p>Analysing conversation for valuable insights...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="curator-panel">
        <div className="curator-header">
          <div className="curator-icon">📚</div>
          <div className="curator-title">Knowledge Curator</div>
          <button className="curator-close" onClick={handleClose}>×</button>
        </div>
        <div className="curator-content curator-error">
          <p>Something went wrong: {error}</p>
          <button className="curator-retry-btn" onClick={startAnalysis}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Done state - show suggestions
  const pendingSuggestions = suggestions.filter(s => !s.status);
  const processedCount = suggestions.filter(s => s.status).length;

  return (
    <div className="curator-panel">
      <div className="curator-header">
        <div className="curator-icon">📚</div>
        <div className="curator-title">Knowledge Curator</div>
        <button className="curator-close" onClick={handleClose}>×</button>
      </div>

      <div className="curator-content">
        {suggestions.length === 0 ? (
          <div className="curator-no-suggestions">
            <div className="no-suggestions-icon">✓</div>
            <p>No updates needed!</p>
            <p className="no-suggestions-detail">
              {summary || "I didn't find any new information in this conversation that needs to be saved to your knowledge base."}
            </p>
            <button className="curator-done-btn" onClick={handleClose}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="curator-summary">
              <p>{summary}</p>
              {processedCount > 0 && (
                <span className="curator-progress">
                  {processedCount} of {suggestions.length} processed
                </span>
              )}
            </div>

            <div className="curator-suggestions">
              {suggestions.map((suggestion, index) => {
                const isProcessed = suggestion.status === 'accepted' || suggestion.status === 'rejected';
                const isExpanded = expandedCards[index];
                const isCollapsed = isProcessed && !isExpanded;

                return (
                  <div
                    key={index}
                    className={`suggestion-card ${suggestion.status || ''} ${isCollapsed ? 'collapsed' : ''}`}
                  >
                    {/* Collapsed view for processed suggestions */}
                    {isCollapsed ? (
                      <div
                        className="suggestion-collapsed"
                        onClick={() => toggleCardExpanded(index)}
                      >
                        <div className="collapsed-content">
                          <span className={`collapsed-status-icon ${suggestion.status}`}>
                            {suggestion.status === 'accepted' ? '✓' : '×'}
                          </span>
                          <span className="collapsed-section">{suggestion.section}</span>
                          <span className="collapsed-status-text">
                            {suggestion.status === 'accepted'
                              ? `Applied to ${DEPARTMENT_LABELS[suggestion.selectedDepartment] || 'knowledge base'}`
                              : 'Rejected'}
                          </span>
                        </div>
                        <span className="expand-arrow">▶</span>
                      </div>
                    ) : (
                      <>
                        {/* Header with section and type */}
                        <div className="suggestion-header">
                          <div className="suggestion-location">
                            <span className="location-icon">📍</span>
                            <span className="location-path">{suggestion.section}</span>
                          </div>
                          <div className="suggestion-header-right">
                            <div className={`suggestion-type ${suggestion.type}`}>
                              {suggestion.type === 'update' ? 'Update existing' : 'Add new'}
                            </div>
                            {isProcessed && (
                              <button
                                className="collapse-btn"
                                onClick={() => toggleCardExpanded(index)}
                                title="Collapse"
                              >
                                ▼
                              </button>
                            )}
                          </div>
                        </div>

                        {/* File info */}
                        {suggestion.last_updated && (
                          <div className="file-info">
                            Knowledge base last updated: {formatDate(suggestion.last_updated)}
                          </div>
                        )}

                        {/* Current content (for updates) */}
                        {suggestion.type === 'update' && suggestion.current_text && (
                          <div className="suggestion-current">
                            <div className="content-label">What we currently have:</div>
                            <div className="content-text">{formatDisplayText(suggestion.current_text)}</div>
                          </div>
                        )}

                        {/* Proposed content */}
                        <div className="suggestion-proposed">
                          <div className="content-label">
                            {suggestion.type === 'update' ? 'Suggested update:' : 'Suggested addition:'}
                          </div>
                          {editingIndex === index ? (
                            <textarea
                              className="edit-textarea"
                              value={editedText}
                              onChange={(e) => {
                                setEditedText(e.target.value);
                                // Auto-resize textarea
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                              }}
                              ref={(el) => {
                                if (el) {
                                  el.style.height = 'auto';
                                  el.style.height = el.scrollHeight + 'px';
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <div className="content-text proposed">{formatDisplayText(suggestion.proposed_text)}</div>
                          )}
                        </div>

                        {/* Reason - more prominent */}
                        <div className="suggestion-reason-box">
                          <div className="reason-header">Why this update matters:</div>
                          <div className="reason-text">{suggestion.reason}</div>
                        </div>

                        {/* Actions - including Save Location */}
                        {!suggestion.status && (
                          <div className="suggestion-actions-area">
                            {/* Save Location - positioned with actions so user sees it after reading */}
                            <div className="save-location-row">
                              <div className="save-location-label">
                                <span className="save-icon">💾</span>
                                Save to:
                              </div>
                              <select
                                className="department-select"
                                value={suggestion.selectedDepartment || 'company'}
                                onChange={(e) => changeDepartment(index, e.target.value)}
                                disabled={processingIndex !== null}
                              >
                                {DEPARTMENT_OPTIONS.map(dept => (
                                  <option key={dept.id} value={dept.id}>
                                    {dept.name}
                                    {suggestion.department === dept.id ? ' (Recommended)' : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Action buttons */}
                            <div className="suggestion-actions">
                              {editingIndex === index ? (
                                <>
                                  <button
                                    className="action-btn save"
                                    onClick={saveEdit}
                                    disabled={processingIndex !== null}
                                  >
                                    Save & Apply
                                  </button>
                                  <button
                                    className="action-btn cancel"
                                    onClick={cancelEditing}
                                    disabled={processingIndex !== null}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="action-btn accept"
                                    onClick={() => acceptSuggestion(index)}
                                    disabled={processingIndex !== null}
                                  >
                                    {processingIndex === index ? 'Applying...' : 'Accept'}
                                  </button>
                                  <button
                                    className="action-btn edit"
                                    onClick={() => startEditing(index)}
                                    disabled={processingIndex !== null}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="action-btn reject"
                                    onClick={() => rejectSuggestion(index)}
                                    disabled={processingIndex !== null}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Status indicator */}
                        {suggestion.status === 'accepted' && (
                          <div className="suggestion-status accepted">
                            <span className="status-icon">✓</span>
                            Applied to {DEPARTMENT_LABELS[suggestion.selectedDepartment] || 'knowledge base'}
                          </div>
                        )}
                        {suggestion.status === 'rejected' && (
                          <div className="suggestion-status rejected">
                            <span className="status-icon">×</span> Rejected
                          </div>
                        )}
                        {suggestion.status === 'failed' && (
                          <div className="suggestion-failed-area">
                            <div className="suggestion-status failed">
                              <span className="status-icon">!</span> Failed to save
                            </div>
                            <div className="failed-actions">
                              <button
                                className="action-btn retry"
                                onClick={() => retrySuggestion(index)}
                              >
                                Try Again
                              </button>
                              <button
                                className="action-btn reject"
                                onClick={() => rejectSuggestion(index)}
                              >
                                Skip
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {pendingSuggestions.length === 0 && (
              <div className="curator-all-done">
                <button className="curator-done-btn" onClick={handleClose}>
                  Done
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
