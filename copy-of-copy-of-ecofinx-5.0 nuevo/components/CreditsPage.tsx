

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Credit, ToxicityReport, CreditSubcategory } from '../types.ts';
import { analyzeCreditToxicity } from '../services/geminiService.ts';
import { Card, Modal, Input, Button, ProgressBar, ConfirmationModal } from './common/UIComponents.tsx';
import { IconPlus, IconArrowUp, IconArrowDown, CREDIT_SUBCATEGORIES, IconPencil, IconTrash, IconSparkles } from '../constants.tsx';

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


const InteractiveToxicityReport: React.FC<{ 
    report: ToxicityReport;
    onReanalyze: () => void;
    onDelete: () => void;
}> = ({ report, onReanalyze, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const getColor = (score: number) => {
        if (score <= 3) return 'bg-secondary';
        if (score <= 7) return 'bg-accent';
        return 'bg-danger';
    };

    return (
        <div>
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-slate-300">Nivel de Toxicidad: {report.score}/10</h4>
                <div className="flex gap-1">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-700 transition-colors" title={isExpanded ? "Ocultar consejo" : "Ver consejo"}>
                        {isExpanded ? <IconArrowUp className="w-5 h-5"/> : <IconArrowDown className="w-5 h-5"/>}
                    </button>
                    <button onClick={onReanalyze} className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-700 transition-colors" title="Re-analizar">
                        <IconSparkles className="w-5 h-5"/>
                    </button>
                    <button onClick={onDelete} className="text-slate-400 hover:text-danger p-1.5 rounded-full hover:bg-slate-700 transition-colors" title="Eliminar análisis">
                        <IconTrash className="w-5 h-5"/>
                    </button>
                </div>
            </div>

            <ProgressBar value={report.score * 10} colorClass={getColor(report.score)} />
            
            {isExpanded && (
                <div className="mt-2 text-sm text-slate-300 bg-slate-900/50 p-3 rounded-md transition-all ease-in-out duration-300">
                    <p className="font-semibold mb-1">Consejo de la IA:</p>
                    <p>{report.explanation}</p>
                </div>
            )}
        </div>
    );
};

const CreditRatio: React.FC<{ credit: Credit }> = ({ credit }) => {
    const { updateCreditToxicity } = useApp();
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalyze = async () => {
        if (isAnalyzing) return;
        setIsAnalyzing(true);
        const termInMonths = (new Date(credit.endDate).getFullYear() - new Date(credit.startDate).getFullYear()) * 12 +
                             (new Date(credit.endDate).getMonth() - new Date(credit.startDate).getMonth());
        
        const report = await analyzeCreditToxicity(credit.totalAmount, credit.monthlyPayment, credit.tin, credit.tae, termInMonths);
        updateCreditToxicity(credit.id, report);
        setIsAnalyzing(false);
    };

    if (isAnalyzing) {
        return <span className="text-xs text-slate-400">Analizando...</span>;
    }

    if (!credit.toxicityReport || credit.toxicityReport.score === 0) {
        return (
            <button onClick={handleAnalyze} className="p-1 px-2 text-xs bg-slate-600 hover:bg-slate-500 rounded text-slate-200 whitespace-nowrap flex items-center gap-1 transition-colors">
                <IconSparkles className="w-4 h-4 text-primary" />
                <span>Analizar</span>
            </button>
        );
    }
    
    const score = credit.toxicityReport.score;
    const ratio = Math.ceil(score / 2);

    const getRatioStyles = (r: number): {bgColor: string, textColor: string, label: string} => {
        switch (r) {
            case 1: return { bgColor: 'bg-secondary', textColor: 'text-black', label: 'Sano' };
            case 2: return { bgColor: 'bg-green-400', textColor: 'text-black', label: 'Bajo' };
            case 3: return { bgColor: 'bg-accent', textColor: 'text-black', label: 'Moderado' };
            case 4: return { bgColor: 'bg-orange-500', textColor: 'text-white', label: 'Elevado' };
            case 5: return { bgColor: 'bg-danger', textColor: 'text-white', label: 'Tóxico' };
            default: return { bgColor: 'bg-slate-500', textColor: 'text-white', label: 'N/A' };
        }
    };
    
    const styles = getRatioStyles(ratio);

    return (
         <div className="flex flex-col items-center" title={`${credit.toxicityReport.explanation} (Puntuación: ${score}/10)`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${styles.bgColor} ${styles.textColor}`}>
                {ratio}
            </div>
             <span className="text-xs mt-1 text-slate-400">{styles.label}</span>
        </div>
    );
};

const CreditCard: React.FC<{ credit: Credit; onEdit: (credit: Credit) => void; onDelete: (credit: Credit) => void; }> = ({ credit, onEdit, onDelete }) => {
    const { updateCreditToxicity, deleteCreditToxicity } = useApp();
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalyze = async () => {
        if (isAnalyzing) return;
        setIsAnalyzing(true);
        const termInMonths = (new Date(credit.endDate).getFullYear() - new Date(credit.startDate).getFullYear()) * 12 +
                             (new Date(credit.endDate).getMonth() - new Date(credit.startDate).getMonth());
        
        const report = await analyzeCreditToxicity(credit.totalAmount, credit.monthlyPayment, credit.tin, credit.tae, termInMonths);
        updateCreditToxicity(credit.id, report);
        setIsAnalyzing(false);
    };
    
    const handleDeleteAnalysis = () => {
        deleteCreditToxicity(credit.id);
    };

    const remainingAmount = calculateRemainingAmount(credit);
    const progress = credit.totalAmount > 0 ? ((credit.totalAmount - remainingAmount) / credit.totalAmount) * 100 : 0;

    return (
        <Card className="flex flex-col justify-between">
            <div>
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 pr-2">
                        <h3 className="text-xl font-bold text-white">{credit.name}</h3>
                        <p className="text-slate-400 text-sm">{credit.subcategory} · TAE: {credit.tae}%</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                        <button onClick={() => onEdit(credit)} className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-700 transition-colors"><IconPencil className="w-5 h-5"/></button>
                        <button onClick={() => onDelete(credit)} className="text-slate-400 hover:text-danger p-1.5 rounded-full hover:bg-slate-700 transition-colors"><IconTrash className="w-5 h-5"/></button>
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-baseline">
                        <div>
                            <p className="text-sm text-slate-400">Cuota mensual</p>
                            <p className="text-2xl font-bold text-primary">€{credit.monthlyPayment.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-400">Restante</p>
                            <p className="text-lg font-semibold text-white">€{remainingAmount.toFixed(2)}</p>
                        </div>
                    </div>
                    <ProgressBar value={progress} colorClass="bg-primary" />
                    <p className="text-xs text-slate-500 text-right">de €{credit.totalAmount.toFixed(2)}</p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/50 min-h-[90px] flex flex-col justify-center">
                 {isAnalyzing ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-slate-400 animate-pulse">Analizando...</p>
                    </div>
                ) : credit.toxicityReport ? (
                    <InteractiveToxicityReport 
                        report={credit.toxicityReport}
                        onReanalyze={handleAnalyze}
                        onDelete={handleDeleteAnalysis}
                    />
                ) : (
                    <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full" variant="ghost">
                        <div className="flex items-center justify-center gap-2">
                           <IconSparkles className="w-5 h-5 text-primary"/> 
                           {'Analizar Toxicidad (IA)'}
                        </div>
                    </Button>
                )}
            </div>
        </Card>
    );
};

const AddCreditModal: React.FC<{ isOpen: boolean; onClose: () => void; creditToEdit: Credit | null; }> = ({ isOpen, onClose, creditToEdit }) => {
    const { addCredit, updateCredit, activeView, users, groupMembers } = useApp();
    
    const getInitialState = () => ({
        name: '', totalAmount: '', monthlyPayment: '', tin: '', tae: '', startDate: '', endDate: '',
        subcategory: CREDIT_SUBCATEGORIES[0] as CreditSubcategory,
        ownerId: '',
    });

    const [formData, setFormData] = useState(getInitialState());

    useEffect(() => {
        if (!isOpen) return;

        if (creditToEdit) {
            setFormData({
                name: creditToEdit.name,
                totalAmount: String(creditToEdit.totalAmount),
                monthlyPayment: String(creditToEdit.monthlyPayment),
                tin: String(creditToEdit.tin),
                tae: String(creditToEdit.tae),
                startDate: creditToEdit.startDate.split('T')[0],
                endDate: creditToEdit.endDate.split('T')[0],
                subcategory: creditToEdit.subcategory,
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
    }, [creditToEdit, isOpen, activeView, users, groupMembers]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const creditData = {
            name: formData.name,
            totalAmount: parseFloat(formData.totalAmount),
            monthlyPayment: parseFloat(formData.monthlyPayment),
            tin: parseFloat(formData.tin),
            tae: parseFloat(formData.tae),
            startDate: formData.startDate,
            endDate: formData.endDate,
            subcategory: formData.subcategory as CreditSubcategory,
        };

        if(creditToEdit){
            updateCredit({ ...creditData, id: creditToEdit.id });
        } else {
            addCredit(creditData, formData.ownerId || users[0].id);
        }
        
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={creditToEdit ? 'Editar Crédito' : 'Añadir Nuevo Crédito'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {!creditToEdit && users.length > 1 && (
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
                <Input label="Nombre del crédito" name="name" value={formData.name} onChange={handleChange} required />
                
                <div>
                    <label htmlFor="subcategory" className="block text-sm font-medium text-slate-400 mb-1">Subcategoría</label>
                    <select
                        id="subcategory"
                        name="subcategory"
                        value={formData.subcategory}
                        onChange={handleChange}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary"
                        required
                    >
                        {CREDIT_SUBCATEGORIES.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                </div>

                <Input label="Importe total (€)" name="totalAmount" type="number" value={formData.totalAmount} onChange={handleChange} required />
                <Input label="Cuota mensual (€)" name="monthlyPayment" type="number" value={formData.monthlyPayment} onChange={handleChange} required />
                <Input label="TIN (%)" name="tin" type="number" step="0.01" value={formData.tin} onChange={handleChange} required />
                <Input label="TAE (%)" name="tae" type="number" step="0.01" value={formData.tae} onChange={handleChange} required />
                <Input label="Fecha de inicio" name="startDate" type="date" value={formData.startDate} onChange={handleChange} required />
                <Input label="Fecha de finalización" name="endDate" type="date" value={formData.endDate} onChange={handleChange} required />
                <div className="flex justify-end pt-4">
                    <Button type="submit">{creditToEdit ? 'Guardar Cambios' : 'Añadir Crédito'}</Button>
                </div>
            </form>
        </Modal>
    );
};

type SortKey = keyof Credit | 'remainingAmount' | 'ratio';

const CreditsPage: React.FC = () => {
    const { credits, deleteCredit } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [creditToEdit, setCreditToEdit] = useState<Credit | null>(null);
    const [creditToDelete, setCreditToDelete] = useState<Credit | null>(null);
    const [view, setView] = useState<'cards' | 'loans' | 'list'>('cards');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'ratio', direction: 'descending' });

    const handleOpenAddModal = () => {
        setCreditToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (credit: Credit) => {
        setCreditToEdit(credit);
        setIsModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (creditToDelete) {
            deleteCredit(creditToDelete.id);
            setCreditToDelete(null);
        }
    };

    const sortedCredits = useMemo(() => {
        let sortableItems = [...credits];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let valA: any;
                let valB: any;

                switch (sortConfig.key) {
                    case 'ratio':
                        valA = a.toxicityReport?.score && a.toxicityReport.score > 0 ? a.toxicityReport.score : -1; // Give unsconred items a low score so they appear last when descending
                        valB = b.toxicityReport?.score && b.toxicityReport.score > 0 ? b.toxicityReport.score : -1;
                        break;
                    case 'remainingAmount':
                        valA = calculateRemainingAmount(a);
                        valB = calculateRemainingAmount(b);
                        break;
                    default:
                        const key = sortConfig.key as keyof Credit;
                        valA = a[key];
                        valB = b[key];
                        break;
                }

                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        // Reverse order for ratio descending by default to show toxic ones first
        if (sortConfig?.key === 'ratio' && sortConfig?.direction === 'descending') {
            return sortableItems.reverse();
        }
        return sortableItems;
    }, [credits, sortConfig]);
    
    const cardViewCredits = useMemo(() => credits.filter(c => c.subcategory === 'Tarjeta'), [credits]);
    const loanViewCredits = useMemo(() => credits.filter(c => c.subcategory !== 'Tarjeta'), [credits]);


    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        if (sortConfig.direction === 'ascending') return <IconArrowUp className="w-4 h-4 ml-1 inline-block" />;
        return <IconArrowDown className="w-4 h-4 ml-1 inline-block" />;
    };

    const renderListView = () => (
        <Card>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="p-3 cursor-pointer w-24 text-center" onClick={() => requestSort('ratio')}>Ratio {getSortIcon('ratio')}</th>
                            <th className="p-3 cursor-pointer" onClick={() => requestSort('name')}>Nombre {getSortIcon('name')}</th>
                            <th className="p-3 cursor-pointer" onClick={() => requestSort('subcategory')}>Subcategoría {getSortIcon('subcategory')}</th>
                            <th className="p-3 cursor-pointer text-right" onClick={() => requestSort('monthlyPayment')}>Cuota Mensual {getSortIcon('monthlyPayment')}</th>
                            <th className="p-3 cursor-pointer text-right" onClick={() => requestSort('tin')}>TIN {getSortIcon('tin')}</th>
                            <th className="p-3 cursor-pointer text-right" onClick={() => requestSort('tae')}>TAE {getSortIcon('tae')}</th>
                            <th className="p-3 cursor-pointer text-right" onClick={() => requestSort('totalAmount')}>Total {getSortIcon('totalAmount')}</th>
                            <th className="p-3 cursor-pointer text-right" onClick={() => requestSort('remainingAmount')}>Restante {getSortIcon('remainingAmount')}</th>
                            <th className="p-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedCredits.map(credit => (
                            <tr key={credit.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                                <td className="p-3">
                                    <div className="flex justify-center">
                                       <CreditRatio credit={credit} />
                                    </div>
                                </td>
                                <td className="p-3 font-semibold">{credit.name}</td>
                                <td className="p-3">{credit.subcategory}</td>
                                <td className="p-3 text-right">€{credit.monthlyPayment.toFixed(2)}</td>
                                <td className="p-3 text-right">{credit.tin.toFixed(2)}%</td>
                                <td className="p-3 text-right">{credit.tae.toFixed(2)}%</td>
                                <td className="p-3 text-right">€{credit.totalAmount.toFixed(2)}</td>
                                <td className="p-3 text-right font-bold">€{calculateRemainingAmount(credit).toFixed(2)}</td>
                                <td className="p-3 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => handleOpenEditModal(credit)} className="text-slate-400 hover:text-white"><IconPencil className="w-5 h-5"/></button>
                                        <button onClick={() => setCreditToDelete(credit)} className="text-slate-400 hover:text-danger"><IconTrash className="w-5 h-5"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Gestión de Créditos</h1>
                <Button onClick={handleOpenAddModal}><IconPlus className="w-5 h-5 mr-2" /> Añadir Crédito</Button>
            </div>
             <div className="border-b border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setView('cards')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${view === 'cards' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>Tarjetas</button>
                    <button onClick={() => setView('loans')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${view === 'loans' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>Préstamos</button>
                    <button onClick={() => setView('list')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${view === 'list' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>Lista</button>
                </nav>
            </div>
            {credits.length > 0 ? (
                <>
                    {view === 'list' && renderListView()}
                    {view === 'cards' && (
                        cardViewCredits.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {cardViewCredits.map(credit => <CreditCard key={credit.id} credit={credit} onEdit={handleOpenEditModal} onDelete={setCreditToDelete} />)}
                            </div>
                        ) : (
                            <Card className="text-center py-12">
                                <p className="text-slate-400">No tienes tarjetas de crédito registradas.</p>
                                <Button onClick={handleOpenAddModal} className="mt-4">Añadir Tarjeta</Button>
                            </Card>
                        )
                    )}
                    {view === 'loans' && (
                        loanViewCredits.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {loanViewCredits.map(credit => <CreditCard key={credit.id} credit={credit} onEdit={handleOpenEditModal} onDelete={setCreditToDelete} />)}
                            </div>
                        ) : (
                            <Card className="text-center py-12">
                                <p className="text-slate-400">No tienes préstamos registrados.</p>
                                <Button onClick={handleOpenAddModal} className="mt-4">Añadir Préstamo</Button>
                            </Card>
                        )
                    )}
                </>
            ) : (
                <Card className="text-center py-12">
                    <p className="text-slate-400">No tienes créditos registrados.</p>
                    <Button onClick={handleOpenAddModal} className="mt-4">Añadir tu primer crédito</Button>
                </Card>
            )}
            <AddCreditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} creditToEdit={creditToEdit} />
            <ConfirmationModal
                isOpen={!!creditToDelete}
                onClose={() => setCreditToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
            >
                <p>¿Estás seguro de que quieres eliminar el crédito <span className="font-bold">{creditToDelete?.name}</span>?</p>
                <p className="mt-2 text-sm text-slate-400">Esta acción también eliminará la transacción de gasto mensual asociada. Esta acción no se puede deshacer.</p>
            </ConfirmationModal>
        </div>
    );
};

export default CreditsPage;