import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-syncpay-signature',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = await req.json();
    const url = new URL(req.url);

    // 1. Extrai campos do payload do SyncPay (suporta formato direto ou aninhado em data)
    const root = payload?.data && typeof payload.data === 'object' ? payload.data : payload;

    const rawStatus = String(
      root?.status || payload?.status || payload?.event || ''
    ).toLowerCase();

    const clientObj = root?.client || root?.customer || root?.buyer || payload?.client || {};
    const email = String(
      clientObj?.email || root?.email || payload?.email || ''
    )
      .trim()
      .toLowerCase();

    const name = String(
      clientObj?.name || root?.name || (email ? email.split('@')[0] : 'Aluno Pozzoli')
    ).trim();

    const transactionId = String(
      root?.identifier || root?.idTransaction || root?.reference_id || root?.id || payload?.identifier || `syncpay_${Date.now()}`
    );

    const description = String(
      root?.description || root?.product_name || payload?.description || ''
    ).toLowerCase();

    // 2. Define qual plano ('anual' ou 'vitalicio')
    // Suporta sub-rotas (/vitalicio ou /anual), query param (?plano=anual | ?plano=vitalicio) ou descrição
    const pathname = url.pathname.toLowerCase();
    const urlPlano = url.searchParams.get('plano')?.toLowerCase();
    let planType: 'anual' | 'vitalicio' = 'vitalicio';
    if (pathname.endsWith('/anual') || urlPlano === 'anual') {
      planType = 'anual';
    } else if (pathname.endsWith('/vitalicio') || urlPlano === 'vitalicio') {
      planType = 'vitalicio';
    } else if (description.includes('anual')) {
      planType = 'anual';
    }

    // 3. Salva o evento bruto em webhook_raw_events para auditoria
    await supabaseAdmin.from('webhook_raw_events').insert({
      provider: 'syncpay',
      event_type: String(payload?.event || rawStatus || 'unknown'),
      transaction_id: transactionId,
      email: email || null,
      status: rawStatus,
      payload: payload,
    });

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ received: true, warning: 'E-mail do cliente ausente no payload' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Status considerados pagos/aprovados no SyncPay
    const isPaid = [
      'paid',
      'approved',
      'completed',
      'paid_out',
      'succeeded',
      'confirmed',
      'ativo',
    ].includes(rawStatus);

    // Status considerados estorno/cancelamento
    const isRevoked = ['refunded', 'chargedback', 'canceled', 'cancelled', 'expired'].includes(
      rawStatus
    );

    // Busca o UUID do plano na tabela public.planos
    const { data: planoRow } = await supabaseAdmin
      .from('planos')
      .select('id, nome')
      .eq('nome', planType)
      .maybeSingle();

    if (isPaid) {
      // 4. Registra na tabela authorized_purchases
      await supabaseAdmin.from('authorized_purchases').upsert(
        {
          email,
          plan: planType,
          transaction_code: transactionId,
        },
        { onConflict: 'email' }
      );

      // 5. Verifica se o usuário já existe no Supabase Auth ou cria automaticamente
      let userId: string | null = null;

      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle();

      if (existingProfile?.id) {
        userId = existingProfile.id;
      } else {
        const { data: createdUser, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password: 'Pozzoli123!',
            email_confirm: true,
            user_metadata: {
              full_name: name,
              plan: planType,
              transaction_code: transactionId,
            },
          });

        if (!createError && createdUser?.user?.id) {
          userId = createdUser.user.id;
        } else {
          // Caso já exista em auth.users mas ainda não em profiles, busca na lista de usuários
          const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
          const found = usersList?.users?.find(
            (u) => u.email?.toLowerCase() === email
          );
          if (found) userId = found.id;
        }
      }

      // 6. Atualiza/insere public.profiles e public.users_plano
      if (userId) {
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          email,
          name,
          plan: planType,
          updated_at: new Date().toISOString(),
        });

        const nowIso = new Date().toISOString();
        const oneYearLaterIso = new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString();

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
        JSON.stringify({
          success: true,
          action: 'access_granted',
          email,
          plan: planType,
          user_id: userId,
        }),
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
        JSON.stringify({
          success: true,
          action: 'access_revoked',
          email,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        received: true,
        action: 'ignored_status',
        status: rawStatus,
      }),
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

