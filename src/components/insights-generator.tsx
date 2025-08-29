"use client";

import React, { useState, useTransition } from "react";
import { Bot, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateSalesInsights } from "@/ai/flows/generate-sales-insights";
import type { Venda } from "@/lib/data";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface InsightsGeneratorProps {
  data: Venda[];
}

export default function InsightsGenerator({ data }: InsightsGeneratorProps) {
  const [isPending, startTransition] = useTransition();
  const [insights, setInsights] = useState<string>("");
  const { toast } = useToast();

  const handleGenerateInsights = () => {
    startTransition(async () => {
      try {
        if (data.length === 0) {
          toast({
            title: "Dados Insuficientes",
            description: "Selecione um período com vendas para gerar insights.",
            variant: "destructive",
          });
          return;
        }
        
        // Ensure data is serializable JSON
        const salesJson = JSON.stringify(data);
        const result = await generateSalesInsights({ salesData: salesJson });
        setInsights(result.insights);
      } catch (error) {
        console.error("Error generating insights:", error);
        toast({
          title: "Erro ao Gerar Insights",
          description: "Houve um problema ao se comunicar com a IA. Tente novamente.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Bot className="size-6 text-primary" />
          <span>Insights com IA</span>
        </CardTitle>
        <CardDescription>
          Gere análises e recomendações automáticas com base nos dados de vendas selecionados.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
             <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : insights ? (
          <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {insights}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 rounded-lg border-2 border-dashed h-full">
            <Sparkles className="size-10 mb-4" />
            <p>Clique no botão abaixo para obter insights valiosos sobre suas vendas.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleGenerateInsights} disabled={isPending || data.length === 0} className="w-full">
          {isPending ? "Gerando..." : "Gerar Insights"}
        </Button>
      </CardFooter>
    </Card>
  );
}
