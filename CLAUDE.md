## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:

- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## 에이전트 모델 정책

이 레포는 특별히 **모든 에이전트 작업에 `opus` 모델을 사용**한다.

- `agent-team-workflow` 스킬의 모델 선택 기준표(Sonnet/Opus 분기)는 **무시**하고 무조건 `opus`로 통일한다.
- 적용 대상: Analyzer(Plan), Code Writer, Code Reviewer, 기타 서브 에이전트 전부
- 이유: 코드 품질을 최우선으로 하는 개인 프로젝트이므로 모델 비용보다 정확도/추론력을 우선한다.

## Supabase DB 상태 검증 규칙 (Step 작업 시작 전 필수)

새로운 Step의 작업 계획서를 작성하거나 구현을 시작하기 전, **항상 Supabase MCP로 실제 DB 상태를 먼저 확인**한다. 문서/메모의 가정과 실제 DB가 어긋나는 경우가 있으므로 직접 조회한 결과를 단일 진실 공급원(SoT)으로 삼는다.

### 필수 조회 항목

1. **테이블 + 컬럼 + FK** — `mcp__supabase__list_tables({ schemas: ["public"], verbose: true })`
2. **RLS 정책** — `pg_policies` SELECT (`mcp__supabase__execute_sql`)
3. **트리거** — `information_schema.triggers` SELECT (`public`, `auth` 스키마)
4. **마이그레이션 이력** — `mcp__supabase__list_migrations`
5. **데이터 카운트** — 관련 테이블 row 수 + `auth.users` vs `profiles` 정합성

### 적용 방식

- Plan(Analyzer) 에이전트의 1단계 작업에 위 조회를 강제 포함시킨다.
- 문서의 "신규 생성/추가" 항목이 실제 DB 상태와 일치하는지 검증한다.
- 차이가 있으면 **"신규 생성"이 아니라 "현재 상태 진단 → 차이만 ALTER/CREATE"** 방향으로 작업 항목을 재작성한다.

### 이유

- Step 1~3 작업 중 문서의 가정(예: "profiles 테이블 신규 생성", "FK 복원")과 실제 DB(이미 모두 존재)가 어긋난 사례가 있었음.
- Supabase MCP 셋업 후에는 비용 거의 0으로 즉시 검증 가능하므로 매번 수행한다.
