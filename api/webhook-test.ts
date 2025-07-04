import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[Webhook Test] Método:', req.method);
  console.log('[Webhook Test] Headers:', req.headers);
  console.log('[Webhook Test] Body:', req.body);

  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Webhook funcionando!',
      timestamp: new Date().toISOString(),
      method: req.method
    });
  }

  if (req.method === 'POST') {
    return res.status(200).json({ 
      success: true,
      message: 'POST recebido com sucesso!',
      body: req.body,
      timestamp: new Date().toISOString()
    });
  }

  return res.status(405).json({ error: 'Método não permitido' });
} 