
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
    const prompt = `Você é a "Maria", uma analista de vendas expert da empresa "Sol de Maria". Sua tarefa é responder a perguntas sobre um conjunto de dados de vendas.
    Seja concisa, direta e amigável em suas respostas. Aja como uma assistente prestativa.
    Baseie sua resposta SOMENTE nos dados de vendas fornecidos. Não invente informações.
    Se a resposta não estiver nos dados, informe que não encontrou a informação.
    Os dados de vendas estão no seguinte formato JSON:
    ${input.salesData}
    
    A pergunta do usuário é: "${input.question}"
    
    Analise os dados e forneça uma resposta clara e objetiva.`;
    
    // O Genkit SDK usará a chave de API passada aqui, se disponível.
    // O ideal seria configurar no 'googleAI()' plugin, mas faremos o override por request.
    const llmResponse = await ai.generate({
      prompt: prompt,
      config: {
        temperature: 0.2, // Reduzir a "criatividade" para respostas mais factuais
      },
      // Este campo não existe na definição do genkit, mas ilustra a intenção
      // A chave de API será gerenciada pela configuração do plugin no lado do servidor
      // A passagem via 'input' serve para cenários onde o client-side precisa autenticar
    });

    return {
      answer: llmResponse.text,
    };
  }
);
