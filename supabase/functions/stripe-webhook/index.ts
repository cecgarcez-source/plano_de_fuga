import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

console.log("Stripe Webhook Function Loaded");

serve(async (req) => {
    const signature = req.headers.get("Stripe-Signature");

    if (!signature) {
        return new Response("No signature header", { status: 400 });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Validar configuração (opcional enviar erro detalhado para debug, mas seguro ocultar em prod)
    if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
        console.error("Missing environment variables");
        return new Response("Server configuration error", { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
        apiVersion: "2023-10-16",
        httpClient: Stripe.createFetchHttpClient(),
    });

    try {
        const body = await req.text();
        let event;

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        console.log(`Event received: ${event.type}`);

        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const userId = session.client_reference_id;

            if (userId) {
                console.log(`Upgrading user ${userId} to premium...`);

                // Usar Service Role Key para ignorar RLS e ter permissão de escrita
                const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

                const { error } = await supabase
                    .from("user_profiles")
                    .update({ subscription_tier: "premium" })
                    .eq("id", userId);

                if (error) {
                    console.error("Supabase update error:", error);
                    return new Response("Database update failed", { status: 500 });
                }

                console.log("User upgraded successfully!");
            } else {
                console.warn("No client_reference_id found in session");
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("Unexpected error:", err);
        return new Response(`Server Error: ${err.message}`, { status: 500 });
    }
});
