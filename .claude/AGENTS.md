# Development Pipeline Agents

This document describes your five specialized agents and how they work together in a coordinated development workflow. Each agent has a specific role and expertise; combined, they form a complete pipeline from planning to production release.

## Agent Overview

| Agent | Role | Phase | Use When |
|-------|------|-------|----------|
| **Orchestrator** | Workflow coordinator | Meta | You have a complete feature/epic and want the full pipeline (Architect → Builder → Validator → Scribe) |
| **Architect** | Planning & design | Analysis | You need to understand requirements, design architecture, or create a roadmap before building |
| **Builder** | Implementation | Development | You have a roadmap and need working code written and integrated |
| **Validator** | Testing & QA | Validation | You need comprehensive test coverage, quality assurance, and production readiness confirmation |
| **Scribe** | Documentation | Release | You need API docs, guides, examples, and architecture diagrams for a feature |

---

## Complete Workflow

### The Orchestrator Pipeline (Recommended)

Use the **Orchestrator** for complete features from planning to release:

```
User Request: "Build authentication system"
       ↓
┌─────────────────────────────────────────────────────────┐
│  ORCHESTRATOR (Coordinates entire workflow)             │
└─────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: ARCHITECT (Planning)                          │
│  • Explores codebase and existing patterns              │
│  • Analyzes requirements and constraints                │
│  • Designs architecture                                 │
│  • Creates implementation roadmap (phases + risks)      │
│  └─ HANDOFF: Architecture Design & Roadmap             │
└─────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: BUILDER (Implementation)                      │
│  • Reads Architect's roadmap                            │
│  • Implements features incrementally                    │
│  • Runs builds to verify integration                    │
│  • Documents implementation notes                       │
│  └─ HANDOFF: Working Code + Build Verification         │
└─────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 3: VALIDATOR (Quality Assurance)                 │
│  • Writes Jest unit & integration tests                 │
│  • Writes Puppeteer E2E tests                           │
│  • Runs full test suite                                 │
│  • Validates coverage ≥80%                              │
│  • Enforces quality gates                               │
│  └─ Decision Point:                                     │
│     ✓ PASS: All tests pass, coverage OK                 │
│     ❌ BLOCK: Quality gate failed → STOP PIPELINE      │
└─────────────────────────────────────────────────────────┘
       ↓ (if PASS)
┌─────────────────────────────────────────────────────────┐
│  PHASE 4: SCRIBE (Documentation)                        │
│  • Creates API documentation                            │
│  • Writes usage guides and README updates               │
│  • Generates working code examples                      │
│  • Creates architecture diagrams (Mermaid)              │
│  • Organizes docs with cross-references                 │
│  └─ HANDOFF: Production-Ready Release Package           │
└─────────────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────────────┐
│  ✓ COMPLETE & READY FOR PRODUCTION                      │
│  • Working, tested code                                 │
│  • Comprehensive documentation                          │
│  • Examples and guides                                  │
│  • Quality metrics and coverage reports                 │
└─────────────────────────────────────────────────────────┘
```

### Error Handling in Pipeline

**If Validator BLOCKS** (quality gates fail):
- ❌ Pipeline STOPS immediately
- ❌ Scribe is NOT invoked
- ⚠️ Report: Specific blockers (coverage < 80%, failing tests, performance regression)
- → Recommendation: Fix issues and restart Validator

**If Architect BLOCKS** (requirements unclear):
- ❌ Pipeline STOPS
- → Recommendation: Clarify requirements and restart Architect

**If Builder BLOCKS** (implementation impossible):
- ❌ Pipeline STOPS
- → Recommendation: Escalate to Architect for design revision

---

## Individual Agent Usage

### Use Architect Alone

When you need **planning and analysis** without implementation:

- Explore a new codebase and understand its structure
- Design an architecture for a new feature
- Analyze how multiple systems interact
- Create a technical roadmap with constraints and risks
- Evaluate trade-offs between architectural approaches

**Example prompt**: *"Analyze the current authentication system and propose how to add OAuth 2.0 support"*

**Output**: Architecture design, roadmap, identified constraints

---

### Use Builder Alone

When you have a **clear roadmap** and need **implementation only**:

- You already have a detailed technical design from Architect
- You just need code written following the design
- You're fixing a specific bug with known requirements
- You're adding a feature to an existing pattern

**Example prompt**: *"Implement the OAuth 2.0 integration following the architecture roadmap provided: [include roadmap]"*

**Output**: Working code, build verification, implementation notes

---

### Use Validator Alone

When you need **testing and quality assurance** for existing code:

- Code is written but not yet tested
- You need comprehensive test suite for an existing feature
- You need to validate quality gates before release
- You're debugging test failures in existing code

**Example prompt**: *"Write comprehensive Jest and Puppeteer tests for the authentication module. Ensure 80%+ coverage."*

**Output**: Test reports, coverage metrics, quality gate status (PASS/BLOCK)

---

### Use Scribe Alone

When you need **documentation and examples** for existing features:

- Code is complete and tested
- You need API documentation, guides, and examples
- You're creating a release package with documentation
- You're updating README and architecture diagrams

**Example prompt**: *"Create comprehensive documentation for the authentication feature including API docs, usage guide, and examples"*

**Output**: API docs, README updates, examples, diagrams, organized docs

---

## Decision Tree: Which Agent to Use?

```
Do you have a complete feature request or epic?
│
├─ YES: Use ORCHESTRATOR (full pipeline: plan → build → test → document)
│
└─ NO: Do you already have a roadmap/design?
   │
   ├─ NO: Use ARCHITECT (planning and analysis only)
   │
   └─ YES: Is the code written?
      │
      ├─ NO: Use BUILDER (implementation only)
      │
      └─ YES: Is it tested?
         │
         ├─ NO: Use VALIDATOR (testing and QA only)
         │
         └─ YES: Is it documented?
            │
            └─ NO: Use SCRIBE (documentation only)
                   YES: ✓ DONE (ready for production)
```

---

## Agent Interactions & Handoffs

### Handoff: Architect → Builder

**What Architect delivers**:
- Clear architecture design
- Implementation roadmap (phases, dependencies)
- Technical constraints and decisions
- Identified risks and mitigation strategies

**What Builder needs from Architect**:
- Scope: What's in/out of this implementation?
- Design: How should components interact?
- Phases: What's the logical order to build?
- Constraints: What patterns/conventions to follow?

**Builder's question**: *"What roadmap should I implement?"*

---

### Handoff: Builder → Validator

**What Builder delivers**:
- Working, integrated code
- Build verification (compiles, runs)
- Implementation notes and technical decisions
- List of changes by phase

**What Validator needs from Builder**:
- Source code in the repository
- Build command that works
- Understanding of what was implemented
- Acceptance criteria for each phase

**Validator's question**: *"What code should I test?"*

---

### Handoff: Validator → Scribe (or Stop)

**If PASS** ✓:

What Validator delivers:
- All tests passing (0 failures)
- Coverage ≥ 80%
- Performance metrics within acceptable range
- Quality gate: APPROVED FOR RELEASE

What Scribe needs:
- Working, tested code
- Documentation requirements
- API endpoints/functions to document
- Example workflows to showcase

**If BLOCK** ❌:

- Pipeline STOPS
- Validator reports specific blockers
- User/Builder addresses issues
- Validator re-runs tests
- Loop continues until PASS

**Scribe's question**: *"What working code should I document?"*

---

## Tool Access by Agent

| Tool | Architect | Builder | Validator | Scribe | Orchestrator |
|------|:---------:|:-------:|:---------:|:------:|:------------:|
| **read** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **edit** | ✗ | ✓ | ✓ | ✓ | ✗ |
| **execute** | ✗ | ✓ | ✓ | ✗ | ✗ |
| **search** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **web** | ✓ | ✗ | ✗ | ✓ | ✗ |
| **todo** | ✓ | ✓ | ✓ | ✗ | ✓ |
| **agent** | ✓ | ✓ | ✓ | ✗ | ✓ |

---

## Quality Gates & Success Criteria

### Architect Phase Success
- ✓ Codebase exploration complete
- ✓ Architecture design documented
- ✓ Roadmap broken into phases
- ✓ Technical constraints identified
- ✓ Risks and mitigations documented

### Builder Phase Success
- ✓ All roadmap phases implemented
- ✓ Code builds successfully
- ✓ Code integrates with existing systems
- ✓ No compilation errors
- ✓ Implementation notes documented

### Validator Phase Success
- ✓ All tests pass (0 failures)
- ✓ Coverage ≥ 80% across all modules
- ✓ No performance regressions
- ✓ No critical bugs (security, crashes, data corruption)
- ✓ Quality gates: **PASS** (ready for release)

### Scribe Phase Success
- ✓ API documentation complete
- ✓ README updated with feature
- ✓ Usage guides written
- ✓ Code examples provided
- ✓ Architecture diagrams created
- ✓ Docs organized and cross-referenced

---

## Quick Reference: Prompt Templates

### Use Orchestrator
```
"Build and release: [feature description]. Run full pipeline."
```

### Use Architect
```
"Design the [feature] architecture. Create a roadmap for implementation."
```

### Use Builder
```
"Implement [feature] following this roadmap: [paste roadmap]"
```

### Use Validator
```
"Test [feature] comprehensively. Jest for units, Puppeteer for E2E. Target 80%+ coverage."
```

### Use Scribe
```
"Document [feature]. Create API docs, README, guides, examples, and diagrams."
```

---

## Common Workflows

### Workflow 1: Full Feature Release (Recommended)
```
User → Orchestrator → [Architect → Builder → Validator → Scribe] → Production ✓
```

### Workflow 2: Rapid Iteration (Design Already Known)
```
User → Builder → Validator → Scribe → Production ✓
(Skip Architect if design is already clear)
```

### Workflow 3: Architecture Review Only
```
User → Architect → Decision Point → Architect improvements/clarifications
(Get design approval before Builder starts)
```

### Workflow 4: Quality Review of Existing Code
```
User → Validator → Blocker? → Builder (fixes) → Validator again → Scribe → Production ✓
```

---

## Agent Locations

All custom agents are located in `.claude/agents/`:

- `.claude/agents/orchestrator.agent.md` — Workflow coordinator
- `.claude/agents/architect.agent.md` — Planning & design
- `.claude/agents/builder.agent.md` — Implementation
- `.claude/agents/validator.agent.md` — Testing & QA
- `.claude/agents/scribe.agent.md` — Documentation & examples

Each is user-invocable via the agent picker (`⌘K` or `⌘⇧A`).

---

## Tips & Best Practices

1. **Use Orchestrator for complete features** — It handles handoffs automatically
2. **Let each agent specialize** — Don't ask Builder to test or Validator to write code
3. **Review Architect's roadmap before Builder starts** — Prevents rework
4. **Never skip Validator** — Quality gates are strict for a reason
5. **Document as you go** — Give Scribe clear implementation notes
6. **Escalate blockers early** — If Validator blocks, escalate to Builder/Architect immediately
7. **Track progress with todo lists** — Each agent maintains clear status

---

## Support & Troubleshooting

**Agent doesn't appear in picker?**
- Ensure `.claude/agents/*.agent.md` files exist
- Check YAML frontmatter syntax (no tabs, quote colons)
- Restart VS Code agent system

**Pipeline blocked at Validator?**
- Review specific blocker (coverage, failing tests, performance)
- Address root cause in code
- Re-run Validator until PASS

**Agent doing the wrong thing?**
- Check the agent's description and approach section
- Provide clearer input to the agent
- Try specifying phase/scope explicitly

---

## Next Steps

Your development pipeline is now ready! You can:

1. **Try the Orchestrator** with a real feature request
2. **Use individual agents** for specific tasks
3. **Customize agents further** as workflows evolve
4. **Create workspace instructions** for team-specific conventions

Happy building! 🚀
