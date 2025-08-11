import React, { useState, useMemo } from 'react';
import { Card, Input, Button } from './common/UIComponents.tsx';
import { IconBuildingOffice } from '../constants.tsx';

// --- Types & Helpers ---
interface PropertyInputs {
    purchasePrice: number;
    community: string;
    notaryFees: number;
    registryFees: number;
    reforms: number;
    agencyCommission: number;
    managementFees: number;
    appraisalFees: number;
    financingPercentage: number;
    interestRate: number;
    loanTermYears: number;
    monthlyRent: number;
    communityExpenses: number;
    maintenance: number;
    homeInsurance: number;
    mortgageLifeInsurance: number;
    nonPaymentInsurance: number;
    ibi: number;
    vacancyMonths: number;
    annualGrossSalary: number;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

const ITP_RATES: Record<string, number> = {
    'País Vasco': 0.04,
    'Madrid': 0.06,
    'Cataluña': 0.10,
    'Andalucía': 0.07,
    'Comunidad Valenciana': 0.10,
    'Canarias': 0.065,
    'Galicia': 0.10,
    'Default': 0.08
};

const AUTONOMOUS_COMMUNITIES = Object.keys(ITP_RATES).filter(k => k !== 'Default');


// --- Main Component ---
const PropertyProfitabilityPage: React.FC = () => {
    const [inputs, setInputs] = useState<PropertyInputs>({
        purchasePrice: 86000,
        community: 'País Vasco',
        notaryFees: 500,
        registryFees: 250,
        reforms: 3000,
        agencyCommission: 0,
        managementFees: 300,
        appraisalFees: 200,
        financingPercentage: 90,
        interestRate: 3.5,
        loanTermYears: 30,
        monthlyRent: 775,
        communityExpenses: 600,
        maintenance: 930,
        homeInsurance: 100,
        mortgageLifeInsurance: 150,
        nonPaymentInsurance: 465,
        ibi: 160,
        vacancyMonths: 0.6,
        annualGrossSalary: 35200,
    });
    const [scenario, setScenario] = useState<'prudent' | 'optimistic'>('prudent');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setInputs(prev => ({
            ...prev,
            [name]: e.target.type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const calculations = useMemo(() => {
        const scenarioVacancyMonths = scenario === 'prudent' ? inputs.vacancyMonths : 0;
        const scenarioMaintenance = scenario === 'prudent' ? inputs.maintenance : inputs.maintenance * 0.5;

        // --- Gastos Iniciales ---
        const itpRate = ITP_RATES[inputs.community] || ITP_RATES['Default'];
        const itpAmount = inputs.purchasePrice * itpRate;
        const totalPurchaseExpenses = itpAmount + inputs.notaryFees + inputs.registryFees + inputs.reforms + inputs.agencyCommission;
        const totalMortgageExpenses = inputs.managementFees + inputs.appraisalFees;
        const totalUpfrontExpenses = totalPurchaseExpenses + totalMortgageExpenses;

        // --- Financiación y Capital Propio ---
        const mortgageAmount = inputs.purchasePrice * (inputs.financingPercentage / 100);
        const ownCapitalNeeded = (inputs.purchasePrice + totalUpfrontExpenses) - mortgageAmount;

        // --- Cálculo de la Hipoteca ---
        const monthlyInterestRate = (inputs.interestRate / 100) / 12;
        const numberOfPayments = inputs.loanTermYears * 12;
        let monthlyMortgagePayment = 0;
        if (monthlyInterestRate > 0 && numberOfPayments > 0) {
            monthlyMortgagePayment = mortgageAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
        } else if (numberOfPayments > 0) {
            monthlyMortgagePayment = mortgageAmount / numberOfPayments;
        }
        const annualMortgagePayment = monthlyMortgagePayment * 12;

        let firstYearInterest = 0;
        let balance = mortgageAmount;
        for (let i = 0; i < 12 && i < numberOfPayments; i++) {
            const interestPayment = balance * monthlyInterestRate;
            const principalPayment = monthlyMortgagePayment - interestPayment;
            firstYearInterest += interestPayment;
            balance -= principalPayment;
        }
        
        // --- Ingresos y Gastos Anuales ---
        const annualGrossRent = inputs.monthlyRent * 12;
        const vacancyCost = inputs.monthlyRent * scenarioVacancyMonths;
        const annualOperatingExpenses = inputs.communityExpenses + scenarioMaintenance + inputs.homeInsurance + inputs.mortgageLifeInsurance + inputs.nonPaymentInsurance + inputs.ibi + vacancyCost;
        const totalAnnualExpenses = annualOperatingExpenses + firstYearInterest;

        // --- Beneficios y Cash Flow ---
        const profitBeforeTax = annualGrossRent - totalAnnualExpenses;
        const annualCashFlow = annualGrossRent - annualOperatingExpenses - annualMortgagePayment;
        const monthlyCashFlow = annualCashFlow / 12;

        // --- Fiscalidad Simplificada ---
        const buildingValueForAmortization = inputs.purchasePrice * 0.8; 
        const annualAmortization = buildingValueForAmortization * 0.03;
        const netProfitForTax = annualGrossRent - annualOperatingExpenses - firstYearInterest - annualAmortization;
        const taxReduction = netProfitForTax > 0 ? netProfitForTax * 0.60 : 0; 
        const taxableBase = netProfitForTax - taxReduction;
        const getIrpfRate = (salary: number) => {
            if (salary > 60000) return 0.45;
            if (salary > 35200) return 0.37;
            if (salary > 20200) return 0.30;
            return 0.19;
        };
        const irpfRate = getIrpfRate(inputs.annualGrossSalary);
        const taxOnProfit = taxableBase > 0 ? taxableBase * irpfRate : 0;
        const profitAfterTax = profitBeforeTax - taxOnProfit;

        // --- Rentabilidades ---
        const totalInvestment = inputs.purchasePrice + totalUpfrontExpenses;
        const grossYield = totalInvestment > 0 ? (annualGrossRent / totalInvestment) * 100 : 0;
        const netYield = totalInvestment > 0 ? (profitBeforeTax / totalInvestment) * 100 : 0;
        const roi = ownCapitalNeeded > 0 ? (annualCashFlow / ownCapitalNeeded) * 100 : 0;

        return { totalUpfrontExpenses, ownCapitalNeeded, monthlyMortgagePayment, annualCashFlow, monthlyCashFlow, grossYield, netYield, roi, profitBeforeTax, profitAfterTax, annualGrossRent };
    }, [inputs, scenario]);

     const additionalMetrics = useMemo(() => {
        const targetRent = (inputs.purchasePrice + inputs.reforms) * 0.01;
        
        const paybackYears = calculations.annualCashFlow > 0 
            ? calculations.ownCapitalNeeded / calculations.annualCashFlow 
            : Infinity;

        const grm = calculations.annualGrossRent > 0 ? inputs.purchasePrice / calculations.annualGrossRent : Infinity;
        
        const baseOperatingExpenses = inputs.communityExpenses + inputs.maintenance + inputs.homeInsurance + inputs.mortgageLifeInsurance + inputs.nonPaymentInsurance + inputs.ibi;
        const oer = calculations.annualGrossRent > 0 ? (baseOperatingExpenses / calculations.annualGrossRent) * 100 : Infinity;

        return { targetRent, paybackYears, grm, oer };
    }, [inputs, calculations]);

    const ResultCard: React.FC<{title: string, value: string, helpText?: string, colorClass?: string}> = ({title, value, helpText, colorClass = 'text-white'}) => (
        <div className="bg-slate-700 p-4 rounded-lg" title={helpText}>
            <h4 className="text-sm font-semibold text-slate-400">{title}</h4>
            <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
        </div>
    );
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <IconBuildingOffice className="w-8 h-8"/>
                    Calculadora de Rentabilidad de Inmuebles
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* --- Input Section --- */}
                <div className="lg:col-span-3 space-y-6">
                    <Card>
                        <h3 className="text-xl font-bold mb-4">Datos de Compra y Gastos Iniciales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Precio de Compraventa" type="number" name="purchasePrice" value={inputs.purchasePrice} onChange={handleInputChange} />
                            <div>
                               <label className="block text-sm font-medium text-slate-400 mb-1">Comunidad Autónoma (para ITP)</label>
                               <select name="community" value={inputs.community} onChange={handleInputChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100">
                                   {AUTONOMOUS_COMMUNITIES.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                            </div>
                            <Input label="Gastos de Notaría" type="number" name="notaryFees" value={inputs.notaryFees} onChange={handleInputChange} />
                            <Input label="Gastos de Registro" type="number" name="registryFees" value={inputs.registryFees} onChange={handleInputChange} />
                            <Input label="Coste de la Reforma" type="number" name="reforms" value={inputs.reforms} onChange={handleInputChange} />
                            <Input label="Comisión de Agencia" type="number" name="agencyCommission" value={inputs.agencyCommission} onChange={handleInputChange} />
                        </div>
                    </Card>
                    <Card>
                        <h3 className="text-xl font-bold mb-4">Financiación (Hipoteca)</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Input label="% Financiado s/Compra" type="number" name="financingPercentage" value={inputs.financingPercentage} onChange={handleInputChange} />
                            <Input label="Tipo de Interés Anual (%)" type="number" name="interestRate" step="0.01" value={inputs.interestRate} onChange={handleInputChange} />
                            <Input label="Plazo del Préstamo (Años)" type="number" name="loanTermYears" value={inputs.loanTermYears} onChange={handleInputChange} />
                            <Input label="Gastos de Gestoría Hipoteca" type="number" name="managementFees" value={inputs.managementFees} onChange={handleInputChange} />
                            <Input label="Gastos de Tasación" type="number" name="appraisalFees" value={inputs.appraisalFees} onChange={handleInputChange} />
                        </div>
                    </Card>
                     <Card>
                        <h3 className="text-xl font-bold mb-4">Ingresos y Gastos Anuales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Ingreso Mensual por Alquiler" type="number" name="monthlyRent" value={inputs.monthlyRent} onChange={handleInputChange} />
                            <Input label="Meses de Vacancia al Año" type="number" name="vacancyMonths" step="0.1" value={inputs.vacancyMonths} onChange={handleInputChange} helperText="Ej: 0.5 para medio mes, 1 para un mes." />
                            <Input label="Gastos de Comunidad (Anual)" type="number" name="communityExpenses" value={inputs.communityExpenses} onChange={handleInputChange} />
                            <Input label="Mantenimiento (Anual)" type="number" name="maintenance" value={inputs.maintenance} onChange={handleInputChange} />
                            <Input label="Seguro de Hogar (Anual)" type="number" name="homeInsurance" value={inputs.homeInsurance} onChange={handleInputChange} />
                            <Input label="Seguro de Vida Hipoteca (Anual)" type="number" name="mortgageLifeInsurance" value={inputs.mortgageLifeInsurance} onChange={handleInputChange} />
                             <Input label="Seguro de Impago (Anual)" type="number" name="nonPaymentInsurance" value={inputs.nonPaymentInsurance} onChange={handleInputChange} />
                            <Input label="IBI (Anual)" type="number" name="ibi" value={inputs.ibi} onChange={handleInputChange} />
                        </div>
                    </Card>
                    <Card>
                        <h3 className="text-xl font-bold mb-4">Fiscalidad (Simplificada)</h3>
                        <Input label="Salario Bruto Anual (para tramo IRPF)" type="number" name="annualGrossSalary" value={inputs.annualGrossSalary} onChange={handleInputChange} />
                    </Card>
                </div>
                {/* --- Results Section --- */}
                <div className="lg:col-span-2">
                    <div className="sticky top-8 space-y-6">
                        <Card>
                             <h3 className="text-xl font-bold mb-4">Análisis de Escenarios</h3>
                             <div className="flex gap-2 mb-4 p-1 bg-slate-700 rounded-lg">
                                <button 
                                    onClick={() => setScenario('prudent')} 
                                    className={`w-full p-2 rounded-md font-semibold text-sm ${scenario === 'prudent' ? 'bg-primary text-black' : 'text-slate-300 hover:bg-slate-600'}`}
                                >
                                    Prudente
                                </button>
                                <button 
                                    onClick={() => setScenario('optimistic')}
                                    className={`w-full p-2 rounded-md font-semibold text-sm ${scenario === 'optimistic' ? 'bg-secondary text-black' : 'text-slate-300 hover:bg-slate-600'}`}
                                >
                                    Optimista
                                </button>
                             </div>
                            <h3 className="text-xl font-bold mb-4">Resultados de la Inversión</h3>
                            <div className="space-y-4">
                               <ResultCard title="Capital Propio Necesario" value={formatCurrency(calculations.ownCapitalNeeded)} helpText="Dinero total que necesitas de tu bolsillo para la operación." colorClass="text-accent" />
                               <ResultCard title="Cash Flow Mensual" value={formatCurrency(calculations.monthlyCashFlow)} helpText="Dinero que te queda cada mes después de pagar todos los gastos (incluida la hipoteca)." colorClass={calculations.monthlyCashFlow >= 0 ? 'text-secondary' : 'text-danger'} />
                               <ResultCard title="Cash Flow Anual" value={formatCurrency(calculations.annualCashFlow)} helpText="Dinero que te queda al año después de pagar todos los gastos (incluida la hipoteca)." colorClass={calculations.annualCashFlow >= 0 ? 'text-secondary' : 'text-danger'} />
                               <ResultCard title="Beneficio Anual (Después de Imp.)" value={formatCurrency(calculations.profitAfterTax)} helpText="Beneficio estimado tras pagar gastos, intereses e impuestos (no incluye la devolución del principal de la hipoteca)." />
                            </div>
                        </Card>
                        <Card>
                            <h3 className="text-xl font-bold mb-4">Métricas de Rentabilidad</h3>
                             <div className="space-y-4">
                                <ResultCard title="Rentabilidad Bruta" value={`${calculations.grossYield.toFixed(2)}%`} helpText="(Alquiler Anual / Coste Total de Compra) x 100" />
                                <ResultCard title="Rentabilidad Neta" value={`${calculations.netYield.toFixed(2)}%`} helpText="(Beneficio Antes de Impuestos / Coste Total de Compra) x 100" />
                                <ResultCard title="Retorno de la Inversión (ROI)" value={`${calculations.roi.toFixed(2)}%`} helpText="(Cash Flow Anual / Capital Propio Necesario) x 100. Es el retorno real de tu dinero." colorClass="text-primary"/>
                            </div>
                        </Card>
                         <Card>
                            <h3 className="text-xl font-bold mb-4">Análisis y Métricas Adicionales</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded-md">
                                    <span className="text-slate-300">Estimador de Alquiler (Regla 1%)</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold font-mono text-white">{formatCurrency(additionalMetrics.targetRent)}/mes</span>
                                        <Button size="sm" variant="ghost" onClick={() => setInputs(prev => ({...prev, monthlyRent: additionalMetrics.targetRent}))}>Aplicar</Button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded-md">
                                    <span className="text-slate-300">Tiempo de Amortización (Payback)</span>
                                    <span className="font-bold font-mono text-white">
                                        {isFinite(additionalMetrics.paybackYears) ? `${additionalMetrics.paybackYears.toFixed(1)} años` : 'No se amortiza'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded-md">
                                    <span className="text-slate-300">Multiplicador Renta Bruta (GRM)</span>
                                    <span className="font-bold font-mono text-white">
                                        {isFinite(additionalMetrics.grm) ? additionalMetrics.grm.toFixed(2) : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded-md">
                                    <span className="text-slate-300">Ratio de Gastos Operativos (OER)</span>
                                    <span className="font-bold font-mono text-white">
                                        {isFinite(additionalMetrics.oer) ? `${additionalMetrics.oer.toFixed(1)}%` : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PropertyProfitabilityPage;
