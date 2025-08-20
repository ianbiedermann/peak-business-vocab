import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[CHECKOUT] Payment system temporarily disabled - all features are free");

  // Payment-System ist deaktiviert - alle Features sind kostenlos
  return new Response(JSON.stringify({
    error: "Payment system is currently disabled",
    message: "All features are temporarily available for free. No payment required.",
    url: null
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
