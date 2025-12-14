import "@testing-library/jest-dom/vitest";

// Provide safe defaults for modules that validate public env vars at import time.
// Individual tests may override as needed.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";
process.env.NEXT_PUBLIC_SITE_URL ||= "http://localhost:3000";


