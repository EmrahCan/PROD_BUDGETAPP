import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { format } from 'date-fns';
import { tr, enUS, de } from 'date-fns/locale';

export function useDateFormat() {
  const { i18n } = useTranslation();

  const getLocale = useCallback(() => {
    switch (i18n.language) {
      case 'tr':
        return tr;
      case 'de':
        return de;
      case 'en':
      default:
        return enUS;
    }
  }, [i18n.language]);

  const formatDate = useCallback((date: Date | string, formatStr: string = 'd MMMM yyyy') => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatStr, { locale: getLocale() });
  }, [getLocale]);

  const formatShortDate = useCallback((date: Date | string) => {
    return formatDate(date, 'd MMM yyyy');
  }, [formatDate]);

  const formatLongDate = useCallback((date: Date | string) => {
    return formatDate(date, 'd MMMM yyyy');
  }, [formatDate]);

  const formatMonthYear = useCallback((date: Date | string) => {
    return formatDate(date, 'MMMM yyyy');
  }, [formatDate]);

  const formatShortMonth = useCallback((date: Date | string) => {
    return formatDate(date, 'MMM');
  }, [formatDate]);

  const formatDayMonth = useCallback((date: Date | string) => {
    return formatDate(date, 'd MMMM');
  }, [formatDate]);

  const formatDateWithTime = useCallback((date: Date | string) => {
    return formatDate(date, 'd MMM yyyy HH:mm');
  }, [formatDate]);

  const formatShortDateWithTime = useCallback((date: Date | string) => {
    return formatDate(date, 'd MMM HH:mm');
  }, [formatDate]);

  return { 
    formatDate, 
    formatShortDate, 
    formatLongDate, 
    formatMonthYear,
    formatShortMonth,
    formatDayMonth,
    formatDateWithTime,
    formatShortDateWithTime,
    getLocale 
  };
}
