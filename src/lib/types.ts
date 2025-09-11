
export type Role = 'admin' | 'socio' | 'financeiro' | 'vendedor' | 'logistica' | 'expedicao';

export type AppUser = {
  id: string;
  email: string;
  role: Role;
};

export type AppSettings = {
    permissions: Record<string, Role[]>;
    inactivePages: string[];
}
