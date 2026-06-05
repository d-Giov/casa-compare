import type { MortgageSimulation } from '@/types';

export function formatPrice(price: number | null | undefined): string {
  if (!price) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(price);
}

export function formatSqm(sqm: number | null | undefined): string {
  return sqm ? `${sqm} m²` : '—';
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function calcPricePerSqm(price: number | null, sqm: number | null): string {
  if (!price || !sqm) return '—';
  return `${formatPrice(Math.round(price / sqm))}/m²`;
}

export function calcMortgage(params: {
  loanAmount: number;
  durationYears: number;
  ratePct: number;
}): MortgageSimulation {
  const { loanAmount, durationYears, ratePct } = params;
  const monthlyRate = ratePct / 100 / 12;
  const n = durationYears * 12;

  const monthly = monthlyRate === 0
    ? loanAmount / n
    : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);

  const totalCost = monthly * n;
  return {
    loan_amount: loanAmount,
    duration_years: durationYears,
    rate_pct: ratePct,
    monthly_payment: Math.round(monthly),
    total_cost: Math.round(totalCost),
    total_interest: Math.round(totalCost - loanAmount),
  };
}

export function scoreColor(score: number): string {
  if (score >= 75) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

export function scoreBg(score: number): string {
  if (score >= 75) return 'bg-green-100 border-green-200';
  if (score >= 50) return 'bg-yellow-100 border-yellow-200';
  return 'bg-red-100 border-red-200';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
