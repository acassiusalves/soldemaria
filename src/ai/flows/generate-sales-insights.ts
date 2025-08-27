'use server';

/**
 * @fileOverview Generates sales insights from sales data.
 *
 * - generateSalesInsights - A function that generates sales insights.
 * - GenerateSalesInsightsInput - The input type for the generateSalesInsights function.
 * - GenerateSalesInsightsOutput - The return type for the generateSalesInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSalesInsightsInputSchema = z.object({
  salesData: z
    .string()
    .describe("The sales data in JSON format.  Include date, product category, product name, revenue, and units sold."),
});
export type GenerateSalesInsightsInput = z.infer<typeof GenerateSalesInsightsInputSchema>;

const GenerateSalesInsightsOutputSchema = z.object({
  insights: z.string().describe('The generated sales insights.'),
});
export type GenerateSalesInsightsOutput = z.infer<typeof GenerateSalesInsightsOutputSchema>;

export async function generateSalesInsights(input: GenerateSalesInsightsInput): Promise<GenerateSalesInsightsOutput> {
  return generateSalesInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSalesInsightsPrompt',
  input: {schema: GenerateSalesInsightsInputSchema},
  output: {schema: GenerateSalesInsightsOutputSchema},
  prompt: `Você é um analista de vendas sênior especializado em identificar tendências e oportunidades em dados de vendas. Analise os seguintes dados de vendas e forneça insights concisos e acionáveis em português do Brasil.

Dados de Vendas:
{{{salesData}}}

Considere os seguintes aspectos ao gerar os insights:

*   Tendências de vendas por categoria de produto.
*   Produtos com melhor e pior desempenho.
*   Variações sazonais nas vendas.
*   Oportunidades para aumentar as vendas.

Formato de saída:
Os insights devem ser apresentados em um formato de texto claro e conciso, destacando as principais descobertas e recomendações.`, safetySettings: [
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_ONLY_HIGH',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_LOW_AND_ABOVE',
    },
  ],
});

const generateSalesInsightsFlow = ai.defineFlow(
  {
    name: 'generateSalesInsightsFlow',
    inputSchema: GenerateSalesInsightsInputSchema,
    outputSchema: GenerateSalesInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
