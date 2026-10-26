// PlastiCatch verify-catch Edge Function
// Deterministic verification only: no Gemini, no LLM, no vision-AI call.
// Deploy as: supabase/functions/verify-catch/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const MIN_DISTANCE_M = 10;
const MAX_DISTANCE_M = 500;
const MIN_ELAPSED_S = 15;
const MAX_ELAPSED_S = 30 * 60;
const MAX_GPS_ACCURACY_M = 30;
const PHASH_HAMMING_THRESHOLD = 8;
const DUPLICATE_WINDOW_DAYS = 30;

type Capture = {
  path: string;
  lat: number;
  lng: number;
  accuracy_m: number;
  at: string;
  mock: boolean | null;
  p_hash: string;
};

type VerifyRequest = {
  catch_id: string;
  find: Capture;
  dispose: Capture;
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validCapture(value: unknown): value is Capture {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return typeof c.path === "string" &&
    isFiniteNumber(c.lat) && c.lat >= -90 && c.lat <= 90 &&
    isFiniteNumber(c.lng) && c.lng >= -180 && c.lng <= 180 &&
    isFiniteNumber(c.accuracy_m) && c.accuracy_m >= 0 &&
    typeof c.at === "string" && Number.isFinite(Date.parse(c.at)) &&
    (typeof c.mock === "boolean" || c.mock === null) &&
    typeof c.p_hash === "string" && /^[0-9a-f]{16}$/i.test(c.p_hash);
}

// The API contract describes a 64-bit pHash in hex: 16 hex characters → 64 bits.
function hexHashToBits(hex: string): string {
  return BigInt(`0x${hex}`).toString(2).padStart(64, "0");
}

function hamming(a: unknown, b: unknown): number | null {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== 64 || b.length !== 64) {
    return null;
  }
  let n = 0;
  for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++;
  return n;
}

function safeString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

Deno.serve(async (req: Request) => {
  const requestStartedAt = Date.now();
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return response(405, { error: "method_not_allowed" });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return response(500, { error: "server_configuration_missing" });
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return response(401, { error: "sign_in_required" });
  }

  const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await caller.auth.getUser();
  const user = authData?.user;
  if (authError || !user) return response(401, { error: "invalid_session" });

  let body: VerifyRequest;
  try {
    body = await req.json() as VerifyRequest;
  } catch {
    return response(400, { error: "invalid_json" });
  }

  if (!body || !validUuid(body.catch_id) || !validCapture(body.find) || !validCapture(body.dispose)) {
    return response(400, {
      error: "invalid_payload",
      details: "Expected catch_id and find/dispose objects; p_hash must be a 64-bit hash encoded as 16 hex characters.",
    });
  }

  const catchId = body.catch_id;
  const expectedFindPath = `${user.id}/${catchId}/find.jpg`;
  const expectedDisposePath = `${user.id}/${catchId}/dispose.jpg`;
  if (body.find.path !== expectedFindPath || body.dispose.path !== expectedDisposePath) {
    return response(400, { error: "invalid_photo_path" });
  }

  // The find half is created by the signed-in user before this call. Only the
  // owner may create it, and its find columns cannot be updated by the client.
  const { data: existing, error: existingError } = await admin
    .from("catches")
    .select("id,user_id,status,verdict,find_photo_path,find_geom,find_at,find_p_hash,dispose_photo_path,dispose_geom,dispose_at,dispose_p_hash,distance_m,elapsed_s,state_code,xp_awarded")
    .eq("id", catchId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) return response(500, { error: "catch_lookup_failed", details: existingError.message });
  if (!existing) return response(404, { error: "catch_not_found" });

  // A retried request after successful verification may be used to recover the
  // XP response if a previous network failure happened after the verdict write.
  if (existing.status === "verified" && existing.verdict === "verified") {
    const { data: award, error: awardError } = await admin.rpc("award_catch_xp", {
      p_catch_id: catchId,
      p_user_id: user.id,
    });
    if (awardError) return response(500, { error: "xp_award_failed", details: awardError.message });
    return response(200, { verdict: "verified", rejection_code: null, xp_breakdown: award, already_verified: true });
  }

  if (existing.status !== "awaiting_dispose" || existing.verdict !== "pending") {
    return response(409, { error: "catch_not_waiting_for_dispose", status: existing.status, verdict: existing.verdict });
  }
  if (existing.find_photo_path !== body.find.path || !existing.find_at || !existing.find_p_hash) {
    return response(409, { error: "find_photo_data_mismatch" });
  }
  if (Date.parse(existing.find_at) !== Date.parse(body.find.at) || existing.find_p_hash !== hexHashToBits(body.find.p_hash)) {
    return response(400, { error: "find_metadata_mismatch" });
  }
  if (!existing.find_geom) return response(400, { error: "find_location_missing" });

  // Atomically claim the catch by changing its status. A duplicate request can't
  // run verification concurrently because only awaiting_dispose rows are claimed.
  const claimTime = new Date().toISOString();
  const { data: claimed, error: claimError } = await admin
    .from("catches")
    .update({
      status: "verifying",
      dispose_photo_path: body.dispose.path,
      dispose_geom: `SRID=4326;POINT(${body.dispose.lng} ${body.dispose.lat})`,
      dispose_at: body.dispose.at,
      dispose_p_hash: hexHashToBits(body.dispose.p_hash),
      updated_at: claimTime,
    })
    .eq("id", catchId)
    .eq("user_id", user.id)
    .eq("status", "awaiting_dispose")
    .eq("verdict", "pending")
    .select("id,user_id,find_at,find_p_hash,distance_m,elapsed_s,find_geom,dispose_geom")
    .maybeSingle();

  if (claimError) return response(500, { error: "catch_update_failed", details: claimError.message });
  if (!claimed) return response(409, { error: "catch_already_being_verified" });

  try {
    const findAtMs = Date.parse(body.find.at);
    const disposeAtMs = Date.parse(body.dispose.at);
    const nowMs = Date.now();
    const elapsedS = claimed.elapsed_s as number | null;
    const distanceM = claimed.distance_m as number | null;
    const findHash = hexHashToBits(body.find.p_hash);
    const disposeHash = hexHashToBits(body.dispose.p_hash);
    const withinCatchDistance = hamming(findHash, disposeHash);

    const cutoff = new Date(nowMs - DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: priorCatches, error: priorError } = await admin
      .from("catches")
      .select("id,find_p_hash,dispose_p_hash")
      .eq("user_id", user.id)
      .neq("id", catchId)
      .gte("find_at", cutoff)
      .not("find_at", "is", null);
    if (priorError) throw new Error(`duplicate_scan_failed: ${priorError.message}`);

    let duplicateFind = false;
    let duplicateDispose = false;
    for (const prior of priorCatches ?? []) {
      if (!duplicateFind && hamming(findHash, prior.find_p_hash) !== null &&
          (hamming(findHash, prior.find_p_hash) as number) <= PHASH_HAMMING_THRESHOLD) {
        duplicateFind = true;
      }
      if (!duplicateDispose && hamming(disposeHash, prior.dispose_p_hash) !== null &&
          (hamming(disposeHash, prior.dispose_p_hash) as number) <= PHASH_HAMMING_THRESHOLD) {
        duplicateDispose = true;
      }
      if (duplicateFind && duplicateDispose) break;
    }

    const { data: stateCode, error: stateError } = await admin.rpc("resolve_state_code", {
      p_lon: body.find.lng,
      p_lat: body.find.lat,
    });
    if (stateError) throw new Error(`state_lookup_failed: ${stateError.message}`);

    // The app blocks stale GPS fixes at capture time, as required by spec.md.
    // The current API contract contains the photo timestamp but not a separate
    // GPS-fix timestamp, so this function cannot independently measure fix age.
    const findAccuracyPass = body.find.accuracy_m <= MAX_GPS_ACCURACY_M;
    const disposeAccuracyPass = body.dispose.accuracy_m <= MAX_GPS_ACCURACY_M;
    const timestampsNotFuture = findAtMs <= nowMs && disposeAtMs <= nowMs;
    const mockPass = body.find.mock !== true && body.dispose.mock !== true;
    const distanceAvailable = typeof distanceM === "number" && Number.isFinite(distanceM);
    const elapsedAvailable = typeof elapsedS === "number" && Number.isFinite(elapsedS);

    const gates: Record<string, unknown> = {
      live_in_app_camera_only: { passed: null, enforcement: "client", note: "No picker/media-library path; the server cannot inspect the capture UI." },
      gps_fix_freshness: { passed: null, enforcement: "client", note: "No separate GPS-fix timestamp exists in the request contract." },
      find_gps_accuracy: { passed: findAccuracyPass, value_m: body.find.accuracy_m, max_m: MAX_GPS_ACCURACY_M },
      dispose_gps_accuracy: { passed: disposeAccuracyPass, value_m: body.dispose.accuracy_m, max_m: MAX_GPS_ACCURACY_M },
      capture_timestamps_not_future: { passed: timestampsNotFuture },
      mock_location: {
        passed: mockPass,
        find: body.find.mock,
        dispose: body.dispose.mock,
        unknown_is_fail_open: true,
      },
      distance_min: { passed: distanceAvailable && distanceM! >= MIN_DISTANCE_M, value_m: distanceM, min_m: MIN_DISTANCE_M },
      distance_max: { passed: distanceAvailable && distanceM! <= MAX_DISTANCE_M, value_m: distanceM, max_m: MAX_DISTANCE_M },
      elapsed_min: { passed: elapsedAvailable && elapsedS! >= MIN_ELAPSED_S, value_s: elapsedS, min_s: MIN_ELAPSED_S },
      elapsed_max: { passed: elapsedAvailable && elapsedS! <= MAX_ELAPSED_S, value_s: elapsedS, max_s: MAX_ELAPSED_S },
      duplicate_find_photo: { passed: !duplicateFind, duplicate: duplicateFind, hamming_threshold: PHASH_HAMMING_THRESHOLD },
      duplicate_dispose_photo: { passed: !duplicateDispose, duplicate: duplicateDispose, hamming_threshold: PHASH_HAMMING_THRESHOLD },
      find_dispose_photos_differ: {
        passed: withinCatchDistance !== null && withinCatchDistance > PHASH_HAMMING_THRESHOLD,
        hamming_distance: withinCatchDistance,
        required_min_exclusive: PHASH_HAMMING_THRESHOLD,
      },
    };

    let rejectionCode: string | null = null;
    if (body.find.mock === true || body.dispose.mock === true) rejectionCode = "mock_location";
    else if (!findAccuracyPass || !disposeAccuracyPass || !timestampsNotFuture || !distanceAvailable || !elapsedAvailable) rejectionCode = "gps_unreliable";
    else if (distanceM! < MIN_DISTANCE_M) rejectionCode = "too_close";
    else if (distanceM! > MAX_DISTANCE_M) rejectionCode = "too_far";
    else if (elapsedS! < MIN_ELAPSED_S) rejectionCode = "too_soon";
    else if (elapsedS! > MAX_ELAPSED_S) rejectionCode = "too_slow";
    else if (duplicateFind || duplicateDispose) rejectionCode = "duplicate_photo";
    else if (withinCatchDistance === null || withinCatchDistance <= PHASH_HAMMING_THRESHOLD) rejectionCode = "reused_photo";

    const passed = rejectionCode === null;
    const { data: lastAttempt, error: attemptLookupError } = await admin
      .from("verification_attempts")
      .select("attempt_no")
      .eq("catch_id", catchId)
      .order("attempt_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (attemptLookupError) throw new Error(`attempt_lookup_failed: ${attemptLookupError.message}`);
    const attemptNo = (lastAttempt?.attempt_no ?? 0) + 1;
    const finishedAt = new Date().toISOString();
    const signals = {
      find_mock_unknown: body.find.mock === null,
      dispose_mock_unknown: body.dispose.mock === null,
      gps_fix_freshness_server_check: "unavailable_without_fix_timestamp",
    };

    const { error: attemptInsertError } = await admin.from("verification_attempts").insert({
      id: crypto.randomUUID(),
      catch_id: catchId,
      attempt_no: attemptNo,
      gates,
      soft_signals: signals,
      outcome: passed ? "verified" : "rejected",
      rejection_code: rejectionCode,
      latency_ms: Math.max(0, Date.now() - requestStartedAt),
      created_at: finishedAt,
    });
    if (attemptInsertError) throw new Error(`attempt_insert_failed: ${attemptInsertError.message}`);

    const { error: verdictError } = await admin.from("catches").update({
      status: passed ? "verified" : "rejected",
      verdict: passed ? "verified" : "rejected",
      verdict_at: finishedAt,
      state_code: stateCode ?? null,
      updated_at: finishedAt,
    }).eq("id", catchId).eq("user_id", user.id);
    if (verdictError) throw new Error(`verdict_update_failed: ${verdictError.message}`);

    if (!passed) {
      return response(200, { verdict: "rejected", rejection_code: rejectionCode, xp_breakdown: null, gates });
    }

    const { data: award, error: awardError } = await admin.rpc("award_catch_xp", {
      p_catch_id: catchId,
      p_user_id: user.id,
    });
    if (awardError) {
      // The catch remains verified. A retry can safely call this function again;
      // award_catch_xp is idempotent once ledger rows exist.
      return response(500, { error: "xp_award_failed", details: awardError.message, verdict: "verified" });
    }

    return response(200, { verdict: "verified", rejection_code: null, xp_breakdown: award, gates });
  } catch (error) {
    // Don't silently leave the catch locked in "verifying" for routine failures.
    const details = error instanceof Error ? error.message : "unknown_error";
    await admin.from("catches").update({
      status: "awaiting_dispose",
      dispose_photo_path: null,
      dispose_geom: null,
      dispose_at: null,
      dispose_p_hash: null,
      updated_at: new Date().toISOString(),
    }).eq("id", catchId).eq("user_id", user.id).eq("status", "verifying");
    return response(500, { error: "verification_failed", details });
  }
});
