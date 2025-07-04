import { supabase } from './supabase';

export type Webhook = {
  id: string;
  url: string;
  evento: string;
  criado_em: string;
};

// Cria um novo webhook
export async function createWebhook(url: string, evento: string): Promise<Webhook | null> {
  const { data, error } = await supabase
    .from('webhooks')
    .insert([{ url, evento }])
    .select()
    .single();
  if (error) {
    console.error('Erro ao criar webhook:', error);
    return null;
  }
  return data as Webhook;
}

// Lista todos os webhooks, ou filtra por evento
export async function getWebhooks(evento?: string): Promise<Webhook[]> {
  let query = supabase.from('webhooks').select('*');
  if (evento) {
    query = query.eq('evento', evento);
  }
  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar webhooks:', error);
    return [];
  }
  return (data as Webhook[]) || [];
}

// Atualiza um webhook existente
export async function updateWebhook(id: string, data: Partial<Webhook>): Promise<Webhook | null> {
  const { data: updated, error } = await supabase
    .from('webhooks')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Erro ao atualizar webhook:', error);
    return null;
  }
  return updated as Webhook;
}

// Remove um webhook
export async function deleteWebhook(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Erro ao remover webhook:', error);
    return false;
  }
  return true;
}

// Dispara todos os webhooks cadastrados para um evento
export async function triggerWebhooks(evento: string, payload: any) {
  const webhooks = await getWebhooks(evento);
  for (const webhook of webhooks) {
    try {
      await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error(`Erro ao disparar webhook para ${webhook.url}:`, err);
    }
  }
} 