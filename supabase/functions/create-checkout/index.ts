import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno"

console.log("Create Checkout Function Loaded")

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const authHeader = req.headers.get('Authorization');

        console.log(`[Debug] URL: ${supabaseUrl.substring(0, 20)}...`);
        console.log(`[Debug] Auth Header Present: ${!!authHeader}`);

        const supabaseClient = createClient(
            supabaseUrl,
            supabaseAnonKey,
            { global: { headers: { Authorization: authHeader! } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

        if (userError) {
            console.error('[Debug] getUser Error:', userError);
        }

        if (!user) {
            console.error('[Debug] User is null. Auth failed.');
            return new Response("Unauthorized", { status: 401, headers: corsHeaders })
        }

        const { priceId, returnUrl } = await req.json()

        // Default to the origin from the request if returnUrl not provided
        // Ideally the frontend sends the exact return URL

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
            apiVersion: '2023-10-16',
            httpClient: Stripe.createFetchHttpClient(),
        })

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${returnUrl}?upgrade=success`,
            cancel_url: returnUrl,
            client_reference_id: user.id,
            customer_email: user.email,
        })

        return new Response(
            JSON.stringify({ url: session.url }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
