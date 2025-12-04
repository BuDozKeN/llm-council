import { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Leaderboard from './components/Leaderboard';
import Triage from './components/Triage';
import { api } from './api';
import './App.css';

// Default departments when no company is selected or company has no departments
const DEFAULT_DEPARTMENTS = [
  { id: 'standard', name: 'Standard', description: 'General advisory council' },
];

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [useContext, setUseContext] = useState(true); // Whether to use company context
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  // Triage state
  const [triageState, setTriageState] = useState(null); // null, 'analyzing', or triage result object
  const [originalQuery, setOriginalQuery] = useState('');
  const [isTriageLoading, setIsTriageLoading] = useState(false);
  const abortControllerRef = useRef(null);

  // Get the currently selected business object
  const currentBusiness = useMemo(() => {
    return businesses.find((b) => b.id === selectedBusiness) || null;
  }, [businesses, selectedBusiness]);

  // Get departments for the selected company
  const availableDepartments = useMemo(() => {
    if (!currentBusiness || !currentBusiness.departments || currentBusiness.departments.length === 0) {
      return DEFAULT_DEPARTMENTS;
    }
    return currentBusiness.departments;
  }, [currentBusiness]);

  // Get channels for the selected department (if any)
  const availableChannels = useMemo(() => {
    if (!selectedDepartment || !availableDepartments) return [];
    const dept = availableDepartments.find((d) => d.id === selectedDepartment);
    return dept?.channels || [];
  }, [availableDepartments, selectedDepartment]);

  // Get styles for the selected company
  const availableStyles = useMemo(() => {
    if (!currentBusiness || !currentBusiness.styles) return [];
    return currentBusiness.styles;
  }, [currentBusiness]);

  // When business changes, reset department/channel/style
  useEffect(() => {
    // Get departments for this business
    const business = businesses.find((b) => b.id === selectedBusiness);
    const depts = business?.departments?.length > 0 ? business.departments : DEFAULT_DEPARTMENTS;

    if (depts.length > 0) {
      setSelectedDepartment(depts[0].id);
    } else {
      setSelectedDepartment('');
    }
    setSelectedChannel('');
    setSelectedStyle('');
  }, [selectedBusiness, businesses]);

  // When department changes, reset channel
  useEffect(() => {
    setSelectedChannel('');
  }, [selectedDepartment]);

  // Load conversations and businesses on mount
  useEffect(() => {
    loadConversations();
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const bizList = await api.listBusinesses();
      setBusinesses(bizList);
      // Auto-select first business if available
      if (bizList.length > 0 && !selectedBusiness) {
        setSelectedBusiness(bizList[0].id);
      }
    } catch (error) {
      console.error('Failed to load businesses:', error);
    }
  };

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation();
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  // Triage handlers
  const handleStartTriage = async (content) => {
    if (!currentConversationId) return;

    setOriginalQuery(content);
    setIsTriageLoading(true);
    setTriageState('analyzing');

    // Only pass businessId if useContext is enabled
    const effectiveBusinessId = useContext ? selectedBusiness : null;

    try {
      const result = await api.analyzeTriage(content, effectiveBusinessId);
      setTriageState(result);
    } catch (error) {
      console.error('Triage analysis failed:', error);
      // On error, skip triage and go directly to council
      handleSendToCouncil(content);
    } finally {
      setIsTriageLoading(false);
    }
  };

  const handleTriageRespond = async (response) => {
    if (!triageState || triageState === 'analyzing') return;

    setIsTriageLoading(true);

    // Only pass businessId if useContext is enabled
    const effectiveBusinessId = useContext ? selectedBusiness : null;

    try {
      const result = await api.continueTriage(
        originalQuery,
        triageState.constraints || {},
        response,
        effectiveBusinessId
      );
      setTriageState(result);
    } catch (error) {
      console.error('Triage continue failed:', error);
      // On error, proceed with what we have
      handleSendToCouncil(triageState.enhanced_query || originalQuery);
    } finally {
      setIsTriageLoading(false);
    }
  };

  const handleTriageSkip = () => {
    // Skip triage and send original query to council
    handleSendToCouncil(originalQuery);
  };

  const handleTriageProceed = (enhancedQuery) => {
    // Proceed with the enhanced query
    handleSendToCouncil(enhancedQuery);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);

      // Also reset loading states in the last message
      setCurrentConversation((prev) => {
        if (!prev || !prev.messages || prev.messages.length === 0) return prev;
        const messages = [...prev.messages];
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.loading) {
          lastMsg.loading = {
            stage1: false,
            stage2: false,
            stage3: false,
          };
        }
        return { ...prev, messages };
      });
    }
  };

  // This is called when user submits a message - starts triage first
  const handleSendMessage = async (content) => {
    if (!currentConversationId) return;
    // Start triage analysis
    await handleStartTriage(content);
  };

  // This is called after triage is complete (or skipped) to send to council
  const handleSendToCouncil = async (content) => {
    if (!currentConversationId) return;

    // Clear triage state
    setTriageState(null);
    setOriginalQuery('');

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Create a partial assistant message that will be updated progressively
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage1Streaming: {}, // Track streaming text per model: { 'model-id': { text: '', complete: false } }
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: false,
          stage2: false,
          stage3: false,
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message with streaming (with business context if enabled)
      // If useContext is false, pass null for businessId so context is not loaded
      const effectiveBusinessId = useContext ? selectedBusiness : null;
      await api.sendMessageStream(currentConversationId, content, (eventType, event) => {
        switch (eventType) {
          case 'stage1_start':
            setCurrentConversation((prev) => {
              const messages = prev.messages.map((msg, idx) =>
                idx === prev.messages.length - 1
                  ? { ...msg, loading: { ...msg.loading, stage1: true }, stage1Streaming: {} }
                  : msg
              );
              return { ...prev, messages };
            });
            break;

          case 'stage1_token':
            // Append token to the specific model's streaming text (IMMUTABLE)
            setCurrentConversation((prev) => {
              const model = event.model;
              const messages = prev.messages.map((msg, idx) => {
                if (idx !== prev.messages.length - 1) return msg;
                const currentStreaming = msg.stage1Streaming?.[model] || { text: '', complete: false };
                return {
                  ...msg,
                  stage1Streaming: {
                    ...msg.stage1Streaming,
                    [model]: {
                      ...currentStreaming,
                      text: currentStreaming.text + event.content,
                    },
                  },
                };
              });
              return { ...prev, messages };
            });
            break;

          case 'stage1_model_complete':
            // Mark a single model as complete (IMMUTABLE)
            setCurrentConversation((prev) => {
              const model = event.model;
              const messages = prev.messages.map((msg, idx) => {
                if (idx !== prev.messages.length - 1) return msg;
                const currentStreaming = msg.stage1Streaming?.[model];
                return {
                  ...msg,
                  stage1Streaming: {
                    ...msg.stage1Streaming,
                    [model]: currentStreaming
                      ? { ...currentStreaming, complete: true }
                      : { text: event.response, complete: true },
                  },
                };
              });
              return { ...prev, messages };
            });
            break;

          case 'stage1_model_error':
            // Handle model error (IMMUTABLE)
            setCurrentConversation((prev) => {
              const model = event.model;
              const messages = prev.messages.map((msg, idx) =>
                idx === prev.messages.length - 1
                  ? {
                      ...msg,
                      stage1Streaming: {
                        ...msg.stage1Streaming,
                        [model]: { text: `Error: ${event.error}`, complete: true, error: true },
                      },
                    }
                  : msg
              );
              return { ...prev, messages };
            });
            break;

          case 'stage1_complete':
            setCurrentConversation((prev) => {
              const messages = prev.messages.map((msg, idx) =>
                idx === prev.messages.length - 1
                  ? { ...msg, stage1: event.data, loading: { ...msg.loading, stage1: false } }
                  : msg
              );
              return { ...prev, messages };
            });
            break;

          case 'stage2_start':
            setCurrentConversation((prev) => {
              const messages = prev.messages.map((msg, idx) =>
                idx === prev.messages.length - 1
                  ? { ...msg, loading: { ...msg.loading, stage2: true }, stage2Streaming: {} }
                  : msg
              );
              return { ...prev, messages };
            });
            break;

          case 'stage2_token':
            // Append token to the specific model's stage2 streaming text (IMMUTABLE)
            setCurrentConversation((prev) => {
              const model = event.model;
              const messages = prev.messages.map((msg, idx) => {
                if (idx !== prev.messages.length - 1) return msg;
                const currentStreaming = msg.stage2Streaming?.[model] || { text: '', complete: false };
                return {
                  ...msg,
                  stage2Streaming: {
                    ...msg.stage2Streaming,
                    [model]: {
                      ...currentStreaming,
                      text: currentStreaming.text + event.content,
                    },
                  },
                };
              });
              return { ...prev, messages };
            });
            break;

          case 'stage2_model_complete':
            // Mark a single model's stage2 evaluation as complete (IMMUTABLE)
            setCurrentConversation((prev) => {
              const model = event.model;
              const messages = prev.messages.map((msg, idx) => {
                if (idx !== prev.messages.length - 1) return msg;
                const currentStreaming = msg.stage2Streaming?.[model];
                return {
                  ...msg,
                  stage2Streaming: {
                    ...msg.stage2Streaming,
                    [model]: currentStreaming
                      ? { ...currentStreaming, complete: true }
                      : { text: event.ranking, complete: true },
                  },
                };
              });
              return { ...prev, messages };
            });
            break;

          case 'stage2_model_error':
            // Handle stage2 model error (IMMUTABLE)
            setCurrentConversation((prev) => {
              const model = event.model;
              const messages = prev.messages.map((msg, idx) =>
                idx === prev.messages.length - 1
                  ? {
                      ...msg,
                      stage2Streaming: {
                        ...msg.stage2Streaming,
                        [model]: { text: `Error: ${event.error}`, complete: true, error: true },
                      },
                    }
                  : msg
              );
              return { ...prev, messages };
            });
            break;

          case 'stage2_complete':
            setCurrentConversation((prev) => {
              const messages = prev.messages.map((msg, idx) =>
                idx === prev.messages.length - 1
                  ? {
                      ...msg,
                      stage2: event.data,
                      metadata: event.metadata,
                      loading: { ...msg.loading, stage2: false },
                    }
                  : msg
              );
              return { ...prev, messages };
            });
            break;

          case 'stage3_start':
            setCurrentConversation((prev) => {
              const messages = prev.messages.map((msg, idx) =>
                idx === prev.messages.length - 1
                  ? { ...msg, loading: { ...msg.loading, stage3: true }, stage3Streaming: { text: '', complete: false } }
                  : msg
              );
              return { ...prev, messages };
            });
            break;

          case 'stage3_token':
            // Append token to stage3 streaming text (IMMUTABLE)
            setCurrentConversation((prev) => {
              const messages = prev.messages.map((msg, idx) => {
                if (idx !== prev.messages.length - 1) return msg;
                const currentStreaming = msg.stage3Streaming || { text: '', complete: false };
                return {
                  ...msg,
                  stage3Streaming: {
                    ...currentStreaming,
                    text: currentStreaming.text + event.content,
                  },
                };
              });
              return { ...prev, messages };
            });
            break;

          case 'stage3_error':
            // Handle stage3 error (IMMUTABLE)
            setCurrentConversation((prev) => {
              const messages = prev.messages.map((msg, idx) =>
                idx === prev.messages.length - 1
                  ? {
                      ...msg,
                      stage3Streaming: { text: `Error: ${event.error}`, complete: true, error: true },
                    }
                  : msg
              );
              return { ...prev, messages };
            });
            break;

          case 'stage3_complete':
            setCurrentConversation((prev) => {
              const messages = prev.messages.map((msg, idx) =>
                idx === prev.messages.length - 1
                  ? {
                      ...msg,
                      stage3: event.data,
                      stage3Streaming: msg.stage3Streaming
                        ? { ...msg.stage3Streaming, complete: true }
                        : { text: event.data.response, complete: true },
                      loading: { ...msg.loading, stage3: false },
                    }
                  : msg
              );
              return { ...prev, messages };
            });
            break;

          case 'title_complete':
            // Reload conversations to get updated title
            loadConversations();
            break;

          case 'complete':
            // Stream complete, reload conversations list
            loadConversations();
            setIsLoading(false);
            break;

          case 'error':
            console.error('Stream error:', event.message);
            // Reset all loading states in the message
            setCurrentConversation((prev) => {
              if (!prev || !prev.messages || prev.messages.length === 0) return prev;
              const messages = prev.messages.map((msg, idx) =>
                idx === prev.messages.length - 1
                  ? {
                      ...msg,
                      loading: { stage1: false, stage2: false, stage3: false },
                    }
                  : msg
              );
              return { ...prev, messages };
            });
            setIsLoading(false);
            break;

          case 'cancelled':
            console.log('Request cancelled');
            setIsLoading(false);
            break;

          default:
            console.log('Unknown event type:', eventType);
        }
      }, {
        businessId: effectiveBusinessId,
        department: selectedDepartment,
        signal: abortControllerRef.current?.signal,
      });
    } catch (error) {
      // Don't treat cancellation as an error
      if (error.name === 'AbortError') {
        console.log('Request was cancelled');
        setIsLoading(false);
        return;
      }
      console.error('Failed to send message:', error);
      // Remove optimistic messages on error
      setCurrentConversation((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -2),
      }));
      setIsLoading(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        departments={availableDepartments}
      />
      <ChatInterface
        conversation={currentConversation}
        onSendMessage={handleSendMessage}
        onStopGeneration={handleStopGeneration}
        isLoading={isLoading}
        businesses={businesses}
        selectedBusiness={selectedBusiness}
        onSelectBusiness={setSelectedBusiness}
        departments={availableDepartments}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
        channels={availableChannels}
        selectedChannel={selectedChannel}
        onSelectChannel={setSelectedChannel}
        styles={availableStyles}
        selectedStyle={selectedStyle}
        onSelectStyle={setSelectedStyle}
        // Context toggle
        useContext={useContext}
        onToggleContext={setUseContext}
        // Triage props
        triageState={triageState}
        originalQuestion={originalQuery}
        isTriageLoading={isTriageLoading}
        onTriageRespond={handleTriageRespond}
        onTriageSkip={handleTriageSkip}
        onTriageProceed={handleTriageProceed}
      />
      <Leaderboard
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
    </div>
  );
}

export default App;
