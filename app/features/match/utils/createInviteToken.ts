import { randomBytes } from "node:crypto";

/**
 * 친구 초대 링크용 random token을 생성한다.
 * Node.js 기본 runtime에서만 동작 (Edge runtime에서는 node:crypto 미지원).
 * 16바이트(128비트) random을 base64url 인코딩하면 22자가 되며, 충돌 확률은 무시 가능하다.
 * @return token base64url 인코딩된 16바이트 random 문자열
 */
export function createInviteToken(): { token: string } {
  return { token: randomBytes(16).toString("base64url") };
}
