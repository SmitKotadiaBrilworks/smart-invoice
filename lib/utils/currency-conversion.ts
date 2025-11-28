/**
 * Currency conversion utility
 * Converts USD amounts to other currencies using live exchange rates
 */

interface ExchangeRateResponse {
  rates?: Record<string, number>;
  conversion_rate?: number;
  result?: number;
}

/**
 * Converts a USD amount to the target currency using live exchange rates
 * @param usdAmount - Amount in USD to convert
 * @param targetCurrency - Target currency code (e.g., 'INR', 'EUR')
 * @returns Converted amount in target currency, or original USD amount if conversion fails
 */
export async function convertAmoutToLocalCurrency(
  amount: number,
  targetCurrency: string,
  invoiceCurrency?: string
): Promise<number> {
  // If target currency is USD, no conversion n eeded
  if (
    invoiceCurrency &&
    invoiceCurrency.toUpperCase() === targetCurrency.toUpperCase()
  ) {
    return amount;
  }

  try {
    // Use exchangerate-api.com free endpoint (no API key required for basic usage)
    // Alternative: You can use other free APIs like exchangerate.host, fixer.io, etc.
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${invoiceCurrency || "USD"}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`);
    }

    const data: ExchangeRateResponse = await response.json();

    console.log("exchange rate", data);

    if (!data.rates || !data.rates[targetCurrency.toUpperCase()]) {
      console.warn(
        `Exchange rate not found for ${targetCurrency}, using USD amount`
      );
      return amount;
    }

    const rate = data.rates[targetCurrency.toUpperCase()];
    const convertedAmount = amount * rate;

    // Round to 2 decimal places for currency
    return Math.round(convertedAmount * 100) / 100;
  } catch (error) {
    console.error(
      `Error converting ${amount} ${
        invoiceCurrency || "USD"
      } to ${targetCurrency}:`,
      error
    );
    // Fallback: return original USD amount if conversion fails
    // This ensures the webhook doesn't fail, but fee calculation might be slightly off
    return amount;
  }
}

/**
 * Converts USD amount to target currency with caching (optional)
 * For webhook use, we typically want fresh rates, so caching is not implemented here
 * but can be added if needed for performance
 */
export async function getStripeFixedFeeInCurrency(
  targetCurrency: string
): Promise<number> {
  // Stripe's fixed fee is $0.30 USD
  const usdFixedFee = 0.3;
  return await convertAmoutToLocalCurrency(usdFixedFee, targetCurrency);
}
