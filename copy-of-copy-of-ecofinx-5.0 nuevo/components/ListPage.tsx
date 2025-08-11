
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Card } from './common/UIComponents.tsx';
import { Receipt, ReceiptType } from '../types.ts';
import { IconArrowUp, IconArrowDown, IconList } from '../constants.tsx';

type SortKey = keyof Receipt | 'tipo';

const ListPage: React.FC = () => {
    const { receipts } = useApp();
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'date', direction: 'descending' });

    const sortedItems = useMemo(() => {
        let sortableItems = [...receipts];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let valA: any;
                let valB: any;

                switch (sortConfig.key) {
                    case 'type':
                        valA = a.type === ReceiptType.INVOICE ? 'Factura' : 'Recibo';
                        valB = b.type === ReceiptType.INVOICE ? 'Factura' : 'Recibo';
                        break;
                    default:
                        valA = a[sortConfig.key];
                        valB = b[sortConfig.key];
                        break;
                }
                
                if (valA < valB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [receipts, sortConfig]);

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
    
    return (
         <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Lista de Registros</h1>
            </div>
            
            {receipts.length > 0 ? (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="p-3 cursor-pointer" onClick={() => requestSort('title')}>Título {getSortIcon('title')}</th>
                                    <th className="p-3 cursor-pointer" onClick={() => requestSort('type')}>Tipo {getSortIcon('type')}</th>
                                    <th className="p-3 cursor-pointer" onClick={() => requestSort('invoiceCategory')}>Categoría {getSortIcon('invoiceCategory')}</th>
                                    <th className="p-3 cursor-pointer text-right" onClick={() => requestSort('amount')}>Importe {getSortIcon('amount')}</th>
                                    <th className="p-3 cursor-pointer text-right" onClick={() => requestSort('date')}>Fecha {getSortIcon('date')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedItems.map(item => (
                                    <tr key={item.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                                        <td className="p-3 font-semibold">{item.title}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.type === ReceiptType.INVOICE ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
                                                {item.type === ReceiptType.INVOICE ? 'Factura' : 'Recibo'}
                                            </span>
                                        </td>
                                        <td className="p-3">{item.type === ReceiptType.INVOICE ? item.invoiceCategory || '-' : '-'}</td>
                                        <td className="p-3 text-right font-bold">€{item.amount.toFixed(2)}</td>
                                        <td className="p-3 text-right">{new Date(item.date).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <Card className="text-center py-12">
                    <IconList className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                    <h2 className="text-xl font-bold text-white">No hay registros para mostrar</h2>
                    <p className="text-slate-400 mt-2">Añade recibos o facturas para verlos aquí.</p>
                </Card>
            )}
        </div>
    )
}

export default ListPage;
