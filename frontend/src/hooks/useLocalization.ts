import { useTranslation } from 'react-i18next';
import {
  formatLocalizedDate,
  formatLocalizedNumber,
  formatCurrency,
  formatWeight,
  formatVolume,
  formatPercentage,
  getDateFormatPattern,
  parseLocalizedDate,
} from '../utils/localization';

/**
 * Custom hook for localization utilities
 * Provides translation and formatting functions
 */
export const useLocalization = () => {
  const { i18n, t } = useTranslation();

  return {
    // Translation function
    t,
    
    // Current language
    language: i18n.language,
    
    // Change language
    changeLanguage: (lang: string) => {
      i18n.changeLanguage(lang);
      localStorage.setItem('i18nextLng', lang);
    },
    
    // Formatting functions
    formatDate: (date: Date | string, format: string = 'PPP') =>
      formatLocalizedDate(date, format, i18n.language),
    
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatLocalizedNumber(value, i18n.language, options),
    
    formatCurrency: (value: number) =>
      formatCurrency(value, i18n.language),
    
    formatWeight: (grams: number) =>
      formatWeight(grams, i18n.language),
    
    formatVolume: (ml: number) =>
      formatVolume(ml, i18n.language),
    
    formatPercentage: (value: number, decimalPlaces?: number) =>
      formatPercentage(value, i18n.language, decimalPlaces),
    
    getDateFormatPattern: () =>
      getDateFormatPattern(i18n.language),
    
    parseDate: (dateString: string) =>
      parseLocalizedDate(dateString, i18n.language),
  };
};
