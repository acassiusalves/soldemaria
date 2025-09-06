
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProdutosPage() {
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Produtos & Mix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-48 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              Em breve: Análises de produtos, categorias e curva ABC.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
