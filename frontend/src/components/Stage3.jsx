import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Stage3.css';

export default function Stage3({ finalResponse, streaming, isLoading }) {
  // Determine what to display
  const displayText = finalResponse?.response || streaming?.text || '';
  const isStreaming = streaming && !streaming.complete;
  const hasError = streaming?.error;
  const chairmanModel = finalResponse?.model || streaming?.model || 'google/gemini-3-pro-preview';
  const shortModelName = chairmanModel.split('/')[1] || chairmanModel;

  // Show thinking state if stage3 is loading but no streaming data yet
  if (!displayText && isLoading) {
    return (
      <div className="stage stage3">
        <h3 className="stage-title">Stage 3: Final Council Answer</h3>
        <div className="final-response">
          <div className="chairman-label">
            Chairman: {shortModelName}
            <span className="thinking-badge">Thinking<span className="thinking-dots"><span>.</span><span>.</span><span>.</span></span></span>
          </div>
          <div className="thinking-container">
            <div className="thinking-message">
              <span className="thinking-icon">🧠</span>
              <span>Analyzing all council responses and peer rankings to synthesize the final answer...</span>
            </div>
          </div>
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
          Chairman: {shortModelName}
          {isStreaming && <span className="typing-indicator">●</span>}
          {!isStreaming && !hasError && displayText && <span className="complete-badge">Complete</span>}
          {hasError && <span className="error-badge">Error</span>}
        </div>
        <div className={`final-text markdown-content ${hasError ? 'error-text' : ''}`}>
          {hasError ? (
            <p className="empty-message">{displayText || 'An error occurred while generating the synthesis.'}</p>
          ) : (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
              {isStreaming && <span className="cursor">▊</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
