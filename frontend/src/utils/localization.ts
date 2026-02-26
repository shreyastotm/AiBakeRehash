import { format, parseISO } from 'date-fns';
import { enUS, hi } from 'date-fns/locale';

/**
 * Get date-fns locale object based on i18n language
 */
export const getDateLocale = (language: string) => {
  switch (language) {
    case 'hi':
      return hi;
    case 'en':
    default:
      return enUS;
  }
};

/**
 * Format date with locale-specific formatting
 */
export const formatLocalizedDate = (
  date: Date | string,
  formatStr: string,
  language: string
): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const locale = getDateLocale(language);
  return format(dateObj, formatStr, { locale });
};

/**
 * Format number with locale-specific formatting
 */
export const formatLocalizedNumber = (
  value: number,
  language: string,
  options?: Intl.NumberFormatOptions
): string => {
  const localeCode = language === 'hi' ? 'hi-IN' : 'en-US';
  return new Intl.NumberFormat(localeCode, options).format(value);
};

/**
 * Format currency with locale-specific formatting (INR)
 */
export const formatCurrency = (
  value: number,
  language: string
): string => {
  const localeCode = language === 'hi' ? 'hi-IN' : 'en-US';
  return new Intl.NumberFormat(localeCode, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format weight with locale-specific number formatting
 */
export const formatWeight = (
  grams: number,
  language: string
): string => {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${formatLocalizedNumber(kg, language, { maximumFractionDigits: 2 })} kg`;
  }
  return `${formatLocalizedNumber(grams, language, { maximumFractionDigits: 1 })} g`;
};

/**
 * Format volume with locale-specific number formatting
 */
export const formatVolume = (
  ml: number,
  language: string
): string => {
  if (ml >= 1000) {
    const liters = ml / 1000;
    return `${formatLocalizedNumber(liters, language, { maximumFractionDigits: 2 })} l`;
  }
  return `${formatLocalizedNumber(ml, language, { maximumFractionDigits: 1 })} ml`;
};

/**
 * Format percentage with locale-specific number formatting
 */
export const formatPercentage = (
  value: number,
  language: string,
  decimalPlaces: number = 1
): string => {
  return `${formatLocalizedNumber(value, language, { maximumFractionDigits: decimalPlaces })}%`;
};

/**
 * Get text direction based on language
 */
export const getTextDirection = (language: string): 'ltr' | 'rtl' => {
  return language === 'hi' ? 'ltr' : 'ltr'; // Hindi uses LTR in this context
};

/**
 * Get locale-specific date format patterns
 */
export const getDateFormatPattern = (language: string): string => {
  switch (language) {
    case 'hi':
      return 'dd/MM/yyyy'; // Indian date format
    case 'en':
    default:
      return 'MM/dd/yyyy'; // US date format
  }
};

/**
 * Parse locale-specific date string
 */
export const parseLocalizedDate = (
  dateString: string,
  language: string
): Date => {
  // Simple parser - in production, use a library like date-fns parse
  const parts = dateString.split('/');
  if (language === 'hi') {
    // dd/MM/yyyy format
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  // MM/dd/yyyy format
  return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
};
