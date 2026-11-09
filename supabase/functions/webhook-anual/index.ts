import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-syncpay-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APP_BASE_URL = 'https://pozzoli-melodico.vercel.app';

async function sendBrevoWelcomeEmail(email: string, name: string, userId: string | null) {
  try {
    const brevoApiKey = Deno.env.get('BREVO_API_KEY') || '';
    if (!brevoApiKey) {
      console.warn('BREVO_API_KEY not set in environment');
      return { ok: false, error: 'Missing BREVO_API_KEY' };
    }
    const token = crypto.randomUUID();
    const createPasswordUrl = `${APP_BASE_URL}/criar-senha?id=${encodeURIComponent(
      userId || ''
    )}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

    const htmlContent = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px 16px; color: #1f2937;">
        <h2 style="color: #ea580c; font-size: 22px; font-weight: 700; margin: 0 0 18px 0;">
          Bem-vindo ao Pozzoli Melódico no Bolso!
        </h2>
        <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0 0 14px 0;">
          Sua conta foi criada com sucesso. Agora é só cadastrar a sua senha para acessar o aplicativo.
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0 0 24px 0;">
          Clique no botão abaixo para cadastrar a sua senha. O link expira em 24 horas.
        </p>
        <div style="margin: 26px 0;">
          <a href="${createPasswordUrl}"
             style="background-color: #ea580c; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 28px; border-radius: 8px; display: inline-block;">
            Criar minha senha
          </a>
        </div>
        <p style="font-size: 13px; color: #6b7280; margin: 26px 0 8px 0;">
          Se o botão acima não abrir, copie e cole o link abaixo no seu navegador:
        </p>
        <p style="font-size: 13px; word-break: break-all; margin: 0;">
          <a href="${createPasswordUrl}" style="color: #2563eb; text-decoration: underline;">
            ${createPasswordUrl}
          </a>
        </p>
      </div>
    `;

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: 'Pozzoli no Bolso',
          email: 'darlanmarley@gmail.com',
        },
        to: [{ email, name: name || email.split('@')[0] }],
        subject: 'Crie sua senha - Pozzoli Melódico no Bolso',
        htmlContent,
      }),
    });

    const data = await res.json().catch(() => ({}));
    return { sent: res.ok, status: res.status, data };
  } catch (err) {
    console.error('Erro ao enviar e-mail pela Brevo:', err);
    return { sent: false, error: String(err) };
  }
}

// ============================================================================
// ENDPOINT EXCLUSIVO: PLANO ANUAL (SYNCPAY) -> clever-action
// URL: https://ejjemzuvyzmxyjteeonz.supabase.co/functions/v1/clever-action
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
      root?.identifier || root?.idTransaction || root?.reference_id || root?.id || payload?.identifier || `syncpay_anual_${Date.now()}`
    );

    const planType = 'anual';

    await supabaseAdmin.from('webhook_raw_events').insert({
      provider: 'syncpay-anual',
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
        const oneYearLaterIso = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          email,
          name,
          plan: planType,
          updated_at: nowIso,
        });

        await supabaseAdmin.from('users_plano').upsert({
          id: userId,
          plano_id: planoRow?.id || 'f39952e0-e370-4c07-8b21-08553ce6cb37',
          data_inicio: nowIso,
          data_final: oneYearLaterIso,
          status: 'primeiro-acesso',
          updated_at: nowIso,
        });
      }

      // Dispara o e-mail de "Crie sua senha" via Brevo automaticamente
      const emailResult = await sendBrevoWelcomeEmail(email, name, userId);

      return new Response(
        JSON.stringify({
          success: true,
          plan: 'anual',
          email,
          user_id: userId,
          brevo_email_sent: emailResult.sent,
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
        JSON.stringify({ success: true, action: 'access_revoked', email }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ received: true, status: rawStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erro no webhook-anual:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
