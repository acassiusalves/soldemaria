import { NextRequest, NextResponse } from 'next/server';
import { analyzeQuestion } from '@/ai/flows/analyze-question';
import { queryFirebase } from '@/lib/firebase-queries';
import { generateAnswer } from '@/ai/flows/generate-answer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatRequest {
  question: string;
  pathname: string;
}

export async function POST(request: NextRequest) {
  console.log('📨 API /api/chat chamada');

  try {
    let body: ChatRequest;

    try {
      const text = await request.text();
      console.log('📦 Request body (raw):', text);
      body = JSON.parse(text);
    } catch (parseError: any) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError.message);
      return NextResponse.json(
        { error: 'Corpo da requisição inválido', details: parseError.message },
        { status: 400 }
      );
    }

    const { question, pathname } = body;

    // Usa a chave API compartilhada do servidor
    const apiKey = process.env.GEMINI_API_KEY;

    console.log('📝 Dados recebidos:', { question, hasApiKey: !!apiKey, pathname });

    if (!question) {
      console.log('❌ Faltando dados obrigatórios');
      return NextResponse.json(
        { error: 'Pergunta é obrigatória' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      console.log('❌ Chave API do Gemini não configurada no servidor');
      return NextResponse.json(
        { error: 'Chave API do Gemini não configurada. Entre em contato com o administrador.' },
        { status: 500 }
      );
    }

    // Passo 1: Analisar a pergunta e determinar o tipo de consulta necessária
    console.log('🔍 Analisando pergunta:', question);
    const analysis = await analyzeQuestion({ question, apiKey, pathname });
    console.log('✅ Análise completa:', analysis);

    // Passo 2: Se for uma saudação, responder direto
    if (analysis.type === 'greeting') {
      return NextResponse.json({
        answer: analysis.suggestedResponse || 'Olá! Como posso ajudar com suas vendas?',
        dataUsed: [],
      });
    }

    // Passo 3: Buscar dados no Firebase baseado na análise
    console.log('📊 Buscando dados no Firebase:', analysis.queries);
    const data = await queryFirebase(analysis.queries);

    // Passo 4: Gerar resposta com os dados encontrados
    console.log('🤖 Gerando resposta...');
    const answer = await generateAnswer({
      question,
      analysis,
      data: JSON.stringify(data),
      apiKey,
      pathname,
    });

    return NextResponse.json({
      answer: answer.text,
      dataUsed: data,
      queriesExecuted: analysis.queries,
    });

  } catch (error: any) {
    console.error('❌ Erro na API /api/chat:', error);

    return NextResponse.json(
      {
        error: 'Erro ao processar pergunta',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
