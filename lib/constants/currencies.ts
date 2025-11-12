export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
];

export const getCurrencyByCode = (code: string): Currency | undefined => {
  return CURRENCIES.find((c) => c.code === code);
};

export const getCurrencySymbol = (code: string): string => {
  const currency = getCurrencyByCode(code);
  return currency?.symbol || code;
};

export const formatCurrency = (
  amount: number,
  currencyCode: string,
  options?: { showSymbol?: boolean; showCode?: boolean }
): string => {
  const currency = getCurrencyByCode(currencyCode);
  const symbol = currency?.symbol || currencyCode;
  const formattedAmount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (options?.showCode) {
    return `${currencyCode} ${formattedAmount}`;
  }

  if (options?.showSymbol !== false) {
    // For currencies like USD, EUR, GBP - symbol before amount
    if (
      ["USD", "EUR", "GBP", "CAD", "AUD", "NZD", "SGD", "HKD", "MXN"].includes(
        currencyCode
      )
    ) {
      return `${symbol}${formattedAmount}`;
    }
    // For currencies like INR, JPY - symbol before amount
    if (["INR", "JPY", "CNY", "KRW"].includes(currencyCode)) {
      return `${symbol}${formattedAmount}`;
    }
    // Default: symbol before amount
    return `${symbol}${formattedAmount}`;
  }

  return formattedAmount;
};

export const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  value: c.code,
  label: `${c.code} - ${c.name}`,
}));
