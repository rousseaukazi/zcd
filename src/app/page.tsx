'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

// Animated Number Component
const AnimatedNumber: React.FC<{ value: number | 'infinite'; duration?: number }> = ({ value, duration = 1000 }) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef<number>(0);

  useEffect(() => {
    if (value === 'infinite') {
      setDisplayValue(0);
      return;
    }

    const numericValue = typeof value === 'number' ? value : 0;
    const prevValue = prevValueRef.current;
    
    if (prevValue === numericValue) return;

    setIsAnimating(true);
    const startTime = Date.now();
    const difference = numericValue - prevValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const currentValue = prevValue + (difference * easeOutQuart);
      setDisplayValue(Math.round(currentValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(numericValue);
        setIsAnimating(false);
        prevValueRef.current = numericValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  if (value === 'infinite') {
    return (
      <span className="infinity-symbol">
        ∞
        <span className="sparkle sparkle-1"></span>
        <span className="sparkle sparkle-2"></span>
        <span className="sparkle sparkle-3"></span>
        <span className="sparkle sparkle-4"></span>
      </span>
    );
  }

  return (
    <span className={isAnimating ? 'transition-all duration-100' : ''}>
      {displayValue}
    </span>
  );
};

export default function ZeeCeeDee() {
  const [startingAmount, setStartingAmount] = useState<number>(1000000);
  const [burn, setBurn] = useState<number>(50000);
  const [inflation, setInflation] = useState<number>(3);
  const [growth, setGrowth] = useState<number>(7);
  const [postTaxSalary, setPostTaxSalary] = useState<number>(75000);
  const [yearsUntilRetirement, setYearsUntilRetirement] = useState<number>(10);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  
  // Separate display states for inputs to allow proper editing
  const [startingAmountDisplay, setStartingAmountDisplay] = useState<string>('1,000,000');
  const [burnDisplay, setBurnDisplay] = useState<string>('50,000');
  const [postTaxSalaryDisplay, setPostTaxSalaryDisplay] = useState<string>('75,000');

  // Format number with commas for display
  const formatNumberWithCommas = (num: number) => {
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US');
  };

  // Parse number from comma-formatted string
  const parseNumberFromCommas = (str: string) => {
    const cleaned = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Handle input changes - allow free typing but filter out letters
  const handleInputChange = (value: string, setDisplay: (val: string) => void, setActual: (val: number) => void) => {
    // Filter out letters but allow numbers, commas, periods, and spaces
    const filtered = value.replace(/[^0-9,.\s]/g, '');
    setDisplay(filtered);
    
    // Parse and update the actual numeric value
    const numericValue = parseNumberFromCommas(filtered);
    setActual(numericValue);
  };

  // Handle blur - reformat the display value
  const handleInputBlur = (actualValue: number, setDisplay: (val: string) => void) => {
    setDisplay(formatNumberWithCommas(actualValue));
  };

  // Generate yearly data for graphs
  const generateYearlyData = (A: number, B: number, G: number, Inf: number, salary: number, retirementYears: number, maxYears: number) => {
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
      // Add salary to portfolio if still working (within retirement years)
      if (year <= retirementYears) {
        currentPortfolio += salary;
      }
      
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

  const calculateZCD = useCallback(() => {
    const A = startingAmount;
    const B = burn;
    const Inf = inflation / 100;
    const G = growth / 100;
    const salary = postTaxSalary;
    const retirementYears = yearsUntilRetirement;

    // Step 1: Calculate real growth multiplier
    const R = (1 + G) / (1 + Inf);
    
    // Step 2: Calculate portfolio value at retirement (after working years)
    let portfolioAtRetirement = A;
    let currentBurn = B;
    
    // Simulate the working years where salary is added
    for (let year = 1; year <= retirementYears; year++) {
      // Add salary at beginning of year
      portfolioAtRetirement += salary;
      // Withdraw expenses
      portfolioAtRetirement -= currentBurn;
      // Check if we run out during working years
      if (portfolioAtRetirement <= 0) {
        setResult({
          zcd: year,
          isInfinite: false,
          realGrowthRate: (R - 1) * 100,
          spendingRate: (B / A) * 100,
          sustainableRate: ((R - 1) / R) * 100
        });
        const data = generateYearlyData(A, B, G, Inf, salary, retirementYears, year + 2);
        setYearlyData(data);
        return;
      }
      // Apply growth
      portfolioAtRetirement *= (1 + G);
      // Increase burn for next year
      currentBurn *= (1 + Inf);
    }
    
    // currentBurn is now the expenses in the first year of retirement
    const retirementBurn = currentBurn;
    
    // Calculate spending rate and sustainable rate for display (based on original values)
    const spendingRate = (B / A) * 100;
    const sustainableRate = ((R - 1) / R) * 100;

    // Step 3: Check if money never runs out in retirement
    if (retirementBurn / portfolioAtRetirement < (R - 1) / R) {
      setResult({
        zcd: 'infinite',
        isInfinite: true,
        realGrowthRate: (R - 1) * 100,
        spendingRate,
        sustainableRate
      });
      // Generate data for 50 years to show the infinite trend
      const data = generateYearlyData(A, B, G, Inf, salary, retirementYears, 50);
      setYearlyData(data);
      return;
    }

    // Step 4: Calculate finite ZCD for retirement phase
    let N: number;
    
    if (Math.abs(R - 1) < 0.0001) { // R ≈ 1 (edge case)
      N = Math.floor(portfolioAtRetirement / retirementBurn);
    } else {
      const K = (retirementBurn * R) / (R - 1);
      if (K - portfolioAtRetirement <= 0) {
        // This shouldn't happen if our logic is correct, but handle gracefully
        N = 0;
      } else {
        N = 1 + Math.log((K - retirementBurn) / (K - portfolioAtRetirement)) / Math.log(R);
        N = Math.floor(N);
      }
    }

    // Total ZCD is working years + retirement years until money runs out
    const totalZCD = retirementYears + N;
    
    const K = (retirementBurn * R) / (R - 1);
    
    setResult({
      zcd: totalZCD,
      isInfinite: false,
      realGrowthRate: (R - 1) * 100,
      criticalCapital: K,
      spendingRate,
      sustainableRate
    });

    // Generate yearly data up to ZCD + a few extra years
    const data = generateYearlyData(A, B, G, Inf, salary, retirementYears, totalZCD + 5);
    setYearlyData(data);
  }, [startingAmount, burn, inflation, growth, postTaxSalary, yearsUntilRetirement]);

  useEffect(() => {
    calculateZCD();
  }, [calculateZCD]);

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
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{
      color: string;
      name: string;
      value: number;
    }>;
    label?: string | number;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-3 border border-gray-600 rounded-lg shadow-lg tooltip-animated">
          <p className="font-medium text-white">{`Year ${label}`}</p>
          {payload.map((entry, index: number) => (
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            ZeeCeeDee
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Zero Cash Date Calculator
          </p>
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">
            Calculate when you&apos;ll run out of money based on your starting amount, burn rate, salary contributions, and growth rate.
            We add salary and withdraw expenses at the beginning of each year for the most conservative estimate.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Input Panel */}
          <div className="bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-white">
              Financial Inputs
            </h2>
            
            <div className="space-y-6">
              {/* Starting Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Starting Amount
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={startingAmountDisplay}
                    onChange={(e) => handleInputChange(e.target.value, setStartingAmountDisplay, setStartingAmount)}
                    onBlur={() => handleInputBlur(startingAmount, setStartingAmountDisplay)}
                    className="w-full pl-4 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    placeholder="1,000,000"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white font-bold text-lg bg-emerald-500 px-2 py-1 rounded text-sm">$</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Your liquid net worth</p>
              </div>

              {/* Annual Burn */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Annual Burn
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={burnDisplay}
                    onChange={(e) => handleInputChange(e.target.value, setBurnDisplay, setBurn)}
                    onBlur={() => handleInputBlur(burn, setBurnDisplay)}
                    className="w-full pl-4 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    placeholder="50,000"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white font-bold text-lg bg-emerald-500 px-2 py-1 rounded text-sm">$</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Your annual expenses (first year)</p>
              </div>

              {/* Inflation Rate & Growth Rate - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Inflation Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Inflation Rate
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={inflation}
                      onChange={(e) => setInflation(Number(e.target.value))}
                      className="w-full pr-12 pl-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      placeholder="3.0"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white font-bold text-lg bg-blue-500 px-2 py-1 rounded text-sm">%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Annual expense growth rate</p>
                </div>

                {/* Growth Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Portfolio Growth Rate
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={growth}
                      onChange={(e) => setGrowth(Number(e.target.value))}
                      className="w-full pr-12 pl-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      placeholder="7.0"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white font-bold text-lg bg-blue-500 px-2 py-1 rounded text-sm">%</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Annual portfolio growth rate</p>
                </div>
              </div>

              {/* Post Tax Salary & Years Until Retirement - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Post Tax Salary */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Post Tax Salary
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={postTaxSalaryDisplay}
                      onChange={(e) => handleInputChange(e.target.value, setPostTaxSalaryDisplay, setPostTaxSalary)}
                      onBlur={() => handleInputBlur(postTaxSalary, setPostTaxSalaryDisplay)}
                      className="w-full pl-4 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      placeholder="75,000"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white font-bold text-lg bg-emerald-500 px-2 py-1 rounded text-sm">$</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Annual income added to portfolio</p>
                </div>

                {/* Years Until Retirement */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Years Until Retirement
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={yearsUntilRetirement || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '0') {
                          setYearsUntilRetirement(0);
                        } else {
                          const numValue = parseInt(value, 10);
                          if (!isNaN(numValue) && numValue >= 0) {
                            setYearsUntilRetirement(numValue);
                          }
                        }
                      }}
                      className="w-full pr-20 pl-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      placeholder="10"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white font-bold text-lg bg-purple-500 px-2 py-1 rounded text-sm">years</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Years you&apos;ll continue earning salary</p>
                </div>
              </div>


            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-gray-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold mb-6 text-white">
              Results
            </h2>
            
            {result && (
              <div className="space-y-6">
                {/* Main Result */}
                <div className="text-center px-5 py-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl">
                  <h3 className="text-lg font-medium text-gray-300 mb-3">
                    Zero Cash Date
                  </h3>
                  {result.isInfinite ? (
                    <div>
                      <p className="text-4xl font-bold text-green-400 mb-2">
                        <AnimatedNumber value={result.zcd} />
                      </p>
                      <p className="text-sm text-green-400 font-medium">
                        You&apos;ll never run out of money!
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-4xl font-bold text-red-400 mb-2">
                        <AnimatedNumber value={result.zcd} /> years
                      </p>
                      <p className="text-sm text-red-400 font-medium">
                        Money runs out in <AnimatedNumber value={result.zcd} /> years
                      </p>
                    </div>
                  )}
                </div>

                {/* Detailed Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-700 px-3 py-4 rounded-lg">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                      Real Growth Rate
                    </p>
                    <p className="text-lg font-bold text-white">
                      {formatPercent(result.realGrowthRate)}
                    </p>
                  </div>
                  
                  <div className="bg-gray-700 px-3 py-4 rounded-lg">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                      Spending Rate
                    </p>
                    <p className="text-lg font-bold text-white">
                      {formatPercent(result.spendingRate)}
                    </p>
                  </div>
                  
                  <div className="bg-gray-700 px-3 py-4 rounded-lg">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                      Sustainable Rate
                    </p>
                    <p className="text-lg font-bold text-white">
                      {formatPercent(result.sustainableRate)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Maximum sustainable spending rate
                    </p>
                  </div>

                  {result.criticalCapital && (
                    <div className="bg-gray-700 px-3 py-4 rounded-lg">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                        Critical Capital
                      </p>
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(result.criticalCapital)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Balance needed to go infinite.
                      </p>
                    </div>
                  )}
                </div>

                {/* Status Message */}
                <div className={`px-3 py-4 rounded-lg ${
                  result.isInfinite 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    result.isInfinite 
                      ? 'text-green-800' 
                      : 'text-amber-800'
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
            <div className="bg-gray-800 rounded-2xl shadow-xl p-8">
              <h3 className="text-2xl font-semibold mb-6 text-white">
                Portfolio vs. Expenses Over Time
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={yearlyData}
                    margin={{
                      top: 20,
                      right: 80,
                      left: 80,
                      bottom: 20,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" className="opacity-30" />
                    <XAxis 
                      dataKey="year" 
                      tick={{ fontSize: 12, fill: '#ffffff' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#ffffff' }}
                      tickFormatter={(value) => formatCurrency(value)}
                      width={70}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="portfolioValue" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      name="Portfolio Value"
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2, fill: '#3B82F6' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="burnRate" 
                      stroke="#EF4444" 
                      strokeWidth={3}
                      name="Annual Expenses"
                      dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 8, stroke: '#EF4444', strokeWidth: 2, fill: '#EF4444' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-400">
          <p>
            ZeeCeeDee uses conservative calculations by adding salary and withdrawing expenses at the beginning of each year.
          </p>
          <p className="mt-2">
            This tool is for educational purposes only and should not be considered financial advice.
          </p>
        </div>
      </div>
    </div>
  );
}
