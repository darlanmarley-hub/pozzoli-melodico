import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-syncpay-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APP_BASE_URL = 'https://pozzoli-melodico.vercel.app';

async function sendBrevoEmail(
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
          sender: {
            name: 'Pozzoli Melódico no Bolso',
            email: 'darlanmarley@gmail.com',
          },
          to: [{ email, name: name || email.split('@')[0] }],
          subject: 'Pozzoli Melódico no Bolso - Reembolso Confirmado',
          htmlContent,
        }),
      });

      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    }

    const token = crypto.randomUUID();
    const isRecovery = mode === 'recovery';
    const createPasswordUrl = `${APP_BASE_URL}/criar-senha?id=${encodeURIComponent(
      userId || ''
    )}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}${
      isRecovery ? '&mode=reset' : ''
    }`;

    const titleText = isRecovery
      ? 'Recuperação de Senha - Pozzoli Melódico no Bolso'
      : 'Bem-vindo ao Pozzoli Melódico no Bolso!';

    const paragraph1 = isRecovery
      ? 'Recebemos uma solicitação para redefinir a senha da sua conta no aplicativo <strong>Pozzoli Melódico no Bolso</strong>.'
      : 'Sua conta foi criada com sucesso. Agora é só cadastrar a sua senha para acessar o aplicativo.';

    const paragraph2 = isRecovery
      ? 'Clique no botão abaixo para cadastrar a sua nova senha. O link expira em 24 horas.'
      : 'Clique no botão abaixo para cadastrar a sua senha. O link expira em 24 horas.';

    const buttonLabel = isRecovery ? 'Redefinir minha senha' : 'Criar minha senha';
    const subjectText = isRecovery
      ? 'Pozzoli Melódico no Bolso - Recuperação de senha'
      : 'Pozzoli Melódico no Bolso - Crie sua senha';

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
        sender: {
          name: 'Pozzoli Melódico no Bolso',
          email: 'darlanmarley@gmail.com',
        },
        to: [
          {
            email,
            name: name || email.split('@')[0],
          },
        ],
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
    const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = listData?.users?.find((u: any) => u.email?.toLowerCase() === email);
    if (found) {
      userId = found.id;
      userName = found.user_metadata?.name || found.user_metadata?.full_name || userName;
    }
  }

  return { userId, userName };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        .select('status')
        .eq('id', userId)
        .maybeSingle();

      if (userPlano?.status === 'cancelado') {
        return new Response(
          JSON.stringify({ error: 'O acesso desta compra encontra-se cancelado ou reembolsado.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const emailResult = await sendBrevoEmail(targetEmail, userName, userId, 'recovery');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'E-mail de recuperação de senha enviado com sucesso!',
          email: targetEmail,
          brevo: emailResult,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // AÇÃO 2: DEFINIR / REDEFINIR SENHA NA TELA /criar-senha
    // ========================================================================
    if (payload?.action === 'set_password') {
      const targetEmail = String(payload?.email || '').trim().toLowerCase();
      const newPassword = String(payload?.password || '');

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

      const { userId, userName } = await findUserByEmail(supabase, targetEmail);
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Conta não localizada para este e-mail.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: userPlano } = await supabase
        .from('users_plano')
        .select('status')
        .eq('id', userId)
        .maybeSingle();

      if (userPlano?.status === 'cancelado') {
        return new Response(
          JSON.stringify({ error: 'O acesso desta compra encontra-se cancelado ou reembolsado.' }),
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

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Senha atualizada com sucesso!',
          user_id: userId,
          email: targetEmail,
          name: userName,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========================================================================
    // AÇÃO 3: WEBHOOK SYNCPAY (COMPRA APROVADA OU REEMBOLSO AUTOMÁTICO)
    // ========================================================================
    console.log('Webhook Vitalício (SyncPay) recebido:', JSON.stringify(payload));

    const data = payload?.data || payload;

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

    const name =
      data?.customer?.name ||
      data?.client?.name ||
      data?.buyer?.name ||
      data?.payer?.name ||
      data?.name ||
      payload?.customer?.name ||
      payload?.client?.name ||
      payload?.name ||
      'Aluno Pozzoli Melódico';

    const rawStatus = String(
      payload?.action === 'refund'
        ? 'refunded'
        : data?.status ||
          data?.payment_status ||
          data?.transaction_status ||
          payload?.status ||
          payload?.event ||
          'paid'
    ).toLowerCase();

    const transactionId = String(
      data?.identifier ||
        data?.idTransaction ||
        data?.reference_id ||
        data?.id ||
        payload?.identifier ||
        `syncpay_vit_${Date.now()}`
    );

    await supabase.from('webhook_raw_events').insert({
      provider: 'syncpay-vitalicio',
      event_type: String(payload?.event || rawStatus || 'unknown'),
      transaction_id: transactionId,
      email: email || null,
      status: rawStatus,
      payload,
    });

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'E-mail do comprador não encontrado no payload', payload }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ------------------------------------------------------------------------
    // VERIFICA SE É REEMBOLSO / ESTORNO / CHARGEBACK / CANCELAMENTO
    // ------------------------------------------------------------------------
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

    const isRevoked = revokedStatuses.some((s) => rawStatus.includes(s));

    if (isRevoked) {
      const nowIso = new Date().toISOString();

      // 1. Remove das compras autorizadas
      await supabase.from('authorized_purchases').delete().ilike('email', email);

      // 2. Localiza o usuário para bloquear imediatamente no banco e no Auth
      const { userId, userName } = await findUserByEmail(supabase, email);

      if (userId) {
        // Cancela o plano na tabela users_plano
        await supabase
          .from('users_plano')
          .update({
            status: 'cancelado',
            data_final: nowIso,
            updated_at: nowIso,
          })
          .eq('id', userId);

        // Marca accessRevoked = true em profiles para desconectar em tempo real qualquer aparelho aberto
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

        // Invalida a senha no Supabase Auth para impedir novos logins
        await supabase.auth.admin.updateUserById(userId, {
          password: `${crypto.randomUUID()}!Revoked9`,
          user_metadata: {
            name: userName,
            plan: 'cancelado',
            status: 'reembolsado',
          },
        });
      }

      // 3. Dispara e-mail automático de confirmação de reembolso via Brevo
      const emailResult = await sendBrevoEmail(email, name || userName, userId, 'refund');

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

    // ------------------------------------------------------------------------
    // VERIFICA SE É COMPRA APROVADA / PAGA
    // ------------------------------------------------------------------------
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

    const isApproved = approvedStatuses.some((s) => rawStatus.includes(s)) || !data?.status;

    if (!isApproved) {
      return new Response(
        JSON.stringify({ message: `Status '${rawStatus}' ignorado (aguardando pagamento).`, email }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nowIso = new Date().toISOString();

    await supabase.from('authorized_purchases').upsert(
      {
        email,
        plan: 'vitalicio',
        transaction_code: transactionId,
      },
      { onConflict: 'email' }
    );

    const { data: planoRow } = await supabase
      .from('planos')
      .select('id')
      .eq('nome', 'vitalicio')
      .maybeSingle();

    let userId: string | null = null;
    const defaultPassword = email;

    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        name,
        full_name: name,
        plan: 'vitalicio',
        plano: 'vitalicio',
        expires_at: null,
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
            plan: 'vitalicio',
            plano: 'vitalicio',
            expires_at: null,
          },
        });
      } else if (createError) {
        console.error('Erro ao criar/localizar usuário no Auth:', createError);
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

      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          email,
          name,
          plan: 'vitalicio',
          stats: {
            ...currentStats,
            accessRevoked: false,
          },
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
      if (profileError) console.error('Erro ao salvar em profiles:', profileError);

      const { error: planoError } = await supabase.from('users_plano').upsert(
        {
          id: userId,
          plano_id: planoRow?.id || '413e1deb-62db-493e-88ad-787d10dd955d',
          data_inicio: nowIso,
          data_final: null,
          status: 'primeiro-acesso',
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );
      if (planoError) console.error('Erro ao salvar em users_plano:', planoError);
    }

    const emailResult = await sendBrevoEmail(email, name, userId, 'welcome');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Acesso VITALÍCIO liberado com sucesso e e-mail enviado!',
        email,
        user_id: userId,
        plano: 'vitalicio',
        expires_at: null,
        brevo: emailResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erro inesperado no webhook-vitalicio:', err);
    return new Response(
      JSON.stringify({
        error: 'Erro interno no processamento do webhook',
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
