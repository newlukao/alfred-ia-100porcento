import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ✅ VALIDAÇÃO DE SEGURANÇA
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { messages, userId, systemInstructions } = await req.json()
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🚀 Chat request from user: ${userId}`)
    console.log(`📝 Messages count: ${messages.length}`)
    console.log(`🧠 System instructions length: ${systemInstructions?.length || 0}`)

    // ✅ CHAMADA SEGURA PARA OPENAI - API KEY SÓ NO SERVIDOR
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY não configurada')
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ✅ USAR AS MENSAGENS COMPLETAS ENVIADAS PELO FRONTEND
    // O frontend já construiu o prompt completo na primeira mensagem
    const openaiMessages = messages.map((msg) => ({
      role: msg.role || (msg.type === 'user' ? 'user' : 'assistant'),
      content: msg.content
    }))

    console.log(`🤖 Calling OpenAI with ${openaiMessages.length} messages`)
    console.log(`📋 First message preview: ${openaiMessages[0]?.content?.substring(0, 200)}...`)

    // ✅ REQUISIÇÃO SEGURA PARA OPENAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: openaiMessages,
        max_tokens: 500, // ✅ Aumentado para respostas mais elaboradas
        temperature: 0.8, // ✅ Mais criativo
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      console.error(`❌ OpenAI API error: ${openaiResponse.status} - ${error}`)
      
      if (openaiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: '🚫 OpenAI rate limit atingido. Aguarde alguns minutos.',
            type: 'rate_limit'
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: '😅 Opa! Deu um perrengue aqui... Tenta de novo em alguns segundos!',
          type: 'api_error'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await openaiResponse.json()
    const assistantMessage = data.choices[0]?.message?.content || 'Desculpa, não consegui processar sua mensagem.'

    console.log(`✅ OpenAI response received, length: ${assistantMessage.length}`)
    console.log(`💬 Response preview: ${assistantMessage.substring(0, 200)}...`)

    // ✅ RESPOSTA SEGURA
    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
        usage: data.usage,
        model: data.model
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Edge Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: '😅 Eita! Deu um perrengue aqui... Tenta de novo!',
        type: 'internal_error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
}) 