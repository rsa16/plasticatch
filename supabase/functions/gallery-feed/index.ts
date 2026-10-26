
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const SIGNED_URL_TTL_SECONDS = 600;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 30;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

type GalleryCursor = {
  verdict_at: string;
  id: string;
};

type GalleryRequest = {
  limit?: number;
  cursor?: GalleryCursor | null;
};

type CatchRow = {
  id: string;
  user_id: string;
  find_photo_path: string;
  dispose_photo_path: string;
  state_code: string | null;
  verdict_at: string;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
}

function parseCursor(
  value: unknown,
): GalleryCursor | null | false {
  if (value === undefined || value === null) return null;

  if (
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const cursor = value as Record<string, unknown>;

  if (
    typeof cursor.verdict_at !== "string" ||
    !Number.isFinite(Date.parse(cursor.verdict_at)) ||
    !isUuid(cursor.id)
  ) {
    return false;
  }

  return {
    verdict_at: new Date(cursor.verdict_at).toISOString(),
    id: cursor.id,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return json(500, { error: "server_configuration_missing" });
  }

  const authorization = req.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return json(401, { error: "sign_in_required" });
  }

  // Verify the caller's session first.
  const caller = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: authorization },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  // This privileged client must remain server-side only.
  const admin = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const {
    data: authData,
    error: authError,
  } = await caller.auth.getUser();

  const viewer = authData?.user;

  if (authError || !viewer) {
    return json(401, { error: "invalid_session" });
  }

  let body: GalleryRequest;

  try {
    body = await req.json() as GalleryRequest;
  } catch {
    return json(400, { error: "invalid_json" });
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return json(400, { error: "invalid_payload" });
  }

  let limit = DEFAULT_PAGE_SIZE;

  if (body.limit !== undefined) {
    if (
      !Number.isInteger(body.limit) ||
      body.limit < 1
    ) {
      return json(400, { error: "invalid_limit" });
    }

    limit = Math.min(body.limit, MAX_PAGE_SIZE);
  }

  const cursor = parseCursor(body.cursor);

  if (cursor === false) {
    return json(400, { error: "invalid_cursor" });
  }

  // PERSONAL GALLERY:
  // Only query catches owned by the authenticated user.
  // There is no public-feed query or blocking lookup.
  let query = admin
    .from("catches")
    .select(
      "id,user_id,find_photo_path,dispose_photo_path,state_code,verdict_at",
    )
    .eq("user_id", viewer.id)
    .eq("status", "verified")
    .eq("verdict", "verified")
    .not("verdict_at", "is", null)
    .not("find_photo_path", "is", null)
    .not("dispose_photo_path", "is", null)
    .order("verdict_at", { ascending: false })
    .order("id", { ascending: false });

  if (cursor) {
    query = query.or(
      `verdict_at.lt.${cursor.verdict_at},and(verdict_at.eq.${cursor.verdict_at},id.lt.${cursor.id})`,
    );
  }

  const {
    data: rows,
    error: catchesError,
  } = await query.limit(limit + 1);

  if (catchesError) {
    console.error("my gallery catch query failed", catchesError);
    return json(500, { error: "gallery_query_failed" });
  }

  const candidates = (rows ?? []) as CatchRow[];
  const hasMore = candidates.length > limit;
  const page = candidates.slice(0, limit);

  // Only sign image paths that match the expected layout:
  // user_id/catch_id/find.jpg and user_id/catch_id/dispose.jpg
  for (const row of page) {
    if (
      row.user_id !== viewer.id ||
      row.find_photo_path !==
        `${viewer.id}/${row.id}/find.jpg` ||
      row.dispose_photo_path !==
        `${viewer.id}/${row.id}/dispose.jpg`
    ) {
      console.error(
        "my gallery encountered an unexpected photo path",
        row.id,
      );

      return json(500, { error: "photo_path_invalid" });
    }
  }

  if (page.length === 0) {
    return json(200, {
      items: [],
      next_cursor: null,
    });
  }

  // Look up only the signed-in user's username.
  const {
    data: profile,
    error: profileError,
  } = await admin
    .from("profiles")
    .select("username")
    .eq("id", viewer.id)
    .maybeSingle();

  if (profileError) {
    console.error("my gallery profile lookup failed", profileError);
    return json(500, { error: "profile_lookup_failed" });
  }

  const photoPaths = page.flatMap((row) => [
    row.find_photo_path,
    row.dispose_photo_path,
  ]);

  // Signed URLs expire after 10 minutes.
  const {
    data: signedPhotos,
    error: signError,
  } = await admin.storage
    .from("catch-photos")
    .createSignedUrls(
      photoPaths,
      SIGNED_URL_TTL_SECONDS,
    );

  if (
    signError ||
    !signedPhotos ||
    signedPhotos.length !== photoPaths.length
  ) {
    console.error(
      "my gallery signed URL creation failed",
      signError,
    );

    return json(500, {
      error: "photo_url_signing_failed",
    });
  }

  const items = page.map((row, index) => {
    const findUrl = signedPhotos[index * 2]?.signedUrl;
    const disposeUrl = signedPhotos[index * 2 + 1]?.signedUrl;

    if (!findUrl || !disposeUrl) {
      return null;
    }

    return {
      catch_id: row.id,
      username: profile?.username ?? null,
      state_code: row.state_code?.trim() || null,
      verdict_at: row.verdict_at,
      find_photo_url: findUrl,
      dispose_photo_url: disposeUrl,
      is_own: true,
    };
  });

  if (items.some((item) => item === null)) {
    console.error(
      "my gallery could not sign one or more photo URLs",
    );

    return json(500, {
      error: "photo_url_signing_failed",
    });
  }

  const lastReturned = page[page.length - 1];

  return json(200, {
    items,
    next_cursor: hasMore && lastReturned
      ? {
          verdict_at: lastReturned.verdict_at,
          id: lastReturned.id,
        }
      : null,
  });
});
