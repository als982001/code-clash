# Code Clash - 기술 스택

## 확정 스택

| 영역             | 기술                                 | 버전/비고                              |
| ---------------- | ------------------------------------ | -------------------------------------- |
| Framework        | Next.js (App Router)                 | 15.x, TypeScript                       |
| Styling          | Tailwind CSS v4 + shadcn/ui          |                                        |
| State Management | TanStack Query v5 + Zustand          | 서버 상태 / 클라이언트 상태 분리       |
| Database         | Supabase (PostgreSQL)                | 새 프로젝트 생성 예정                  |
| Real-time        | Supabase Realtime (Broadcast)        |                                        |
| Auth             | Supabase Auth                        | 소셜 로그인 (Google, GitHub)           |
| Editor           | Monaco Editor (@monaco-editor/react) |                                        |
| Code Sandbox     | Judge0 API (외부)                    | 무료 플랜, 제한 초과 시 유료 전환 검토 |
| AI               | Vercel AI SDK + Google Gemini        | 단일화, 필요 시 다른 모델로 전환       |
| Deployment       | Vercel                               | Next.js 최적 배포 환경                 |

## Judge0 외부 API 제한 사항

- RapidAPI 경유 무료 플랜: 일 50회 제한 (플랜에 따라 상이)
- MVP 개발/테스트에는 충분, 실사용자 증가 시 유료 전환 필요
- 평균 응답 시간 2~5초 (대전 UX에 영향 -> 로딩 애니메이션 필수)

## AI 모델 전략

- 1순위: Google Gemini (코드 리뷰, 문제 생성, 분석)
- 대안: Claude API 또는 OpenAI API (Gemini API 장애/제한 시)
- Vercel AI SDK 사용으로 모델 교체 비용 최소화
