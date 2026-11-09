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
  mode: 'welcome' | 'recovery' = 'welcome'
) {
  try {
    const brevoApiKey = Deno.env.get('BREVO_API_KEY') || '';
    if (!brevoApiKey) {
      console.warn('BREVO_API_KEY not set in environment');
      return { ok: false, error: 'Missing BREVO_API_KEY' };
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
    // AÇÃO 3: WEBHOOK SYNCPAY (PLANO ANUAL)
    // ========================================================================
    console.log('Webhook Anual (SyncPay) recebido:', JSON.stringify(payload));

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
      data?.status ||
      data?.payment_status ||
      data?.transaction_status ||
      payload?.status ||
      payload?.event ||
      'paid'
    ).toLowerCase();

    const approvedStatuses = [
      'paid',
      'approved',
      'completed',
      'confirmed',
      'active',
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

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'E-mail do comprador não encontrado no payload', payload }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isApproved) {
      return new Response(
        JSON.stringify({ message: `Status '${rawStatus}' ignorado (aguardando pagamento).`, email }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiresAtDate = new Date();
    expiresAtDate.setDate(expiresAtDate.getDate() + 365);
    const expiresAtIso = expiresAtDate.toISOString();

    let userId: string | null = null;
    const defaultPassword = email;

    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        name,
        plano: 'anual',
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
            plano: 'anual',
            expires_at: expiresAtIso,
          },
        });
      } else if (createError) {
        console.error('Erro ao criar/localizar usuário no Auth:', createError);
      }
    }

    if (userId) {
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          email,
          name,
          plano: 'anual',
          status: 'ativo',
          expires_at: expiresAtIso,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (profileError) console.error('Erro ao salvar em profiles:', profileError);
    }

    const { error: planoError } = await supabase.from('users_plano').upsert(
      {
        email,
        name,
        plano: 'anual',
        status: 'ativo',
        expires_at: expiresAtIso,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );
    if (planoError) console.error('Erro ao salvar em users_plano:', planoError);

    const emailResult = await sendBrevoEmail(email, name, userId, 'welcome');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Acesso ANUAL (365 dias) liberado com sucesso e e-mail enviado!',
        email,
        user_id: userId,
        plano: 'anual',
        expires_at: expiresAtIso,
        brevo: emailResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erro inesperado no webhook-anual:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno no processamento do webhook', details: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
