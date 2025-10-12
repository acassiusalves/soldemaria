# 🚀 Guia de Otimização - Performance

## ✅ Otimizações Implementadas

### 1. Hook Customizado `useFirestoreData`
Localização: `/src/hooks/use-firestore-data.ts`

**Recursos**:
- ✅ Cache automático (5-15 minutos)
- ✅ Queries com filtros de data
- ✅ Limites de segurança
- ✅ `getDocs` ao invés de `onSnapshot`

### 2. Componente `RefreshButton`
Localização: `/src/components/refresh-button.tsx`

### 3. App Context Otimizado
Localização: `/src/contexts/app-context.tsx`
- ✅ Configurações em cache
- ✅ Sem listeners desnecessários

### 4. Dashboard Principal
Localização: `/src/app/dashboard/page.tsx`
- ✅ Totalmente otimizado

---

## 📝 Como Otimizar Outras Páginas

### Padrão de Substituição

#### ❌ ANTES (Lento):
```typescript
// Carrega TUDO sem filtros
const [allSales, setAllSales] = useState<VendaDetalhada[]>([]);

useEffect(() => {
  const unsubs: (() => void)[] = [];

  // Listener em tempo real carregando tudo
  const salesQuery = query(collection(db, "vendas"));
  const unsubSales = onSnapshot(salesQuery, snapshot => {
    const sales = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
    setAllSales(sales);
  });
  unsubs.push(unsubSales);

  return () => unsubs.forEach(unsub => unsub());
}, []);

// Filtrar no cliente
const filteredData = useMemo(() => {
  return allSales.filter((item) => {
    const itemDate = toDate(item.data);
    return itemDate && itemDate >= fromDate && itemDate <= toDate;
  });
}, [date, allSales]);
```

#### ✅ DEPOIS (Rápido):
```typescript
// Importar hooks
import { useSalesData } from "@/hooks/use-firestore-data";
import { RefreshButton } from "@/components/refresh-button";

// Usar hook otimizado (já vem filtrado e com cache)
const {
  data: allSales,
  isLoading: salesLoading,
  refetch: refetchSales,
  lastUpdated: salesLastUpdated
} = useSalesData(date?.from, date?.to || date?.from);

// Não precisa filtrar - já vem filtrado!
const filteredData = allSales;

// Adicionar botão de atualizar no JSX
<RefreshButton
  onRefresh={refetchSales}
  isLoading={salesLoading}
  lastUpdated={salesLastUpdated}
/>
```

---

## 📋 Páginas que Precisam de Otimização

### ⏳ Pendentes:

1. **`/app/dashboard/vendas/page.tsx`** - PRIORIDADE ALTA
   - Tem 5 listeners onSnapshot
   - Carrega coleções completas
   - Processamento pesado no cliente

2. **`/app/dashboard/logistica/page.tsx`** - ALTA
   - 1 listener sem filtros
   - Processa dados no cliente

3. **`/app/publico/page.tsx`** - MÉDIA
   - 1 listener com filtros
   - Pode melhorar com cache

4. **Relatórios** - MÉDIA
   - `/relatorios/visao-geral/page.tsx`
   - `/relatorios/financeiro/page.tsx`
   - `/relatorios/produtos/page.tsx`
   - `/relatorios/clientes/page.tsx`
   - `/relatorios/vendedores/page.tsx`
   - `/relatorios/canais-e-origens/page.tsx`

5. **Taxas** - BAIXA (dados pequenos)
   - `/taxas/cartao/page.tsx`
   - `/taxas/custos/page.tsx`
   - `/taxas/custos-embalagem/page.tsx`

---

## 🔧 Hooks Disponíveis

### Para Vendas:
```typescript
useSalesData(dateFrom, dateTo, extraConstraints)
```

### Para Logística:
```typescript
useLogisticsData(dateFrom, dateTo)
```

### Para Taxas/Custos (dados pequenos):
```typescript
useTaxasData()           // Cache 15 min
useCustosData()          // Cache 15 min
useCustosEmbalagemData() // Cache 15 min
```

### Genérico:
```typescript
useFirestoreData({
  collectionName: "minha-colecao",
  constraints: [
    where("campo", ">=", valor),
    orderBy("campo"),
    limit(1000)
  ],
  cacheTime: 5 * 60 * 1000 // 5 minutos
})
```

---

## 📊 Resultados Esperados

### Antes:
- ⏱️ Carregamento inicial: 5-10 segundos
- 💰 Custo Firestore: Alto (muitas leituras)
- 🐌 Performance: Lenta com muitos dados
- 🔄 Atualização: Automática (desnecessária)

### Depois:
- ⚡ Carregamento inicial: 0.5-2 segundos (70-90% mais rápido)
- 💰 Custo Firestore: Baixo (60-70% menos leituras)
- 🚀 Performance: Rápida mesmo com muitos dados
- 🔄 Atualização: Manual (botão Atualizar)

---

## 🚨 Importante

### Quando Atualizar Dados:
1. ✅ Usuário clica no botão "Atualizar"
2. ✅ Usuário muda o filtro de data
3. ✅ Usuário recarrega a página (F5)
4. ✅ Cache expira (5-15 minutos)

### O que NÃO Funciona Mais:
- ❌ Atualização automática em tempo real
- ❌ Ver vendas entrando "ao vivo"

**Isso não é problema** porque:
- ✅ Sistema é alimentado por planilha (não vendas ao vivo)
- ✅ Dados mudam apenas quando importam nova planilha
- ✅ Basta clicar "Atualizar" após importar

---

## 🔑 Índices do Firestore Necessários

Execute no Firebase Console:

### Vendas:
```
Collection: vendas
Fields:
  - data (Ascending)
  - vendedor (Ascending)
```

### Logística:
```
Collection: logistica
Fields:
  - data (Ascending)
  - status (Ascending)
```

---

## 📞 Suporte

Se encontrar erros após otimizar:
1. Verifique se importou os hooks corretamente
2. Confirme que o `date` tem `from` e `to`
3. Veja o console do navegador para erros
4. Compare com o dashboard otimizado (`/app/dashboard/page.tsx`)

---

**Última atualização**: 2025-01-12
**Status**: Dashboard principal otimizado ✅
