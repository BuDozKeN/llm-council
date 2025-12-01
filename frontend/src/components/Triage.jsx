import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

  const { ready, constraints, missing, questions, enhanced_query } = triageResult;

  // If ready, show success state
  if (ready) {
    return (
      <div className="triage-chat">
        {/* Original question */}
        <div className="triage-user-message">
          <div className="triage-avatar user">You</div>
          <div className="triage-bubble user">
            {originalQuestion}
          </div>
        </div>

        {/* AI ready message */}
        <div className="triage-ai-message">
          <div className="triage-avatar ai">🎯</div>
          <div className="triage-bubble ai ready">
            <div className="ready-header">
              <span className="ready-icon">✅</span>
              <strong>Great! I have everything I need.</strong>
            </div>

            <div className="constraints-summary-chat">
              <p>Here's what I understood:</p>
              <ul className="constraint-list">
                {constraints.who && (
                  <li><strong>Who's doing this:</strong> {constraints.who}</li>
                )}
                {constraints.goal && (
                  <li><strong>Your goal:</strong> {constraints.goal}</li>
                )}
                {constraints.budget && (
                  <li><strong>Budget:</strong> {constraints.budget}</li>
                )}
                {constraints.risk && (
                  <li><strong>Quality priority:</strong> {constraints.risk}</li>
                )}
              </ul>
            </div>

            <div className="triage-actions-chat">
              <button
                className="proceed-btn-chat"
                onClick={() => onProceed(enhanced_query)}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send to Council →'}
              </button>
              <button
                className="edit-btn-chat"
                onClick={onSkip}
                disabled={isLoading}
              >
                Edit & Resend
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not ready - show conversational questions
  return (
    <div className="triage-chat">
      {/* Original question */}
      <div className="triage-user-message">
        <div className="triage-avatar user">You</div>
        <div className="triage-bubble user">
          {originalQuestion}
        </div>
      </div>

      {/* AI asking for more info */}
      <div className="triage-ai-message">
        <div className="triage-avatar ai">🔍</div>
        <div className="triage-bubble ai">
          <div className="triage-intro">
            <strong>Before I send this to the council, I need a bit more context to get you the best answer.</strong>
          </div>

          {/* What we already know */}
          {Object.values(constraints).some(v => v) && (
            <div className="what-we-know">
              <p className="section-label">✓ What I already know:</p>
              <ul className="known-list">
                {constraints.who && <li><strong>Who:</strong> {constraints.who}</li>}
                {constraints.goal && <li><strong>Goal:</strong> {constraints.goal}</li>}
                {constraints.budget && <li><strong>Budget:</strong> {constraints.budget}</li>}
                {constraints.risk && <li><strong>Quality:</strong> {constraints.risk}</li>}
              </ul>
            </div>
          )}

          {/* What's missing - highlighted */}
          <div className="what-we-need">
            <p className="section-label missing-label">⚠️ What I still need:</p>
            <ul className="missing-list">
              {missing?.includes('who') && (
                <li className="missing-item">
                  <strong>Who will do this?</strong>
                  <span className="hint">Are you (the founder) doing this yourself, or your developer, or hiring someone?</span>
                </li>
              )}
              {missing?.includes('goal') && (
                <li className="missing-item">
                  <strong>What's your main goal?</strong>
                  <span className="hint">Do you need cash flow NOW (survival), or are you building for a future exit?</span>
                </li>
              )}
              {missing?.includes('budget') && (
                <li className="missing-item">
                  <strong>What's your budget?</strong>
                  <span className="hint">Is this $0 (use what you have), or can you invest some money?</span>
                </li>
              )}
              {missing?.includes('risk') && (
                <li className="missing-item">
                  <strong>Speed or quality?</strong>
                  <span className="hint">Can we prioritize speed, or is quality/defensibility non-negotiable?</span>
                </li>
              )}
            </ul>
          </div>

          {/* Custom AI questions if any */}
          {questions && (
            <div className="ai-questions">
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{questions}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Response input - chat style */}
      <div className="triage-response-area">
        <form className="triage-chat-form" onSubmit={handleSubmit}>
          <textarea
            className="triage-chat-input"
            placeholder="Type your answers here... (Enter to send, Shift+Enter for new line)"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={2}
            autoFocus
          />
          <div className="triage-chat-actions">
            <button
              type="button"
              className="skip-btn-chat"
              onClick={onSkip}
              disabled={isLoading}
            >
              Skip & Send Anyway
            </button>
            <button
              type="submit"
              className="send-btn-chat"
              disabled={!response.trim() || isLoading}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
