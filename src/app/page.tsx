'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CalculationResult {
  zcd: number | 'infinite';
  isInfinite: boolean;
  realGrowthRate: number;
  criticalCapital?: number;
  spendingRate: number;
  sustainableRate: number;
}

interface YearlyData {
  year: number;
  burnRate: number;
  portfolioValue: number;
  netWorth: number;
}

export default function ZeeCeeDee() {
  const [startingAmount, setStartingAmount] = useState<number>(1000000);
  const [burn, setBurn] = useState<number>(50000);
  const [inflation, setInflation] = useState<number>(3);
  const [growth, setGrowth] = useState<number>(7);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);

  // Format number with commas for display
  const formatNumberWithCommas = (num: number) => {
    return num.toLocaleString('en-US');
  };

  // Parse number from comma-formatted string
  const parseNumberFromCommas = (str: string) => {
    return parseFloat(str.replace(/,/g, '')) || 0;
  };

  // Handle currency input changes with comma formatting
  const handleCurrencyChange = (value: string, setter: (val: number) => void) => {
    const numericValue = parseNumberFromCommas(value);
    setter(numericValue);
  };

  // Generate yearly data for graphs
  const generateYearlyData = (A: number, B: number, G: number, Inf: number, maxYears: number) => {
    const data: YearlyData[] = [];
    let currentPortfolio = A;
    let currentBurn = B;
    
    // Add year 0 (starting point)
    data.push({
      year: 0,
      burnRate: currentBurn,
      portfolioValue: currentPortfolio,
      netWorth: currentPortfolio
    });

    for (let year = 1; year <= maxYears; year++) {
      // Withdraw burn at beginning of year
      currentPortfolio -= currentBurn;
      
      // Check if we've run out of money
      if (currentPortfolio <= 0) {
        data.push({
          year,
          burnRate: currentBurn,
          portfolioValue: 0,
          netWorth: 0
        });
        break;
      }
      
      // Apply growth to remaining portfolio
      currentPortfolio *= (1 + G);
      
      // Increase burn rate for next year due to inflation
      currentBurn *= (1 + Inf);
      
      data.push({
        year,
        burnRate: currentBurn,
        portfolioValue: currentPortfolio,
        netWorth: currentPortfolio
      });
    }
    
    return data;
  };

  const calculateZCD = () => {
    const A = startingAmount;
    const B = burn;
    const Inf = inflation / 100;
    const G = growth / 100;

    // Step 1: Calculate real growth multiplier
    const R = (1 + G) / (1 + Inf);
    
    // Calculate spending rate and sustainable rate for display
    const spendingRate = (B / A) * 100;
    const sustainableRate = ((R - 1) / R) * 100;

    // Step 2: Check if money never runs out
    if (B / A < (R - 1) / R) {
      setResult({
        zcd: 'infinite',
        isInfinite: true,
        realGrowthRate: (R - 1) * 100,
        spendingRate,
        sustainableRate
      });
      // Generate data for 50 years to show the infinite trend
      const data = generateYearlyData(A, B, G, Inf, 50);
      setYearlyData(data);
      return;
    }

    // Step 3: Calculate finite ZCD
    let N: number;
    
    if (Math.abs(R - 1) < 0.0001) { // R ≈ 1 (edge case)
      N = Math.floor(A / B);
    } else {
      const K = (B * R) / (R - 1);
      if (K - A <= 0) {
        // This shouldn't happen if our logic is correct, but handle gracefully
        N = 0;
      } else {
        N = 1 + Math.log((K - B) / (K - A)) / Math.log(R);
        N = Math.floor(N);
      }
    }

    const K = (B * R) / (R - 1);
    
    setResult({
      zcd: N,
      isInfinite: false,
      realGrowthRate: (R - 1) * 100,
      criticalCapital: K,
      spendingRate,
      sustainableRate
    });

    // Generate yearly data up to ZCD + a few extra years
    const data = generateYearlyData(A, B, G, Inf, N + 5);
    setYearlyData(data);
  };

  useEffect(() => {
    calculateZCD();
  }, [startingAmount, burn, inflation, growth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  // Custom tooltip formatter for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{`Year ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            ZeeCeeDee
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            Zero Cash Date Calculator
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Calculate when you'll run out of money based on your starting amount, burn rate, inflation, and growth rate.
            We withdraw expenses at the beginning of each year for the most conservative estimate.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Input Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">
              Financial Inputs
            </h2>
            
            <div className="space-y-6">
              {/* Starting Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Starting Amount (A)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="text"
                    value={formatNumberWithCommas(startingAmount)}
                    onChange={(e) => handleCurrencyChange(e.target.value, setStartingAmount)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="1,000,000"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Your liquid net worth</p>
              </div>

              {/* Annual Burn */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Annual Burn (B)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="text"
                    value={formatNumberWithCommas(burn)}
                    onChange={(e) => handleCurrencyChange(e.target.value, setBurn)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="50,000"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Your annual expenses (first year)</p>
              </div>

              {/* Inflation Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Inflation Rate (Inf)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={inflation}
                    onChange={(e) => setInflation(Number(e.target.value))}
                    className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="3.0"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white dark:text-white font-bold text-lg bg-blue-500 dark:bg-blue-600 px-2 py-1 rounded text-sm">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Annual expense growth rate</p>
              </div>

              {/* Growth Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Growth Rate (G)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={growth}
                    onChange={(e) => setGrowth(Number(e.target.value))}
                    className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="7.0"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white dark:text-white font-bold text-lg bg-green-500 dark:bg-green-600 px-2 py-1 rounded text-sm">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Annual portfolio growth rate</p>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">
              Results
            </h2>
            
            {result && (
              <div className="space-y-6">
                {/* Main Result */}
                <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Zero Cash Date
                  </h3>
                  {result.isInfinite ? (
                    <div>
                      <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                        ∞
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                        You'll never run out of money!
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">
                        {result.zcd} years
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                        Money runs out in {result.zcd} years
                      </p>
                    </div>
                  )}
                </div>

                {/* Detailed Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Real Growth Rate
                    </p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-white">
                      {formatPercent(result.realGrowthRate)}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Spending Rate
                    </p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-white">
                      {formatPercent(result.spendingRate)}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg col-span-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Sustainable Rate
                    </p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-white">
                      {formatPercent(result.sustainableRate)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Maximum sustainable spending rate
                    </p>
                  </div>

                  {result.criticalCapital && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Critical Capital
                      </p>
                      <p className="text-lg font-semibold text-gray-800 dark:text-white">
                        {formatCurrency(result.criticalCapital)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Balance needed to exactly cover annual burn
                      </p>
                    </div>
                  )}
                </div>

                {/* Status Message */}
                <div className={`p-4 rounded-lg ${
                  result.isInfinite 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                    : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                }`}>
                  <p className={`text-sm font-medium ${
                    result.isInfinite 
                      ? 'text-green-800 dark:text-green-200' 
                      : 'text-amber-800 dark:text-amber-200'
                  }`}>
                    {result.isInfinite 
                      ? `Your spending rate (${formatPercent(result.spendingRate)}) is below the sustainable rate (${formatPercent(result.sustainableRate)}). Your portfolio growth covers your expenses!`
                      : `Your spending rate (${formatPercent(result.spendingRate)}) exceeds the sustainable rate (${formatPercent(result.sustainableRate)}). Consider reducing expenses or increasing growth.`
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        {yearlyData.length > 0 && (
          <div className="space-y-8">
            {/* Combined View */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <h3 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">
                Portfolio vs. Expenses Over Time
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={yearlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="year" 
                      tick={{ fontSize: 12, fill: '#ffffff' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#ffffff' }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="portfolioValue" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      name="Portfolio Value"
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="burnRate" 
                      stroke="#EF4444" 
                      strokeWidth={3}
                      name="Annual Expenses"
                      dot={{ fill: '#EF4444', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 6, stroke: '#EF4444', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500 dark:text-gray-400">
          <p>
            ZeeCeeDee uses conservative calculations by withdrawing expenses at the beginning of each year.
          </p>
          <p className="mt-2">
            This tool is for educational purposes only and should not be considered financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
