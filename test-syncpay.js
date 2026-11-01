/**
 * Script para simular uma compra aprovada na SyncPay (Plano Vitalício ou Anual)
 * Uso no terminal:
 *   node test-syncpay.js comprador@email.com vitalicio
 *   node test-syncpay.js comprador@email.com anual
 */

const email = process.argv[2] || 'comprador.teste@gmail.com';
const plano = (process.argv[3] || 'vitalicio').toLowerCase() === 'anual' ? 'anual' : 'vitalicio';

const endpoint =
  plano === 'anual'
    ? 'https://ejjemzuvyzmxyjteeonz.supabase.co/functions/v1/clever-action'
    : 'https://ejjemzuvyzmxyjteeonz.supabase.co/functions/v1/super-worker';

const fakeSyncPayPayload = {
  event: 'transaction.updated',
  status: 'paid',
  identifier: `syncpay_test_${Date.now()}`,
  reference_id: `order_${Date.now()}`,
  amount: plano === 'anual' ? 97.0 : 147.0,
  payment_method: 'pix',
  description: `Pozzoli Melódico no Bolso - Plano ${plano.toUpperCase()}`,
  client: {
    name: 'Aluno Teste SyncPay',
    cpf: '123.456.789-00',
    email: email,
    phone: '+5511999999999',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

console.log(`\n🚀 Simulando compra aprovada na SyncPay...`);
console.log(`📧 E-mail do comprador: ${email}`);
console.log(`📦 Plano: ${plano.toUpperCase()}`);
console.log(`🔗 Endpoint: ${endpoint}\n`);

fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(fakeSyncPayPayload),
})
  .then(async (res) => {
    const text = await res.text();
    console.log(`📡 Status HTTP: ${res.status}`);
    console.log(`📄 Resposta do Webhook:`, text);
    if (res.ok) {
      console.log(`\n✅ Sucesso! Agora abra o app, clique em "VALIDE SEU ACESSO AQUI" e digite: ${email}`);
    } else if (res.status === 404) {
      console.log(
        `\n⚠️ Erro 404: A Edge Function "webhook-${plano}" ainda não foi publicada no painel do Supabase.`
      );
      console.log(
        `👉 Publique em: https://supabase.com/dashboard/project/ejjemzuvyzmxyjteeonz/functions`
      );
    }
  })
  .catch((err) => {
    console.error('❌ Erro ao chamar o webhook:', err);
  });

