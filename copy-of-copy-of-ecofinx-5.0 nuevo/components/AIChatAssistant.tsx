import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { getChatResponseWithTools } from '../services/geminiService.ts';
import { IconMagicWand, IconSparkles } from '../constants.tsx';
import { ChatMessage, TransactionType } from '../types.ts';
import ReactMarkdown from 'react-markdown';

const AIChatAssistant: React.FC = () => {
    const { addTransaction, incomeCategories, expenseCategories } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        if(isOpen && messages.length === 0) {
            setMessages([
                { id: crypto.randomUUID(), role: 'model', text: '¡Hola! Soy tu asistente ECOFinZ. Puedes pedirme que añada un gasto o un ingreso. Por ejemplo: "Añade 25€ de gasolina" o "Registra mi nómina de 1.800€".' }
            ]);
        }
    }, [isOpen]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: input };
        setMessages(prev => [...prev, userMessage, { id: crypto.randomUUID(), role: 'model', text: '', isLoading: true }]);
        setInput('');
        setIsLoading(true);

        const chatHistory = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        try {
            const response = await getChatResponseWithTools(input, chatHistory, { income: incomeCategories, expense: expenseCategories });
            
            if (!response) {
                throw new Error("La API no devolvió una respuesta válida.");
            }

            const functionCalls = response.candidates?.[0].content.parts
                .filter(part => part.functionCall)
                .map(part => part.functionCall);
            
            if (functionCalls && functionCalls.length > 0) {
                const toolResponseParts = [];
                for (const call of functionCalls) {
                    if (call.name === 'addTransaction') {
                        const { type, amount, category, description } = call.args;
                        addTransaction({
                            type: type as TransactionType,
                            amount: amount as number,
                            category: category as string,
                            description: (description as string) || 'Añadido por Asistente IA',
                            date: new Date().toISOString().split('T')[0],
                        });
                        toolResponseParts.push({
                            functionResponse: {
                                name: 'addTransaction',
                                response: { success: true, message: `Transacción de ${amount}€ en '${category}' añadida correctamente.` },
                            },
                        });
                    }
                }
                
                // Get a follow-up response from the model
                const followUpResponse = await getChatResponseWithTools(
                    "",
                    [
                        ...chatHistory,
                         { role: 'user', parts: [{ text: input }] },
                         { role: 'model', parts: response.candidates?.[0].content.parts || [] },
                         { role: 'user', parts: toolResponseParts }
                    ],
                    { income: incomeCategories, expense: expenseCategories }
                );

                const modelResponseText = followUpResponse?.text ?? "Acción completada.";
                setMessages(prev => prev.slice(0, -1).concat({ id: crypto.randomUUID(), role: 'model', text: modelResponseText }));

            } else {
                const modelResponseText = response.text;
                setMessages(prev => prev.slice(0, -1).concat({ id: crypto.randomUUID(), role: 'model', text: modelResponseText }));
            }

        } catch (error) {
            console.error("Error communicating with AI Assistant:", error);
            const errorMessage = "Lo siento, no he podido procesar tu solicitud ahora mismo.";
            setMessages(prev => prev.slice(0, -1).concat({ id: crypto.randomUUID(), role: 'model', text: errorMessage }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-primary hover:bg-primary-hover text-black rounded-full p-4 shadow-lg z-40 transition-transform transform hover:scale-110"
                aria-label="Abrir Asistente IA"
            >
                <IconMagicWand className="w-8 h-8" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center sm:items-center">
                    <div className="bg-slate-800 w-full max-w-lg h-[80vh] sm:h-auto sm:max-h-[80vh] rounded-t-lg sm:rounded-lg shadow-xl flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-700">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <IconSparkles className="w-6 h-6 text-primary"/>
                                Asistente ECOFinZ
                            </h2>
                            <button onClick={() => setIsOpen(false)} className="text-2xl font-bold text-slate-400 hover:text-white">&times;</button>
                        </div>
                        
                        {/* Chat Messages */}
                        <div className="flex-grow p-4 overflow-y-auto">
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'model' && <IconSparkles className="w-6 h-6 text-primary flex-shrink-0" />}
                                        <div className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${msg.role === 'user' ? 'bg-primary text-black' : 'bg-slate-700 text-slate-200'}`}>
                                            {msg.isLoading ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                                </div>
                                            ) : (
                                                <div className="prose prose-sm prose-invert max-w-none prose-p:my-0">
                                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                        
                        {/* Input Form */}
                        <div className="p-4 border-t border-slate-700">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Escribe un comando..."
                                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 focus:ring-primary focus:border-primary disabled:opacity-50"
                                    disabled={isLoading}
                                />
                                <button type="submit" className="bg-primary text-black font-semibold px-4 py-2 rounded-md hover:bg-primary-hover disabled:opacity-50" disabled={isLoading || !input.trim()}>
                                    Enviar
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AIChatAssistant;