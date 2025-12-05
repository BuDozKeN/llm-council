import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { computeInlineDiff } from '../utils/diffUtils';
import './CuratorPanel.css';

/**
 * CuratorPanel - Knowledge Curator component
 *
 * Analyzes conversations and suggests updates to the business context.
 * Shows suggestions in a user-friendly format with Accept/Reject/Edit options.
 * Supports dynamic department selection and creating new departments.
 */
export default function CuratorPanel({
  conversationId,
  businessId,
  departmentId,
  departments = [], // Dynamic departments from business config
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
  // New department creation state
  const [creatingDeptForIndex, setCreatingDeptForIndex] = useState(null); // which suggestion is creating a new dept
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCreating, setNewDeptCreating] = useState(false);
  const [localDepartments, setLocalDepartments] = useState([]); // Newly created departments (not yet in config)
  // State for tracking fetched current content for "update" type suggestions
  const [currentContents, setCurrentContents] = useState({}); // { [suggestionIndex]: { content, loading, error } }

  // Build department options: Company-wide + dynamic departments + locally created ones
  const departmentOptions = useMemo(() => {
    const options = [{ id: 'company', name: 'Company-wide' }];

    // Add departments from business config
    if (departments && departments.length > 0) {
      departments.forEach(dept => {
        options.push({ id: dept.id, name: dept.name });
      });
    }

    // Add any locally created departments (during this curator session)
    localDepartments.forEach(dept => {
      if (!options.find(o => o.id === dept.id)) {
        options.push(dept);
      }
    });

    return options;
  }, [departments, localDepartments]);

  // Build role-to-department mapping from departments data
  // This maps role IDs (cto, cmo, etc.) to their parent department and role info
  const roleMapping = useMemo(() => {
    const mapping = {};
    if (departments && departments.length > 0) {
      departments.forEach(dept => {
        if (dept.roles && Array.isArray(dept.roles)) {
          dept.roles.forEach(role => {
            mapping[role.id] = {
              roleId: role.id,
              roleName: role.name,
              departmentId: dept.id,
              departmentName: dept.name,
            };
          });
        }
      });
    }
    return mapping;
  }, [departments]);

  // Get department display name by ID (handles both department IDs and role IDs)
  const getDepartmentLabel = (deptId) => {
    if (!deptId || deptId === 'company') return 'Company-wide';

    // First, check if it's a role ID and map to department
    if (roleMapping[deptId]) {
      const role = roleMapping[deptId];
      return `${role.departmentName} (${role.roleName})`;
    }

    // Otherwise, look up as department ID
    const dept = departmentOptions.find(d => d.id === deptId);
    return dept ? dept.name : deptId;
  };

  // Get the actual department ID for a suggestion (maps role IDs to departments)
  const getActualDepartmentId = (deptId) => {
    if (!deptId || deptId === 'company') return 'company';

    // If it's a role ID, return the parent department
    if (roleMapping[deptId]) {
      return roleMapping[deptId].departmentId;
    }

    return deptId;
  };

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

  // Save curator run when closing (updates final counts if user made decisions)
  const handleClose = async () => {
    // If user made decisions (accepted/rejected), save an updated record with final counts
    if (status === 'done' && hasSavedRun) {
      const acceptedCount = suggestions.filter(s => s.status === 'accepted').length;
      const rejectedCount = suggestions.filter(s => s.status === 'rejected').length;

      // Only save if user actually made some decisions
      if (acceptedCount > 0 || rejectedCount > 0) {
        try {
          await api.saveCuratorRun(
            conversationId,
            businessId,
            suggestions.length,
            acceptedCount,
            rejectedCount
          );
        } catch (err) {
          console.error('Failed to save curator run with final counts:', err);
        }
      }
    }
    onClose();
  };

  // Fetch current content for a specific update suggestion
  const fetchCurrentContent = async (index, suggestion) => {
    if (suggestion.type !== 'update' || !suggestion.section) {
      return;
    }

    // Mark as loading
    setCurrentContents(prev => ({
      ...prev,
      [index]: { content: null, loading: true, error: null }
    }));

    try {
      const dept = getActualDepartmentId(suggestion.department);
      const result = await api.getContextSection(businessId, suggestion.section, dept);

      setCurrentContents(prev => ({
        ...prev,
        [index]: {
          content: result.content || '',
          loading: false,
          error: null,
          exists: result.exists
        }
      }));
    } catch (err) {
      console.error('Failed to fetch current content for suggestion', index, err);
      setCurrentContents(prev => ({
        ...prev,
        [index]: { content: null, loading: false, error: err.message }
      }));
    }
  };

  const startAnalysis = async () => {
    setStatus('analyzing');
    setError(null);
    setSuggestions([]);
    setCurrentContents({}); // Reset current contents

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
        // Initialize each suggestion with:
        // - originalDepartment: the raw LLM suggestion (may be role ID like "cto")
        // - selectedDepartment: the actual department ID for the dropdown (mapped from role if needed)
        const suggestionsWithDept = (result.suggestions || []).map(s => ({
          ...s,
          originalDepartment: s.department, // Preserve the original LLM suggestion
          selectedDepartment: getActualDepartmentId(s.department),
        }));
        setSuggestions(suggestionsWithDept);
        setSummary(result.summary || '');
        setStatus('done');

        // Save curator run immediately when analysis completes
        // This ensures the record is saved even if user refreshes or navigates away
        try {
          await api.saveCuratorRun(
            conversationId,
            businessId,
            suggestionsWithDept.length,
            0, // No suggestions accepted yet
            0  // No suggestions rejected yet
          );
          setHasSavedRun(true);
        } catch (saveErr) {
          console.error('Failed to save initial curator run:', saveErr);
        }

        // Fetch current content for all "update" type suggestions
        suggestionsWithDept.forEach((s, idx) => {
          if (s.type === 'update') {
            fetchCurrentContent(idx, s);
          }
        });
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

  // Start creating a new department for a specific suggestion
  const startCreatingDepartment = (index) => {
    setCreatingDeptForIndex(index);
    setNewDeptName('');
  };

  // Cancel new department creation
  const cancelCreatingDepartment = () => {
    setCreatingDeptForIndex(null);
    setNewDeptName('');
  };

  // Create a new department and select it for the suggestion
  const createDepartment = async (index) => {
    if (!newDeptName.trim()) return;

    setNewDeptCreating(true);

    try {
      // Create department ID from name (lowercase, hyphenated)
      const deptId = newDeptName.trim().toLowerCase().replace(/\s+/g, '-');

      // Call API to create department (this will scaffold the folder structure)
      await api.createDepartment(businessId, {
        id: deptId,
        name: newDeptName.trim(),
      });

      // Add to local departments list
      const newDept = { id: deptId, name: newDeptName.trim() };
      setLocalDepartments(prev => [...prev, newDept]);

      // Select the new department for this suggestion
      changeDepartment(index, deptId);

      // Close the creation form
      setCreatingDeptForIndex(null);
      setNewDeptName('');
    } catch (err) {
      console.error('Failed to create department:', err);
      // Show error to user (could add error state if needed)
      alert('Failed to create department: ' + err.message);
    } finally {
      setNewDeptCreating(false);
    }
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

  // Render inline diff view with red/green highlighting
  const renderInlineDiff = (index) => {
    const currentData = currentContents[index];

    // If still loading
    if (!currentData || currentData.loading) {
      return (
        <div className="diff-loading">
          Loading current content for comparison...
        </div>
      );
    }

    // If there was an error fetching
    if (currentData.error) {
      return (
        <div className="diff-error">
          Could not load current content: {currentData.error}
        </div>
      );
    }

    const suggestion = suggestions[index];
    const currentText = stripMarkdown(currentData.content || '');
    const proposedText = stripMarkdown(suggestion.proposed_text || '');

    // Compute the diff
    const diffParts = computeInlineDiff(currentText, proposedText);

    return (
      <div className="diff-view">
        <div className="diff-legend">
          <span className="diff-legend-item removed">Removed</span>
          <span className="diff-legend-item added">Added</span>
          <span className="diff-legend-item unchanged">Unchanged</span>
        </div>
        <div className="diff-content">
          {diffParts.map((part, idx) => (
            <span
              key={idx}
              className={`diff-part diff-${part.type}`}
            >
              {part.value}
            </span>
          ))}
        </div>
      </div>
    );
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
                              ? `Applied to ${getDepartmentLabel(suggestion.selectedDepartment)}`
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

                        {/* Routing warning for potentially misrouted company suggestions */}
                        {suggestion.routing_warning && (
                          <div className="routing-warning">
                            <div className="routing-warning-header">
                              <span className="routing-warning-icon">⚠️</span>
                              <span className="routing-warning-title">{suggestion.routing_warning.message}</span>
                            </div>
                            <div className="routing-warning-details">
                              {suggestion.routing_warning.details.map((detail, i) => (
                                <div key={i} className="routing-warning-detail">{detail}</div>
                              ))}
                              {suggestion.routing_warning.suggested_department && (
                                <div className="routing-warning-suggestion">
                                  Consider saving to: <strong>{suggestion.routing_warning.suggested_department}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Content display - inline diff for updates, simple view for new additions */}
                        {editingIndex === index ? (
                          /* Edit mode - show textarea */
                          <div className="suggestion-proposed">
                            <div className="content-label">Edit content:</div>
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
                          </div>
                        ) : suggestion.type === 'update' ? (
                          /* Update type - show inline diff */
                          <div className="suggestion-diff-section">
                            <div className="content-label">Changes to existing content:</div>
                            {renderInlineDiff(index)}
                          </div>
                        ) : (
                          /* New addition - show proposed content only */
                          <div className="suggestion-proposed">
                            <div className="content-label">Suggested addition:</div>
                            <div className="content-text proposed">{formatDisplayText(suggestion.proposed_text)}</div>
                          </div>
                        )}

                        {/* Reason - more prominent */}
                        <div className="suggestion-reason-box">
                          <div className="reason-header">Why this update matters:</div>
                          <div className="reason-text">{suggestion.reason}</div>
                        </div>

                        {/* Actions - including Save Location */}
                        {!suggestion.status && (
                          <div className="suggestion-actions-area">
                            {/* LLM Recommendation banner - show prominently when LLM suggests a department */}
                            {suggestion.department && suggestion.department !== 'company' && (
                              <div className="llm-recommendation">
                                <span className="recommendation-icon">🤖</span>
                                <span className="recommendation-text">
                                  AI recommends saving to <strong>{getDepartmentLabel(suggestion.department)}</strong>
                                </span>
                                {/* Show "Use recommendation" only if user changed from the initial selection */}
                                {suggestion.selectedDepartment !== getActualDepartmentId(suggestion.originalDepartment || suggestion.department) && (
                                  <button
                                    className="use-recommendation-btn"
                                    onClick={() => changeDepartment(index, getActualDepartmentId(suggestion.originalDepartment || suggestion.department))}
                                    disabled={processingIndex !== null}
                                  >
                                    Use recommendation
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Save Location - positioned with actions so user sees it after reading */}
                            <div className="save-location-row">
                              <div className="save-location-label">
                                <span className="save-icon">💾</span>
                                Save to:
                              </div>

                              {/* Show new department creation form or selector */}
                              {creatingDeptForIndex === index ? (
                                <div className="new-dept-form">
                                  <input
                                    type="text"
                                    className="new-dept-input"
                                    placeholder="Enter department name..."
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') createDepartment(index);
                                      if (e.key === 'Escape') cancelCreatingDepartment();
                                    }}
                                    disabled={newDeptCreating}
                                    autoFocus
                                  />
                                  <button
                                    className="new-dept-create-btn"
                                    onClick={() => createDepartment(index)}
                                    disabled={!newDeptName.trim() || newDeptCreating}
                                  >
                                    {newDeptCreating ? 'Creating...' : 'Create'}
                                  </button>
                                  <button
                                    className="new-dept-cancel-btn"
                                    onClick={cancelCreatingDepartment}
                                    disabled={newDeptCreating}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <select
                                    className="department-select"
                                    value={suggestion.selectedDepartment || 'company'}
                                    onChange={(e) => {
                                      if (e.target.value === '__new__') {
                                        startCreatingDepartment(index);
                                      } else {
                                        changeDepartment(index, e.target.value);
                                      }
                                    }}
                                    disabled={processingIndex !== null}
                                  >
                                    {departmentOptions.map(dept => (
                                      <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                        {getActualDepartmentId(suggestion.originalDepartment || suggestion.department) === dept.id ? ' (Recommended)' : ''}
                                      </option>
                                    ))}
                                    <option value="__new__">+ Create new department...</option>
                                  </select>
                                </>
                              )}
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
                            Applied to {getDepartmentLabel(suggestion.selectedDepartment)}
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
