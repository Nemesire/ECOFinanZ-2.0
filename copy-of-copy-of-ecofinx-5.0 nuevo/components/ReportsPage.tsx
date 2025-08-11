import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Card, Button } from './common/UIComponents.tsx';
import { TransactionType, Credit, Goal, Transaction } from '../types.ts';
import { IconDocumentText } from '../constants.tsx';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FinancialReport {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    debtToIncomeRatio: number | null;
    financialHealth: {
        status: string;
        advice: string;
        color: string;
    };
    expenseByCategory: { name: string; value: number }[];
    credits: Credit[];
    goals: Goal[];
    generationDate: string;
}

const calculateRemainingAmount = (credit: Credit): number => {
    const startDate = new Date(credit.startDate);
    const today = new Date();

    const monthsPassed = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
    
    if (monthsPassed <= 0) {
        return credit.totalAmount;
    }

    const monthlyInterestRate = credit.tin / 100 / 12;
    let remainingBalance = credit.totalAmount;

    for (let i = 0; i < monthsPassed; i++) {
        const interestForMonth = remainingBalance * monthlyInterestRate;
        const principalPaid = credit.monthlyPayment - interestForMonth;
        
        remainingBalance -= principalPaid;
        
        if (remainingBalance < 0) {
            remainingBalance = 0;
            break;
        }
    }

    const endDate = new Date(credit.endDate);
    if (today > endDate) {
        return 0;
    }

    return remainingBalance > 0 ? remainingBalance : 0;
};

const ReportsPage: React.FC = () => {
    const { transactions, credits, goals, activeViewTarget } = useApp();
    const [report, setReport] = useState<FinancialReport | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleGenerateReport = () => {
        setIsGenerating(true);

        const monthlyTransactions = transactions.filter(t => t.frequency === 'monthly' || !t.frequency);

        const totalIncome = monthlyTransactions
            .filter(t => t.type === TransactionType.INCOME)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = monthlyTransactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = totalIncome - totalExpenses;
        
        const monthlyDebtPayments = credits.reduce((sum, c) => sum + c.monthlyPayment, 0);
        const monthlyIncome = monthlyTransactions
            .filter(t => t.type === TransactionType.INCOME)
            .reduce((sum, t) => sum + t.amount, 0);
            
        const debtToIncomeRatio = monthlyIncome > 0 ? (monthlyDebtPayments / monthlyIncome) * 100 : null;
        
        let financialHealth = { status: 'Desconocida', advice: 'No hay suficientes datos de ingresos mensuales para calcular el ratio de endeudamiento.', color: 'text-slate-500' };
        if (debtToIncomeRatio !== null) {
            if (debtToIncomeRatio <= 20) {
                financialHealth = { status: 'Saludable', advice: 'Tu nivel de deuda es bajo en comparación con tus ingresos. ¡Excelente trabajo!', color: 'text-secondary' };
            } else if (debtToIncomeRatio <= 36) {
                financialHealth = { status: 'Buena', advice: 'Tu nivel de deuda es manejable. Sigue así y evita contraer nuevas deudas innecesarias.', color: 'text-green-400' };
            } else if (debtToIncomeRatio <= 43) {
                financialHealth = { status: 'Moderada', advice: 'Tu nivel de deuda es algo elevado. Es un buen momento para crear un plan y reducirlo.', color: 'text-accent' };
            } else {
                financialHealth = { status: 'De Riesgo', advice: 'Tu nivel de deuda es muy alto. Es crucial priorizar su reducción para mejorar tu salud financiera.', color: 'text-danger' };
            }
        }
        
        const expenseByCategory = monthlyTransactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((acc, t) => {
                const existing = acc.find(item => item.name === t.category);
                if (existing) {
                    existing.value += t.amount;
                } else {
                    acc.push({ name: t.category, value: t.amount });
                }
                return acc;
            }, [] as { name: string; value: number }[]).sort((a,b) => b.value - a.value);

        setReport({
            totalIncome,
            totalExpenses,
            balance,
            debtToIncomeRatio,
            financialHealth,
            expenseByCategory,
            credits,
            goals,
            generationDate: new Date().toLocaleString('es-ES'),
        });

        setIsGenerating(false);
    };
    
    const handleExportPDF = async () => {
        const input = document.getElementById('report-content');
        if (!input || isExporting) return;
        
        setIsExporting(true);
        
        try {
            const canvas = await html2canvas(input, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#0F172A'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            
            let imgWidth = pdfWidth;
            let imgHeight = imgWidth / ratio;
            
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save(`informe-financiero-${(activeViewTarget?.name || 'usuario').replace(/\s/g, '_')}.pdf`);
        } catch(error) {
            console.error("Error al exportar a PDF:", error);
            alert("Hubo un problema al generar el PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    const PIE_COLORS = ['#22d3ee', '#d946ef', '#facc15', '#4ade80', '#3b82f6', '#a78bfa', '#f87171', '#fb923c', '#db2777'];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <IconDocumentText className="w-8 h-8"/>
                    Generador de Informes
                </h1>
                <div>
                     <Button onClick={handleGenerateReport} disabled={isGenerating} className="mr-4">
                        {isGenerating ? 'Generando...' : 'Generar Informe Mensual'}
                    </Button>
                    {report && (
                         <Button onClick={handleExportPDF} variant="secondary" disabled={isExporting}>
                            {isExporting ? 'Exportando...' : 'Exportar a PDF'}
                        </Button>
                    )}
                </div>
            </div>

            {!report ? (
                 <Card className="text-center py-24">
                    <IconDocumentText className="w-20 h-20 mx-auto text-slate-600 mb-4" />
                    <h2 className="text-2xl font-bold text-white">Tu informe financiero personalizado</h2>
                    <p className="text-slate-400 mt-2 max-w-md mx-auto">
                        Haz clic en "Generar Informe" para obtener un resumen detallado de tu situación financiera basada en tus movimientos mensuales recurrentes o puntuales.
                    </p>
                </Card>
            ) : (
                <div id="report-content" className="p-8 bg-slate-800 rounded-lg">
                    <div className="border-b-2 border-primary pb-4 mb-6">
                        <h2 className="text-4xl font-extrabold text-white">Informe Financiero Mensual</h2>
                        <p className="text-lg text-slate-300">Para: {activeViewTarget?.name}</p>
                        <p className="text-sm text-slate-500">Generado el: {report.generationDate}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-slate-700 p-4 rounded-lg text-center">
                            <p className="text-sm text-slate-400">Ingresos Mensuales</p>
                            <p className="text-3xl font-bold text-secondary">€{report.totalIncome.toFixed(2)}</p>
                        </div>
                        <div className="bg-slate-700 p-4 rounded-lg text-center">
                            <p className="text-sm text-slate-400">Gastos Mensuales</p>
                            <p className="text-3xl font-bold text-danger">€{report.totalExpenses.toFixed(2)}</p>
                        </div>
                        <div className="bg-slate-700 p-4 rounded-lg text-center">
                            <p className="text-sm text-slate-400">Balance Mensual</p>
                            <p className={`text-3xl font-bold ${report.balance >= 0 ? 'text-white' : 'text-danger'}`}>€{report.balance.toFixed(2)}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card>
                            <h3 className="text-xl font-bold mb-4">Salud Financiera</h3>
                            <div className="text-center">
                                <p className="text-sm text-slate-400">Ratio de Endeudamiento Mensual</p>
                                {report.debtToIncomeRatio !== null ? (
                                    <p className={`text-5xl font-bold my-2 ${report.financialHealth.color}`}>{report.debtToIncomeRatio.toFixed(1)}%</p>
                                ) : (
                                    <p className="text-2xl font-bold my-2 text-slate-500">N/A</p>
                                )}
                                <p className={`font-semibold ${report.financialHealth.color}`}>{report.financialHealth.status}</p>
                                <p className="text-sm text-slate-400 mt-2">{report.financialHealth.advice}</p>
                            </div>
                        </Card>
                        <Card>
                            <h3 className="text-xl font-bold mb-4">Desglose de Gastos Mensuales</h3>
                            {report.expenseByCategory.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie data={report.expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                                            {report.expenseByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => `€${value.toFixed(2)}`} contentStyle={{ backgroundColor: '#1E293B' }}/>
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <p className="text-slate-500 text-center py-10">No hay datos de gastos.</p>}
                        </Card>
                        <Card>
                             <h3 className="text-xl font-bold mb-4">Créditos Actuales</h3>
                             {report.credits.length > 0 ? (
                                <ul className="space-y-3">
                                    {report.credits.map(c => (
                                        <li key={c.id} className="flex justify-between items-baseline p-2 bg-slate-700/50 rounded-md">
                                            <div>
                                                <span>{c.name} <span className="text-xs text-slate-400">({c.subcategory})</span></span>
                                                <p className="text-sm font-semibold text-white">€{calculateRemainingAmount(c).toFixed(2)} restantes</p>
                                            </div>
                                            <span className="font-semibold text-primary text-right">€{c.monthlyPayment.toFixed(2)}/mes</span>
                                        </li>
                                    ))}
                                </ul>
                             ) : <p className="text-slate-500">No hay créditos registrados.</p>}
                        </Card>
                        <Card>
                             <h3 className="text-xl font-bold mb-4">Metas Financieras</h3>
                             {report.goals.length > 0 ? (
                                 <ul className="space-y-3">
                                    {report.goals.map(g => {
                                        const progress = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
                                        return (
                                            <li key={g.id}>
                                                <div className="flex justify-between font-semibold"><span>{g.name}</span><span>{progress.toFixed(0)}%</span></div>
                                                <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
                                                    <div className="bg-secondary h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                                                </div>
                                                <p className="text-xs text-right text-slate-400">€{g.currentAmount.toFixed(2)} / €{g.targetAmount.toFixed(2)}</p>
                                            </li>
                                        )
                                    })}
                                 </ul>
                             ) : <p className="text-slate-500">No hay metas definidas.</p>}
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;