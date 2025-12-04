import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './Triage.css';

export default function Triage({
  triageResult,
  originalQuestion,
  onRespond,
  onSkip,
  onProceed,
  isLoading,
}) {
  const [response, setResponse] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedConstraints, setEditedConstraints] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (response.trim()) {
      onRespond(response.trim());
      setResponse('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const startEditing = () => {
    setEditedConstraints({ ...triageResult.constraints });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedConstraints(null);
    setIsEditing(false);
  };

  const saveEdits = () => {
    // Build enhanced query with edited constraints
    const c = editedConstraints;
    const enhanced = `${originalQuestion}

Context:
- Who: ${c.who || 'Not specified'}
- Goal: ${c.goal || 'Not specified'}
- Budget: ${c.budget || 'Not specified'}
- Priority: ${c.risk || 'Not specified'}`;

    setIsEditing(false);
    onProceed(enhanced);
  };

  const updateConstraint = (key, value) => {
    setEditedConstraints(prev => ({ ...prev, [key]: value }));
  };

  if (!triageResult) return null;

  const { ready, constraints, questions, enhanced_query } = triageResult;
  const displayConstraints = isEditing ? editedConstraints : constraints;

  // Ready state - show summary and proceed
  if (ready) {
    return (
      <div className="triage-conversation">
        {/* User's question */}
        <div className="triage-message user">
          <div className="message-label">You</div>
          <div className="message-bubble user">{originalQuestion}</div>
        </div>

        {/* AI ready response */}
        <div className="triage-message ai">
          <div className="message-label">Pre-Council</div>
          <div className="message-bubble ai ready">
            <div className="ready-header">
              <span className="ready-icon">✓</span>
              <span>Got it! Here's what I understood:</span>
              {!isEditing && (
                <button className="edit-icon-btn" onClick={startEditing} title="Edit constraints">
                  ✎
                </button>
              )}
            </div>

            <div className="constraints-summary">
              {displayConstraints.who !== undefined && (
                <div className="constraint-row">
                  <span className="constraint-label">Who:</span>
                  {isEditing ? (
                    <textarea
                      className="constraint-edit"
                      value={editedConstraints.who || ''}
                      onChange={(e) => updateConstraint('who', e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <span className="constraint-value">{constraints.who}</span>
                  )}
                </div>
              )}
              {displayConstraints.goal !== undefined && (
                <div className="constraint-row">
                  <span className="constraint-label">Goal:</span>
                  {isEditing ? (
                    <textarea
                      className="constraint-edit"
                      value={editedConstraints.goal || ''}
                      onChange={(e) => updateConstraint('goal', e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <span className="constraint-value">{constraints.goal}</span>
                  )}
                </div>
              )}
              {displayConstraints.budget !== undefined && (
                <div className="constraint-row">
                  <span className="constraint-label">Budget:</span>
                  {isEditing ? (
                    <textarea
                      className="constraint-edit"
                      value={editedConstraints.budget || ''}
                      onChange={(e) => updateConstraint('budget', e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <span className="constraint-value">{constraints.budget}</span>
                  )}
                </div>
              )}
              {displayConstraints.risk !== undefined && (
                <div className="constraint-row">
                  <span className="constraint-label">Priority:</span>
                  {isEditing ? (
                    <textarea
                      className="constraint-edit"
                      value={editedConstraints.risk || ''}
                      onChange={(e) => updateConstraint('risk', e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <span className="constraint-value">{constraints.risk}</span>
                  )}
                </div>
              )}
            </div>

            <div className="ready-actions">
              {isEditing ? (
                <>
                  <button
                    className="proceed-btn"
                    onClick={saveEdits}
                    disabled={isLoading}
                  >
                    Save & Send →
                  </button>
                  <button
                    className="edit-btn"
                    onClick={cancelEditing}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="proceed-btn"
                    onClick={() => onProceed(enhanced_query)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Send to Council →'}
                  </button>
                  <button
                    className="edit-btn"
                    onClick={onSkip}
                    disabled={isLoading}
                  >
                    Start over
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not ready - show conversation
  return (
    <div className="triage-conversation">
      {/* User's question */}
      <div className="triage-message user">
        <div className="message-label">You</div>
        <div className="message-bubble user">{originalQuestion}</div>
      </div>

      {/* AI asking for context */}
      <div className="triage-message ai">
        <div className="message-label">Pre-Council</div>
        <div className="message-bubble ai">
          {questions ? (
            <div className="ai-questions">
              <ReactMarkdown>{questions}</ReactMarkdown>
            </div>
          ) : (
            <div className="ai-questions">
              <p>Before I send this to the council, could you tell me:</p>
              <ul>
                <li>Who would handle this?</li>
                <li>What's your budget?</li>
                <li>Is this for immediate revenue or long-term value?</li>
                <li>Speed or quality priority?</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Response input */}
      <div className="triage-input">
        <form onSubmit={handleSubmit}>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            disabled={isLoading}
            rows={2}
            autoFocus
          />
          <div className="input-actions">
            <button
              type="button"
              className="skip-btn"
              onClick={onSkip}
              disabled={isLoading}
            >
              Skip
            </button>
            <button
              type="submit"
              className="send-btn"
              disabled={!response.trim() || isLoading}
            >
              {isLoading ? '...' : 'Reply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
