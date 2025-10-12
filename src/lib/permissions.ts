
export type Role = 'admin' | 'socio' | 'financeiro' | 'vendedor' | 'logistica' | 'expedicao';

export const availableRoles: { key: Role; name: string }[] = [
  { key: "admin", name: "Admin" },
  { key: "socio", name: "Sócio" },
  { key: "financeiro", name: "Financeiro" },
  { key: "vendedor", name: "Vendedor" },
  { key: "logistica", name: "Logística" },
  { key: "expedicao", name: "Expedição" },
];

export const pagePermissions: Record<string, Role[]> = {
  '/dashboard': ['admin', 'socio', 'financeiro', 'vendedor', 'logistica', 'expedicao'],
  '/dashboard/vendas': ['admin', 'socio', 'vendedor'],
  '/dashboard/logistica': ['admin', 'socio', 'logistica', 'expedicao'],
  '/dashboard/relatorios': ['admin', 'socio', 'financeiro'],
  '/dashboard/taxas': ['admin', 'socio', 'financeiro'],
  '/dashboard/conexoes': ['admin'],
  '/dashboard/permissoes': ['admin'],
  '/dashboard/configuracoes': ['admin'],
};

// You can add more pages here with their default roles
export const allPages = [
    '/dashboard',
    '/dashboard/vendas',
    '/dashboard/logistica',
    '/dashboard/relatorios',
    '/dashboard/taxas',
    '/dashboard/conexoes',
    '/dashboard/permissoes',
    '/dashboard/configuracoes',
];

    