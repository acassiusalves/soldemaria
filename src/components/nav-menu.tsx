
"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/contexts/app-context';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navLinks = [
  { href: '/dashboard', label: 'Painel' },
  { href: '/dashboard/vendas', label: 'Vendas' },
  { href: '/dashboard/logistica', label: 'Logística' },
  {
    label: 'Relatórios',
    subLinks: [
      { href: '/dashboard/relatorios/geral', label: 'Geral' },
      { href: '/dashboard/relatorios/visao-geral', label: 'Visão Geral' },
      { href: '/dashboard/relatorios/financeiro', label: 'Financeiro' },
      { href: '/dashboard/relatorios/canais-e-origens', label: 'Canais & Origens' },
      { href: '/dashboard/relatorios/vendedores', label: 'Vendedores' },
      { href: '/dashboard/relatorios/produtos', label: 'Produtos' },
      { href: '/dashboard/relatorios/clientes', label: 'Clientes' },
    ],
  },
  {
    label: 'Taxas',
    subLinks: [
      { href: '/dashboard/taxas/cartao', label: 'Taxas do Cartão' },
      { href: '/dashboard/taxas/custos', label: 'Custos sobre Vendas' },
      { href: '/dashboard/taxas/custos-embalagem', label: 'Custos Embalagem' },
    ],
  },
  { href: '/dashboard/conexoes', label: 'Conexões' },
  { href: '/publico', label: 'Público' },
];

export function NavMenu() {
  const { userRole, appSettings } = useApp();
  const pathname = usePathname();

  if (!userRole || !appSettings) {
    return null; // Or a loading state
  }

  const hasAccess = (href: string) => {
    if (href === '/publico') return true; // Public page always has access
    if (userRole === 'admin') return true;
    
    // Find the most specific permission key that matches the start of the href
    const permissionKey = Object.keys(appSettings.permissions)
                                .sort((a, b) => b.length - a.length) // more specific first
                                .find(p => href.startsWith(p));

    if (!permissionKey) return false;

    const isPageActive = !appSettings.inactivePages?.includes(permissionKey);
    const hasRolePermission = appSettings.permissions[permissionKey]?.includes(userRole);

    return isPageActive && hasRolePermission;
  };
  
  const isLinkActive = (href: string) => pathname === href;

  const renderLink = (link: { href: string, label: string }) => {
    if (!hasAccess(link.href)) return null;
    return (
      <Link
        key={link.href}
        href={link.href}
        className={isLinkActive(link.href) ? 'text-foreground transition-colors hover:text-foreground' : 'text-muted-foreground transition-colors hover:text-foreground'}
      >
        {link.label}
      </Link>
    );
  };

  const renderDropdown = (menu: { label: string, subLinks: { href: string, label: string }[] }) => {
    const accessibleSubLinks = menu.subLinks.filter(sub => hasAccess(sub.href));
    if (accessibleSubLinks.length === 0) return null;
    
    const isMenuActive = accessibleSubLinks.some(sub => pathname.startsWith(sub.href));
    
    return (
      <DropdownMenu key={menu.label}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`flex items-center gap-1 px-3 data-[state=open]:bg-accent ${isMenuActive ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            {menu.label}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {accessibleSubLinks.map(subLink => (
            <DropdownMenuItem key={subLink.href} asChild>
              <Link href={subLink.href}>{subLink.label}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold md:text-base">
        <Logo className="size-8 text-primary" />
        <span className="text-xl font-semibold font-headline">Visão de Vendas</span>
      </Link>
      {navLinks.map(link => {
        if ('href' in link) {
          return renderLink(link as { href: string, label: string });
        }
        if ('subLinks' in link) {
          return renderDropdown(link as { label: string, subLinks: { href: string, label: string }[] });
        }
        return null;
      })}
    </nav>
  );
}

    