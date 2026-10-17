"""GitHub contribution calendar for the activity graph on the home page.

Two sources, tried in order:
1. GitHub's GraphQL API, when a GITHUB_TOKEN env var is set (most reliable).
2. The public calendar fragment at github.com/users/<name>/contributions
   (no token needed, the same HTML GitHub renders on the profile page).

Results are cached so GitHub is asked at most once every few hours, and a
failure is cached briefly so a GitHub outage never slows the site down.
"""

import json
import re
import urllib.request
from datetime import date, timedelta

from django.conf import settings
from django.core.cache import cache

CACHE_SECONDS = 6 * 60 * 60
FAILURE_CACHE_SECONDS = 10 * 60
TIMEOUT_SECONDS = 5
USER_AGENT = "portfolio-website (+https://github.com/Aransok/Portfolio-website)"

GRAPHQL_QUERY = """
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}
"""

GRAPHQL_LEVELS = {
    "NONE": 0,
    "FIRST_QUARTILE": 1,
    "SECOND_QUARTILE": 2,
    "THIRD_QUARTILE": 3,
    "FOURTH_QUARTILE": 4,
}

TD_RE = re.compile(r"<td\b[^>]*>", re.IGNORECASE)
TOOLTIP_RE = re.compile(r'<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)</tool-tip>', re.IGNORECASE)
COUNT_RE = re.compile(r"^\s*(\d[\d,]*)\s+contribution", re.IGNORECASE)


def _attr(tag, name):
    match = re.search(r'\b' + re.escape(name) + r'="([^"]*)"', tag)
    return match.group(1) if match else None


def parse_contributions_html(html):
    """Turn GitHub's calendar HTML into a sorted list of day dicts."""
    counts_by_id = {}
    for target_id, text in TOOLTIP_RE.findall(html):
        match = COUNT_RE.match(text)
        counts_by_id[target_id] = int(match.group(1).replace(",", "")) if match else 0

    days = []
    for tag in TD_RE.findall(html):
        day = _attr(tag, "data-date")
        level = _attr(tag, "data-level")
        if not day or level is None:
            continue
        try:
            date.fromisoformat(day)
            level_value = max(0, min(4, int(level)))
        except ValueError:
            continue
        cell_id = _attr(tag, "id")
        count = counts_by_id.get(cell_id)
        if count is None:
            count = level_value  # no tooltip: keep at least the intensity
        days.append({"date": day, "count": count, "level": level_value})

    days.sort(key=lambda d: d["date"])
    return days


def parse_graphql(payload):
    """Turn a GraphQL contributionCalendar response into day dicts."""
    weeks = payload["data"]["user"]["contributionsCollection"]["contributionCalendar"]["weeks"]
    days = []
    for week in weeks:
        for d in week["contributionDays"]:
            days.append({
                "date": d["date"],
                "count": int(d["contributionCount"]),
                "level": GRAPHQL_LEVELS.get(d["contributionLevel"], 0),
            })
    days.sort(key=lambda d: d["date"])
    return days


def summarize(days, today=None):
    """Totals, streaks and the best day, computed from the day list."""
    if not days:
        return None
    today = today or date.today()
    total = sum(d["count"] for d in days)
    active = sum(1 for d in days if d["count"] > 0)

    longest = run = 0
    for d in days:
        run = run + 1 if d["count"] > 0 else 0
        longest = max(longest, run)

    # Current streak: count back from the last day; an empty "today" does
    # not break it yet, since the day is not over.
    current = 0
    for i, d in enumerate(reversed(days)):
        if d["count"] > 0:
            current += 1
        elif i == 0 and d["date"] >= today.isoformat():
            continue
        else:
            break

    best = max(days, key=lambda d: d["count"])
    return {
        "total": total,
        "active_days": active,
        "current_streak": current,
        "longest_streak": longest,
        "best_day": {"date": best["date"], "count": best["count"]},
        "first_date": days[0]["date"],
        "last_date": days[-1]["date"],
    }


def _http_get(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT, **(headers or {})})
    with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
        return resp.read().decode("utf-8")


def _fetch_days(username):
    token = getattr(settings, "GITHUB_TOKEN", None)
    if token:
        body = json.dumps({"query": GRAPHQL_QUERY, "variables": {"login": username}}).encode()
        raw = _http_get(
            "https://api.github.com/graphql",
            data=body,
            headers={"Authorization": f"bearer {token}", "Content-Type": "application/json"},
        )
        return parse_graphql(json.loads(raw))
    raw = _http_get(f"https://github.com/users/{username}/contributions")
    return parse_contributions_html(raw)


def get_activity(username):
    """Cached activity for the page: {"days": [...], "summary": {...}} or None."""
    key = f"github-activity:{username}"
    cached = cache.get(key)
    if cached is not None:
        return cached or None

    try:
        days = _fetch_days(username)
    except Exception:
        days = []

    if not days:
        cache.set(key, {}, FAILURE_CACHE_SECONDS)
        return None

    result = {"days": days, "summary": summarize(days)}
    cache.set(key, result, CACHE_SECONDS)
    return result


def sample_days(today=None, seed=7):
    """Deterministic example data for local previews (never used in production)."""
    import random

    rng = random.Random(seed)
    today = today or date.today()
    start = today - timedelta(days=364 + (today.weekday() + 1) % 7)
    days = []
    d = start
    while d <= today:
        busy = 0.35 + 0.45 * (d.month in (8, 9, 10))
        count = 0 if rng.random() > busy else rng.choice([1, 1, 2, 3, 4, 6, 8, 12])
        level = 0 if count == 0 else 1 if count < 3 else 2 if count < 5 else 3 if count < 9 else 4
        days.append({"date": d.isoformat(), "count": count, "level": level})
        d += timedelta(days=1)
    return days
