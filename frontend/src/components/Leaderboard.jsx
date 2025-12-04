import { useState, useEffect } from 'react';
import { api } from '../api';
import './Leaderboard.css';

export default function Leaderboard({ isOpen, onClose }) {
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('overall');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadLeaderboard();
    }
  }, [isOpen]);

  const loadLeaderboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getLeaderboardSummary();
      setLeaderboardData(data);
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const getCurrentLeaderboard = () => {
    if (!leaderboardData) return [];
    if (selectedDepartment === 'overall') {
      return leaderboardData.overall?.leaderboard || [];
    }
    return leaderboardData.departments?.[selectedDepartment]?.leaderboard || [];
  };

  const getAvailableDepartments = () => {
    if (!leaderboardData) return [];
    return Object.keys(leaderboardData.departments || {});
  };

  const currentLeaderboard = getCurrentLeaderboard();
  const departments = getAvailableDepartments();
  const totalSessions = leaderboardData?.overall?.total_sessions || 0;

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard-panel" onClick={(e) => e.stopPropagation()}>
        <div className="leaderboard-header">
          <h2>Model Leaderboard</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {isLoading ? (
          <div className="leaderboard-loading">Loading leaderboard...</div>
        ) : error ? (
          <div className="leaderboard-error">{error}</div>
        ) : totalSessions === 0 ? (
          <div className="leaderboard-empty">
            <p>No ranking data yet.</p>
            <p className="hint">Rankings are recorded after each council session completes.</p>
          </div>
        ) : (
          <>
            <div className="leaderboard-tabs">
              <button
                className={`tab-btn ${selectedDepartment === 'overall' ? 'active' : ''}`}
                onClick={() => setSelectedDepartment('overall')}
              >
                Overall
              </button>
              {departments.map((dept) => (
                <button
                  key={dept}
                  className={`tab-btn ${selectedDepartment === dept ? 'active' : ''}`}
                  onClick={() => setSelectedDepartment(dept)}
                >
                  {dept.charAt(0).toUpperCase() + dept.slice(1)}
                </button>
              ))}
            </div>

            <div className="leaderboard-stats">
              <span className="stat-item">
                Total Sessions: <strong>{totalSessions}</strong>
              </span>
            </div>

            <div className="leaderboard-table">
              {currentLeaderboard.length === 0 ? (
                <div className="no-data">No data for this department yet</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th className="rank-col">#</th>
                      <th className="model-col">Model</th>
                      <th className="score-col">Avg Rank</th>
                      <th className="wins-col">Wins</th>
                      <th className="rate-col">Win Rate</th>
                      <th className="sessions-col">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLeaderboard.map((entry, index) => (
                      <tr key={entry.model} className={index === 0 ? 'leader' : ''}>
                        <td className="rank-col">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </td>
                        <td className="model-col">
                          {entry.model.split('/')[1] || entry.model}
                        </td>
                        <td className="score-col">{entry.avg_rank.toFixed(2)}</td>
                        <td className="wins-col">{entry.wins}</td>
                        <td className="rate-col">{entry.win_rate}%</td>
                        <td className="sessions-col">{entry.sessions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="leaderboard-legend">
              <p><strong>Avg Rank:</strong> Lower is better (1 = always ranked first)</p>
              <p><strong>Wins:</strong> Number of times ranked #1</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
