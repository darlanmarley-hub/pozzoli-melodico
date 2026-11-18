import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-syncpay-signature, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    const expectedSecret = Deno.env.get('SYNCPAY_WEBHOOK_SECRET') || '';
    const url = new URL(req.url);
    if (expectedSecret) {
      const providedSecret =
        url.searchParams.get('secret') ||
        req.headers.get('x-webhook-secret') ||
        req.headers.get('x-syncpay-signature') ||
        '';
      if (providedSecret !== expectedSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized webhook request' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = await req.json();
    const root = payload?.data && typeof payload.data === 'object' ? payload.data : payload;

    const rawStatus = String(
      payload?.action === 'refund'
        ? 'refunded'
        : root?.status || root?.payment_status || payload?.status || payload?.event || ''
    )
      .trim()
      .toLowerCase();

    const clientObj = root?.client || root?.customer || root?.buyer || payload?.client || {};
    const email = String(clientObj?.email || root?.email || payload?.email || '')
      .trim()
      .toLowerCase();

    const name = String(
      clientObj?.name || root?.name || (email ? email.split('@')[0] : 'Aluno Pozzoli Melódico')
    ).trim();

    const transactionId = String(
      root?.identifier || root?.idTransaction || root?.reference_id || root?.id || payload?.identifier || `syncpay_${Date.now()}`
    );

    const description = String(
      root?.description || root?.product_name || payload?.description || ''
    ).toLowerCase();

    const pathname = url.pathname.toLowerCase();
    const urlPlano = url.searchParams.get('plano')?.toLowerCase();
    let planType: 'anual' | 'vitalicio' = 'vitalicio';
    if (pathname.endsWith('/anual') || urlPlano === 'anual' || description.includes('anual')) {
      planType = 'anual';
    }

    await supabaseAdmin.from('webhook_raw_events').insert({
      provider: 'syncpay',
      event_type: String(payload?.event || rawStatus || 'unknown'),
      transaction_id: transactionId,
      email: email || null,
      status: rawStatus || null,
      payload,
    });

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ received: true, warning: 'E-mail do cliente ausente no payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const revokedStatuses = ['refunded', 'refund', 'chargedback', 'chargeback', 'canceled', 'cancelled', 'expired', 'med', 'dispute'];
    const pendingStatuses = ['waiting_payment', 'waiting', 'pending', 'created', 'processing'];
    const approvedStatuses = ['paid', 'approved', 'completed', 'paid_out', 'succeeded', 'confirmed', 'ativo', 'active'];

    const isRevoked = revokedStatuses.some((s) => rawStatus.includes(s));
    const isPending = pendingStatuses.some((p) => rawStatus.includes(p));
    const isPaid = Boolean(rawStatus) && !isPending && !isRevoked && approvedStatuses.some((s) => rawStatus.includes(s));

    const { data: planoRow } = await supabaseAdmin
      .from('planos')
      .select('id, nome')
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
        .select('id, stats')
        .ilike('email', email)
        .maybeSingle();

      if (existingProfile?.id) {
        userId = existingProfile.id;
      } else {
        const { data: createdUser } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: `${crypto.randomUUID()}!Pz9#${Date.now()}`,
          email_confirm: true,
          user_metadata: { full_name: name, plan: planType, transaction_code: transactionId },
        });
        if (createdUser?.user?.id) {
          userId = createdUser.user.id;
        } else {
          const { data: usersList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 });
          const found = usersList?.users?.find((u: any) => u.email?.toLowerCase() === email);
          if (found) userId = found.id;
        }
      }

      if (userId) {
        const nowIso = new Date().toISOString();
        const oneYearLaterIso = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        const currentStats = existingProfile?.stats && typeof existingProfile.stats === 'object' ? existingProfile.stats : {};

        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          email,
          name,
          plan: planType,
          stats: { ...currentStats, accessRevoked: false },
          updated_at: nowIso,
        });

        await supabaseAdmin.from('users_plano').upsert({
          id: userId,
          plano_id: planoRow?.id || null,
          data_inicio: nowIso,
          data_final: planType === 'anual' ? oneYearLaterIso : null,
          status: 'primeiro-acesso',
          updated_at: nowIso,
        });
      }

      return new Response(
        JSON.stringify({ success: true, action: 'access_granted', email, plan: planType, user_id: userId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isRevoked) {
      const nowIso = new Date().toISOString();
      await supabaseAdmin.from('authorized_purchases').delete().ilike('email', email);

      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, stats')
        .ilike('email', email)
        .maybeSingle();

      if (existingProfile?.id) {
        const currentStats = existingProfile.stats && typeof existingProfile.stats === 'object' ? existingProfile.stats : {};
        await supabaseAdmin
          .from('users_plano')
          .update({ status: 'cancelado', data_final: nowIso, updated_at: nowIso })
          .eq('id', existingProfile.id);

        await supabaseAdmin
          .from('profiles')
          .update({
            plan: 'cancelado',
            stats: { ...currentStats, activeDeviceSession: null, accessRevoked: true, revokedAt: nowIso },
            updated_at: nowIso,
          })
          .eq('id', existingProfile.id);

        await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
          password: `${crypto.randomUUID()}!Revoked9`,
        });
      }

      return new Response(
        JSON.stringify({ success: true, action: 'access_revoked', email }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ received: true, action: 'ignored_status', status: rawStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erro no webhook SyncPay:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
