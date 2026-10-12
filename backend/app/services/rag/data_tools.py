"""
Safe, read-only live-data query engine.

Answers numerical questions (counts, averages, percentages, rankings, per-student
risk explanations, branch comparisons, placement readiness, risk dimensions, ...)
from the ACTIVE dataset using the project's own enrichment pipeline. It never
invents values: every number is computed from the currently loaded records and
the denominator / filters used are always reported.

The engine is deliberately conservative: if a question cannot be mapped to a
supported computation, it returns ``None`` so the caller can fall back to
documentation retrieval instead of guessing.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

METRIC_LABELS = {
    "cgpa": "CGPA",
    "attendance": "Attendance %",
    "coding_score": "Coding score",
    "aptitude_score": "Aptitude score",
    "mock_interview_score": "Mock interview score",
    "lms_engagement": "LMS engagement",
    "success_score": "Composite success score",
    "backlogs": "Backlogs",
    "technical_score": "Technical score",
    "soft_skill_score": "Soft-skill score",
}

METRIC_SYNONYMS = {
    "cgpa": ["cgpa", "gpa", "grade point"],
    "attendance": ["attendance", "presence"],
    "coding_score": ["coding", "code score", "dsa"],
    "aptitude_score": ["aptitude"],
    "mock_interview_score": ["mock interview", "mock", "interview score"],
    "lms_engagement": ["lms", "engagement", "lms engagement"],
    "success_score": ["success score", "composite score", "success", "readiness score"],
    "backlogs": ["backlog", "backlogs", "arrear", "arrears"],
    "technical_score": ["technical score", "technical"],
    "soft_skill_score": ["soft skill", "soft-skill", "communication skill", "softskill"],
}

DEFAULT_THRESHOLD = {"attendance": 75.0, "cgpa": 6.0, "backlogs": 1}

SUGGESTED = [
    "How many students need support right now?",
    "Show students with attendance below 75%",
    "Which branch has the highest average CGPA?",
    "Compare all branches by risk percentage",
    "Explain student STU-2024-00005 risk factors",
    "How does the branch risk endpoint work?",
    "What does the README say about setup?",
    "How is the composite success score calculated?",
]


class DataTools:
    def __init__(self, db):
        # Lazy imports keep module import side-effect free and avoid cycles.
        from app.api.routes_students import get_all_enriched, get_current_settings

        self.db = db
        self.students: List[Dict[str, Any]] = get_all_enriched(db)
        self.weights, self.thresholds = get_current_settings(db)
        self.total = len(self.students)
        self.departments = sorted({s["department"] for s in self.students if s.get("department")})
        self.years = sorted({s["year"] for s in self.students if s.get("year") is not None})

    # -- dataset context ---------------------------------------------------
    def dataset_context(self) -> Dict[str, Any]:
        return {
            "active_dataset_records": self.total,
            "distinct_branches": len(self.departments),
            "branches": self.departments,
            "years": self.years,
            "note": "All metrics are computed live from the active dataset.",
        }

    # -- filters -----------------------------------------------------------
    def _match_department(self, q: str) -> Optional[str]:
        lowered = q.lower()
        best = None
        for dept in self.departments:
            token = dept.lower()
            # Match full name or its first significant word (e.g. "mechanical").
            if token in lowered:
                if best is None or len(token) > len(best[1]):
                    best = (dept, token)
            else:
                head = token.split()[0]
                if len(head) >= 4 and head in lowered:
                    if best is None or len(head) > len(best[1]):
                        best = (dept, head)
        return best[0] if best else None

    def _match_year(self, q: str) -> Optional[int]:
        m = re.search(r"(?:year\s*|yr\s*)([1-6])|([1-6])(?:st|nd|rd|th)\s*year", q, re.I)
        if m:
            return int(m.group(1) or m.group(2))
        return None

    def _match_risk(self, q: str) -> Optional[str]:
        lowered = q.lower()
        for level in ["critical", "high", "medium", "low", "minimal"]:
            if re.search(rf"\b{level}\b", lowered):
                return level.capitalize()
        return None

    def _match_placement(self, q: str) -> Optional[str]:
        lowered = q.lower()
        if "needs training" in lowered or "needs preparation" in lowered:
            return "Needs Training"
        if "in progress" in lowered or "in-progress" in lowered:
            return "In Progress"
        if "placed" in lowered:
            return "Placed"
        if "ready" in lowered:
            return "Ready"
        return None

    def _match_metric(self, q: str) -> Optional[str]:
        lowered = q.lower()
        best = None
        for metric, synonyms in METRIC_SYNONYMS.items():
            for syn in synonyms:
                if syn in lowered:
                    if best is None or len(syn) > best[1]:
                        best = (metric, len(syn))
                    break
        return best[0] if best else None

    def _numbers(self, q: str) -> List[float]:
        return [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", q)]

    def _comparison(self, q: str) -> Optional[str]:
        lowered = q.lower()
        if re.search(r"below|under|less than|fewer than|<|lower than|beneath", lowered):
            return "below"
        if re.search(r"above|over|greater than|more than|>|higher than|at least|minimum", lowered):
            return "above"
        return None

    def _apply_filters(
        self,
        dept: Optional[str],
        year: Optional[int],
        risk: Optional[str],
        placement: Optional[str],
    ) -> List[Dict[str, Any]]:
        pool = self.students
        if dept:
            pool = [s for s in pool if s["department"] == dept]
        if year is not None:
            pool = [s for s in pool if s["year"] == year]
        if risk:
            pool = [s for s in pool if (s.get("risk_level") or "").lower() == risk.lower()]
        if placement:
            pool = [s for s in pool if s.get("placement_status") == placement]
        return pool

    def _filters_applied(self, dept, year, risk, placement) -> Dict[str, Any]:
        applied = {}
        if dept:
            applied["branch"] = dept
        if year is not None:
            applied["year"] = year
        if risk:
            applied["risk_level"] = risk
        if placement:
            applied["placement_status"] = placement
        return applied

    def _result(
        self,
        intent: str,
        answer: str,
        *,
        headers=None,
        rows=None,
        metrics=None,
        evaluated: Optional[int] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        return {
            "matched": True,
            "intent": intent,
            "answer": answer,
            "table_headers": headers,
            "table_rows": rows,
            "metrics_summary": metrics,
            "dataset": {
                "active_dataset_records": self.total,
                "evaluated": evaluated if evaluated is not None else self.total,
                "filters_applied": filters or {},
                "denominator": evaluated if evaluated is not None else self.total,
            },
            "suggested_queries": SUGGESTED,
        }

    # -- student-specific --------------------------------------------------
    def _find_student(self, q: str) -> Optional[Dict[str, Any]]:
        m = re.search(r"\b(STU-[0-9A-Za-z\-]+)\b", q, re.I)
        if not m:
            m = re.search(r"\bstudent\s+([0-9A-Za-z\-]+)\b", q, re.I)
        if not m:
            # allow the trailing numeric id fragment e.g. "student 5"
            m = re.search(r"\b([0-9]{3,})\b", q)
        if not m:
            return None
        needle = m.group(1).lower()
        for s in self.students:
            sid = (s.get("id") or "").lower()
            if sid == needle or sid.endswith(needle) or needle in sid:
                return s
        return None

    def _explain_student(self, s: Dict[str, Any]) -> Dict[str, Any]:
        flags = [f for f in (s.get("risk_flags") or []) if f.get("severity") in ("high", "watch")]
        rows = [
            {
                "Dimension": f.get("label", f.get("dimension")),
                "Severity": "High concern" if f.get("severity") == "high" else "Watch",
                "Observed": f.get("display_value", f.get("value")),
                "Threshold": f.get("threshold", ""),
            }
            for f in flags
        ]
        reasons = s.get("risk_reasons") or []
        recs = s.get("recommendations") or []
        rec_lines = "\n".join(
            f"• {r.get('recommended_action')} ({r.get('assigned_role')}, {r.get('suggested_timeline')})"
            for r in recs[:4]
        )
        answer = (
            f"**Student {s.get('name')} ({s.get('id')})** — {s.get('department')}, Year {s.get('year')}\n"
            f"- Risk priority: **{s.get('risk_level')}**\n"
            f"- Composite success score: **{s.get('success_score', 0):.1f}/100** ({s.get('success_category')})\n"
            f"- CGPA {s.get('cgpa'):.2f}/10 · Attendance {s.get('attendance'):.1f}% · "
            f"Placement readiness: {s.get('placement_readiness')}\n\n"
            f"**Exact flags triggered (observed value vs. rule):**\n"
            + ("\n".join(f"• {r['Dimension']}: {r['Observed']} [rule: {r['Threshold']}]" for r in rows) or "• None")
            + (f"\n\n**Recommended support:**\n{rec_lines}" if rec_lines else "")
            + "\n\n_Flags prompt human review and are not proof of failure._"
        )
        return self._result(
            "DATA_STUDENT_EXPLAIN",
            answer,
            headers=["Dimension", "Severity", "Observed", "Threshold"],
            rows=rows,
            metrics={
                "Risk priority": s.get("risk_level"),
                "Success score": f"{s.get('success_score', 0):.1f}",
                "Readiness": s.get("placement_readiness"),
            },
            evaluated=1,
            filters={"student_id": s.get("id")},
        )

    # -- public entry ------------------------------------------------------
    _CONJUNCTION = re.compile(r"\s+and\s+|\s*;\s*", re.IGNORECASE)

    def _split_conjunction(self, query: str) -> List[str]:
        """Split a compound question into clauses (best-effort)."""
        parts = [p.strip(" ?.!,") for p in self._CONJUNCTION.split(query)]
        parts = [p for p in parts if p]
        return parts if len(parts) >= 2 else []

    def _merge_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Merge results from multiple clauses into one multi-intent answer.

        Deduplicates by intent and keeps the first table encountered so the UI
        still renders a single evidence table, while metrics from every clause
        are preserved.
        """
        unique: List[Dict[str, Any]] = []
        seen: set = set()
        for r in results:
            if not r or r.get("intent") in (None, "DATA_EMPTY"):
                continue
            if r["intent"] in seen:
                continue
            seen.add(r["intent"])
            unique.append(r)
        if not unique:
            return results[0]
        if len(unique) == 1:
            return unique[0]
        primary = unique[0]
        merged_metrics: Dict[str, Any] = {}
        for r in unique:
            tag = r["intent"].replace("DATA_", "").replace("_", " ").lower()
            for k, v in (r.get("metrics_summary") or {}).items():
                key = k if k not in merged_metrics else f"{k} [{tag}]"
                merged_metrics[key] = v
        table = next((r for r in unique if r.get("table_rows")), primary)
        sections = "\n\n".join(
            f"**{r['intent'].replace('DATA_', '').replace('_', ' ').title()}**\n{r.get('answer', '')}"
            for r in unique
        )
        return {
            "matched": True,
            "intent": "DATA_MULTI",
            "answer": sections,
            "table_headers": table.get("table_headers"),
            "table_rows": table.get("table_rows"),
            "metrics_summary": merged_metrics or None,
            "dataset": primary.get("dataset"),
            "suggested_queries": SUGGESTED,
        }

    def answer(self, query: str) -> Optional[Dict[str, Any]]:
        primary = self._answer_single(query)
        if self.total == 0:
            return primary
        clauses = self._split_conjunction(query)
        if not clauses:
            return primary
        results: List[Dict[str, Any]] = []
        if primary is not None:
            results.append(primary)
        for clause in clauses:
            if clause.lower() == query.strip().lower():
                continue
            r = self._answer_single(clause)
            if r is not None:
                results.append(r)
        if len(results) < 2:
            return primary
        return self._merge_results(results)

    def _answer_single(self, query: str) -> Optional[Dict[str, Any]]:
        if self.total == 0:
            return {
                "matched": True,
                "intent": "DATA_EMPTY",
                "answer": "The database is reachable but currently contains 0 student records, so there is no data to compute. Import a CSV/Excel dataset to enable analytical answers.",
                "table_headers": None,
                "table_rows": None,
                "metrics_summary": None,
                "dataset": {"active_dataset_records": 0, "evaluated": 0, "filters_applied": {}, "denominator": 0},
                "suggested_queries": SUGGESTED,
            }

        q = query.strip()
        lowered = q.lower()

        # 1) Individual student explanation.
        if re.search(r"\b(stu-|student\s+[0-9a-z])", lowered) or "explain student" in lowered:
            student = self._find_student(q)
            if student:
                return self._explain_student(student)

        dept = self._match_department(q)
        year = self._match_year(q)
        risk = self._match_risk(q)
        placement = self._match_placement(q)
        metric = self._match_metric(q)
        comparison = self._comparison(q)
        numbers = self._numbers(q)
        filters = self._filters_applied(dept, year, risk, placement)

        # 2) Threshold filters on a metric (attendance/cgpa/backlogs/scores).
        wants_threshold = (
            metric in DEFAULT_THRESHOLD
            and comparison is not None
            and (any(n <= 100 for n in numbers) or metric == "backlogs")
        ) or (metric in DEFAULT_THRESHOLD and comparison is not None and not numbers)
        if wants_threshold and metric:
            threshold = numbers[0] if numbers else DEFAULT_THRESHOLD.get(metric, 0.0)
            pool = self._apply_filters(dept, year, risk, placement)
            if comparison == "below":
                matched = [s for s in pool if s.get(metric) is not None and s.get(metric) < threshold]
            else:
                matched = [s for s in pool if s.get(metric) is not None and s.get(metric) > threshold]
            pct = (len(matched) / len(pool) * 100.0) if pool else 0.0
            label = METRIC_LABELS.get(metric, metric)
            scope = self._scope_text(dept, year, risk, placement)
            answer = (
                f"**{len(matched)} students ({pct:.1f}%)** have {label} {comparison} {threshold:g}"
                f"{scope}. Denominator: **{len(pool)}** students in scope (active dataset: {self.total})."
            )
            rows = [
                {
                    "ID": s["id"],
                    "Name": s["name"],
                    "Branch": s["department"],
                    label: self._fmt(s.get(metric)),
                    "Risk": s.get("risk_level"),
                }
                for s in sorted(matched, key=lambda x: (x.get(metric) is None, x.get(metric)))[:12]
            ]
            return self._result(
                "DATA_THRESHOLD",
                answer,
                headers=["ID", "Name", "Branch", label, "Risk"],
                rows=rows,
                metrics={f"students {comparison} {label} {threshold:g}": len(matched), "evaluated": len(pool)},
                evaluated=len(pool),
                filters={**filters, "metric": metric, comparison: threshold},
            )

        # 3) Average / mean of a metric (overall, or within filters, or grouped).
        if metric and any(k in lowered for k in ["average", "mean", "avg"]) and not any(
            k in lowered for k in [
                "each", "per ", "by department", "by branch", "across branches", "across departments",
                "highest", "lowest", "top", "bottom", "best", "worst", "rank", "which branch", "which department",
            ]
        ):
            pool = self._apply_filters(dept, year, risk, placement)
            values = [s.get(metric) for s in pool if s.get(metric) is not None]
            if values:
                avg = sum(values) / len(values)
                label = METRIC_LABELS.get(metric, metric)
                scope = self._scope_text(dept, year, risk, placement)
                answer = (
                    f"Average **{label}**{scope} is **{avg:.2f}**, computed over {len(values)} "
                    f"records with an available value (denominator pool: {len(pool)}; active dataset: {self.total})."
                )
                return self._result(
                    "DATA_AVERAGE",
                    answer,
                    metrics={f"Average {label}": round(avg, 2), "records with value": len(values)},
                    evaluated=len(pool),
                    filters={**filters, "metric": metric},
                )

        # 4) Ranking / top / bottom by branch (department). Risk percentages are
        # handled by the branch-overview step below, not by a CGPA default. When
        # no metric is named (e.g. "biggest / largest / most students"), rank by
        # branch headcount instead of defaulting to CGPA.
        if (
            re.search(r"\b(highest|lowest|top|bottom|best|worst|rank|biggest|largest|most|fewest|least|smallest)\b", lowered)
            and any(k in lowered for k in ["branch", "department", "dept"])
            and "risk" not in lowered
        ):
            order_desc = not re.search(r"\b(lowest|bottom|worst|fewest|least|smallest)\b", lowered)
            if metric:
                label = METRIC_LABELS.get(metric, metric)
                rows_data = self._department_table(metric)
                ranked = [{"Branch": r["Branch"], "val": r["Average"], "Students": r["Students"]} for r in rows_data]
                col = f"Average {label}"
                direction = "highest" if order_desc else "lowest"
            else:
                label = "Students"
                ranked = []
                for d in self.departments:
                    n = sum(1 for s in self.students if s["department"] == d)
                    ranked.append({"Branch": d, "val": n, "Students": n})
                col = "Students"
                direction = "largest" if order_desc else "smallest"
            ranked.sort(key=lambda r: r["val"], reverse=order_desc)
            top = ranked[0]
            if metric:
                answer = (
                    f"The branch with the **{direction} average {label}** is **{top['Branch']}** "
                    f"({top['val']:.2f} across {top['Students']} students). Full branch ranking below "
                    f"(active dataset: {self.total} students across {len(self.departments)} branches)."
                )
                rows = [{"Branch": r["Branch"], col: r["val"], "Students": r["Students"]} for r in ranked]
                headers = ["Branch", col, "Students"]
            else:
                answer = (
                    f"The **{direction} branch by headcount** is **{top['Branch']}** with "
                    f"**{top['val']} students** of {self.total} across {len(self.departments)} branches. "
                    f"Full branch ranking below."
                )
                rows = [{"Branch": r["Branch"], "Students": r["val"]} for r in ranked]
                headers = ["Branch", "Students"]
            return self._result(
                "DATA_RANKING",
                answer,
                headers=headers,
                rows=rows,
                metrics={f"Top branch ({label})": top["Branch"]},
                filters={"group_by": "branch", "metric": metric or "students"},
            )

        # 5) Branch comparison / per-branch risk overview.
        if (
            any(k in lowered for k in ["compare", "comparison", "overview", "per branch", "each branch", "all branches", "by branch", "branch-wise", "branchwise"])
            and any(k in lowered for k in ["branch", "department", "dept", "risk"])
        ) or any(k in lowered for k in ["risk percentage", "risk percent", "at-risk percentage"]):
            rows_data = self._branch_risk_table()
            top = max(rows_data, key=lambda r: r["Risk %"]) if rows_data else None
            answer = (
                f"Branch-wise risk overview across **{len(rows_data)} branches** "
                f"(active dataset: {self.total} students). "
                + (f"Highest risk share: **{top['Branch']}** at {top['Risk %']:.1f}%." if top else "")
                + " 'Unique at-risk' counts distinct students with at least one flag."
            )
            return self._result(
                "DATA_BRANCH_OVERVIEW",
                answer,
                headers=["Branch", "Students", "Unique at-risk", "Risk %", "Critical", "High", "Avg CGPA", "Avg Attendance"],
                rows=[
                    {
                        "Branch": r["Branch"],
                        "Students": r["Students"],
                        "Unique at-risk": r["Unique at-risk"],
                        "Risk %": f"{r['Risk %']:.1f}%",
                        "Critical": r["Critical"],
                        "High": r["High"],
                        "Avg CGPA": r["Avg CGPA"],
                        "Avg Attendance": f"{r['Avg Attendance']:.1f}%",
                    }
                    for r in rows_data
                ],
                metrics={"Branches": len(rows_data), "Active records": self.total},
                filters={"group_by": "branch"},
            )

        # 6) Single branch summary.
        if dept and any(k in lowered for k in ["branch", "department", "dept", "summary", "overview", "risk", "about"]):
            return self._branch_summary(dept, year)

        # 7) Risk dimension counts.
        if "dimension" in lowered or "most common risk" in lowered or "what risks" in lowered:
            return self._dimension_table(dept, year)

        # 8) Placement readiness distribution (readiness vs. outcome kept distinct).
        if any(k in lowered for k in ["placement", "placed", "readiness", "ready"]):
            return self._placement_summary(dept, year)

        # 9) Backlogs.
        if "backlog" in lowered or "arrear" in lowered:
            return self._backlogs_summary(dept, year)

        # 10) At-risk / support counts.
        if any(k in lowered for k in ["need support", "requiring support", "at risk", "at-risk", "high risk", "critical"]):
            return self._support_summary(dept, year)

        # 11) Group distribution by branch or year.
        if any(k in lowered for k in ["distribution", "per branch", "per department", "by branch", "by department", "per year", "by year"]):
            if "year" in lowered:
                return self._year_distribution(dept)
            return self._branch_count_table(dept)

        # 12) Generic count with filters.
        if re.search(r"\b(how many|count|number of|total)\b", lowered) or (dept or year or risk or placement):
            pool = self._apply_filters(dept, year, risk, placement)
            pct = (len(pool) / self.total * 100.0) if self.total else 0.0
            scope = self._scope_text(dept, year, risk, placement)
            answer = (
                f"**{len(pool)} students** match{scope or ' the full cohort'} "
                f"({pct:.1f}% of the active dataset of {self.total})."
            )
            return self._result(
                "DATA_COUNT",
                answer,
                metrics={"Matched": len(pool), "Active dataset": self.total},
                evaluated=len(pool),
                filters=filters,
            )

        # 13) Overall dataset summary fallback for numeric-sounding questions.
        if any(k in lowered for k in ["summary", "overview", "key metrics", "kpi"]):
            return self._dataset_summary()

        return None

    # -- building blocks ---------------------------------------------------
    def _fmt(self, value: Any) -> str:
        if value is None:
            return "N/A"
        if isinstance(value, float):
            return f"{value:.1f}"
        return str(value)

    def _scope_text(self, dept, year, risk, placement) -> str:
        parts = []
        if dept:
            parts.append(f"in {dept}")
        if year is not None:
            parts.append(f"in Year {year}")
        if risk:
            parts.append(f"with {risk} priority")
        if placement:
            parts.append(f"with placement status '{placement}'")
        return (" " + ", ".join(parts)) if parts else ""

    def _department_table(self, metric: str) -> List[Dict[str, Any]]:
        groups: Dict[str, List[float]] = {}
        for s in self.students:
            v = s.get(metric)
            if v is None:
                continue
            groups.setdefault(s["department"], []).append(v)
        return [
            {"Branch": d, "Average": round(sum(v) / len(v), 2), "Students": len(v)}
            for d, v in groups.items()
        ]

    def _branch_risk_table(self) -> List[Dict[str, Any]]:
        rows = []
        for dept in self.departments:
            pool = [s for s in self.students if s["department"] == dept]
            n = len(pool)
            unique_at_risk = sum(1 for s in pool if (s.get("flag_summary") or {}).get("flagged_count", 0) > 0)
            crit = sum(1 for s in pool if s.get("risk_level") == "Critical")
            high = sum(1 for s in pool if s.get("risk_level") == "High")
            avg_cgpa = sum(s["cgpa"] for s in pool) / n if n else 0.0
            avg_att = sum(s["attendance"] for s in pool) / n if n else 0.0
            rows.append(
                {
                    "Branch": dept,
                    "Students": n,
                    "Unique at-risk": unique_at_risk,
                    "Risk %": (unique_at_risk / n * 100.0) if n else 0.0,
                    "Critical": crit,
                    "High": high,
                    "Avg CGPA": round(avg_cgpa, 2),
                    "Avg Attendance": avg_att,
                }
            )
        rows.sort(key=lambda r: r["Risk %"], reverse=True)
        return rows

    def _branch_summary(self, dept: str, year: Optional[int]) -> Dict[str, Any]:
        pool = [s for s in self.students if s["department"] == dept and (year is None or s["year"] == year)]
        n = len(pool)
        if n == 0:
            return self._result("DATA_BRANCH_EMPTY", f"No students found for {dept}" + (f" in Year {year}" if year else "") + ".", evaluated=0, filters={"branch": dept})
        unique_at_risk = sum(1 for s in pool if (s.get("flag_summary") or {}).get("flagged_count", 0) > 0)
        crit = sum(1 for s in pool if s.get("risk_level") == "Critical")
        high = sum(1 for s in pool if s.get("risk_level") == "High")
        med = sum(1 for s in pool if s.get("risk_level") == "Medium")
        avg_cgpa = sum(s["cgpa"] for s in pool) / n
        avg_att = sum(s["attendance"] for s in pool) / n
        dim_counts = self._count_dimensions(pool)
        top_dims = sorted(dim_counts.items(), key=lambda kv: kv[1], reverse=True)[:3]
        answer = (
            f"**{dept}**{f' (Year {year})' if year else ''} — {n} students.\n"
            f"- Unique at-risk students: **{unique_at_risk}** ({unique_at_risk / n * 100:.1f}% of the branch)\n"
            f"- Priority mix: Critical {crit}, High {high}, Medium {med}\n"
            f"- Average CGPA **{avg_cgpa:.2f}**, average attendance **{avg_att:.1f}%**\n"
            f"- Most common risk dimensions: "
            + ", ".join(f"{k} ({v})" for k, v in top_dims)
            + "\n_Denominator: this branch's {n} students (active dataset: {total})._".format(n=n, total=self.total)
        )
        return self._result(
            "DATA_BRANCH_SUMMARY",
            answer,
            headers=["Priority", "Students"],
            rows=[
                {"Priority": "Critical", "Students": crit},
                {"Priority": "High", "Students": high},
                {"Priority": "Medium", "Students": med},
                {"Priority": "Unique at-risk", "Students": unique_at_risk},
            ],
            metrics={"Branch": dept, "Students": n, "Unique at-risk": unique_at_risk, "Risk %": f"{unique_at_risk / n * 100:.1f}%"},
            evaluated=n,
            filters={"branch": dept, **({"year": year} if year else {})},
        )

    def _count_dimensions(self, pool: List[Dict[str, Any]]) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for s in pool:
            for f in (s.get("risk_flags") or []):
                if f.get("severity") in ("high", "watch"):
                    label = f.get("label", f.get("dimension"))
                    counts[label] = counts.get(label, 0) + 1
        return counts

    def _dimension_table(self, dept: Optional[str], year: Optional[int]) -> Dict[str, Any]:
        pool = [s for s in self.students if (dept is None or s["department"] == dept) and (year is None or s["year"] == year)]
        high: Dict[str, int] = {}
        watch: Dict[str, int] = {}
        unique: Dict[str, set] = {}
        na: set = set()
        for s in pool:
            for f in (s.get("risk_flags") or []):
                label = f.get("label", f.get("dimension"))
                if not f.get("available", True):
                    na.add(label)
                    continue
                if f.get("severity") == "high":
                    high[label] = high.get(label, 0) + 1
                    unique.setdefault(label, set()).add(s["id"])
                elif f.get("severity") == "watch":
                    watch[label] = watch.get(label, 0) + 1
                    unique.setdefault(label, set()).add(s["id"])
        labels = sorted(set(high) | set(watch), key=lambda x: high.get(x, 0) + watch.get(x, 0), reverse=True)
        rows = [
            {
                "Dimension": label,
                "High concern": high.get(label, 0),
                "Watch": watch.get(label, 0),
                "Unique students": len(unique.get(label, set())),
            }
            for label in labels
        ]
        n = len(pool)
        answer = (
            f"Risk dimension breakdown for {dept or 'all branches'}{f' (Year {year})' if year else ''} "
            f"across {n} students. 'Unique students' counts distinct IDs (flags overlap, so dimension counts "
            f"are not additive). Denominator: {n}; active dataset: {self.total}."
            + (f" Dimensions without source columns (N/A): {', '.join(sorted(na))}." if na else "")
        )
        return self._result(
            "DATA_DIMENSIONS",
            answer,
            headers=["Dimension", "High concern", "Watch", "Unique students"],
            rows=rows,
            metrics={"Evaluated": n, "Dimensions tracked": len(rows)},
            evaluated=n,
            filters={"branch": dept, **({"year": year} if year else {})},
        )

    def _placement_summary(self, dept: Optional[str], year: Optional[int]) -> Dict[str, Any]:
        pool = [s for s in self.students if (dept is None or s["department"] == dept) and (year is None or s["year"] == year)]
        n = len(pool)
        status_counts: Dict[str, int] = {}
        readiness_counts: Dict[str, int] = {}
        outcome_present = 0
        outcome_counts: Dict[str, int] = {}
        for s in pool:
            status_counts[s.get("placement_status", "Unknown")] = status_counts.get(s.get("placement_status", "Unknown"), 0) + 1
            readiness_counts[s.get("placement_readiness", "Unknown")] = readiness_counts.get(s.get("placement_readiness", "Unknown"), 0) + 1
            if s.get("placement_outcome"):
                outcome_present += 1
                outcome_counts[s["placement_outcome"]] = outcome_counts.get(s["placement_outcome"], 0) + 1
        rows = [{"Readiness category": k, "Students": v, "%": f"{v / n * 100:.1f}%"} for k, v in sorted(readiness_counts.items(), key=lambda kv: kv[1], reverse=True)]
        answer = (
            f"Placement **readiness** distribution for {dept or 'all branches'}{f' (Year {year})' if year else ''} "
            f"across {n} students (denominator {n}; active dataset {self.total}).\n"
            f"Readiness is a derived preparation signal, distinct from a genuine placement outcome."
        )
        if outcome_present:
            answer += f" A real `placement_outcome` column is present for {outcome_present}/{n} records: {outcome_counts}."
        else:
            answer += " No `placement_outcome` column is present in the active dataset, so actual outcomes cannot be reported (N/A)."
        return self._result(
            "DATA_PLACEMENT",
            answer,
            headers=["Readiness category", "Students", "%"],
            rows=rows,
            metrics={"Evaluated": n, "Outcome data available": outcome_present},
            evaluated=n,
            filters={"branch": dept, **({"year": year} if year else {})},
        )

    def _backlogs_summary(self, dept: Optional[str], year: Optional[int]) -> Dict[str, Any]:
        pool = [s for s in self.students if (dept is None or s["department"] == dept) and (year is None or s["year"] == year)]
        with_backlogs_present = [s for s in pool if s.get("backlogs") is not None]
        if not with_backlogs_present:
            return self._result(
                "DATA_BACKLOGS_NA",
                "The active dataset has **no backlogs column**, so backlog risk is reported as **N/A** (never invented). "
                "Upload a CSV including a `backlogs` column to enable this dimension.",
                evaluated=len(pool),
                filters={"branch": dept, **({"year": year} if year else {})},
            )
        flagged = [s for s in with_backlogs_present if (s.get("backlogs") or 0) >= 1]
        high = [s for s in with_backlogs_present if (s.get("backlogs") or 0) >= 2]
        answer = (
            f"Backlogs: **{len(flagged)} of {len(with_backlogs_present)}** records with available data have ≥1 backlog "
            f"(**{len(high)}** have ≥2). Denominator: records with the field present ({len(with_backlogs_present)}); "
            f"active dataset {self.total}."
        )
        return self._result(
            "DATA_BACKLOGS",
            answer,
            metrics={"With ≥1 backlog": len(flagged), "With ≥2 backlogs": len(high)},
            evaluated=len(with_backlogs_present),
            filters={"branch": dept, **({"year": year} if year else {})},
        )

    def _support_summary(self, dept: Optional[str], year: Optional[int]) -> Dict[str, Any]:
        pool = [s for s in self.students if (dept is None or s["department"] == dept) and (year is None or s["year"] == year)]
        n = len(pool)
        crit = sum(1 for s in pool if s.get("risk_level") == "Critical")
        high = sum(1 for s in pool if s.get("risk_level") == "High")
        med = sum(1 for s in pool if s.get("risk_level") == "Medium")
        low = sum(1 for s in pool if s.get("risk_level") == "Low")
        minimal = sum(1 for s in pool if s.get("risk_level") == "Minimal")
        needs = crit + high + med
        unique = sum(1 for s in pool if (s.get("flag_summary") or {}).get("flagged_count", 0) > 0)
        scope = self._scope_text(dept, year, None, None)
        answer = (
            f"**{needs} of {n} students ({needs / n * 100:.1f}%)**{scope or ' in the cohort'} need support "
            f"(Critical+High+Medium).\n"
            f"- Critical: {crit} · High: {high} · Medium: {med}\n"
            f"- Low: {low} · Minimal: {minimal}\n"
            f"- Unique students with ≥1 flag: **{unique}** (distinct IDs; overlapping dimension flags are not summed).\n"
            f"Denominator: {n}; active dataset: {self.total}."
        )
        return self._result(
            "DATA_SUPPORT",
            answer,
            headers=["Priority", "Students"],
            rows=[
                {"Priority": "Critical", "Students": crit},
                {"Priority": "High", "Students": high},
                {"Priority": "Medium", "Students": med},
                {"Priority": "Low", "Students": low},
                {"Priority": "Minimal", "Students": minimal},
            ],
            metrics={"Needing support": needs, "Unique flagged": unique, "Denominator": n},
            evaluated=n,
            filters={"branch": dept, **({"year": year} if year else {})},
        )

    def _branch_count_table(self, dept: Optional[str]) -> Dict[str, Any]:
        rows = []
        for d in self.departments:
            pool = [s for s in self.students if s["department"] == d]
            rows.append({"Branch": d, "Students": len(pool)})
        rows.sort(key=lambda r: r["Students"], reverse=True)
        answer = f"Student distribution across {len(rows)} branches (active dataset: {self.total})."
        return self._result("DATA_BRANCH_COUNTS", answer, headers=["Branch", "Students"], rows=rows, filters={"group_by": "branch"})

    def _year_distribution(self, dept: Optional[str]) -> Dict[str, Any]:
        pool = [s for s in self.students if (dept is None or s["department"] == dept)]
        counts: Dict[int, int] = {}
        for s in pool:
            counts[s["year"]] = counts.get(s["year"], 0) + 1
        rows = [{"Year": y, "Students": counts[y]} for y in sorted(counts)]
        answer = f"Year-wise distribution for {dept or 'the cohort'} across {len(pool)} students (active dataset: {self.total})."
        return self._result("DATA_YEAR_DIST", answer, headers=["Year", "Students"], rows=rows, evaluated=len(pool), filters={"branch": dept})

    def _dataset_summary(self) -> Dict[str, Any]:
        avg_cgpa = sum(s["cgpa"] for s in self.students) / self.total if self.total else 0.0
        avg_att = sum(s["attendance"] for s in self.students) / self.total if self.total else 0.0
        crit = sum(1 for s in self.students if s.get("risk_level") == "Critical")
        high = sum(1 for s in self.students if s.get("risk_level") == "High")
        med = sum(1 for s in self.students if s.get("risk_level") == "Medium")
        unique = sum(1 for s in self.students if (s.get("flag_summary") or {}).get("flagged_count", 0) > 0)
        answer = (
            f"Active dataset: **{self.total} students** across {len(self.departments)} branches and {len(self.years)} years.\n"
            f"- Average CGPA: **{avg_cgpa:.2f}** · Average attendance: **{avg_att:.1f}%**\n"
            f"- Needing support (C+H+M): **{crit + high + med}** (Critical {crit}, High {high}, Medium {med})\n"
            f"- Unique students with ≥1 flag: **{unique}**"
        )
        return self._result(
            "DATA_DATASET_SUMMARY",
            answer,
            metrics={"Records": self.total, "Branches": len(self.departments), "Years": len(self.years)},
        )
