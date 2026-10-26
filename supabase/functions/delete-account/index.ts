import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
  "SUPABASE_SERVICE_ROLE_KEY",
);

const BUCKET = "catch-photos";
const PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 100;
const MAX_CLEANUP_PASSES = 3;
const MAX_FOLDER_DEPTH = 10;
const MAX_AUTH_AGE_SECONDS = 300;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// This only reads the token payload. The token is independently validated
// by Supabase Auth with getUser() before these claims are trusted.
function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(
      binary,
      (character) => character.charCodeAt(0),
    );

    const parsed: unknown = JSON.parse(
      new TextDecoder().decode(bytes),
    );

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getAuthenticationTime(
  claims: Record<string, unknown>,
): number | null {
  // Use auth_time if this project happens to include it.
  if (
    typeof claims.auth_time === "number" &&
    Number.isFinite(claims.auth_time)
  ) {
    return claims.auth_time;
  }

  // Supabase commonly provides the original sign-in time in amr instead.
  // Ignore token_refresh entries: refreshing a session must not count
  // as signing in again.
  if (!Array.isArray(claims.amr)) {
    return null;
  }

  const timestamps = claims.amr
    .filter(isRecord)
    .filter((entry) => {
      return (
        typeof entry.method === "string" &&
        entry.method.toLowerCase() !== "token_refresh" &&
        typeof entry.timestamp === "number" &&
        Number.isFinite(entry.timestamp)
      );
    })
    .map((entry) => entry.timestamp as number);

  if (timestamps.length === 0) {
    return null;
  }

  return Math.max(...timestamps);
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

  const accessToken = authorization.slice("Bearer ".length).trim();

  if (!accessToken) {
    return json(401, { error: "sign_in_required" });
  }

  const caller = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  // Keep service-role access on the server only.
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

  // First ask Supabase Auth to validate the access token.
  const { data: authData, error: authError } =
    await caller.auth.getUser(accessToken);

  const user = authData?.user;

  if (authError || !user) {
    console.error("delete-account token validation failed", authError);
    return json(401, { error: "invalid_session" });
  }

  // Read claims only after Supabase has validated the token.
  const claims = decodeJwtPayload(accessToken);

  if (
    !claims ||
    typeof claims.sub !== "string" ||
    claims.sub !== user.id
  ) {
    return json(401, { error: "invalid_session" });
  }

  const authTime = getAuthenticationTime(claims);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (authTime === null) {
    return json(401, {
      error: "reauthentication_required",
      message:
        "Could not verify the sign-in time. Sign in again before deleting your account.",
    });
  }

  if (
    authTime < nowSeconds - MAX_AUTH_AGE_SECONDS ||
    authTime > nowSeconds + 60
  ) {
    return json(401, {
      error: "reauthentication_required",
      message: "Sign in again before deleting your account.",
    });
  }

  // Validate confirmation before deleting anything.
  let body: { confirmation?: unknown };

  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  if (
    !isRecord(body) ||
    typeof body.confirmation !== "string"
  ) {
    return json(400, { error: "confirmation_required" });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("delete-account profile lookup failed", profileError);
    return json(500, { error: "profile_lookup_failed" });
  }

  const username =
    typeof profile?.username === "string"
      ? profile.username.trim()
      : "";

  const confirmation = body.confirmation.trim();

  if (username) {
    if (confirmation.toLowerCase() !== username.toLowerCase()) {
      return json(400, { error: "confirmation_mismatch" });
    }
  } else if (confirmation !== "DELETE") {
    return json(400, {
      error: "confirmation_mismatch",
      message: "Type DELETE to confirm account deletion.",
    });
  }

  // Collect files only under this user's own Storage folder.
  const listUserFiles = async (): Promise<string[]> => {
    const paths: string[] = [];

    const walkFolder = async (
      folder: string,
      depth: number,
    ): Promise<void> => {
      if (depth > MAX_FOLDER_DEPTH) {
        throw new Error("storage_folder_depth_exceeded");
      }

      let offset = 0;

      while (true) {
        const { data: entries, error } = await admin.storage
          .from(BUCKET)
          .list(folder, {
            limit: PAGE_SIZE,
            offset,
            sortBy: {
              column: "name",
              order: "asc",
            },
          });

        if (error) {
          throw new Error("storage_list_failed");
        }

        const items = entries ?? [];

        for (const entry of items) {
          if (
            !entry.name ||
            entry.name === "." ||
            entry.name === ".." ||
            entry.name.includes("/")
          ) {
            throw new Error("invalid_storage_entry");
          }

          const path = `${folder}/${entry.name}`;

          if (entry.id === null) {
            await walkFolder(path, depth + 1);
          } else {
            paths.push(path);
          }
        }

        if (items.length < PAGE_SIZE) {
          break;
        }

        offset += items.length;
      }
    };

    await walkFolder(user.id, 0);
    return paths;
  };

  try {
    // Retry cleanup to catch files created during earlier passes.
    for (let pass = 0; pass < MAX_CLEANUP_PASSES; pass++) {
      const paths = await listUserFiles();

      if (paths.length === 0) {
        break;
      }

      for (
        let i = 0;
        i < paths.length;
        i += DELETE_BATCH_SIZE
      ) {
        const batch = paths.slice(i, i + DELETE_BATCH_SIZE);

        const { error: removeError } = await admin.storage
          .from(BUCKET)
          .remove(batch);

        if (removeError) {
          throw new Error("storage_remove_failed");
        }
      }
    }

    // Do not delete the Auth account unless its photos are gone.
    const remainingPaths = await listUserFiles();

    if (remainingPaths.length > 0) {
      console.error(
        "delete-account found remaining Storage objects",
        { count: remainingPaths.length },
      );

      return json(500, {
        error: "photo_cleanup_incomplete_account_not_deleted",
      });
    }
  } catch (error) {
    console.error("delete-account Storage cleanup failed", error);

    return json(500, {
      error: "photo_cleanup_failed_account_not_deleted",
    });
  }

  // Delete the Auth user last. Existing ON DELETE CASCADE relationships
  // should remove their profile, catches, verification attempts, and XP.
  const { error: deleteUserError } =
    await admin.auth.admin.deleteUser(user.id);

  if (deleteUserError) {
    console.error(
      "delete-account Auth deletion failed after photo cleanup",
      deleteUserError,
    );

    return json(500, {
      error: "photos_removed_account_deletion_failed",
    });
  }

  return json(200, {
    success: true,
    account_deleted: true,
    photos_deleted: true,
  });
});