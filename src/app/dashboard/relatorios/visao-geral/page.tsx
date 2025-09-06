
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VisaoGeralPage() {
  return (
    <div className="grid grid-cols-1 gap-6">
       <Card>
        <CardHeader>
            <CardTitle>Visão Geral (Executiva)</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex justify-center items-center h-48 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Em breve: KPIs e gráficos executivos.</p>
            </div>
        </CardContent>
       </Card>
    </div>
  );
}
