
import React, { useState, useEffect } from 'react';
import { Card, ConfirmationModal, Input } from './common/UIComponents.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { IconTrash } from '../constants.tsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Types & Helpers ---
interface CompoundInterestParams {
    initialInvestment: number;
    monthlyContribution: number;
    years: number;
    interestRate: number;
    interestRatePeriod: 'annual' | 'monthly';
}

interface ChartDataPoint {
    period: number;
    balance: number;
    contributions: number;
    interest: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
};


// --- Standard Calculator Component ---
const StandardCalculator: React.FC = () => {
    const [display, setDisplay] = useState('0');
    const [currentValue, setCurrentValue] = useState<number | null>(null);
    const [operator, setOperator] = useState<string | null>(null);
    const [waitingForOperand, setWaitingForOperand] = useState(false);
    const [history, setHistory] = useLocalStorage<string[]>('calculator-history', []);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const inputDigit = (digit: string) => {
        if (waitingForOperand) {
            setDisplay(digit);
            setWaitingForOperand(false);
        } else {
            setDisplay(display === '0' ? digit : display + digit);
        }
    };

    const inputDecimal = () => {
        if (!display.includes('.')) {
            setDisplay(display + '.');
        }
    };

    const performOperation = (nextOperator: string) => {
        const inputValue = parseFloat(display);

        if (currentValue === null) {
            setCurrentValue(inputValue);
        } else if (operator) {
            const result = calculate(currentValue, inputValue, operator);
            setCurrentValue(result);
            setDisplay(String(result));
            setHistory(prev => [`${currentValue} ${operator} ${inputValue} = ${result}`, ...prev].slice(0, 50));
        }

        setWaitingForOperand(true);
        setOperator(nextOperator);
    };
    
    const calculate = (firstOperand: number, secondOperand: number, op: string): number => {
        switch (op) {
            case '+': return firstOperand + secondOperand;
            case '-': return firstOperand - secondOperand;
            case '*': return firstOperand * secondOperand;
            case '/': return secondOperand === 0 ? Infinity : firstOperand / secondOperand;
            default: return secondOperand;
        }
    };
    
    const handleEquals = () => {
        const inputValue = parseFloat(display);
        if (operator && currentValue !== null) {
            const result = calculate(currentValue, inputValue, operator);
            setHistory(prev => [`${currentValue} ${operator} ${inputValue} = ${result}`, ...prev].slice(0, 50));
            setDisplay(String(result));
            setCurrentValue(null);
            setOperator(null);
            setWaitingForOperand(false);
        }
    };

    const clearAll = () => {
        setDisplay('0');
        setCurrentValue(null);
        setOperator(null);
        setWaitingForOperand(false);
    };
    
    const backspace = () => {
        setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
    }
    
    const useHistoryItem = (item: string) => {
        const result = item.split(' = ')[1];
        if (result) {
            setDisplay(result);
            setWaitingForOperand(false);
        }
    }

    const handleClearHistory = () => {
        setHistory([]);
        setIsConfirmOpen(false);
    };

    const CalculatorButton: React.FC<{onClick: () => void; className?: string; children: React.ReactNode}> = ({onClick, className, children}) => (
        <button onClick={onClick} className={`bg-slate-700 hover:bg-slate-600 rounded-md text-2xl font-semibold text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary h-16 ${className}`}>
            {children}
        </button>
    );
    
    return (
        <Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-slate-900 rounded-md p-4 text-right text-5xl font-mono text-white mb-4 break-words min-h-[70px] flex items-center justify-end">
                        {display}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        <CalculatorButton onClick={clearAll} className="col-span-2 bg-danger/50 hover:bg-danger/70">C</CalculatorButton>
                        <CalculatorButton onClick={backspace}>DEL</CalculatorButton>
                        <CalculatorButton onClick={() => performOperation('/')} className="bg-slate-600 hover:bg-slate-500">÷</CalculatorButton>
                        <CalculatorButton onClick={() => inputDigit('7')}>7</CalculatorButton>
                        <CalculatorButton onClick={() => inputDigit('8')}>8</CalculatorButton>
                        <CalculatorButton onClick={() => inputDigit('9')}>9</CalculatorButton>
                        <CalculatorButton onClick={() => performOperation('*')} className="bg-slate-600 hover:bg-slate-500">×</CalculatorButton>
                        <CalculatorButton onClick={() => inputDigit('4')}>4</CalculatorButton>
                        <CalculatorButton onClick={() => inputDigit('5')}>5</CalculatorButton>
                        <CalculatorButton onClick={() => inputDigit('6')}>6</CalculatorButton>
                        <CalculatorButton onClick={() => performOperation('-')} className="bg-slate-600 hover:bg-slate-500">-</CalculatorButton>
                        <CalculatorButton onClick={() => inputDigit('1')}>1</CalculatorButton>
                        <CalculatorButton onClick={() => inputDigit('2')}>2</CalculatorButton>
                        <CalculatorButton onClick={() => inputDigit('3')}>3</CalculatorButton>
                        <CalculatorButton onClick={() => performOperation('+')} className="bg-slate-600 hover:bg-slate-500">+</CalculatorButton>
                        <CalculatorButton onClick={() => inputDigit('0')} className="col-span-2">0</CalculatorButton>
                        <CalculatorButton onClick={inputDecimal}>.</CalculatorButton>
                        <CalculatorButton onClick={handleEquals} className="bg-primary text-black hover:bg-primary-hover">=</CalculatorButton>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Historial</h2>
                        {history.length > 0 && (
                            <button onClick={() => setIsConfirmOpen(true)} className="p-2 text-slate-400 hover:text-danger rounded-full hover:bg-slate-700 transition-colors" title="Borrar historial">
                                <IconTrash className="w-5 h-5"/>
                            </button>
                        )}
                    </div>
                    <div className="bg-slate-900 rounded-md p-3 h-[25rem] overflow-y-auto flex flex-col-reverse">
                        {history.length > 0 ? (
                            <ul className="text-right text-lg text-slate-300 space-y-2">
                                {history.map((item, index) => (
                                    <li key={index} className="hover:bg-slate-700 p-2 rounded-md cursor-pointer font-mono" onClick={() => useHistoryItem(item)}>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-slate-500 text-center">El historial de cálculos aparecerá aquí.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
             <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleClearHistory}
                title="Confirmar borrado de historial"
            >
                <p>¿Estás seguro de que quieres borrar todo el historial de la calculadora?</p>
                <p className="mt-2 text-sm text-slate-400">Esta acción no se puede deshacer.</p>
            </ConfirmationModal>
        </Card>
    );
};


// --- Compound Interest Component ---
const CompoundInterestCalculator: React.FC = () => {
    const [params, setParams] = useState<CompoundInterestParams>({
        initialInvestment: 1000,
        monthlyContribution: 100,
        years: 10,
        interestRate: 7,
        interestRatePeriod: 'annual'
    });
    const [chartView, setChartView] = useState<'years' | 'months'>('years');
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

    useEffect(() => {
        const calculateData = () => {
            const { initialInvestment, monthlyContribution, years, interestRate, interestRatePeriod } = params;
            if (years <= 0 || interestRate < 0) {
                setChartData([]);
                return;
            };

            const monthlyRate = interestRatePeriod === 'annual' ? (interestRate / 100) / 12 : interestRate / 100;
            const totalMonths = years * 12;

            let currentBalance = initialInvestment;
            let cumulativeContributions = initialInvestment;
            const data: ChartDataPoint[] = [];

            data.push({
                period: 0,
                balance: initialInvestment,
                contributions: initialInvestment,
                interest: 0
            });

            for (let month = 1; month <= totalMonths; month++) {
                const interestEarnedThisMonth = currentBalance * monthlyRate;
                const contributionsThisMonth = monthlyContribution;

                currentBalance += interestEarnedThisMonth + contributionsThisMonth;
                cumulativeContributions += contributionsThisMonth;
                const totalInterest = currentBalance - cumulativeContributions;
                
                if (chartView === 'years' && month % 12 === 0) {
                     data.push({ period: month / 12, balance: currentBalance, contributions: cumulativeContributions, interest: totalInterest });
                } else if (chartView === 'months') {
                     data.push({ period: month, balance: currentBalance, contributions: cumulativeContributions, interest: totalInterest });
                }
            }
            setChartData(data);
        };

        calculateData();
    }, [params, chartView]);

    const handleParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setParams(prev => ({ ...prev, [name]: name === 'interestRatePeriod' ? value : parseFloat(value) || 0 }));
    };

    const finalResult = chartData.length > 1 ? chartData[chartData.length - 1] : { balance: params.initialInvestment, contributions: params.initialInvestment, interest: 0 };

    return (
        <Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-xl font-bold text-white">Parámetros</h3>
                    <Input label="Inversión Inicial (€)" name="initialInvestment" type="number" value={params.initialInvestment} onChange={handleParamChange} />
                    <Input label="Aportación Mensual (€)" name="monthlyContribution" type="number" value={params.monthlyContribution} onChange={handleParamChange} />
                    <Input label="Periodo (años)" name="years" type="number" value={params.years} onChange={handleParamChange} />
                    <div>
                        <Input label="Tipo de Interés (%)" name="interestRate" type="number" step="0.1" value={params.interestRate} onChange={handleParamChange} />
                        <select name="interestRatePeriod" value={params.interestRatePeriod} onChange={handleParamChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 mt-1">
                            <option value="annual">Anual</option>
                            <option value="monthly">Mensual</option>
                        </select>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">Proyección</h3>
                        <select value={chartView} onChange={e => setChartView(e.target.value as any)} className="bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100">
                            <option value="years">Ver por Años</option>
                            <option value="months">Ver por Meses</option>
                        </select>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="period" stroke="#94A3B8" fontSize={12} label={{ value: chartView === 'years' ? 'Años' : 'Meses', position: 'insideBottom', offset: -5, fill: '#94A3B8' }} />
                            <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(value) => `€${Math.round(value/1000)}k`} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155' }} labelStyle={{ color: '#F1F5F9' }} />
                            <Legend />
                            <Line type="monotone" dataKey="contributions" name="Aportado" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="interest" name="Interés Ganado" stroke="#d946ef" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="balance" name="Balance Total" stroke="#4ade80" strokeWidth={3} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-slate-700 p-4 rounded-lg text-center">
                            <p className="text-sm text-slate-400">Balance Final</p>
                            <p className="text-2xl font-bold text-secondary">{formatCurrency(finalResult.balance)}</p>
                        </div>
                        <div className="bg-slate-700 p-4 rounded-lg text-center">
                            <p className="text-sm text-slate-400">Total Aportado</p>
                            <p className="text-2xl font-bold text-info">{formatCurrency(finalResult.contributions)}</p>
                        </div>
                        <div className="bg-slate-700 p-4 rounded-lg text-center">
                            <p className="text-sm text-slate-400">Interés Ganado</p>
                            <p className="text-2xl font-bold text-danger">{formatCurrency(finalResult.interest)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};


// --- Main Page Component ---
const CalculatorPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'standard' | 'compound'>('standard');
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Calculadoras Financieras</h1>
            </div>
            <div className="border-b border-slate-700 mb-6">
                 <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setActiveTab('standard')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'standard' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>
                        Calculadora Estándar
                    </button>
                    <button onClick={() => setActiveTab('compound')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'compound' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>
                        Interés Compuesto
                    </button>
                </nav>
            </div>
            
            {activeTab === 'standard' && <StandardCalculator />}
            {activeTab === 'compound' && <CompoundInterestCalculator />}
        </div>
    );
}

export default CalculatorPage;
