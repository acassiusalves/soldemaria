
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
    const prompt = `Você é um analista de vendas expert. Sua tarefa é responder a perguntas sobre um conjunto de dados de vendas.
    Seja conciso, direto e amigável em suas respostas.
    Baseie sua resposta SOMENTE nos dados fornecidos. Não invente informações.
    Os dados de vendas estão no seguinte formato JSON:
    ${input.salesData}
    
    A pergunta do usuário é: "${input.question}"
    
    Analise os dados e forneça uma resposta clara.`;
    
    const llmResponse = await ai.generate({
      prompt: prompt,
      config: {
        temperature: 0.3,
      },
    });

    return {
      answer: llmResponse.text,
    };
  }
);
