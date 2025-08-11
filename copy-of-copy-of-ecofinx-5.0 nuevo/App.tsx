

import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { NAV_ITEMS, IconBookOpen, IconUsers, IconPencil, IconTrash, IconChevronsLeft } from './constants.tsx';
import DashboardPage from './components/DashboardPage.tsx';
import AccountingPage from './components/AccountingPage.tsx';
import CreditsPage from './components/CreditsPage.tsx';
import InsurancePage from './components/InsurancePage.tsx';
import ReceiptsPage from './components/ReceiptsPage.tsx';
import GoalsPage from './components/GoalsPage.tsx';
import BudgetsPage from './components/BudgetsPage.tsx';
import SettingsPage from './components/SettingsPage.tsx';
import AlertsPage from './components/AlertsPage.tsx';
import AIInsightsPage from './components/AIInsightsPage.tsx';
import ReportsPage from './components/ReportsPage.tsx';
import TaxationPage from './components/TaxationPage.tsx';
import AIChatAssistant from './components/AIChatAssistant.tsx';
import Calculator from './components/Calculator.tsx';
import PropertyProfitabilityPage from './components/PropertyProfitabilityPage.tsx';
import EducationPage from './components/EducationPage.tsx';
import { Modal, Input, Button } from './components/common/UIComponents.tsx';
import { Group, User } from './types.ts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


const WELCOME_MODAL_CONTENT = `
### **ECOFinZ 3.0: Tu Asesor Financiero Personal con Inteligencia Artificial**

Imagina tener el control total de tu dinero, tomar decisiones más inteligentes y alcanzar tus metas financieras sin esfuerzo. ECOFinZ 3.0 no es solo una app de finanzas; es tu copiloto financiero personal, diseñado para darte poder y claridad.

**¿Qué nos hace únicos?**

#### 1. **Ahorra Tiempo y Esfuerzo como Nunca Antes**

*   **Dile Adiós a la Entrada Manual:** ¿Una factura o un recibo en papel? **Sácale una foto y nuestra IA la registrará por ti**, rellenando automáticamente el importe, la fecha y la empresa. ¡Dedica tu tiempo a lo que de verdad importa!
*   **Todo en un Único Lugar:** Controla tus cuentas, tarjetas, préstamos, seguros y suscripciones desde un único panel intuitivo y moderno.

#### 2. **Toma Decisiones Financieras Más Inteligentes con IA**

*   **Analiza Préstamos Antes de Firmar:** Antes de comprometerte, nuestra IA analiza la "toxicidad" de cualquier crédito para decirte de forma clara y sencilla si es una buena opción para ti.
*   **Anticípate al Futuro:** Obtén una **previsión de tus finanzas** para los próximos meses. La IA analiza tus tendencias para que puedas planificar con total confianza.
*   **Descubre Dónde Ahorrar:** Recibe **recomendaciones de ahorro personalizadas** basadas en tus hábitos de gasto. La aplicación encuentra oportunidades que tú podrías haber pasado por alto.

#### 3. **Control Total y Visión Clara de Tu Dinero**

*   **Dashboard Interactivo y Visual:** De un solo vistazo, entiende tus ingresos, gastos y tendencias con gráficos dinámicos y un resumen inteligente en lenguaje natural.
*   **Alertas que te Cuidan:** Recibe **notificaciones push** antes de que un seguro se renueve o un recibo importante venza. ¡Nunca más pagarás de más por un despiste!
*   **Informes Profesionales a tu Alcance:** Exporta tus datos a **CSV** con un formato de tabla dinámica o genera informes financieros en **PDF** con un solo clic, perfectos para tu contabilidad o para presentar.

#### 4. **Una Experiencia Premium, Disponible para Ti**

*   **Funciona Donde y Cuando Quieras:** Instala la aplicación en tu móvil o escritorio (PWA) para un acceso instantáneo. Además, funciona **incluso sin conexión a internet**.
*   **Atajos Inteligentes en tu Móvil:** Accede a las funciones más importantes, como "Añadir Gasto" o "Escanear Recibo", directamente desde la pantalla de inicio de tu teléfono.
`;


const GroupEditorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    groupToEdit?: Group;
    users: User[];
    addGroup: (name: string, userIds: string[]) => void;
    updateGroup: (groupId: string, name: string, userIds: string[]) => void;
}> = ({ isOpen, onClose, groupToEdit, users, addGroup, updateGroup }) => {
    const [name, setName] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (groupToEdit) {
            setName(groupToEdit.name);
            setSelectedUserIds(new Set(groupToEdit.userIds));
        } else {
            setName('');
            setSelectedUserIds(new Set());
        }
    }, [groupToEdit, isOpen]);

    const handleUserToggle = (userId: string) => {
        const newSelection = new Set(selectedUserIds);
        if (newSelection.has(userId)) {
            newSelection.delete(userId);
        } else {
            newSelection.add(userId);
        }
        setSelectedUserIds(newSelection);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        if (groupToEdit) {
            updateGroup(groupToEdit.id, name.trim(), Array.from(selectedUserIds));
        } else {
            addGroup(name.trim(), Array.from(selectedUserIds));
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={groupToEdit ? "Editar Grupo" : "Crear Nuevo Grupo"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nombre del Grupo" value={name} onChange={e => setName(e.target.value)} required />
                <div>
                    <h3 className="block text-sm font-medium text-slate-300 mb-2">Miembros del Grupo</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-700 rounded-md">
                        {users.map(user => (
                            <label key={user.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-primary focus:ring-primary"
                                    checked={selectedUserIds.has(user.id)}
                                    onChange={() => handleUserToggle(user.id)}
                                />
                                <span>{user.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                 <div className="flex justify-end pt-4">
                    <Button type="submit">{groupToEdit ? "Guardar Cambios" : "Crear Grupo"}</Button>
                </div>
            </form>
        </Modal>
    );
};


const Sidebar: React.FC<{ isSidebarCollapsed: boolean; onToggleCollapse: () => void; }> = ({ isSidebarCollapsed, onToggleCollapse }) => {
    const { users, groups, activeView, activeViewTarget, switchView, addUser, deleteGroup, addGroup, updateGroup } = useApp();
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const [isGroupEditorOpen, setIsGroupEditorOpen] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState<Group | undefined>(undefined);
    const [newUserName, setNewUserName] = useState('');
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (newUserName.trim()) {
            addUser(newUserName.trim());
            setNewUserName('');
        }
    };

    const openGroupEditorForNew = () => {
        setGroupToEdit(undefined);
        setIsGroupEditorOpen(true);
    };

    const openGroupEditorForEdit = (group: Group) => {
        setGroupToEdit(group);
        setIsGroupEditorOpen(true);
    };

    const displayName = activeViewTarget?.name || "Usuario";
    const avatarUrl = `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
    const displaySubtext = activeView.type === 'group' ? `${(activeViewTarget as Group)?.userIds?.length || 0} miembros` : "Premium";


    return (
        <>
            <div className={`bg-slate-800 h-screen flex flex-col p-4 fixed transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
                <button onClick={() => setIsWelcomeModalOpen(true)} className={`flex items-center gap-3 px-2 mb-4 text-left w-full rounded-lg hover:bg-slate-700/50 transition-colors p-2 -m-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                    <div className="bg-primary p-2 rounded-lg flex-shrink-0">
                        <IconBookOpen className="h-8 w-8 text-black"/>
                    </div>
                    {!isSidebarCollapsed && <h1 className="text-2xl font-bold text-white">ECOFinZ</h1>}
                </button>

                <div className="px-2 mb-4">
                     <button onClick={() => setIsSwitcherOpen(true)} title={isSidebarCollapsed ? displayName : undefined} className={`w-full text-left p-2 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                        <IconUsers className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        {!isSidebarCollapsed && <span className="text-sm font-medium text-slate-300 truncate">{displayName}</span>}
                    </button>
                </div>

                <nav className="flex-grow overflow-y-auto overflow-x-hidden no-scrollbar">
                    <ul>
                        {NAV_ITEMS.map((item, index) => {
                            if (item.type === 'divider') {
                                return <div key={`divider-${index}`} className="my-2 border-t border-slate-700/50"></div>;
                            }
                            return (
                                <li key={item.href}>
                                    <NavLink 
                                        to={item.href} 
                                        title={isSidebarCollapsed ? item.label : undefined}
                                        className={({ isActive }) => 
                                        `flex items-center gap-3 px-3 py-2.5 my-1 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-200 ${isActive ? 'bg-primary text-black font-semibold' : ''} ${isSidebarCollapsed ? 'justify-center' : ''}`
                                    }>
                                        <item.icon className="w-6 h-6 flex-shrink-0"/>
                                        {!isSidebarCollapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                                    </NavLink>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                <div className="flex-shrink-0 mt-2">
                     <button
                        onClick={onToggleCollapse}
                        className={`w-full flex items-center p-3 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white ${isSidebarCollapsed ? 'justify-center' : 'justify-center'}`}
                        title={isSidebarCollapsed ? "Expandir menú" : "Contraer menú"}
                    >
                        <IconChevronsLeft className={`w-6 h-6 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                <div className="border-t border-slate-700 pt-4 flex-shrink-0">
                    <button onClick={() => setIsSwitcherOpen(true)} className={`flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-slate-700 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                        <img className="h-10 w-10 rounded-full bg-slate-600 flex-shrink-0" src={avatarUrl} alt="Avatar" />
                        {!isSidebarCollapsed && (
                            <div className="overflow-hidden">
                                <p className="font-semibold text-white truncate">{displayName}</p>
                                <p className="text-sm text-slate-400 truncate">{displaySubtext}</p>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            <Modal isOpen={isSwitcherOpen} onClose={() => setIsSwitcherOpen(false)} title="Gestionar Cuentas">
                <div className="space-y-4">
                    {groups.length > 0 && (
                        <div>
                            <h3 className="font-bold mb-2 text-slate-300">Grupos</h3>
                            <ul className="space-y-2">
                                {groups.map(group => (
                                    <li key={group.id} className="flex items-center gap-2">
                                        <button onClick={() => { switchView({ type: 'group', id: group.id }); setIsSwitcherOpen(false); }}  className="flex-grow w-full text-left p-2 rounded-md bg-slate-700 hover:bg-primary hover:text-black">
                                            {group.name}
                                        </button>
                                        <button onClick={() => openGroupEditorForEdit(group)} className="p-2 text-slate-400 hover:text-white"><IconPencil className="w-5 h-5"/></button>
                                        <button onClick={() => deleteGroup(group.id)} className="p-2 text-slate-400 hover:text-danger"><IconTrash className="w-5 h-5"/></button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                     <div>
                        <h3 className="font-bold mb-2 text-slate-300">Perfiles Individuales</h3>
                        <ul className="space-y-2">
                            {users.map(user => (
                                <li key={user.id}>
                                    <button onClick={() => { switchView({ type: 'user', id: user.id }); setIsSwitcherOpen(false); }} className="w-full text-left p-2 rounded-md bg-slate-700 hover:bg-primary hover:text-black">
                                        {user.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="border-t border-slate-600 pt-4 space-y-3">
                         <Button onClick={openGroupEditorForNew} variant="secondary" className="w-full">Crear Nuevo Grupo</Button>
                        <form onSubmit={handleAddUser} className="flex gap-2">
                            <Input label="" id="new-user" placeholder="Nombre del nuevo perfil" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="flex-grow !mb-0"/>
                            <Button type="submit">Añadir Perfil</Button>
                        </form>
                    </div>
                </div>
            </Modal>
            
            <GroupEditorModal 
                isOpen={isGroupEditorOpen} 
                onClose={() => setIsGroupEditorOpen(false)} 
                groupToEdit={groupToEdit}
                users={users}
                addGroup={addGroup}
                updateGroup={updateGroup}
            />

            <Modal 
                isOpen={isWelcomeModalOpen} 
                onClose={() => setIsWelcomeModalOpen(false)} 
                title="Bienvenido a ECOFinZ"
                size="lg"
            >
                <div className="prose prose-invert prose-slate max-w-none 
                    prose-headings:text-primary prose-a:text-primary 
                    prose-strong:text-slate-100 prose-ul:list-disc prose-ol:list-decimal">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{WELCOME_MODAL_CONTENT}</ReactMarkdown>
                </div>
            </Modal>
        </>
    );
}

const MainContent: React.FC<{ isSidebarCollapsed: boolean }> = ({ isSidebarCollapsed }) => {
    return (
        <div className={`flex-1 p-8 bg-slate-900 transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/accounting" element={<AccountingPage />} />
                <Route path="/credits" element={<CreditsPage />} />
                <Route path="/insurance" element={<InsurancePage />} />
                <Route path="/receipts" element={<ReceiptsPage />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/budgets" element={<BudgetsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/ai-insights" element={<AIInsightsPage />} />
                <Route path="/taxation" element={<TaxationPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/calculator" element={<Calculator />} />
                <Route path="/education" element={<EducationPage />} />
                <Route path="/property-profitability" element={<PropertyProfitabilityPage />} />
                <Route path="/settings" element={<SettingsPage />} />
            </Routes>
        </div>
    );
};

const AppLayout: React.FC = () => {
    const { alerts } = useApp();
    const [shownNotificationIds, setShownNotificationIds] = useState<Set<string>>(new Set());
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (!("Notification" in window) || alerts.length === 0) {
            return;
        }

        const unshownAlerts = alerts.filter(alert => !shownNotificationIds.has(alert.id));

        if (unshownAlerts.length > 0) {
            if (Notification.permission === "granted") {
                const newShownIds = new Set(shownNotificationIds);
                unshownAlerts.forEach(alert => {
                    new Notification(`Alerta de ECOFinZ: ${alert.title}`, {
                        body: alert.message,
                        icon: '/icons/icon-192x192.png', // PWA icon
                        tag: alert.id, // Tag to prevent duplicate notifications
                    });
                    newShownIds.add(alert.id);
                });
                setShownNotificationIds(newShownIds);
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        // Call self to show notifications now that we have permission
                        // This might be better handled by re-triggering the effect
                    }
                });
            }
        }
    }, [alerts, shownNotificationIds]);


    return (
        <div className="flex min-h-screen">
            <Sidebar isSidebarCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(v => !v)} />
            <MainContent isSidebarCollapsed={isSidebarCollapsed} />
            <AIChatAssistant />
        </div>
    );
};


const App: React.FC = () => {
  return (
    <AppProvider>
        <HashRouter>
            <AppLayout />
        </HashRouter>
    </AppProvider>
  );
};

export default App;