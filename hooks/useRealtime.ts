import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

function useDebouncedInvalidate() {
  const queryClient = useQueryClient();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const invalidate = useCallback(
    (queryKey: string[]) => {
      const key = queryKey.join(':');
      if (timers.current[key]) clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
        delete timers.current[key];
      }, 1000);
    },
    [queryClient]
  );

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  return invalidate;
}

export function useOrdersRealtime() {
  const invalidate = useDebouncedInvalidate();

  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          invalidate(['orders']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        () => {
          invalidate(['deliveries']);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_stock' },
        () => {
          invalidate(['inventory-dashboard']);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidate]);
}

export function useDeliveryRealtime() {
  const invalidate = useDebouncedInvalidate();

  useEffect(() => {
    const channel = supabase
      .channel('delivery-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        () => {
          invalidate(['deliveries']);
          invalidate(['orders']);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidate]);
}
