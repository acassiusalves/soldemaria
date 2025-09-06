import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Visão de Vendas',
  description: 'Sistema de acompanhamento e análise de vendas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
