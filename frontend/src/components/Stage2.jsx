import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Stage2.css';

function deAnonymizeText(text, labelToModel) {
  if (!labelToModel) return text;

  let result = text;
  // Replace each "Response X" with the actual model name
  Object.entries(labelToModel).forEach(([label, model]) => {
    const modelShortName = model.split('/')[1] || model;
    result = result.replace(new RegExp(label, 'g'), `**${modelShortName}**`);
  });
  return result;
}

export default function Stage2({ rankings, streaming, labelToModel, aggregateRankings, isLoading }) {
  const [activeTab, setActiveTab] = useState(0);

  // Build display data from either streaming or final rankings
  const displayData = [];

  if (streaming && Object.keys(streaming).length > 0) {
    // Use streaming data
    Object.entries(streaming).forEach(([model, data]) => {
      displayData.push({
        model,
        ranking: data.text,
        isStreaming: !data.complete,
        isComplete: data.complete && !data.error,
        hasError: data.error,
        isEmpty: data.complete && !data.text && !data.error,
        parsed_ranking: null, // Can't parse until complete
      });
    });
  } else if (rankings && rankings.length > 0) {
    // Use final rankings
    rankings.forEach((rank) => {
      displayData.push({
        model: rank.model,
        ranking: rank.ranking,
        isStreaming: false,
        isComplete: true,
        hasError: false,
        isEmpty: !rank.ranking,
        parsed_ranking: rank.parsed_ranking,
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

  // Show loading state if stage2 is loading but no streaming data yet
  if (displayData.length === 0 && isLoading) {
    return (
      <div className="stage stage2">
        <h3 className="stage-title">Stage 2: Peer Rankings</h3>
        <div className="stage-loading">
          <div className="loading-spinner"></div>
          <span>Waiting for peer evaluations...</span>
        </div>
      </div>
    );
  }

  const activeData = displayData[activeTab] || displayData[0];

  return (
    <div className="stage stage2">
      <h3 className="stage-title">Stage 2: Peer Rankings</h3>

      <h4>Raw Evaluations</h4>
      <p className="stage-description">
        Each model evaluated all responses (anonymized as Response A, B, C, etc.) and provided rankings.
        Below, model names are shown in <strong>bold</strong> for readability, but the original evaluation used anonymous labels.
      </p>

      <div className="tabs">
        {displayData.map((data, index) => (
          <button
            key={data.model}
            className={`tab ${activeTab === index ? 'active' : ''} ${data.isStreaming ? 'streaming' : ''} ${data.hasError || data.isEmpty ? 'error' : ''} ${data.isComplete && !data.isEmpty ? 'complete' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {data.isStreaming && <span className="status-icon streaming-dot" title="Generating..."></span>}
            {data.isComplete && !data.isEmpty && <span className="status-icon complete-icon" title="Complete">✓</span>}
            {(data.hasError || data.isEmpty) && <span className="status-icon error-icon" title={data.hasError ? 'Error' : 'No response'}>⚠</span>}
            {data.model.split('/')[1] || data.model}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="ranking-model">
          {activeData.model}
          {activeData.isStreaming && <span className="typing-indicator">●</span>}
          {activeData.isComplete && !activeData.isEmpty && <span className="complete-badge">Complete</span>}
          {activeData.isEmpty && <span className="error-badge">No Response</span>}
          {activeData.hasError && <span className="error-badge">Error</span>}
        </div>
        <div className={`ranking-content markdown-content ${activeData.hasError || activeData.isEmpty ? 'error-text' : ''}`}>
          {activeData.isEmpty ? (
            <p className="empty-message">This model did not return an evaluation.</p>
          ) : activeData.hasError ? (
            <p className="empty-message">{activeData.ranking || 'An error occurred while generating the evaluation.'}</p>
          ) : (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {deAnonymizeText(activeData.ranking || '', labelToModel)}
              </ReactMarkdown>
              {activeData.isStreaming && <span className="cursor">▊</span>}
            </>
          )}
        </div>

        {activeData.parsed_ranking &&
         activeData.parsed_ranking.length > 0 && (
          <div className="parsed-ranking">
            <strong>Extracted Ranking:</strong>
            <ol>
              {activeData.parsed_ranking.map((label, i) => (
                <li key={i}>
                  {labelToModel && labelToModel[label]
                    ? labelToModel[label].split('/')[1] || labelToModel[label]
                    : label}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {aggregateRankings && aggregateRankings.length > 0 && (
        <div className="aggregate-rankings">
          <h4>Aggregate Rankings (Street Cred)</h4>
          <p className="stage-description">
            Combined results across all peer evaluations (lower score is better):
          </p>
          <div className="aggregate-list">
            {aggregateRankings.map((agg, index) => (
              <div key={index} className="aggregate-item">
                <span className="rank-position">#{index + 1}</span>
                <span className="rank-model">
                  {agg.model.split('/')[1] || agg.model}
                </span>
                <span className="rank-score">
                  Avg: {agg.average_rank.toFixed(2)}
                </span>
                <span className="rank-count">
                  (by {agg.rankings_count}/{aggregateRankings.length} judges)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
