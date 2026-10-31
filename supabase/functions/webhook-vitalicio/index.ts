import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-syncpay-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================================================
// ENDPOINT EXCLUSIVO: PLANO VITALÍCIO (SYNCPAY)
// URL: https://ejjemzuvyzmxyjteeonz.supabase.co/functions/v1/webhook-vitalicio
// ============================================================================
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = await req.json();
    const root = payload?.data && typeof payload.data === 'object' ? payload.data : payload;

    const rawStatus = String(root?.status || payload?.status || payload?.event || '').toLowerCase();
    const clientObj = root?.client || root?.customer || root?.buyer || payload?.client || {};
    const email = String(clientObj?.email || root?.email || payload?.email || '').trim().toLowerCase();
    const name = String(clientObj?.name || root?.name || (email ? email.split('@')[0] : 'Aluno Pozzoli')).trim();
    const transactionId = String(
      root?.identifier || root?.idTransaction || root?.reference_id || root?.id || payload?.identifier || `syncpay_vit_${Date.now()}`
    );

    const planType = 'vitalicio';

    // 1. Salva o log bruto em webhook_raw_events
    await supabaseAdmin.from('webhook_raw_events').insert({
      provider: 'syncpay-vitalicio',
      event_type: String(payload?.event || rawStatus || 'unknown'),
      transaction_id: transactionId,
      email: email || null,
      status: rawStatus,
      payload,
    });

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ received: true, warning: 'E-mail do cliente ausente no payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isPaid = ['paid', 'approved', 'completed', 'paid_out', 'succeeded', 'confirmed', 'ativo'].includes(rawStatus);
    const isRevoked = ['refunded', 'chargedback', 'canceled', 'cancelled', 'expired'].includes(rawStatus);

    const { data: planoRow } = await supabaseAdmin
      .from('planos')
      .select('id')
      .eq('nome', planType)
      .maybeSingle();

    if (isPaid) {
      await supabaseAdmin.from('authorized_purchases').upsert(
        { email, plan: planType, transaction_code: transactionId },
        { onConflict: 'email' }
      );

      let userId: string | null = null;
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle();

      if (existingProfile?.id) {
        userId = existingProfile.id;
      } else {
        const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: 'Pozzoli123!',
          email_confirm: true,
          user_metadata: { full_name: name, plan: planType, transaction_code: transactionId },
        });

        if (!createError && createdUser?.user?.id) {
          userId = createdUser.user.id;
        } else {
          const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
          const found = usersList?.users?.find((u) => u.email?.toLowerCase() === email);
          if (found) userId = found.id;
        }
      }

      if (userId) {
        const nowIso = new Date().toISOString();
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          email,
          name,
          plan: planType,
          updated_at: nowIso,
        });

        await supabaseAdmin.from('users_plano').upsert({
          id: userId,
          plano_id: planoRow?.id || '413e1deb-62db-493e-88ad-787d10dd955d',
          data_inicio: nowIso,
          data_final: null, // Vitalício = NULL
          status: 'primeiro-acesso',
          updated_at: nowIso,
        });
      }

      return new Response(
        JSON.stringify({ success: true, plan: 'vitalicio', email, user_id: userId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isRevoked) {
      await supabaseAdmin.from('authorized_purchases').delete().ilike('email', email);
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle();

      if (existingProfile?.id) {
        await supabaseAdmin
          .from('users_plano')
          .update({ status: 'cancelado', updated_at: new Date().toISOString() })
          .eq('id', existingProfile.id);
      }

      return new Response(
        JSON.stringify({ success: true, action: 'access_revoked', email }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ received: true, status: rawStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erro no webhook-vitalicio:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

