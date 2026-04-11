# Judge0 API 설정 가이드

## 1. RapidAPI에서 Judge0 CE 구독

1. [RapidAPI - Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce) 접속
2. RapidAPI 계정 로그인 (없으면 가입)
3. **Pricing** 탭에서 **Basic (무료)** 플랜 구독
   - 무료 플랜: 일 50회 제한 (개발/테스트용으로 충분)
4. 구독 완료 후 **Endpoints** 탭으로 이동

## 2. API 키 확인

Endpoints 탭에서 아무 엔드포인트 선택 → 우측 **Code Snippets** 영역에서 확인:

- `X-RapidAPI-Key`: 이것이 API 키
- `X-RapidAPI-Host`: `judge0-ce.p.rapidapi.com`

## 3. 환경변수 추가

프로젝트 루트의 `.env` 파일에 아래 두 줄 추가:

```env
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=여기에_RapidAPI_키_붙여넣기
```

## 4. 연동에 사용할 엔드포인트

| 용도      | 메서드 | 엔드포인트                                    |
| --------- | ------ | --------------------------------------------- |
| 코드 제출 | POST   | `/submissions?base64_encoded=false&wait=true` |
| 결과 조회 | GET    | `/submissions/{token}?base64_encoded=false`   |

- `wait=true` 옵션: 제출 후 결과가 나올 때까지 동기 대기 (폴링 불필요)
- `wait=false`일 경우: token을 받고 GET으로 폴링해야 함

## 5. 제출 시 필요한 필드

```json
{
  "source_code": "console.log('hello')",
  "language_id": 63,
  "stdin": "입력값",
  "expected_output": "기대 출력값",
  "cpu_time_limit": 2,
  "memory_limit": 256000
}
```

### 언어 ID 매핑

| 언어                         | language_id |
| ---------------------------- | ----------- |
| JavaScript (Node.js 12.14.0) | 63          |
| Python (3.8.1)               | 71          |

## 6. 확인 체크리스트

- [ ] RapidAPI 계정 생성/로그인
- [ ] Judge0 CE Basic 플랜 구독
- [ ] API 키 복사
- [ ] `.env`에 `JUDGE0_API_URL`, `JUDGE0_API_KEY` 추가
- [ ] Next.js 개발 서버 재시작
