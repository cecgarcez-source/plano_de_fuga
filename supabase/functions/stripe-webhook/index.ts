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
            event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        } catch (err) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        console.log(`Event received: ${event.type}`);

        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const userId = session.client_reference_id;

            if (userId) {
                console.log(`Adding 30 cards to user ${userId}...`);

                // Usar Service Role Key para ignorar RLS e ter permissão de escrita
                const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

                // Pegar os créditos atuais, usando maybeSingle para não quebrar se não existir
                const { data: profile } = await supabase
                    .from("user_profiles")
                    .select("plan_credits, travel_style, interests")
                    .eq("id", userId)
                    .maybeSingle();

                // Verifica se tem plano_credits, ou recai para 3. Trata tbm erro de digitação do user
                let currentCredits = 3;
                if (profile) {
                    if (profile.plan_credits !== undefined && profile.plan_credits !== null) {
                        currentCredits = profile.plan_credits;
                    } else if ('plam_credits' in profile && (profile as any).plam_credits !== undefined) {
                        currentCredits = (profile as any).plam_credits;
                    }
                }

                // UPSERT: Atualiza se existir, Cria se não existir!
                const newCredits = currentCredits + 30;
                
                const { error } = await supabase
                    .from("user_profiles")
                    .upsert({ 
                        id: userId, 
                        plan_credits: newCredits,
                        travel_style: profile?.travel_style || [],
                        interests: profile?.interests || []
                    }, { onConflict: 'id' });

                if (error) {
                    console.error("Supabase upsert error:", error);
                    return new Response("Database update failed", { status: 500 });
                }

                console.log("30 Cards added successfully!");
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
