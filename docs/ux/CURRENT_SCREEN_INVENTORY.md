# Omni IELTS — Current Screen Inventory & Product Structure Audit

> **Document Version:** 1.0.0  
> **Audience:** Senior Product & UX Advisors, Engineering Leads  
> **Scope:** Full application inspection and rendered state audit of Omni IELTS  
> **Evidence Priority:** Rendered browser inspection (`1440×900` & `390×844`), React component implementations, state contracts, and test fixtures.

---

## 1. Master Screen Table

| ID | Screen | Route / Trigger | Product Area | Primary Purpose | Important States | Screenshot |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SCR-001** | **Home Dashboard** | `activeModule === 'dashboard'` | Dashboard & Habits | Cockpit for daily learning priorities, streak, level, 4-skill overview, and quick access tiles | Initial / Populated / Mobile | `SCR-001-home-dashboard.png` |
| **SCR-002** | **Source Ingestion & Package Engine** | `activeModule === 'sources'` | Multi-Source Learning | Ingest PDF, URL, YouTube, Docx, calibrate band, and generate 4-skill learning packs | Single Form / Batch Mode / Pack View / Vocab / Grammar | `SCR-002-source-ingestion-single.png` |
| **SCR-003** | **AI Course Designer Modal** | Sources -> Button "AI Course Designer" | Multi-Source Learning | Interactive curriculum generator turning raw inputs into complete 4-skill courses | Form Open / Processing / Completed | `SCR-003-ai-course-designer-modal.png` |
| **SCR-004** | **Vocabulary SRS Hub** | `activeModule === 'vocabulary'` | Vocabulary SRS | FSRS-6 spaced repetition vocabulary system with 7 distinct study modalities | Flashcard / Quiz / Dictation / Context / Voice / Lexicon / Decks | `SCR-004-A-vocab-flashcard.png` |
| **SCR-005** | **AI Vocab Enricher Modal** | Vocab -> Button "AI Enricher" | Vocabulary SRS | Deep single-word enrichment dialog with collocations, IPA, and band 8.0 examples | Input Open / AI Generating / Enriched Result | `SCR-005-vocab-enricher-modal.png` |
| **SCR-006** | **Grammar Hub** | `activeModule === 'grammar'` | Grammar & Sentences | Advanced grammar curriculum (Band 7.0–8.5+) and AI essay grammar diagnostician | Curriculum Drill / Diagnostician Form / Result | `SCR-006-A-grammar-curriculum.png` |
| **SCR-007** | **Grammar Curriculum Designer Modal** | Grammar -> Button "Thiết Kế Lộ Trình" | Grammar & Sentences | Curriculum planner structuring grammar points according to diagnostic weaknesses | Modal Active / Submitting / Generated | `SCR-007-grammar-curriculum-modal.png` |
| **SCR-008** | **Media Lab (Shadowing & Dictation)** | `activeModule === 'media'` | Media Lab | Authentic YouTube video listening and speaking lab with line-by-line audio sync | Shadowing Studio / Dictation / Transcript Editor / Vocab | `SCR-008-A-media-shadowing-studio.png` |
| **SCR-009** | **YouTube URL Ingestion Modal** | Media -> Button "+ Nhập URL YouTube" | Media Lab | Extract closed captions and generate sentence-level transcripts from YouTube | URL Input / Fetching / Processed | `SCR-009-youtube-import-modal.png` |
| **SCR-010** | **AI Audio Transcription Modal** | Media -> Button "🎙️ AI Audio Transcription" | Media Lab | Audio file uploader and live recording transcription engine | Uploading / Transcribing / Segmented Result | `SCR-010-audio-transcribe-modal.png` |
| **SCR-011** | **IELTS Practice & Forecast Hub** | `activeModule === 'practice'` | 4-Skill Practice | Real 2026 forecast exam bank (Google Grounding) and 4-skill practice modules | Forecast Hub / Reading / Listening / Writing / Speaking | `SCR-011-A-practice-forecast-live.png` |
| **SCR-012** | **Cambridge Item Writer Modal** | Practice -> Button "Cambridge Item Writer" | 4-Skill Practice | AI question generator creating authentic Cambridge-format test items | Prompt Input / Generating / Generated Exam Set | `SCR-012-item-writer-modal.png` |
| **SCR-013** | **Full 4-Criteria Standalone Grader** | Practice -> Button "Giám Khảo Chấm 4 Tiêu Chí" | 4-Skill Practice | Standalone grading workbench evaluating essays/speaking across TR, CC, LR, GRA | Text Input / Evaluating / Detailed Scorecard | `SCR-013-full-grader-modal.png` |
| **SCR-014** | **Question Trap Diagnostic Modal** | Reading/Listening -> "Phân tích bẫy đề" | 4-Skill Practice | Deconstructs distractor rationale and False vs Not Given traps for a question | Trap Analysis Open | `SCR-014-question-trap-modal.png` |
| **SCR-015** | **Mock Test Hub** | `activeModule === 'mock_test'` | Mock Simulation | Catalog of Cambridge/IDP full mock tests, performance progress, and past attempts | Test Catalog / Live Hub / Progress Chart / History | `SCR-015-A-mock-test-catalog.png` |
| **SCR-016** | **Fullscreen Exam Simulation** | Mock Test -> Button "Bắt Đầu Làm Bài" | Mock Simulation | Distraction-free official computer-delivered IELTS simulation environment | Listening / Reading / Writing / Speaking Exam | `SCR-016-A-exam-listening-mode.png` |
| **SCR-017** | **Mock Test Comprehensive Report** | Exam Complete / History Item Click | Mock Simulation | Multi-skill score report (0–9), radar chart, criterion feedback, and recommendations | Report View Active | `SCR-017-mock-report-scorecard.png` |
| **SCR-018** | **Mock Orchestrator Builder Modal** | Mock Test -> "Tạo Đề Thi Thử Tuỳ Chỉnh" | Mock Simulation | Custom test package assembler mixing sections and forecast items | Configuration Open / Compiling / Saved | `SCR-018-mock-orchestrator-modal.png` |
| **SCR-019** | **IELTS Masterclass & Knowledge Base** | `activeModule === 'knowledge'` | Knowledge & Strategy | Masterclasses on exam strategy, PEEL/PPF formulas, annotated 8.5+ models, calculator | Strategies / Model Answers / Pitfalls / Calculator | `SCR-019-A-knowledge-strategies.png` |
| **SCR-020** | **Learner Profile & Data/API Settings** | `activeModule === 'profile'` | Profile & Platform | User goals, Google OAuth sync, BYOK Gemini/Groq keys, and API Gateway pool | Overview / Editing / Synced / Quota Info | `SCR-020-A-profile-settings.png` |
| **SCR-021** | **Unified Error Journal Modal** | Header -> Button "Error Journal" | Unified Diagnostics | Personal error repository with 8-trap classification and FSRS-6 mistake workouts | Analytics Radar / Daily Workout / Vault / Add Form | `SCR-021-A-mistake-analytics.png` |
| **SCR-022** | **Intelligent Error Tagger Modal** | Mistake Notebook -> "AI Error Tagger" | Unified Diagnostics | AI parser extracting language flaws from freeform text into structured error cards | Input Open / Extracting / Cards Extracted | `SCR-022-error-tagger-modal.png` |
| **SCR-023** | **Diagnostic Psychometrician 8-Axis Modal** | Dashboard/Profile -> "Chẩn Đoán 8 Trục" | Unified Diagnostics | In-depth psychometric assessment evaluating 8 cognitive axes with Radar visualization | Input / Assessing / 8-Axis Radar Scorecard | `SCR-023-diagnostic-psychometrician-modal.png` |
| **SCR-024** | **Onboarding Quick Placement Wizard** | Header -> Button "Test chẩn đoán" | Unified Diagnostics | 4-step onboarding wizard: goal definition, listening test, reading test, and roadmap | Step 1 Goal / Step 2 L / Step 3 R / Step 4 Result | `SCR-024-onboarding-modal.png` |
| **SCR-025** | **3-Tier Academic Sentence Stylist** | Practice/Writing -> "Nâng Cấp Câu" | 4-Skill Practice | Sentence rewriter upgrading sentences from Band 6.5 to 7.5 and 8.5 with hedging | Input Open / Rewriting / 3-Tier Comparison | `SCR-025-sentence-stylist-modal.png` |
| **SCR-026** | **60-Second Speed Drill Arena Modal** | Dashboard -> "60-Second Speed Drill" | Dashboard & Habits | High-intensity 60s micro-challenges: Paraphrase, Cohesive Jigsaw, Collocation | Paraphrase / Jigsaw / Collocation Match | `SCR-026-speed-drill-arena-modal.png` |
| **SCR-027** | **Contextual Floating AI Tutor Drawer** | Persistent Floating Action Button | Global Utility | Context-adaptive AI chat with Search Grounding, citations, and TTS audio | Collapsed / Expanded / Research Mode | `SCR-027-floating-ai-tutor-drawer.png` |
| **SCR-028** | **Master Mentor Panel Modal** | Writing Practice -> "Hội Đồng Cố Vấn" | 4-Skill Practice | Multi-mentor advisory panel (Dr. Vance) analyzing subtle argumentative flaws | Consulting / Flaws / Ideas / Collocations | `SCR-028-master-mentor-panel-modal.png` |

---

## 2. Detailed Screen Specifications

---

### SCR-001 — Home Dashboard (Bento Grid Cockpit)

#### Location
* **Route:** `activeModule === 'dashboard'` (default initial route `/`)
* **How user reaches it:** Application launch, clicking the brand logo (`brand-home-btn`) in Header, or clicking "Trang chủ" (`nav-item-dashboard`) in Sidebar/BottomNav.
* **Parent product area:** Dashboard & Habit Hub
* **Previous likely screen:** N/A (root landing)
* **Next likely screen(s):** `SCR-004` (Vocabulary SRS), `SCR-021` (Error Journal), `SCR-008` (Media Lab), `SCR-002` (Source Ingestion), `SCR-026` (Speed Drill), `SCR-023` (8-Axis Diagnostic).

#### User Goal
Provide a comprehensive central cockpit where the learner immediately perceives their daily learning priorities, days remaining until the official IELTS exam, active study streak, 4-skill band distribution, and one-click shortcuts to today's scheduled SRS reviews.

#### Layout Hierarchy
* **Global Shell:**
  * Top Fixed Header (`Header.tsx`)
  * Left Desktop Sidebar (`Sidebar.tsx`)
  * Floating AI Tutor Button (`FloatingAITutor.tsx`)
* **Page Header:**
  * Contextual Recommendation Banner (`NextActionBanner.tsx`)
* **Main Content (Bento Grid Structure):**
  * **Layer 1 (Hero Bento Grid):**
    * *Left Cell (8 cols on lg):* Personalized Welcome banner, AI Engine badge, Target Band goal summary, 4-Skill Band Micro-Breakdown (Listening, Reading, Writing, Speaking), and 8-Axis Diagnostic quick trigger button.
    * *Right Cell (4 cols on lg, Royal Blue):* Learning Streak Card (`profile.streak` days), Gamification Level (`level`), and Band Progress Bar (`currentBand` / `targetBand`).
  * **Layer 2 (Today's Priority Tasks Grid):**
    * *Card 1:* Spaced Repetition Vocab due task card (`dueVocab.length` cards).
    * *Card 2:* Sổ Tay Lỗi Sai (Error Journal) due task card (`dueMistakes.length` errors).
    * *Card 3:* Media Lab Shadowing priority task card.
    * *Horizontal Launcher Banner:* 60-Second Speed Drill Arena Quick-Launcher (Paraphrase Blitz, Cohesive Jigsaw, Collocation Match).
  * **Layer 3 (7 Modular Learning Tiles):**
    * 7-column grid linking directly to Sources, Vocabulary, Grammar, Media Lab, Practice, Mock Test, and Strategy Knowledge.
  * **Layer 4 (Spotlights Grid - 12 cols):**
    * *Left Cell (6 cols):* Recent Mock Test History spotlight with scorecards and skill breakdown (L, R, W, S).
    * *Right Cell (6 cols):* Multi-Source Ingestion Spotlight highlighting feature benefits and direct ingestion CTA.
* **Footer:**
  * Mobile Bottom Navigation (`BottomNav.tsx`, visible on `< 768px`).

#### Main Components
* `NextActionBanner` — Dynamic recommendation rule engine pointing to the single highest-leverage action. (Shared)
* `SpeedDrillArenaModal` — Micro-challenge dialog launcher. (Local trigger, shared component)
* `DiagnosticPsychometricianModal` — 8-axis assessment modal. (Shared)

#### Primary Actions
1. Click "Chẩn Đoán 8 Trục Psychometrician" -> Opens `SCR-023`.
2. Click "Ôn tập X Thẻ Từ Vựng" -> Navigates to `SCR-004`.
3. Click "Khắc phục X Lỗi Sai" -> Opens `SCR-021`.
4. Click "Luyện Shadowing 15 Phút" -> Navigates to `SCR-008`.
5. Click Speed Drill pill buttons (Paraphrase / Jigsaw / Collocation) -> Opens `SCR-026`.
6. Click any of the 7 module tiles -> Switches `activeModule`.
7. Click "Nạp Nguồn Học Liệu Mới Ngay" -> Navigates to `SCR-002`.

#### Important UI States
* `SCR-001-A` — Populated state (default with initialized profile, streak, and mock records).
* `SCR-001-B` — Zero due tasks state (all SRS items reviewed).
* `SCR-001-mobile` — Single-column stacked Bento layout on 390px viewport.

#### Responsive Behavior
On desktop (>= 1024px), renders a rich 12-column Bento Grid. On tablet (768px-1023px), adjusts to 2-column stacking. On mobile (< 768px), stacks all Bento cells vertically into a streamlined scrollable feed with touch-friendly cards.

#### Current UX Observations
* **Observed:** The Dashboard contains multiple high-contrast action cards competing for primary attention simultaneously (Top Action Banner, Hero 8-Axis CTA, 3 Priority Task Cards, 3 Speed Drill Buttons, 7 Module Tiles, and Bottom Ingestion CTA).
* **Inference:** A first-time user may experience cognitive overload regarding where to begin their study session.

---

### SCR-002 — Source Ingestion & 4-Skill Package Builder

#### Location
* **Route:** `activeModule === 'sources'`
* **How user reaches it:** Sidebar click "Nguồn học liệu" (`nav-item-sources`), Dashboard module tile, or Next Action Banner CTA.
* **Parent product area:** Multi-Source Ingestion Engine
* **Previous likely screen:** `SCR-001`
* **Next likely screen(s):** `SCR-003` (AI Course Designer Modal), `SCR-004` (Vocabulary SRS), `SCR-011` (Practice).

#### User Goal
Upload or paste any external authentic study material (PDF documents, web URLs, YouTube links, Word files, or raw academic text), select a calibrated target IELTS band (5.5–8.0), and automatically generate a complete 4-skill lesson package (Reading, Listening, Speaking, Writing) and extracted C1/C2 vocabulary.

#### Layout Hierarchy
* **Page Header:**
  * Title: "Nguồn Học Liệu (Tạo Bài Học 4 Kỹ Năng)"
  * Top Action Bar: Button `🎓 AI Course Designer (Gói 4 Kỹ Năng)` + Ingestion Mode Switcher (`Nạp Nguồn Đơn` vs `Gộp Khoá Mini`).
* **Main Ingestion Area (Top Panel):**
  * *Single Mode:* Source Type Tabs (`Tải File PDF`, `Bài Báo / URL Web`, `Video YouTube`, `Word / Văn Bản Raw`), Source Title input, Band Target 6-button calibration selector (5.5 to 8.0), URL input with `Cào & Trích xuất` web scraping button, Raw Textarea, Custom instruction input, and Primary Submit button `Tạo Gói Bài Học 4 Kỹ Năng`.
  * *Batch Mode:* Batch Course title, target band dropdown, dynamic list of component source items with delete/add triggers, and batch synthesis button.
* **Bottom Workspace (Two-Column Grid):**
  * *Left Column (4 cols on lg):* Source Library list with search input, source type badges, and item count.
  * *Right Column (8 cols on lg):* Selected Source Detail Workspace with sub-view switcher tabs (`Gói Bài Học 4 Kỹ Năng`, `Từ Vựng C1/C2`, `Ngữ Pháp & Tóm Tắt`), and corresponding renderer (`LessonPackViewer`, Vocab Cards Grid, or Grammar Box).

#### Main Components
* `LessonPackViewer` — Rich 4-skill interactive package renderer displaying generated Reading text, Listening script/audio, Speaking cue card, and Writing prompt. (Reusable component)
* `SourceToLearningPackageModal` — Course designer dialog. (Shared modal)

#### Primary Actions
1. Switch Source Type tab (PDF / URL / YouTube / Docx) -> Updates input fields and sample templates.
2. Click "Cào & Trích xuất" -> Executes `fetchUrlContentApi` to fetch raw HTML and strip boilerplate.
3. Click "Tạo Gói Bài Học 4 Kỹ Năng" -> Executes `analyzeLearningSourceApi` and adds new source to library.
4. Click a source card in left library -> Populates right workspace.
5. Switch sub-views in right pane (Pack / Vocab / Grammar) -> Changes displayed learning artifacts.
6. Click "🎓 AI Course Designer" -> Opens `SCR-003`.

#### Important UI States
* `SCR-002-A` — Single Ingestion Form Active.
* `SCR-002-B` — Batch Multi-Source Mini-Course Builder Active.
* `SCR-002-C` — Active Source: 4-Skill Lesson Pack Viewer.
* `SCR-002-D` — Active Source: Extracted C1/C2 Vocabulary List.
* `SCR-002-E` — Active Source: Grammar Focus & Summary.
* `SCR-002-mobile` — Vertically stacked form and source details.

#### Responsive Behavior
Desktop splits library (4 cols) and detailed lesson pack (8 cols) side by side. Mobile stacks the ingestion form on top, followed by the source library list, and then the active source detail.

#### Current UX Observations
* **Observed:** The primary submit button `Tạo Gói Bài Học 4 Kỹ Năng` is conditionally disabled when the title is empty without explicit helper text explaining why it is inactive until title text is typed.
* **Inference:** Users pasting text directly into the textarea before typing a title may perceive the submit button as unresponsive.

---

### SCR-003 — AI Course Designer Modal

#### Location
* **Trigger:** Click button `🎓 AI Course Designer (Gói 4 Kỹ Năng)` in `SCR-002`.
* **Component:** `SourceToLearningPackageModal.tsx`
* **Parent product area:** Multi-Source Ingestion Engine

#### User Goal
Guide the user through an interactive multi-step configuration process to convert raw educational text into a tailored IELTS course module with custom band targets, vocabulary lists, and practice drills.

#### Layout Hierarchy
* Modal Backdrop with blur.
* Header: Title, AI Model Badge (`gemini-3.1-pro`), Subtitle, Close `(X)` button.
* Body: Step progression, raw text preview, band calibration slider/buttons, focus skill toggles.
* Footer: Cancel button and primary action "Tạo Lộ Trình Khóa Học".

#### Primary Actions
1. Adjust band target and focus parameters.
2. Click "Tạo Lộ Trình Khóa Học" -> Executes generation and saves new structured package.
3. Click Close -> Dismisses modal.

---

### SCR-004 — Vocabulary SRS Hub (Spaced Repetition)

#### Location
* **Route:** `activeModule === 'vocabulary'`
* **How user reaches it:** Sidebar "Từ vựng (SRS)" (`nav-item-vocabulary`), Dashboard priority card, or Next Action Banner.
* **Parent product area:** Vocabulary SRS & Lexical Lab
* **Previous likely screen:** `SCR-001` or `SCR-002`
* **Next likely screen(s):** `SCR-005` (Vocab Enricher), `SCR-001`, `SCR-011`.

#### User Goal
Review and master academic IELTS vocabulary using the FSRS-6 spaced repetition algorithm across 7 complementary learning modalities (Flashcards, Multiple Choice Quiz, Dictation, Context Gap-Fill, Voice Pronunciation, Lexicon Table Database, and Curated/Adaptive Topic Decks).

#### Layout Hierarchy
* **Top Header:**
  * Title: "Kho Từ Vựng & Thuật Toán SRS FSRS-6"
  * Subtitle explaining memory retention metrics.
  * Action controls: "AI Enricher" button, UK/US TTS Voice Switcher, and Speech Rate selector (0.75x - 1.25x).
* **FSRS Mastery & Retention Metrics Bar:**
  * 4 metric cards: Giai đoạn 0 (Mới nạp), Giai đoạn 1-2 (Đang nhớ), Giai đoạn 3-4 (Vững vàng), Giai đoạn 5 (Mastered), with retention percentage.
* **7-Study-Mode Tab Switcher:**
  * Flashcard (SRS) | Trắc Nghiệm 4 Lựa Chọn | Nghe Chép Chính Tả | Điền Từ Ngữ Cảnh | Luyện Phát Âm (Voice) | Kho Từ Vựng (Bảng) | Bộ Thẻ Theo Chủ Đề.
* **Filter & Search Toolstrip:**
  * Deck filter dropdown, CEFR level filter (All, B1, B2, C1, C2), Stage filter, Search input, Card counter.
* **Main Active Study Stage:**
  * *Flashcard Mode:* Interactive 3D flip card (Front: Word, IPA, POS, Audio TTS, Example sentence with hidden blank; Back: Definition Vietnamese/English, Collocations chips, Word Family, Nuance Note, FSRS Interval days for 4 rating buttons: Again, Hard, Good, Easy with keyboard shortcuts 1/2/3/4/Space).
  * *Quiz Mode:* Question card with 4 option buttons, score tracker, and streak flame.
  * *Dictation Mode:* Audio playback button, hidden spelling input, reveal hints button, and validation result.
  * *Context Mode:* Fill-in-the-blank sentence with 4 collocation options.
  * *Pronunciation Mode:* Speech recognition microphone recorder, waveform, phoneme accuracy evaluation score.
  * *Lexicon Table Mode:* Tabular list with inline search, sort, edit card modal trigger, delete trigger, CSV export, and printable sheet view.
  * *Curated Decks Mode:* Catalog of curated decks (Academic Word List, Environment, Economics) + 3-Tier Adaptive Topic Generator (Foundation, Upper-Int, Advanced).

#### Main Components
* `VocabEnricherModal` — Deep enrichment dialog. (Shared modal)
* FSRS-6 Scheduler (`srsScheduler.ts`) — Spaced repetition engine. (Service)

#### Primary Actions
1. Space key / Click Card -> Flips Flashcard.
2. Click SRS Rating (Again / Hard / Good / Easy) -> Computes next review date via FSRS-6 and advances queue.
3. Switch study mode tab -> Transforms study interface.
4. Click "Tạo Bộ Thẻ Theo Tầng" in Curated Decks -> Synthesizes new adaptive topic deck.
5. Click "AI Enricher" -> Opens `SCR-005`.

#### Important UI States
* `SCR-004-A` — Flashcard Study Mode.
* `SCR-004-B` — Multiple Choice Quiz Mode.
* `SCR-004-C` — Dictation Study Mode.
* `SCR-004-D` — Context Gap-Fill Mode.
* `SCR-004-E` — Pronunciation Speaking Drill Mode.
* `SCR-004-F` — Lexicon Database Manager (Table).
* `SCR-004-G` — Curated Decks & Adaptive Topic Generator.
* `SCR-004-mobile` — Mobile touch carousel flashcard layout.

#### Responsive Behavior
Desktop displays full filter toolbar, mastery metrics, and expansive card workspace. Mobile condenses metrics into a swipeable row and stacks study modes into a horizontal scroll strip.

#### Current UX Observations
* **Observed:** The Vocabulary module houses 7 completely different sub-applications under one screen ID, making the surface exceptionally feature-dense.
* **Inference:** Learners may not realize that switching tabs provides completely different study drills (e.g., Dictation vs Pronunciation) without an explicit onboarding guide.

---

### SCR-005 — AI Vocab Enricher Modal

#### Location
* **Trigger:** Click button `AI Enricher` in `SCR-004`.
* **Component:** `VocabEnricherModal.tsx`
* **Parent product area:** Vocabulary SRS & Lexical Lab

#### User Goal
Quickly enter a single English word or phrase to automatically retrieve verified IPA phonetics, parts of speech, CEFR classification, dual-language definitions, native collocations, word families, and IELTS Band 8.5 example sentences.

#### Layout Hierarchy
* Header: Icon, Title "AI Vocab Enricher & Academic Expander", Close button.
* Body: Word input field, Context hint input, Enrich CTA button, and generated card preview with editable fields.
* Footer: "Lưu vào Kho Từ Vựng SRS" button.

#### Primary Actions
1. Type word and click Enrich -> Calls AI API.
2. Review generated card attributes and click Save -> Adds card to `vocabCards` in `AppContext`.

---

### SCR-006 — Grammar Hub (Key Focus & Diagnostic)

#### Location
* **Route:** `activeModule === 'grammar'`
* **How user reaches it:** Sidebar "Ngữ pháp" (`nav-item-grammar`), Dashboard tile, or Next Action Banner.
* **Parent product area:** Grammar & Sentence Engineering
* **Previous likely screen:** `SCR-001`
* **Next likely screen(s):** `SCR-007`, `SCR-021` (Error Journal), `SCR-011` (Practice).

#### User Goal
Master advanced grammatical structures essential for Band 7.0–8.5+ (Inversion, Cleft Sentences, Participle Clauses, Conditionals, Nominalization, Modals) through structured rule explanations, common pitfalls, and AI-evaluated transformation exercises; or diagnose user-written essays for Grammatical Range and Accuracy (GRA).

#### Layout Hierarchy
* **Top Header:**
  * Title: "Ngữ Pháp Trọng Điểm IELTS (Grammar for Band 7.0 - 8.5+)"
  * Action button: `🎓 Thiết Kế Lộ Trình Ngữ Pháp`.
* **Tab Navigation:**
  * Tab 1: `Chương Trình Ngữ Pháp C1/C2 (Curriculum)`
  * Tab 2: `Bác Sĩ Chẩn Đoán & Sửa Lỗi (Diagnostician)`
* **Main Content Area (Curriculum Mode):**
  * *Left Column (4 cols on lg):* Filter buttons (Tất cả, Đề xuất ôn luyện, Band 6.0, Band 7.0, Band 8.0+), Search input, Topic list with mastery percent progress bar and linked mistake badge count.
  * *Right Column (8 cols on lg):*
    * Intuitive explanation card with formula box.
    * Common pitfalls warning box.
    * Interactive Practice Drill: Multiple-choice or sentence transformation input, submit button, instant AI evaluation feedback box with score, explanation, and band boost suggestions.
* **Main Content Area (Diagnostician Mode):**
  * Essay / paragraph input textarea, focus area selector, analyze button, and structured diagnostic report displaying GRA Band Estimate, sentence complexity ratio, error breakdown table, and 3-tier rewrite suggestions.

#### Main Components
* `GrammarCurriculumModal` — Custom curriculum designer modal. (Shared modal)

#### Primary Actions
1. Select topic from left list -> Populates topic rules and exercises.
2. Submit exercise answer -> Evaluates via AI; on success awards XP, on failure auto-logs mistake to `MistakeNotebookModal`.
3. Switch to "Bác Sĩ Chẩn Đoán" tab -> Opens essay diagnostic tool.
4. Click "Thiết Kế Lộ Trình" -> Opens `SCR-007`.

#### Important UI States
* `SCR-006-A` — Grammar Curriculum & Interactive Exercise Drill.
* `SCR-006-B` — AI Grammar Diagnostician Active.
* `SCR-006-mobile` — Mobile stacked topic list and exercise card.

#### Responsive Behavior
Desktop displays side-by-side topic selector and exercise workspace. Mobile collapses the topic list into a full-width selector with expand/collapse toggles.

#### Current UX Observations
* **Observed:** Errors made during grammar practice automatically create a `MistakeEntry` in the global Error Journal, which is a powerful integration, but there is minimal visual feedback indicating that this auto-logging occurred.

---

### SCR-007 — Grammar Curriculum Designer Modal

#### Location
* **Trigger:** Click button `🎓 Thiết Kế Lộ Trình Ngữ Pháp` in `SCR-006`.
* **Component:** `GrammarCurriculumModal.tsx`
* **Parent product area:** Grammar & Sentence Engineering

#### User Goal
Generate a custom-sequenced grammar study plan based on the user's specific target band and diagnostic weaknesses.

---

### SCR-008 — Media Lab (Shadowing & Dictation Studio)

#### Location
* **Route:** `activeModule === 'media'`
* **How user reaches it:** Sidebar "Media Lab" (`nav-item-media`), Dashboard priority card, or Next Action Banner.
* **Parent product area:** Media Lab — Shadowing & Dictation
* **Previous likely screen:** `SCR-001`
* **Next likely screen(s):** `SCR-009`, `SCR-010`, `SCR-004`.

#### User Goal
Improve English listening comprehension, connected speech, sentence intonation, and pronunciation rhythm using authentic YouTube video clips (BBC, TED, Cambridge) through synchronized Shadowing and Dictation studios.

#### Layout Hierarchy
* **Top Header:**
  * Title: "Media Lab: Shadowing & Nghe Chép Chính Tả (Dictation)"
  * Action buttons: `🎙️ AI Audio Transcription (media-transcribe-v1)` and `+ Nhập URL YouTube`.
* **Main Content Area (Two-Column Layout):**
  * *Left Column (4 cols on lg):* Video Session Playlist with thumbnail preview, title, topic tag, sentence count, search filter, and delete trigger.
  * *Right Column (8 cols on lg):*
    * Active session header with title, YouTube embed/player, and current sentence index.
    * Sub-navigation Tabs: `Shadowing Studio` | `Dictation (Chép chính tả)` | `Toàn Bộ Transcript` | `Từ Vựng Trọng Tâm`.
    * *Shadowing Studio:* Pitch waveform visualizer, line playback controls (loop, 0.75x, 1x), record microphone button, playback recorded user audio, and AI pronunciation evaluation score.
    * *Dictation Studio:* Audio segment player, blank typing input, diff comparison engine showing exact omissions and spelling errors.
    * *Transcript Editor:* Full sentence list with start/end time inputs, editable text, and Save Transcript button (`saveMediaTranscript`).
    * *Vocab Tab:* Key vocabulary list extracted from the video.

#### Main Components
* `ShadowingStudio` — Interactive audio recording & pitch sync component.
* `DictationStudio` — Audio loop & diffing component.
* `OriginalMediaPlayer` — YouTube video player wrapper.
* `YouTubeUrlInputModal` — Ingestion dialog.
* `AudioTranscribeModal` — Audio file transcription dialog.

#### Primary Actions
1. Select video from playlist -> Loads media player and transcript segments.
2. In Shadowing: Click Record -> Captures user speech -> Evaluates pronunciation.
3. In Dictation: Listen -> Type sentence -> Check accuracy.
4. In Transcript: Edit text or timestamp -> Click "Lưu Transcript".
5. Click "+ Nhập URL YouTube" -> Opens `SCR-009`.
6. Click "🎙️ AI Audio Transcription" -> Opens `SCR-010`.

#### Important UI States
* `SCR-008-A` — Shadowing Studio Active.
* `SCR-008-B` — Dictation Studio Active.
* `SCR-008-C` — Interactive Transcript Editor Active.
* `SCR-008-D` — Media Vocabulary Tab Active.
* `SCR-008-mobile` — Mobile stacked video player and touch recording studio.

---

### SCR-009 — YouTube URL Ingestion Modal

#### Location
* **Trigger:** Click button `+ Nhập URL YouTube` in `SCR-008`.
* **Component:** `YouTubeUrlInputModal.tsx`
* **Parent product area:** Media Lab

#### User Goal
Paste a YouTube video link, fetch its video title, thumbnail, and closed captions, and automatically convert it into a segmented Media Lab lesson.

---

### SCR-010 — AI Audio Transcription Modal

#### Location
* **Trigger:** Click button `🎙️ AI Audio Transcription (media-transcribe-v1)` in `SCR-008`.
* **Component:** `AudioTranscribeModal.tsx`
* **Parent product area:** Media Lab

#### User Goal
Upload local audio files (MP3/WAV/M4A) or record live speech to transcribe and generate structured Media Lab practice sessions.

---

### SCR-011 — IELTS Practice Hub & Forecast Live

#### Location
* **Route:** `activeModule === 'practice'`
* **How user reaches it:** Sidebar "Luyện tập IELTS" (`nav-item-practice`), Dashboard tile, or Next Action Banner.
* **Parent product area:** IELTS Practice & Real Exam Forecast
* **Previous likely screen:** `SCR-001`, `SCR-002`, `SCR-006`
* **Next likely screen(s):** `SCR-012`, `SCR-013`, `SCR-014`, `SCR-025`, `SCR-028`, `SCR-015`.

#### User Goal
Practice specific IELTS skills (Reading, Listening, Writing, Speaking) on authentic exam questions, utilize real-time 2026 forecast exam topics with Google Search Grounding, and receive granular AI evaluation against official Cambridge assessment criteria.

#### Layout Hierarchy
* **Top Header:**
  * Title: "Luyện Tập IELTS & Kho Đề Thi Thật Forecast"
  * Action buttons: `⚖️ Giám Khảo Chấm 4 Tiêu Chí (full-grader-v1)`, `🎯 Cambridge Item Writer (Sinh Đề)`, and `Chiến thuật bẻ bẫy`.
* **5-Tab Navigation Bar:**
  * Tab 1: `🔥 Forecast Live Hub (Đề thi thật IDP & BC 2026 - Grounding Live)`
  * Tab 2: `IELTS Reading (6 dạng câu hỏi học thuật)`
  * Tab 3: `IELTS Listening (4 dạng bài kèm audio & bản đồ)`
  * Tab 4: `IELTS Writing (Task 1, 2 & Band Upgrader)`
  * Tab 5: `IELTS Speaking (Part 1, 2, 3 & Voice Examiner)`
* **Active Tab Content:**
  * *Forecast Live Hub:* Search grounding refresh controls, quota indicator, category filter (All, Writing Task 2, Speaking Part 2, Reading), forecast question cards with Grounding source citations, and direct `Luyện Đề Này` action buttons.
  * *Reading Module:* Passage pane, question pane (TFNG, Headings, Matching), answer checking, and Question Trap diagnostic button (`SCR-014`).
  * *Listening Module:* Audio player, section questions, answer checking.
  * *Writing Module:* Prompt statement, task description, live word count textarea, timer, AI 4-criteria grading report, Academic Sentence Stylist modal trigger (`SCR-025`), and Master Mentor Panel modal trigger (`SCR-028`).
  * *Speaking Module & Voice Examiner Room:* VoicePicker (accent selection), Part 1/2/3 cue cards, 1-minute prep countdown timer, microphone audio recording, and live multi-criterion report.

#### Main Components
* `ForecastLiveHub` — Live search grounding real-exam forecast hub.
* `ReadingQuestionModule`, `ListeningQuestionModule`, `WritingQuestionModule`, `SpeakingQuestionModule`.
* `ItemWriterPracticeModal` (`SCR-012`), `FullGraderModal` (`SCR-013`), `QuestionTrapDiagnosticModal` (`SCR-014`).
* `SentenceAcademicStylistModal` (`SCR-025`), `MasterMentorPanelModal` (`SCR-028`).

#### Important UI States
* `SCR-011-A` — Forecast Live Hub Active.
* `SCR-011-B` — Reading Practice Module Active.
* `SCR-011-C` — Listening Practice Module Active.
* `SCR-011-D` — Writing Practice Module Active.
* `SCR-011-E` — Speaking Practice Module Active.
* `SCR-011-mobile` — Mobile practice layout with scrollable tabs.

---

### SCR-012 — Cambridge Item Writer Modal (AI Question Generator)

#### Location
* **Trigger:** Click button `🎯 Cambridge Item Writer (Sinh Đề)` in `SCR-011`.
* **Component:** `ItemWriterPracticeModal.tsx`
* **Parent product area:** IELTS Practice & Real Exam Forecast

#### User Goal
Generate authentic Cambridge-standard IELTS practice items with distractor rationale, reading passages, or writing prompts from user-provided topics or raw texts.

---

### SCR-013 — Full 4-Criteria Standalone Grader Modal

#### Location
* **Trigger:** Click button `⚖️ Giám Khảo Chấm 4 Tiêu Chí (full-grader-v1)` in `SCR-011`.
* **Component:** `FullGraderModal.tsx`
* **Parent product area:** IELTS Practice & Real Exam Forecast

#### User Goal
Paste any essay or speaking transcript into a dedicated grading workbench to receive an exhaustive assessment with individual scores for Task Response (TR), Coherence & Cohesion (CC), Lexical Resource (LR), and Grammatical Range & Accuracy (GRA).

---

### SCR-014 — Question Trap Diagnostic Modal

#### Location
* **Trigger:** Click "Phân tích bẫy đề" in Reading or Listening practice modules in `SCR-011`.
* **Component:** `QuestionTrapDiagnosticModal.tsx`
* **Parent product area:** IELTS Practice & Real Exam Forecast

#### User Goal
Deconstruct the deceptive traps, distractor phrasing, and True/False/Not Given logic of a specific question to understand why incorrect options are seductive.

---

### SCR-015 — Mock Test Hub (Catalog, Progress & History)

#### Location
* **Route:** `activeModule === 'mock_test'`
* **How user reaches it:** Sidebar "Thi thử IELTS" (`nav-item-mock_test`), Dashboard recent mock link, or Next Action Banner.
* **Parent product area:** Mock Exam Simulation & Assessment
* **Previous likely screen:** `SCR-001`, `SCR-011`
* **Next likely screen(s):** `SCR-016` (Fullscreen Exam Simulation), `SCR-017` (Scorecard Report), `SCR-018` (Mock Orchestrator).

#### User Goal
Browse authentic full and mini IELTS test packages (Cambridge 19, IDP Recent Actual Tests 2026), start or resume an examination under timed conditions, view historical test scorecards, and track progress over time.

#### Layout Hierarchy
* **Top Header:**
  * Title: "Phòng Thi Thử IELTS-style (Full Mock Exam)"
  * Action button: `Tạo Đề Thi Thử Tuỳ Chỉnh` (`SCR-018`).
* **Tab Navigation:**
  * Tab 1: `Đề Thi Có Sẵn (Available)`
  * Tab 2: `Forecast Live Hub`
  * Tab 3: `Biểu Đồ Tiến Bộ (Progress Chart)`
  * Tab 4: `Lịch Sử Thi & Bảng Điểm (History)`
* **Active Tab Content:**
  * *Available Tests:* Cards for Cambridge 19 Test 1, IDP 2026 Forecast Mock, Mini Mock Test, showing total duration, skill list, and primary `Bắt Đầu Làm Bài` CTA. If a test is in progress, displays a prominent `Tiếp Tục Làm Bài (Resume Exam)` banner with saved progress indicator.
  * *Progress Chart:* Recharts line/bar visualization tracking Overall, Listening, Reading, Writing, and Speaking band trajectories across completed mock attempts.
  * *History:* Chronological list of completed mock exams with band badges, completion date, and `Xem Bảng Điểm Chi Tiết` CTA linking to `SCR-017`.

#### Primary Actions
1. Click "Bắt Đầu Làm Bài" on a test package -> Enters Fullscreen Exam Mode (`SCR-016`).
2. Click "Tiếp Tục Làm Bài" -> Resumes active exam from `localStorage` snapshot.
3. Click "Xem Bảng Điểm Chi Tiết" in History -> Opens `SCR-017`.
4. Click "Tạo Đề Thi Thử Tuỳ Chỉnh" -> Opens `SCR-018`.

#### Important UI States
* `SCR-015-A` — Available Tests Catalog Active.
* `SCR-015-C` — Mock Progress Chart Active.
* `SCR-015-D` — Mock Test History Active.
* `SCR-015-mobile` — Mobile mock test catalog.

---

### SCR-016 — Fullscreen Exam Simulation Mode

#### Location
* **Trigger:** Click "Bắt Đầu Làm Bài" or "Tiếp Tục Làm Bài" in `SCR-015`.
* **State Trigger:** `isExamModeActive === true && activeModule === 'mock_test'`
* **Parent product area:** Mock Exam Simulation & Assessment

#### User Goal
Take an authentic computer-delivered IELTS exam in a distraction-free environment that strictly replicates official exam layouts, timing countdowns, question palettes, and review flagging.

#### Layout Hierarchy
* **Exam Header (`ExamHeader.tsx`):**
  * Test Title, Active Skill badge, Remaining Timer countdown with pause control, Text Resizer (`Normal`, `Large`, `Extra Large`), Color Scheme Selector (`Standard`, `High Contrast Black`, `Soft Yellow`), Exit Exam trigger.
* **Exam Viewport (Dynamic per Skill):**
  * *Listening (`ListeningExamView`):* Audio player controls, section question cards with input fields and radio choices.
  * *Reading (`ReadingExamView`):* Split screen (Left: Passage with text selection highlighter; Right: Questions 1–40 with interactive inputs).
  * *Writing (`WritingExamView`):* Split screen (Task 1 & Task 2 prompts on left, live word count textarea on right).
  * *Speaking (`SpeakingExamView`):* Part 1/2/3 prompt cards, 1m prep timer, microphone recorder.
* **Exam Footer Navigation (`ExamFooterNav.tsx`):**
  * Section tabs (Section 1–4 or Passage 1–3), 40-question clickable palette (color-coded for answered/unanswered), "Flag for review" checkbox, Next/Previous question buttons, and "Chuyển Sang Kỹ Năng Tiếp Theo / Nộp Bài" submit button.

#### Primary Actions
1. Navigate between questions via the bottom question palette.
2. Flag/unflag questions for review.
3. Advance to the next skill section or submit for final evaluation.
4. Exit exam -> Returns to `SCR-015` with auto-saved attempt state.

#### Important UI States
* `SCR-016-A` — Listening Section Exam Mode.
* `SCR-016-B` — Reading Section Exam Mode.
* `SCR-016-C` — Writing Section Exam Mode.
* `SCR-016-D` — Speaking Section Exam Mode.

---

### SCR-017 — Mock Test Comprehensive Scorecard / Report

#### Location
* **Trigger:** Completing an exam simulation or clicking "Xem Bảng Điểm Chi Tiết" in Mock Test History.
* **Component:** `MockTestReportView.tsx`
* **Parent product area:** Mock Exam Simulation & Assessment

#### User Goal
Review an in-depth diagnostic scorecard of a completed mock exam, including overall band score (0–9), individual skill scores (L, R, W, S), radar competency visualization, detailed sub-criterion breakdowns (TR, CC, LR, GRA, Pronunciation, Fluency), and prioritized improvement recommendations.

---

### SCR-018 — Mock Test Orchestrator & Custom Builder Modal

#### Location
* **Trigger:** Click button `Tạo Đề Thi Thử Tuỳ Chỉnh` in `SCR-015`.
* **Component:** `MockOrchestratorModal.tsx`
* **Parent product area:** Mock Exam Simulation & Assessment

#### User Goal
Assemble custom mock tests by selecting specific reading passages, listening audio sections, writing prompts, and speaking cue cards.

---

### SCR-019 — IELTS Masterclass & Knowledge Base

#### Location
* **Route:** `activeModule === 'knowledge'`
* **How user reaches it:** Sidebar "Kiến thức IELTS" (`nav-item-knowledge`), Dashboard tile, or Next Action Banner.
* **Parent product area:** IELTS Masterclass & Knowledge Base
* **Previous likely screen:** `SCR-001`
* **Next likely screen(s):** `SCR-011` (Practice), `SCR-004` (Vocabulary).

#### User Goal
Study proven exam methodologies and cognitive test-taking frameworks (PEEL structure, PPF formula), inspect color-coded Band 8.5+ model essays with AI commentary on scoring criteria, learn common traps, and calculate overall IELTS band scores.

#### Layout Hierarchy
* **Top Header:**
  * Title: "Học Kiến Thức & Chiến Thuật Làm Bài IELTS"
  * Action button: `Tư Vấn Chiến Thuật Với AI`.
* **4-Tab Navigation Bar:**
  * Tab 1: `Chiến Thuật Từng Dạng Bài & Quiz Ứng Dụng (Strategies)`
  * Tab 2: `Bài Mẫu Band 8.5+ Có Chú Thích AI (Model Answers)`
  * Tab 3: `Sổ Tay Bẫy & Lỗi Phổ Biến (Pitfalls)`
  * Tab 4: `Tổng Quan Kỳ Thi & Máy Tính Điểm (Calculator)`
* **Active Tab Content:**
  * *Strategies (`StrategyLessonViewer`):* Strategy catalog (PEEL Writing, PPF Speaking, Skimming & Scanning, TFNG Method), lesson content, and interactive strategy application quiz with AI evaluator.
  * *Model Answers (`AnnotatedModelAnswerViewer`):* Band 8.5+ essays and speaking transcripts with interactive filterable highlights for Task Response (TR), Coherence & Cohesion (CC), Lexical Resource (LR), and Grammatical Range (GRA).
  * *Pitfalls (`CommonPitfallsViewer`):* Catalog of common traps and examiner warnings across 4 skills.
  * *Calculator (`OverviewBandCalculator`):* Interactive score calculator converting raw listening/reading scores (out of 40) and skill bands into official overall IELTS band scores with rounding rules.

#### Important UI States
* `SCR-019-A` — Strategy Lessons & Interactive Quizzes.
* `SCR-019-B` — Annotated Band 8.5+ Model Answers.
* `SCR-019-C` — Common Pitfalls & Trap Catalog.
* `SCR-019-D` — Official Band Score Calculator.
* `SCR-019-mobile` — Mobile knowledge masterclass layout.

---

### SCR-020 — Learner Profile & Data/API Settings

#### Location
* **Route:** `activeModule === 'profile'`
* **How user reaches it:** Sidebar profile link (`sidebar-profile-link`), Header profile button (`profile-nav-btn`), or Next Action Banner.
* **Parent product area:** Learner Profile, Authentication & API Settings

#### User Goal
Manage personal study goals (name, current band, target band, official exam date, daily study target), configure Google OAuth and Supabase private data synchronization, input BYOK API keys (Gemini, Groq), check API Gateway pool health, and toggle theme settings.

#### Layout Hierarchy
* **Top Profile Header Card:**
  * Avatar / Initials, Name, Level badge (`Lv.X Thí Sinh IELTS`), Target Band goal, Exam countdown date, and Action Buttons: `Chẩn Đoán 8 Trục (gemini-3.1-pro)`, `Test Nhanh`, `Chỉnh Sửa / Đóng Chỉnh Sửa`.
* **Two-Column Configuration Grid:**
  * *Section 1 (Left):* Google OAuth & Supabase Private Cloud Sync (Status, email display, sync now button, sign in / sign out triggers).
  * *Section 2 (Right):* AI Provider BYOK Settings (Gemini API key input with session-only memory, Groq API key input for Search Grounding fallback).
  * *Section 3 (Full-width 2 cols):* API Gateway Pool Health & Capabilities (Live gateway health indicator, Quota status note, model aliases).
  * *Section 4 (Left):* Study Preferences & Goals Form (Name, target band slider, current band, exam date picker, daily study minutes).
  * *Section 5 (Right):* Appearance & Theme (Dark/Light mode switch).

#### Primary Actions
1. Edit profile attributes and click "Lưu Thay Đổi" -> Updates `UserProfile` state and `localStorage`.
2. Click "Đồng bộ ngay" -> Executes `syncPrivateSnapshot` to Supabase.
3. Save Gemini / Groq API key -> Persists in `sessionStorage`.
4. Click "Chẩn Đoán 8 Trục" -> Opens `SCR-023`.
5. Click "Test Nhanh" -> Opens `SCR-024`.

#### Important UI States
* `SCR-020-A` — Profile Overview & Settings Active.
* `SCR-020-mobile` — Mobile Profile Settings layout.

---

### SCR-021 — Unified Error Journal Modal (Sổ Tay Bẫy & Lỗi Sai)

#### Location
* **Trigger:** Click button "Error Journal" / AlertTriangle (`header-mistakes-btn`) in Header or Dashboard task card.
* **Component:** `MistakeNotebookModal.tsx`
* **Parent product area:** Unified Mistake Diagnostics & Onboarding

#### User Goal
Access a consolidated personal mistake journal that automatically aggregates all errors from reading, listening, writing, speaking, and grammar; categorizes them into 8 official trap archetypes; and schedules targeted remediation workouts using FSRS-6 spaced repetition.

#### Layout Hierarchy
* **Header Banner:** Title "Sổ Tay Bẫy & Lỗi Sai Cá Nhân Hóa (AI Smart Mistake Vault)", mistake count badge, subtitle, `AI Error Tagger` button (`SCR-022`), and Close `(X)` button.
* **4-Tab Navigation Bar:**
  * Tab 1: `Bản Đồ Điểm Yếu & Bẫy (Radar) (Analytics)`
  * Tab 2: `Daily Mistake Workout (Workout)` with due count badge
  * Tab 3: `Kho Lỗi Đã Lưu (Vault)`
  * Tab 4: `Thêm Lỗi Thủ Công (Add)`
* **Active Tab Content:**
  * *Analytics (`MistakeAnalyticsView`):* 8-category trap breakdown cards, Radar vulnerability map, and "Bắt Đầu Ôn Bẫy Này" triggers.
  * *Daily Workout (`DailyMistakeWorkoutView`):* Interactive flashcard/quiz workout presenting user error, user attempt, corrected answer, examiner tip, and SRS rating buttons.
  * *Vault:* Filter bar (Trap category, Skill, Error category, Search input), and cards displaying error text, corrected text, explanation, and audio pronunciation.
  * *Add Form:* Manual error input form with trap category dropdown and skill selectors.

#### Important UI States
* `SCR-021-A` — Mistake Analytics Dashboard Active.
* `SCR-021-B` — Daily Mistake Workout Active.
* `SCR-021-C` — Mistake Vault List Active.
* `SCR-021-D` — Add Custom Mistake Form Active.

---

### SCR-022 — Intelligent Error Tagger Modal

#### Location
* **Trigger:** Click button `🏷️ AI Error Tagger` in `SCR-021`.
* **Component:** `IntelligentErrorTaggerModal.tsx`
* **Parent product area:** Unified Mistake Diagnostics & Onboarding

#### User Goal
Paste unformatted text, essays, or speaking transcripts to automatically detect, classify, and extract linguistic errors into structured mistake cards with high-yield collocations and auto-generate SRS cards.

---

### SCR-023 — Diagnostic Psychometrician 8-Axis Modal

#### Location
* **Trigger:** Click button `Chẩn Đoán 8 Trục Psychometrician (gemini-3.1-pro)` in Dashboard (`SCR-001`) or Profile (`SCR-020`).
* **Component:** `DiagnosticPsychometricianModal.tsx`
* **Parent product area:** Unified Mistake Diagnostics & Onboarding

#### User Goal
Undergo an extensive multi-skill psychometric assessment evaluated across 8 cognitive axes:
1. **TR** — Task Response
2. **CC** — Coherence & Cohesion
3. **LR** — Lexical Resource
4. **GRA** — Grammatical Range & Accuracy
5. **PF** — Pronunciation & Fluency
6. **RDF** — Reading Distractor Filter
7. **LC** — Listening Comprehension
8. **CH** — Critical Hedging

#### Layout Hierarchy
* Header: Title, `gemini-3.1-pro` badge, Subtitle, Close button.
* Stage 1 (Input Collection): Skill selector tabs (Writing sample textarea, Speaking audio recorder/uploader, Reading diagnostic answers, Listening diagnostic answers), and Submit button.
* Stage 2 (Assessment Report): Recharts Radar Chart mapping 8 axes (0.0–9.0), detailed breakdown cards for each axis with identified strengths/weaknesses, estimated Overall Band, and a tailored 30-day intervention curriculum.

---

### SCR-024 — Onboarding & Quick Placement Wizard Modal

#### Location
* **Trigger:** Click button `Test chẩn đoán` in Header (`header-diagnostic-btn`), or initial application setup.
* **Component:** `OnboardingModal.tsx`
* **Parent product area:** Unified Mistake Diagnostics & Onboarding

#### User Goal
Complete a streamlined 4-step initial onboarding wizard to establish baseline band estimates and configure a personalized study path:
* **Step 1:** Target Band Goal, Exam Countdown (months), Daily Study Commitment (minutes).
* **Step 2:** Quick Listening Diagnostic Test (audio playback + 2 fill-in-the-blank questions).
* **Step 3:** Quick Reading Diagnostic Test (academic passage + 2 context questions).
* **Step 4:** Diagnostic Outcome & Personalized 7-Module AI Roadmap.

---

### SCR-025 — 3-Tier Academic Sentence Stylist Modal

#### Location
* **Trigger:** Click button `Nâng Cấp Câu` in Writing Practice (`SCR-011-D`) or `openSentenceStylist` from AppContext.
* **Component:** `SentenceAcademicStylistModal.tsx`
* **Parent product area:** IELTS Practice & Real Exam Forecast

#### User Goal
Take an informal or intermediate sentence and elevate it through 3 progressive academic tiers:
* **Tier 1 (Band 6.5 Competent):** Clear, grammatically sound, standard academic phrasing.
* **Tier 2 (Band 7.5 Advanced):** Complex sentence structures (Inversion / Clefting), precise collocations.
* **Tier 3 (Band 8.5 Master Stylist):** Sophisticated critical hedging, nominalization, nuanced academic rhetoric.

---

### SCR-026 — 60-Second Speed Drill Arena Modal

#### Location
* **Trigger:** Click Speed Drill buttons (`Paraphrase`, `Jigsaw`, `Collocation`) in Dashboard (`SCR-001`).
* **Component:** `SpeedDrillArenaModal.tsx`
* **Parent product area:** Dashboard & Habit Hub

#### User Goal
Complete high-intensity 60-second micro-challenges under time pressure to build rapid lexical fluency and automated syntactic reflex for the IELTS exam:
* **Paraphrase Blitz:** Rapidly rewrite academic statements using higher-tier synonyms.
* **Cohesive Jigsaw:** Insert appropriate discourse markers and transitional adverbs into a scrambled paragraph.
* **Collocation Match:** Match academic verbs/adjectives with their natural noun partners.

---

### SCR-027 — Contextual Floating AI Tutor Drawer

#### Location
* **Trigger:** Persistent floating button `Hỏi AI Tutor` in bottom-right corner across all screens.
* **Component:** `FloatingAITutor.tsx`
* **Parent product area:** Global Utility & Scaffolding

#### User Goal
Provide persistent, context-aware AI tutoring that automatically senses the user's active module, offering relevant quick-prompt chips, real-time Search Grounding with web citations, text-to-speech pronunciation, and target band calibration.

#### Layout Hierarchy
* Floating trigger button with target band pill and pulsating status badge.
* Chat Drawer / Window:
  * Top bar: Tutor title, Active context indicator (e.g., `Ngữ cảnh: Luyện tập 4 Kỹ năng`), expand/minimize button, close button.
  * Contextual pill bar: Target Band adaptation info.
  * Message thread: Conversational bubbles with role avatars, TTS audio playback button, follow-up suggestion chips, and expandible citations box with source links.
  * Quick-prompt horizontal chips bar tailored to the active module.
  * Bottom input form: Research Mode (Google Search Grounding) toggle button, text input, and send button.

---

### SCR-028 — Master Mentor Panel Modal

#### Location
* **Trigger:** Click button `Hội Đồng Cố Vấn` in Writing Practice (`SCR-011-D`).
* **Component:** `MasterMentorPanelModal.tsx`
* **Parent product area:** IELTS Practice & Real Exam Forecast

#### User Goal
Consult an elite advisory council of AI examiner personas (Dr. Vance — Ex-Examiner & Rhetoric Specialist) to diagnose subtle argumentative flaws, overgeneralizations, and lexical unnaturalness in student essays.

---

## 3. Global Application Shell Audit

### 3.1 Shared Global Elements
* **Top Header (`Header.tsx`):**
  * Present globally on all views except during Fullscreen Exam Simulation (`SCR-016`).
  * Contains brand logo, goal countdown pill, quick placement diagnostic trigger, Error Journal badge with live due counter, streak counter, XP/Level progress, dark/light theme switch, and user profile avatar button.
* **Left Desktop Sidebar (`Sidebar.tsx`):**
  * Present globally on viewports `>= 768px` except during `SCR-016`.
  * Displays 7 learning modules + Dashboard with dynamic badge counts (`sources`, `vocabulary` due SRS).
  * Bottom footer contains quick AI Tutor trigger and Profile link.
* **Mobile Bottom Navigation (`BottomNav.tsx`):**
  * Present globally on viewports `< 768px` except during `SCR-016`.
  * Displays 8 navigation icons with notification badges.
* **Next Action Banner (`NextActionBanner.tsx`):**
  * Mounted at the top of the main viewport across all modules.
  * Computes rule-based contextual recommendations for the learner.
* **Floating AI Tutor (`FloatingAITutor.tsx`):**
  * Fixed at the bottom-right corner of the screen across all modules.
* **Global Toast Notifications (`AppNotification.tsx`):**
  * Dispatched globally for XP awards, streak milestones, and system alerts.

### 3.2 Fullscreen Exam State Overrides
When `isExamModeActive && activeModule === 'mock_test'`, the entire standard application shell (Header, Sidebar, BottomNav, NextActionBanner, FloatingAITutor) is completely unmounted, and replaced by:
* `ExamHeader.tsx` (Countdown timer, text resizer, high-contrast theme, exit button).
* Active Exam Viewport (`ListeningExamView`, `ReadingExamView`, `WritingExamView`, `SpeakingExamView`).
* `ExamFooterNav.tsx` (Section tabs, 40-question palette, review flag checkbox, submit button).

---

## 4. Product Area Summary

| Product Area | Screens Count | Primary Entry Point | Core User Flow | Major Subflows | Apparent Overlap / UX Friction |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **Dashboard & Habits** | 2 | App root (`/`) | Review daily goals -> Complete due SRS items -> Execute Speed Drill | Speed Drill micro-challenges | High visual density with multiple competing calls to action on first load |
| **Multi-Source Ingestion** | 2 | Sidebar `Nguồn học liệu` | Upload PDF/URL -> Calibrate Band -> Generate 4-skill pack | Batch Mini-Course synthesis, AI Course Designer | Overlaps conceptually with Practice Module (both generate skill practice items) |
| **Vocabulary SRS** | 2 | Sidebar `Từ vựng (SRS)` | Review due cards via FSRS-6 -> Rate recall -> Complete queue | 7 study modes (Quiz, Dictation, Voice, Context, Decks), AI Enricher | Houses 7 distinct study modalities within a single module screen |
| **Grammar & Sentences** | 2 | Sidebar `Ngữ pháp` | Select grammar topic -> Study formulas & pitfalls -> Submit exercise | AI Essay Diagnostician, Curriculum Designer | Exercise errors auto-logged to Error Journal without obvious feedback toast |
| **Media Lab** | 3 | Sidebar `Media Lab` | Select YouTube video -> Practice line Shadowing -> Check pronunciation | Dictation studio, Transcript timestamp editing, Audio transcription | Shadowing and Dictation studios share video assets but have separate evaluation flows |
| **IELTS Practice & Forecast** | 6 | Sidebar `Luyện tập IELTS` | Search 2026 Forecast questions -> Select skill -> Submit for 4-criteria grading | Cambridge Item Writer, Full Grader, Sentence Stylist, Mentor Panel | High modal complexity; multiple standalone grading tools (Full Grader vs Mentor Panel) |
| **Mock Exam Simulation** | 4 | Sidebar `Thi thử IELTS` | Select exam package -> Enter fullscreen simulation -> Receive score report | Custom Mock Orchestrator, History review | Forecast Live Hub is duplicated as a tab inside both Practice and Mock Test |
| **Knowledge & Masterclass** | 1 | Sidebar `Kiến thức IELTS` | Read strategy lesson -> Take application quiz -> Inspect Band 8.5+ model | Band Calculator, Common Pitfalls | Static masterclass content with interactive quiz overlays |
| **Profile & Settings** | 1 | Header Profile avatar | Update target band and exam date -> Sync data via Google/Supabase | BYOK API keys, Gateway health check | API key settings and profile preferences share a single page |
| **Unified Diagnostics** | 4 | Header Error Journal / Diagnostic | Open Error Journal -> Review 8 trap categories -> Execute Daily Workout | Intelligent Error Tagger, 8-Axis Psychometrician, 4-Step Onboarding | Two separate diagnostic tools (Quick Placement Wizard vs 8-Axis Psychometrician) |

---

## 5. User Flows

### Flow 1: Daily Spaced Repetition & Weakness Remediation Flow
* **Sequence:** `SCR-001` (Dashboard) ➔ `SCR-004` (Vocabulary SRS Flashcard Mode) ➔ Rate Cards (Again/Hard/Good/Easy) ➔ `SCR-021` (Error Journal Modal) ➔ `SCR-021-B` (Daily Mistake Workout) ➔ Complete Workout ➔ `SCR-001` (Dashboard Streak & XP updated).
* **Cross-system impact:** FSRS scheduler recalculates memory stability and next review dates; XP rewards dispatched.

### Flow 2: Multi-Source Content Ingestion to 4-Skill Practice Flow
* **Sequence:** `SCR-001` (Dashboard) ➔ `SCR-002` (Source Ingestion) ➔ Select URL tab & enter link ➔ Click `Cào & Trích xuất` ➔ Set Band 7.5 ➔ Click `Tạo Gói Bài Học 4 Kỹ Năng` ➔ `SCR-002-C` (Lesson Pack Viewer) ➔ Auto-syncs C1/C2 words to `SCR-004` ➔ Practice Reading/Writing passage.

### Flow 3: Real Exam Forecast Sourcing to Single-Skill Practice Flow
* **Sequence:** `SCR-001` (Dashboard) ➔ `SCR-011` (Practice Hub) ➔ `SCR-011-A` (Forecast Live Hub) ➔ Trigger Google Search Grounding refresh ➔ Filter by "Writing Task 2" ➔ Click `Luyện Đề Này` ➔ Transitions to `SCR-011-D` (Writing Practice Module) with pre-filled prompt ➔ User writes essay ➔ Click `Nâng Cấp Câu` (`SCR-025`) or `Hội Đồng Cố Vấn` (`SCR-028`) ➔ Submit for 4-criteria AI evaluation ➔ Auto-logs grammatical mistakes to `SCR-021`.

### Flow 4: Full Computer-Delivered Mock Exam Simulation Flow
* **Sequence:** `SCR-001` (Dashboard) ➔ `SCR-015` (Mock Test Hub) ➔ Select Cambridge 19 Test 1 ➔ Click `Bắt Đầu Làm Bài` ➔ Shell switches to Fullscreen Exam Mode (`SCR-016`) ➔ `SCR-016-A` (Listening Section) ➔ `SCR-016-B` (Reading Section) ➔ `SCR-016-C` (Writing Section) ➔ `SCR-016-D` (Speaking Section) ➔ Submit Exam ➔ AI Multi-Stage Evaluation ➔ `SCR-017` (Comprehensive Scorecard Report) ➔ Save attempt to History.

### Flow 5: Diagnostic Psychometrician Assessment Flow
* **Sequence:** `SCR-001` (Dashboard) or `SCR-020` (Profile) ➔ Click `Chẩn Đoán 8 Trục (gemini-3.1-pro)` ➔ Opens `SCR-023` ➔ Submit Writing essay sample and record Speaking audio ➔ Click `Tiến Hành Chẩn Đoán` ➔ Evaluates 8 cognitive axes (TR, CC, LR, GRA, PF, RDF, LC, CH) ➔ View 8-Axis Radar Chart and 30-Day Intervention Roadmap.

---

## 6. Current UX Observations & Heuristic Audit

### 6.1 Directly Observed Usability & IA Issues
1. **Multiple Competing Diagnostic Tools:**
   * *Observed:* The user is presented with two separate diagnostic tools with distinct names and scopes: `SCR-024` ("Test chẩn đoán / Onboarding Wizard" in Header) and `SCR-023` ("Chẩn Đoán 8 Trục Psychometrician" in Dashboard/Profile).
   * *Inference:* Users may be confused about which test represents their true baseline score or why two diagnostic mechanisms exist.
2. **Duplicated Forecast Live Surfaces:**
   * *Observed:* `ForecastLiveHub` is embedded in both `SCR-011` (IELTS Practice) and `SCR-015` (Mock Test Hub).
   * *Inference:* While convenient, having the identical live-hub interface mounted in two primary modules causes redundant product taxonomy.
3. **High Feature Density in Vocabulary SRS:**
   * *Observed:* `SCR-004` contains 7 major sub-modalities (Flashcard, Quiz, Dictation, Context, Pronunciation, Lexicon Table, Curated Decks) plus an AI Enricher modal within a single view.
   * *Inference:* Learners may treat the page solely as a flashcard viewer and overlook the pronunciation, dictation, and lexicon features.
4. **Standalone vs In-Module Grading Overlap:**
   * *Observed:* The user can grade writing/speaking inside the Practice module (`SCR-011-D/E`), through the Standalone Full Grader modal (`SCR-013`), through the Master Mentor Panel modal (`SCR-028`), or through the Sentence Stylist (`SCR-025`).
   * *Inference:* The relationship between these four grading/improving surfaces is not hierarchically clear.
5. **Modal Stacking Complexity:**
   * *Observed:* Opening `MistakeNotebookModal` (`SCR-021`) and then clicking `AI Error Tagger` (`SCR-022`) creates a modal stacked on top of another modal backdrop.

---

## 7. Current Product UI Summary

* **Total Primary Screens (Discovered & Cataloged):** 28 screens / standalone surfaces (`SCR-001` to `SCR-028`).
* **Total Meaningful Secondary States:** 56 distinct states captured in screenshot inventory.
* **Total Product Areas:** 10 functional product areas.
* **Major Navigation Model:** Single-Page Application (SPA) driven by `activeModule` state dispatcher with a dual-shell toggle (Standard Responsive Shell vs Fullscreen Exam Simulation Shell).
* **Screens with Unusually High UI Density:** `SCR-001` (Dashboard Bento Grid), `SCR-004` (Vocabulary SRS with 7 modalities), `SCR-011` (Practice Hub with 5 skill sub-views and 4 modal triggers).
* **Potential Duplicated Surfaces:** `ForecastLiveHub` in Practice vs Mock Test; Full Grader Modal vs In-module Writing Grader vs Master Mentor Panel.
* **Dead Ends / Navigation Gaps:** None identified; all controls map to declared UX flow contracts with back buttons or dismiss triggers.
* **Unverified Areas:** None. 100% of discovered screens, tabs, and modals have been verified on rendered browser instances.

---

## 8. Files Generated

The following artifacts have been created in the workspace:

1. [`docs/ux/CURRENT_SCREEN_INVENTORY.md`](file:///d:/Workspace/Omni_IELTS/docs/ux/CURRENT_SCREEN_INVENTORY.md) — This master screen inventory and product audit report.
2. [`docs/ux/CURRENT_INFORMATION_ARCHITECTURE.md`](file:///d:/Workspace/Omni_IELTS/docs/ux/CURRENT_INFORMATION_ARCHITECTURE.md) — Comprehensive Information Architecture specification with hierarchy tree and Mermaid navigation graph.
3. [`docs/ux/SCREENSHOT_MANIFEST.md`](file:///d:/Workspace/Omni_IELTS/docs/ux/SCREENSHOT_MANIFEST.md) — Screenshot manifest mapping all 56 captured images.
4. `docs/ux/screenshots/*.png` — 56 high-resolution desktop (`1440×900`) and mobile (`390×844`) screenshots.
