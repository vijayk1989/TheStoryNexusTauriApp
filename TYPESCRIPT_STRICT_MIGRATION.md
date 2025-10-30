# TypeScript Strict Mode Migration Plan

## Current State Analysis

### Codebase Overview
- **Total TypeScript files**: 324 (excluding 7 backup files)
- **Feature code**: ~163 files in `src/features/` and core `src/`
- **Lexical editor code**: ~161 files (third-party/modified playground)
- **Backup files to clean**: 7 files (`.old`, `.backup`)

### Current Configuration
**tsconfig.json:**
- `strict: false`
- `noUnusedLocals: false`
- `noUnusedParameters: false`
- `noFallthroughCasesInSwitch: false`

**biome.json:**
- `noExplicitAny: "off"` - explicitly allows `any` types
- `noUnusedVariables: "warn"` - already catching some issues
- Strong correctness and suspicious code rules enabled

### Violation Assessment

#### Explicit `any` Types
- **Count**: 14 occurrences across 8 files
- **Risk**: LOW - Very minimal usage
- **Key files**:
  - `src/types/story.ts` (1) - `[key: string]: any` in SceneBeat metadata
  - `src/features/brainstorm/reducers/chatReducer.ts` (3) - `previewMessages: any`

#### Type Assertions
- **`as any`**: 4 occurrences across 4 files
- **Non-null assertions (`!`)**: 5 occurrences across 5 files
- **Risk**: LOW to VERY LOW

#### TypeScript Suppressions
- **`@ts-ignore`**: 16 occurrences across 10 files (mostly in Lexical playground)
- **`@ts-expect-error`**: 9 occurrences across 6 files (mostly in Lexical playground)
- **Risk**: MEDIUM - Need investigation, but most are in third-party code

#### Positive Indicators
- **Optional chaining (`?.`)**: 259 occurrences across 72 files
- **Nullish coalescing (`??`)**: 23 occurrences across 19 files
- **Status**: EXCELLENT - Codebase already handling nullability well

### Risk Assessment by Subsystem

#### LOW RISK (Well-typed):
- Type definitions (`src/types/story.ts`)
- Reducers with discriminated unions
- Database layer (Dexie classes)
- Zustand stores

#### MEDIUM RISK (Need attention):
- Prompt Parser (complex class-based system)
- AI Service (singleton, factory, streaming)
- Custom React hooks
- Component prop interfaces

#### HIGH RISK (Third-party/Modified):
- Lexical Playground (161 files, most type suppressions)
- Should be treated as lower priority or excluded initially

## Migration Strategy: Phased Approach

### Phase 0: Preparation
**Goal**: Clean baseline for migration

**Tasks**:
1. Remove 7 backup files (`.old`, `.backup`)
2. Run baseline type check: `npm run build`
3. Document any existing type errors
4. Commit clean baseline

**Estimated time**: 1 day

---

### Phase 1: Enable Basic Strict Checks
**Goal**: Enable non-controversial strict checks

**Changes to `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Temporary exclusion during migration**:
```json
{
  "exclude": [
    "node_modules",
    "src/Lexical/lexical-playground/**/*",
    "**/*.old",
    "**/*.backup"
  ]
}
```

**Focus areas**:
- Fix unused variables/parameters in feature code
- Add return statements where needed
- Handle switch fallthrough cases

**Estimated time**: 2-3 days

---

### Phase 2: Enable Core Strict Flags
**Goal**: Enable implicit any and null checking

**Changes to `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Priority fixes**:
1. **Type 14 explicit `any` occurrences**:
   - `src/types/story.ts` - Replace `[key: string]: any` in SceneBeat metadata
   - `src/features/brainstorm/reducers/chatReducer.ts` - Type `previewMessages: any`
   - 6 other files with minimal `any` usage

2. **Add explicit return types**:
   - Function declarations without return types
   - Custom React hooks

3. **Fix 4 `as any` assertions**:
   - Replace with proper types or `unknown` with type guards

4. **Handle strict null checks**:
   - Already well-prepared due to extensive optional chaining
   - Review 5 non-null assertions

**Focus**: Feature code only, defer Lexical playground

**Estimated time**: 3-5 days

---

### Phase 3: Full Strict Mode
**Goal**: Enable all remaining strict family flags

**Changes to `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

This enables:
- `alwaysStrict`
- `strictBindCallApply`
- `strictFunctionTypes`
- `strictPropertyInitialization`
- `useUnknownInCatchVariables`

**Focus areas**:
- Fix class property initialization issues
- Review bind/call/apply usage
- Update catch clauses to use `unknown` instead of `any`
- Fix function type contravariance issues

**Target**: Core application code only

**Estimated time**: 2-3 days

---

### Phase 4: Lexical Playground Migration
**Goal**: Address third-party/modified code

**Strategy options**:

**Option A: Separate configuration**
Create `src/Lexical/lexical-playground/tsconfig.json`:
```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false
  }
}
```

**Option B: Full migration**
- Review 16 `@ts-ignore` suppressions
- Review 9 `@ts-expect-error` suppressions
- Investigate Lexical library typing issues
- Fix or document legitimate typing gaps

**Recommendation**: Start with Option A (separate config), then gradually migrate using Option B approach

**Estimated time**: 3-5 days (or defer indefinitely with Option A)

---

### Phase 5: Biome Alignment
**Goal**: Align Biome linting with strict TypeScript

**Changes to `biome.json`**:
```json
{
  "linter": {
    "rules": {
      "suspicious": {
        "noExplicitAny": "warn"  // Change from "off"
      }
    }
  }
}
```

**Estimated time**: 1 day

---

### Phase 6: Continuous Improvement
**Goal**: Maintain strict standards going forward

**Ongoing tasks**:
- Remove remaining type suppressions one by one
- Replace `any` with proper types or `unknown`
- Add strict checks to CI/CD pipeline
- Document legitimate exceptions in CLAUDE.md
- Review and update architectural exceptions list

**Timeline**: Ongoing

---

## Priority Files (Fix First)

### Highest Impact
1. `src/types/story.ts` - Remove `[key: string]: any` in SceneBeat metadata
2. `src/features/brainstorm/reducers/chatReducer.ts` - Type `previewMessages: any`
3. Custom hooks without explicit return types
4. AI service streaming response handlers
5. Prompt parser variable resolvers

### Key Subsystems
- **AI Service** (`src/services/ai/`)
- **Prompt Parser** (`src/features/prompts/services/`)
- **Database layer** (`src/services/database.ts`)
- **Core stores** (`src/features/*/stores/`)

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0: Preparation | 1 day | 1 day |
| Phase 1: Basic checks | 2-3 days | 3-4 days |
| Phase 2: Core strict | 3-5 days | 6-9 days |
| Phase 3: Full strict | 2-3 days | 8-12 days |
| Phase 4: Lexical | 3-5 days | 11-17 days |
| Phase 5: Biome | 1 day | 12-18 days |

**Feature code migration**: 8-12 days (2-2.5 weeks)
**Full migration with Lexical**: 12-18 days (2.5-3.5 weeks)

---

## Success Factors

### Strengths
1. **Minimal violations**: Only 14 explicit `any` uses in entire codebase
2. **Already defensive**: 259 optional chaining uses, 23 nullish coalescing uses
3. **Clean architecture**: Feature-based organization enables incremental migration
4. **Documented exceptions**: 7 justified OOP patterns already identified
5. **Good typing**: Strong interfaces, discriminated unions, proper generics

### Challenges
1. **Lexical playground**: 161 files of third-party code with type suppressions
2. **Class-based services**: AIService, PromptParser need careful attention
3. **Streaming logic**: Complex async/streaming patterns in AI service
4. **Unknown upstream issues**: Some Lexical typing issues may be library bugs

### Risk Mitigation
- Phased approach allows testing after each stage
- Temporary exclusions prevent blocking progress
- Separate Lexical config provides fallback option
- HMR allows immediate feedback during fixes

---

## Testing Strategy

After each phase:
1. Run full build: `npm run build`
2. Start dev server: `npm run dev`
3. Test key workflows:
   - Create story
   - Edit chapter with Lexical editor
   - Generate content with AI
   - Use scene beats
   - Match lorebook entries
   - Import/export prompts
4. Check for runtime errors in console
5. Verify HMR still working

---

## Rollback Strategy

If critical issues arise:
1. Git revert to previous phase
2. Document blocking issues
3. Add temporary type suppressions with `// TODO: strict mode` comments
4. Create GitHub issues for deferred work
5. Continue with next phase or pause migration

---

## Completion Criteria

### Feature Code (Phases 1-3)
- ✅ All feature code compiles with `strict: true`
- ✅ No `@ts-ignore` or `@ts-expect-error` in new feature code
- ✅ Explicit `any` reduced to zero or documented exceptions
- ✅ All public APIs have explicit types
- ✅ CI/CD enforces strict mode

### Full Migration (Including Phase 4)
- ✅ Lexical playground either strictly typed or isolated in separate config
- ✅ Type suppressions reduced by 80%+
- ✅ Biome rules aligned with TypeScript strict mode
- ✅ Documentation updated in CLAUDE.md

---

## Post-Migration Standards

Update CLAUDE.md to reflect new standards:

```markdown
### TypeScript Configuration
The project uses strict TypeScript (`strict: true`) with all strict family flags enabled:
- `noImplicitAny: true`
- `strictNullChecks: true`
- `strictFunctionTypes: true`
- `strictBindCallApply: true`
- `strictPropertyInitialization: true`
- `alwaysStrict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `useUnknownInCatchVariables: true`

Exceptions:
- Lexical playground code uses relaxed config (separate tsconfig.json)
- Use `unknown` instead of `any` for truly dynamic types
- Add type guards when narrowing from `unknown`
- Document any `@ts-expect-error` with explanation
```

---

## Notes

- This codebase is **remarkably well-prepared** for strict mode migration
- Disciplined TypeScript usage evident despite strict mode being disabled
- Main challenge is isolated to Lexical playground (third-party code)
- Core application code migration is low-risk and high-value
- Expected to improve maintainability, catch bugs earlier, improve IDE experience
