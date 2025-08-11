
import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Card } from './common/UIComponents.tsx';
import { IconBell } from '../constants.tsx';

const AlertsPage: React.FC = () => {
    const { alerts } = useApp();

    return (
        <div>
            <h1 className="text-3xl font-bold text-white mb-6">Historial de Alertas</h1>
            {alerts.length > 0 ? (
                <Card>
                    <ul className="space-y-4">
                        {alerts.map(alert => (
                            <li key={alert.id} className="p-4 rounded-lg bg-slate-700/50 border border-accent flex items-start gap-4">
                                <div className="flex-shrink-0 pt-1">
                                   <IconBell className="w-6 h-6 text-accent" />
                                </div>
                                <div>
                                    <p className="font-bold text-white">{alert.title}</p>
                                    <p className="text-slate-300">{alert.message}</p>
                                    <p className="text-sm text-slate-400 mt-1">Fecha de vencimiento/renovación: {new Date(alert.date).toLocaleDateString()}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            ) : (
                <Card className="text-center py-12">
                     <IconBell className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                    <h2 className="text-xl font-bold text-white">Todo en orden</h2>
                    <p className="text-slate-400 mt-2">No tienes alertas pendientes.</p>
                </Card>
            )}
        </div>
    );
};

export default AlertsPage;