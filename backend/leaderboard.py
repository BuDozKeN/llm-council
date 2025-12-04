"""Model performance leaderboard storage and analytics."""

import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

# Leaderboard data file
LEADERBOARD_FILE = Path(__file__).parent.parent / "data" / "leaderboard.json"


def _ensure_data_dir():
    """Ensure the data directory exists."""
    LEADERBOARD_FILE.parent.mkdir(parents=True, exist_ok=True)


def _load_leaderboard() -> Dict[str, Any]:
    """Load leaderboard data from file."""
    _ensure_data_dir()
    if not LEADERBOARD_FILE.exists():
        return {
            "records": [],
            "aggregates": {
                "overall": {},
                "by_department": {}
            }
        }

    try:
        with open(LEADERBOARD_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading leaderboard: {e}")
        return {
            "records": [],
            "aggregates": {
                "overall": {},
                "by_department": {}
            }
        }


def _save_leaderboard(data: Dict[str, Any]):
    """Save leaderboard data to file."""
    _ensure_data_dir()
    try:
        with open(LEADERBOARD_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving leaderboard: {e}")


def record_session_rankings(
    conversation_id: str,
    department: str,
    business_id: Optional[str],
    aggregate_rankings: List[Dict[str, Any]]
):
    """
    Record rankings from a council session.

    Args:
        conversation_id: The conversation ID
        department: Department/topic (marketing, sales, legal, executive, standard)
        business_id: Optional business context ID
        aggregate_rankings: List of {model, average_rank, rankings_count}
    """
    if not aggregate_rankings:
        return

    data = _load_leaderboard()

    # Create record
    record = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "conversation_id": conversation_id,
        "department": department or "standard",
        "business_id": business_id,
        "rankings": aggregate_rankings
    }

    # Add to records (keep last 1000 for history)
    data["records"].append(record)
    if len(data["records"]) > 1000:
        data["records"] = data["records"][-1000:]

    # Update aggregates
    _update_aggregates(data, department or "standard", aggregate_rankings)

    _save_leaderboard(data)


def _update_aggregates(
    data: Dict[str, Any],
    department: str,
    aggregate_rankings: List[Dict[str, Any]]
):
    """Update the aggregate statistics."""
    # Update overall
    for ranking in aggregate_rankings:
        model = ranking["model"]
        avg_rank = ranking["average_rank"]

        if model not in data["aggregates"]["overall"]:
            data["aggregates"]["overall"][model] = {
                "total_score": 0,
                "sessions": 0,
                "wins": 0  # First place finishes
            }

        data["aggregates"]["overall"][model]["total_score"] += avg_rank
        data["aggregates"]["overall"][model]["sessions"] += 1

        # Check if this model won (had lowest average rank)
        if ranking == aggregate_rankings[0]:  # First in sorted list = winner
            data["aggregates"]["overall"][model]["wins"] += 1

    # Update by department
    if department not in data["aggregates"]["by_department"]:
        data["aggregates"]["by_department"][department] = {}

    dept_data = data["aggregates"]["by_department"][department]

    for ranking in aggregate_rankings:
        model = ranking["model"]
        avg_rank = ranking["average_rank"]

        if model not in dept_data:
            dept_data[model] = {
                "total_score": 0,
                "sessions": 0,
                "wins": 0
            }

        dept_data[model]["total_score"] += avg_rank
        dept_data[model]["sessions"] += 1

        if ranking == aggregate_rankings[0]:
            dept_data[model]["wins"] += 1


def get_overall_leaderboard() -> List[Dict[str, Any]]:
    """
    Get the overall leaderboard sorted by average rank (lower is better).

    Returns:
        List of {model, avg_rank, sessions, wins, win_rate}
    """
    data = _load_leaderboard()
    overall = data["aggregates"]["overall"]

    leaderboard = []
    for model, stats in overall.items():
        if stats["sessions"] > 0:
            avg_rank = stats["total_score"] / stats["sessions"]
            win_rate = (stats["wins"] / stats["sessions"]) * 100
            leaderboard.append({
                "model": model,
                "avg_rank": round(avg_rank, 2),
                "sessions": stats["sessions"],
                "wins": stats["wins"],
                "win_rate": round(win_rate, 1)
            })

    # Sort by avg_rank (lower is better)
    leaderboard.sort(key=lambda x: x["avg_rank"])

    return leaderboard


def get_department_leaderboard(department: str) -> List[Dict[str, Any]]:
    """
    Get the leaderboard for a specific department.

    Args:
        department: The department to filter by

    Returns:
        List of {model, avg_rank, sessions, wins, win_rate}
    """
    data = _load_leaderboard()
    dept_data = data["aggregates"]["by_department"].get(department, {})

    leaderboard = []
    for model, stats in dept_data.items():
        if stats["sessions"] > 0:
            avg_rank = stats["total_score"] / stats["sessions"]
            win_rate = (stats["wins"] / stats["sessions"]) * 100
            leaderboard.append({
                "model": model,
                "avg_rank": round(avg_rank, 2),
                "sessions": stats["sessions"],
                "wins": stats["wins"],
                "win_rate": round(win_rate, 1)
            })

    leaderboard.sort(key=lambda x: x["avg_rank"])

    return leaderboard


def get_all_department_leaderboards() -> Dict[str, List[Dict[str, Any]]]:
    """
    Get leaderboards for all departments.

    Returns:
        Dict mapping department name to leaderboard list
    """
    data = _load_leaderboard()

    result = {}
    for department in data["aggregates"]["by_department"]:
        result[department] = get_department_leaderboard(department)

    return result


def get_leaderboard_summary() -> Dict[str, Any]:
    """
    Get a summary of the leaderboard with overall and per-department winners.

    Returns:
        Dict with overall winner and department winners
    """
    overall = get_overall_leaderboard()
    departments = get_all_department_leaderboards()

    summary = {
        "overall": {
            "leader": overall[0] if overall else None,
            "total_sessions": sum(m["sessions"] for m in overall) // len(overall) if overall else 0,
            "leaderboard": overall
        },
        "departments": {}
    }

    for dept, leaderboard in departments.items():
        summary["departments"][dept] = {
            "leader": leaderboard[0] if leaderboard else None,
            "sessions": sum(m["sessions"] for m in leaderboard) // len(leaderboard) if leaderboard else 0,
            "leaderboard": leaderboard
        }

    return summary
