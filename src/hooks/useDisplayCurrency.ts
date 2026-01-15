import { useTranslation } from 'react-i18next';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExchangeRates {
  tryToUsd: number;
  tryToEur: number;
}

export function useDisplayCurrency() {
  const { i18n } = useTranslation();
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(false);

  const currency = useMemo(() => {
    switch (i18n.language) {
      case 'tr':
        return 'TRY';
      case 'de':
        return 'EUR';
      case 'en':
      default:
        return 'USD';
    }
  }, [i18n.language]);

  const currencySymbol = useMemo(() => {
    switch (currency) {
      case 'TRY':
        return '₺';
      case 'EUR':
        return '€';
      case 'USD':
      default:
        return '$';
    }
  }, [currency]);

  const getLocale = useCallback(() => {
    switch (i18n.language) {
      case 'tr':
        return 'tr-TR';
      case 'de':
        return 'de-DE';
      case 'en':
      default:
        return 'en-US';
    }
  }, [i18n.language]);

  // Fetch exchange rates when needed
  const fetchExchangeRates = useCallback(async () => {
    if (currency === 'TRY') {
      setExchangeRates({ tryToUsd: 1, tryToEur: 1 });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://api.frankfurter.app/latest?from=TRY&to=USD,EUR');
      if (response.ok) {
        const data = await response.json();
        setExchangeRates({
          tryToUsd: data.rates.USD,
          tryToEur: data.rates.EUR,
        });
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Fallback rates if API fails
      setExchangeRates({
        tryToUsd: 0.029, // Approximate fallback
        tryToEur: 0.027,
      });
    } finally {
      setLoading(false);
    }
  }, [currency]);

  // Fetch rates on mount and when currency changes
  useEffect(() => {
    fetchExchangeRates();
  }, [fetchExchangeRates]);

  // Convert amount from TRY to display currency
  const convertFromTRY = useCallback((amountInTRY: number): number => {
    if (currency === 'TRY' || !exchangeRates) {
      return amountInTRY;
    }
    if (currency === 'USD') {
      return amountInTRY * exchangeRates.tryToUsd;
    }
    if (currency === 'EUR') {
      return amountInTRY * exchangeRates.tryToEur;
    }
    return amountInTRY;
  }, [currency, exchangeRates]);

  const formatAmount = useCallback((amount: number, options?: { compact?: boolean }) => {
    const locale = getLocale();
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: options?.compact ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [currency, getLocale]);

  // Format amount after converting from TRY
  const formatFromTRY = useCallback((amountInTRY: number, options?: { compact?: boolean }) => {
    const convertedAmount = convertFromTRY(amountInTRY);
    return formatAmount(convertedAmount, options);
  }, [convertFromTRY, formatAmount]);

  return { 
    currency, 
    currencySymbol, 
    formatAmount, 
    formatFromTRY,
    convertFromTRY,
    exchangeRates,
    loading,
    refetchRates: fetchExchangeRates
  };
}
