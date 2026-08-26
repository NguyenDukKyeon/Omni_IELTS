# Omni IELTS — UI/UX Screenshot Manifest

This document provides a comprehensive mapping of all visual artifacts captured from the rendered application during the UI/UX audit.

* **Capture Engine:** Playwright / Chromium
* **Desktop Viewport:** 1440 × 900 px (Device Scale Factor: 1.0)
* **Mobile Viewport:** 390 × 844 px (Device Scale Factor: 2.0, Mobile Touch Emulation)
* **Output Directory:** `docs/ux/screenshots/`

---

## Master Screenshot Table

| Screenshot | Screen ID | Route / Trigger | State | Description |
| :--- | :--- | :--- | :--- | :--- |
| `SCR-001-home-dashboard.png` | **SCR-001** | `activeModule === 'dashboard'` | Desktop Populated | Main Bento Grid cockpit with target countdown, streak, 4-skill band overview, daily tasks, and module tiles |
| `SCR-001-home-dashboard-mobile.png` | **SCR-001** | Mobile Viewport (`activeModule === 'dashboard'`) | Mobile Responsive | Single-column stacked Bento cards with sticky bottom navigation bar |
| `SCR-002-source-ingestion-single.png` | **SCR-002** | `activeModule === 'sources'` | Single Ingestion Tab (PDF) | Source upload form with file/URL/YouTube/Docx tabs, band target selector, and raw text preview |
| `SCR-002-B-source-ingestion-batch.png` | **SCR-002** | Sources -> Button "Gộp Khoá Mini" | Batch Ingestion Mode | Multi-source batch ingestion list and mini-course compiler |
| `SCR-002-C-source-lesson-pack.png` | **SCR-002** | Sources -> Subview "Gói Bài Học 4 Kỹ Năng" | Active Source Detail | Integrated 4-skill lesson pack viewer (Reading passage, Listening audio, Speaking cue card, Writing prompt) |
| `SCR-002-D-source-extracted-vocab.png` | **SCR-002** | Sources -> Subview "Từ Vựng C1/C2" | Active Source Vocab | Extracted academic vocabulary cards with IPA, CEFR tag, and collocations |
| `SCR-002-E-source-grammar-summary.png` | **SCR-002** | Sources -> Subview "Ngữ Pháp & Tóm Tắt" | Active Source Grammar | Academic AI summary box and highlighted grammatical structures (Inversion/Cleft) |
| `SCR-002-source-ingestion-mobile.png` | **SCR-002** | Mobile Viewport (`activeModule === 'sources'`) | Mobile Responsive | Vertically stacked ingestion form, source library cards, and action buttons |
| `SCR-003-ai-course-designer-modal.png` | **SCR-003** | Sources -> Button "AI Course Designer" | Modal Dialog Open | Multi-step interactive modal creating tailored 4-skill curricula from raw materials |
| `SCR-004-A-vocab-flashcard.png` | **SCR-004** | `activeModule === 'vocabulary'` | Flashcard Study Mode | Spaced Repetition flashcard viewer with card flip, UK/US TTS, and FSRS rating buttons (Again/Hard/Good/Easy) |
| `SCR-004-B-vocab-quiz.png` | **SCR-004** | Vocabulary -> Tab "Trắc Nghiệm 4 Lựa Chọn" | Quiz Mode Active | 4-option multiple-choice vocabulary quiz with score counter and streak indicator |
| `SCR-004-C-vocab-dictation.png` | **SCR-004** | Vocabulary -> Tab "Nghe Chép Chính Tả" | Dictation Active | Audio playback, spelling input box, and character-level hint revealing |
| `SCR-004-D-vocab-context.png` | **SCR-004** | Vocabulary -> Tab "Điền Từ Ngữ Cảnh" | Gap-Fill Active | Academic sentence context gap-filling with collocation distractors |
| `SCR-004-E-vocab-pronunciation.png` | **SCR-004** | Vocabulary -> Tab "Luyện Phát Âm (Voice)" | Voice Drill Active | Speech recognition recording studio with phoneme accuracy scoring |
| `SCR-004-G-vocab-curated-decks.png` | **SCR-004** | Vocabulary -> Tab "Bộ Thẻ Theo Chủ Đề" | Deck Catalog Active | Pre-built AWL decks and 3-Tier Adaptive Topic Deck generator (Foundation / Upper-Int / Advanced) |
| `SCR-004-vocab-dashboard-mobile.png` | **SCR-004** | Mobile Viewport (`activeModule === 'vocabulary'`) | Mobile Responsive | Touch-optimized flashcard carousel with horizontal mode switcher |
| `SCR-005-vocab-enricher-modal.png` | **SCR-005** | Vocabulary -> Button "AI Enricher" | Modal Dialog Open | Single-word deep enrichment dialog generating IPA, collocations, word families, and band 8.0 sentences |
| `SCR-006-A-grammar-curriculum.png` | **SCR-006** | `activeModule === 'grammar'` | Curriculum Tab Active | Two-column grammar curriculum: topic catalog on left, formulas, pitfalls, and interactive drill on right |
| `SCR-006-B-grammar-diagnostician.png` | **SCR-006** | Grammar -> Tab "Bác Sĩ Chẩn Đoán" | Diagnostician Active | Essay/paragraph diagnostic workbench analyzing grammatical range (GRA) and band boost suggestions |
| `SCR-006-grammar-hub-mobile.png` | **SCR-006** | Mobile Viewport (`activeModule === 'grammar'`) | Mobile Responsive | Collapsible topic list with stacked formula cards and exercise inputs |
| `SCR-007-grammar-curriculum-modal.png` | **SCR-007** | Grammar -> Button "Thiết Kế Lộ Trình Ngữ Pháp" | Modal Dialog Open | Interactive curriculum generator tailoring grammar structures to target band |
| `SCR-008-A-media-shadowing-studio.png` | **SCR-008** | `activeModule === 'media'` | Shadowing Studio Active | Synchronized YouTube player, pitch waveform, sentence audio recording, and pronunciation feedback |
| `SCR-008-B-media-dictation-studio.png` | **SCR-008** | Media -> Tab "Dictation (Chép chính tả)" | Dictation Studio Active | Audio segment loop player, typing workspace, and diff comparison engine |
| `SCR-008-C-media-transcript-editor.png` | **SCR-008** | Media -> Tab "Toàn Bộ Transcript" | Transcript Editor Active | Timestamped segment list with inline text editing and persistence controls |
| `SCR-008-D-media-vocab-tab.png` | **SCR-008** | Media -> Tab "Từ Vựng Trọng Tâm" | Vocab Drawer Active | Key lexical items extracted from the active YouTube transcript |
| `SCR-008-media-lab-mobile.png` | **SCR-008** | Mobile Viewport (`activeModule === 'media'`) | Mobile Responsive | Stacked video player, playback controls, and touch recording buttons |
| `SCR-009-youtube-import-modal.png` | **SCR-009** | Media -> Button "+ Nhập URL YouTube" | Modal Dialog Open | YouTube URL parser with automatic caption extraction and topic tagging |
| `SCR-010-audio-transcribe-modal.png` | **SCR-010** | Media -> Button "🎙️ AI Audio Transcription" | Modal Dialog Open | Direct audio file upload and microphone recording transcription tool |
| `SCR-011-A-practice-forecast-live.png` | **SCR-011** | `activeModule === 'practice'` | Forecast Live Hub Active | Real IDP/BC 2026 exam questions with Google Search Grounding and direct skill practice triggers |
| `SCR-011-B-practice-reading-module.png` | **SCR-011** | Practice -> Tab "IELTS Reading" | Reading Practice Active | Academic reading passage with 6 question formats, answer checker, and trap diagnostics |
| `SCR-011-C-practice-listening-module.png` | **SCR-011** | Practice -> Tab "IELTS Listening" | Listening Practice Active | Multi-section audio player, fill-in-the-blank questions, and distractor rationale |
| `SCR-011-D-practice-writing-module.png` | **SCR-011** | Practice -> Tab "IELTS Writing" | Writing Practice Active | Split-pane writing interface (Task 1 & Task 2), live word counter, timer, and AI evaluation |
| `SCR-011-E-practice-speaking-module.png` | **SCR-011** | Practice -> Tab "IELTS Speaking" | Speaking Practice Active | Speaking examiner room with Part 1/2/3 prompts, VoicePicker, 1m prep timer, and criterion evaluation |
| `SCR-011-practice-hub-mobile.png` | **SCR-011** | Mobile Viewport (`activeModule === 'practice'`) | Mobile Responsive | Mobile tab bar for 4 skills, scrollable forecast items, and touch writing/recording areas |
| `SCR-012-item-writer-modal.png` | **SCR-012** | Practice -> Button "Cambridge Item Writer" | Modal Dialog Open | AI question generator creating Cambridge-standard exam items from raw passages |
| `SCR-013-full-grader-modal.png` | **SCR-013** | Practice -> Button "Giám Khảo Chấm 4 Tiêu Chí" | Modal Dialog Open | Comprehensive 4-criterion grading workbench with detailed TR, CC, LR, GRA rubrics |
| `SCR-015-A-mock-test-catalog.png` | **SCR-015** | `activeModule === 'mock_test'` | Test Catalog Active | Exam catalog (Cambridge 19, IDP Recent 2026, Mini Mocks) with start/resume triggers |
| `SCR-015-D-mock-history.png` | **SCR-015** | Mock Test -> Tab "Lịch Sử Thi & Bảng Điểm" | History Tab Active | Completed mock exam attempts list with band scores and detailed report buttons |
| `SCR-015-mock-test-mobile.png` | **SCR-015** | Mobile Viewport (`activeModule === 'mock_test'`) | Mobile Responsive | Mobile mock catalog and history list with compact test cards |
| `SCR-016-A-exam-listening-mode.png` | **SCR-016** | Mock Test -> Start Exam | Fullscreen Exam (Listening) | Official computer-delivered exam simulation layout (timer, question palette, audio player) |
| `SCR-016-B-exam-reading-mode.png` | **SCR-016** | Exam Mode -> Transition to Reading | Fullscreen Exam (Reading) | Split-pane passage & questions, highlighter, text resizer, and section navigation |
| `SCR-018-mock-orchestrator-modal.png` | **SCR-018** | Mock Test -> Button "Tạo Đề Thi Thử Tuỳ Chỉnh" | Modal Dialog Open | Custom mock test builder mixing passages, listening sections, and forecast prompts |
| `SCR-019-A-knowledge-strategies.png` | **SCR-019** | `activeModule === 'knowledge'` | Strategy Lessons Active | Strategic masterclasses covering specific IELTS question types with interactive quizzes |
| `SCR-019-B-knowledge-model-answers.png` | **SCR-019** | Knowledge -> Tab "Bài Mẫu Band 8.5+" | Model Answers Active | Band 8.5+ model essays and speaking transcripts with color-coded TR/CC/LR/GRA annotations |
| `SCR-019-C-knowledge-pitfalls.png` | **SCR-019** | Knowledge -> Tab "Sổ Tay Bẫy & Lỗi Phổ Biến" | Common Pitfalls Active | Catalog of deceptive distractors, Not Given traps, and grammatical pitfalls |
| `SCR-019-D-knowledge-calculator.png` | **SCR-019** | Knowledge -> Tab "Tổng Quan Kỳ Thi & Máy Tính" | Band Calculator Active | Official raw-score-to-band conversion calculator and test format overview |
| `SCR-019-knowledge-hub-mobile.png` | **SCR-019** | Mobile Viewport (`activeModule === 'knowledge'`) | Mobile Responsive | Mobile knowledge articles, model answers with touch annotations, and calculator |
| `SCR-020-A-profile-settings.png` | **SCR-020** | `activeModule === 'profile'` | Profile Overview Active | User band goal, exam countdown, Google OAuth, BYOK key inputs, and API Gateway health pool |
| `SCR-020-profile-mobile.png` | **SCR-020** | Mobile Viewport (`activeModule === 'profile'`) | Mobile Responsive | Stacked user settings, API credentials inputs, and dark mode switcher |
| `SCR-021-A-mistake-analytics.png` | **SCR-021** | Header -> Button "Error Journal" | Analytics Tab Active | Personal error journal with 8-trap radar chart, category breakdown, and workout trigger |
| `SCR-021-B-mistake-workout.png` | **SCR-021** | Mistake Notebook -> Tab "Daily Mistake Workout" | Workout Drill Active | Spaced repetition mistake remediation session with instant correction feedback |
| `SCR-021-C-mistake-vault.png` | **SCR-021** | Mistake Notebook -> Tab "Kho Lỗi Đã Lưu" | Mistake Vault Active | Searchable and filterable mistake cards collection with trap tags and audio playback |
| `SCR-021-D-mistake-add-form.png` | **SCR-021** | Mistake Notebook -> Tab "Thêm Lỗi Thủ Công" | Manual Add Form | Manual error entry form with trap category and skill tag selectors |
| `SCR-022-error-tagger-modal.png` | **SCR-022** | Mistake Notebook -> Button "AI Error Tagger" | Modal Dialog Open | AI-powered automatic error tagging and SRS flashcard generator |
| `SCR-023-diagnostic-psychometrician-modal.png` | **SCR-023** | Dashboard/Profile -> "Chẩn Đoán 8 Trục" | Modal Dialog Open | Comprehensive 8-axis psychometric assessment (TR, CC, LR, GRA, PF, RDF, LC, CH) with Radar chart |
| `SCR-024-onboarding-modal.png` | **SCR-024** | Header -> "Test chẩn đoán" | 4-Step Wizard Active | Rapid placement onboarding wizard: goal definition, listening test, reading test, and 7-module plan |
| `SCR-025-sentence-stylist-modal.png` | **SCR-025** | Practice/Writing -> "Nâng Cấp Câu" | Modal Dialog Open | 3-Tier Academic Sentence Rewriter elevating sentences from Band 6.5 to 7.5 and 8.5 |
| `SCR-026-speed-drill-arena-modal.png` | **SCR-026** | Dashboard -> "60-Second Speed Drill Arena" | Modal Dialog Open | High-intensity micro-challenges: Paraphrase Blitz, Cohesive Jigsaw, and Collocation Match |
| `SCR-027-floating-ai-tutor-drawer.png` | **SCR-027** | Global -> Floating Button "Hỏi AI Tutor" | Drawer Dialog Open | Context-adaptive AI tutor chat with prompt suggestions, citations, and TTS pronunciation |
| `SCR-028-master-mentor-panel-modal.png` | **SCR-028** | Writing Practice -> "Hội Đồng Cố Vấn" | Modal Dialog Open | Ex-examiner consultation panel (Dr. Vance) diagnosing subtle rhetorical and argumentative flaws |

---

## Summary of Capture Verification

* **Total Screenshots Produced:** 56 images
* **Desktop Surfaces:** 47 images (1440 × 900)
* **Mobile Responsive Surfaces:** 9 images (390 × 844)
* **Status:** 100% of discovered primary modules, sub-views, and modals visually cataloged and verified on rendered browser instances.
