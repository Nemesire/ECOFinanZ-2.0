import React, { useState, useRef, ReactNode, useEffect, ChangeEvent } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Card, Button, Input, ConfirmationModal, Modal } from './common/UIComponents.tsx';
import { TaxDraftData, TaxQuestionnaire, TaxCalculationResult, ReceiptType, RentedProperty, Receipt, SavedTaxReturn } from '../types.ts';
import { extractDataFromTaxPDF, getTaxAdvice } from '../services/geminiService.ts';
import { IconScale, IconSparkles, IconUpload, IconArrowDown, IconArrowUp, IconTrash, IconEye } from '../constants.tsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AUTONOMOUS_COMMUNITIES = ["Andalucía", "Aragón", "Asturias", "Baleares", "Canarias", "Cantabria", "Castilla-La Mancha", "Castilla y León", "Cataluña", "Comunidad Valenciana", "Extremadura", "Galicia", "Madrid", "Murcia", "Navarra", "País Vasco", "La Rioja", "Ceuta", "Melilla"];

const AccordionSection: React.FC<{ title: string; children: ReactNode; isOpen: boolean; onToggle: () => void; }> = ({ title, children, isOpen, onToggle }) => (
    <div className="border-b border-slate-700">
        <h2>
            <button type="button" onClick={onToggle} className="flex items-center justify-between w-full p-4 font-medium text-left text-slate-300 hover:bg-slate-700/50">
                <span>{title}</span>
                {isOpen ? <IconArrowUp className="w-5 h-5"/> : <IconArrowDown className="w-5 h-5"/>}
            </button>
        </h2>
        {isOpen && <div className="p-4 border-t border-slate-700">{children}</div>}
    </div>
);


const TaxationPage: React.FC = () => {
    const { receipts, savedTaxReturns, addSavedTaxReturn, deleteSavedTaxReturn } = useApp();
    
    // View management
    const [activeTab, setActiveTab] = useState<'simulator' | 'history'>('simulator');
    const [view, setView] = useState<'form' | 'results' | 'history_list' | 'history_detail'>('form');

    // Simulator state
    const [step, setStep] = useState(1); // 1: Upload, 2: Questionnaire
    const [draftData, setDraftData] = useState<TaxDraftData | null>(null);
    const [calculationResult, setCalculationResult] = useState<TaxCalculationResult | null>(null);
    const [pdfFile, setPdfFile] = useState<{name: string, data: string} | null>(null);

    // History state
    const [selectedReturn, setSelectedReturn] = useState<SavedTaxReturn | null>(null);
    const [returnToDelete, setReturnToDelete] = useState<SavedTaxReturn | null>(null);
    
    // Shared state
    const [openAccordion, setOpenAccordion] = useState('A');
    const [questionnaire, setQuestionnaire] = useState<TaxQuestionnaire>({
        personal_civilStatus: 'single', personal_autonomousCommunity: 'Madrid', personal_hasChildren: false,
        personal_childrenCount: 0, personal_childrenDisability: false, personal_childrenDisabilityGrade: 33,
        personal_isLargeFamily: 'none', personal_hasAscendants: false, personal_ascendantsDisability: false,
        personal_ascendantsDisabilityGrade: 33, housing_isOwner: false, housing_isRenter: false,
        housing_mortgage_boughtBefore2013: false, housing_mortgage_paidAmount: 0, housing_rent_contractDate: '',
        housing_rent_paidAmount: 0, housing_efficiencyImprovements: false, housing_efficiencyAmount: 0,
        rented_properties: [], care_daycareExpenses: 0, care_educationExpenses: 0,
        work_isAutonomous: false, work_autonomousIncome: 0, work_autonomousExpenses: 0,
        work_pensionPlanContributions: 0, work_investmentGainsLosses: 0, donations_ngo: 0,
        donations_unionDues: 0, donations_privateHealthInsurance: 0, regional_gymFee: 0,
        regional_birthAdoption: 0, regional_publicTransport: 0,
    });
    
    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [saveYear, setSaveYear] = useState(new Date().getFullYear() - 1);


    useEffect(() => {
        if (step === 2 && receipts) {
            const deductibleExpenses = receipts
                .filter(r => r.type === ReceiptType.INVOICE && r.isTaxDeductible)
                .reduce((total, r) => total + r.amount, 0);
            
            setQuestionnaire(q => ({
                ...q,
                work_autonomousExpenses: deductibleExpenses,
            }));
        }
    }, [step, receipts]);
    
    const resetSimulator = () => {
        setStep(1);
        setDraftData(null);
        setCalculationResult(null);
        setPdfFile(null);
        setError('');
        setView('form');
    };
    
    const handleTabChange = (tab: 'simulator' | 'history') => {
        setActiveTab(tab);
        if (tab === 'simulator') {
            resetSimulator();
        } else {
            setView('history_list');
            setSelectedReturn(null);
        }
    };

    // --- Simulator Logic ---

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setError('');
            setIsLoading(true);
            try {
                const reader = new FileReader();
                reader.readAsDataURL(selectedFile);
                reader.onloadend = async () => {
                    const base64StringWithMime = reader.result as string;
                    const base64String = base64StringWithMime.split(',')[1];
                    setPdfFile({ name: selectedFile.name, data: base64String });

                    const extractedData = await extractDataFromTaxPDF(base64String, selectedFile.type);
                    if (extractedData.grossIncome === 0 && extractedData.draftResult === 0) {
                         setError('No se pudieron extraer los datos del PDF. Asegúrate de que es un borrador de la renta válido y legible.');
                         setIsLoading(false);
                         setPdfFile(null);
                    } else {
                        setDraftData(extractedData);
                        setStep(2);
                        setIsLoading(false);
                    }
                };
                reader.onerror = () => {
                    setError('Error al leer el archivo.');
                    setIsLoading(false);
                };
            } catch (err) {
                console.error(err);
                setError('Error al procesar el PDF con la IA.');
                setIsLoading(false);
            }
        } else {
            setError('Por favor, selecciona un archivo PDF válido.');
        }
    };

    const handleUploadClick = () => fileInputRef.current?.click();

    const handleCalculate = async () => {
        if (!draftData) {
            setError("Los datos del borrador no se han podido cargar. Por favor, vuelve a subir el archivo.");
            return;
        }
        setIsLoading(true);
        const deductibleReceipts = receipts.filter(r => r.type === ReceiptType.INVOICE && r.isTaxDeductible);
        const result = await getTaxAdvice(draftData, questionnaire, deductibleReceipts);
        const totalImpact = result.deductions.reduce((acc, curr) => acc + curr.impactOnResult, 0);
        const adjustedResult = draftData.draftResult - totalImpact;

        setCalculationResult({
            draftResult: draftData.draftResult,
            adjustedResult: adjustedResult,
            advice: result.advice,
            deductions: result.deductions,
        });

        setIsLoading(false);
        setView('results');
    };
    
    const handleSaveReturn = () => {
        if (!calculationResult || !pdfFile) return;
        addSavedTaxReturn({
            year: saveYear,
            fileName: pdfFile.name,
            pdfData: pdfFile.data,
            calculationResult: calculationResult
        });
        setIsSaveModalOpen(false);
    };

    // --- History Logic ---

    const viewHistoryDetail = (savedReturn: SavedTaxReturn) => {
        setSelectedReturn(savedReturn);
        setView('history_detail');
    };

    const confirmDeleteReturn = (savedReturn: SavedTaxReturn) => {
        setReturnToDelete(savedReturn);
    };

    const handleDeleteReturn = () => {
        if (returnToDelete) {
            deleteSavedTaxReturn(returnToDelete.id);
            setReturnToDelete(null);
        }
    };
    
    // --- Shared Questionnaire Logic ---
    const handleQuestionnaireChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let processedValue: string | number | boolean = type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? parseFloat(value) || 0 : value);
        setQuestionnaire(q => ({ ...q, [name]: processedValue }));
    };

    const handleAddRentedProperty = () => setQuestionnaire(q => ({ ...q, rented_properties: [...q.rented_properties, { id: crypto.randomUUID(), name: '', income: 0, expenses: 0 }] }));
    
    const handleRentedPropertyChange = (id: string, field: 'name' | 'income' | 'expenses', value: string) => {
        const processedValue = field === 'name' ? value : parseFloat(value) || 0;
        setQuestionnaire(q => ({ ...q, rented_properties: q.rented_properties.map(p => p.id === id ? { ...p, [field]: processedValue } : p) }));
    };

    const handleDeleteRentedProperty = (id: string) => setQuestionnaire(q => ({ ...q, rented_properties: q.rented_properties.filter(p => p.id !== id) }));


    // --- Render Functions ---

    const renderResultView = (result: TaxCalculationResult, isHistory: boolean = false) => {
        const { draftResult, adjustedResult, advice, deductions } = result;
        const improvement = draftResult - adjustedResult;

        const ResultBox: React.FC<{title: string; amount: number; isMain?: boolean}> = ({ title, amount, isMain = false }) => (
            <div className={`p-4 rounded-lg text-center ${isMain ? 'bg-primary/20' : 'bg-slate-700'}`}>
                <p className="text-sm text-slate-300">{title}</p>
                <p className={`text-3xl font-bold ${isMain ? 'text-primary' : 'text-white'}`}>{amount.toFixed(2)} €</p>
                <p className={`text-xs ${amount < 0 ? 'text-secondary' : 'text-danger'}`}>{amount < 0 ? 'A DEVOLVER' : amount > 0 ? 'A PAGAR' : 'NEUTRO'}</p>
            </div>
        );

        return (
            <div>
                <Card className="mb-6">
                    <h2 className="text-2xl font-bold text-white text-center mb-6">
                        {isHistory ? `Resultado de la Renta ${selectedReturn?.year}` : "¡Simulación Completada!"}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <ResultBox title="Resultado Original" amount={draftResult} />
                        <div className="text-center">
                            <p className="text-sm text-slate-300">Ahorro Estimado</p>
                            <p className={`text-4xl font-bold ${improvement >= 0 ? 'text-secondary' : 'text-danger'}`}>{improvement >= 0 ? `+${improvement.toFixed(2)}` : improvement.toFixed(2)} €</p>
                        </div>
                        <ResultBox title="Resultado Optimizado" amount={adjustedResult} isMain />
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><IconSparkles className="w-6 h-6 text-primary"/>Consejos del Asesor IA</h3>
                        <div className="prose prose-invert prose-slate max-w-none prose-headings:text-primary prose-strong:text-slate-100 prose-ul:list-disc"><ReactMarkdown remarkPlugins={[remarkGfm]}>{advice}</ReactMarkdown></div>
                    </Card>
                    <Card>
                        <h3 className="text-xl font-bold text-white mb-4">Deducciones Aplicadas</h3>
                        {deductions.length > 0 ? <ul className="space-y-2">{deductions.map((d, i) => <li key={i} className="p-2 bg-slate-700/50 rounded-md flex justify-between"><span>{d.description}</span><span className="font-semibold text-secondary">-{d.impactOnResult.toFixed(2)}€</span></li>)}</ul> : <p className="text-slate-400">No se han encontrado deducciones adicionales.</p>}
                    </Card>
                </div>

                <div className="text-center mt-8">
                    {isHistory ? <Button variant="ghost" onClick={() => handleTabChange('history')}>Volver al Historial</Button> : <Button variant="ghost" onClick={resetSimulator}>Realizar otra simulación</Button>}
                    {!isHistory && <Button onClick={() => setIsSaveModalOpen(true)} className="ml-4">Guardar en Historial</Button>}
                </div>
            </div>
        );
    };

    const renderSimulator = () => (
        <>
            {view === 'form' && step === 1 &&
                <Card className="text-center">
                    <IconUpload className="w-16 h-16 mx-auto text-primary mb-4" />
                    <h2 className="text-2xl font-bold text-white">Sube tu Borrador de la Renta</h2>
                    <p className="mt-4 text-slate-300 max-w-2xl mx-auto">Selecciona el borrador de tu declaración (Modelo 100) en formato PDF. Nuestra IA extraerá los datos clave.</p>
                    <div className="mt-8">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
                        <Button size="lg" onClick={handleUploadClick} disabled={isLoading}>{isLoading ? "Procesando PDF..." : "Seleccionar Archivo PDF"}</Button>
                        {pdfFile && !isLoading && <p className="text-sm text-slate-400 mt-4">Archivo seleccionado: {pdfFile.name}</p>}
                        {error && <p className="text-sm text-danger mt-4">{error}</p>}
                    </div>
                    <p className="mt-6 text-xs text-slate-500 max-w-2xl mx-auto">Recuerda: esto es una simulación. Tu documento se procesa de forma segura y no se almacena.</p>
                </Card>
            }
            {view === 'form' && step === 2 && draftData &&
                <Card>
                    <h2 className="text-xl font-bold text-white mb-2">Paso 2: Cuestionario Fiscal</h2>
                    <p className="text-slate-400 mb-6">Confirma los datos y responde para encontrar deducciones.</p>
                    {/* ... Questionnaire JSX ... */}
                    <div className="border border-slate-700 rounded-lg">
                        <AccordionSection title="A. Datos Personales y Familiares" isOpen={openAccordion === 'A'} onToggle={() => setOpenAccordion(openAccordion === 'A' ? '' : 'A')}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="personal_civilStatus" className="block text-sm font-medium text-slate-400 mb-1">Estado Civil</label>
                                    <select
                                        id="personal_civilStatus"
                                        name="personal_civilStatus"
                                        value={questionnaire.personal_civilStatus}
                                        onChange={handleQuestionnaireChange}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary"
                                    >
                                        <option value="single">Soltero/a</option>
                                        <option value="married">Casado/a</option>
                                        <option value="widowed">Viudo/a</option>
                                        <option value="divorced">Divorciado/a</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="personal_autonomousCommunity" className="block text-sm font-medium text-slate-400 mb-1">Comunidad Autónoma</label>
                                    <select
                                        id="personal_autonomousCommunity"
                                        name="personal_autonomousCommunity"
                                        value={questionnaire.personal_autonomousCommunity}
                                        onChange={handleQuestionnaireChange}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary"
                                    >
                                        {AUTONOMOUS_COMMUNITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        </AccordionSection>
                        <AccordionSection title="E. Trabajo y Ahorro" isOpen={openAccordion === 'E'} onToggle={() => setOpenAccordion(openAccordion === 'E' ? '' : 'E')}>
                             <div className="space-y-4">
                                <Input label="Aportaciones a planes de pensiones" name="work_pensionPlanContributions" type="number" value={questionnaire.work_pensionPlanContributions} onChange={handleQuestionnaireChange} />
                             </div>
                         </AccordionSection>
                    </div>
                     <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-700">
                        <Button variant="ghost" onClick={resetSimulator}>Empezar de Nuevo</Button>
                        <Button size="lg" onClick={handleCalculate} disabled={isLoading}>{isLoading ? 'Analizando...' : 'Calcular Declaración'}</Button>
                    </div>
                </Card>
            }
            {view === 'results' && calculationResult && renderResultView(calculationResult, false)}
        </>
    );

    const renderHistory = () => (
         <>
            {view === 'history_list' &&
                <Card>
                    <h2 className="text-2xl font-bold text-white mb-4">Historial de Rentas</h2>
                    {savedTaxReturns.length > 0 ? (
                        <ul className="space-y-3">
                            {savedTaxReturns.sort((a,b)=>b.year - a.year).map(item => (
                                <li key={item.id} className="p-3 bg-slate-700/50 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-lg text-white">Renta {item.year}</p>
                                        <p className="text-sm text-slate-400">Guardado: {new Date(item.dateSaved).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className={`text-xl font-bold ${item.calculationResult.adjustedResult < 0 ? 'text-secondary' : 'text-danger'}`}>
                                            {item.calculationResult.adjustedResult.toFixed(2)} €
                                        </p>
                                        <Button variant="ghost" size="sm" onClick={() => viewHistoryDetail(item)}><IconEye className="w-5 h-5 mr-2"/>Ver Detalles</Button>
                                        <button onClick={() => confirmDeleteReturn(item)} className="p-2 text-slate-400 hover:text-danger rounded-full hover:bg-slate-700" title="Eliminar"><IconTrash className="w-5 h-5"/></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-12">
                            <IconScale className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                            <h3 className="text-xl font-bold">No hay rentas guardadas</h3>
                            <p className="text-slate-400 mt-2">Usa el simulador y guarda los resultados para verlos aquí.</p>
                        </div>
                    )}
                </Card>
            }
            {view === 'history_detail' && selectedReturn && renderResultView(selectedReturn.calculationResult, true)}
         </>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white mb-2">Fiscalidad</h1>
            <div className="border-b border-slate-700 mb-6">
                 <nav className="-mb-px flex space-x-8">
                    <button onClick={() => handleTabChange('simulator')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'simulator' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>Simulador</button>
                    <button onClick={() => handleTabChange('history')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}>Historial de Rentas</button>
                </nav>
            </div>
            
            {activeTab === 'simulator' ? renderSimulator() : renderHistory()}
            
            <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Guardar Simulación">
                <div className="space-y-4">
                    <p className="text-slate-300">Introduce el año fiscal correspondiente a esta declaración para guardarla en tu historial.</p>
                    <Input 
                        label="Año Fiscal" 
                        type="number"
                        value={saveYear}
                        onChange={(e) => setSaveYear(parseInt(e.target.value))}
                        placeholder={`Ej: ${new Date().getFullYear() - 1}`}
                    />
                     <div className="flex justify-end gap-4 pt-4">
                        <Button variant="ghost" onClick={() => setIsSaveModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveReturn}>Guardar</Button>
                    </div>
                </div>
            </Modal>
            
            <ConfirmationModal
                isOpen={!!returnToDelete}
                onClose={() => setReturnToDelete(null)}
                onConfirm={handleDeleteReturn}
                title={`Eliminar Renta ${returnToDelete?.year}`}
            >
                <p>¿Estás seguro de que quieres eliminar permanentemente la declaración guardada del año <span className="font-bold">{returnToDelete?.year}</span>?</p>
                <p className="mt-2 text-sm text-slate-400">Esta acción no se puede deshacer.</p>
            </ConfirmationModal>
            
            {isLoading && view === 'form' && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-80 flex flex-col justify-center items-center z-50">
                    <p className="text-white text-xl mt-4">Analizando con IA, un momento...</p>
                </div>
            )}
        </div>
    );
};

export default TaxationPage;