import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Админдин ИИ жардамчысы: суроо серверге (Supabase Edge Function) кетет, Claude API ачкычы ошол жерде гана.
export type AiMsg = { role: 'user' | 'assistant'; content: string };

const ERR: Record<string, string> = {
  no_key: 'ИИ ачкычы коюла элек: Supabase → Edge Functions → Secrets → ANTHROPIC_API_KEY.',
  bad_key: 'ИИ ачкычы туура эмес. Supabase → Edge Functions → Secrets бөлүмүнөн текшериңиз.',
  rate_limit: 'Азыр суроо көп болуп кетти. Бир мүнөттөн кийин кайра жазыңыз.',
  'admin only': 'Бул жардамчы админдер үчүн гана.',
};

export async function askAssistant(messages: AiMsg[]): Promise<string> {
  if (!supabase) throw new Error('ИИ жардамчы сервер (Supabase) туташканда гана иштейт.');
  const { data, error } = await supabase.functions.invoke('admin-assistant', { body: { messages } });
  if (error) {
    let code = '';
    if (error instanceof FunctionsHttpError) {
      try {
        code = ((await error.context.json()) as { error?: string }).error ?? '';
      } catch {
        // жооп JSON эмес
      }
    }
    if (ERR[code]) throw new Error(ERR[code]);
    if (/not found|404|Failed to send/i.test(error.message)) throw new Error('ИИ функциясы орнотула элек (admin-assistant). Нускаманы караңыз.');
    throw new Error(code ? `Ката: ${code}` : error.message);
  }
  return (data as { reply?: string })?.reply ?? '';
}
