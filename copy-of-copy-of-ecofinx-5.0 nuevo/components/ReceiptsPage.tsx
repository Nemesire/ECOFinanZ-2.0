
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Receipt, ReceiptType, ReceiptFrequency, ScannedReceiptData } from '../types.ts';
import { Card, Modal, Input, Button, ConfirmationModal } from './common/UIComponents.tsx';
import { IconPlus, IconBell, IconPencil, IconTrash, IconEye, IconArrowUp, IconArrowDown, IconCamera } from '../constants.tsx';
import { analyzeReceiptImage } from '../services/geminiService.ts';

const isWithinDays = (dateString: string, days: number) => {
    if (!dateString) return false;
    const dueDate = new Date(dateString);
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    // Ensure we don't flag past-due dates by making sure due date is in the future
    return dueDate >= today && dueDate <= futureDate;
};

const frequencyMap: Record<ReceiptFrequency, string> = {
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    semiannually: 'Semestral',
    annually: 'Anual',
};


const ReceiptCard: React.FC<{ receipt: Receipt; onEdit: (receipt: Receipt) => void; onDelete: (receipt: Receipt) => void; onViewImage: (imageData: string) => void; }> = ({ receipt, onEdit, onDelete, onViewImage }) => {
    const isRecurring = receipt.type === ReceiptType.RECEIPT;
    const isDueSoon = isRecurring && receipt.date && isWithinDays(receipt.date, 30);

    let cardBorder = 'border-l-4';
    if (isDueSoon) {
        cardBorder += ' border-accent'; // Using accent for warning
    } else if (isRecurring) {
        cardBorder += ' border-primary';
    } else {
        cardBorder += ' border-secondary';
    }

    return (
        <Card className={`${cardBorder} transition-all duration-300 relative`}>
             <div className="absolute top-4 right-4 flex items-center gap-2">
                 {isRecurring && receipt.cancellationReminder && (
                    <div className="flex-shrink-0" title="Recordatorio de cancelación activado">
                        <IconBell className="w-6 h-6 text-accent" />
                    </div>
                 )}
                <button onClick={() => onEdit(receipt)} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition-colors"><IconPencil className="w-5 h-5"/></button>
                <button onClick={() => onDelete(receipt)} className="text-slate-400 hover:text-danger p-1 rounded-full hover:bg-slate-700 transition-colors"><IconTrash className="w-5 h-5"/></button>
            </div>
            <h3 className="font-bold text-lg text-white pr-28">{receipt.title}</h3>
            <p className="text-2xl font-bold my-2 text-white">{`€${receipt.amount.toFixed(2)}`}</p>
            {isRecurring && receipt.frequency === 'annually' && receipt.prorateOverMonths && receipt.prorateOverMonths > 1 && (
                 <p className="text-sm text-slate-400 mb-2">
                    Fraccionado: <span className="font-semibold text-slate-300">€{(receipt.amount / receipt.prorateOverMonths).toFixed(2)}</span> / mes
                </p>
            )}
            <p className="text-sm text-slate-400 min-h-[40px]">{receipt.description}</p>
            <div className="text-sm text-slate-400 mt-4 space-y-1">
                <p>
                    <span className="font-semibold text-slate-300">{isRecurring ? 'Próximo cobro: ' : 'Fecha: '}</span>
                    {new Date(receipt.date).toLocaleDateString()}
                </p>
                {isRecurring && receipt.frequency && (
                     <p><span className="font-semibold text-slate-300">Frecuencia: </span>{frequencyMap[receipt.frequency]}</p>
                )}
                {isRecurring && (
                    <p><span className="font-semibold text-slate-300">Renovación automática: </span>{receipt.autoRenews ? 'Sí' : 'No'}</p>
                )}
                 {isRecurring && receipt.cancellationReminder && isDueSoon && (
                    <p className="p-2 bg-accent/10 rounded-md text-accent animate-pulse"><span className="font-semibold">¡Vencimiento próximo!</span></p>
                )}
            </div>
             {receipt.contractFile && (
                <button 
                    onClick={() => receipt.contractFileData && onViewImage(receipt.contractFileData)} 
                    className="flex items-center gap-2 text-sm text-blue-400 mt-4 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!receipt.contractFileData}
                    aria-label={`Ver archivo ${receipt.contractFile}`}
                >
                    <IconEye className="w-5 h-5 flex-shrink-0"/>
                    <span className="truncate">{receipt.contractFile}</span>
                </button>
            )}
        </Card>
    );
};

const AddReceiptModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    initialData: Receipt | ScannedReceiptData | null; 
    activeTab: ReceiptType | 'list';
}> = ({ isOpen, onClose, initialData, activeTab }) => {
    const { addReceipt, updateReceipt, activeView, users, groupMembers, invoiceCategories, addInvoiceCategory } = useApp();
    
    const getInitialFormState = (type: ReceiptType) => ({
        type: type,
        title: '',
        amount: '',
        description: '',
        date: '',
        contractFile: '',
        contractFileData: '',
        frequency: 'annually' as ReceiptFrequency,
        autoRenews: false,
        prorateOverMonths: '',
        cancellationReminder: false,
        cancellationNoticeMonths: '1',
        invoiceCategory: '',
        newInvoiceCategory: '',
        isTaxDeductible: false,
        ownerId: '',
    });
    
    const [formData, setFormData] = useState(getInitialFormState(ReceiptType.RECEIPT));
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    useEffect(() => {
        if(!isOpen) {
            setIsPreviewModalOpen(false);
            return;
        }
        
        let ownerId = '';
        if (activeView.type === 'user') {
            ownerId = activeView.id;
        } else if (activeView.type === 'group' && groupMembers.length > 0) {
            ownerId = groupMembers[0].id;
        } else if (users.length > 0) {
            ownerId = users[0].id;
        }

        if (initialData) {
            // Check if it's a full Receipt for editing
            if ('id' in initialData && 'type' in initialData) {
                const receiptToEdit = initialData as Receipt;
                setFormData({
                    type: receiptToEdit.type,
                    title: receiptToEdit.title,
                    amount: String(receiptToEdit.amount),
                    description: receiptToEdit.description,
                    date: receiptToEdit.date.split('T')[0],
                    contractFile: receiptToEdit.contractFile ?? '',
                    contractFileData: receiptToEdit.contractFileData ?? '',
                    frequency: receiptToEdit.frequency ?? 'annually',
                    autoRenews: receiptToEdit.autoRenews ?? false,
                    prorateOverMonths: String(receiptToEdit.prorateOverMonths ?? ''),
                    cancellationReminder: receiptToEdit.cancellationReminder ?? false,
                    cancellationNoticeMonths: String(receiptToEdit.cancellationNoticeMonths ?? '1'),
                    invoiceCategory: receiptToEdit.invoiceCategory ?? '',
                    newInvoiceCategory: '',
                    isTaxDeductible: receiptToEdit.isTaxDeductible ?? false,
                    ownerId: '', // Owner doesn't change on edit
                });
            } else { // It must be ScannedReceiptData for a new entry
                const scanned = initialData as ScannedReceiptData;
                const newFormState = getInitialFormState(ReceiptType.INVOICE); // Default to INVOICE for scanned items
                
                newFormState.ownerId = ownerId;
                newFormState.amount = scanned.amount ? String(scanned.amount) : '';
                newFormState.date = scanned.date && /^\d{4}-\d{2}-\d{2}$/.test(scanned.date) 
                    ? scanned.date 
                    : new Date().toISOString().split('T')[0];
                newFormState.description = scanned.description || ''; // Merchant name from AI goes here
                // Title is intentionally left blank per user request.

                if (scanned.category && invoiceCategories.includes(scanned.category)) {
                    newFormState.invoiceCategory = scanned.category;
                } else if (scanned.category) {
                    newFormState.invoiceCategory = 'add-new';
                    newFormState.newInvoiceCategory = scanned.category;
                }
                setFormData(newFormState);
            }
        } else {
            // New, empty form. Use the activeTab to decide the type.
            const typeForForm = activeTab === 'list' ? ReceiptType.RECEIPT : activeTab;
            const initialState = getInitialFormState(typeForForm);
            initialState.ownerId = ownerId;
            setFormData(initialState);
        }
    }, [isOpen, initialData, activeTab, activeView, users, groupMembers, invoiceCategories]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setFormData(prev => ({ 
                    ...prev, 
                    contractFile: file.name,
                    contractFileData: dataUrl,
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData({ ...formData, [name]: checked });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalInvoiceCategory = formData.invoiceCategory;
        if (formData.type === ReceiptType.INVOICE && formData.invoiceCategory === 'add-new' && formData.newInvoiceCategory.trim()) {
            finalInvoiceCategory = formData.newInvoiceCategory.trim();
            const ownerIdForCategory = formData.ownerId || users[0].id;
            addInvoiceCategory(finalInvoiceCategory, ownerIdForCategory);
        }

        const receiptData: Omit<Receipt, 'id'> = {
            title: formData.title,
            amount: parseFloat(formData.amount),
            description: formData.description,
            date: formData.date,
            type: formData.type,
            contractFile: formData.contractFile || undefined,
            contractFileData: formData.contractFileData || undefined,
            invoiceCategory: formData.type === ReceiptType.INVOICE ? finalInvoiceCategory : undefined,
            isTaxDeductible: formData.type === ReceiptType.INVOICE ? formData.isTaxDeductible : undefined,
            frequency: formData.type === ReceiptType.RECEIPT ? formData.frequency : undefined,
            autoRenews: formData.type === ReceiptType.RECEIPT ? formData.autoRenews : undefined,
            prorateOverMonths: formData.type === ReceiptType.RECEIPT && formData.frequency === 'annually' && formData.prorateOverMonths ? parseInt(formData.prorateOverMonths) : undefined,
            cancellationReminder: formData.type === ReceiptType.RECEIPT && formData.autoRenews ? formData.cancellationReminder : undefined,
            cancellationNoticeMonths: formData.type === ReceiptType.RECEIPT && formData.autoRenews && formData.cancellationReminder && formData.cancellationNoticeMonths ? parseInt(formData.cancellationNoticeMonths) : undefined,
        };

        if (initialData && 'id' in initialData && 'type' in initialData) {
            updateReceipt({ ...receiptData, id: initialData.id });
        } else {
            addReceipt(receiptData, formData.ownerId || users[0].id);
        }

        onClose();
    };

    const isEditing = initialData && 'id' in initialData && 'type' in initialData;
    const title = isEditing
        ? `Editar ${formData.type === ReceiptType.RECEIPT ? 'Recibo' : 'Factura'}`
        : `Añadir Nuevo ${formData.type === ReceiptType.RECEIPT ? 'Recibo' : 'Factura'}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 {!isEditing && users.length > 1 && (
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
                 <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Entrada</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary" disabled={isEditing}>
                        <option value={ReceiptType.RECEIPT}>Recibo (Gasto recurrente)</option>
                        <option value={ReceiptType.INVOICE}>Factura (Gasto puntual para Hacienda)</option>
                    </select>
                </div>

                <Input label="Título" name="title" value={formData.title} onChange={handleChange} required />
                <Input label="Empresa / Comercio" name="description" value={formData.description} onChange={handleChange} />
                <Input label="Importe (€)" name="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} required />
                <Input label={formData.type === ReceiptType.RECEIPT ? "Próxima fecha de cobro" : "Fecha de la factura"} name="date" type="date" value={formData.date} onChange={handleChange} required />
                
                {formData.type === ReceiptType.INVOICE && (
                    <>
                        <div>
                            <label htmlFor="invoiceCategory" className="block text-sm font-medium text-slate-400 mb-1">Categoría de Factura</label>
                            <select id="invoiceCategory" name="invoiceCategory" value={formData.invoiceCategory} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary">
                                <option value="">-- Sin categoría --</option>
                                {invoiceCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                <option value="add-new">Añadir nueva categoría...</option>
                            </select>
                        </div>
                        {formData.invoiceCategory === 'add-new' && (
                            <Input label="Nombre de la nueva categoría" name="newInvoiceCategory" value={formData.newInvoiceCategory} onChange={handleChange} required />
                        )}
                        <div className="border-t border-slate-700 mt-4 pt-4">
                            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-slate-700/50">
                                <input
                                    type="checkbox"
                                    name="isTaxDeductible"
                                    checked={formData.isTaxDeductible}
                                    onChange={handleChange}
                                    className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-primary focus:ring-primary"
                                />
                                <span className="text-slate-300">Marcar como gasto deducible para la declaración de la renta</span>
                            </label>
                        </div>
                    </>
                )}

                {formData.type === ReceiptType.RECEIPT && (
                    <>
                        <div className="border-t border-slate-700 pt-4">
                          <h4 className="text-md font-semibold text-slate-200 mb-2">Detalles del Recibo</h4>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-300 mb-1">Frecuencia</label>
                            <select name="frequency" value={formData.frequency} onChange={handleChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary">
                                <option value="monthly">Mensual</option>
                                <option value="quarterly">Trimestral</option>
                                <option value="semiannually">Semestral</option>
                                <option value="annually">Anual</option>
                            </select>
                        </div>
                        {formData.frequency === 'annually' && (
                             <Input label="Fraccionar gasto en (meses)" name="prorateOverMonths" type="number" placeholder="Ej: 12" value={formData.prorateOverMonths} onChange={handleChange} />
                        )}
                        <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-slate-700">
                            <input
                                type="checkbox"
                                name="autoRenews"
                                checked={formData.autoRenews}
                                onChange={handleChange}
                                className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-primary focus:ring-primary"
                            />
                            <span className="text-slate-300">Se renueva automáticamente</span>
                        </label>
                        {formData.autoRenews && (
                             <div className="pl-6 mt-2 space-y-3 pt-3 border-l-2 border-slate-700">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="cancellationReminder"
                                        checked={formData.cancellationReminder}
                                        onChange={handleChange}
                                        className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-primary focus:ring-primary"
                                    />
                                    <span className="text-slate-300">Quiero un recordatorio para cancelarlo</span>
                                </label>
                                {formData.cancellationReminder && (
                                    <Input label="Avisar con (meses) de antelación" name="cancellationNoticeMonths" type="number" min="1" value={formData.cancellationNoticeMonths} onChange={handleChange} />
                                )}
                            </div>
                        )}
                    </>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Adjuntar Contrato/Factura (Opcional)</label>
                    <input type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-black hover:file:bg-primary-hover" />
                     {formData.contractFile && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                            <span className="truncate">{formData.contractFile}</span>
                            {formData.contractFileData && (
                                <button type="button" onClick={() => setIsPreviewModalOpen(true)} className="text-blue-400 hover:text-blue-300" title="Previsualizar">
                                    <IconEye className="w-5 h-5"/>
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex justify-end pt-4 gap-4">
                    <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">{isEditing ? 'Guardar Cambios' : 'Añadir'}</Button>
                </div>
            </form>
            {formData.contractFileData &&
                <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="Previsualización">
                    {formData.contractFileData.startsWith("data:image") && 
                        <img src={formData.contractFileData} alt="Previsualización" className="max-w-full max-h-[80vh] mx-auto rounded-md" />
                    }
                    {formData.contractFileData.startsWith("data:application/pdf") &&
                        <iframe src={formData.contractFileData} title="Previsualización PDF" className="w-full h-[80vh]"/>
                    }
                </Modal>
            }
        </Modal>
    );
};

type ListSortKey = keyof Receipt;

const ReceiptsPage: React.FC = () => {
    const { receipts, deleteReceipt, invoiceCategories } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [initialModalData, setInitialModalData] = useState<Receipt | ScannedReceiptData | null>(null);
    const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);
    const [activeTab, setActiveTab] = useState<ReceiptType | 'list'>(ReceiptType.RECEIPT);
    const [imageToView, setImageToView] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: ListSortKey; direction: 'ascending' | 'descending' } | null>({ key: 'date', direction: 'descending' });
    const [categoryFilter, setCategoryFilter] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredAndSortedItems = useMemo(() => {
        let items = [...receipts];
        
        if (categoryFilter) {
            items = items.filter(item => 
                item.type === ReceiptType.RECEIPT || 
                (item.type === ReceiptType.INVOICE && item.invoiceCategory === categoryFilter)
            );
        }

        if (sortConfig !== null) {
            items.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [receipts, sortConfig, categoryFilter]);
        
    const tabs = [
        { type: ReceiptType.RECEIPT, label: "Recibos" },
        { type: ReceiptType.INVOICE, label: "Facturas" },
        { type: 'list', label: "Lista Completa" }
    ] as const;

    const openAddModal = () => {
        setInitialModalData(null);
        setIsModalOpen(true);
    };

    const openEditModal = (receipt: Receipt) => {
        setInitialModalData(receipt);
        setIsModalOpen(true);
    };
    
    const closeModal = () => {
        setInitialModalData(null);
        setIsModalOpen(false);
    };

    const handleConfirmDelete = () => {
        if(receiptToDelete){
            deleteReceipt(receiptToDelete.id);
            setReceiptToDelete(null);
        }
    }

    const handleScanClick = () => {
        fileInputRef.current?.click();
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

    const requestSort = (key: ListSortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: ListSortKey) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        if (sortConfig.direction === 'ascending') return <IconArrowUp className="w-4 h-4 ml-1 inline-block" />;
        return <IconArrowDown className="w-4 h-4 ml-1 inline-block" />;
    };
    
    const renderListView = () => (
        <Card>
            <div className="mb-4">
                <label htmlFor="category-filter" className="block text-sm font-medium text-slate-400 mb-1">Filtrar por categoría de factura</label>
                <select 
                    id="category-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full max-w-xs bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary"
                >
                    <option value="">Todas las categorías</option>
                    {invoiceCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="p-3 cursor-pointer" onClick={() => requestSort('invoiceCategory')}>Categoría {getSortIcon('invoiceCategory')}</th>
                            <th className="p-3 cursor-pointer" onClick={() => requestSort('title')}>Título {getSortIcon('title')}</th>
                            <th className="p-3 cursor-pointer" onClick={() => requestSort('description')}>Empresa {getSortIcon('description')}</th>
                            <th className="p-3 cursor-pointer" onClick={() => requestSort('type')}>Tipo {getSortIcon('type')}</th>
                            <th className="p-3 cursor-pointer text-right" onClick={() => requestSort('amount')}>Importe {getSortIcon('amount')}</th>
                            <th className="p-3 cursor-pointer text-right" onClick={() => requestSort('date')}>Fecha {getSortIcon('date')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedItems.map(item => (
                            <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                                <td className="p-3">{item.type === ReceiptType.INVOICE ? item.invoiceCategory || '-' : '-'}</td>
                                <td className="p-3 font-semibold">{item.title}</td>
                                <td className="p-3">{item.description}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.type === ReceiptType.INVOICE ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
                                        {item.type === ReceiptType.INVOICE ? 'Factura' : 'Recibo'}
                                    </span>
                                </td>
                                <td className="p-3 text-right font-bold">€{item.amount.toFixed(2)}</td>
                                <td className="p-3 text-right">{new Date(item.date).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    const renderCardView = (type: ReceiptType) => {
        const items = receipts.filter(r => r.type === type).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map(receipt => <ReceiptCard key={receipt.id} receipt={receipt} onEdit={openEditModal} onDelete={setReceiptToDelete} onViewImage={setImageToView}/>)}
            </div>
        ) : (
            <Card className="text-center py-12">
                <p className="text-slate-400">{type === ReceiptType.RECEIPT ? 'No tienes recibos recurrentes.' : 'No tienes facturas guardadas.'}</p>
                <Button className="mt-4" onClick={openAddModal}>Añadir tu primer {type === ReceiptType.RECEIPT ? 'recibo' : 'factura'}</Button>
            </Card>
        );
    }

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
                <h1 className="text-3xl font-bold text-white">Recibos y Facturas</h1>
                <div className="flex gap-2">
                    <Button onClick={handleScanClick} variant="secondary" disabled={isScanning}>
                        <IconCamera className="w-5 h-5 mr-2" />
                        {isScanning ? 'Escaneando...' : 'Escanear Factura'}
                    </Button>
                    <Button onClick={openAddModal}><IconPlus className="w-5 h-5 mr-2" /> Añadir</Button>
                </div>
            </div>
            <div className="border-b border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map(tab => (
                        <button key={tab.type} onClick={() => setActiveTab(tab.type)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.type ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            {activeTab === 'list' ? renderListView() : renderCardView(activeTab)}
            
            <AddReceiptModal isOpen={isModalOpen} onClose={closeModal} initialData={initialModalData} activeTab={activeTab} />
            <ConfirmationModal
                isOpen={!!receiptToDelete}
                onClose={() => setReceiptToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={`Confirmar Eliminación de ${receiptToDelete?.type === ReceiptType.RECEIPT ? 'Recibo' : 'Factura'}`}
            >
                <p>¿Estás seguro de que quieres eliminar <span className="font-bold">{receiptToDelete?.title}</span>?</p>
                 <p className="mt-2 text-sm text-slate-400">Esta acción no se puede deshacer.</p>
            </ConfirmationModal>

            <Modal isOpen={!!imageToView} onClose={() => setImageToView(null)} title="Visor de Documentos">
                {imageToView && imageToView.startsWith('data:image') && (
                    <img src={imageToView} alt="Vista previa del documento" className="max-w-full max-h-[80vh] mx-auto rounded-md" />
                )}
                {imageToView && imageToView.startsWith('data:application/pdf') && (
                    <iframe src={imageToView} title="Vista previa del PDF" className="w-full h-[80vh]" />
                )}
            </Modal>
        </div>
    );
};

export default ReceiptsPage;