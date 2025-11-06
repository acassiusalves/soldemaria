import { useState, useEffect } from 'react';
import { getDbClient } from '@/lib/firebase';
import { collection, query, getDocs, QueryConstraint, where, limit, orderBy } from 'firebase/firestore';

interface UseFirestoreDataReturn<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  lastUpdated: Date | null;
}

// Cache global simples
const dataCache = new Map<string, { data: any[]; timestamp: number }>();

export function useFirestoreCollection<T = any>(
  collectionName: string,
  cacheKey: string,
  buildQuery: (collectionRef: any) => any,
  cacheTime: number = 5 * 60 * 1000
): UseFirestoreDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        // Verificar cache
        const cached = dataCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cacheTime && refreshTrigger === 0) {
          if (isMounted) {
            setData(cached.data);
            setIsLoading(false);
            setLastUpdated(new Date(cached.timestamp));
          }
          return;
        }

        setIsLoading(true);
        setError(null);

        const db = await getDbClient();
        if (!db) throw new Error('Database not available');

        const collectionRef = collection(db, collectionName);
        const q = buildQuery(collectionRef);
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

        if (isMounted) {
          setData(fetchedData);
          setLastUpdated(new Date());
          setIsLoading(false);
        }
      } catch (err) {
        console.error(`Error fetching ${collectionName}:`, err);
        if (isMounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [collectionName, cacheKey, cacheTime, refreshTrigger]);

  const refetch = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    lastUpdated,
  };
}

// Hook especializado para vendas
export function useSalesData(dateFrom?: Date, dateTo?: Date) {
  const from = dateFrom?.getTime() || 0;
  const to = dateTo?.getTime() || 0;
  const cacheKey = `vendas-${from}-${to}`;

  return useFirestoreCollection(
    'vendas',
    cacheKey,
    (collectionRef) => {
      let q = query(collectionRef);

      if (dateFrom) {
        q = query(q, where('data', '>=', dateFrom));
      }
      if (dateTo) {
        q = query(q, where('data', '<=', dateTo));
      }

      q = query(q, orderBy('data', 'desc'), limit(5000));
      return q;
    },
    5 * 60 * 1000
  );
}

// Hook para logística - SEM filtros de data (dados de logística não possuem campo 'data')
export function useLogisticsData(dateFrom?: Date, dateTo?: Date) {
  // Ignora os parâmetros de data, mas mantém a assinatura para compatibilidade
  const cacheKey = 'logistica-all';

  return useFirestoreCollection(
    'logistica',
    cacheKey,
    (collectionRef) => {
      // Query simples sem ordenação por data, já que dados de logística não têm esse campo
      return query(collectionRef, limit(5000));
    },
    5 * 60 * 1000
  );
}

// Hook para taxas
export function useTaxasData() {
  return useFirestoreCollection(
    'taxas',
    'taxas-all',
    (collectionRef) => query(collectionRef),
    15 * 60 * 1000
  );
}

// Hook para custos
export function useCustosData() {
  return useFirestoreCollection(
    'custos',
    'custos-all',
    (collectionRef) => query(collectionRef),
    15 * 60 * 1000
  );
}

// Hook para custos de embalagem
export function useCustosEmbalagemData() {
  return useFirestoreCollection(
    'custos-embalagem',
    'custos-embalagem-all',
    (collectionRef) => query(collectionRef),
    15 * 60 * 1000
  );
}

// Função para limpar cache
export function clearFirestoreCache() {
  dataCache.clear();
}
