*StoryNexus + Memori Integration Plan*

**Development Plan**

StoryNexus + Memori Integration

*Persistent AI Memory for Creative Writing*

Version 1.0

December 2025


# **Table of Contents**





# **Executive Summary**
This document presents a comprehensive development plan for integrating Memori's persistent memory engine into TheStoryNexusTauriApp, creating a next-generation AI-assisted creative writing platform with contextual memory capabilities.

The integration enables the AI to remember facts, characters, locations, and narrative events across sessions, dramatically improving story consistency and user experience. The architecture uses a Python sidecar approach that preserves Memori's turnkey 'sandwich' functionality while maintaining StoryNexus's local-first philosophy.
## **Key Objectives**
- Implement persistent, story-scoped AI memory using Memori's SQL-native engine
- Create seamless integration between Tauri/React frontend and Python memory backend
- Maintain ability to sync with both upstream repositories (StoryNexus and Memori)
- Deliver production-ready memory UI components for story context visualization
- Establish automated testing and deployment pipelines
## **Project Scope**

|**Timeline**|**8-10 weeks (with parallel workstreams)**|
| :- | :- |
|**Team Size**|1-2 developers (full-stack with Rust/Python experience)|
|**Tech Stack**|Tauri v2, React, TypeScript, Zustand, Python, FastAPI, Memori, SQLite|
|**Deliverables**|Integrated app, documentation, test suite, CI/CD pipeline, deployment guides|


# **Technical Architecture**
## **System Overview**
The integrated system follows a three-tier architecture with clear separation of concerns:

|**Layer**|**Technology**|**Responsibility**|
| :- | :- | :- |
|**Frontend**|React, TypeScript, Zustand, Tailwind|UI components, state management, user interaction|
|**Desktop Shell**|Tauri v2, Rust|Sidecar lifecycle, IPC bridge, native APIs|
|**Memory Engine**|Python, FastAPI, Memori|Context injection, entity extraction, memory storage|
|**Storage**|SQLite (local)|Persistent memory database per installation|
## **Data Flow**
The 'sandwich' architecture processes each AI interaction in three phases:

- Pre-Call Injection: Memori searches stored memories, ranks by relevance, injects into system prompt
- LLM Generation: AI responds with full context awareness (user sees natural response)
- Post-Call Extraction: Memori analyzes exchange, extracts entities/facts, stores in database
## **Memory Attribution Model**
Memories are scoped using Memori's attribution system:

- Entity ID: Maps to story\_id (each story has isolated memories)
- Process ID: Fixed as 'storynexus' (identifies the application)
- Session ID: Tracks writing sessions within a story
## **Communication Protocol**
Frontend ↔ Backend communication uses two mechanisms:

- Tauri IPC (invoke): React calls Rust commands via @tauri-apps/api
- HTTP (localhost:9876): Rust proxies requests to Python FastAPI sidecar


# **Development Phases**
## **Phase 1: Foundation & Repository Setup**

|**Duration**|**1 week**|
| :- | :- |
|**Goal**|Establish repository structure with dual-upstream tracking capability|

**Tasks:**

1. Fork TheStoryNexusTauriApp to personal/organization GitHub account
1. Configure git remotes: origin (fork), upstream-storynexus (original), memori-remote (Memori)
1. Create tracking branch: upstream/storynexus for StoryNexus updates
1. Add Memori as git subtree at src/memori (for reference, not direct use)
1. Create develop branch for integration work
1. Set up branch protection rules and PR templates
1. Document upstream sync workflow in CONTRIBUTING.md

*Deliverables: Configured repository, branch structure, sync documentation*
## **Phase 2: Python Sidecar Development**

|**Duration**|**2 weeks**|
| :- | :- |
|**Goal**|Build FastAPI server wrapping Memori with all required endpoints|

**Tasks:**

1. Create sidecar/ directory with Python project structure
1. Implement memori\_bridge.py with FastAPI endpoints: /health, /completion, /search, /context
1. Configure Memori with conscious\_ingest and auto\_ingest modes
1. Implement story-scoped attribution (entity\_id = story\_id)
1. Add session management endpoints (/session/new)
1. Create manual memory injection endpoint (/memory/add) for Lorebook integration
1. Write unit tests for all endpoints using pytest
1. Test with multiple LLM backends (OpenAI, OpenRouter, LM Studio)
1. Document API with OpenAPI/Swagger annotations

*Deliverables: Working sidecar, API documentation, test suite*
## **Phase 3: Tauri Integration Layer**

|**Duration**|**2 weeks**|
| :- | :- |
|**Goal**|Create Rust commands for sidecar management and memory operations|

**Tasks:**

1. Add reqwest and tokio dependencies to Cargo.toml
1. Create memory\_commands.rs with SidecarState management
1. Implement sidecar lifecycle commands (start, stop, health check)
1. Create proxy commands for all memory operations
1. Configure capabilities/memory.json for shell:spawn and http permissions
1. Update lib.rs with setup hook for auto-starting sidecar
1. Add cleanup hook to stop sidecar on window close
1. Implement retry logic and error handling for sidecar communication
1. Test cross-platform (Windows, macOS, Linux)

*Deliverables: Rust command module, capability configuration, cross-platform testing*


## **Phase 4: Frontend Feature Module**

|**Duration**|**2 weeks**|
| :- | :- |
|**Goal**|Build complete React feature module with UI components and state management|

**Tasks:**

1. Create src/features/memory/ directory structure following existing patterns
1. Implement memoryService.ts with Tauri invoke wrappers
1. Create memoryStore.ts Zustand slice with selectors
1. Build useMemoryCompletion hook as drop-in replacement for AI calls
1. Develop MemoryPanel.tsx sidebar component with search functionality
1. Create MemoryPanelToggle.tsx toolbar button with status indicator
1. Implement memory card components with category styling
1. Add entity cloud visualization
1. Integrate with existing story/chapter views
1. Wire up Lorebook → Memory import functionality

*Deliverables: Feature module, UI components, integration with existing views*
## **Phase 5: Testing, Polish & Documentation**

|**Duration**|**1-2 weeks**|
| :- | :- |
|**Goal**|Comprehensive testing, performance optimization, and documentation|

**Tasks:**

1. Write integration tests for full sandwich loop
1. Performance testing: memory search latency, extraction overhead
1. UI/UX polish based on dogfooding feedback
1. Accessibility audit for memory panel
1. Create user documentation and tutorials
1. Write developer documentation for future contributors
1. Set up GitHub Actions for CI/CD
1. Configure automated upstream sync checks
1. Create release builds for all platforms

*Deliverables: Test suite, documentation, CI/CD pipeline, release builds*


# **Timeline & Milestones**

|**Week**|**Phase**|**Milestone**|**Deliverable**|
| :- | :- | :- | :- |
|1|Foundation|Repository configured|Fork + branches + docs|
|2-3|Sidecar|Memory API operational|FastAPI server + tests|
|4-5|Tauri|Rust bridge complete|Commands + lifecycle|
|6-7|Frontend|UI feature complete|Memory panel + hooks|
|8-9|Polish|Release candidate|Tests + docs + builds|
|10|Release|v1.0.0 shipped|Public release|
## **Critical Path**
The following items are on the critical path and must not slip:

- Week 1: Repository setup (blocks all other work)
- Week 3: Sidecar /completion endpoint (blocks frontend integration)
- Week 5: Tauri start\_memori\_sidecar command (blocks UI testing)
- Week 7: useMemoryCompletion hook (blocks full integration testing)


# **Resource Requirements**
## **Development Environment**

|**Requirement**|**Specification**|
| :- | :- |
|**Node.js**|v18+ with npm or pnpm|
|**Rust**|Latest stable toolchain via rustup|
|**Python**|3\.10+ with pip and venv|
|**IDE**|VS Code with Rust Analyzer, Python, and ESLint extensions|
|**OS**|macOS, Windows 10+, or Linux (Ubuntu 22.04+)|
## **External Services**

|**Service**|**Purpose**|**Cost**|
| :- | :- | :- |
|**OpenAI API**|LLM completions + Memori extraction|~$20-50/month during dev|
|**Memori Advanced**|Enhanced entity extraction|Free for developers|
|**GitHub**|Repository hosting, CI/CD|Free tier sufficient|
## **Team Skills Required**
- Rust: Intermediate (Tauri commands, async, error handling)
- TypeScript/React: Advanced (hooks, state management, component design)
- Python: Intermediate (FastAPI, async, SQLAlchemy basics)
- Git: Advanced (subtrees, multi-remote workflows, rebasing)


# **Risk Assessment**

|**Risk**|**Likelihood**|**Impact**|**Mitigation**|
| :- | :- | :- | :- |
|Upstream breaking changes|Medium|High|Isolate integration code in adapter layers; test after each sync|
|Memori API changes|Medium|High|Pin Memori version; monitor releases; abstract behind service layer|
|Python bundling complexity|High|Medium|Phase 1: require Python; Phase 2: explore PyInstaller/PyOxidizer|
|Cross-platform sidecar issues|Medium|Medium|Early cross-platform testing; platform-specific path handling|
|Memory extraction quality|Low|Medium|Use Memori Advanced; tune extraction prompts; allow manual correction|
|Performance bottlenecks|Low|Medium|Profile early; optimize conscious memory loading; lazy search|
## **Contingency Plans**
1. If Memori becomes unmaintained: Core extraction logic is open-source; fork and maintain internally
1. If StoryNexus architecture changes significantly: Maintain version-locked fork; selective merge
1. If Python sidecar proves too complex for distribution: Evaluate Rust port of core Memori logic


# **Testing Strategy**
## **Unit Testing**

|**Layer**|**Framework**|**Coverage Target**|
| :- | :- | :- |
|Python Sidecar|pytest + pytest-asyncio|90% for endpoints, 80% overall|
|Rust Commands|cargo test + mockall|80% for command handlers|
|React Components|Vitest + React Testing Library|70% for components, 90% for hooks|
## **Integration Testing**
- Full sandwich loop: User prompt → context injection → LLM call → extraction → storage → retrieval
- Story isolation: Verify memories from Story A don't leak into Story B
- Session management: Verify new session resets conscious memory appropriately
- Lorebook import: Verify manual memories are searchable and injected
## **End-to-End Testing**
- Playwright for automated UI flows
- Scenarios: Create story → write chapters → verify memory panel → search memories
- Cross-platform smoke tests on Windows, macOS, Linux
## **Performance Testing**
- Memory search latency: Target < 100ms for typical queries
- Context injection overhead: Target < 200ms added to LLM call
- Database size scaling: Test with 10K, 50K, 100K memories


# **Deployment Strategy**
## **Distribution Options**

|**Option**|**Pros**|**Cons**|
| :- | :- | :- |
|Python Required|Simple; no bundling; easy updates|User must install Python|
|Bundled Python|Self-contained; no dependencies|Larger binary; complex build|
|Rust Port|Native performance; single binary|Significant dev effort (4-6 weeks)|

*Recommendation: Start with 'Python Required' for v1.0; evaluate bundling for v1.1 based on user feedback.*
## **Release Process**
- Semantic versioning (MAJOR.MINOR.PATCH)
- GitHub Releases with auto-generated changelogs
- Platform-specific installers: .dmg (macOS), .msi (Windows), .AppImage (Linux)
- Automated builds via GitHub Actions on tag push
## **Update Mechanism**
- In-app update notification (check GitHub releases API)
- Manual download for major versions
- Sidecar auto-update via pip (if using Python Required approach)


# **Maintenance & Upstream Sync**
## **Weekly Sync Process**
Run the following workflow every Monday (or when upstream releases):

- Fetch from upstream-storynexus and upstream-memori
- Merge upstream/storynexus into develop (resolve conflicts)
- Pull Memori subtree updates (if using subtree approach)
- Run full test suite
- Review changelog for breaking changes
- Update documentation if APIs changed
## **Automated Sync Checks**
GitHub Actions workflow runs twice weekly to:

- Check for new upstream commits
- Create draft PR if updates available
- Run CI against merged changes
- Notify maintainers of conflicts
## **Long-term Divergence Strategy**
If upstream changes significantly diverge from integration needs:

- Evaluate effort to maintain compatibility
- Consider hard fork if sync becomes untenable
- Document all modifications in CHANGES.md
- Maintain attribution and license compliance


# **Success Metrics**
## **Technical Metrics**

|**Metric**|**Target**|**Measurement**|
| :- | :- | :- |
|Memory search latency|< 100ms p95|Automated perf tests|
|Sandwich overhead|< 300ms added|Instrumentation|
|Test coverage|> 80% overall|Coverage reports|
|Build success rate|> 95%|CI dashboard|
|Cross-platform parity|100% feature parity|Platform test matrix|
## **Quality Metrics**
1. Memory injection accuracy: >90% of relevant memories injected for typical queries
1. Entity extraction precision: >85% of extracted entities are valid and useful
1. Story isolation: 0 memory leaks between stories in testing
1. Sidecar reliability: >99.5% uptime during active sessions
## **Project Metrics**
1. Delivered within 10-week timeline (±1 week acceptable)
1. All Phase deliverables completed
1. Documentation coverage: All public APIs documented
1. Zero critical bugs in release candidate


# **Appendix A: File Structure**
**Final integrated repository structure:**

storynexus-memori-integrated/

├── sidecar/

│   ├── memori\_bridge.py

│   ├── requirements.txt

│   └── tests/

├── src/

│   └── features/

│       └── memory/

│           ├── index.ts

│           ├── components/

│           ├── hooks/

│           ├── services/

│           └── store/

├── src-tauri/

│   ├── src/

│   │   ├── lib.rs

│   │   └── memory\_commands.rs

│   └── capabilities/

│       └── memory.json

├── docs/

│   ├── integration-guide.md

│   ├── api-reference.md

│   └── upstream-sync.md

└── .github/

`    `└── workflows/

`        `├── ci.yml

`        `└── upstream-sync.yml


# **Appendix B: API Endpoint Reference**

|**Method**|**Endpoint**|**Description**|
| :- | :- | :- |
|GET|/health|Health check - verify sidecar is running|
|POST|/completion|Memory-aware LLM completion (main endpoint)|
|POST|/search|Search memories by query|
|POST|/context|Get current conscious memories for story|
|POST|/session/new|Start new memory session|
|POST|/memory/add|Manually add a memory|
|DELETE|/memory/{story\_id}|Clear all memories for a story|

*— End of Document —*
Page  of 
