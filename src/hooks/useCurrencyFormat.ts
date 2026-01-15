import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export function useCurrencyFormat() {
  const { i18n } = useTranslation();

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

  const formatCurrency = useCallback((amount: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat(getLocale(), {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [getLocale]);

  const formatCurrencyCompact = useCallback((amount: number, currency: string = 'TRY') => {
    return new Intl.NumberFormat(getLocale(), {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, [getLocale]);

  return { formatCurrency, formatCurrencyCompact };
}
