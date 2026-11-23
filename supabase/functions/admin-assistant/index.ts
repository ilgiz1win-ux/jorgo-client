// Админ панелдин ИИ жардамчысы (Supabase Edge Function, Deno).
// Claude API ачкычы ушул жерде гана — Supabase → Edge Functions → Secrets → ANTHROPIC_API_KEY.
// Колдонмого (кардарга да, админге да) ачкыч эч качан берилбейт.
import Anthropic from 'npm:@anthropic-ai/sdk@1.6.0';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const INSTRUCTIONS = `Сен Jorgo Eco Service дүкөнүнүн (Бишкек: электровелосипеддерди сатуу, оңдоо жана ижарага берүү) админ панелиндеги жардамчысың.
Сени дүкөндүн ээси жана админдери гана колдонот.

Эмне кыласың:
- Төмөндөгү «Дүкөндүн маалыматы» боюнча суроолорго жооп бересиң: заказдар, оңдоо өтүнмөлөрү, мастерлер, ижаралар жана кечиккен төлөмдөр, товарлар, жооп күтүп жаткан кардарлар.
- Кардарга жооп, акция же билдирме текстин, соцтармакка пост жазып бересиң.
- Бизнес боюнча кыска кеңеш бересиң.

Эрежелер:
- Админ кайсы тилде жазса, ошол тилде жооп бер (адатта кыргызча же орусча).
- Кыска жана так жаз; телефондон окулат. Узун таблица колдонбо, тизме жетет.
- Сандарды жана аттарды маалыматтан гана ал. Маалыматта жок нерсени ойлоп чыгарба — «маалыматта жок» деп айт.
- Сен эч нерсени өзгөртө албайсың (заказдын абалы, баа ж.б.). Кайсы бөлүмдөн өзгөртүү керектигин айт: «Заказдар», «Оңдоо өтүнмөлөрү», «Ижаралар жана төлөмдөр», «Кардарлардын суроолору», «Мастерлер», «Акциялар».
- Кардарлардын паспорт маалыматтары сага берилбейт; сураса, «Кардарлар» бөлүмүнөн кароону айт.
- Акчаны сом менен жаз.`;

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Bishkek', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');

// Админдин укугу менен (RLS) дүкөндүн кыскача маалыматын чогултат
async function shopContext(sb: SupabaseClient): Promise<string> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const safe = async <T,>(q: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
    try {
      const { data, error } = await q;
      return error ? [] : (data ?? []);
    } catch {
      return [];
    }
  };
  type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const [orders, repairs, masters, rentReq, products, threads] = await Promise.all([
    safe<R>(sb.from('orders').select('number,created_at,delivery,branch,items,goods_total,express_fee,name,phone,status').gte('created_at', since).order('created_at', { ascending: false }).limit(150)),
    safe<R>(sb.from('repair_requests').select('number,created_at,name,phone,bike,services,problem,branch,master_id,outcall,status,master_note').gte('created_at', since).order('created_at', { ascending: false }).limit(150)),
    safe<R>(sb.from('masters').select('id,name,specialty,branch,active,rating,orders,hours_from,hours_to,outcall,outcall_note')),
    safe<R>(sb.from('rental_requests').select('created_at,bike_name,period,count,total,name,phone,status,paid_until').in('status', ['new', 'active']).order('created_at', { ascending: false }).limit(150)),
    safe<R>(sb.from('products').select('name,category,price,old_price,in_stock,popular').order('sort').limit(300)),
    safe<R>(sb.rpc('admin_chat_threads') as unknown as PromiseLike<{ data: R[] | null; error: unknown }>),
  ]);
  const masterName = (id?: string) => masters.find((m) => m.id === id)?.name ?? 'мастер тандала элек';
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`Бүгүн: ${new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Bishkek' })}. Заказдар жана оңдоо — акыркы 30 күн.`);

  lines.push(`\n## Заказдар (${orders.length})`);
  for (const o of orders) {
    const items = Array.isArray(o.items) ? o.items.map((i: R) => `${i.name ?? '?'}×${i.qty ?? i.count ?? 1}`).join(', ') : '';
    lines.push(`- №${o.number} ${fmtDate(o.created_at)} · ${o.status} · ${o.delivery === 'pickup' ? 'өзү алып кетет' : 'экспресс'} · ${o.branch || '—'} · ${o.goods_total} сом${o.express_fee != null ? ` + жол ${o.express_fee}` : ''} · ${o.name} ${o.phone} · ${items}`);
  }

  lines.push(`\n## Оңдоо өтүнмөлөрү (${repairs.length})`);
  for (const r of repairs) {
    lines.push(`- №${r.number} ${fmtDate(r.created_at)} · ${r.status} · ${r.branch || '—'} · ${masterName(r.master_id)}${r.outcall ? ' · выезд' : ''} · ${r.name} ${r.phone} · ${r.bike || ''} · ${(r.services ?? []).join(', ')} ${r.problem || ''}${r.master_note ? ` · эскертме: ${r.master_note}` : ''}`);
  }

  lines.push(`\n## Мастерлер (${masters.length})`);
  for (const m of masters) {
    const own = repairs.filter((r) => r.master_id === m.id);
    const cnt = (s: string) => own.filter((r) => r.status === s).length;
    lines.push(`- ${m.name}${m.active ? '' : ' (жашырылган)'} · ${m.specialty || ''} · ${m.branch || '—'} · ⭐${m.rating} · ${m.hours_from}–${m.hours_to}${m.outcall ? ` · выезд: ${m.outcall_note || 'ооба'}` : ''} · 30 күндө: бүттү ${cnt('done')}, иштеп жатат ${cnt('accepted') + cnt('in_progress')}, жаңы ${cnt('new')}, отказ ${cnt('cancelled')}`);
  }

  lines.push(`\n## Ижаралар (жаңы жана активдүү: ${rentReq.length})`);
  for (const r of rentReq) {
    const late = r.status === 'active' && r.paid_until && r.paid_until < today;
    lines.push(`- ${r.name} ${r.phone} · ${r.bike_name} · ${r.status} · ${r.count} ${r.period}${r.total != null ? ` · ${r.total} сом` : ''} · төлөнгөнү: ${r.paid_until ?? '—'}${late ? ' · ⚠️ КЕЧИКТИ' : ''}`);
  }

  lines.push(`\n## Товарлар (${products.length})`);
  for (const p of products) {
    lines.push(`- ${p.name} · ${p.category} · ${p.price} сом${p.old_price ? ` (мурда ${p.old_price})` : ''}${p.in_stock ? '' : ' · ЖОК'}${p.popular ? ' · популярдуу' : ''}`);
  }

  const waiting = threads.filter((t) => t.unread > 0);
  lines.push(`\n## Кардарлардын суроолору (жооп күткөн: ${waiting.length})`);
  for (const t of threads.slice(0, 30)) {
    lines.push(`- ${t.full_name} ${t.phone} · ${fmtDate(t.last_at)} · ${t.last_from_admin ? 'админ жооп берген' : `окула элек ${t.unread}`} · акыркы: ${String(t.last_body).slice(0, 160)}`);
  }
  // Өтө чоң болбосун (баасы арзан болсун)
  return lines.join('\n').slice(0, 60000);
}

type Msg = { role: 'user' | 'assistant'; content: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth) return json({ error: 'auth' }, 401);
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: isAdmin } = await sb.rpc('is_admin');
  if (isAdmin !== true) return json({ error: 'admin only' }, 403);

  if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ error: 'no_key' }, 500);

  let messages: Msg[];
  try {
    const body = await req.json();
    messages = (Array.isArray(body?.messages) ? body.messages : [])
      .filter((m: Msg) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-20)
      .map((m: Msg) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'no question' }, 400);

  const context = await shopContext(sb);
  const client = new Anthropic(); // ANTHROPIC_API_KEY'ди Secrets'тен окуйт
  try {
    const res = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [
        { type: 'text', text: INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `# Дүкөндүн маалыматы (азыркы)\n${context}` },
      ],
      messages,
    });
    if (res.stop_reason === 'refusal') return json({ reply: 'Кечириңиз, бул суроого жооп бере албайм. Башкача сурап көрүңүз.' });
    const reply = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return json({ reply: reply || '…', usage: { input: res.usage.input_tokens, output: res.usage.output_tokens } });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return json({ error: 'bad_key' }, 500);
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'rate_limit' }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: `api ${e.status}` }, 502);
    return json({ error: 'network' }, 502);
  }
});
