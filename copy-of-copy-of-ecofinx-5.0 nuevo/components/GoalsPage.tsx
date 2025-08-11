
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Goal } from '../types.ts';
import { Card, Modal, Input, Button, ProgressBar, ConfirmationModal } from './common/UIComponents.tsx';
import { IconPlus, IconPencil, IconTrash } from '../constants.tsx';

const GoalCard: React.FC<{ goal: Goal; onEdit: (goal: Goal) => void; onDelete: (goal: Goal) => void; }> = ({ goal, onEdit, onDelete }) => {
    const { addFundsToGoal } = useApp();
    const [amountToAdd, setAmountToAdd] = useState('');
    
    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;

    const handleAddFunds = () => {
        const amount = parseFloat(amountToAdd);
        if(!isNaN(amount) && amount > 0) {
            addFundsToGoal(goal.id, amount);
            setAmountToAdd('');
        }
    };

    return (
        <Card className="relative">
            <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => onEdit(goal)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition-colors"><IconPencil className="w-5 h-5"/></button>
                <button onClick={() => onDelete(goal)} className="text-slate-400 hover:text-danger p-1 rounded-full hover:bg-slate-700 transition-colors"><IconTrash className="w-5 h-5"/></button>
            </div>
            <h3 className="text-xl font-bold text-white pr-10">{goal.name}</h3>
            <p className="text-slate-400">Objetivo: {new Date(goal.deadline).toLocaleDateString()}</p>
            
            <div className="my-4">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-2xl font-bold text-secondary">€{goal.currentAmount.toFixed(2)}</span>
                    <span className="text-slate-400">de €{goal.targetAmount.toFixed(2)}</span>
                </div>
                <ProgressBar value={progress} colorClass="bg-secondary" />
            </div>

            <div className="flex space-x-2">
                <Input
                    label=""
                    type="number"
                    placeholder="Añadir fondos"
                    value={amountToAdd}
                    onChange={(e) => setAmountToAdd(e.target.value)}
                    className="flex-grow !mb-0"
                />
                <Button onClick={handleAddFunds} variant="secondary" className="self-end">Añadir</Button>
            </div>
        </Card>
    );
};

const AddGoalModal: React.FC<{ isOpen: boolean, onClose: () => void, goalToEdit: Goal | null }> = ({ isOpen, onClose, goalToEdit }) => {
    const { addGoal, updateGoal, activeView, users, groupMembers } = useApp();
    
    const getInitialState = () => ({ name: '', targetAmount: '', currentAmount: '0', deadline: '', ownerId: '' });
    const [formData, setFormData] = useState(getInitialState());

    useEffect(() => {
        if(!isOpen) return;

        if (goalToEdit) {
            setFormData({
                name: goalToEdit.name,
                targetAmount: String(goalToEdit.targetAmount),
                currentAmount: String(goalToEdit.currentAmount),
                deadline: goalToEdit.deadline.split('T')[0],
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
    }, [isOpen, goalToEdit, activeView, users, groupMembers]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const goalData = {
            name: formData.name,
            targetAmount: parseFloat(formData.targetAmount),
            currentAmount: parseFloat(formData.currentAmount),
            deadline: formData.deadline
        };
        
        if (goalToEdit) {
            updateGoal({ ...goalData, id: goalToEdit.id });
        } else {
            addGoal(goalData, formData.ownerId || users[0].id);
        }

        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={goalToEdit ? "Editar Meta Financiera" : "Crear Nueva Meta Financiera"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {!goalToEdit && users.length > 1 && (
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
                <Input label="Nombre de la meta" name="name" value={formData.name} onChange={handleChange} required />
                <Input label="Objetivo (€)" name="targetAmount" type="number" value={formData.targetAmount} onChange={handleChange} required />
                <Input label="Cantidad actual (€)" name="currentAmount" type="number" value={formData.currentAmount} onChange={handleChange} required />
                <Input label="Fecha límite" name="deadline" type="date" value={formData.deadline} onChange={handleChange} required />
                <div className="flex justify-end pt-4">
                    <Button type="submit">{goalToEdit ? "Guardar Cambios" : "Crear Meta"}</Button>
                </div>
            </form>
        </Modal>
    );
};

const GoalsPage: React.FC = () => {
    const { goals, deleteGoal } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);
    const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

    const handleOpenAddModal = () => {
        setGoalToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (goal: Goal) => {
        setGoalToEdit(goal);
        setIsModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (goalToDelete) {
            deleteGoal(goalToDelete.id);
            setGoalToDelete(null);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Metas Financieras</h1>
                <Button onClick={handleOpenAddModal}><IconPlus className="w-5 h-5 mr-2" /> Nueva Meta</Button>
            </div>
            {goals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.map(goal => <GoalCard key={goal.id} goal={goal} onEdit={handleOpenEditModal} onDelete={setGoalToDelete} />)}
                </div>
            ) : (
                <Card className="text-center py-12">
                    <p className="text-slate-400">Aún no has definido ninguna meta.</p>
                    <Button onClick={handleOpenAddModal} className="mt-4">Crea tu primera meta</Button>
                </Card>
            )}
            <AddGoalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} goalToEdit={goalToEdit} />
            <ConfirmationModal
                isOpen={!!goalToDelete}
                onClose={() => setGoalToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
            >
                <p>¿Estás seguro de que quieres eliminar la meta <span className="font-bold">{goalToDelete?.name}</span>?</p>
                <p className="mt-2 text-sm text-slate-400">Esta acción no se puede deshacer.</p>
            </ConfirmationModal>
        </div>
    );
};

export default GoalsPage;