import InviteCard from "./_components/InviteCard";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="w-full max-w-3xl space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
        <p className="text-sm text-muted-foreground">
          친구를 초대해서 1:1 대전을 시작하세요.
        </p>
      </div>

      <InviteCard />
    </div>
  );
}
