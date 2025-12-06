import { useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Leaderboard from './components/Leaderboard';
import Triage from './components/Triage';
import Login from './components/Login';
import { useAuth } from './AuthContext';
import { api, setTokenGetter } from './api';
import './App.css';

// Default departments when no company is selected or company has no departments
const DEFAULT_DEPARTMENTS = [
  { id: 'standard', name: 'Standard', description: 'General advisory council' },
];

function App() {
  const { user, loading: authLoading, signOut, isAuthenticated, needsPasswordReset, getAccessToken } = useAuth();

  // Set up API token getter when auth is available
  useEffect(() => {
    if (getAccessToken) {
      setTokenGetter(getAccessToken);
    }
  }, [getAccessToken]);

  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null); // null = no department selected
  const [selectedRole, setSelectedRole] = useState(null); // null = general council, or specific role
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [useCompanyContext, setUseCompanyContext] = useState(true); // Whether to use company context
  const [useDepartmentContext, setUseDepartmentContext] = useState(true); // Whether to use department context
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  // Triage state
  const [triageState, setTriageState] = useState(null); // null, 'analyzing', or triage result object
  const [originalQuery, setOriginalQuery] = useState('');
  const [isTriageLoading, setIsTriageLoading] = useState(false);
  const abortControllerRef = useRef(null);

  // Get the currently selected business object
  // IMPORTANT: All hooks must be called before any early returns
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

  // Get roles for the selected department (if any)
  const availableRoles = useMemo(() => {
    if (!selectedDepartment || !availableDepartments) return [];
    const dept = availableDepartments.find((d) => d.id === selectedDepartment);
    return dept?.roles || [];
  }, [availableDepartments, selectedDepartment]);

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

  // When business changes, reset department/channel/style to defaults
  useEffect(() => {
    // Default to null (General/company-wide) - user can select specific department
    setSelectedDepartment(null);
    setSelectedChannel(null);
    setSelectedStyle(null);
  }, [selectedBusiness, businesses]);

  // When department changes, reset role and channel
  useEffect(() => {
    setSelectedRole(null);
    setSelectedChannel(null);
  }, [selectedDepartment]);

  // Define functions BEFORE useEffect hooks that reference them
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

  // Load conversations and businesses on mount (with token ready check)
  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated && !needsPasswordReset) {
        // Wait for token to be available before loading
        const token = await getAccessToken();
        if (token) {
          loadConversations();
          loadBusinesses();
        }
      }
    };
    loadData();
  }, [isAuthenticated, needsPasswordReset, getAccessToken]);

  // Load conversation details when selected (skip temp conversations)
  useEffect(() => {
    if (currentConversationId && !currentConversationId.startsWith('temp-')) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Show login if not authenticated OR if user needs to reset password
  if (!isAuthenticated || needsPasswordReset) {
    return <Login />;
  }

  const handleNewConversation = () => {
    // Create a temporary conversation in memory only - don't persist until first message
    const tempId = `temp-${Date.now()}`;
    const tempConv = {
      id: tempId,
      created_at: new Date().toISOString(),
      title: 'New Conversation',
      messages: [],
      isTemp: true, // Mark as temporary/unsaved
    };

    // Don't add to conversations list (it would show 0 messages)
    // Just set it as the current conversation
    setCurrentConversationId(tempId);
    setCurrentConversation(tempConv);
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleArchiveConversation = async (id, archived) => {
    try {
      await api.archiveConversation(id, archived);
      // Update the conversations list
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === id ? { ...conv, archived } : conv
        )
      );
    } catch (error) {
      console.error('Failed to archive conversation:', error);
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      await api.deleteConversation(id);
      // Remove from conversations list
      setConversations((prev) => prev.filter((conv) => conv.id !== id));
      // If we deleted the current conversation, clear the selection
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setCurrentConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleRenameConversation = async (id, title) => {
    try {
      await api.renameConversation(id, title);
      // Update the conversations list
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === id ? { ...conv, title } : conv
        )
      );
      // Also update current conversation if it's the one being renamed
      if (currentConversationId === id) {
        setCurrentConversation((prev) =>
          prev ? { ...prev, title } : prev
        );
      }
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  };

  // Triage handlers
  const handleStartTriage = async (content) => {
    if (!currentConversationId) return;

    setOriginalQuery(content);
    setIsTriageLoading(true);
    setTriageState('analyzing');

    // Only pass businessId if useCompanyContext is enabled
    const effectiveBusinessId = useCompanyContext ? selectedBusiness : null;

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

    // Only pass businessId if useCompanyContext is enabled
    const effectiveBusinessId = useCompanyContext ? selectedBusiness : null;

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

  // This is called when user submits a message - goes directly to council (triage disabled)
  const handleSendMessage = async (content) => {
    if (!currentConversationId) return;
    // TRIAGE DISABLED: Go directly to council
    // To re-enable triage, change this back to: await handleStartTriage(content);
    await handleSendToCouncil(content);
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

    // If this is a temporary conversation, create it on the backend first
    let conversationId = currentConversationId;
    const isTemp = currentConversation?.isTemp || currentConversationId.startsWith('temp-');

    if (isTemp) {
      try {
        const newConv = await api.createConversation();
        conversationId = newConv.id;

        // Update our state with the real conversation ID
        setCurrentConversationId(conversationId);
        setCurrentConversation((prev) => ({
          ...prev,
          id: conversationId,
          isTemp: false,
        }));

        // Add to conversations list now that it will have a message
        setConversations((prev) => [
          { id: conversationId, created_at: newConv.created_at, message_count: 0, title: 'New Conversation' },
          ...prev,
        ]);
      } catch (error) {
        console.error('Failed to create conversation:', error);
        setIsLoading(false);
        return;
      }
    }

    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Create a partial assistant message that will be updated progressively
      // Start with stage1 loading = true immediately so user sees "Waiting for models..." right away
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage1Streaming: {}, // Track streaming text per model: { 'model-id': { text: '', complete: false } }
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: true,  // Start as true so Stage1 shows immediately
          stage2: false,
          stage3: false,
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message with streaming (with business/department context if enabled)
      // If useCompanyContext is false, pass null for businessId
      // If useDepartmentContext is false, pass null for department
      const effectiveBusinessId = useCompanyContext ? selectedBusiness : null;
      const effectiveDepartment = useDepartmentContext ? selectedDepartment : null;
      await api.sendMessageStream(conversationId, content, (eventType, event) => {
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
            // Force new array reference to ensure React detects the change
            setCurrentConversation((prev) => {
              const model = event.model;
              const messages = [...prev.messages];
              const lastIdx = messages.length - 1;
              if (lastIdx >= 0) {
                const msg = messages[lastIdx];
                const currentStreaming = msg.stage1Streaming?.[model] || { text: '', complete: false };
                messages[lastIdx] = {
                  ...msg,
                  stage1Streaming: {
                    ...msg.stage1Streaming,
                    [model]: {
                      text: currentStreaming.text + event.content,
                      complete: false,
                    },
                  },
                };
              }
              return { ...prev, messages, _streamTick: Date.now() };
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
            // Force new array reference to ensure React detects the change
            setCurrentConversation((prev) => {
              const model = event.model;
              const messages = [...prev.messages];
              const lastIdx = messages.length - 1;
              if (lastIdx >= 0) {
                const msg = messages[lastIdx];
                const currentStreaming = msg.stage2Streaming?.[model] || { text: '', complete: false };
                messages[lastIdx] = {
                  ...msg,
                  stage2Streaming: {
                    ...msg.stage2Streaming,
                    [model]: {
                      text: currentStreaming.text + event.content,
                      complete: false,
                    },
                  },
                };
              }
              return { ...prev, messages, _streamTick: Date.now() };
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
            // Force new array reference to ensure React detects the change
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastIdx = messages.length - 1;
              if (lastIdx >= 0) {
                const msg = messages[lastIdx];
                const currentStreaming = msg.stage3Streaming || { text: '', complete: false };
                messages[lastIdx] = {
                  ...msg,
                  stage3Streaming: {
                    text: currentStreaming.text + event.content,
                    complete: false,
                  },
                };
              }
              return { ...prev, messages, _streamTick: Date.now() };
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
        department: effectiveDepartment,
        role: selectedRole,
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

  // Handle chat mode - send to chairman only (no full council)
  const handleSendChatMessage = async (content) => {
    if (!currentConversationId || currentConversation?.isTemp) return;

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

      // Create a partial assistant message for chat response
      const assistantMessage = {
        role: 'assistant',
        stage1: [],
        stage2: [],
        stage3: null,
        stage3Streaming: { text: '', complete: false },
        isChat: true, // Mark as chat-only message
        loading: {
          stage1: false,
          stage2: false,
          stage3: true,
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Build context based on toggles
      const effectiveBusinessId = useCompanyContext ? selectedBusiness : null;
      const effectiveDepartmentId = useDepartmentContext ? selectedDepartment : null;

      await api.sendChatStream(currentConversationId, content, (eventType, event) => {
        switch (eventType) {
          case 'chat_start':
            // Chat stream started
            break;

          case 'chat_token':
            // Append token to streaming text
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

          case 'chat_error':
            console.error('Chat error:', event.error);
            break;

          case 'chat_complete':
            setCurrentConversation((prev) => {
              const messages = prev.messages.map((msg, idx) =>
                idx === prev.messages.length - 1
                  ? {
                      ...msg,
                      stage3: { model: event.data.model, response: event.data.content },
                      stage3Streaming: { text: event.data.content, complete: true },
                      loading: { ...msg.loading, stage3: false },
                    }
                  : msg
              );
              return { ...prev, messages };
            });
            break;

          case 'complete':
            setIsLoading(false);
            break;

          case 'error':
            console.error('Chat stream error:', event.message);
            setCurrentConversation((prev) => {
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
            console.log('Chat request cancelled');
            setIsLoading(false);
            break;

          default:
            console.log('Unknown chat event type:', eventType);
        }
      }, {
        businessId: effectiveBusinessId,
        departmentId: effectiveDepartmentId,
        signal: abortControllerRef.current?.signal,
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Chat request was cancelled');
        setIsLoading(false);
        return;
      }
      console.error('Failed to send chat message:', error);
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
        onArchiveConversation={handleArchiveConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        departments={availableDepartments}
        user={user}
        onSignOut={signOut}
      />
      <ChatInterface
        conversation={currentConversation}
        onSendMessage={handleSendMessage}
        onSendChatMessage={handleSendChatMessage}
        onStopGeneration={handleStopGeneration}
        isLoading={isLoading}
        businesses={businesses}
        selectedBusiness={selectedBusiness}
        onSelectBusiness={setSelectedBusiness}
        departments={availableDepartments}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
        roles={availableRoles}
        selectedRole={selectedRole}
        onSelectRole={setSelectedRole}
        channels={availableChannels}
        selectedChannel={selectedChannel}
        onSelectChannel={setSelectedChannel}
        styles={availableStyles}
        selectedStyle={selectedStyle}
        onSelectStyle={setSelectedStyle}
        // Independent context toggles
        useCompanyContext={useCompanyContext}
        onToggleCompanyContext={setUseCompanyContext}
        useDepartmentContext={useDepartmentContext}
        onToggleDepartmentContext={setUseDepartmentContext}
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
