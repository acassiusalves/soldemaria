'use server';

import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

const AnalyzeQuestionInputSchema = z.object({
  question: z.string(),
  apiKey: z.string(),
  pathname: z.string(),
});

const QuerySchema = z.object({
  collection: z.string().describe('Nome da coleção no Firebase (vendas, custos, taxas, etc)'),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any(),
  })).optional(),
  orderByField: z.string().optional(),
  orderDirection: z.enum(['asc', 'desc']).optional(),
  limitCount: z.number().optional(),
});

const AnalyzeQuestionOutputSchema = z.object({
  type: z.enum(['greeting', 'sales_query', 'product_query', 'customer_query', 'vendor_query', 'general_metrics', 'specific_sale']),
  queries: z.array(QuerySchema),
  suggestedResponse: z.string().optional(),
  needsAggregation: z.boolean().describe('Se precisa agregar dados (soma, média, ranking)'),
  aggregationType: z.enum(['sum', 'average', 'count', 'ranking', 'none']).optional(),
});

export type AnalyzeQuestionInput = z.infer<typeof AnalyzeQuestionInputSchema>;
export type AnalyzeQuestionOutput = z.infer<typeof AnalyzeQuestionOutputSchema>;

export async function analyzeQuestion(input: AnalyzeQuestionInput): Promise<AnalyzeQuestionOutput> {
  const ai = genkit({
    plugins: [googleAI({ apiKey: input.apiKey })],
    model: 'googleai/gemini-1.5-flash',
  });

  const isGreeting = /^(oi|olá|ola|oie|hey|bom dia|boa tarde|boa noite|tudo bem)\b/i.test(input.question.trim());

  if (isGreeting) {
    return {
      type: 'greeting',
      queries: [],
      needsAggregation: false,
      suggestedResponse: 'Olá! 👋 Sou a Maria, sua assistente de análise de vendas da Sol de Maria.\n\nPosso ajudar você com:\n• Informações sobre vendas e pedidos\n• Rankings de produtos, clientes e vendedores\n• Análises e métricas do negócio\n• Busca de vendas específicas\n\nO que você gostaria de saber?',
    };
  }

  const prompt = `Você é um assistente especializado em analisar perguntas sobre dados de vendas e convertê-las em queries estruturadas para Firebase.

## SUA TAREFA:
Analise a pergunta do usuário e determine:
1. Qual o TIPO da pergunta
2. Quais CONSULTAS (queries) precisam ser feitas no Firebase
3. Se precisa AGREGAR dados (somar, contar, rankear)

## TIPOS DE PERGUNTAS:
- greeting: Saudações
- sales_query: Perguntas sobre vendas em geral
- product_query: Perguntas sobre produtos
- customer_query: Perguntas sobre clientes
- vendor_query: Perguntas sobre vendedores
- general_metrics: Métricas gerais (faturamento, ticket médio)
- specific_sale: Busca de uma venda específica por código

## COLEÇÕES DISPONÍVEIS NO FIREBASE:
- "vendas": Contém todas as vendas com campos: codigo, nomeCliente, descricao, final, quantidade, custoTotal, vendedor, tipo, logistica, data
- "custos": Custos de vendas
- "taxas": Taxas de operadoras
- "custos_embalagem": Custos de embalagem
- "logistica": Dados de logística

## EXEMPLOS:

Pergunta: "Quem foi o melhor vendedor?"
Resposta: {
  "type": "vendor_query",
  "queries": [{
    "collection": "vendas",
    "limitCount": 1000
  }],
  "needsAggregation": true,
  "aggregationType": "ranking"
}

Pergunta: "Mostre as vendas do cliente João Silva"
Resposta: {
  "type": "customer_query",
  "queries": [{
    "collection": "vendas",
    "filters": [{"field": "nomeCliente", "operator": "==", "value": "João Silva"}],
    "limitCount": 100
  }],
  "needsAggregation": false
}

Pergunta: "Qual o faturamento total?"
Resposta: {
  "type": "general_metrics",
  "queries": [{
    "collection": "vendas",
    "limitCount": 10000
  }],
  "needsAggregation": true,
  "aggregationType": "sum"
}

Pergunta: "Quais os 5 produtos mais vendidos?"
Resposta: {
  "type": "product_query",
  "queries": [{
    "collection": "vendas",
    "limitCount": 1000
  }],
  "needsAggregation": true,
  "aggregationType": "ranking"
}

## PERGUNTA DO USUÁRIO:
"${input.question}"

## CONTEXTO:
Página atual: ${input.pathname}

Analise e retorne APENAS o JSON estruturado com type, queries, needsAggregation e aggregationType.`;

  const llmResponse = await ai.generate({
    prompt,
    config: {
      temperature: 0.1,
    },
    output: {
      schema: AnalyzeQuestionOutputSchema,
    },
  });

  return llmResponse.output as AnalyzeQuestionOutput;
}
