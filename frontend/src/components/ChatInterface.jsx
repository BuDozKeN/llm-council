import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import Triage from './Triage';
import CuratorPanel from './CuratorPanel';
import './ChatInterface.css';

export default function ChatInterface({
  conversation,
  onSendMessage,
  onStopGeneration,
  isLoading,
  businesses = [],
  selectedBusiness,
  onSelectBusiness,
  departments = [],
  selectedDepartment,
  onSelectDepartment,
  channels = [],
  selectedChannel,
  onSelectChannel,
  styles = [],
  selectedStyle,
  onSelectStyle,
  // Independent context toggles
  useCompanyContext,
  onToggleCompanyContext,
  useDepartmentContext,
  onToggleDepartmentContext,
  // Triage props
  triageState,
  originalQuestion,
  isTriageLoading,
  onTriageRespond,
  onTriageSkip,
  onTriageProceed,
}) {
  const [input, setInput] = useState('');
  const [showCurator, setShowCurator] = useState(null); // messageIndex of active curator or null
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const userHasScrolledUp = useRef(false);

  // Check if user is near the bottom of the scroll area
  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100; // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  };

  // Handle user scroll - track if they've scrolled up
  const handleScroll = () => {
    userHasScrolledUp.current = !isNearBottom();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Only auto-scroll if user hasn't scrolled up
  useEffect(() => {
    if (!userHasScrolledUp.current) {
      scrollToBottom();
    }
  }, [conversation]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      userHasScrolledUp.current = false; // Reset so new responses auto-scroll
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!conversation) {
    return (
      <div className="chat-interface">
        <div className="empty-state">
          <h2>Welcome to AI Council</h2>
          <p>Create a new conversation to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="messages-container" ref={messagesContainerRef} onScroll={handleScroll}>
        {/* Triage - show at top when active */}
        {triageState === 'analyzing' && (
          <div className="triage-analyzing">
            <div className="spinner"></div>
            <span>Analyzing your question...</span>
          </div>
        )}

        {triageState && triageState !== 'analyzing' && (
          <Triage
            triageResult={triageState}
            originalQuestion={originalQuestion}
            onRespond={onTriageRespond}
            onSkip={onTriageSkip}
            onProceed={onTriageProceed}
            isLoading={isTriageLoading || isLoading}
          />
        )}

        {/* Show empty state only when no triage and no messages */}
        {conversation.messages.length === 0 && !triageState ? (
          <div className="empty-state">
            <h2>Start a conversation</h2>
            <p>Ask a question to consult the AI Council</p>
          </div>
        ) : conversation.messages.length > 0 ? (
          conversation.messages.map((msg, index) => (
            <div key={index} className="message-group">
              {msg.role === 'user' ? (
                <div className="user-message">
                  <div className="message-label">You</div>
                  <div className="message-content">
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="assistant-message">
                  <div className="message-label">AI Council</div>

                  {/* Stage 1 - show with streaming or final responses */}
                  {(msg.loading?.stage1 || msg.stage1 || (msg.stage1Streaming && Object.keys(msg.stage1Streaming).length > 0)) && (
                    <Stage1
                      responses={msg.stage1}
                      streaming={msg.stage1Streaming}
                      isLoading={msg.loading?.stage1}
                    />
                  )}

                  {/* Stage 2 - show with streaming or final rankings */}
                  {(msg.loading?.stage2 || msg.stage2 || (msg.stage2Streaming && Object.keys(msg.stage2Streaming).length > 0)) && (
                    <Stage2
                      rankings={msg.stage2}
                      streaming={msg.stage2Streaming}
                      labelToModel={msg.metadata?.label_to_model}
                      aggregateRankings={msg.metadata?.aggregate_rankings}
                      isLoading={msg.loading?.stage2}
                    />
                  )}

                  {/* Stage 3 - show with streaming or final response */}
                  {(msg.loading?.stage3 || msg.stage3 || msg.stage3Streaming) && (
                    <Stage3
                      finalResponse={msg.stage3}
                      streaming={msg.stage3Streaming}
                      isLoading={msg.loading?.stage3}
                    />
                  )}

                  {/* Curator Panel - show after Stage 3 is complete, only for last message, and only if business context is enabled */}
                  {index === conversation.messages.length - 1 &&
                    msg.stage3 &&
                    !msg.loading?.stage3 &&
                    selectedBusiness &&
                    (useCompanyContext || useDepartmentContext) &&
                    !isLoading && (
                      showCurator === index ? (
                        <CuratorPanel
                          conversationId={conversation.id}
                          businessId={selectedBusiness}
                          departmentId={selectedDepartment}
                          onClose={() => setShowCurator(null)}
                        />
                      ) : (
                        <button
                          className="curator-trigger-btn"
                          onClick={() => setShowCurator(index)}
                        >
                          Save insights to knowledge base
                        </button>
                      )
                    )}
                </div>
              )}
            </div>
          ))
        ) : null}

        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Consulting the council...</span>
            <button
              className="stop-button-inline"
              onClick={onStopGeneration}
            >
              Stop
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Only show input form when no triage is active */}
      {conversation.messages.length === 0 && !triageState && (
        <form className="input-form" onSubmit={handleSubmit}>
          {/* Clean context bar - minimal, intuitive */}
          {businesses.length > 0 && (
            <div className="context-bar">
              {/* Company selector as subtle dropdown */}
              <select
                id="business-select"
                value={selectedBusiness || ''}
                onChange={(e) => onSelectBusiness(e.target.value || null)}
                disabled={isLoading}
                className="context-select company-select"
              >
                <option value="">No company</option>
                {businesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>
                    {biz.name}
                  </option>
                ))}
              </select>

              {/* When company selected: show company context toggle and department options */}
              {selectedBusiness && (
                <>
                  {/* Company Context toggle - independent */}
                  <button
                    type="button"
                    className={`context-pill ${useCompanyContext ? 'active' : ''}`}
                    onClick={() => onToggleCompanyContext(!useCompanyContext)}
                    disabled={isLoading}
                    title="Toggle company-wide context (main company knowledge)"
                  >
                    <span className="pill-icon">{useCompanyContext ? '✓' : '○'}</span>
                    <span className="pill-text">Company</span>
                  </button>

                  {/* Department selector - always show when company has departments */}
                  {departments.length > 0 && (
                    <>
                      <select
                        id="department-select"
                        value={selectedDepartment || ''}
                        onChange={(e) => onSelectDepartment(e.target.value || null)}
                        disabled={isLoading}
                        className="context-select department-select"
                      >
                        <option value="">General Council</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>

                      {/* Department Context toggle - only when department is selected */}
                      {selectedDepartment && (
                        <button
                          type="button"
                          className={`context-pill ${useDepartmentContext ? 'active' : ''}`}
                          onClick={() => onToggleDepartmentContext(!useDepartmentContext)}
                          disabled={isLoading}
                          title="Toggle department-specific context (department knowledge)"
                        >
                          <span className="pill-icon">{useDepartmentContext ? '✓' : '○'}</span>
                          <span className="pill-text">Dept</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* Channel - only when department has channels */}
                  {selectedDepartment && channels.length > 0 && (
                    <select
                      id="channel-select"
                      value={selectedChannel || ''}
                      onChange={(e) => onSelectChannel(e.target.value || null)}
                      disabled={isLoading}
                      className="context-select channel-select"
                    >
                      <option value="">Any channel</option>
                      {channels.map((channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Style - only when company has styles */}
                  {styles.length > 0 && (
                    <select
                      id="style-select"
                      value={selectedStyle || ''}
                      onChange={(e) => onSelectStyle(e.target.value || null)}
                      disabled={isLoading}
                      className="context-select style-select"
                    >
                      <option value="">Default style</option>
                      {styles.map((style) => (
                        <option key={style.id} value={style.id}>
                          {style.name}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>
          )}

          <div className="input-row">
            <textarea
              className="message-input"
              placeholder="Ask your question... (Shift+Enter for new line, Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={3}
            />
            {isLoading ? (
              <button
                type="button"
                className="stop-button"
                onClick={onStopGeneration}
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                className="send-button"
                disabled={!input.trim()}
              >
                Send
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
