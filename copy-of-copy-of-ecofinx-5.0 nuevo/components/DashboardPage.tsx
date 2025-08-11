


import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Card, ProgressBar, Modal, Button } from './common/UIComponents.tsx';
import { IconGoals, IconReceipts, IconBell, IconPiggyBank, IconLayout, IconPlus, IconTrash, IconArrowUp, IconArrowDown, IconSparkles } from '../constants.tsx';
import { TransactionType, Budget, WidgetType, WidgetConfig, Transaction } from '../types.ts';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAIFinancialSummary } from '../services/geminiService.ts';
import ReactMarkdown from 'react-markdown';

// --- WIDGET COMPONENTS ---

const AISummaryWidget: React.FC = () => {
    const { transactions } = useApp();
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const generateSummary = async () => {
        setIsLoading(true);
        const result = await getAIFinancialSummary(transactions);
        setSummary(result);
        setIsLoading(false);
    };
    
    useEffect(() => {
        generateSummary();
    }, []); 

    return (
        <Card className="h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <IconSparkles className="w-6 h-6 text-primary" /> Resumen IA
            </h2>
            <div className="flex-grow">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-slate-400 animate-pulse">Analizando finanzas...</p>
                    </div>
                ) : (
                    <div className="prose prose-sm prose-invert text-slate-300">
                       <ReactMarkdown>{summary}</ReactMarkdown>
                    </div>
                )}
            </div>
            <Button onClick={generateSummary} disabled={isLoading} variant="ghost" className="mt-4 w-full">
                {isLoading ? "Actualizando..." : "Actualizar Resumen"}
            </Button>
        </Card>
    );
};


const SummaryWidget: React.FC = () => {
    const { transactions } = useApp();

    const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const totalSavings = transactions.filter(t => t.type === TransactionType.SAVING).reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpenses;

    const SummaryCard: React.FC<{ title: string; value: string; color: string }> = ({ title, value, color }) => (
        <div className={`bg-slate-800 rounded-lg p-4 shadow-lg border-l-4 ${color}`}>
            <h3 className="text-slate-400 text-base">{title}</h3>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard title="Ingresos" value={`€${totalIncome.toFixed(2)}`} color="border-secondary" />
            <SummaryCard title="Gastos" value={`€${totalExpenses.toFixed(2)}`} color="border-danger" />
            <SummaryCard title="Ahorro" value={`€${totalSavings.toFixed(2)}`} color="border-info" />
            <SummaryCard title="Balance" value={`€${balance.toFixed(2)}`} color={balance >= 0 ? "border-primary" : "border-danger"} />
        </div>
    );
};

const FinancialTrendsWidget: React.FC = () => {
    const { transactions } = useApp();

    const data = useMemo(() => {
        const last30Days = Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const processedData = last30Days.map(date => {
            const dayTransactions = transactions.filter(t => t.date === date);
            const income = dayTransactions
                .filter(t => t.type === TransactionType.INCOME)
                .reduce((sum, t) => sum + t.amount, 0);
            const expense = dayTransactions
                .filter(t => t.type === TransactionType.EXPENSE)
                .reduce((sum, t) => sum + t.amount, 0);
            return {
                date: new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                Ingresos: income,
                Gastos: expense,
            };
        });
        return processedData;
    }, [transactions]);

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4">Tendencias (Últimos 30 días)</h2>
            {transactions.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} />
                        <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(value) => `€${value}`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}
                            formatter={(value: number) => `€${value.toFixed(2)}`}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="Ingresos" stroke="#4ade80" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Gastos" stroke="#d946ef" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">No hay datos para mostrar la tendencia.</div>
            )}
        </Card>
    );
};

const BudgetStatusWidget: React.FC = () => {
    const { budgets, transactions } = useApp();
    const budgetsWithSpending = budgets.map(budget => {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        const spentAmount = transactions
            .filter(t => t.type === TransactionType.EXPENSE && t.category === budget.category && t.date >= firstDayOfMonth && t.date <= lastDayOfMonth)
            .reduce((sum, t) => sum + t.amount, 0);
        return { ...budget, spentAmount, progress: budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0 };
    }).sort((a, b) => b.progress - a.progress);

    const BudgetStatus: React.FC<{ budget: Budget & { spentAmount: number; progress: number } }> = ({ budget }) => {
        const getProgressBarColor = () => {
            if (budget.progress > 100) return 'bg-danger';
            if (budget.progress > 85) return 'bg-accent';
            return 'bg-secondary';
        };
        return (
            <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold">{budget.category}</span>
                    <span className="text-slate-400">€{budget.spentAmount.toFixed(2)} / €{budget.amount.toFixed(2)}</span>
                </div>
                <ProgressBar value={Math.min(budget.progress, 100)} colorClass={getProgressBarColor()} />
            </div>
        );
    };

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><IconPiggyBank className="w-6 h-6" /> Estado de Presupuestos</h2>
            {budgetsWithSpending.length > 0 ? budgetsWithSpending.slice(0, 3).map(b => <BudgetStatus key={b.id} budget={b} />)
                : <p className="text-slate-400 text-center py-10">No hay presupuestos definidos.</p>}
        </Card>
    );
};

const AlertsWidget: React.FC = () => {
    const { alerts } = useApp();
    return (
        <Card>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><IconBell className="w-6 h-6 text-accent" /> Alertas Importantes</h2>
            {alerts.length > 0 ? (
                <div className="space-y-3">
                    {alerts.slice(0, 3).map(alert => (
                        <div key={alert.id} className="p-2 rounded-md bg-accent/10 border border-accent/50">
                            <p className="font-semibold text-white text-sm">{alert.message}</p>
                            <p className="text-xs text-slate-400">Vencimiento: {new Date(alert.date).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>
            ) : <p className="text-slate-400 text-center py-10">No tienes alertas pendientes.</p>}
        </Card>
    );
};

const GoalsWidget: React.FC = () => {
    const { goals } = useApp();
    return (
        <Card>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><IconGoals className="w-6 h-6" /> Próximas Metas</h2>
            {goals.length > 0 ? goals.slice(0, 3).map(goal => (
                <div key={goal.id} className="mb-3">
                    <div className="flex justify-between text-sm"><span>{goal.name}</span><span>€{goal.currentAmount.toFixed(2)} / €{goal.targetAmount.toFixed(2)}</span></div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5 mt-1">
                        <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }}></div>
                    </div>
                </div>
            )) : <p className="text-slate-400 text-center py-10">No has definido ninguna meta.</p>}
        </Card>
    );
};

const AnnualReceiptsWidget: React.FC = () => {
    const { receipts } = useApp();
    const annualReceipts = receipts.filter(r => r.frequency === 'annually');
    return (
        <Card>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><IconReceipts className="w-6 h-6" /> Próximos Recibos Anuales</h2>
            {annualReceipts.length > 0 ? annualReceipts.slice(0, 3).map(r => (
                <div key={r.id} className="flex justify-between items-center p-2 rounded-md hover:bg-slate-700">
                    <div>
                        <p className="font-semibold">{r.title}</p>
                        <p className="text-sm text-slate-400">{new Date(r.date).toLocaleDateString()}</p>
                    </div>
                    <p className="font-bold text-accent">€{r.amount.toFixed(2)}</p>
                </div>
            )) : <p className="text-slate-400 text-center py-10">No hay recibos anuales registrados.</p>}
        </Card>
    );
};

// --- WIDGET METADATA ---
const ALL_WIDGET_DEFINITIONS: { id: WidgetType, name: string, description: string }[] = [
    { id: WidgetType.AI_SUMMARY, name: "Resumen con IA", description: "Un resumen inteligente de tu actividad financiera reciente." },
    { id: WidgetType.SUMMARY_CARDS, name: "Tarjetas de Resumen", description: "Muestra ingresos, gastos, ahorro y balance total." },
    { id: WidgetType.FINANCIAL_TRENDS, name: "Gráfico de Tendencias", description: "Gráfico de líneas con ingresos vs. gastos de los últimos 30 días." },
    { id: WidgetType.BUDGET_STATUS, name: "Estado de Presupuestos", description: "Progreso de tus presupuestos mensuales." },
    { id: WidgetType.ALERTS, name: "Alertas Importantes", description: "Avisos sobre recibos y seguros próximos a vencer." },
    { id: WidgetType.GOALS, name: "Progreso de Metas", description: "Muestra el estado de tus metas de ahorro." },
    { id: WidgetType.ANNUAL_RECEIPTS, name: "Recibos Anuales", description: "Lista de los próximos grandes pagos anuales." },
];

const WIDGET_COMPONENT_MAP: Record<WidgetType, React.FC> = {
    [WidgetType.AI_SUMMARY]: AISummaryWidget,
    [WidgetType.SUMMARY_CARDS]: SummaryWidget,
    [WidgetType.FINANCIAL_TRENDS]: FinancialTrendsWidget,
    [WidgetType.BUDGET_STATUS]: BudgetStatusWidget,
    [WidgetType.ALERTS]: AlertsWidget,
    [WidgetType.GOALS]: GoalsWidget,
    [WidgetType.ANNUAL_RECEIPTS]: AnnualReceiptsWidget,
};

// --- CONFIG MODAL ---
const DashboardConfigModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { dashboardWidgets, updateDashboardWidgets } = useApp();
    const [activeWidgets, setActiveWidgets] = useState<WidgetConfig[]>(dashboardWidgets);

    useEffect(() => {
        setActiveWidgets(dashboardWidgets);
    }, [dashboardWidgets, isOpen]);

    const availableWidgets = ALL_WIDGET_DEFINITIONS.filter(def => !activeWidgets.some(aw => aw.id === def.id));

    const addWidget = (widgetId: WidgetType) => {
        const widgetToAdd = ALL_WIDGET_DEFINITIONS.find(w => w.id === widgetId);
        if (widgetToAdd) {
            setActiveWidgets(prev => [...prev, { id: widgetToAdd.id, type: widgetToAdd.id }]);
        }
    };

    const removeWidget = (widgetId: WidgetType) => {
        setActiveWidgets(prev => prev.filter(w => w.id !== widgetId));
    };

    const moveWidget = (index: number, direction: 'up' | 'down') => {
        const newWidgets = [...activeWidgets];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newWidgets.length) return;
        [newWidgets[index], newWidgets[targetIndex]] = [newWidgets[targetIndex], newWidgets[index]]; // Swap
        setActiveWidgets(newWidgets);
    };

    const handleSave = () => {
        updateDashboardWidgets(activeWidgets);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configurar Widgets del Dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[50vh]">
                <div>
                    <h3 className="text-lg font-bold text-slate-200 mb-2">Widgets Activos</h3>
                    <div className="space-y-2 p-2 rounded-md bg-slate-900/50 min-h-[40vh] border border-slate-700">
                        {activeWidgets.map((widget, index) => (
                            <div key={widget.id} className="flex items-center gap-2 p-2 bg-slate-700 rounded-md">
                                <div className="flex-grow">
                                    <p className="font-semibold">{ALL_WIDGET_DEFINITIONS.find(w=>w.id === widget.id)?.name}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => moveWidget(index, 'up')} disabled={index === 0} className="p-1 disabled:opacity-50 text-slate-400 hover:text-white"><IconArrowUp className="w-5 h-5"/></button>
                                    <button onClick={() => moveWidget(index, 'down')} disabled={index === activeWidgets.length - 1} className="p-1 disabled:opacity-50 text-slate-400 hover:text-white"><IconArrowDown className="w-5 h-5"/></button>
                                    <button onClick={() => removeWidget(widget.id)} className="p-1 text-slate-400 hover:text-danger"><IconTrash className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))}
                        {activeWidgets.length === 0 && <p className="text-slate-500 text-center pt-16">Añade widgets desde la lista de disponibles.</p>}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-200 mb-2">Widgets Disponibles</h3>
                    <div className="space-y-2 p-2 rounded-md bg-slate-900/50 min-h-[40vh] border border-slate-700">
                        {availableWidgets.map(widget => (
                            <div key={widget.id} className="flex items-center gap-2 p-2 bg-slate-800 rounded-md">
                                <div className="flex-grow">
                                    <p className="font-semibold">{widget.name}</p>
                                    <p className="text-xs text-slate-400">{widget.description}</p>
                                </div>
                                <button onClick={() => addWidget(widget.id)} className="p-1.5 bg-secondary/20 text-secondary rounded-full hover:bg-secondary/40"><IconPlus className="w-5 h-5"/></button>
                            </div>
                        ))}
                         {availableWidgets.length === 0 && <p className="text-slate-500 text-center pt-16">Todos los widgets están activos.</p>}
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button variant="primary" onClick={handleSave}>Guardar Cambios</Button>
            </div>
        </Modal>
    );
};


// --- MAIN DASHBOARD PAGE ---
const DashboardPage: React.FC = () => {
    const { activeView, activeViewTarget, dashboardWidgets } = useApp();
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const title = `Dashboard de ${activeViewTarget?.name || 'Usuario'}`;
    const canConfigure = activeView.type === 'user';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">{title}</h1>
                {canConfigure && (
                    <Button variant="ghost" onClick={() => setIsConfigModalOpen(true)}>
                        <IconLayout className="w-5 h-5 mr-2"/>
                        Configurar Widgets
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {dashboardWidgets.map(widgetConfig => {
                    const WidgetComponent = WIDGET_COMPONENT_MAP[widgetConfig.type];
                    if (!WidgetComponent) return null;

                    let containerClass = '';
                    switch(widgetConfig.type) {
                        case WidgetType.SUMMARY_CARDS:
                            containerClass = 'md:col-span-2 xl:col-span-3';
                            break;
                        case WidgetType.FINANCIAL_TRENDS:
                            containerClass = 'md:col-span-2 xl:col-span-2';
                            break;
                        default:
                            containerClass = 'col-span-1';
                    }

                    return (
                        <div key={widgetConfig.id} className={containerClass}>
                           <WidgetComponent />
                        </div>
                    );
                })}
            </div>
            
            {canConfigure && (
                <DashboardConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} />
            )}
        </div>
    );
};

export default DashboardPage;