"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return "N/A";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const PaymentPanel = ({ row }: { row: any }) => {
  const { parcelas, total_valor_parcelas, final: valorFinal } = row;

  const totalParcelas = total_valor_parcelas || 0;
  const diferenca = valorFinal - totalParcelas;

  return (
    <div className="p-2 rounded-md bg-background">
      <h4 className="font-semibold p-2">Painel Financeiro</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor Total do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(valorFinal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total em Parcelas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalParcelas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Diferença</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                diferenca !== 0 ? "text-destructive" : "text-green-600"
              }`}
            >
              {formatCurrency(diferenca)}
            </div>
            <p className="text-xs text-muted-foreground">
              (Total - Parcelas)
            </p>
          </CardContent>
        </Card>
      </div>

      {parcelas && parcelas.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Valor</TableHead>
              <TableHead>Modo de Pagamento</TableHead>
              <TableHead>Bandeira</TableHead>
              <TableHead>Instituição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parcelas.map((p: any, index: number) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {formatCurrency(p.valor)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{p.modo || "N/A"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{p.bandeira || "N/A"}</Badge>
                </TableCell>
                <TableCell>{p.instituicao || "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default PaymentPanel;
