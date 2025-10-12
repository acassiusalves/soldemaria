import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getDbClient } from '@/lib/firebase';
import { collection, query, getDocs, Query, QueryConstraint, where, limit, orderBy } from 'firebase/firestore';

interface UseFirestoreDataOptions {
  collectionName: string;
  constraints?: QueryConstraint[];
  cacheTime?: number; // em milissegundos
  enabled?: boolean;
}

interface UseFirestoreDataReturn<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

// Cache global para dados
const dataCache = new Map<string, { data: any[]; timestamp: number }>();

export function useFirestoreData<T = any>(
  options: UseFirestoreDataOptions
): UseFirestoreDataReturn<T> {
  const { collectionName, constraints = [], cacheTime = 5 * 60 * 1000, enabled = true } = options;

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Usar ref para evitar re-execução desnecessária
  const constraintsRef = useRef(constraints);
  constraintsRef.current = constraints;

  // Gerar chave única para o cache baseada na query
  const getCacheKey = useCallback(() => {
    // Usar constraintsRef para evitar dependência circular
    const constraintsStr = JSON.stringify(
      constraintsRef.current.map(c => c.toString())
    );
    return `${collectionName}-${constraintsStr}`;
  }, [collectionName]); // Removido 'constraints' da dependência

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    const cacheKey = getCacheKey();
    const cached = dataCache.get(cacheKey);

    // Verificar cache
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      setData(cached.data);
      setIsLoading(false);
      setLastUpdated(new Date(cached.timestamp));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const db = await getDbClient();
      if (!db) {
        throw new Error('Database client not available');
      }

      const q = query(collection(db, collectionName), ...constraintsRef.current);
      const snapshot = await getDocs(q);

      const fetchedData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as T[];

      // Atualizar cache
      dataCache.set(cacheKey, {
        data: fetchedData,
        timestamp: Date.now(),
      });

      setData(fetchedData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(`Error fetching ${collectionName}:`, err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, cacheTime, enabled]); // Removido getCacheKey da dependência

  useEffect(() => {
    fetchData();
  }, [getCacheKey]); // Executa quando a chave muda (ou seja, quando constraints mudam)

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    lastUpdated,
  };
}

// Hook especializado para vendas com filtros de data
export function useSalesData(dateFrom?: Date, dateTo?: Date, extraConstraints: QueryConstraint[] = []) {
  // Usar useMemo para evitar recriar constraints a cada render
  const constraints = React.useMemo(() => {
    const c: QueryConstraint[] = [];

    if (dateFrom) {
      c.push(where('data', '>=', dateFrom));
    }
    if (dateTo) {
      c.push(where('data', '<=', dateTo));
    }

    // Adicionar ordenação e limite
    c.push(orderBy('data', 'desc'));
    c.push(limit(5000)); // Limite de segurança
    c.push(...extraConstraints);

    return c;
  }, [dateFrom?.getTime(), dateTo?.getTime(), extraConstraints.length]); // Usar getTime() para comparar datas

  return useFirestoreData({
    collectionName: 'vendas',
    constraints,
    cacheTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para logística
export function useLogisticsData(dateFrom?: Date, dateTo?: Date) {
  const constraints = useMemo(() => {
    const c: QueryConstraint[] = [];

    if (dateFrom) {
      c.push(where('data', '>=', dateFrom));
    }
    if (dateTo) {
      c.push(where('data', '<=', dateTo));
    }

    c.push(orderBy('data', 'desc'));
    c.push(limit(3000));

    return c;
  }, [dateFrom?.getTime(), dateTo?.getTime()]);

  return useFirestoreData({
    collectionName: 'logistica',
    constraints,
    cacheTime: 5 * 60 * 1000,
  });
}

// Hook para taxas (dados pequenos, cache mais longo)
export function useTaxasData() {
  return useFirestoreData({
    collectionName: 'taxas',
    constraints: [],
    cacheTime: 15 * 60 * 1000, // 15 minutos
  });
}

// Hook para custos
export function useCustosData() {
  return useFirestoreData({
    collectionName: 'custos',
    constraints: [],
    cacheTime: 15 * 60 * 1000,
  });
}

// Hook para custos de embalagem
export function useCustosEmbalagemData() {
  return useFirestoreData({
    collectionName: 'custos-embalagem',
    constraints: [],
    cacheTime: 15 * 60 * 1000,
  });
}

// Função para limpar cache (útil após importar planilha)
export function clearFirestoreCache() {
  dataCache.clear();
}
