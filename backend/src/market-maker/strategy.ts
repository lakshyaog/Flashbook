/**
 * @title Avellaneda-Stoikov Market Making Strategy Engine
 * @notice Computes reservation prices, optimal half-spreads, and inventory-skewed quoting
 */

export interface StrategyParams {
  riskAversionGamma: number;   // gamma: risk aversion parameter (e.g., 0.1)
  baseSpreadBps: number;       // minimum spread in basis points (e.g., 30 bps = 0.30%)
  targetInventoryWeth: number; // desired inventory holding in WETH (e.g., 10.0 WETH)
  maxOrderSizeWeth: number;    // maximum quote size (e.g., 0.5 WETH)
  minOrderSizeWeth: number;    // minimum quote size (e.g., 0.01 WETH)
  maxPriceDeviationBps: number;// maximum allowable rapid price swing (e.g., 500 bps = 5%)
}

export interface QuoteRecommendation {
  referencePrice: number;
  reservationPrice: number;
  inventoryWeth: number;
  inventorySkew: number;
  volatility: number;
  halfSpreadBps: number;
  bidPrice: number;
  askPrice: number;
  bidSize: number;
  askSize: number;
  riskStatus: 'NORMAL' | 'CIRCUIT_BREAKER' | 'EXPOSURE_LIMIT';
  explanation: string;
}

export class MarketMakingStrategy {
  private params: StrategyParams;

  constructor(params: StrategyParams) {
    this.params = params;
  }

  public updateParams(newParams: Partial<StrategyParams>): void {
    this.params = { ...this.params, ...newParams };
  }

  public getParams(): StrategyParams {
    return { ...this.params };
  }

  /**
   * Calculates realized price volatility from recent trade prices
   */
  public calculateVolatility(prices: number[]): number {
    if (prices.length < 2) {
      return 0.015; // Default 1.5% baseline volatility
    }

    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Bound between 0.005 and 0.20 for numerical stability
    return Math.max(0.005, Math.min(stdDev, 0.20));
  }

  /**
   * Evaluates market state and computes optimal bid/ask quotes
   *
   * Avellaneda-Stoikov Formula:
   * r(s, q) = s - q * gamma * sigma^2
   */
  public computeQuotes(
    midPrice: number,
    currentInventoryWeth: number,
    recentTradePrices: number[],
    recentPriceWindow: number[]
  ): QuoteRecommendation {
    const s = midPrice;
    const q = currentInventoryWeth - this.params.targetInventoryWeth; // Skew
    const sigma = this.calculateVolatility(recentTradePrices);
    const gamma = this.params.riskAversionGamma;

    // Check circuit breaker: check if recent prices fluctuated beyond threshold
    if (recentPriceWindow.length >= 2) {
      const minP = Math.min(...recentPriceWindow);
      const maxP = Math.max(...recentPriceWindow);
      const swingBps = ((maxP - minP) / minP) * 10000;
      if (swingBps > this.params.maxPriceDeviationBps) {
        return {
          referencePrice: s,
          reservationPrice: s,
          inventoryWeth: currentInventoryWeth,
          inventorySkew: q,
          volatility: sigma,
          halfSpreadBps: this.params.baseSpreadBps,
          bidPrice: 0,
          askPrice: 0,
          bidSize: 0,
          askSize: 0,
          riskStatus: 'CIRCUIT_BREAKER',
          explanation: `Circuit breaker tripped! High volatility swing of ${swingBps.toFixed(0)} bps exceeds limit ${this.params.maxPriceDeviationBps} bps. All quotes suspended.`
        };
      }
    }

    // Reservation Price calculation
    // Shift reservation price down if long (q > 0) to encourage selling
    // Shift reservation price up if short (q < 0) to encourage buying
    const priceAdjustment = q * gamma * Math.pow(sigma, 2) * s;
    const reservationPrice = Math.max(s * 0.5, s - priceAdjustment);

    // Dynamic half-spread calculation: base spread + volatility scaling
    const volSpreadMultiplier = 1 + (sigma / 0.015);
    const halfSpreadBps = Math.max(
      this.params.baseSpreadBps / 2,
      (this.params.baseSpreadBps / 2) * volSpreadMultiplier
    );
    const halfSpread = reservationPrice * (halfSpreadBps / 10000);

    let bidPrice = parseFloat((reservationPrice - halfSpread).toFixed(2));
    let askPrice = parseFloat((reservationPrice + halfSpread).toFixed(2));

    // Ensure non-crossing quotes with healthy spread
    if (bidPrice >= askPrice) {
      bidPrice = parseFloat((reservationPrice * 0.998).toFixed(2));
      askPrice = parseFloat((reservationPrice * 1.002).toFixed(2));
    }

    // Dynamic sizing based on inventory skew:
    // If long on inventory, quote larger asks and smaller bids
    let bidSize = this.params.maxOrderSizeWeth;
    let askSize = this.params.maxOrderSizeWeth;

    if (q > 0) {
      // Long inventory: dampen bids, boost asks
      const dampener = Math.max(0.2, 1 - (q / this.params.targetInventoryWeth));
      bidSize = parseFloat((this.params.maxOrderSizeWeth * dampener).toFixed(4));
      askSize = this.params.maxOrderSizeWeth;
    } else if (q < 0) {
      // Short inventory: boost bids, dampen asks
      const dampener = Math.max(0.2, 1 - (Math.abs(q) / this.params.targetInventoryWeth));
      askSize = parseFloat((this.params.maxOrderSizeWeth * dampener).toFixed(4));
      bidSize = this.params.maxOrderSizeWeth;
    }

    // Enforce limits
    bidSize = Math.max(this.params.minOrderSizeWeth, bidSize);
    askSize = Math.max(this.params.minOrderSizeWeth, askSize);

    // Hard exposure guard
    let riskStatus: 'NORMAL' | 'CIRCUIT_BREAKER' | 'EXPOSURE_LIMIT' = 'NORMAL';
    if (Math.abs(q) > this.params.targetInventoryWeth * 1.5) {
      riskStatus = 'EXPOSURE_LIMIT';
      if (q > 0) {
        bidSize = 0; // Stop buying more
      } else {
        askSize = 0; // Stop selling more
      }
    }

    const explanation = `Avellaneda-Stoikov quoting: Mid $${s.toFixed(2)}, Reservation $${reservationPrice.toFixed(2)}, Skew ${q.toFixed(2)} WETH, Volatility ${(sigma * 100).toFixed(2)}%, Half-Spread ${halfSpreadBps.toFixed(1)} bps. Status: ${riskStatus}.`;

    return {
      referencePrice: s,
      reservationPrice,
      inventoryWeth: currentInventoryWeth,
      inventorySkew: q,
      volatility: sigma,
      halfSpreadBps,
      bidPrice,
      askPrice,
      bidSize,
      askSize,
      riskStatus,
      explanation
    };
  }
}
