
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientesPage() {
  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Clientes & Fidelização</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-48 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              Em breve: Análises de clientes, LTV, e coortes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
