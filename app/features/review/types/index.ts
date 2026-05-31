export interface IAiReviewComplexity {
  time: string; // 예: "O(n log n)"
  space: string; // 예: "O(n)"
  rationale: string; // 한 줄 근거
}

export interface IAiReviewImprovement {
  title: string;
  detail: string;
}

export interface IAiReviewContent {
  complexity: IAiReviewComplexity;
  strengths: string[];
  improvements: IAiReviewImprovement[];
  comparison: string; // 상대 코드 대비 한두 문장
}

export interface IAiReview {
  content: IAiReviewContent;
  summary: string; // 결과 화면 상단 한 줄 요약 (ai_reviews.summary)
}
