
'use server';
/**
 * @fileOverview A sales insights AI agent.
 *
 * - salesInsights - A function that handles answering questions about sales data.
 * - SalesInsightsInput - The input type for the salesInsights function.
 * - SalesInsightsOutput - The return type for the salesInsights function.
 */

import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

const SalesInsightsInputSchema = z.object({
  question: z.string().describe('The user\'s question about the sales data.'),
  salesData: z.string().describe('A JSON string representing an array of sales data objects.'),
  apiKey: z.string().describe('The Google AI API key.'),
  pathname: z.string().describe('The current page the user is viewing.'),
});
export type SalesInsightsInput = z.infer<typeof SalesInsightsInputSchema>;

const SalesInsightsOutputSchema = z.object({
  answer: z.string().describe('The AI\'s answer to the user\'s question.'),
});
export type SalesInsightsOutput = z.infer<typeof SalesInsightsOutputSchema>;

export async function salesInsights(input: SalesInsightsInput): Promise<SalesInsightsOutput> {
  // Criar instância do Genkit com a API key fornecida
  const ai = genkit({
    plugins: [googleAI({ apiKey: input.apiKey })],
    model: 'googleai/gemini-1.5-flash',
  });

  // Executar o fluxo diretamente
  const salesInsightsFlow = ai.defineFlow(
    {
      name: 'salesInsightsFlow',
      inputSchema: SalesInsightsInputSchema,
      outputSchema: SalesInsightsOutputSchema,
    },
    async (input) => {
    
    const salesDataIsEmpty = !input.salesData || input.salesData === '[]' || input.salesData.trim() === '';
    const isGreeting = /^(oi|olá|ola|bom dia|boa tarde|boa noite)\b/i.test(input.question.trim());

    let promptText: string;

    if (isGreeting) {
        promptText = `Você é a "Maria", a assistente virtual inteligente da loja "Sol de Maria".
        O usuário disse "${input.question}".
        Responda com uma saudação calorosa e se apresente brevemente, mencionando que você pode ajudar com análises de vendas, informações sobre produtos, clientes e outras métricas do negócio.`;
    } else if (salesDataIsEmpty) {
        promptText = `Você é a "Maria", a assistente virtual da loja "Sol de Maria".
        O usuário perguntou "${input.question}", mas não há dados de vendas disponíveis para o período atualmente selecionado.

        Informe ao usuário de forma educada e prestativa que:
        1. Não há dados disponíveis no período atual
        2. Ele pode selecionar um período diferente usando o seletor de data no topo da página
        3. Você estará pronta para ajudar assim que houver dados disponíveis`;
    } else {
        promptText = `Você é a "Maria", uma analista de vendas especializada e assistente virtual da loja "Sol de Maria".

## SEU PAPEL:
- Analista de dados expert em varejo e vendas
- Amigável, prestativa e objetiva nas respostas
- Capaz de identificar tendências, padrões e insights nos dados
- Responde em português do Brasil

## INSTRUÇÕES IMPORTANTES:
1. Baseie suas respostas EXCLUSIVAMENTE nos dados fornecidos
2. Se não encontrar a informação nos dados, seja honesta e diga que não tem essa informação
3. Use formatação clara: bullets, números, quebras de linha quando apropriado
4. Apresente valores monetários sempre em Real (R$)
5. Quando falar de produtos, clientes ou vendedores, cite nomes específicos dos dados
6. Se a pergunta for vaga, faça análises relevantes ao contexto

## CONTEXTO ATUAL:
- Página: ${input.pathname}
- Período: Os dados abaixo são referentes ao período selecionado pelo usuário
- Amostra: Os dados podem estar limitados aos 100 registros mais recentes para otimização

## TIPOS DE ANÁLISES QUE VOCÊ PODE FAZER:
- Ranking de produtos mais vendidos
- Performance de vendedores
- Análise de clientes (top clientes, ticket médio, etc)
- Métricas financeiras (faturamento, margem, custos)
- Comparações e tendências
- Cálculos e totalizações

## DADOS DE VENDAS (JSON):
${input.salesData}

## PERGUNTA DO USUÁRIO:
"${input.question}"

## SUA RESPOSTA:
Analise os dados acima e forneça uma resposta clara, objetiva e útil. Use emojis moderadamente para deixar a resposta mais amigável.`;
    }

    const llmResponse = await ai.generate({
      prompt: promptText,
      config: {
        temperature: 0.2,
      },
    });

    return {
      answer: llmResponse.text,
    };
  }
);

  return salesInsightsFlow(input);
}
