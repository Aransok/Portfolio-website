from datetime import date
from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse

from . import github_activity

CALENDAR_HTML = """
<table><tbody>
<tr>
<td tabindex="0" data-ix="0" style="width: 10px" data-date="2026-10-11" id="contribution-day-component-0-0" data-level="0" role="gridcell" class="ContributionCalendar-day"></td>
<tool-tip id="tooltip-a" for="contribution-day-component-0-0" popover="manual" class="sr-only">No contributions on October 11th.</tool-tip>
<td tabindex="-1" data-ix="1" data-date="2026-10-12" id="contribution-day-component-1-0" data-level="2" role="gridcell" class="ContributionCalendar-day"></td>
<tool-tip id="tooltip-b" for="contribution-day-component-1-0" popover="manual" class="sr-only">5 contributions on October 12th.</tool-tip>
<td tabindex="-1" data-ix="2" data-date="2026-10-13" id="contribution-day-component-2-0" data-level="4" role="gridcell" class="ContributionCalendar-day"></td>
<tool-tip id="tooltip-c" for="contribution-day-component-2-0" popover="manual" class="sr-only">1,204 contributions on October 13th.</tool-tip>
<td tabindex="-1" data-date="2026-10-14" id="contribution-day-component-3-0" data-level="1" class="ContributionCalendar-day"></td>
<td class="ContributionCalendar-label">Mon</td>
</tr>
</tbody></table>
"""


def day(d, count):
    return {"date": d, "count": count, "level": 1 if count else 0}


class ParseHtmlTests(TestCase):
    def test_reads_counts_from_tooltips(self):
        days = github_activity.parse_contributions_html(CALENDAR_HTML)
        self.assertEqual([d["date"] for d in days], ["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14"])
        self.assertEqual([d["count"] for d in days], [0, 5, 1204, 1])
        self.assertEqual([d["level"] for d in days], [0, 2, 4, 1])

    def test_ignores_label_cells_and_garbage(self):
        days = github_activity.parse_contributions_html('<td data-date="nope" data-level="1"></td><td>x</td>')
        self.assertEqual(days, [])


class ParseGraphqlTests(TestCase):
    def test_maps_levels(self):
        payload = {"data": {"user": {"contributionsCollection": {"contributionCalendar": {"weeks": [
            {"contributionDays": [
                {"date": "2026-01-02", "contributionCount": 3, "contributionLevel": "SECOND_QUARTILE"},
                {"date": "2026-01-01", "contributionCount": 0, "contributionLevel": "NONE"},
            ]},
        ]}}}}}
        days = github_activity.parse_graphql(payload)
        self.assertEqual(days, [
            {"date": "2026-01-01", "count": 0, "level": 0},
            {"date": "2026-01-02", "count": 3, "level": 2},
        ])


class SummaryTests(TestCase):
    def test_streaks_and_totals(self):
        days = [day("2026-10-01", 2), day("2026-10-02", 1), day("2026-10-03", 0),
                day("2026-10-04", 4), day("2026-10-05", 1), day("2026-10-06", 3)]
        s = github_activity.summarize(days, today=date(2026, 10, 6))
        self.assertEqual(s["total"], 11)
        self.assertEqual(s["active_days"], 5)
        self.assertEqual(s["longest_streak"], 3)
        self.assertEqual(s["current_streak"], 3)
        self.assertEqual(s["best_day"], {"date": "2026-10-04", "count": 4})

    def test_empty_today_does_not_break_streak(self):
        days = [day("2026-10-04", 1), day("2026-10-05", 1), day("2026-10-06", 0)]
        s = github_activity.summarize(days, today=date(2026, 10, 6))
        self.assertEqual(s["current_streak"], 2)

    def test_empty_yesterday_breaks_streak(self):
        days = [day("2026-10-04", 1), day("2026-10-05", 0), day("2026-10-06", 0)]
        s = github_activity.summarize(days, today=date(2026, 10, 7))
        self.assertEqual(s["current_streak"], 0)

    def test_no_days(self):
        self.assertIsNone(github_activity.summarize([]))


class GetActivityTests(TestCase):
    def setUp(self):
        cache.clear()

    @override_settings(GITHUB_TOKEN=None)
    def test_caches_success(self):
        with mock.patch.object(github_activity, "_http_get", return_value=CALENDAR_HTML) as get:
            first = github_activity.get_activity("someone")
            second = github_activity.get_activity("someone")
        self.assertEqual(get.call_count, 1)
        self.assertEqual(first["summary"]["total"], 1210)
        self.assertEqual(first, second)

    @override_settings(GITHUB_TOKEN=None)
    def test_failure_returns_none_and_is_cached(self):
        with mock.patch.object(github_activity, "_http_get", side_effect=OSError("down")) as get:
            self.assertIsNone(github_activity.get_activity("someone"))
            self.assertIsNone(github_activity.get_activity("someone"))
        self.assertEqual(get.call_count, 1)


class ViewTests(TestCase):
    def setUp(self):
        cache.clear()

    @override_settings(ACTIVITY_SAMPLE=False)
    def test_activity_json_ok(self):
        data = {"days": [day("2026-10-06", 2)], "summary": {"total": 2}}
        with mock.patch.object(github_activity, "get_activity", return_value=data):
            resp = self.client.get(reverse("activity"))
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["ok"])
        self.assertEqual(resp.json()["summary"]["total"], 2)

    @override_settings(ACTIVITY_SAMPLE=False)
    def test_activity_json_unavailable(self):
        with mock.patch.object(github_activity, "get_activity", return_value=None):
            resp = self.client.get(reverse("activity"))
        self.assertEqual(resp.status_code, 503)
        self.assertFalse(resp.json()["ok"])

    def test_pages_render(self):
        for name in ["home", "about", "projects", "contact", "certificates"]:
            resp = self.client.get(reverse(name))
            self.assertEqual(resp.status_code, 200, name)
