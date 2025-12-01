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

  if (!triageResult) return null;

  const { ready, constraints, questions, enhanced_query } = triageResult;

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
            </div>
            <div className="constraints-summary">
              {constraints.who && (
                <div className="constraint-row">
                  <span className="constraint-label">Who:</span>
                  <span className="constraint-value">{constraints.who}</span>
                </div>
              )}
              {constraints.goal && (
                <div className="constraint-row">
                  <span className="constraint-label">Goal:</span>
                  <span className="constraint-value">{constraints.goal}</span>
                </div>
              )}
              {constraints.budget && (
                <div className="constraint-row">
                  <span className="constraint-label">Budget:</span>
                  <span className="constraint-value">{constraints.budget}</span>
                </div>
              )}
              {constraints.risk && (
                <div className="constraint-row">
                  <span className="constraint-label">Priority:</span>
                  <span className="constraint-value">{constraints.risk}</span>
                </div>
              )}
            </div>
            <div className="ready-actions">
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
