import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.tsx';
import { Transaction, TransactionType, ReceiptFrequency, ScannedReceiptData } from '../types.ts';
import { Card, Modal, Input, Button, ConfirmationModal } from './common/UIComponents.tsx';
import { IconPlus, IconPencil, IconTrash, IconArrowDown, IconArrowUp, IconCamera } from '../constants.tsx';
import { analyzeReceiptImage } from '../services/geminiService.ts';

const frequencyMap: Record<ReceiptFrequency, string> = {
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    semiannually: 'Semestral',
    annually: 'Anual',
};

const AddTransactionModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    initialData?: Transaction | ScannedReceiptData | null;
}> = ({ isOpen, onClose, initialData }) => {
    const { 
        users,
        groupMembers,
        addTransaction, 
        updateTransaction,
        incomeCategories, 
        expenseCategories, 
        expenseSubcategories,
        addIncomeCategory, 
        addExpenseCategory,
        addExpenseSubcategory,
        activeView
    } = useApp();
    
    const getInitialState = () => ({
        type: TransactionType.EXPENSE,
        category: '',
        newCategory: '',
        subcategory: '',
        newSubcategory: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        frequency: 'one-time' as ReceiptFrequency | 'one-time',
        ownerId: '',
    });

    const [formData, setFormData] = useState(getInitialState());
    
    useEffect(() => {
        if (!isOpen) return;

        let owner = '';
        if (activeView.type === 'user') {
            owner = activeView.id;
        } else if (activeView.type === 'group' && groupMembers.length > 0) {
            owner = groupMembers[0].id;
        } else if (users.length > 0) {
            owner = users[0].id;
        }

        if (initialData) {
            const isFullTransaction = 'type' in initialData;
            setFormData({
                type: isFullTransaction ? (initialData as Transaction).type : TransactionType.EXPENSE,
                category: initialData.category || '',
                newCategory: '',
                subcategory: isFullTransaction ? (initialData as Transaction).subcategory || '' : '',
                newSubcategory: '',
                amount: initialData.amount ? String(initialData.amount) : '',
                date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                description: initialData.description || '',
                frequency: isFullTransaction ? (initialData as Transaction).frequency || 'one-time' : 'one-time',
                ownerId: owner,
            });
        } else {
            const resetState = getInitialState();
            resetState.ownerId = owner;
            setFormData(resetState);
        }
    }, [isOpen, initialData, activeView, users, groupMembers]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            ...(name === 'type' && { category: '', newCategory: '', subcategory: '', newSubcategory: '' }),
            ...(name === 'category' && { subcategory: '', newSubcategory: '' }), // Reset subcategory on category change
            ...(name === 'category' && value !== 'add-new' && { newCategory: '' }),
            ...(name === 'subcategory' && value !== 'add-new' && { newSubcategory: '' })
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalCategory = formData.category;
        if (formData.category === 'add-new' && formData.newCategory.trim()) {
            finalCategory = formData.newCategory.trim();
            if (formData.type === TransactionType.INCOME) {
                addIncomeCategory(finalCategory);
            } else if (formData.type === TransactionType.EXPENSE) {
                addExpenseCategory(finalCategory);
            }
        }

        let finalSubcategory = formData.subcategory;
        if (formData.type === TransactionType.EXPENSE && finalCategory && formData.subcategory === 'add-new' && formData.newSubcategory.trim()) {
            finalSubcategory = formData.newSubcategory.trim();
            addExpenseSubcategory(finalCategory, finalSubcategory);
        }

        if (!finalCategory && formData.type !== TransactionType.SAVING) return;
        
        const transactionData = {
            type: formData.type,
            category: finalCategory || 'Ahorro',
            subcategory: finalSubcategory && finalSubcategory !== 'add-new' ? finalSubcategory : undefined,
            amount: parseFloat(formData.amount),
            date: formData.date,
            description: formData.description,
            frequency: formData.frequency === 'one-time' ? undefined : formData.frequency,
        };

        if (initialData && 'id' in initialData) {
            updateTransaction({ ...transactionData, id: (initialData as Transaction).id });
        } else {
            addTransaction(transactionData, formData.ownerId || users[0].id);
        }

        onClose();
    };

    const categories = formData.type === TransactionType.INCOME ? incomeCategories : expenseCategories;
    const subcategories = (formData.type === TransactionType.EXPENSE && formData.category && expenseSubcategories[formData.category]) ? expenseSubcategories[formData.category] : [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData && 'id' in initialData ? "Editar Movimiento" : "Añadir Movimiento"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {!(initialData && 'id' in initialData) && users.length > 1 && (
                    <div>
                        <label htmlFor="ownerId" className="block text-sm font-medium text-slate-400 mb-1">Propietario</label>
                        <select
                            id="ownerId"
                            name="ownerId"
                            value={formData.ownerId}
                            onChange={handleChange}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary"
                            required
                        >
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-slate-400 mb-1">Tipo</label>
                    <select id="type" name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary" disabled={!!(initialData && 'id' in initialData)}>
                        <option value={TransactionType.EXPENSE}>Gasto</option>
                        <option value={TransactionType.INCOME}>Ingreso</option>
                        <option value={TransactionType.SAVING}>Ahorro</option>
                    </select>
                </div>
                
                {formData.type !== TransactionType.SAVING ? (
                    <>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-slate-400 mb-1">Categoría</label>
                            <select id="category" name="category" value={formData.category} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary" required>
                                <option value="">-- Selecciona una categoría --</option>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                <option value="add-new">Añadir nueva categoría...</option>
                            </select>
                        </div>
                        {formData.category === 'add-new' && (
                            <Input label="Nombre de la nueva categoría" name="newCategory" value={formData.newCategory} onChange={handleChange} required />
                        )}

                        {formData.type === TransactionType.EXPENSE && formData.category && formData.category !== 'add-new' && (
                             <div>
                                <label htmlFor="subcategory" className="block text-sm font-medium text-slate-400 mb-1">Subcategoría</label>
                                <select id="subcategory" name="subcategory" value={formData.subcategory} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary">
                                    <option value="">-- Opcional --</option>
                                    {subcategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                    <option value="add-new">Añadir nueva subcategoría...</option>
                                </select>
                            </div>
                        )}
                         {formData.subcategory === 'add-new' && (
                            <Input label="Nombre de la nueva subcategoría" name="newSubcategory" value={formData.newSubcategory} onChange={handleChange} required />
                        )}

                         <div>
                            <label htmlFor="frequency" className="block text-sm font-medium text-slate-400 mb-1">Frecuencia</label>
                            <select id="frequency" name="frequency" value={formData.frequency} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary">
                                <option value="one-time">Puntual</option>
                                <option value="monthly">Mensual</option>
                                <option value="quarterly">Trimestral</option>
                                <option value="semiannually">Semestral</option>
                                <option value="annually">Anual</option>
                            </select>
                        </div>
                    </>
                ) : (
                     <Input label="Origen del Ahorro" name="category" value={formData.category} onChange={handleChange} placeholder="Ej: Fondo de emergencia" required />
                )}

                <Input label="Importe (€)" name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} required />
                <Input label="Fecha" name="date" type="date" value={formData.date} onChange={handleChange} required />
                <Input label="Descripción (Opcional)" name="description" value={formData.description} onChange={handleChange} />
                <div className="flex justify-end pt-4">
                    <Button type="submit">{initialData && 'id' in initialData ? "Guardar Cambios" : "Añadir"}</Button>
                </div>
            </form>
        </Modal>
    );
};


// Main page component
const AccountingPage: React.FC = () => {
    const { transactions, deleteTransaction, incomeCategories, expenseCategories, credits, insurancePolicies } = useApp();
    const location = useLocation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [initialModalData, setInitialModalData] = useState<Transaction | ScannedReceiptData | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
    const [view, setView] = useState<'list' | 'annual'>('list');
    const [year, setYear] = useState(new Date().getFullYear());
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({ income: true, expense: true });
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const handleScanClick = () => {
        fileInputRef.current?.click();
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('scan') === 'true') {
            handleScanClick();
        }
    }, [location]);

    const toggleRow = (key: string) => {
        setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleOpenEditModal = (transaction: Transaction) => {
        setInitialModalData(transaction);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setInitialModalData(null);
    };

    const handleConfirmDelete = () => {
        if (transactionToDelete) {
            deleteTransaction(transactionToDelete.id);
            setTransactionToDelete(null);
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsScanning(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = (reader.result as string).split(',')[1];
                try {
                    const data = await analyzeReceiptImage(base64String, file.type);
                    setInitialModalData(data);
                    setIsModalOpen(true);
                } catch(e) {
                    console.error(e);
                    alert("Error al analizar la imagen.");
                } finally {
                    setIsScanning(false);
                }
            };
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    };

    const expandedTransactions = useMemo(() => {
        const expanded: Transaction[] = [];
        const currentYearStart = new Date(year, 0, 1);
        const currentYearEnd = new Date(year, 11, 31, 23, 59, 59);

        transactions.forEach(t => {
            const startDate = new Date(t.date);

            if (!t.frequency) { // One-time transaction
                if (startDate >= currentYearStart && startDate <= currentYearEnd) {
                    expanded.push(t);
                }
            } else { // Recurring transaction
                const intervals = { monthly: 1, quarterly: 3, semiannually: 6, annually: 12 };
                const interval = intervals[t.frequency];
                
                let currentDate = new Date(startDate);
                while(currentDate.getFullYear() < year) {
                    currentDate.setMonth(currentDate.getMonth() + interval);
                }
                
                while (currentDate.getFullYear() === year) {
                    if (currentDate >= startDate) {
                         expanded.push({
                            ...t,
                            id: `${t.id}-${currentDate.toISOString()}`,
                            date: currentDate.toISOString().split('T')[0],
                        });
                    }
                    currentDate.setMonth(currentDate.getMonth() + interval);
                }
            }
        });
        return expanded;
    }, [transactions, year]);

    const exportTransactionsToCSV = () => {
        const transactionsForYear = expandedTransactions;

        if (transactionsForYear.length === 0) {
            alert("No hay transacciones para exportar en el año seleccionado.");
            return;
        }

        const monthLabels = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const headers = ["Categoría", ...monthLabels, "Total Anual"];

        const dataGrid: { [category: string]: number[] } = {};
        const incomeCategoriesSet = new Set(incomeCategories);
        const expenseCategoriesSet = new Set(expenseCategories);

        [...incomeCategories, ...expenseCategories, 'Ahorro'].forEach(cat => {
            if (!dataGrid[cat]) {
                dataGrid[cat] = Array(13).fill(0);
            }
        });

        transactionsForYear.forEach(t => {
            const transactionDate = new Date(t.date);
            const monthIndex = new Date(transactionDate.valueOf() + transactionDate.getTimezoneOffset() * 60 * 1000).getMonth();
            
            if (!dataGrid[t.category]) {
                dataGrid[t.category] = Array(13).fill(0);
            }

            dataGrid[t.category][monthIndex] += t.amount;
            dataGrid[t.category][12] += t.amount;
        });
        
        const totalIncome = Array(13).fill(0);
        const totalExpense = Array(13).fill(0);
        const totalSaving = Array(13).fill(0);
        const balance = Array(13).fill(0);

        Object.keys(dataGrid).forEach(category => {
            if (incomeCategoriesSet.has(category)) {
                for(let i=0; i<13; i++) totalIncome[i] += dataGrid[category][i];
            } else if (expenseCategoriesSet.has(category)) {
                for(let i=0; i<13; i++) totalExpense[i] += dataGrid[category][i];
            } else if (category === 'Ahorro') {
                for(let i=0; i<13; i++) totalSaving[i] += dataGrid[category][i];
            }
        });

        for(let i=0; i<13; i++) {
            balance[i] = totalIncome[i] - totalExpense[i];
        }

        const toCsvRow = (row: (string | number)[]) => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');

        const csvRows: string[] = [headers.join(',')];

        csvRows.push(toCsvRow(['INGRESOS', ...totalIncome.map(v => v.toFixed(2))]));
        Object.keys(dataGrid)
            .filter(cat => incomeCategoriesSet.has(cat) && dataGrid[cat][12] > 0)
            .sort().forEach(category => {
                csvRows.push(toCsvRow([`  ${category}`, ...dataGrid[category].map(v => v.toFixed(2))]));
            });

        csvRows.push(toCsvRow(['GASTOS', ...totalExpense.map(v => v.toFixed(2))]));
        Object.keys(dataGrid)
            .filter(cat => expenseCategoriesSet.has(cat) && dataGrid[cat][12] > 0)
            .sort().forEach(category => {
                csvRows.push(toCsvRow([`  ${category}`, ...dataGrid[category].map(v => v.toFixed(2))]));
            });
            
        if (totalSaving[12] > 0) {
            csvRows.push(toCsvRow(['AHORRO', ...totalSaving.map(v => v.toFixed(2))]));
        }
        
        csvRows.push(toCsvRow(['BALANCE', ...balance.map(v => v.toFixed(2))]));

        const csvContent = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `informe_contable_${year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const filteredAndSortedTransactions = useMemo(() => {
        return [...transactions]
            .filter(t => {
                if (typeFilter !== 'all' && t.type !== typeFilter) {
                    return false;
                }
                if (categoryFilter !== 'all' && t.category !== categoryFilter) {
                    return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, typeFilter, categoryFilter]);

    const annualDataGrid = useMemo(() => {
        const grid: { [category: string]: { monthlyTotals: number[], total: number } } = {};
        const incomeSet = new Set(incomeCategories);
        const expenseSet = new Set(expenseCategories);

        [...incomeCategories, ...expenseCategories, 'Ahorro'].forEach(cat => {
            grid[cat] = { monthlyTotals: Array(12).fill(0), total: 0 };
        });

        expandedTransactions.forEach(t => {
            const transactionDate = new Date(t.date);
            const monthIndex = transactionDate.getUTCMonth(); // Use UTC month
            if (!grid[t.category]) {
                grid[t.category] = { monthlyTotals: Array(12).fill(0), total: 0 };
            }
            grid[t.category].monthlyTotals[monthIndex] += t.amount;
            grid[t.category].total += t.amount;
        });
        
        const totals = {
            income: { monthlyTotals: Array(12).fill(0), total: 0 },
            expense: { monthlyTotals: Array(12).fill(0), total: 0 },
            saving: { monthlyTotals: Array(12).fill(0), total: 0 },
            balance: { monthlyTotals: Array(12).fill(0), total: 0 },
        };

        Object.entries(grid).forEach(([category, data]) => {
            if (incomeSet.has(category)) {
                data.monthlyTotals.forEach((val, i) => totals.income.monthlyTotals[i] += val);
                totals.income.total += data.total;
            } else if (expenseSet.has(category)) {
                data.monthlyTotals.forEach((val, i) => totals.expense.monthlyTotals[i] += val);
                totals.expense.total += data.total;
            } else if (category === 'Ahorro') {
                data.monthlyTotals.forEach((val, i) => totals.saving.monthlyTotals[i] += val);
                totals.saving.total += data.total;
            }
        });

        for(let i=0; i<12; i++) {
            totals.balance.monthlyTotals[i] = totals.income.monthlyTotals[i] - totals.expense.monthlyTotals[i];
        }
        totals.balance.total = totals.income.total - totals.expense.total;
        
        return { grid, totals, incomeSet, expenseSet };
    }, [expandedTransactions, incomeCategories, expenseCategories]);

    const renderListView = () => (
        <Card>
            <div className="flex flex-wrap gap-4 mb-4">
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary">
                    <option value="all">Todos los Tipos</option>
                    <option value={TransactionType.INCOME}>Ingresos</option>
                    <option value={TransactionType.EXPENSE}>Gastos</option>
                    <option value={TransactionType.SAVING}>Ahorros</option>
                </select>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary">
                    <option value="all">Todas las Categorías</option>
                    {[...incomeCategories, ...expenseCategories, 'Ahorro'].sort().map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b border-slate-700">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Tipo</th>
                            <th className="p-3">Categoría</th>
                            <th className="p-3">Descripción</th>
                            <th className="p-3 text-right">Importe</th>
                            <th className="p-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedTransactions.map(t => (
                            <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-700/50">
                                <td className="p-3">{new Date(t.date).toLocaleDateString()}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${t.type === TransactionType.INCOME ? 'bg-secondary/20 text-secondary' : t.type === TransactionType.EXPENSE ? 'bg-danger/20 text-danger' : 'bg-info/20 text-info'}`}>{t.type}</span>
                                </td>
                                <td className="p-3">{t.category} {t.subcategory && <span className="text-xs text-slate-400">({t.subcategory})</span>}</td>
                                <td className="p-3 text-sm text-slate-400">{t.description}</td>
                                <td className={`p-3 text-right font-bold ${t.type === TransactionType.INCOME ? 'text-secondary' : t.type === TransactionType.EXPENSE ? 'text-danger' : 'text-info'}`}>
                                    {t.type === TransactionType.EXPENSE ? '-' : ''}€{t.amount.toFixed(2)}
                                </td>
                                <td className="p-3 text-center">
                                    <div className="flex justify-center gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(t)} className="text-slate-400 hover:text-white" disabled={!!t.creditId || !!t.insuranceId} title={t.creditId || t.insuranceId ? "Edita desde la sección de Créditos o Seguros" : "Editar"}><IconPencil className="w-5 h-5"/></Button>
                                        <Button variant="ghost" size="sm" onClick={() => setTransactionToDelete(t)} className="text-slate-400 hover:text-danger" disabled={!!t.creditId || !!t.insuranceId} title={t.creditId || t.insuranceId ? "Elimina desde la sección de Créditos o Seguros" : "Eliminar"}><IconTrash className="w-5 h-5"/></Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    const renderAnnualView = () => (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <Button onClick={() => setYear(y => y - 1)}>&lt;</Button>
                    <span className="text-xl font-bold text-white">{year}</span>
                    <Button onClick={() => setYear(y => y + 1)}>&gt;</Button>
                </div>
                <Button onClick={exportTransactionsToCSV}>Exportar CSV</Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="border-b border-slate-600">
                            <th className="p-2 sticky left-0 bg-slate-800">Categoría</th>
                            {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].map(m => <th key={m} className="p-2 text-right">{m}</th>)}
                            <th className="p-2 text-right font-bold">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Income */}
                        <tr className="bg-secondary/10 font-bold">
                            <td className="p-2 sticky left-0 bg-slate-800 cursor-pointer flex items-center gap-2" onClick={() => toggleRow('income')}>
                                {expandedRows.income ? <IconArrowDown className="w-4 h-4"/> : <IconArrowUp className="w-4 h-4"/>} INGRESOS
                            </td>
                            {annualDataGrid.totals.income.monthlyTotals.map((total, i) => <td key={i} className="p-2 text-right">{total.toFixed(2)}</td>)}
                            <td className="p-2 text-right">{annualDataGrid.totals.income.total.toFixed(2)}</td>
                        </tr>
                        {expandedRows.income && Object.entries(annualDataGrid.grid).filter(([cat]) => annualDataGrid.incomeSet.has(cat) && annualDataGrid.grid[cat].total > 0).sort().map(([category, data]) => (
                            <tr key={category} className="hover:bg-slate-700/50">
                                <td className="p-2 pl-8 sticky left-0 bg-slate-800">{category}</td>
                                {data.monthlyTotals.map((total, i) => <td key={i} className="p-2 text-right">{total > 0 ? total.toFixed(2) : '-'}</td>)}
                                <td className="p-2 text-right font-semibold">{data.total.toFixed(2)}</td>
                            </tr>
                        ))}
                        {/* Expenses */}
                        <tr className="bg-danger/10 font-bold">
                             <td className="p-2 sticky left-0 bg-slate-800 cursor-pointer flex items-center gap-2" onClick={() => toggleRow('expense')}>
                                {expandedRows.expense ? <IconArrowDown className="w-4 h-4"/> : <IconArrowUp className="w-4 h-4"/>} GASTOS
                            </td>
                            {annualDataGrid.totals.expense.monthlyTotals.map((total, i) => <td key={i} className="p-2 text-right">{total.toFixed(2)}</td>)}
                            <td className="p-2 text-right">{annualDataGrid.totals.expense.total.toFixed(2)}</td>
                        </tr>
                         {expandedRows.expense && Object.entries(annualDataGrid.grid).filter(([cat]) => annualDataGrid.expenseSet.has(cat) && annualDataGrid.grid[cat].total > 0).sort().map(([category, data]) => (
                            <tr key={category} className="hover:bg-slate-700/50">
                                <td className="p-2 pl-8 sticky left-0 bg-slate-800">{category}</td>
                                {data.monthlyTotals.map((total, i) => <td key={i} className="p-2 text-right">{total > 0 ? total.toFixed(2) : '-'}</td>)}
                                <td className="p-2 text-right font-semibold">{data.total.toFixed(2)}</td>
                            </tr>
                        ))}
                         {/* Savings */}
                         {annualDataGrid.totals.saving.total > 0 && (
                            <tr className="bg-info/10 font-bold">
                                <td className="p-2 sticky left-0 bg-slate-800">AHORRO</td>
                                {annualDataGrid.totals.saving.monthlyTotals.map((total, i) => <td key={i} className="p-2 text-right">{total.toFixed(2)}</td>)}
                                <td className="p-2 text-right">{annualDataGrid.totals.saving.total.toFixed(2)}</td>
                            </tr>
                         )}
                         {/* Balance */}
                         <tr className="bg-slate-700 font-bold text-lg">
                            <td className="p-2 sticky left-0 bg-slate-700">BALANCE</td>
                            {annualDataGrid.totals.balance.monthlyTotals.map((total, i) => <td key={i} className={`p-2 text-right ${total >= 0 ? 'text-secondary' : 'text-danger'}`}>{total.toFixed(2)}</td>)}
                            <td className={`p-2 text-right ${annualDataGrid.totals.balance.total >= 0 ? 'text-secondary' : 'text-danger'}`}>{annualDataGrid.totals.balance.total.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </Card>
    );

    return (
        <div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                capture="environment"
            />
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Contabilidad</h1>
                <div className="flex gap-2">
                     <Button onClick={handleScanClick} variant="secondary" disabled={isScanning}>
                        <IconCamera className="w-5 h-5 mr-2" />
                        {isScanning ? 'Escaneando...' : 'Escanear Gasto'}
                    </Button>
                    <Button onClick={() => { setInitialModalData(null); setIsModalOpen(true); }}><IconPlus className="w-5 h-5 mr-2" /> Añadir Movimiento</Button>
                </div>
            </div>

            <div className="border-b border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setView('list')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${view === 'list' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>Lista</button>
                    <button onClick={() => setView('annual')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${view === 'annual' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>Resumen Anual</button>
                </nav>
            </div>
            
            {view === 'list' ? renderListView() : renderAnnualView()}
            
            <AddTransactionModal isOpen={isModalOpen} onClose={handleCloseModal} initialData={initialModalData} />
            <ConfirmationModal
                isOpen={!!transactionToDelete}
                onClose={() => setTransactionToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
            >
                <p>¿Estás seguro de que quieres eliminar esta transacción?</p>
                <p className="mt-2 text-sm text-slate-400">Esta acción no se puede deshacer.</p>
            </ConfirmationModal>
        </div>
    );
};

export default AccountingPage;
