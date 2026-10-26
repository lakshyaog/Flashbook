import { MarketMakingStrategy } from '../src/market-maker/strategy.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('--- Running AI Market Maker Strategy Unit Tests ---');

  const strategy = new MarketMakingStrategy({
    riskAversionGamma: 0.1,
    baseSpreadBps: 30, // 0.30%
    targetInventoryWeth: 10.0,
    maxOrderSizeWeth: 0.5,
    minOrderSizeWeth: 0.01,
    maxPriceDeviationBps: 500, // 5%
  });

  const midPrice = 3000.0;
  const steadyPrices = [2995, 3000, 3005, 3000, 2998, 3002];

  // Test 1: Volatility bounds
  const vol = strategy.calculateVolatility(steadyPrices);
  assert(vol >= 0.005 && vol <= 0.20, `Volatility ${vol} is within reasonable bounds`);

  // Test 2: Neutral inventory quoting
  const neutralQuotes = strategy.computeQuotes(midPrice, 10.0, steadyPrices, steadyPrices);
  assert(neutralQuotes.riskStatus === 'NORMAL', 'Neutral inventory should have NORMAL risk status');
  assert(neutralQuotes.bidPrice < midPrice, 'Bid price must be below mid price');
  assert(neutralQuotes.askPrice > midPrice, 'Ask price must be above mid price');
  assert(neutralQuotes.bidPrice < neutralQuotes.askPrice, 'Quotes must never cross');
  assert(neutralQuotes.bidSize === 0.5 && neutralQuotes.askSize === 0.5, 'Neutral inventory gives equal max order sizes');

  // Test 3: Long inventory (inventory = 14 WETH vs target 10 WETH -> skew = +4 WETH)
  const longQuotes = strategy.computeQuotes(midPrice, 14.0, steadyPrices, steadyPrices);
  assert(longQuotes.reservationPrice < neutralQuotes.reservationPrice, 'Long inventory lowers reservation price');
  assert(longQuotes.bidSize < longQuotes.askSize, 'Long inventory dampens bid size and favors asks');

  // Test 4: Short inventory (inventory = 6 WETH vs target 10 WETH -> skew = -4 WETH)
  const shortQuotes = strategy.computeQuotes(midPrice, 6.0, steadyPrices, steadyPrices);
  assert(shortQuotes.reservationPrice > neutralQuotes.reservationPrice, 'Short inventory raises reservation price');
  assert(shortQuotes.askSize < shortQuotes.bidSize, 'Short inventory dampens ask size and favors bids');

  // Test 5: Circuit breaker on rapid price swing (> 5%)
  const crashedPriceWindow = [3000, 2900, 2800, 2700]; // ~10% drop
  const circuitBreakerQuotes = strategy.computeQuotes(2700, 10.0, steadyPrices, crashedPriceWindow);
  assert(circuitBreakerQuotes.riskStatus === 'CIRCUIT_BREAKER', 'Large price swing trips circuit breaker');
  assert(circuitBreakerQuotes.bidSize === 0 && circuitBreakerQuotes.askSize === 0, 'Circuit breaker sets quote sizes to 0');

  // Test 6: Extreme inventory exposure limit (inventory = 28 WETH vs target 10 WETH)
  const extremeQuotes = strategy.computeQuotes(midPrice, 28.0, steadyPrices, steadyPrices);
  assert(extremeQuotes.riskStatus === 'EXPOSURE_LIMIT', 'Extreme inventory trips exposure limit');
  assert(extremeQuotes.bidSize === 0, 'Over-accumulated inventory stops bidding');

  console.log('--- All Market Maker Tests Passed Successfully! ---');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
