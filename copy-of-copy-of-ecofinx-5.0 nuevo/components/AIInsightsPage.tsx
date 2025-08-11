import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { getFinancialInsights, getPredictiveAnalysis, getSavingsRecommendations } from '../services/geminiService.ts';
import { Card, Button } from './common/UIComponents.tsx';
import { IconSparkles } from '../constants.tsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type AnalysisType = 'question' | 'forecast' | 'savings';

const AIInsightsPage: React.FC = () => {
    const { transactions, credits, goals, receipts, insurancePolicies } = useApp();
    const [activeTab, setActiveTab] = useState<AnalysisType>('question');
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerateInsights = async () => {
        if (activeTab === 'question' && !query.trim()) {
            setError('Por favor, introduce una pregunta.');
            return;
        }

        setIsLoading(true);
        setError('');
        setResponse('');

        try {
            const financialData = JSON.stringify({
                transactions,
                credits,
                goals,
                receipts,
                insurancePolicies,
            }, null, 2);

            let result = '';
            if (activeTab === 'question') {
                result = await getFinancialInsights(query, financialData);
            } else if (activeTab === 'forecast') {
                result = await getPredictiveAnalysis(financialData);
            } else if (activeTab === 'savings') {
                result = await getSavingsRecommendations(financialData);
            }
            setResponse(result);
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al contactar con la IA.');
            setResponse('');
        } finally {
            setIsLoading(false);
        }
    };
    
    const TABS: { id: AnalysisType, name: string, description: string, buttonText: string, requiresQuery: boolean }[] = [
        { id: 'question', name: 'Pregunta Abierta', description: 'Haz cualquier pregunta sobre tus finanzas.', buttonText: 'Obtener Respuesta', requiresQuery: true },
        { id: 'forecast', name: 'Previsión Financiera', description: 'Obtén una previsión de tus ingresos y gastos para los próximos 3 meses.', buttonText: 'Generar Previsión', requiresQuery: false },
        { id: 'savings', name: 'Recomendaciones de Ahorro', description: 'Descubre oportunidades para ahorrar basadas en tus hábitos de gasto.', buttonText: 'Obtener Recomendaciones', requiresQuery: false },
    ];

    const currentTab = TABS.find(t => t.id === activeTab)!;

    return (
        <div className="space-y-8">
            <div className="text-center">
                 <IconSparkles className="w-16 h-16 mx-auto text-primary mb-4" />
                <h1 className="text-4xl font-bold text-white">Perspectivas con IA</h1>
                <p className="mt-2 text-lg text-slate-400 max-w-2xl mx-auto">
                    Selecciona un tipo de análisis y deja que la IA de ECOFinZ te ofrezca claridad sobre tu futuro financiero.
                </p>
            </div>

            <div className="max-w-4xl mx-auto">
                <div className="mb-4 flex justify-center border-b border-slate-700">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 font-medium text-sm transition-colors -mb-px ${activeTab === tab.id ? 'border-b-2 border-primary text-primary' : 'text-slate-400 hover:text-white'}`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>

                <Card>
                    <div className="space-y-4 text-center">
                        <h2 className="text-xl font-bold text-white">{currentTab.name}</h2>
                        <p className="text-slate-400">{currentTab.description}</p>
                        
                        {currentTab.requiresQuery && (
                            <textarea
                                id="ai-query"
                                rows={3}
                                className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-slate-100 focus:ring-primary focus:border-primary text-base"
                                placeholder="Ej: ¿En qué categoría estoy gastando más dinero este mes?"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                disabled={isLoading}
                            />
                        )}

                        <div className="pt-2">
                             <Button onClick={handleGenerateInsights} disabled={isLoading || (currentTab.requiresQuery && !query.trim())} size="lg">
                                {isLoading ? 'Generando...' : currentTab.buttonText}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {isLoading && (
                 <div className="text-center py-12">
                    <div role="status" className="flex justify-center items-center gap-3">
                        <svg aria-hidden="true" className="w-8 h-8 text-slate-600 animate-spin fill-primary" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0492C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5424 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                        </svg>
                        <span className="text-xl text-slate-400">Analizando tus finanzas...</span>
                    </div>
                </div>
            )}

            {error && (
                <Card className="max-w-4xl mx-auto border-l-4 border-danger">
                    <p className="font-bold text-danger">Error</p>
                    <p className="text-slate-300">{error}</p>
                </Card>
            )}

            {response && (
                 <Card className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                        <IconSparkles className="w-7 h-7 text-primary" /> Análisis de ECOFinZ AI
                    </h2>
                    <div className="prose prose-invert prose-slate max-w-none 
                        prose-headings:text-primary prose-a:text-primary 
                        prose-strong:text-slate-100 prose-ul:list-disc prose-ol:list-decimal">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
                    </div>
                </Card>
            )}

        </div>
    );
};

export default AIInsightsPage;