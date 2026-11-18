import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-syncpay-signature, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APP_BASE_URL = 'https://pozzoli-melodico.vercel.app';
const FIXED_PLAN: 'anual' = 'anual';
const FALLBACK_PLAN_ID = '2a6c9492-b7a5-4d94-a578-9d257c3a8d6b';

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function issuePasswordToken(
  supabase: any,
  userId: string,
  email: string,
  purpose: 'welcome' | 'recovery'
): Promise<string> {
  const rawToken = `${crypto.randomUUID()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Invalida tokens anteriores ainda não utilizados deste usuário
  await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('used_at', null);

  await supabase.from('password_reset_tokens').insert({
    user_id: userId,
    email: email.toLowerCase(),
    token_hash: tokenHash,
    purpose,
    expires_at: expiresAt,
  });

  return rawToken;
}

async function sendBrevoEmail(
  supabase: any,
  email: string,
  name: string,
  userId: string | null,
  mode: 'welcome' | 'recovery' | 'refund' = 'welcome'
) {
  try {
    const brevoApiKey = Deno.env.get('BREVO_API_KEY') || '';
    if (!brevoApiKey) {
      console.warn('BREVO_API_KEY not set in environment');
      return { ok: false, error: 'Missing BREVO_API_KEY' };
    }

    if (mode === 'refund') {
      const htmlContent = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px 16px; color: #1f2937;">
          <h2 style="color: #dc2626; font-size: 22px; font-weight: 700; margin: 0 0 18px 0;">
            Reembolso Confirmado - Pozzoli Melódico no Bolso
          </h2>
          <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0 0 14px 0;">
            Olá, <strong>${name || email.split('@')[0]}</strong>.
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0 0 14px 0;">
            Confirmamos que o reembolso/cancelamento da sua compra do aplicativo <strong>Pozzoli Melódico no Bolso</strong> foi processado com sucesso.
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0 0 20px 0;">
            Com isso, o seu acesso ao aplicativo foi encerrado automaticamente. Caso queira voltar a estudar conosco no futuro, será sempre muito bem-vindo!
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #6b7280; margin: 0;">
            Equipe Pozzoli Melódico no Bolso
          </p>
        </div>
      `;

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Pozzoli Melódico no Bolso', email: 'darlanmarley@gmail.com' },
          to: [{ email, name: name || email.split('@')[0] }],
          subject: 'Pozzoli Melódico no Bolso - Reembolso Confirmado',
          htmlContent,
        }),
      });

      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    }

    if (!userId) {
      return { ok: false, error: 'Missing userId for tokenized password link' };
    }

    const token = await issuePasswordToken(supabase, userId, email, mode);
    const isRecovery = mode === 'recovery';
    const createPasswordUrl = `${APP_BASE_URL}/criar-senha?email=${encodeURIComponent(
      email
    )}&token=${encodeURIComponent(token)}${isRecovery ? '&mode=reset' : ''}`;

    const titleText = isRecovery
      ? 'Recuperação de Senha - Pozzoli Melódico no Bolso'
      : 'Bem-vindo ao Pozzoli Melódico no Bolso!';

    const paragraph1 = isRecovery
      ? 'Recebemos uma solicitação para redefinir a senha da sua conta no aplicativo <strong>Pozzoli Melódico no Bolso</strong>.'
      : 'Sua compra do <strong>Plano Anual (365 dias)</strong> foi confirmada! Agora é só cadastrar a sua senha para acessar o aplicativo.';

    const paragraph2 = isRecovery
      ? 'Clique no botão abaixo para cadastrar a sua nova senha. O link é de uso único e expira em 24 horas.'
      : 'Clique no botão abaixo para cadastrar a sua senha pessoal. O link é de uso único e expira em 24 horas.';

    const buttonLabel = isRecovery ? 'Redefinir minha senha' : 'Criar minha senha';
    const subjectText = isRecovery
      ? 'Pozzoli Melódico no Bolso - Recuperação de senha'
      : 'Pozzoli Melódico no Bolso - Crie sua senha (Plano Anual)';

    const htmlContent = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px 16px; color: #1f2937;">
        <h2 style="color: #ea580c; font-size: 22px; font-weight: 700; margin: 0 0 18px 0;">
          ${titleText}
        </h2>
        <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0 0 14px 0;">
          ${paragraph1}
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0 0 24px 0;">
          ${paragraph2}
        </p>
        <div style="margin: 26px 0;">
          <a href="${createPasswordUrl}"
             style="background-color: #ea580c; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 28px; border-radius: 8px; display: inline-block;">
            ${buttonLabel}
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
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Pozzoli Melódico no Bolso', email: 'darlanmarley@gmail.com' },
        to: [{ email, name: name || email.split('@')[0] }],
        subject: subjectText,
        htmlContent,
      }),
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('Erro ao enviar e-mail via Brevo:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function findUserByEmail(supabase: any, email: string) {
  let userId: string | null = null;
  let userName = email.split('@')[0];

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, name')
    .ilike('email', email)
    .maybeSingle();

  if (existingProfile?.id) {
    userId = existingProfile.id;
    if (existingProfile.name) userName = existingProfile.name;
  } else {
    let page = 1;
    while (page <= 10 && !userId) {
      const { data: listData } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      const users = listData?.users || [];
      const found = users.find((u: any) => u.email?.toLowerCase() === email);
      if (found) {
        userId = found.id;
        userName = found.user_metadata?.name || found.user_metadata?.full_name || userName;
        break;
      }
      if (users.length < 200) break;
      page += 1;
    }
  }

  return { userId, userName };
}

function isPlanBlocked(userPlano: any): string | null {
  if (!userPlano) return null;
  if (userPlano.status === 'cancelado') {
    return 'O acesso desta compra encontra-se cancelado ou reembolsado.';
  }
  if (userPlano.data_final && new Date(userPlano.data_final) < new Date()) {
    return 'Seu plano anual expirou. Renove sua assinatura para continuar acessando.';
  }
  return null;
}

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = await req.json();

    // ========================================================================
    // AÇÃO 1: RECUPERAÇÃO DE SENHA ("Esqueceu a senha?") VIA BREVO
    // ========================================================================
    if (payload?.action === 'forgot_password') {
      const targetEmail = String(payload?.email || '').trim().toLowerCase();
      if (!targetEmail || !targetEmail.includes('@')) {
        return new Response(
          JSON.stringify({ error: 'Informe um e-mail válido.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { userId, userName } = await findUserByEmail(supabase, targetEmail);
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'E-mail não encontrado em nossa base de alunos.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: userPlano } = await supabase
        .from('users_plano')
        .select('status, data_final')
        .eq('id', userId)
        .maybeSingle();

      const blockedReason = isPlanBlocked(userPlano);
      if (blockedReason) {
        return new Response(
          JSON.stringify({ error: blockedReason }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const emailResult = await sendBrevoEmail(supabase, targetEmail, userName, userId, 'recovery');
      if (!emailResult.ok) {
        return new Response(
          JSON.stringify({ error: 'Falha ao enviar e-mail de recuperação via Brevo.', brevo: emailResult }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'E-mail de recuperação de senha enviado com sucesso!',
          email: targetEmail,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // AÇÃO 2: VALIDAR ACESSO DE COMPRA ("VALIDE SEU ACESSO AQUI")
    // Envia link seguro com token único por e-mail no primeiro acesso
    // ========================================================================
    if (payload?.action === 'validate_purchase_access') {
      const targetEmail = String(payload?.email || '').trim().toLowerCase();
      if (!targetEmail || !targetEmail.includes('@')) {
        return new Response(
          JSON.stringify({ error: 'Informe um e-mail válido.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { userId, userName } = await findUserByEmail(supabase, targetEmail);
      if (!userId) {
        return new Response(
          JSON.stringify({
            error: 'E-mail de compra não encontrado. Verifique se digitou o mesmo e-mail usado na compra ou se o pagamento já foi aprovado.',
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: userPlano } = await supabase
        .from('users_plano')
        .select('status, data_final')
        .eq('id', userId)
        .maybeSingle();

      const blockedReason = isPlanBlocked(userPlano);
      if (blockedReason) {
        return new Response(
          JSON.stringify({ error: blockedReason }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (userPlano?.status === 'ativo') {
        return new Response(
          JSON.stringify({
            success: true,
            alreadyActive: true,
            message: 'Sua conta já está ativa! Faça login com sua senha na aba "Entrar" ou clique em "Esqueceu a senha?".',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const emailResult = await sendBrevoEmail(supabase, targetEmail, userName, userId, 'welcome');
      if (!emailResult.ok) {
        return new Response(
          JSON.stringify({ error: 'Compra encontrada, mas houve erro ao enviar o link por e-mail.', brevo: emailResult }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          needsPasswordSetup: true,
          message: 'Compra confirmada! Enviamos para o seu e-mail o link seguro para você cadastrar sua senha e entrar.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // AÇÃO 3: DEFINIR / REDEFINIR SENHA NA TELA /criar-senha (COM TOKEN ÚNICO)
    // ========================================================================
    if (payload?.action === 'set_password') {
      const targetEmail = String(payload?.email || '').trim().toLowerCase();
      const newPassword = String(payload?.password || '');
      const rawToken = String(payload?.token || '').trim();

      if (!targetEmail || !targetEmail.includes('@')) {
        return new Response(
          JSON.stringify({ error: 'E-mail inválido.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!newPassword || newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!rawToken || rawToken.length < 16) {
        return new Response(
          JSON.stringify({ error: 'Link de segurança inválido ou incompleto. Solicite um novo link em "Esqueceu a senha?".' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tokenHash = await sha256Hex(rawToken);
      const { data: tokenRow } = await supabase
        .from('password_reset_tokens')
        .select('id, user_id, email, expires_at, used_at')
        .eq('token_hash', tokenHash)
        .ilike('email', targetEmail)
        .maybeSingle();

      if (!tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Este link expirou ou já foi utilizado. Solicite um novo link em "Esqueceu a senha?".' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userId = tokenRow.user_id;
      const { data: userPlano } = await supabase
        .from('users_plano')
        .select('status, data_final')
        .eq('id', userId)
        .maybeSingle();

      const blockedReason = isPlanBlocked(userPlano);
      if (blockedReason) {
        return new Response(
          JSON.stringify({ error: blockedReason }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
        email_confirm: true,
      });

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar a senha: ' + updateErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const nowIso = new Date().toISOString();
      await supabase
        .from('password_reset_tokens')
        .update({ used_at: nowIso })
        .eq('id', tokenRow.id);

      if (userPlano?.status === 'primeiro-acesso') {
        await supabase
          .from('users_plano')
          .update({ status: 'ativo', updated_at: nowIso })
          .eq('id', userId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Senha atualizada com sucesso!',
          user_id: userId,
          email: targetEmail,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // AÇÃO 4: WEBHOOK SYNCPAY (COMPRA APROVADA OU REEMBOLSO AUTOMÁTICO)
    // ========================================================================
    const expectedSecret = Deno.env.get('SYNCPAY_WEBHOOK_SECRET') || '';
    if (expectedSecret) {
      const reqUrl = new URL(req.url);
      const providedSecret =
        reqUrl.searchParams.get('secret') ||
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

    const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;

    const rawEmail =
      data?.customer?.email ||
      data?.client?.email ||
      data?.buyer?.email ||
      data?.payer?.email ||
      data?.user?.email ||
      data?.email ||
      payload?.customer?.email ||
      payload?.client?.email ||
      payload?.buyer?.email ||
      payload?.email ||
      '';

    const email = String(rawEmail).trim().toLowerCase();

    const name = String(
      data?.customer?.name ||
        data?.client?.name ||
        data?.buyer?.name ||
        data?.payer?.name ||
        data?.name ||
        payload?.customer?.name ||
        payload?.client?.name ||
        payload?.name ||
        (email ? email.split('@')[0] : 'Aluno Pozzoli Melódico')
    ).trim();

    const rawStatus = String(
      payload?.action === 'refund'
        ? 'refunded'
        : data?.status ||
          data?.payment_status ||
          data?.transaction_status ||
          payload?.status ||
          payload?.event ||
          ''
    )
      .trim()
      .toLowerCase();

    const transactionId = String(
      data?.identifier ||
        data?.idTransaction ||
        data?.reference_id ||
        data?.id ||
        payload?.identifier ||
        `syncpay_anu_${Date.now()}`
    );

    await supabase.from('webhook_raw_events').insert({
      provider: `syncpay-${FIXED_PLAN}`,
      event_type: String(payload?.event || rawStatus || 'unknown'),
      transaction_id: transactionId,
      email: email || null,
      status: rawStatus || null,
      payload,
    });

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'E-mail do comprador ausente ou inválido no payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1) Reembolso / estorno / chargeback / cancelamento
    const revokedStatuses = [
      'refunded',
      'refund',
      'chargedback',
      'chargeback',
      'canceled',
      'cancelled',
      'expired',
      'reembolsado',
      'estornado',
      'cancelado',
      'med',
      'dispute',
      'pix.refunded',
      'order.refunded',
      'payment.refunded',
      'cash_in.refunded',
      'cash_out.refunded',
    ];

    if (revokedStatuses.some((s) => rawStatus.includes(s))) {
      const nowIso = new Date().toISOString();
      await supabase.from('authorized_purchases').delete().ilike('email', email);

      const { userId, userName } = await findUserByEmail(supabase, email);
      if (userId) {
        await supabase
          .from('users_plano')
          .update({ status: 'cancelado', data_final: nowIso, updated_at: nowIso })
          .eq('id', userId);

        const { data: profileRow } = await supabase
          .from('profiles')
          .select('stats')
          .eq('id', userId)
          .maybeSingle();

        const currentStats =
          profileRow?.stats && typeof profileRow.stats === 'object' ? profileRow.stats : {};

        await supabase
          .from('profiles')
          .update({
            plan: 'cancelado',
            stats: {
              ...currentStats,
              activeDeviceSession: null,
              accessRevoked: true,
              revokedAt: nowIso,
            },
            updated_at: nowIso,
          })
          .eq('id', userId);

        await supabase.auth.admin.updateUserById(userId, {
          password: `${crypto.randomUUID()}!Revoked9`,
          user_metadata: { name: userName, plan: 'cancelado', status: 'reembolsado' },
        });
      }

      const emailResult = await sendBrevoEmail(supabase, email, name || userName, userId, 'refund');
      return new Response(
        JSON.stringify({
          success: true,
          action: 'access_revoked',
          message: 'Reembolso processado: acesso bloqueado imediatamente e e-mail enviado!',
          email,
          user_id: userId,
          status: 'cancelado',
          brevo: emailResult,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2) Aprovação explícita (nunca aprova quando status está vazio ou pendente)
    const pendingStatuses = [
      'waiting_payment',
      'waiting',
      'pending',
      'created',
      'processing',
      'aguardando',
      'gerado',
    ];
    const approvedStatuses = [
      'paid',
      'approved',
      'completed',
      'confirmed',
      'active',
      'ativo',
      'succeeded',
      'success',
      'authorized',
      'payment.approved',
      'payment_approved',
      'order.paid',
      'pix.paid',
      'cash_out.completed',
      'cash_in.completed',
    ];

    const isPending = pendingStatuses.some((p) => rawStatus.includes(p));
    const isApproved = Boolean(rawStatus) && !isPending && approvedStatuses.some((s) => rawStatus.includes(s));

    if (!isApproved) {
      return new Response(
        JSON.stringify({
          received: true,
          action: 'ignored_status',
          message: `Status '${rawStatus || 'vazio'}' ignorado (aguardando confirmação de pagamento).`,
          email,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nowIso = new Date().toISOString();
    const expiresAtIso = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('authorized_purchases').upsert(
      { email, plan: FIXED_PLAN, transaction_code: transactionId },
      { onConflict: 'email' }
    );

    const { data: planoRow } = await supabase
      .from('planos')
      .select('id')
      .eq('nome', FIXED_PLAN)
      .maybeSingle();

    let userId: string | null = null;
    const randomInitialPassword = `${crypto.randomUUID()}!Pz9#${Date.now()}`;

    const { data: createdUser } = await supabase.auth.admin.createUser({
      email,
      password: randomInitialPassword,
      email_confirm: true,
      user_metadata: {
        name,
        full_name: name,
        plan: FIXED_PLAN,
        plano: FIXED_PLAN,
        expires_at: expiresAtIso,
      },
    });

    if (createdUser?.user) {
      userId = createdUser.user.id;
    } else {
      const found = await findUserByEmail(supabase, email);
      userId = found.userId;
      if (userId) {
        await supabase.auth.admin.updateUserById(userId, {
          email_confirm: true,
          user_metadata: {
            name,
            full_name: name,
            plan: FIXED_PLAN,
            plano: FIXED_PLAN,
            expires_at: expiresAtIso,
          },
        });
      }
    }

    if (userId) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('stats')
        .eq('id', userId)
        .maybeSingle();

      const currentStats =
        existingProfile?.stats && typeof existingProfile.stats === 'object'
          ? existingProfile.stats
          : {};

      await supabase.from('profiles').upsert(
        {
          id: userId,
          email,
          name,
          plan: FIXED_PLAN,
          stats: { ...currentStats, accessRevoked: false },
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );

      await supabase.from('users_plano').upsert(
        {
          id: userId,
          plano_id: planoRow?.id || FALLBACK_PLAN_ID,
          data_inicio: nowIso,
          data_final: expiresAtIso,
          status: 'primeiro-acesso',
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
    }

    const emailResult = await sendBrevoEmail(supabase, email, name, userId, 'welcome');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Acesso ANUAL (365 dias) liberado com sucesso e e-mail enviado!',
        email,
        user_id: userId,
        plano: FIXED_PLAN,
        expires_at: expiresAtIso,
        brevo: emailResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erro inesperado no webhook-anual:', err);
    return new Response(
      JSON.stringify({
        error: 'Erro interno no processamento do webhook',
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
