import { APP_CONFIG } from '@/constants/config';

export function formatCurrency(amount: number): string {
  return `${APP_CONFIG.CURRENCY_SYMBOL}${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
