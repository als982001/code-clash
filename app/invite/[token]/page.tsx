import Link from "next/link";

import type { TInvitePageError } from "@/app/features/match/types/invite";
import { isInviteExpired } from "@/app/features/match/utils/isInviteExpired";
import { createClient } from "@/app/shared/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button-variants";

import JoinInvite from "./_components/JoinInvite";

interface IInvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: IInvitePageProps) {
  const { token } = await params;

  const { client } = await createClient();

  // 매치 row를 직접 SELECT하면 새 RLS(host/participant 한정)에 막힌다.
  // SECURITY DEFINER RPC로 우회하되, 반환 컬럼에서 invite_token은 제외되어 토큰 노출 없음.
  const { data: matches } = await client.rpc("get_invite_match_by_token", {
    p_token: token,
  });
  const match = matches?.[0];

  if (!match) {
    return <InviteErrorView reason="not_found" />;
  }

  // status를 만료보다 먼저 검사: 만료된 ongoing 매치에서도 "이미 시작됨"이 더 정확한 안내
  if (match.status === "ongoing") {
    return <InviteErrorView reason="already_started" />;
  }

  if (match.status === "finished") {
    return <InviteErrorView reason="already_finished" />;
  }

  const { expired } = isInviteExpired({ isoString: match.invite_expires_at });

  if (expired) {
    return <InviteErrorView reason="expired" />;
  }

  // participant_count는 RPC가 계산해서 함께 반환 (비로그인에서도 안내 정확).
  if ((match.participant_count ?? 0) >= 2) {
    return <InviteErrorView reason="full" />;
  }

  return <JoinInvite matchId={match.id} hostId={match.host_id} token={token} />;
}

const ERROR_MESSAGES: Record<TInvitePageError, string> = {
  not_found: "유효하지 않은 초대 링크입니다.",
  expired: "초대 링크가 만료되었습니다.",
  already_started: "이미 시작된 대전입니다.",
  already_finished: "이미 종료된 대전입니다.",
  full: "대전 방이 가득 찼습니다.",
};

function InviteErrorView({ reason }: { reason: TInvitePageError }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground"
      role="alert"
    >
      <h1 className="text-2xl font-semibold tracking-tight">초대 링크 오류</h1>
      <p className="text-sm text-muted-foreground">{ERROR_MESSAGES[reason]}</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        홈으로 돌아가기
      </Link>
    </div>
  );
}
