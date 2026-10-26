import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * verify-photo: judges a capture with Claude and returns a pass/fail verdict.
 *
 * The app never talks to Anthropic. The client invokes this function with its Supabase
 * session, the function calls the model with the project's own secret, and only the verdict
 * travels back. The API key therefore never leaves Supabase, and the app bundle holds no
 * Anthropic SDK or key.
 *
 * PROTOTYPE SCOPE: this is the photo gate from ticket 08's client half. It receives the
 * photos as captured, before the privacy pipeline (pHash on the pre-blur original, face
 * blur, original discard) exists. Do not ship it to players until ticket 25 lands that
 * pipeline; see supabase/README.md.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const VERIFY_MODEL = "claude-haiku-5-5";
const MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 30_000;

/** Photos per step: Find shows the litter, Dispose shows it going into a bin. */
const PHOTOS_PER_STEP: Record<string, number> = { find: 1, dispose: 2 };

/** Largest blurred JPEG accepted from the private bucket. */
const MAX_PHOTO_BYTES = 5_000_000;

/** The private bucket that holds blurred catch photos only. */
const PHOTO_BUCKET = "catch-photos";

/**
 * Checks allowed per player per rolling 24 hours. Two per catch, so this is ~100 catches a
 * day, far above real play but far below a runaway client or a stolen session.
 */
const DAILY_LIMIT = 200;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

type VerifyStep = "find" | "dispose";

type VerifyRequest = {
  step: VerifyStep;
  /** Storage object paths under the caller's prefix, never image bytes. */
  paths: string[];
};

type Verdict = {
  pass: boolean;
  item: string;
  reason: string;
};

const SYSTEM_PROMPT =
  `You check photos for PlastiCatch, a game where players pick up litter and throw it away. Judge only what you can see in the photos. Be fair but not gullible: the photo must show a real scene, not a picture of a screen or a printed photo.

Answer with:
- pass: whether the photo meets the step's rule.
- item: a few words naming the main item you see, such as "plastic bottle" or "crisp packet".
- reason: one short sentence (under 15 words) written to the player. When the photo fails, write it so it reads naturally after "Catch failed: ", starting lowercase and ending with a full stop, for example "that looks like a shoe, not litter." When it passes, briefly say what you saw.`;

const STEP_RULES: Record<VerifyStep, string> = {
  find:
    `This is STEP 1. Pass the photo if it clearly shows a real piece of litter or trash: any discarded item such as a bottle, can, wrapper, bag, cup, carton, cigarette butt or scrap of paper. Fail it if there is no litter, if the item is clearly not trash (a shoe being worn, a pet, a person, plants), if it is too dark or blurry to tell, or if it is a picture of a screen.`,
  dispose:
    `This is STEP 2. Photo 1 is the litter the player found in STEP 1. Photo 2 is the STEP 2 photo. Pass only if photo 2 shows the same item as photo 1 (same kind, colour and shape; the angle can differ) going into, or just placed in, a trash can, recycling bin or other waste bin. Fail if it is a different item, there is no bin, the item can't be seen, or photo 2 is a picture of a screen.`,
};

const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    pass: { type: "boolean" },
    item: { type: "string" },
    reason: { type: "string" },
  },
  required: ["pass", "item", "reason"],
  additionalProperties: false,
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}

/** `{user_id}/{catch_id}/{find|dispose}.jpg` under the private bucket. */
const PHOTO_PATH = /^(?<user>[0-9a-f-]{36})\/(?<catch>[0-9a-f-]{36})\/(?<half>find|dispose)\.jpg$/i;

/**
 * Validate the body. The client sends storage paths, never image bytes: ADR-0001's guardrail is
 * that images go app → Storage directly and Edge Functions receive only small JSON.
 */
function parseRequest(
  value: unknown,
): { ok: true; request: VerifyRequest } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "invalid_payload" };
  }

  const body = value as Record<string, unknown>;
  const step = body.step;

  if (step !== "find" && step !== "dispose") {
    return { ok: false, error: "invalid_step" };
  }
  if (
    !Array.isArray(body.paths) ||
    body.paths.length !== PHOTOS_PER_STEP[step]
  ) {
    return { ok: false, error: "invalid_photo_count" };
  }

  const paths: string[] = [];
  for (const path of body.paths) {
    if (typeof path !== "string" || !PHOTO_PATH.test(path)) {
      return { ok: false, error: "invalid_photo_path" };
    }
    paths.push(path);
  }

  const halves = paths.map((path) => PHOTO_PATH.exec(path)?.groups?.half);
  const expected = step === "find" ? ["find"] : ["find", "dispose"];
  if (halves.join(",") !== expected.join(",")) {
    return { ok: false, error: "invalid_photo_order" };
  }

  return { ok: true, request: { step, paths } };
}

/** Every path must live under the caller's own user prefix. */
function ownedBy(paths: string[], userId: string): boolean {
  return paths.every((path) => PHOTO_PATH.exec(path)?.groups?.user === userId);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Read one blurred object with the service role and encode it for the model. */
async function downloadPhoto(
  admin: ReturnType<typeof createClient>,
  path: string,
): Promise<string> {
  const { data, error } = await admin.storage.from(PHOTO_BUCKET).download(path);
  if (error || !data) throw new Error(`photo_download_failed: ${error?.message ?? path}`);

  const bytes = new Uint8Array(await data.arrayBuffer());
  if (bytes.length === 0) throw new Error("photo_empty");
  if (bytes.length > MAX_PHOTO_BYTES) throw new Error("photo_too_large");
  return toBase64(bytes);
}

/** Longest reason the app's popup can show without breaking its fixed layout. */
const MAX_REASON_LENGTH = 160;

/** Collapse whitespace and cap the model's prose before it reaches the player's screen. */
function cleanText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/** Validate the model's answer; anything else is a server-side failure, never a rejection. */
function parseVerdict(value: unknown): Verdict | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const verdict = value as Record<string, unknown>;
  if (
    typeof verdict.pass !== "boolean" ||
    typeof verdict.item !== "string" ||
    typeof verdict.reason !== "string"
  ) {
    return null;
  }

  return {
    pass: verdict.pass,
    item: cleanText(verdict.item, 60),
    reason: cleanText(verdict.reason, MAX_REASON_LENGTH),
  };
}

function photoBlocks(photos: string[]): unknown[] {
  return photos.flatMap((data, index) => [
    { type: "text", text: `Photo ${index + 1}:` },
    {
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data },
    },
  ]);
}

async function askClaude(request: { step: VerifyStep; photos: string[] }): Promise<Verdict> {
  if (!ANTHROPIC_API_KEY) throw new Error("anthropic_key_missing");

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      model: VERIFY_MODEL,
      // Thinking tokens count toward this cap, so leave room beyond the short JSON answer.
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      // A yes/no photo check doesn't need deep reasoning; low effort keeps it fast and cheap.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: VERDICT_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            ...photoBlocks(request.photos),
            { type: "text", text: STEP_RULES[request.step] },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`anthropic_${response.status}: ${details.slice(0, 500)}`);
  }

  const message = await response.json();

  // Check why the model stopped before reading content: a refusal or a cut-off answer has
  // no usable verdict.
  if (message?.stop_reason !== "end_turn") {
    throw new Error(`anthropic_stop_${message?.stop_reason ?? "unknown"}`);
  }

  const text = Array.isArray(message.content)
    ? message.content.find((block: { type?: string }) => block.type === "text")
    : undefined;

  let verdict: Verdict | null = null;
  try {
    verdict = parseVerdict(JSON.parse(text?.text ?? ""));
  } catch {
    // Fall through to the error below.
  }
  if (!verdict) throw new Error("anthropic_bad_verdict");

  return verdict;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json(401, { error: "sign_in_required" });
  }

  const caller = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await caller.auth.getUser();
  const viewer = authData?.user;

  if (authError || !viewer) {
    return json(401, { error: "invalid_session" });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const parsed = parseRequest(body);
  if (!parsed.ok) return json(400, { error: parsed.error });
  if (!ownedBy(parsed.request.paths, viewer.id)) {
    return json(403, { error: "photo_path_forbidden" });
  }

  // The function fetches the blurred objects itself; the request body carries paths only.
  let photos: string[];
  try {
    photos = await Promise.all(
      parsed.request.paths.map((path) => downloadPhoto(admin, path)),
    );
  } catch (error) {
    console.error("photo download failed", error instanceof Error ? error.message : error);
    return json(502, { error: "photo_download_failed" });
  }
  const request = { step: parsed.request.step, photos };

  // Quota is checked before spending an API call, and counted in the same table that
  // records outcomes, so the limit and the audit trail cannot drift apart.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: quotaError } = await admin
    .from("photo_check_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", viewer.id)
    .gte("created_at", since);

  if (quotaError) {
    console.error("photo check quota query failed", quotaError);
    return json(500, { error: "quota_check_failed" });
  }
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json(429, {
      error: "photo_check_quota_exceeded",
      limit: DAILY_LIMIT,
      window_hours: 24,
    });
  }

  let verdict: Verdict;
  try {
    verdict = await askClaude(request);
  } catch (error) {
    const details = error instanceof Error ? error.message : "unknown_error";
    console.error("photo check failed", details);

    if (details === "anthropic_key_missing") {
      return json(503, { error: "photo_check_not_configured" });
    }

    await admin.from("photo_check_calls").insert({
      user_id: viewer.id,
      step: request.step,
      outcome: "error",
    });

    return json(502, { error: "photo_check_failed" });
  }

  const { error: logError } = await admin.from("photo_check_calls").insert({
    user_id: viewer.id,
    step: request.step,
    outcome: verdict.pass ? "pass" : "fail",
  });
  if (logError) console.error("photo check log failed", logError);

  return json(200, {
    pass: verdict.pass,
    item: verdict.item,
    reason: verdict.reason,
  });
});
