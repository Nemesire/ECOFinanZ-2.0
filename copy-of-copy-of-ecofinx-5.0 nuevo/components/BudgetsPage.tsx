
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Budget, TransactionType } from '../types.ts';
import { Card, Modal, Input, Button, ProgressBar, ConfirmationModal } from './common/UIComponents.tsx';
import { IconPlus, IconPencil, IconTrash, IconPiggyBank } from '../constants.tsx';

const BudgetCard: React.FC<{ budget: Budget; onEdit: (budget: Budget) => void; onDelete: (budget: Budget) => void; }> = ({ budget, onEdit, onDelete }) => {
    const { transactions } = useApp();
    
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const spentAmount = transactions
        .filter(t => 
            t.type === TransactionType.EXPENSE &&
            t.category === budget.category &&
            t.date >= firstDayOfMonth &&
            t.date <= lastDayOfMonth
        )
        .reduce((sum, t) => sum + t.amount, 0);

    const progress = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;
    const remainingAmount = budget.amount - spentAmount;
    
    const getProgressBarColor = () => {
        if (progress > 100) return 'bg-danger';
        if (progress > 85) return 'bg-accent';
        return 'bg-secondary';
    };

    return (
        <Card className="relative">
             <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => onEdit(budget)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition-colors"><IconPencil className="w-5 h-5"/></button>
                <button onClick={() => onDelete(budget)} className="text-slate-400 hover:text-danger p-1 rounded-full hover:bg-slate-700 transition-colors"><IconTrash className="w-5 h-5"/></button>
            </div>
            <h3 className="text-xl font-bold text-white pr-10">{budget.category}</h3>
            <p className="text-sm text-slate-400">Presupuesto Mensual</p>
            
            <div className="my-4">
                <ProgressBar value={Math.min(progress, 100)} colorClass={getProgressBarColor()} />
                <div className="flex justify-between items-end mt-2">
                    <div>
                        <p className="text-sm text-slate-400">Gastado</p>
                        <p className="text-2xl font-bold text-white">€{spentAmount.toFixed(2)}</p>
                    </div>
                     <div className="text-right">
                        <p className="text-sm text-slate-400">{remainingAmount >= 0 ? 'Restante' : 'Excedido'}</p>
                        <p className={`text-lg font-semibold ${remainingAmount >= 0 ? 'text-secondary' : 'text-danger'}`}>
                            €{Math.abs(remainingAmount).toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>
             <p className="text-xs text-slate-500 text-center">Límite del presupuesto: €{budget.amount.toFixed(2)}</p>
        </Card>
    );
};

const AddBudgetModal: React.FC<{ isOpen: boolean, onClose: () => void, budgetToEdit: Budget | null }> = ({ isOpen, onClose, budgetToEdit }) => {
    const { addBudget, updateBudget, expenseCategories, activeView, users, groupMembers } = useApp();
    
    const getInitialState = () => ({ category: '', amount: '', ownerId: '' });
    const [formData, setFormData] = useState(getInitialState());

    useEffect(() => {
        if(!isOpen) return;

        if (budgetToEdit) {
            setFormData({
                category: budgetToEdit.category,
                amount: String(budgetToEdit.amount),
                ownerId: '', // Editing doesn't change owner
            });
        } else {
            const initialState = getInitialState();
            if (activeView.type === 'user') {
                initialState.ownerId = activeView.id;
            } else if (activeView.type === 'group' && groupMembers.length > 0) {
                initialState.ownerId = groupMembers[0].id;
            } else if (users.length > 0) {
                initialState.ownerId = users[0].id;
            }
            setFormData(initialState);
        }
    }, [isOpen, budgetToEdit, activeView, users, groupMembers]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const budgetData = {
            category: formData.category,
            amount: parseFloat(formData.amount),
            period: 'monthly' as const,
        };
        
        if (budgetToEdit) {
            updateBudget({ ...budgetData, id: budgetToEdit.id });
        } else {
            addBudget(budgetData, formData.ownerId || users[0].id);
        }

        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={budgetToEdit ? "Editar Presupuesto" : "Crear Nuevo Presupuesto"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {!budgetToEdit && users.length > 1 && (
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
                    <label htmlFor="category" className="block text-sm font-medium text-slate-400 mb-1">Categoría de Gasto</label>
                    <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary"
                        required
                        disabled={!!budgetToEdit}
                    >
                        <option value="">-- Selecciona una categoría --</option>
                        {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    {budgetToEdit && <p className="text-xs text-slate-500 mt-1">La categoría no se puede cambiar al editar. Para cambiarla, elimina este presupuesto y crea uno nuevo.</p>}
                </div>

                <Input label="Límite mensual (€)" name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} required />
                
                <div className="flex justify-end pt-4">
                    <Button type="submit">{budgetToEdit ? "Guardar Cambios" : "Crear Presupuesto"}</Button>
                </div>
            </form>
        </Modal>
    );
};

const BudgetsPage: React.FC = () => {
    const { budgets, deleteBudget } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
    const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);

    const handleOpenAddModal = () => {
        setBudgetToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (budget: Budget) => {
        setBudgetToEdit(budget);
        setIsModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (budgetToDelete) {
            deleteBudget(budgetToDelete.id);
            setBudgetToDelete(null);
        }
    };

    const sortedBudgets = [...budgets].sort((a,b) => a.category.localeCompare(b.category));

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Presupuestos Mensuales</h1>
                <Button onClick={handleOpenAddModal}><IconPlus className="w-5 h-5 mr-2" /> Nuevo Presupuesto</Button>
            </div>
            {sortedBudgets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedBudgets.map(budget => <BudgetCard key={budget.id} budget={budget} onEdit={handleOpenEditModal} onDelete={setBudgetToDelete} />)}
                </div>
            ) : (
                <Card className="text-center py-12">
                     <IconPiggyBank className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                    <h2 className="text-xl font-bold text-white">Toma el control de tus gastos</h2>
                    <p className="text-slate-400 mt-2 max-w-md mx-auto">Crea presupuestos para tus categorías de gastos y la aplicación te ayudará a mantenerte dentro de tus límites.</p>
                    <Button onClick={handleOpenAddModal} className="mt-6">Crea tu primer presupuesto</Button>
                </Card>
            )}
            <AddBudgetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} budgetToEdit={budgetToEdit} />
            <ConfirmationModal
                isOpen={!!budgetToDelete}
                onClose={() => setBudgetToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
            >
                <p>¿Estás seguro de que quieres eliminar el presupuesto para la categoría <span className="font-bold">{budgetToDelete?.category}</span>?</p>
                <p className="mt-2 text-sm text-slate-400">Esta acción no se puede deshacer.</p>
            </ConfirmationModal>
        </div>
    );
};

export default BudgetsPage;
