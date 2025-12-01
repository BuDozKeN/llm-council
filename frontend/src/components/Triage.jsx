import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Triage.css';

const CONSTRAINT_LABELS = {
  who: { label: 'WHO', icon: '👤', description: 'Who will execute?' },
  goal: { label: 'GOAL', icon: '🎯', description: 'Survival vs Exit Value?' },
  budget: { label: 'BUDGET', icon: '💰', description: 'Available spend?' },
  risk: { label: 'RISK', icon: '⚖️', description: 'Speed vs Quality?' },
};

export default function Triage({
  triageResult,
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

  // If ready, show the enhanced query and proceed button
  if (ready) {
    return (
      <div className="triage triage-ready">
        <div className="triage-header">
          <span className="triage-icon">✅</span>
          <h3>Ready for Council</h3>
        </div>

        <div className="constraints-summary">
          <h4>Extracted Constraints:</h4>
          <div className="constraints-grid">
            {Object.entries(constraints).map(([key, value]) => {
              const config = CONSTRAINT_LABELS[key];
              return (
                <div key={key} className={`constraint-item ${value ? 'filled' : 'empty'}`}>
                  <span className="constraint-icon">{config?.icon || '❓'}</span>
                  <span className="constraint-label">{config?.label || key}</span>
                  <span className="constraint-value">{value || 'Not specified'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {enhanced_query && (
          <div className="enhanced-query">
            <h4>Enhanced Query for Council:</h4>
            <div className="query-preview markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{enhanced_query}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="triage-actions">
          <button className="proceed-btn" onClick={() => onProceed(enhanced_query)} disabled={isLoading}>
            {isLoading ? 'Sending to Council...' : 'Proceed to Council →'}
          </button>
        </div>
      </div>
    );
  }

  // Not ready - show questions
  return (
    <div className="triage triage-pending">
      <div className="triage-header">
        <span className="triage-icon">🔍</span>
        <h3>Pre-Council Triage</h3>
        <span className="triage-subtitle">Let's make sure the council has what it needs</span>
      </div>

      <div className="constraints-summary">
        <h4>Constraint Status:</h4>
        <div className="constraints-grid">
          {Object.entries(constraints).map(([key, value]) => {
            const config = CONSTRAINT_LABELS[key];
            const isMissing = missing?.includes(key);
            return (
              <div key={key} className={`constraint-item ${value ? 'filled' : ''} ${isMissing ? 'missing' : ''}`}>
                <span className="constraint-icon">{config?.icon || '❓'}</span>
                <span className="constraint-label">{config?.label || key}</span>
                <span className="constraint-value">
                  {value || (isMissing ? '⚠️ Needed' : 'Not specified')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {questions && (
        <div className="triage-questions">
          <div className="questions-content markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{questions}</ReactMarkdown>
          </div>
        </div>
      )}

      <form className="triage-form" onSubmit={handleSubmit}>
        <textarea
          className="triage-input"
          placeholder="Provide the missing information... (Shift+Enter for new line)"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={3}
        />
        <div className="triage-form-actions">
          <button type="button" className="skip-btn" onClick={onSkip} disabled={isLoading}>
            Skip Triage
          </button>
          <button type="submit" className="respond-btn" disabled={!response.trim() || isLoading}>
            {isLoading ? 'Analyzing...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
