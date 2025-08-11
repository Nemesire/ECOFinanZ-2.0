import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Card, Button, Input, ConfirmationModal } from './common/UIComponents.tsx';
import { User, InsurancePolicyType } from '../types.ts';
import { IconClipboard, IconPencil, IconTrash, INSURANCE_POLICY_TYPES } from '../constants.tsx';

const InsuranceSubcategoryManager: React.FC = () => {
    const { insuranceSubcategories, updateInsuranceSubcategory, deleteInsuranceSubcategory } = useApp();
    const [selectedType, setSelectedType] = useState<InsurancePolicyType>('Hogar');
    const [isEditing, setIsEditing] = useState<string | null>(null); // Stores the original name of the subcategory being edited
    const [editValue, setEditValue] = useState('');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const subcategoriesForType = insuranceSubcategories[selectedType] || [];

    const handleStartEdit = (name: string) => {
        setIsEditing(name);
        setEditValue(name);
    };

    const handleCancelEdit = () => {
        setIsEditing(null);
        setEditValue('');
    };

    const handleSaveEdit = () => {
        if (isEditing && editValue.trim() && editValue.trim() !== isEditing) {
            updateInsuranceSubcategory(selectedType, isEditing, editValue.trim());
        }
        handleCancelEdit();
    };

    const handleConfirmDelete = () => {
        if (isDeleting) {
            deleteInsuranceSubcategory(selectedType, isDeleting);
        }
        setIsDeleting(null);
    };

    return (
        <div className="space-y-4">
            <div>
                <label htmlFor="policy-type-selector" className="block text-sm font-medium text-slate-400 mb-1">
                    Selecciona un tipo de seguro para gestionar sus subcategorías:
                </label>
                <select
                    id="policy-type-selector"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as InsurancePolicyType)}
                    className="w-full max-w-xs bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary"
                >
                    {INSURANCE_POLICY_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>
            <div className="bg-slate-900/50 p-3 rounded-md border border-slate-700 min-h-[150px]">
                {subcategoriesForType.length > 0 ? (
                    <ul className="space-y-2">
                        {subcategoriesForType.map(sub => (
                            <li key={sub} className="flex items-center justify-between p-2 bg-slate-700 rounded-md">
                                {isEditing === sub ? (
                                    <>
                                        <Input
                                            label=""
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            className="!mb-0 flex-grow"
                                        />
                                        <div className="flex gap-2 ml-2">
                                            <Button size="sm" onClick={handleSaveEdit}>Guardar</Button>
                                            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancelar</Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-slate-300">{sub}</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleStartEdit(sub)} className="text-slate-400 hover:text-white" title="Editar"><IconPencil className="w-4 h-4" /></button>
                                            <button onClick={() => setIsDeleting(sub)} className="text-slate-400 hover:text-danger" title="Eliminar"><IconTrash className="w-4 h-4" /></button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="flex items-center justify-center h-full pt-10">
                        <p className="text-slate-500">No hay subcategorías personalizadas para '{selectedType}'.</p>
                    </div>
                )}
            </div>
            <ConfirmationModal
                isOpen={!!isDeleting}
                onClose={() => setIsDeleting(null)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
            >
                <p>¿Estás seguro de que quieres eliminar la subcategoría <span className="font-bold">{isDeleting}</span>?</p>
                <p className="mt-2 text-sm text-slate-400">Esta acción la eliminará de la lista y la quitará de todas las pólizas de seguro que la estén usando.</p>
            </ConfirmationModal>
        </div>
    );
};


const SettingsPage: React.FC = () => {
    const { activeView, activeViewTarget, updateUser } = useApp();
    
    const activeUser = activeView.type === 'user' ? activeViewTarget as User : null;
    const [userName, setUserName] = useState(activeUser?.name || '');
    const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
    const [fileToImport, setFileToImport] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [copyButtonText, setCopyButtonText] = useState('Copiar Datos al Portapapeles');
    
    // States for text import
    const [importText, setImportText] = useState('');
    const [isTextImportConfirmOpen, setIsTextImportConfirmOpen] = useState(false);
    const [importError, setImportError] = useState('');


    useEffect(() => {
        if (activeUser) {
            setUserName(activeUser.name);
        }
    }, [activeUser]);

    const handleSaveUserName = () => {
        if (activeUser && userName.trim()) {
            updateUser(activeUser.id, userName.trim());
        }
    };
    
    const handleExportData = () => {
        try {
            const appState = localStorage.getItem('finanzen-app-state-v3');
            if (!appState) {
                alert("No hay datos para exportar.");
                return;
            }
            
            const blob = new Blob([appState], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            link.download = `ecofinz_backup_${date}.json`;
            link.href = url;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error al exportar los datos:", error);
            alert("Ocurrió un error al intentar exportar los datos. Por favor, prueba la opción de copiar al portapapeles.");
        }
    };
    
    const handleCopyData = () => {
        const appState = localStorage.getItem('finanzen-app-state-v3');
        if (appState && navigator.clipboard) {
            navigator.clipboard.writeText(appState).then(() => {
                setCopyButtonText('¡Copiado!');
                setTimeout(() => setCopyButtonText('Copiar Datos al Portapapeles'), 3000);
            }).catch(err => {
                alert("No se pudo copiar al portapapeles. Por favor, inténtalo de nuevo.");
                console.error('Error al copiar:', err);
            });
        } else {
            alert('No se encontraron datos para copiar o tu navegador no es compatible con esta función.');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileToImport(file);
            setIsImportConfirmOpen(true);
        }
        event.target.value = ''; 
    };

    const handleConfirmImport = () => {
        if (!fileToImport) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("El archivo no es válido.");
                }
                JSON.parse(text); 
                localStorage.setItem('finanzen-app-state-v3', text);
                alert("Datos importados con éxito. La aplicación se recargará ahora.");
                window.location.reload();
            } catch (error) {
                console.error("Error al importar el archivo:", error);
                alert("Error: El archivo seleccionado no es un archivo de datos válido o está corrupto.");
            } finally {
                setIsImportConfirmOpen(false);
                setFileToImport(null);
            }
        };
        reader.readAsText(fileToImport);
    };
    
    const handleTextImport = () => {
        setImportError('');
        if (!importText.trim()) {
            setImportError("El cuadro de texto está vacío. Pega tus datos de respaldo.");
            return;
        }
        try {
            JSON.parse(importText);
            setIsTextImportConfirmOpen(true);
        } catch (error) {
            setImportError("Los datos pegados no son válidos. Asegúrate de copiar todo el contenido del archivo de respaldo.");
            console.error("Error parsing JSON from textarea:", error);
        }
    };
    
    const handleConfirmTextImport = () => {
        localStorage.setItem('finanzen-app-state-v3', importText);
        alert("Datos importados con éxito. La aplicación se recargará ahora.");
        window.location.reload();
    };

    const renderUserSection = () => (
        <Card>
            <h2 className="text-xl font-bold text-white mb-4">Perfil de {activeUser?.name}</h2>
            <div className="space-y-4 max-w-sm">
                <Input 
                    label="Nombre de Usuario"
                    id="username"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                />
                 <div className="flex justify-end">
                    <Button onClick={handleSaveUserName} disabled={userName === activeUser?.name}>
                        Guardar Cambios
                    </Button>
                </div>
            </div>
        </Card>
    );

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Ajustes</h1>
            
            {activeView.type === 'user' ? renderUserSection() : (
                <Card>
                    <h2 className="text-xl font-bold text-white mb-4">Ajustes no disponibles para Grupos</h2>
                    <p className="text-slate-400">Los ajustes de perfil no están disponibles en la vista de Grupo. Por favor, selecciona un usuario individual para editar su perfil.</p>
                </Card>
            )}

            {activeView.type === 'user' && (
                <Card className="mt-8">
                    <h2 className="text-xl font-bold text-white mb-4">Gestión de Subcategorías de Seguros</h2>
                    <InsuranceSubcategoryManager />
                </Card>
            )}

            <Card className="mt-8">
                <h2 className="text-xl font-bold text-white mb-2">Gestión de Datos</h2>
                <p className="text-slate-400 mb-6 max-w-2xl">
                    Exporta todos tus datos para tener una copia de seguridad o para importarlos en otro dispositivo.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Method 1: Direct Download */}
                    <div className="border border-slate-700 p-4 rounded-lg flex flex-col">
                        <h3 className="font-semibold text-lg text-white">Opción 1: Descarga Directa</h3>
                        <p className="text-sm text-slate-400 mt-1 flex-grow">Intenta descargar los datos como un archivo `.json`. Es la forma más rápida y sencilla.</p>
                        <div className="mt-4">
                            <Button onClick={handleExportData} variant="secondary">Descargar Archivo (.json)</Button>
                        </div>
                    </div>

                    {/* Method 2: Copy to Clipboard */}
                    <div className="border border-slate-700 p-4 rounded-lg flex flex-col">
                        <h3 className="font-semibold text-lg text-white">Opción 2: Copiar Datos</h3>
                        <p className="text-sm text-slate-400 mt-1 flex-grow">Opción 100% fiable. Copia los datos para pegarlos y guardarlos manualmente en un archivo de texto.</p>
                        <div className="mt-4">
                            <Button onClick={handleCopyData} variant="ghost" className="flex items-center gap-2">
                                <IconClipboard className="w-5 h-5" />
                                {copyButtonText}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-700 pt-6 mt-8">
                    <h2 className="text-xl font-bold text-white mb-2">Importar Datos</h2>
                     <p className="text-slate-400 mb-6 max-w-2xl">
                        Reemplaza todos los datos actuales con una copia de seguridad. <span className="font-bold text-danger">¡Esta acción es irreversible!</span>
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Option 1: From file */}
                        <div className="border border-slate-700 p-4 rounded-lg flex flex-col">
                            <h3 className="font-semibold text-lg text-white">Opción 1: Desde Archivo</h3>
                            <p className="text-sm text-slate-400 mt-1 flex-grow">Selecciona un archivo `.json` de tu dispositivo.</p>
                            <div className="mt-4">
                                <Button onClick={handleImportClick} variant="ghost">Seleccionar archivo</Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelected}
                                    accept="application/json"
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Option 2: From text */}
                        <div className="border border-slate-700 p-4 rounded-lg flex flex-col">
                             <h3 className="font-semibold text-lg text-white">Opción 2: Pegando Texto</h3>
                             <p className="text-sm text-slate-400 mt-1 flex-grow">Pega el contenido de tu copia de seguridad en el cuadro de texto. <span className="font-bold">Recomendado para la APK.</span></p>
                             <div className="mt-4 space-y-2">
                                <textarea
                                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary font-mono text-xs"
                                    rows={4}
                                    placeholder="Pega aquí los datos de tu archivo de respaldo .json..."
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                />
                                {importError && <p className="text-sm text-danger">{importError}</p>}
                                <Button onClick={handleTextImport} variant="secondary">Importar desde Texto</Button>
                             </div>
                        </div>
                    </div>
                </div>
            </Card>

            <ConfirmationModal
                isOpen={isImportConfirmOpen}
                onClose={() => setIsImportConfirmOpen(false)}
                onConfirm={handleConfirmImport}
                title="Confirmar Importación de Datos"
            >
                <p className="font-bold text-lg text-amber-400">¡Atención!</p>
                <p className="mt-2">Estás a punto de reemplazar <span className="font-bold">TODOS</span> los datos actuales de la aplicación en este dispositivo con el contenido del archivo seleccionado.</p>
                <p className="mt-4 text-sm text-slate-400">Esta acción no se puede deshacer. ¿Estás seguro de que quieres continuar?</p>
            </ConfirmationModal>
            
            <ConfirmationModal
                isOpen={isTextImportConfirmOpen}
                onClose={() => setIsTextImportConfirmOpen(false)}
                onConfirm={handleConfirmTextImport}
                title="Confirmar Importación desde Texto"
            >
                <p className="font-bold text-lg text-amber-400">¡Atención!</p>
                <p className="mt-2">Estás a punto de reemplazar <span className="font-bold">TODOS</span> los datos actuales de la aplicación en este dispositivo con el contenido que has pegado.</p>
                <p className="mt-4 text-sm text-slate-400">Esta acción no se puede deshacer. ¿Estás seguro de que quieres continuar?</p>
            </ConfirmationModal>
        </div>
    );
};

export default SettingsPage;