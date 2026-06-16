"use client";

/**
 * Studio auth — CLIENT-SIDE entry point.
 *
 * Split out from studio-auth.ts so Client Components can import the
 * browser Supabase client without pulling in next/headers (which is
 * server-only). Server code keeps using studio-auth.ts.
 */

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Client-component Supabase client. Use in 'use client' files only. */
export function createStudioBrowserClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Studio auth: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
    );
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
