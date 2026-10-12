import unittest
from app.config import DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS
from app.services.scoring_service import calculate_success_score
from app.services.risk_service import build_risk_flags, evaluate_flags, COUNTED_DIMENSIONS
from app.services import analytics_service


def _enrich(raw):
    score, category, contributions = calculate_success_score(raw, DEFAULT_WEIGHTS)
    flags = build_risk_flags(raw, score, DEFAULT_THRESHOLDS)
    risk, reasons, summary = evaluate_flags(flags)
    readiness_map = {
        "Ready": "Ready", "Placed": "Ready",
        "In Progress": "Developing", "Needs Training": "Needs Preparation",
    }
    out = dict(raw)
    out.update({
        "success_score": score,
        "success_category": category,
        "risk_level": risk,
        "risk_reasons": reasons,
        "risk_flags": flags,
        "flag_summary": summary,
        "placement_readiness": readiness_map.get(raw.get("placement_status"), "Unknown"),
    })
    return out


class TestAnalyticsEngine(unittest.TestCase):

    def setUp(self):
        self.base = {
            "id": "STU-X", "name": "Test", "department": "Computer Science", "year": 3,
            "cgpa": 7.5, "attendance": 88.0, "lms_engagement": 70.0,
            "coding_score": 70.0, "aptitude_score": 70.0, "mock_interview_score": 70.0,
            "placement_status": "Ready",
        }

    def test_missing_optional_fields_are_na_not_invented(self):
        flags = build_risk_flags(self.base, 75.0, DEFAULT_THRESHOLDS)
        by_dim = {f["dimension"]: f for f in flags}
        self.assertEqual(by_dim["skills_technical"]["severity"], "na")
        self.assertEqual(by_dim["skills_soft"]["severity"], "na")
        self.assertEqual(by_dim["backlogs"]["severity"], "na")
        self.assertEqual(by_dim["skills_technical"]["display_value"], "N/A")
        # No trend invented without historical data.
        self.assertEqual(by_dim["academic_trend"]["severity"], "na")

    def test_optional_fields_are_used_when_present(self):
        data = dict(self.base, technical_score=30.0, soft_skill_score=30.0, backlogs=2)
        flags = build_risk_flags(data, 60.0, DEFAULT_THRESHOLDS)
        by_dim = {f["dimension"]: f for f in flags}
        self.assertEqual(by_dim["skills_technical"]["severity"], "high")
        self.assertEqual(by_dim["skills_soft"]["severity"], "high")
        self.assertEqual(by_dim["backlogs"]["severity"], "high")

    def test_two_high_dimensions_is_critical(self):
        data = dict(self.base, cgpa=5.0, attendance=60.0)
        flags = build_risk_flags(data, 50.0, DEFAULT_THRESHOLDS)
        risk, _, summary = evaluate_flags(flags)
        self.assertGreaterEqual(summary["high_count"], 2)
        self.assertEqual(risk, "Critical")

    def test_department_summary_percentages(self):
        cohort = [_enrich(dict(self.base, id=f"S{i}", department="CS" if i < 3 else "EE"))
                  for i in range(4)]
        rows = analytics_service.compute_department_summary(cohort)
        by_dept = {r["department"]: r for r in rows}
        self.assertEqual(by_dept["CS"]["student_count"], 3)
        self.assertEqual(by_dept["EE"]["student_count"], 1)
        total_pct = round(sum(r["enrollment_percentage"] for r in rows), 1)
        self.assertAlmostEqual(total_pct, 100.0, places=1)
        self.assertEqual(len(by_dept["CS"]["years_covered"]), 1)

    def test_risk_dimensions_counts_and_na(self):
        cohort = [_enrich(self.base), _enrich(dict(self.base, id="S2", cgpa=5.0, attendance=60.0))]
        result = analytics_service.compute_risk_dimensions(cohort, DEFAULT_THRESHOLDS)
        dims = {d["dimension"]: d for d in result["dimensions"]}
        self.assertEqual(len(result["dimensions"]), len(COUNTED_DIMENSIONS))
        self.assertEqual(dims["skills_technical"]["available_count"], 0)
        self.assertEqual(dims["skills_technical"]["na_count"], 2)
        self.assertEqual(result["total_students"], 2)
        self.assertGreaterEqual(result["unique_flagged"], 1)

    def test_overlap_matrix_is_symmetric(self):
        cohort = [_enrich(dict(self.base, cgpa=5.0, attendance=60.0))]
        dims = list(COUNTED_DIMENSIONS)
        ov = analytics_service.compute_overlap(cohort, dims)
        for a in dims:
            for b in dims:
                self.assertEqual(ov["matrix"][a][b], ov["matrix"][b][a])
        # A student flagged in academic and attendance contributes to the diagonal.
        self.assertGreaterEqual(ov["matrix"]["academic"]["academic"], 1)

    def test_department_risk_matrix_percentages_bounded(self):
        cohort = [_enrich(dict(self.base, cgpa=5.0, attendance=60.0))]
        dims = list(COUNTED_DIMENSIONS)
        mat = analytics_service.compute_department_risk_matrix(cohort, dims)
        for cell in mat["cells"]:
            for d in dims:
                self.assertGreaterEqual(cell["dimensions"][d]["percentage"], 0.0)
                self.assertLessEqual(cell["dimensions"][d]["percentage"], 100.0)

    def test_risk_register_reports_na_dimensions(self):
        cohort = [_enrich(self.base)]
        rows = analytics_service.build_risk_register(cohort)
        self.assertEqual(len(rows), 1)
        self.assertIn("skills_technical", rows[0]["na_dimensions"])
        self.assertEqual(rows[0]["placement_readiness"], "Ready")

    def test_placement_outcomes_untracked_note(self):
        cohort = [_enrich(self.base)]
        result = analytics_service.compute_placement_outcomes(cohort)
        self.assertFalse(result["outcome_tracked"])
        self.assertIn("No placement outcome column", result["outcome_note"])


class TestBranchWiseAnalytics(unittest.TestCase):

    def setUp(self):
        self.healthy = {
            "id": "H1", "name": "Healthy", "department": "CS", "year": 2,
            "cgpa": 7.8, "attendance": 90.0, "lms_engagement": 75.0,
            "coding_score": 72.0, "aptitude_score": 74.0, "mock_interview_score": 70.0,
            "placement_status": "Ready",
        }
        # Flagged in two dimensions (academic + attendance) -> overlapping.
        self.flagged = {
            "id": "F1", "name": "Flagged", "department": "CS", "year": 3,
            "cgpa": 5.0, "attendance": 60.0, "lms_engagement": 70.0,
            "coding_score": 70.0, "aptitude_score": 70.0, "mock_interview_score": 70.0,
            "placement_status": "In Progress",
        }
        self.other = {
            "id": "E1", "name": "Other", "department": "EE", "year": 1,
            "cgpa": 8.4, "attendance": 92.0, "lms_engagement": 80.0,
            "coding_score": 78.0, "aptitude_score": 80.0, "mock_interview_score": 76.0,
            "placement_status": "Placed",
        }
        self.cohort = [_enrich(self.healthy), _enrich(self.flagged), _enrich(self.other)]

    def test_branch_overview_counts_and_percentages(self):
        ov = analytics_service.compute_branch_overview(self.cohort, DEFAULT_THRESHOLDS)
        self.assertEqual(ov["total_students"], 3)
        self.assertEqual(ov["distinct_branches"], 2)
        by = {b["branch"]: b for b in ov["branches"]}
        self.assertEqual(by["CS"]["total_students"], 2)
        self.assertEqual(by["EE"]["total_students"], 1)
        self.assertEqual(by["CS"]["critical_count"], 1)
        self.assertEqual(by["CS"]["at_risk_students"], 1)
        self.assertEqual(by["CS"]["risk_percentage"], 50.0)
        self.assertEqual(ov["branches_available"], ["CS", "EE"])

    def test_unique_at_risk_not_sum_of_overlapping_dimensions(self):
        # The flagged student trips BOTH academic and attendance, so the sum of
        # per-dimension affected counts exceeds the number of unique students.
        detail = analytics_service.compute_branch_detail("CS", self.cohort, DEFAULT_THRESHOLDS)
        self.assertEqual(detail["unique_at_risk_students"], 1)
        dims = {d["dimension"]: d for d in detail["dimensions"]}
        dim_sum = dims["academic"]["affected_count"] + dims["attendance"]["affected_count"]
        self.assertGreaterEqual(dim_sum, 2)
        self.assertLess(detail["unique_at_risk_students"], dim_sum)

    def test_branch_detail_uses_branch_total_as_denominator(self):
        detail = analytics_service.compute_branch_detail("CS", self.cohort, DEFAULT_THRESHOLDS)
        self.assertEqual(detail["total_students"], 2)
        dims = {d["dimension"]: d for d in detail["dimensions"]}
        # 1 of 2 CS students flags attendance -> 50% of the branch.
        self.assertEqual(dims["attendance"]["affected_percentage_of_branch"], 50.0)
        self.assertEqual(detail["risk_percentage"], 50.0)

    def test_filter_enriched_by_each_criterion(self):
        self.assertEqual(len(analytics_service.filter_enriched(self.cohort, branch="CS")), 2)
        self.assertEqual(len(analytics_service.filter_enriched(self.cohort, year=3)), 1)
        self.assertEqual(len(analytics_service.filter_enriched(self.cohort, dimension="academic")), 1)
        self.assertEqual(len(analytics_service.filter_enriched(self.cohort, priority="Minimal")), 2)
        self.assertEqual(len(analytics_service.filter_enriched(self.cohort, search="EE")), 0)
        self.assertEqual(len(analytics_service.filter_enriched(self.cohort, search="F1")), 1)

    def test_register_rows_carry_triggering_flags_with_thresholds(self):
        rows = analytics_service.build_register_rows(self.cohort, include_flags=True)
        flagged = next(r for r in rows if r["id"] == "F1")
        dims = {f["dimension"] for f in flagged["triggering_flags"]}
        self.assertIn("academic", dims)
        self.assertIn("attendance", dims)
        for f in flagged["triggering_flags"]:
            self.assertTrue(f["threshold"])
            self.assertTrue(f["display_value"])
        healthy = next(r for r in rows if r["id"] == "H1")
        self.assertEqual(healthy["triggering_flags"], [])

    def test_register_sort_and_pagination(self):
        rows = analytics_service.build_register_rows(self.cohort, include_flags=True)
        srt = analytics_service.sort_register_rows(rows, "risk_level", False)
        self.assertEqual(srt[0]["risk_level"], "Critical")
        srt_asc = analytics_service.sort_register_rows(rows, "cgpa", False)
        self.assertLessEqual(srt_asc[0]["cgpa"], srt_asc[-1]["cgpa"])

    def test_branch_export_rows(self):
        rows = analytics_service.branch_export_rows(self.cohort)
        by = {r["branch"]: r for r in rows}
        self.assertEqual(by["CS"]["unique_at_risk_students"], 1)
        self.assertEqual(by["EE"]["risk_percentage"], 0.0)


if __name__ == "__main__":
    unittest.main()
