
'use server';
/**
 * @fileOverview A sales insights AI agent.
 *
 * - salesInsights - A function that handles answering questions about sales data.
 * - SalesInsightsInput - The input type for the salesInsights function.
 * - SalesInsightsOutput - The return type for the salesInsights function.
 */

import { ai } from '@/ai/genkit';
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
  return salesInsightsFlow(input);
}

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
        promptText = `Você é a "Maria", uma IA amigável. O usuário disse "${input.question}". Responda com uma saudação curta e simpática.`;
    } else if (salesDataIsEmpty) {
        promptText = `Você é a "Maria", uma IA amigável. O usuário perguntou "${input.question}", mas não há dados de vendas para analisar. Informe ao usuário de forma educada que não há dados disponíveis no período selecionado e que ele deve escolher um período com vendas para que você possa ajudar.`;
    } else {
        promptText = `Você é a "Maria", uma analista de vendas expert da empresa "Sol de Maria". Sua tarefa é responder a perguntas sobre um conjunto de dados de vendas.
        Seja concisa, direta e amigável em suas respostas. Aja como uma assistente prestativa.
        Baseie sua resposta SOMENTE nos dados de vendas fornecidos. Não invente informações.
        Se a resposta não estiver nos dados, informe que não encontrou a informação.
        
        CONTEXTO ATUAL: O usuário está visualizando a página "${input.pathname}". Use isso para entender melhor a pergunta dele.

        Os dados de vendas (referentes ao período selecionado na tela) estão no seguinte formato JSON:
        ${input.salesData}
        
        A pergunta do usuário é: "${input.question}"
        
        Analise os dados e forneça uma resposta clara e objetiva.`;
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
