import { useState, useMemo } from 'react';
import './Sidebar.css';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  departments = [],
}) {
  const [filter, setFilter] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showAllInGroup, setShowAllInGroup] = useState({});

  const MAX_VISIBLE = 5;

  // Group conversations by department
  const groupedConversations = useMemo(() => {
    const groups = {};

    // Initialize groups for all departments
    departments.forEach(dept => {
      groups[dept.id] = {
        name: dept.name,
        conversations: [],
      };
    });

    // Add "Standard" if not present
    if (!groups['standard']) {
      groups['standard'] = { name: 'Standard', conversations: [] };
    }

    // Sort conversations into groups
    conversations.forEach(conv => {
      const dept = conv.department || 'standard';
      if (!groups[dept]) {
        groups[dept] = { name: dept.charAt(0).toUpperCase() + dept.slice(1), conversations: [] };
      }
      groups[dept].conversations.push(conv);
    });

    return groups;
  }, [conversations, departments]);

  // Filter groups based on selected filter
  const filteredGroups = useMemo(() => {
    if (filter === 'all') {
      return groupedConversations;
    }
    return { [filter]: groupedConversations[filter] };
  }, [groupedConversations, filter]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const toggleShowAll = (groupId) => {
    setShowAllInGroup(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Check if a group is expanded (default to expanded if has conversations)
  const isExpanded = (groupId) => {
    if (expandedGroups[groupId] !== undefined) {
      return expandedGroups[groupId];
    }
    return groupedConversations[groupId]?.conversations.length > 0;
  };

  const totalConversations = conversations.length;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>AI Council</h1>
        <button className="new-conversation-btn" onClick={onNewConversation}>
          + New Conversation
        </button>
      </div>

      {/* Filter Dropdown */}
      {totalConversations > 0 && (
        <div className="sidebar-filter">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Conversations</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="conversation-list">
        {totalConversations === 0 ? (
          <div className="no-conversations">No conversations yet</div>
        ) : (
          Object.entries(filteredGroups).map(([groupId, group]) => {
            if (!group || group.conversations.length === 0) return null;

            const expanded = isExpanded(groupId);
            const showAll = showAllInGroup[groupId];
            const visibleConversations = showAll
              ? group.conversations
              : group.conversations.slice(0, MAX_VISIBLE);
            const hasMore = group.conversations.length > MAX_VISIBLE;

            return (
              <div key={groupId} className="conversation-group">
                <div
                  className="group-header"
                  onClick={() => toggleGroup(groupId)}
                >
                  <span className={`chevron ${expanded ? 'expanded' : ''}`}>
                    ›
                  </span>
                  <span className="group-name">{group.name}</span>
                  <span className="group-count">{group.conversations.length}</span>
                </div>

                {expanded && (
                  <div className="group-conversations">
                    {visibleConversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`conversation-item ${
                          conv.id === currentConversationId ? 'active' : ''
                        }`}
                        onClick={() => onSelectConversation(conv.id)}
                      >
                        <div className="conversation-title">
                          {conv.title || 'New Conversation'}
                        </div>
                        <div className="conversation-meta">
                          {conv.message_count} messages
                        </div>
                      </div>
                    ))}

                    {hasMore && (
                      <button
                        className="show-more-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleShowAll(groupId);
                        }}
                      >
                        {showAll
                          ? 'Show less'
                          : `Show ${group.conversations.length - MAX_VISIBLE} more`
                        }
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
