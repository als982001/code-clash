import type { IResultData } from "@/app/features/result/types";

/**
 * 결과 헤더 - 승/패/무 배너 + 양쪽 점수 표.
 * winner_id가 NULL이면 무승부. 그 외엔 me 기준 승/패 텍스트와 색상.
 * @param data 결과 데이터
 * @return 헤더 JSX
 */
export default function ResultHeader({ data }: { data: IResultData }) {
  const { match, host, guest } = data;
  const me = host.isMe ? host : guest;
  const opponent = host.isMe ? guest : host;

  let outcomeText: string;
  let outcomeColor: string;

  if (match.winnerId === null) {
    outcomeText = "무승부";
    outcomeColor = "text-yellow-400";
  } else if (match.winnerId === me.userId) {
    outcomeText = "승리!";
    outcomeColor = "text-green-400";
  } else {
    outcomeText = "패배";
    outcomeColor = "text-red-400";
  }

  return (
    <header className="flex flex-col items-center gap-3 border-b bg-gray-900/50 px-4 py-6">
      <span className={`text-3xl font-bold ${outcomeColor}`}>
        {outcomeText}
      </span>
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">성과 점수</span>
        <div className="flex gap-6 text-sm">
          <span className="text-muted-foreground">
            {me.nickname}: <b className="text-foreground">{me.score}</b>
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">
            {opponent.nickname}:{" "}
            <b className="text-foreground">{opponent.score}</b>
          </span>
        </div>
      </div>
      {match.winnerId !== null && me.score === opponent.score && (
        <p className="text-xs text-muted-foreground">
          점수 동점 시 먼저 제출한 쪽이 승리합니다
        </p>
      )}
    </header>
  );
}
