import { useState } from 'react';
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

  // Quick response helpers
  const appendToResponse = (text) => {
    setResponse(prev => prev ? `${prev}\n${text}` : text);
  };

  if (!triageResult) return null;

  const { ready, constraints, missing, enhanced_query } = triageResult;

  // If ready, show success state
  if (ready) {
    return (
      <div className="triage-container">
        <div className="triage-user-question">
          <div className="message-label">You</div>
          <div className="message-content">{originalQuestion}</div>
        </div>

        <div className="triage-response">
          <div className="message-label">Pre-Council Check</div>
          <div className="triage-card ready">
            <div className="triage-header ready">
              <span className="triage-header-icon">✓</span>
              <span className="triage-header-text">Ready to send</span>
            </div>
            <div className="triage-body">
              <div className="triage-constraints-grid">
                {constraints.who && (
                  <div className="constraint-chip">
                    <span className="chip-label">Who</span>
                    <span className="chip-value">{constraints.who}</span>
                  </div>
                )}
                {constraints.goal && (
                  <div className="constraint-chip">
                    <span className="chip-label">Goal</span>
                    <span className="chip-value">{constraints.goal}</span>
                  </div>
                )}
                {constraints.budget && (
                  <div className="constraint-chip">
                    <span className="chip-label">Budget</span>
                    <span className="chip-value">{constraints.budget}</span>
                  </div>
                )}
                {constraints.risk && (
                  <div className="constraint-chip">
                    <span className="chip-label">Quality</span>
                    <span className="chip-value">{constraints.risk}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="triage-ready-actions">
              <button
                className="triage-proceed-btn"
                onClick={() => onProceed(enhanced_query)}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send to Council →'}
              </button>
              <button
                className="triage-edit-btn"
                onClick={onSkip}
                disabled={isLoading}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not ready - show clean question cards
  return (
    <div className="triage-container">
      <div className="triage-user-question">
        <div className="message-label">You</div>
        <div className="message-content">{originalQuestion}</div>
      </div>

      <div className="triage-response">
        <div className="message-label">Pre-Council Check</div>
        <div className="triage-card needs-info">
          <div className="triage-header needs-info">
            <span className="triage-header-icon">?</span>
            <span className="triage-header-text">Quick context needed</span>
          </div>

          <div className="triage-body">
            {/* Question Cards */}
            <div className="triage-questions-grid">
              {missing?.includes('who') && (
                <div className="question-card">
                  <div className="question-title">Who's handling this?</div>
                  <div className="quick-options">
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => appendToResponse('I (founder) will do this myself')}
                    >
                      Me (Founder)
                    </button>
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => appendToResponse('My developer will handle this')}
                    >
                      Developer
                    </button>
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => appendToResponse('Will hire someone for this')}
                    >
                      Hire someone
                    </button>
                  </div>
                </div>
              )}

              {missing?.includes('goal') && (
                <div className="question-card">
                  <div className="question-title">What's the priority?</div>
                  <div className="quick-options">
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => appendToResponse('Need revenue/cash flow now (survival)')}
                    >
                      Cash flow NOW
                    </button>
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => appendToResponse('Building for long-term value/exit')}
                    >
                      Long-term value
                    </button>
                  </div>
                </div>
              )}

              {missing?.includes('budget') && (
                <div className="question-card">
                  <div className="question-title">Budget for this?</div>
                  <div className="quick-options">
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => appendToResponse('$0 budget - use existing resources only')}
                    >
                      $0
                    </button>
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => appendToResponse('Small budget available (under $500)')}
                    >
                      Under $500
                    </button>
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => appendToResponse('Have budget to invest')}
                    >
                      Can invest
                    </button>
                  </div>
                </div>
              )}

              {missing?.includes('risk') && (
                <div className="question-card">
                  <div className="question-title">Speed vs Quality?</div>
                  <div className="quick-options">
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => appendToResponse('Speed is priority - good enough is fine')}
                    >
                      Speed first
                    </button>
                    <button
                      type="button"
                      className="quick-btn"
                      onClick={() => appendToResponse('Quality is non-negotiable')}
                    >
                      Quality first
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Show already known constraints if any */}
            {Object.values(constraints).some(v => v) && (
              <div className="triage-known-inline">
                <span className="known-label">Already noted:</span>
                {constraints.who && <span className="known-chip">{constraints.who}</span>}
                {constraints.goal && <span className="known-chip">{constraints.goal}</span>}
                {constraints.budget && <span className="known-chip">{constraints.budget}</span>}
                {constraints.risk && <span className="known-chip">{constraints.risk}</span>}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="triage-input-area">
            <form className="triage-input-form" onSubmit={handleSubmit}>
              <textarea
                className="triage-textarea"
                placeholder="Type your answers or click the buttons above..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={2}
              />
              <div className="triage-input-actions">
                <button
                  type="button"
                  className="triage-skip-btn"
                  onClick={onSkip}
                  disabled={isLoading}
                >
                  Skip
                </button>
                <button
                  type="submit"
                  className="triage-send-btn"
                  disabled={!response.trim() || isLoading}
                >
                  {isLoading ? '...' : 'Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
