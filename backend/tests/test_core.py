import unittest
from app.config import DEFAULT_WEIGHTS, DEFAULT_THRESHOLDS, ScoringWeights, RiskThresholds
from app.services.scoring_service import calculate_success_score
from app.services.risk_service import evaluate_student_risk
from app.services.recommendation_service import generate_recommendations
from app.services.data_service import parse_and_validate_file
from app.services.assistant_service import process_assistant_query

class TestSmartCampusAnalyticsCore(unittest.TestCase):

    def setUp(self):
        self.weights = DEFAULT_WEIGHTS
        self.thresholds = DEFAULT_THRESHOLDS

    def test_success_score_calculation(self):
        student_data = {
            "cgpa": 8.5,
            "attendance": 90.0,
            "lms_engagement": 80.0,
            "coding_score": 85.0,
            "aptitude_score": 80.0,
            "mock_interview_score": 75.0
        }
        score, category, contributions = calculate_success_score(student_data, self.weights)
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 100.0)
        self.assertEqual(len(contributions), 6)
        self.assertEqual(score, 83.5)
        self.assertIn("Satisfactory", category)

        # Also test Outstanding category for 90+
        high_data = {k: 95.0 for k in student_data}
        high_data["cgpa"] = 9.5
        high_score, high_cat, _ = calculate_success_score(high_data, self.weights)
        self.assertIn("Outstanding", high_cat)

    def test_risk_evaluation_attendance_warning(self):
        student_data = {
            "cgpa": 7.5,
            "attendance": 68.0,  # Below critical 70%
            "lms_engagement": 70.0,
            "coding_score": 60.0,
            "aptitude_score": 60.0,
            "mock_interview_score": 60.0,
            "historical_cgpa_prev": 7.6
        }
        risk_level, reasons = evaluate_student_risk(student_data, 68.0, self.thresholds)
        self.assertIn(risk_level, ["High", "Critical"])
        self.assertTrue(any("attendance deficit" in r.lower() for r in reasons))

    def test_risk_evaluation_academic_drop(self):
        student_data = {
            "cgpa": 5.2,
            "attendance": 85.0,
            "lms_engagement": 65.0,
            "coding_score": 70.0,
            "aptitude_score": 70.0,
            "mock_interview_score": 70.0,
            "historical_cgpa_prev": 7.0  # 1.8 point drop
        }
        risk_level, reasons = evaluate_student_risk(student_data, 60.0, self.thresholds)
        self.assertIn(risk_level, ["High", "Critical"])
        self.assertTrue(any("trajectory" in r.lower() or "dropped" in r.lower() for r in reasons))

    def test_recommendations_generation(self):
        student_data = {
            "cgpa": 6.2,
            "attendance": 65.0,
            "coding_score": 35.0,
            "aptitude_score": 45.0,
            "mock_interview_score": 40.0,
            "lms_engagement": 30.0,
            "year": 3
        }
        recs = generate_recommendations(student_data, "Critical", self.thresholds)
        self.assertGreater(len(recs), 0)
        categories = [r["category"] for r in recs]
        self.assertTrue(any("Attendance" in c for c in categories))
        self.assertTrue(any("Technical" in c for c in categories))

    def test_csv_validation_valid(self):
        csv_content = (
            "id,name,department,year,cgpa,attendance,lms_engagement,coding_score,aptitude_score,mock_interview_score,placement_status\n"
            "STU-001,John Doe,Computer Science,3,8.2,85.5,78,82,75,80,Ready\n"
        ).encode("utf-8")
        records, errors, warnings = parse_and_validate_file(csv_content, "test.csv")
        self.assertEqual(len(errors), 0)
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["id"], "STU-001")
        self.assertEqual(records[0]["cgpa"], 8.2)

    def test_csv_validation_missing_columns(self):
        csv_content = "id,name\nSTU-001,John Doe\n".encode("utf-8")
        records, errors, warnings = parse_and_validate_file(csv_content, "bad.csv")
        self.assertGreater(len(errors), 0)
        self.assertEqual(len(records), 0)

    def test_assistant_query_execution(self):
        students = [
            {
                "id": "STU-2024-001",
                "name": "Aarav Sharma",
                "department": "Computer Science",
                "year": 4,
                "cgpa": 8.9,
                "attendance": 92.0,
                "lms_engagement": 88.0,
                "coding_score": 90.0,
                "aptitude_score": 85.0,
                "mock_interview_score": 88.0,
                "placement_status": "Placed",
                "risk_level": "Minimal",
                "risk_reasons": ["Good standing"],
                "success_score": 88.5
            },
            {
                "id": "STU-2024-002",
                "name": "Rohan Gupta",
                "department": "Mechanical Engineering",
                "year": 2,
                "cgpa": 5.4,
                "attendance": 62.0,
                "lms_engagement": 40.0,
                "coding_score": 38.0,
                "aptitude_score": 45.0,
                "mock_interview_score": 40.0,
                "placement_status": "Needs Training",
                "risk_level": "Critical",
                "risk_reasons": ["Severe attendance deficit: 62%"],
                "historical_cgpa_prev": 6.8,
                "success_score": 48.0
            }
        ]
        
        # Test 1: Count needing support
        resp1 = process_assistant_query("How many students need support?", students, {})
        self.assertEqual(resp1["intent"], "SUPPORT_COUNT")
        self.assertIn("1 out of 2", resp1["answer"])

        # Test 2: Low attendance
        resp2 = process_assistant_query("Show students with attendance below 75%", students, {})
        self.assertEqual(resp2["intent"], "ATTENDANCE_FILTER")
        self.assertIn("1 students", resp2["answer"])

        # Test 3: Explain student
        resp3 = process_assistant_query("Explain student STU-2024-002 risk factors", students, {})
        self.assertEqual(resp3["intent"], "STUDENT_EXPLAIN")
        self.assertIn("Rohan Gupta", resp3["answer"])

        # Test 4: Intervention query
        interventions = [
            {
                "student_id": "STU-2024-002",
                "student_name": "Rohan Gupta",
                "department": "Computer Science",
                "intervention_type": "Attendance Counselling",
                "faculty_member": "Prof. Rao",
                "status": "In Progress",
                "notes": "Weekly review",
                "follow_up_date": "2026-11-01"
            }
        ]
        resp4 = process_assistant_query("How many interventions are active?", students, {}, interventions)
        self.assertEqual(resp4["intent"], "INTERVENTION_PORTFOLIO")
        self.assertIn("In Progress", resp4["answer"])

        # Test 5: Declining trend query
        resp5 = process_assistant_query("Who has a declining CGPA trend?", students, {})
        self.assertEqual(resp5["intent"], "DECLINING_TRENDS")
        self.assertEqual(len(resp5["table_rows"]), 1)
        self.assertEqual(resp5["table_rows"][0]["Name"], "Rohan Gupta")

if __name__ == "__main__":
    unittest.main()

