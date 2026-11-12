import { env } from "cloudflare:workers";

type ResendResponse = {
  success?: boolean;
  message?: string;
  error?: { message?: string };
  result?: { expires_at?: string; resend_available_at?: string };
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
    return Response.json({ success: false, message: "Invalid resend request." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiUrl.replace(/\/+$/, "")}/api/auth/signup/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return Response.json({ success: false, message: "Unable to reach the authentication service." }, { status: 502 });
  }

  const data = (await upstream.json().catch(() => ({}))) as ResendResponse;
  return Response.json(
    {
      success: upstream.ok && data.success === true,
      message: data.message ?? data.error?.message ?? "Unable to resend verification code.",
      ...(data.result ? { result: data.result } : {}),
    },
    { status: upstream.status, headers: { "Cache-Control": "no-store" } },
  );
}
