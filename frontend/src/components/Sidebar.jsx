import { useState, useMemo, useRef, useEffect } from 'react';
import { api } from '../api';
import './Sidebar.css';

/**
 * Convert an ISO timestamp to a human-readable relative time string.
 * e.g., "2 hours", "a day", "3 days"
 */
function getRelativeTime(isoTimestamp) {
  if (!isoTimestamp) return '';

  const now = new Date();
  const then = new Date(isoTimestamp);
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute' : `${diffMinutes} minutes`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour' : `${diffHours} hours`;
  } else {
    return diffDays === 1 ? 'a day' : `${diffDays} days`;
  }
}

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onOpenLeaderboard,
  onExportConversation,
  onArchiveConversation,
  onDeleteConversation,
  onRenameConversation,
  departments = [],
  user,
  onSignOut,
}) {
  const [filter, setFilter] = useState('all');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showAllInGroup, setShowAllInGroup] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null); // conversation id to confirm delete
  const [editingId, setEditingId] = useState(null); // conversation id being renamed
  const [editingTitle, setEditingTitle] = useState(''); // current edit value
  const [menuOpenId, setMenuOpenId] = useState(null); // conversation id with open menu
  const editInputRef = useRef(null);
  const menuRef = useRef(null);

  // Focus the input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuOpenId && menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenId]);

  const toggleMenu = (convId, e) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === convId ? null : convId);
  };

  const handleStartEdit = (conv, e) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setEditingId(conv.id);
    setEditingTitle(conv.title || 'New Conversation');
  };

  const handleSaveEdit = async () => {
    if (editingId && editingTitle.trim()) {
      await onRenameConversation(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const MAX_VISIBLE = 5;

  // Separate active and archived conversations
  const { activeConversations, archivedConversations } = useMemo(() => {
    const active = conversations.filter(conv => !conv.archived);
    const archived = conversations.filter(conv => conv.archived);
    return { activeConversations: active, archivedConversations: archived };
  }, [conversations]);

  // Group conversations by department (only active ones, unless viewing archived)
  const groupedConversations = useMemo(() => {
    const groups = {};
    const convsToGroup = filter === 'archived' ? archivedConversations : activeConversations;

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
    convsToGroup.forEach(conv => {
      const dept = conv.department || 'standard';
      if (!groups[dept]) {
        groups[dept] = { name: dept.charAt(0).toUpperCase() + dept.slice(1), conversations: [] };
      }
      groups[dept].conversations.push(conv);
    });

    return groups;
  }, [activeConversations, archivedConversations, departments, filter]);

  // Filter groups based on selected filter
  const filteredGroups = useMemo(() => {
    if (filter === 'all' || filter === 'archived') {
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
        <div className="sidebar-header-buttons">
          <button className="leaderboard-btn" onClick={onOpenLeaderboard} title="View Model Leaderboard">
            🏆
          </button>
          <button className="new-conversation-btn" onClick={onNewConversation}>
            + New
          </button>
        </div>
      </div>

      {/* Filter Dropdown */}
      {totalConversations > 0 && (
        <div className="sidebar-filter">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Active ({activeConversations.length})</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
            {archivedConversations.length > 0 && (
              <option value="archived">Archived ({archivedConversations.length})</option>
            )}
          </select>
        </div>
      )}

      <div className="conversation-list">
        {totalConversations === 0 ? (
          <div className="no-conversations">No conversations yet</div>
        ) : filter === 'archived' && archivedConversations.length === 0 ? (
          <div className="no-conversations">No archived conversations</div>
        ) : filter !== 'archived' && activeConversations.length === 0 ? (
          <div className="no-conversations">No active conversations</div>
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
                        } ${conv.archived ? 'archived' : ''}`}
                        onClick={() => editingId !== conv.id && onSelectConversation(conv.id)}
                      >
                        <div className="conversation-content">
                          {editingId === conv.id ? (
                            <div className="conversation-title-edit">
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                onBlur={handleSaveEdit}
                                onClick={(e) => e.stopPropagation()}
                                className="title-edit-input"
                              />
                            </div>
                          ) : (
                            <div className="conversation-title">
                              {conv.archived && <span className="archived-badge">Archived</span>}
                              {conv.title || 'New Conversation'}
                            </div>
                          )}
                          <div className="conversation-meta">
                            {conv.message_count} messages
                            {conv.last_updated && (
                              <span className="conversation-time"> [{getRelativeTime(conv.last_updated)}]</span>
                            )}
                          </div>
                        </div>
                        <div className="conversation-menu-container" ref={menuOpenId === conv.id ? menuRef : null}>
                          <button
                            className="menu-trigger"
                            onClick={(e) => toggleMenu(conv.id, e)}
                            title="Options"
                          >
                            ⋮
                          </button>
                          {menuOpenId === conv.id && (
                            <div className="conversation-dropdown">
                              <button
                                className="dropdown-item"
                                onClick={(e) => handleStartEdit(conv, e)}
                              >
                                <span className="dropdown-icon">✎</span> Rename
                              </button>
                              {conv.message_count > 0 && (
                                <button
                                  className="dropdown-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenId(null);
                                    api.exportConversation(conv.id);
                                  }}
                                >
                                  <span className="dropdown-icon">↓</span> Export
                                </button>
                              )}
                              <button
                                className="dropdown-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenId(null);
                                  onArchiveConversation(conv.id, !conv.archived);
                                }}
                              >
                                <span className="dropdown-icon">{conv.archived ? '↑' : '📁'}</span>
                                {conv.archived ? 'Unarchive' : 'Archive'}
                              </button>
                              <button
                                className="dropdown-item dropdown-item-danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenId(null);
                                  setDeleteConfirm(conv.id);
                                }}
                              >
                                <span className="dropdown-icon">×</span> Delete
                              </button>
                            </div>
                          )}
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

      {/* User Footer */}
      {user && (
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-email" title={user.email}>
              {user.email}
            </span>
          </div>
          <button className="sign-out-btn" onClick={onSignOut} title="Sign out">
            Sign Out
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="delete-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">Delete Conversation?</div>
            <div className="delete-modal-body">
              This action cannot be undone. The conversation will be permanently deleted.
            </div>
            <div className="delete-modal-actions">
              <button
                className="delete-modal-cancel"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="delete-modal-confirm"
                onClick={() => {
                  onDeleteConversation(deleteConfirm);
                  setDeleteConfirm(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
