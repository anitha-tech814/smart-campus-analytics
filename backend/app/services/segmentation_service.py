import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

def perform_student_segmentation(
    students: List[Dict[str, Any]],
    n_clusters: int = 4
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Executes K-Means clustering on student academic and skill metrics.
    Features used:
      [CGPA, Attendance, LMS Engagement, Coding Score, Aptitude Score, Mock Interview Score]
    Standardizes features using StandardScaler.
    Labels each cluster in clear, understandable educational terms based on centroid profiles.
    Returns:
      (cluster_summaries, student_to_cluster_map)
    """
    if len(students) < n_clusters:
        # Fallback if too few records for meaningful clustering
        return [], {}

    # Extract numerical matrices
    feature_keys = [
        "cgpa", "attendance", "lms_engagement", 
        "coding_score", "aptitude_score", "mock_interview_score"
    ]

    records = []
    ids = []
    for s in students:
        ids.append(s["id"])
        records.append([
            float(s.get(k, 0.0)) for k in feature_keys
        ])

    X = np.array(records)
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Deterministic K-Means for consistency
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X_scaled)

    # Compute centroids in original units
    centroids_orig = scaler.inverse_transform(kmeans.cluster_centers_)

    # Map each student id to cluster id
    student_cluster_map = {ids[i]: int(labels[i]) for i in range(len(ids))}

    # Interpret clusters dynamically by examining their centroid profiles
    cluster_summaries = []
    total_students = len(students)

    for c_id in range(n_clusters):
        c_mask = (labels == c_id)
        c_count = int(np.sum(c_mask))
        if c_count == 0:
            continue

        c_orig = centroids_orig[c_id]
        c_cgpa = float(c_orig[0])
        c_att = float(c_orig[1])
        c_lms = float(c_orig[2])
        c_code = float(c_orig[3])
        c_apt = float(c_orig[4])
        c_mock = float(c_orig[5])

        # Cluster students
        c_student_ids = [ids[i] for i in range(len(ids)) if labels[i] == c_id]
        
        # Calculate cluster average composite success score
        c_scores = [float(students[i].get("success_score", 0.0)) for i in range(len(ids)) if labels[i] == c_id]
        avg_score = float(np.mean(c_scores)) if c_scores else 0.0

        # Heuristic archetype labeling based on profile
        if c_cgpa >= 8.2 and c_code >= 70 and c_att >= 80:
            name = "Placement-Ready High Achievers"
            desc = "Consistently high grades, robust technical aptitude, and excellent class attendance. Ready for top-tier campus recruitment drives."
            rec = "Fast-track for elite corporate placements, competitive programming teams, and research fellowship nominations."
        elif c_cgpa >= 7.5 and (c_code < 55 or c_mock < 55):
            name = "Academic Specialists / Placement Prep Needed"
            desc = "Solid theoretical foundations and course grades, but relatively low practical coding lab or mock interview readiness."
            rec = "Intensive coding interview bootcamps, resume workshops, and guided mock communication drills."
        elif c_att < 75 or c_lms < 55:
            name = "Attendance & Engagement At-Risk Group"
            desc = "Sub-optimal attendance records and lower LMS activity, creating vulnerability in overall semester progression."
            rec = "Proactive attendance counseling, faculty advisor check-ins, and remedial course review modules."
        elif c_code >= 65 and c_cgpa < 7.2:
            name = "Practical Tech Coders / Needs Academic Boost"
            desc = "Strong hands-on technical and coding performance, with room to improve university theory exam grades and cumulative CGPA."
            rec = "Subject-specific tutoring on core curriculum subjects and exam preparation study circles."
        else:
            name = f"Core Steady Cohort (Segment {c_id + 1})"
            desc = "Balanced student group performing near institutional averages across coursework, attendance, and skills assessments."
            rec = "Maintain steady mentor tracking and encourage participation in upcoming career skill certification workshops."

        cluster_summaries.append({
            "cluster_id": c_id,
            "name": name,
            "description": desc,
            "recommendation": rec,
            "count": c_count,
            "percentage": round((c_count / total_students) * 100.0, 1),
            "avg_cgpa": round(c_cgpa, 2),
            "avg_attendance": round(c_att, 1),
            "avg_coding": round(c_code, 1),
            "avg_aptitude": round(c_apt, 1),
            "avg_mock": round(c_mock, 1),
            "avg_success_score": round(avg_score, 1),
            "sample_students": c_student_ids[:5]
        })

    # Sort clusters logically
    cluster_summaries.sort(key=lambda x: x["avg_success_score"], reverse=True)

    return cluster_summaries, student_cluster_map
