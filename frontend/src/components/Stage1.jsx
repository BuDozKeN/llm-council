import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './Stage1.css';

export default function Stage1({ responses, streaming, isLoading }) {
  const [activeTab, setActiveTab] = useState(0);

  // Build display data from either streaming or final responses
  const displayData = [];

  if (streaming && Object.keys(streaming).length > 0) {
    // Use streaming data
    Object.entries(streaming).forEach(([model, data]) => {
      displayData.push({
        model,
        response: data.text,
        isStreaming: !data.complete,
        hasError: data.error,
      });
    });
  } else if (responses && responses.length > 0) {
    // Use final responses
    responses.forEach((resp) => {
      displayData.push({
        model: resp.model,
        response: resp.response,
        isStreaming: false,
        hasError: false,
      });
    });
  }

  // Auto-select first tab with content
  useEffect(() => {
    if (displayData.length > 0 && activeTab >= displayData.length) {
      setActiveTab(0);
    }
  }, [displayData.length, activeTab]);

  if (displayData.length === 0 && !isLoading) {
    return null;
  }

  // Show loading state if stage1 is loading but no streaming data yet
  if (displayData.length === 0 && isLoading) {
    return (
      <div className="stage stage1">
        <h3 className="stage-title">Stage 1: Individual Responses</h3>
        <div className="stage-loading">
          <div className="loading-spinner"></div>
          <span>Waiting for models to respond...</span>
        </div>
      </div>
    );
  }

  const activeData = displayData[activeTab] || displayData[0];

  return (
    <div className="stage stage1">
      <h3 className="stage-title">Stage 1: Individual Responses</h3>

      <div className="tabs">
        {displayData.map((data, index) => (
          <button
            key={data.model}
            className={`tab ${activeTab === index ? 'active' : ''} ${data.isStreaming ? 'streaming' : ''} ${data.hasError ? 'error' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {data.isStreaming && <span className="streaming-dot"></span>}
            {data.model.split('/')[1] || data.model}
            {data.hasError && <span className="error-indicator">!</span>}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="model-name">
          {activeData.model}
          {activeData.isStreaming && <span className="typing-indicator">●</span>}
        </div>
        <div className={`response-text markdown-content ${activeData.hasError ? 'error-text' : ''}`}>
          <ReactMarkdown>{activeData.response || ''}</ReactMarkdown>
          {activeData.isStreaming && <span className="cursor">▊</span>}
        </div>
      </div>
    </div>
  );
}
