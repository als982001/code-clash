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
