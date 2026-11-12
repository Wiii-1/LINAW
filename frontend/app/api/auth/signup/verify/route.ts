import { env } from "cloudflare:workers";

const ACCESS_TOKEN_MAX_AGE = 60 * 60;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

type VerifyResponse = {
  success?: boolean;
  message?: string;
  error?: { message?: string };
  result?: { accessToken?: string; refreshToken?: string };
};

export async function POST(request: Request): Promise<Response> {
  const apiUrl = (env as typeof env & { LINAW_API_URL?: string }).LINAW_API_URL;
  if (!apiUrl) {
    return Response.json({ success: false, message: "Authentication service is not configured." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: "Invalid verification request." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiUrl.replace(/\/+$/, "")}/api/auth/signup/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return Response.json({ success: false, message: "Unable to reach the authentication service." }, { status: 502 });
  }

  const data = (await upstream.json().catch(() => ({}))) as VerifyResponse;
  if (!upstream.ok || data.success !== true) {
    return Response.json(
      { success: false, message: data.message ?? data.error?.message ?? "Verification failed." },
      { status: upstream.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const accessToken = data.result?.accessToken;
  const refreshToken = data.result?.refreshToken;
  if (!accessToken || !refreshToken) {
    return Response.json({ success: false, message: "Invalid response from authentication service." }, { status: 502 });
  }

  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
  headers.append("Set-Cookie", `accessToken=${encodeURIComponent(accessToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${ACCESS_TOKEN_MAX_AGE}${secure}`);
  headers.append("Set-Cookie", `refreshToken=${encodeURIComponent(refreshToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${REFRESH_TOKEN_MAX_AGE}${secure}`);

  return new Response(JSON.stringify({ success: true, message: data.message ?? "Account created successfully." }), { status: 201, headers });
}
