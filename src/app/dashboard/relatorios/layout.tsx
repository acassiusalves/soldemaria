
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText } from "lucide-react";

const navLinks = [
  { href: "/dashboard/relatorios/visao-geral", label: "Visão Geral" },
  { href: "/dashboard/relatorios/financeiro", label: "Financeiro" },
  { href: "/dashboard/relatorios/canais-e-origens", label: "Canais & Origens" },
];

export default function RelatoriosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-h3 flex items-center gap-2">
            <FileText className="size-6" />
            Relatórios
          </CardTitle>
          <CardDescription>
            Visualize e exporte relatórios consolidados para análises
            detalhadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <nav className="flex border-b">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
                  pathname === link.href
                    ? "border-b-2 border-primary text-primary"
                    : "border-b-2 border-transparent"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </CardContent>
      </Card>
      <div>{children}</div>
    </div>
  );
}
