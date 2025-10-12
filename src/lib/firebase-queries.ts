import { getServerDb } from './firebase-server';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

export interface FirebaseQuery {
  collection: string;
  filters?: {
    field: string;
    operator: string;
    value: any;
  }[];
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  limitCount?: number;
}

export interface QueryResult {
  collection: string;
  data: any[];
  count: number;
}

/**
 * Executa múltiplas queries no Firebase e retorna os resultados
 */
export async function queryFirebase(queries: FirebaseQuery[]): Promise<QueryResult[]> {
  const db = getServerDb();

  const results: QueryResult[] = [];

  for (const queryConfig of queries) {
    try {
      const collectionRef = collection(db, queryConfig.collection);
      let q = query(collectionRef);

      // Aplicar filtros
      if (queryConfig.filters && queryConfig.filters.length > 0) {
        for (const filter of queryConfig.filters) {
          const operator = filter.operator as any;
          q = query(q, where(filter.field, operator, filter.value));
        }
      }

      // Aplicar ordenação
      if (queryConfig.orderByField) {
        q = query(
          q,
          orderBy(queryConfig.orderByField, queryConfig.orderDirection || 'desc')
        );
      }

      // Aplicar limite
      if (queryConfig.limitCount) {
        q = query(q, limit(queryConfig.limitCount));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      results.push({
        collection: queryConfig.collection,
        data,
        count: data.length,
      });

      console.log(`✅ Query executada: ${queryConfig.collection} - ${data.length} resultados`);
    } catch (error: any) {
      console.error(`❌ Erro ao executar query em ${queryConfig.collection}:`, error.message);
      results.push({
        collection: queryConfig.collection,
        data: [],
        count: 0,
      });
    }
  }

  return results;
}

/**
 * Busca vendas com filtros flexíveis
 */
export async function querySales(filters: {
  startDate?: Date;
  endDate?: Date;
  cliente?: string;
  vendedor?: string;
  produto?: string;
  limitCount?: number;
}) {
  const queries: FirebaseQuery[] = [];

  const salesQuery: FirebaseQuery = {
    collection: 'vendas',
    filters: [],
    limitCount: filters.limitCount || 1000,
  };

  // Adicionar filtros se fornecidos
  if (filters.startDate) {
    salesQuery.filters!.push({
      field: 'data',
      operator: '>=',
      value: Timestamp.fromDate(filters.startDate),
    });
  }

  if (filters.endDate) {
    salesQuery.filters!.push({
      field: 'data',
      operator: '<=',
      value: Timestamp.fromDate(filters.endDate),
    });
  }

  if (filters.cliente) {
    salesQuery.filters!.push({
      field: 'nomeCliente',
      operator: '==',
      value: filters.cliente,
    });
  }

  if (filters.vendedor) {
    salesQuery.filters!.push({
      field: 'vendedor',
      operator: '==',
      value: filters.vendedor,
    });
  }

  queries.push(salesQuery);

  return queryFirebase(queries);
}

/**
 * Busca agregada de produtos mais vendidos
 */
export async function getTopProducts(limitCount: number = 10) {
  const db = getServerDb();

  // Buscar todas as vendas
  const salesRef = collection(db, 'vendas');
  const snapshot = await getDocs(salesRef);

  // Agregar produtos
  const productsMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.descricao) {
      const existing = productsMap.get(data.descricao) || {
        name: data.descricao,
        quantity: 0,
        revenue: 0,
      };

      existing.quantity += Number(data.quantidade) || 0;
      existing.revenue += Number(data.final) || 0;

      productsMap.set(data.descricao, existing);
    }
  });

  // Ordenar por revenue e pegar top N
  const topProducts = Array.from(productsMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limitCount);

  return [{
    collection: 'produtos_agregados',
    data: topProducts,
    count: topProducts.length,
  }];
}

/**
 * Busca agregada de top clientes
 */
export async function getTopCustomers(limitCount: number = 10) {
  const db = getServerDb();

  const salesRef = collection(db, 'vendas');
  const snapshot = await getDocs(salesRef);

  // Agregar clientes
  const customersMap = new Map<string, { name: string; orders: Set<string>; revenue: number }>();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.nomeCliente) {
      const codigo = data.codigo || data.codigoPedido || doc.id;
      const existing = customersMap.get(data.nomeCliente) || {
        name: data.nomeCliente,
        orders: new Set(),
        revenue: 0,
      };

      existing.orders.add(codigo);
      existing.revenue += Number(data.final) || 0;

      customersMap.set(data.nomeCliente, existing);
    }
  });

  // Converter e ordenar
  const topCustomers = Array.from(customersMap.values())
    .map(customer => ({
      name: customer.name,
      orders: customer.orders.size,
      revenue: customer.revenue,
      averageTicket: customer.orders.size > 0 ? customer.revenue / customer.orders.size : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limitCount);

  return [{
    collection: 'clientes_agregados',
    data: topCustomers,
    count: topCustomers.length,
  }];
}

/**
 * Busca agregada de performance de vendedores
 */
export async function getVendorsPerformance(limitCount: number = 10) {
  const db = getServerDb();

  const salesRef = collection(db, 'vendas');
  const snapshot = await getDocs(salesRef);

  // Agregar vendedores
  const vendorsMap = new Map<string, { name: string; orders: Set<string>; revenue: number; items: number }>();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const vendorName = data.vendedor || 'Sem Vendedor';
    const codigo = data.codigo || data.codigoPedido || doc.id;

    const existing = vendorsMap.get(vendorName) || {
      name: vendorName,
      orders: new Set(),
      revenue: 0,
      items: 0,
    };

    existing.orders.add(codigo);
    existing.revenue += Number(data.final) || 0;
    existing.items += Number(data.quantidade) || 0;

    vendorsMap.set(vendorName, existing);
  });

  // Converter e ordenar
  const topVendors = Array.from(vendorsMap.values())
    .map(vendor => ({
      name: vendor.name,
      orders: vendor.orders.size,
      revenue: vendor.revenue,
      averageTicket: vendor.orders.size > 0 ? vendor.revenue / vendor.orders.size : 0,
      averageItemsPerOrder: vendor.orders.size > 0 ? vendor.items / vendor.orders.size : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limitCount);

  return [{
    collection: 'vendedores_agregados',
    data: topVendors,
    count: topVendors.length,
  }];
}
