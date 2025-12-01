import ReactMarkdown from 'react-markdown';
import './Stage3.css';

export default function Stage3({ finalResponse, streaming, isLoading }) {
  // Determine what to display
  const displayText = finalResponse?.response || streaming?.text || '';
  const isStreaming = streaming && !streaming.complete;
  const hasError = streaming?.error;
  const chairmanModel = finalResponse?.model || 'Chairman';

  // Show loading state if stage3 is loading but no streaming data yet
  if (!displayText && isLoading) {
    return (
      <div className="stage stage3">
        <h3 className="stage-title">Stage 3: Final Council Answer</h3>
        <div className="stage-loading">
          <div className="loading-spinner"></div>
          <span>Chairman is synthesizing the final answer...</span>
        </div>
      </div>
    );
  }

  if (!displayText && !isLoading) {
    return null;
  }

  return (
    <div className="stage stage3">
      <h3 className="stage-title">Stage 3: Final Council Answer</h3>
      <div className="final-response">
        <div className="chairman-label">
          Chairman: {chairmanModel.split('/')[1] || chairmanModel}
          {isStreaming && <span className="typing-indicator">●</span>}
          {!isStreaming && !hasError && displayText && <span className="complete-badge">Complete</span>}
          {hasError && <span className="error-badge">Error</span>}
        </div>
        <div className={`final-text markdown-content ${hasError ? 'error-text' : ''}`}>
          {hasError ? (
            <p className="empty-message">{displayText || 'An error occurred while generating the synthesis.'}</p>
          ) : (
            <>
              <ReactMarkdown>{displayText}</ReactMarkdown>
              {isStreaming && <span className="cursor">▊</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
