'use server';

import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import type { AnalyzeQuestionOutput } from './analyze-question';

const GenerateAnswerInputSchema = z.object({
  question: z.string(),
  analysis: z.any(), // AnalyzeQuestionOutput
  data: z.string().describe('JSON string dos dados retornados do Firebase'),
  apiKey: z.string(),
  pathname: z.string(),
});

const GenerateAnswerOutputSchema = z.object({
  text: z.string().describe('A resposta formatada para o usuário'),
});

export type GenerateAnswerInput = z.infer<typeof GenerateAnswerInputSchema>;
export type GenerateAnswerOutput = z.infer<typeof GenerateAnswerOutputSchema>;

export async function generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerOutput> {
  const ai = genkit({
    plugins: [googleAI({ apiKey: input.apiKey })],
    model: 'googleai/gemini-1.5-flash',
  });

  const analysis = input.analysis as AnalyzeQuestionOutput;

  // Verificar se há dados
  const hasData = input.data && input.data !== '[]' && input.data !== '[{"collection":"vendas","data":[],"count":0}]';

  let prompt = '';

  if (!hasData) {
    prompt = `Você é a "Maria", assistente virtual da loja "Sol de Maria".

O usuário perguntou: "${input.question}"

Mas NÃO FORAM ENCONTRADOS DADOS para responder essa pergunta.

Responda de forma educada informando que:
1. Não encontrou dados para essa consulta
2. Pode ser que o período selecionado não tenha vendas, ou o nome/código especificado não existe
3. Sugira verificar se o nome está correto ou tentar outro período

Seja prestativa e ofereça ajuda para reformular a pergunta.`;
  } else {
    prompt = `Você é a "Maria", uma analista de vendas especializada da loja "Sol de Maria".

## SEU PAPEL:
- Analista expert em varejo e vendas
- Amigável, objetiva e prestativa
- Apresenta dados de forma clara e visual
- Usa emojis moderadamente para deixar amigável

## INSTRUÇÕES:
1. Analise os dados fornecidos
2. Responda a pergunta do usuário de forma COMPLETA e PRECISA
3. Use formatação markdown:
   - Bullets para listas
   - **Negrito** para destaques
   - Números para rankings
4. Apresente valores monetários em R$ (Real brasileiro)
5. Se for ranking, mostre pelo menos o top 5
6. Se for análise, dê insights úteis
7. Cite nomes específicos dos dados (produtos, clientes, vendedores)

## TIPO DA PERGUNTA:
${analysis.type}

## PRECISA AGREGAR?
${analysis.needsAggregation ? `Sim - Tipo: ${analysis.aggregationType}` : 'Não'}

## DADOS RETORNADOS DO FIREBASE:
${input.data}

## PERGUNTA DO USUÁRIO:
"${input.question}"

## CONTEXTO:
Página: ${input.pathname}

Agora, analise os dados e forneça uma resposta clara, objetiva e útil ao usuário.`;
  }

  const llmResponse = await ai.generate({
    prompt,
    config: {
      temperature: 0.3,
    },
  });

  return {
    text: llmResponse.text,
  };
}
