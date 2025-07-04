import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  return new Response(JSON.stringify({ secret }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}); 