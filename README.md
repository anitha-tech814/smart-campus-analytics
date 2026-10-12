# Smart Campus Analytics
### AI-Powered Student Success and Risk Detection Platform

> **Local-First Analytics & Retrieval** &bull; **Optional OpenRouter Answer Generation (backend-only key)** &bull; **Deterministic & Explainable ML** &bull; **Higher Education Analytics Suite**

---

## 🎓 Executive Summary

**Smart Campus Analytics** is a comprehensive, production-grade analytics platform designed for colleges and universities. It unifies academic progression (CGPA), attendance compliance, LMS courseware engagement, and campus recruitment readiness metrics (coding lab, aptitude, mock interviews) into actionable intelligence.

The platform provides faculty deans, mentors, and placement officers with transparent multi-factor risk assessments, explainable alerts, unsupervised K-Means student segmentation, and deterministic recommendations. Core analytics are fully local, deterministic, and explainable; the optional RAG assistant calls OpenRouter for prose generation only when a backend API key is configured (see Section 5 below).

---

## 🚀 Key Features

1. **Institutional Overview Dashboard**
   - Live KPI cards: Total Cohort (12,000 Synthetic Records), Mean CGPA, Average Attendance, Composite Success Score, Placement Readiness %, and Students Requiring Support.
   - Interactive charts: Department-wide Academic & Attendance distribution (Recharts), Placement Pipeline breakdown, Support Priority Distribution, and recent faculty interventions.
   - Dynamic calculations derived directly from the active SQLite dataset.

2. **Student Data Management**
   - Pre-seeded with 12,000 realistic synthetic student profiles labeled clearly as demonstration records.
   - Searchable, sortable, and filterable table across departments, years, risk levels, and placement readiness.
   - Full student profile drawer with individual metrics, factor contributions, and advisory history.
   - File upload supporting **CSV** and **Excel (.xlsx)** with column alias mapping, validation error reporting, and sample template export.

3. **Transparent Student Success Score (0 - 100)**
   - Normalized multi-factor weighted scoring:
     - **Academic CGPA**: 25% (normalized to 100-point scale)
     - **Attendance**: 20%
     - **LMS Engagement**: 15%
     - **Coding Lab Benchmark**: 15%
     - **Quantitative & Logical Aptitude**: 15%
     - **Mock Interview Performance**: 10%
   - Factor contribution radar chart and mathematical breakdown showing exactly how points were earned.
   - Never describes rule-based formulas as "black-box AI".

4. **Explainable At-Risk Detection Engine**
   - Identifies students requiring human review based on transparent campus rules:
     - Attendance below mandatory 75% or critical 70% threshold.
     - CGPA below 6.5 or in remedial zone (< 5.5).
     - Downward academic trajectory (&ge; 1.0 point CGPA drop compared to previous term).
     - Technical coding lab deficits (< 45/100) or mock interview gaps (< 45/100).
   - Categorizes cases into **Critical**, **High**, **Medium**, **Low**, and **Minimal** priorities.
   - Displays exact rule triggers behind each flag. Flags serve strictly as review prompts for faculty advisors.

5. **Unsupervised Student Segmentation (K-Means Clustering)**
   - Uses `scikit-learn` `StandardScaler` and `KMeans(n_clusters=4)` on 6-dimensional standardized student features.
   - Plain-language archetype explanations:
     - *Placement-Ready High Achievers*
     - *Academic Specialists / Placement Prep Needed*
     - *Attendance & Engagement At-Risk Group*
     - *Practical Tech Coders / Needs Academic Boost*
   - Visualizes cluster centroids and enables instant filtering of students in each cluster.

6. **Personalized Intervention Recommendations & Action Hub**
   - Rule-based targeted action plans:
     - Attendance mentoring & dean conference.
     - 4-week Data Structures & Algorithms bootcamp.
     - Speed drills for quantitative reasoning.
     - 1-on-1 mock interview coaching.
   - Explicit trigger, recommended action, timeline (e.g. "Within 3 days"), urgency, and assigned role.

7. **Dedicated Faculty Intervention Tracker**
   - First-class persistent workflow for faculty advisors and mentors stored in SQLite `interventions` table.
   - Supports 5 core intervention types: *Mentoring*, *Attendance Counselling*, *Coding Practice*, *Aptitude Preparation*, and *Mock Interview Support*.
   - Tracks operational statuses: *Planned*, *In Progress*, *Completed*, and *Follow-up Required*.
   - Records assigned faculty advisor, session notes, target follow-up date, and objective outcome evaluation summaries.
   - **Verified Objective Measurements**: Compares baseline CGPA and attendance against subsequent post-intervention measurements, calculating exact improvement deltas (Δ). Strictly identifies when subsequent measurements are pending and never fabricates progress without real data.
   - Dedicated CSV export endpoint (`/api/interventions/export/csv`) for institutional governance and compliance audits.

8. **What-If Success Score Simulator**
   - Interactive, non-destructive simulation modeling page.
   - Allows faculty to test hypothetical adjustments to Academic CGPA, Attendance, Coding Lab, Aptitude, LMS, and Mock Interview ratings using real-time sliders.
   - Recalculates scores dynamically using the platform's exact multi-factor weights without touching or overwriting actual student records.
   - Features a **Factor Contribution Delta Breakdown Table** illustrating exact point attributions (Δ pts) and identifies which dimension provides maximum leverage for student recovery.
   - Clearly badged as an educational simulation, not a predictive guarantee.

9. **Early Warning & Longitudinal Trend Analysis**
   - Detects students experiencing negative performance trajectories (e.g. CGPA drops between previous and current term).
   - Provides clear indicators of historical telemetry coverage (e.g. "Verified records tracked vs. current-semester-only").
   - Transparently marks when past semester telemetry is unavailable rather than assuming or fabricating predictive trajectories.

10. **Data Quality, Completeness & Fairness Verification**
    - Real-time audit endpoint (`/api/analytics/data-quality`) evaluating missing fields, duplicate student IDs, and department sample sizes.
    - **Zero Demographic Bias Policy**: Proves mathematically that zero sensitive, demographic, gender, or geographic variables are collected or weighted.
    - Flags risk indicators strictly as proactive human-in-the-loop assistance prompts, never as punitive or exclusionary determiners.

11. **Local AI Analytics Assistant (Zero External APIs)**
    - Deterministic rule-based assistant that parses natural campus queries and computes answers in real time:
      - *"How many interventions are active?"*
      - *"Who has a declining CGPA trend?"*
      - *"How many students need support?"*
      - *"Show students with attendance below 75%"*
      - *"Which department has the highest average CGPA?"*
      - *"What data quality limitations exist?"*
      - *"Show critical risk students"*
      - *"Explain student STU-2024-001 risk factors"*
    - Renders tabular query results and metric summaries directly within the chat interface.

12. **Executive Reports & CSV Exports**
    - Filtered dataset export and intervention log export to standard CSV.
    - Clean printable report layout formatted for college management board presentations, including Dean approval blocks and privacy warnings.

13. **Configurable Settings & Privacy**
    - Editable dimension weights (must sum to 100%).
    - Custom alert thresholds.
    - Single-click database reset to default demo dataset.
    - Zero data leakage guarantee.

14. **Multi-Dimension Risk Analytics & Overlap**
    - Dedicated **Risk Dimensions** view backed by an 11-dimension explainable flag engine (`risk_service.build_risk_flags`).
    - Per-dimension high/watch counts, available vs. N/A coverage, and the exact threshold rule applied.
    - **Dimension overlap matrix**: deduplicated counts of students flagged in any pair of dimensions (diagonal = unique per dimension), so no student is double-counted.
    - **Department × Dimension heatmap**: size-normalized percentage of each department flagged per dimension.
    - **Risk Register CSV export** (`/api/analytics/export/risk-register.csv`) and dimension summary export (`/api/analytics/export/risk-dimensions.csv`).
    - Future-compatible optional dimensions (backlogs, LMS login/assignment, technical/soft skills, placement outcome, certifications, extracurricular, feedback) are consumed dynamically when present and reported as **N/A** when absent — never invented.

15. **Branch-wise Student Risk Analysis**
    - Dedicated **Branch Risk Analysis** view (branch = the dataset's `department` column; nothing hardcoded).
    - **Per-branch overview**: total students, unique students at risk, risk %, Critical/High/Medium/Low priority counts, average CGPA and attendance, plus a clickable risk-share bar chart and comparison table.
    - **Branch drill-down on click**: priority distribution, dimension-by-dimension breakdown (count + % using the branch total as denominator), most common risk dimensions, and branch-level recommended support actions.
    - **At-Risk Student Register**: searchable, sortable, paginated; shows ID, branch, year, CGPA, attendance, backlogs, LMS, skills, placement readiness, risk priority, and each trigger's observed value **and** the exact threshold that fired.
    - **Global filters & drill-down**: branch, year, risk dimension, and priority filters with active-filter chips, "Reset all", and consistent counts across the overview, detail, register, and exports. Clicking a chart bar, a comparison row, or a dimension row focuses the matching student list.
    - **Transparent, deduplicated counts**: "unique students at risk" uses distinct student IDs — overlapping dimension flags are never summed and presented as unique. Placement *readiness* is distinguished from actual placement *outcomes*.
    - **Exports**: branch summaries CSV (`/api/analytics/export/branch-summaries.csv`) and the currently-filtered register CSV (`/api/analytics/export/at-risk-register.csv`).
    - Backed by `GET /api/analytics/branch-risk-overview`, `/branch-detail`, and `/at-risk-register`.

16. **Retrieval-Augmented (RAG) Assistant**
    - Grounded assistant that answers arbitrary questions about the project — live data, branch/risk analytics, charts/calculations, source code, REST APIs, database, architecture, README, setup, and troubleshooting — using retrieval over the real project files plus a deterministic live-data engine.
    - **Hybrid retrieval**: a deterministic offline hashing vectorizer (word + bigram) blended with BM25 keyword scoring and a file-path/section boost — no model download, no network, and no model server required (no new dependencies).
    - **Answer generation via OpenRouter** (OpenAI-compatible Chat Completions API) with a configurable model. The API key lives only in the backend environment and is never exposed to the frontend, logs, or API responses.
    - **Numbers always come from the live-data engine**, never the LLM; project answers cite the exact file/section/lines (`[path § section]`). Placement readiness is kept distinct from actual outcomes, and absent columns are reported N/A.
    - **Question routing**: `data` vs. `code` vs. `both` vs. `debug`, with pronoun/ellipsis follow-up resolution across turns.
    - **Graceful degradation**: if no API key is configured, the provider is unreachable, or generation fails, the assistant returns the exact deterministic answer plus the most relevant retrieved excerpts — it never fabricates.
    - Incremental, change-aware index (sha1+size fingerprints). The assistant's own implementation/UI files are excluded from the index so it cites the project, not itself.
    - Backed by `POST /api/assistant/ask`, `GET /api/assistant/health`, `GET /api/assistant/index/status`, `POST /api/assistant/index/reindex`, and `POST /api/assistant/index/reset`.

---

## 🏛️ System Architecture

### 1. Architecture Overview
Smart Campus Analytics is architected as an **on-premise, privacy-preserving higher education intelligence platform**. All telemetry ingestion, statistical normalization, unsupervised machine learning, RAG retrieval, and natural language query parsing run entirely within a local Python and React runtime. The only optional outbound call is assistant answer generation via OpenRouter, enabled solely when a backend API key is configured.

The system processes multi-dimensional student indicators across academic records, attendance logs, LMS engagement, and career placement readiness benchmarks. These signals flow through strict validation and cleaning pipelines, persist into an embedded SQLite relational database, and feed an explainable AI analytics engine that powers an interactive institutional dashboard.

---

### 2. High-Level Architecture Flowchart

```mermaid
flowchart TD
    subgraph S1 ["1. Student Data Sources"]
        direction TB
        DS_ACAD["Academic Records (Marks, CGPA, Progression)"]
        DS_ATTN["Attendance Compliance (Lecture %)"]
        DS_LMS["LMS Courseware Engagement (0-100 Index)"]
        DS_SKILLS["Skills Benchmark (Coding, Aptitude, Mock Interview)"]
        DS_PLACE["Placement Readiness Status (Placed, Ready, In Progress, Training)"]
        DS_SYNTH["12,000 Synthetic Student Cohort Generator"]
        DS_PLANNED["[Planned] Direct SIS / Canvas LMS Webhook Connector"]
    end

    subgraph S2 ["2. Data Integration & Ingestion"]
        direction TB
        DI_UPLOAD["Drag-and-Drop File Upload (CSV & .xlsx Excel)"]
        DI_PARSER["Pandas 2.2 & OpenPyXL 3.1 Parser"]
        DI_VALID["Data Validation Engine (Range Checks & Aliases)"]
        DI_CLEAN["Data Cleaning & Type Sanitization"]
        DI_PLANNED["[Planned] Celery / Redis Async Streaming Queue"]
    end

    subgraph S3 ["3. Backend Processing & REST API"]
        direction TB
        BE_FASTAPI["FastAPI 0.110 & Uvicorn (Python 3.12)"]
        BE_ROUTER_STU["/api/students (CRUD, Roster, CSV Export)"]
        BE_ROUTER_ANL["/api/analytics (Overview KPIs & Distributions)"]
        BE_ROUTER_AST["/api/assistant (Local Query Parser & Intent Engine)"]
        BE_ROUTER_CFG["/api/config (Scoring Weights & Alert Thresholds)"]
        BE_PYDANTIC["Pydantic v2 Request/Response Validation"]
    end

    subgraph S4 ["4. AI & Local Analytics Engine"]
        direction TB
        AI_SCORE["Student Success Scoring (6-Factor Weighted Formula)"]
        AI_RISK["Multi-Factor At-Risk Engine (Deterministic Rules)"]
        AI_CLUST["Student Segmentation (Scikit-Learn StandardScaler & KMeans k=4)"]
        AI_REC["Prescriptive Recommendations (Actionable Advisory Rules)"]
        AI_NLP["Local Query Assistant (Deterministic Intent Parser)"]
        AI_PLANNED["[Planned] Longitudinal Predictive Dropout Model (ML)"]
    end

    subgraph S5 ["5. Local Database & Persistence"]
        direction TB
        DB_SQLITE["SQLite Database (campus_analytics.db)"]
        DB_ORM["SQLAlchemy 2.0 ORM"]
        DB_STU_TBL["students Table (Academic, Placement, Review State)"]
        DB_SET_TBL["system_settings Table (Weights & Thresholds JSON)"]
        DB_PLANNED["[Planned] PostgreSQL Multi-Tenant Migration Target"]
    end

    subgraph S6 ["6. Analytics Dashboard"]
        direction TB
        UI_OVERVIEW["Institutional Overview (Live KPI Cards & Recharts)"]
        UI_ROSTER["Student Directory (Multi-Filtered Roster & Profile Drawer)"]
        UI_RISK["At-Risk Warning Center (Severity Triage & Triggers)"]
        UI_CLUST["K-Means Cluster Visualizer (Archetypes & Centroids)"]
        UI_INTERV["Faculty Case Reviews (Counseling Notes & Status Sync)"]
        UI_CHAT["Local AI Assistant Console (Natural Language Campus Chat)"]
        UI_REPORT["Executive Board Report (Print-Optimized Document)"]
    end

    %% Pipeline Connections
    S1 -->|"Raw Student Datasets & Uploads"| S2
    S2 -->|"Validated Ingestion Payload"| S3
    S3 -->|"Feature Vectors & Telemetry"| S4
    S4 <-->|"Bidirectional Student Records & Counseling Sync"| S5
    S3 <-->|"ORM Session Reads & Writes"| S5
    S4 -->|"Computed Scores, Clusters & Alerts"| S6
    S3 -->|"JSON REST API Responses"| S6
    S6 -.->"Advisory Actions & CSV/Excel Uploads"| S2
```

---

### 3. Component Breakdown & Functional Role

#### Stage 1: Student Data Sources
- **Academic Marks & CGPA**: Captures semester-wise GPA, cumulative CGPA (0.00–10.00), and historical previous-term CGPA to track progression velocity and downward trajectory penalties.
- **Attendance Compliance**: Tracks lecture and laboratory attendance percentages against statutory campus thresholds (standard warning at `< 75%`, critical dean review at `< 70%`).
- **LMS Engagement Index**: Measures digital module completions, resource accesses, and assignment turnarounds scaled from `0` to `100`.
- **Skill Lab Benchmarks**: Evaluates technical coding proficiency (0–100), quantitative/logical aptitude (0–100), and soft skill/mock interview ratings (0–100).
- **Placement Readiness**: Tracks campus recruitment status categorized into `Placed`, `Ready`, `In Progress`, and `Needs Training`.
- **Synthetic Data Generator**: Deterministic profile generator (`generate_demo_csv.py` / `data_service.py`) generating 12,000 balanced student profiles across 5 engineering departments.
- **Planned Connectors**: Direct live API and webhook synchronization with university SIS (Banner / Peoplesoft) and LMS platforms (Canvas / Moodle / Blackboard via LTI 1.3).

#### Stage 2: Data Integration & Ingestion Layer
- **Multi-Format Ingestion**: Accepts batch uploads in both standard CSV and Microsoft Excel (`.xlsx`) formats via `FastAPI` file streaming and `OpenPyXL`.
- **Column Alias Mapping**: Automatically resolves variable institutional header names (e.g., matching `"Roll No"`, `"Enrollment ID"`, or `"Student ID"` to the internal canonical `id` field).
- **Strict Range Validation**: Enforces domain constraints (`0.0 <= CGPA <= 10.0`, `0 <= percentage metrics <= 100`) and reports row-by-row error details before commit.
- **Data Cleaning & Normalization**: Strips whitespace, handles missing optional fields with safe defaults, and prevents partial cohort imports with transactional rollbacks.
- **Planned Worker Queue**: Decoupled asynchronous background streaming via Redis and Celery for enterprise batches exceeding 100,000 student records.

#### Stage 3: Backend Processing & REST API Layer
- **FastAPI Core**: Asynchronous Python 3.12 service running on Uvicorn with automatic CORS handling and lifespan startup hooks.
- **Domain Routers**:
  - `/api/students`: Filterable cohort queries, pagination, student profile dossier, CSV template generation, and student export.
  - `/api/analytics`: Overview metrics, department analytics (`/departments`), multi-dimension flags (`/risk-dimensions`), overlap matrix (`/risk-overlap`), department risk matrix (`/department-risk-matrix`), full risk register (`/risk-register`), branch-wise analytics (`/branch-risk-overview`, `/branch-detail`, `/at-risk-register`), data quality, segmentation, and executive summaries. CSV exports under `/api/analytics/export/*`.
  - `/api/assistant`: Deterministic natural language query parser executing campus aggregations with zero cloud calls (`POST /api/assistant/query`), plus the RAG assistant (`/ask`, `/health`, `/index/*`) whose optional answer generation uses OpenRouter.
  - `/api/config`: Dynamic configuration endpoints for adjusting scoring weights and risk thresholds.
- **Pydantic v2 Contracts**: Enforces strict request and response typing, parameter sanitization, and automatic Swagger OpenAPI documentation at `/docs`.

#### Stage 4: AI & Local Analytics Engine
- **Student Success Scoring Formula**: Computes a normalized composite index ($0 - 100$) based on configurable multi-factor weights:
  $$\text{Success Score} = (0.25 \times \text{CGPA}_{\text{norm}}) + (0.20 \times \text{Attendance}) + (0.15 \times \text{LMS}) + (0.15 \times \text{Coding}) + (0.15 \times \text{Aptitude}) + (0.10 \times \text{Mock})$$
- **Explainable At-Risk Detection Engine**: Evaluates rule-based triggers (attendance deficit, low CGPA, academic downward momentum $\ge 1.0$, placement skill deficits) and categorizes students into `Critical`, `High`, `Medium`, `Low`, and `Minimal` risk priorities.
- **Unsupervised K-Means Segmentation**: Employs `scikit-learn` `StandardScaler` and `KMeans(n_clusters=4)` over 6 standardized dimensions, producing plain-language archetypes (*Placement-Ready High Achievers*, *Academic Specialists*, *Attendance At-Risk*, *Practical Tech Coders*).
- **Prescriptive Recommendation Engine**: Maps triggered deficiencies to targeted action playbooks (DSA bootcamps, dean attendance counseling, speed aptitude drills, mock interview coaching) with defined urgency and timelines.
- **Local Query Assistant Parser**: Pattern-matching NLP engine in `assistant_service.py` that translates administrative questions (*"Show students with attendance below 75%"*, *"Which department has the highest average CGPA?"*) into exact SQL/Pandas operations.
- **Planned Predictive Models**: Longitudinal supervised dropout classification (Random Forest / XGBoost with SHAP explainability) trained on multi-year graduation records.

#### Stage 5: Database & Persistence Layer
- **SQLite Database**: Lightweight, zero-configuration relational storage located at `campus_analytics.db`.
- **SQLAlchemy 2.0 ORM**: Manages table mappings, schema migrations, and concurrency controls:
  - `students`: 38 fields including academic attributes, placement milestones, counseling notes, review timestamps, intervention statuses, and optional future-compatible dimensions (backlogs, LMS login/assignment, technical/soft skills, placement outcome, certifications, extracurricular, feedback). New nullable columns are applied additively at startup by `database.ensure_schema()` without dropping existing data.
  - `system_settings`: Key-value JSON store preserving custom scoring weights and alert thresholds across server restarts.
- **Planned Enterprise Target**: PostgreSQL 16 migration target with row-level security for multi-campus university deployments.

#### Stage 6: Analytics Dashboard (Presentation Layer)
- **Institutional Overview**: Real-time KPI summary cards, interactive Recharts distribution charts, placement pipeline progress, and priority alerts.
- **Student Directory**: High-performance data table with search, multifaceted filtering (department, risk level, placement status), sorting, pagination, and slide-over dossier drawer.
- **At-Risk Warning Center**: Triage interface surfacing students with active trigger explanations for proactive faculty guidance.
- **Cluster Visualizer**: Interactive K-Means cluster exploration displaying archetype centroid profiles.
- **Faculty Case Reviews**: Human-in-the-loop tracking allowing advisors to update statuses (`Pending Review`, `Mentoring Assigned`, `Workshop Scheduled`, `Resolved`) and log notes.
- **Local AI Assistant Console**: Terminal-style interactive chat UI for running natural language queries against campus data.
- **Printable Executive Reports**: Board-ready review document styled with CSS `@media print` rules, institutional sign-off sections, and privacy guarantees.

---

### 4. Data Flow Lifecycle

```
[1. Ingestion & Upload]
   CSV / Excel File uploaded via UploadModal
   ➔ FastAPI /api/students/upload
   ➔ Pandas / OpenPyXL validation & range sanitization

[2. Persistence & Normalization]
   Validated records written to SQLite (campus_analytics.db) via SQLAlchemy ORM
   ➔ Auto-initializes scoring and historical progression baselines

[3. Local AI Engine Processing]
   Raw telemetry pulled into Analytics Engine
   ➔ scoring_service computes weighted 0-100 success index & factor breakdown
   ➔ risk_service evaluates multi-factor rule triggers & assigns priority tier
   ➔ segmentation_service runs scikit-learn StandardScaler + KMeans(k=4) clustering
   ➔ recommendation_service attaches prescriptive intervention playbooks

[4. Dashboard Visualization & Advisory Feedback]
   React frontend fetches aggregates via /api/analytics and /api/students
   ➔ Renders KPIs, Recharts graphs, and filterable rosters
   ➔ Faculty mentors record counseling notes & resolution status
   ➔ Status written back to SQLite (Human-in-the-loop audit trail)
```

---

### 5. Implemented vs. Planned Status Matrix

| Component | Architecture Layer | Technology | Status | Implementation File |
|---|---|---|---|---|
| **Academic & Attendance Data** | 1. Data Sources | SQLite / CSV Schema | 🟢 **Implemented** | `backend/app/models.py` |
| **Skill Labs & Placement Status** | 1. Data Sources | SQLite / CSV Schema | 🟢 **Implemented** | `backend/app/models.py` |
| **Synthetic Cohort Generator** | 1. Data Sources | Python Faker / Random | 🟢 **Implemented** | `backend/generate_demo_csv.py` |
| **Live SIS & Canvas LMS API Sync** | 1. Data Sources | REST / LTI 1.3 Webhooks | 🟡 *Planned (Roadmap)* | *Future Scope* |
| **CSV & Excel (.xlsx) Ingestion** | 2. Data Integration | Pandas, OpenPyXL | 🟢 **Implemented** | `backend/app/services/data_service.py` |
| **Column Alias & Range Sanitizer** | 2. Data Integration | Python / Pandas | 🟢 **Implemented** | `backend/app/services/data_service.py` |
| **Asynchronous Streaming Queue** | 2. Data Integration | Celery, Redis | 🟡 *Planned (Roadmap)* | *Future Scope* |
| **FastAPI REST API & Uvicorn** | 3. Backend Processing | FastAPI, Python 3.12 | 🟢 **Implemented** | `backend/app/main.py` |
| **Modular Domain API Routers** | 3. Backend Processing | FastAPI APIRouter | 🟢 **Implemented** | `backend/app/api/routes_*.py` |
| **Pydantic I/O Schemas** | 3. Backend Processing | Pydantic v2 | 🟢 **Implemented** | `backend/app/schemas.py` |
| **Success Scoring Formula** | 4. AI Analytics Engine | Deterministic Weighted Math | 🟢 **Implemented** | `backend/app/services/scoring_service.py` |
| **Multi-Factor At-Risk Engine** | 4. AI Analytics Engine | Deterministic Rule Logic | 🟢 **Implemented** | `backend/app/services/risk_service.py` |
| **K-Means Student Clustering** | 4. AI Analytics Engine | Scikit-learn (KMeans k=4) | 🟢 **Implemented** | `backend/app/services/segmentation_service.py` |
| **Prescriptive Recommendations** | 4. AI Analytics Engine | Rule-Based Action Mapper | 🟢 **Implemented** | `backend/app/services/recommendation_service.py` |
| **Local Query Assistant (NLP)** | 4. AI Analytics Engine | Deterministic Regex Parser | 🟢 **Implemented** | `backend/app/services/assistant_service.py` |
| **Longitudinal Dropout Model** | 4. AI Analytics Engine | XGBoost / Random Forest | 🟡 *Planned (Roadmap)* | *Future Scope* |
| **SQLite Embedded Database** | 5. Database Layer | SQLite 3 (`campus_analytics.db`)| 🟢 **Implemented** | `backend/app/database.py` |
| **SQLAlchemy ORM Models** | 5. Database Layer | SQLAlchemy 2.0 | 🟢 **Implemented** | `backend/app/models.py` |
| **PostgreSQL Multi-Tenant Cluster** | 5. Database Layer | PostgreSQL 16 | 🟡 *Planned (Roadmap)* | *Future Scope* |
| **Institutional Overview Dashboard** | 6. Dashboard | React 18, Recharts | 🟢 **Implemented** | `frontend/src/views/DashboardView.tsx` |
| **Searchable Student Directory** | 6. Dashboard | React 18, Tailwind CSS | 🟢 **Implemented** | `frontend/src/components/StudentTable.tsx` |
| **At-Risk Warning Center** | 6. Dashboard | React 18, Tailwind CSS | 🟢 **Implemented** | `frontend/src/views/RiskAssessmentView.tsx` |
| **K-Means Cluster Visualizer** | 6. Dashboard | React 18, Recharts | 🟢 **Implemented** | `frontend/src/components/ClusterVisualizer.tsx` |
| **Faculty Intervention Workflow** | 6. Dashboard | React 18, SQLite Sync | 🟢 **Implemented** | `frontend/src/views/InterventionsView.tsx` |
| **Local AI Assistant Chat Console** | 6. Dashboard | React 18, Custom Chat UI | 🟢 **Implemented** | `frontend/src/components/ChatAssistant.tsx` |
| **Printable Executive Report** | 6. Dashboard | CSS `@media print` | 🟢 **Implemented** | `frontend/src/components/PrintableReport.tsx` |
| **Data Quality & Fairness Audit** | 6. Dashboard | React 18, SVG coverage gauge | 🟢 **Implemented** | `frontend/src/views/DataQualityView.tsx` |
| **Multi-Dimension Risk Analytics & Overlap** | 4 & 6. Engine + Dashboard | Deterministic flags, React heatmaps | 🟢 **Implemented** | `backend/app/services/analytics_service.py`, `frontend/src/views/RiskDimensionsView.tsx` |
| **Branch-wise Student Risk Analysis** | 4 & 6. Engine + Dashboard | Deterministic branch aggregation, React charts & register | 🟢 **Implemented** | `backend/app/services/analytics_service.py`, `frontend/src/views/BranchRiskView.tsx` |
| **What-If Success Simulator** | 6. Dashboard | React 18, Range Sliders | 🟢 **Implemented** | `frontend/src/views/SimulatorView.tsx` |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide React, Recharts |
| **Backend** | Python 3.12, FastAPI, Uvicorn, Starlette, Pydantic |
| **Data & ML** | Pandas, NumPy, Scikit-learn (K-Means, StandardScaler) |
| **Database** | SQLite via SQLAlchemy ORM |
| **File I/O** | CSV, OpenPyXL (.xlsx) |
| **LLM (optional)** | OpenRouter Chat Completions API (OpenAI-compatible), called via the Python standard library (`urllib`) |

---

## 📁 Project Structure

```
smart-campus-analytics/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes_analytics.py    # Overview, segmentation, risk roster, data quality, summary report
│   │   │   ├── routes_assistant.py    # Local rule-based query parser
│   │   │   ├── routes_config.py       # Weights, thresholds, database reset
│   │   │   ├── routes_interventions.py# Faculty intervention log CRUD & CSV export
│   │   │   └── routes_students.py     # Student CRUD, filters, upload, export
│   │   ├── services/
│   │   │   ├── analytics_service.py   # Department/dimension/overlap/matrix aggregations
│   │   │   ├── assistant_service.py   # Real-time intent parser & exact math
│   │   │   ├── data_service.py        # Demo dataset generator & CSV validator
│   │   │   ├── recommendation_service.py # Transparent action rules
│   │   │   ├── risk_service.py        # Explainable multi-factor risk engine
│   │   │   ├── scoring_service.py     # Weighted success scoring formula
│   │   │   ├── segmentation_service.py # Scikit-learn K-Means clustering
│   │   │   └── rag/                   # RAG: local retrieval + live-data tools + OpenRouter generation
│   │   ├── config.py                  # Default weights/thresholds + stdlib .env loader
│   │   ├── database.py                # SQLite session config & additive migration
│   │   ├── main.py                    # FastAPI application & startup seed
│   │   ├── models.py                  # SQLAlchemy Student & Setting models
│   │   └── schemas.py                 # Pydantic request/response schemas
│   ├── tests/
│   │   ├── test_analytics.py          # Dimension/overlap/matrix + branch-wise analytics tests
│   │   ├── test_core.py               # Unit tests (scoring, risk, CSV, assistant)
│   │   └── test_rag.py                # RAG + OpenRouter client tests (offline, network mocked)
│   ├── generate_demo_csv.py           # Exports standalone synthetic dataset
│   ├── .env.example                   # Backend env template (OpenRouter key/model, tuning)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatAssistant.tsx      # Local query chatbot UI
│   │   │   ├── FloatingChatAssistant.tsx # Global assistant drawer
│   │   │   ├── ClusterVisualizer.tsx  # K-Means cluster exploration
│   │   │   ├── Header.tsx             # Navigation header & quick actions
│   │   │   ├── MetricCard.tsx         # KPI cards with accents
│   │   │   ├── PrintableReport.tsx    # Management printable layout
│   │   │   ├── RiskBadge.tsx          # Priority tags
│   │   │   ├── ScoreBreakdownRadar.tsx# Recharts radar & contribution table
│   │   │   ├── Sidebar.tsx            # Navy navigation sidebar
│   │   │   ├── StudentDetailModal.tsx # Full profile drawer & workflow
│   │   │   ├── StudentTable.tsx       # Searchable student directory table
│   │   │   ├── Toast.tsx              # Global toast notification stack
│   │   │   ├── UploadModal.tsx        # CSV/Excel drag & drop uploader
│   │   │   └── WeightSettingsModal.tsx# Sliders for scoring dimensions
│   │   ├── hooks/
│   │   │   └── useCountUp.ts          # Animated KPI count-up hook
│   │   ├── services/
│   │   │   └── api.ts                 # Backend API client
│   │   ├── views/
│   │   │   ├── DashboardView.tsx      # Overview charts & analytics
│   │   │   ├── RiskAssessmentView.tsx # At-risk early warning view
│   │   │   ├── InterventionTrackerView.tsx # Faculty intervention case tracking
│   │   │   ├── SimulatorView.tsx      # What-if success score simulator
│   │   │   ├── RecommendationsView.tsx# Prescriptive action hub
│   │   │   ├── BranchRiskView.tsx     # Branch-wise risk overview, drill-down & register
│   │   │   ├── RiskDimensionsView.tsx # Dimension flags, overlap & dept matrices
│   │   │   └── DataQualityView.tsx    # Data completeness & fairness audit
│   │   ├── types/
│   │   │   └── index.ts               # TypeScript data definitions
│   │   ├── App.tsx                    # Main state & view controller
│   │   ├── index.css                  # Tailwind styles
│   │   └── main.tsx                   # React root entrypoint
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── data/
│   └── demo_students.csv              # 12,000 Synthetic student records
├── start_backend.bat                  # One-click Windows backend launcher
├── start_frontend.bat                 # One-click Windows frontend launcher
├── run_tests.bat                      # Runs backend test suite
└── README.md
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+ and npm**

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Run backend test suite
python -m unittest discover -s tests -p "test_*.py"

# Start FastAPI server (Port 8000)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The database (`campus_analytics.db`) is automatically initialized and seeded with 12,000 synthetic students on first run. A timestamped backup of the previous database is written to `backend/backups/` before any destructive reset.*

### 3. Frontend Setup
```bash
# Open a new terminal in the frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite development server (Port 5173)
npm run dev
```

### 4. Access the Application
Open your web browser and navigate to:
👉 **`http://localhost:5173`**

FastAPI interactive Swagger documentation is available at:
👉 **`http://127.0.0.1:8000/docs`**

### 5. Configure the RAG Assistant LLM (OpenRouter)

The assistant works with **zero LLM setup** — with no API key it answers data questions deterministically and returns grounded project excerpts (retrieval-only / degraded mode). To enable free-form grounded prose answers it calls the [OpenRouter](https://openrouter.ai) API from the **backend only**.

**Configure the key (backend-only, never the frontend):**

```bash
cd backend
# copy the template and fill in your real key
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
```

Then edit `backend/.env`:

```dotenv
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

- **Select a model** by setting `OPENROUTER_MODEL` to any chat model id from https://openrouter.ai/models (e.g. `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`, `meta-llama/llama-3.3-70b-instruct`). The integration is model-agnostic because OpenRouter is OpenAI-compatible.
- `backend/.env` is git-ignored (see `.gitignore`). The API key is **never** bundled into the React build, logged, or returned by any endpoint — only pass it via backend environment variables.
- Shell/OS environment variables take precedence over `.env`, so production deployments can inject secrets directly.

**Optional settings** (all in `backend/.env`): `OPENROUTER_BASE_URL`, `OPENROUTER_SITE_URL` / `OPENROUTER_APP_TITLE` (OpenRouter attribution headers), `RAG_LLM_TIMEOUT` (default 60s), `RAG_LLM_MAX_TOKENS` (default 768), `RAG_LLM_TEMPERATURE` (default 0.2), `RAG_LLM_MAX_RETRIES` (default 3), `RAG_LLM_RETRY_BACKOFF`, `RAG_MAX_CONTEXT_CHARS` (default 4000), `RAG_TOP_K`, and `RAG_DISABLE_LLM=1` to force deterministic mode.

- If the key is missing, invalid, rate-limited, or the provider is unreachable, the assistant degrades to deterministic + retrieved evidence with a clear, secret-free message (HTTP 401/403, 429 with `Retry-After`, and 5xx are all handled explicitly).
- Rebuild the index after large changes via `POST /api/assistant/index/reindex?force=true` (or the in-app **Re-index** button).
- Retrieval is fully offline using a deterministic hashing vectorizer — no embedding model, no model server, and no network access are needed.

**Deploying the backend** (the API key stays server-side):

```bash
# Inject the key from the host environment (no .env file needed in production)
set OPENROUTER_API_KEY=sk-or-v1-xxxx        # Windows cmd
export OPENROUTER_API_KEY=sk-or-v1-xxxx     # bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Serve the backend behind HTTPS (reverse proxy) and keep the key in the host's secret manager or environment. Never commit it, and never expose it through the Vite/React frontend (`VITE_*`) variables.

---

## 🧪 Testing

Run the included unit test suite to verify scoring accuracy, risk classification, CSV validation, assistant query execution, the dimension/overlap analytics, the branch-wise analytics (branch totals, risk %, unique-vs-overlapping counts, filters, register triggers, and exports), and the RAG module (section-aware chunking & scoping, embeddings, vector store + BM25, routing, live-data tools, data-tool edge cases, degraded-mode orchestration, and the OpenRouter client — success, auth failure, rate-limit retry, and secret-sanitization — all with the network mocked):

```bash
cd backend
python -m unittest discover -s tests -p "test_*.py"
```

All 57 test cases run quickly with zero external dependencies (the RAG tests are fully offline and never call the network or the LLM).

---

## 🔒 Privacy & Local Execution Notice

This application is local-first. All data processing, machine learning clustering, scoring algorithms, CSV/Excel ingestion, and RAG **retrieval** run locally on your machine. Student records are never sent to any external service as part of analytics.

The only optional outbound call is **assistant answer generation**: when (and only when) `OPENROUTER_API_KEY` is configured on the backend, the retrieved context (project excerpts, plus the already-computed aggregate live-data block — not the raw student table) is sent to the OpenRouter API to produce a prose answer. Without a key, no external call is made. The API key is stored only in the backend environment, is never exposed to the browser, and is scrubbed from logs and error messages.
