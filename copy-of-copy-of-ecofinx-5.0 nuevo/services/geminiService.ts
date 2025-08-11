

import { GoogleGenAI, Type } from "@google/genai";
import { ToxicityReport, ScannedReceiptData, Transaction, TaxDraftData, TaxQuestionnaire, TaxDeduction, TransactionType, Receipt } from '../types.ts';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = process.env.API_KEY && process.env.API_KEY !== 'placeholder' 
    ? new GoogleGenAI({ apiKey: process.env.API_KEY })
    : null;

const model = "gemini-2.5-flash";

const safeRun = async <T,>(apiCall: () => Promise<T>, fallback: T): Promise<T> => {
    if (!ai) {
        console.warn("Gemini API key not configured. Returning fallback response.");
        return fallback;
    }
    try {
        return await apiCall();
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return fallback;
    }
};

export const analyzeCreditToxicity = async (
  totalAmount: number,
  monthlyPayment: number,
  tin: number,
  tae: number,
  loanTermInMonths: number
): Promise<ToxicityReport> => safeRun(async () => {
  const prompt = `
    Eres un asesor financiero experto. Analiza la "toxicidad" del siguiente préstamo personal para un usuario medio.
    Considera la relación entre la cuota mensual, los tipos de interés (TIN y TAE), el importe total y la duración del préstamo.
    Proporciona una puntuación de toxicidad de 1 (muy seguro) a 10 (extremadamente arriesgado) y una breve explicación clara y sencilla.

    Detalles del préstamo:
    - Importe total: ${totalAmount} €
    - Cuota mensual: ${monthlyPayment} €
    - TIN (Tipo de Interés Nominal): ${tin}%
    - TAE (Tasa Anual Equivalente): ${tae}%
    - Duración: ${loanTermInMonths} meses

    Devuelve tu análisis únicamente en formato JSON.
  `;

    const response = await ai!.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { 
                        type: Type.NUMBER,
                        description: "La puntuación de toxicidad de 1 a 10."
                    },
                    explanation: { 
                        type: Type.STRING,
                        description: "Una explicación breve y sencilla de por qué se asignó esa puntuación."
                    }
                },
                required: ["score", "explanation"],
            }
        }
    });
    
    const parsedResponse = JSON.parse(response.text);

    if (typeof parsedResponse.score !== 'number' || typeof parsedResponse.explanation !== 'string') {
        throw new Error("Invalid response format from Gemini API");
    }

    return parsedResponse as ToxicityReport;

}, {
    score: 0,
    explanation: "No se pudo analizar el crédito. La API Key de Gemini no está configurada o hubo un error."
});

export const getFinancialInsights = async (userQuery: string, financialData: string): Promise<string> => safeRun(async () => {
  const systemInstruction = `
    Eres un asesor financiero experto y amigable llamado ECOFinZ AI. Tu tarea es analizar los datos financieros del usuario (en formato JSON) y responder a sus preguntas de forma clara, concisa y útil.
    - Utiliza los datos proporcionados para fundamentar tus respuestas.
    - Ofrece consejos prácticos, accionables y fáciles de entender.
    - Formatea tu respuesta usando Markdown para una mejor legibilidad (usa títulos, listas, negritas, etc.).
    - No inventes datos. Si la información no está en los datos proporcionados, indícalo.
    - Sé directo y evita el lenguaje financiero demasiado complejo.
    - No menciones que eres un modelo de lenguaje ni que estás analizando un JSON, simplemente da la respuesta como un asesor.
  `;
  const contents = `AQUÍ ESTÁN MIS DATOS FINANCIEROS:\n${financialData}\n\nESTA ES MI PREGUNTA:\n"${userQuery}"`;

  const response = await ai!.models.generateContent({ model, contents, config: { systemInstruction, temperature: 0.5 } });
  return response.text;
}, "Lo siento, ha ocurrido un error al intentar generar el análisis. Asegúrate de que tu API Key de Gemini esté configurada correctamente.");

export const analyzeReceiptImage = async (base64Image: string, mimeType: string): Promise<ScannedReceiptData> => safeRun(async () => {
    const prompt = "Analiza la imagen de este recibo o factura. Extrae el importe total, la fecha, una descripción breve o el nombre del comercio, y sugiere una categoría de gasto de las siguientes: Vivienda, Transporte, Alimentación, Ocio, Salud, Finanzas, Seguros, Ropa, Educación, Regalos, Otros. Devuelve la fecha en formato YYYY-MM-DD.";
    const imagePart = { inlineData: { data: base64Image, mimeType } };

    const response = await ai!.models.generateContent({
        model,
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    amount: { type: Type.NUMBER, description: "El importe total del recibo." },
                    date: { type: Type.STRING, description: "La fecha del recibo en formato YYYY-MM-DD." },
                    description: { type: Type.STRING, description: "Nombre del comercio o descripción breve." },
                    category: { type: Type.STRING, description: "La categoría de gasto sugerida." },
                },
            },
        },
    });

    const parsedResponse = JSON.parse(response.text);
    if (parsedResponse.date && !/^\d{4}-\d{2}-\d{2}$/.test(parsedResponse.date)) {
        parsedResponse.date = new Date().toISOString().split('T')[0];
    }
    return parsedResponse as ScannedReceiptData;

}, { description: "No se pudo analizar el recibo. Revisa la configuración de la API Key de Gemini o introduce los datos manualmente." });

export const getAIFinancialSummary = async (transactions: Transaction[]): Promise<string> => safeRun(async () => {
  const systemInstruction = `
    Eres un asesor financiero experto y amigable llamado ECOFinZ AI. Tu tarea es analizar un listado de las transacciones de los últimos 30 días y generar un resumen breve y útil en lenguaje natural.
    - Compara el gasto total con el ingreso total.
    - Señala la categoría con mayor gasto.
    - Ofrece una recomendación o un dato curioso.
    - El resumen debe ser corto, de 2 a 3 frases.
    - Formatea la respuesta en Markdown. Usa negritas para destacar cifras o categorías.
  `;
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const recentTransactions = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);
  if (recentTransactions.length === 0) return "No hay transacciones recientes para analizar.";

  const contents = `Datos de transacciones:\n${JSON.stringify(recentTransactions, null, 2)}`;
  const response = await ai!.models.generateContent({ model, contents, config: { systemInstruction, temperature: 0.6 } });
  return response.text;
}, "No se pudo generar el resumen. Revisa la configuración de la API Key de Gemini.");

export const getPredictiveAnalysis = async (financialData: string): Promise<string> => safeRun(async () => {
    const systemInstruction = `
    Eres un analista financiero predictivo llamado ECOFinZ AI. Tu tarea es analizar el historial financiero del usuario y realizar una previsión para los próximos 3 meses.
    - Estima los ingresos y gastos totales para cada uno de los próximos 3 meses.
    - Identifica tendencias clave (ej. "Tus gastos en Ocio tienden a aumentar un 15% en verano").
    - Proporciona un breve resumen de la previsión.
    - Usa un tono profesional pero accesible.
    - Formatea la respuesta usando Markdown (títulos, listas, tablas si es necesario).
  `;
    const contents = `Datos históricos:\n${financialData}`;
    const response = await ai!.models.generateContent({ model, contents, config: { systemInstruction, temperature: 0.5 } });
    return response.text;
}, "No se pudo generar la previsión. Revisa la configuración de la API Key de Gemini.");

export const getSavingsRecommendations = async (financialData: string): Promise<string> => safeRun(async () => {
    const systemInstruction = `
    Eres un asesor de finanzas personales llamado ECOFinZ AI. Tu misión es ayudar al usuario a ahorrar dinero.
    - Analiza el historial de gastos proporcionado.
    - Identifica las 3 principales categorías donde el usuario podría recortar gastos.
    - Para cada categoría, ofrece de 1 a 2 consejos concretos y accionables (ej. "Considera cambiar tu suscripción de 'Premium+' a 'Básica' para ahorrar X€/mes").
    - Si detectas gastos recurrentes elevados (recibos, seguros), sugiere buscar alternativas más económicas.
    - Finaliza con una frase de ánimo.
    - Usa un tono amigable y motivador.
    - Formatea la respuesta usando Markdown (títulos, listas con bullets, negritas).
  `;
    const contents = `Datos de gastos:\n${financialData}`;
    const response = await ai!.models.generateContent({ model, contents, config: { systemInstruction, temperature: 0.7 } });
    return response.text;
}, "No se pudieron generar las recomendaciones. Revisa la configuración de la API Key de Gemini.");

export const extractDataFromTaxPDF = async (
    base64Pdf: string,
    mimeType: string,
): Promise<TaxDraftData> => safeRun(async () => {
    const prompt = `
        Eres un experto asesor fiscal en España. Analiza el documento PDF adjunto, que es un borrador de la declaración de la renta (Modelo 100).
        Extrae los siguientes valores numéricos clave de las casillas correspondientes y devuélvelos en formato JSON.
        No incluyas el símbolo del euro ni separadores de miles, solo el número. Si un valor es negativo, inclúyelo.

        1.  **Ingresos brutos del trabajo**: Busca la casilla [0012] "Total ingresos íntegros computables".
        2.  **Retenciones por trabajo**: Busca la casilla [0021] o similar, referente a "Retenciones por rendimientos del trabajo".
        3.  **Gastos deducibles (Seguridad Social)**: Busca la casilla [0019] o similar, "Cotizaciones a la Seguridad Social".
        4.  **Resultado del borrador**: Busca la casilla [0595] o [0670], que es la "Cuota resultante de la autoliquidación". Si el valor es negativo (a devolver), el número debe ser negativo.
    `;
    const pdfPart = { inlineData: { data: base64Pdf, mimeType } };

    const response = await ai!.models.generateContent({
        model,
        contents: { parts: [pdfPart, { text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    grossIncome: { type: Type.NUMBER, description: "Valor de la casilla 0012. Ingresos brutos." },
                    withholdings: { type: Type.NUMBER, description: "Valor de la casilla 0021. Retenciones." },
                    socialSecurity: { type: Type.NUMBER, description: "Valor de la casilla 0019. Cotizaciones a la SS." },
                    draftResult: { type: Type.NUMBER, description: "Valor de la casilla 0595 o 0670. Resultado final." }
                },
                required: ["grossIncome", "withholdings", "socialSecurity", "draftResult"],
            },
        },
    });

    return JSON.parse(response.text) as TaxDraftData;

}, {
    grossIncome: 0,
    withholdings: 0,
    socialSecurity: 0,
    draftResult: 0,
});

export const getTaxAdvice = async (
    draftData: TaxDraftData,
    questionnaire: TaxQuestionnaire,
    deductibleReceipts: Receipt[]
): Promise<{ advice: string; deductions: TaxDeduction[] }> => safeRun(async () => {
    const systemInstruction = `
    Eres un asesor fiscal experto en la declaración de la renta (IRPF) en España. Tu objetivo es analizar los datos del borrador y un cuestionario detallado para encontrar deducciones y optimizaciones.

    Basado en el cuestionario, identifica todas las deducciones aplicables. Para cada una, calcula el impacto estimado en la cuota final (el ahorro).

    Reglas de cálculo (usa un tipo marginal medio del 30% para estimar reducciones de base):
    - **Mínimo por descendientes**: 2400€ por el 1º, 2700€ por el 2º, 4000€ por el 3º, 4500€ por el 4º y siguientes. Aumento por menores de 3 años: 2800€. Impacto = (deducción) * 0.30.
    - **Mínimo por ascendientes**: 1150€ por mayor de 65, +1400€ si > 75. Impacto = (deducción) * 0.30.
    - **Mínimo por discapacidad**: Depende del grado, pero estima un impacto medio de 900€ si hay discapacidad.
    - **Vivienda habitual (hipoteca < 2013)**: Deducción del 15% sobre la cantidad pagada (housing_mortgage_paidAmount), con un máximo de 9040€ de base. Impacto = min(aportado, 9040) * 0.15. Solo si housing_mortgage_boughtBefore2013 es true.
    - **Alquiler de vivienda habitual**: Deducción estatal del 10.05% para contratos anteriores a 2015 y base < 24107€. Simplifica y aplica una deducción del 5% del importe anual pagado si el contrato es antiguo.
    - **Ingresos por alquiler (como arrendador)**: Si existe el array 'rented_properties' y no está vacío, suma el rendimiento neto de cada propiedad (ingresos - gastos). Sobre el total de rendimientos netos, aplica una reducción del 60%. Esto *aumentará* lo que hay que pagar. Impacto = (rendimiento_neto_total * 0.40) * 0.30 (tipo marginal). El impacto es negativo (aumenta el pago). En el texto del consejo, **menciona las propiedades por su nombre ('name')**.
    - **Gastos deducibles (facturas)**: Si 'work_autonomousExpenses' > 0, es un gasto deducible. **DEBES OBLIGATORIAMENTE** crear una entrada en el array 'deductions' para 'Gastos Deducibles (Facturas)'. El impacto es 'work_autonomousExpenses * 0.30'.
    - **Planes de pensiones**: Reducen la base imponible. Impacto = min(aportado, 1500) * 0.30.
    - **Donativos a ONGs**: 80% de deducción para los primeros 250€. 40% para el resto. Impacto = (min(donado, 250) * 0.80) + (max(0, donado - 250) * 0.40).
    - **Cuotas sindicales**: Reducen la base imponible. Impacto = (cuota_pagada) * 0.30.
    - **Deducciones autonómicas (guardería, gimnasio, etc.)**: Estima el impacto como el 15% del total de estos gastos.
    - **Familia numerosa**: Deducción fija de 1200€ (general) o 2400€ (especial).

    Proporciona un consejo general en formato Markdown, explicando los hallazgos de forma clara y amigable.
    En tu respuesta de 'advice' en Markdown, **ES OBLIGATORIO** que incluyas una sección titulada '### Desglose de Gastos Deducibles' y listes cada factura del array 'deductibleReceipts' que te proporciono, mostrando su título ('title') y su importe ('amount'). Si el array está vacío, indica que no hay gastos desglosados.

    Devuelve tu análisis únicamente en formato JSON.
    `;
    const contents = `DATOS:\n${JSON.stringify({ draftData, questionnaire, deductibleReceipts }, null, 2)}`;
    
    const response = await ai!.models.generateContent({
        model,
        contents,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    advice: {
                        type: Type.STRING,
                        description: "Un resumen en formato Markdown con consejos y explicaciones sobre las deducciones aplicadas y otros consejos fiscales, incluyendo el desglose de facturas."
                    },
                    deductions: {
                        type: Type.ARRAY,
                        description: "Un array de objetos, cada uno representando una deducción aplicable.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                description: {
                                    type: Type.STRING,
                                    description: "Descripción clara de la deducción (ej: 'Donativo a ONG')."
                                },
                                amount: {
                                    type: Type.NUMBER,
                                    description: "La cantidad base de la deducción (ej: el importe donado)."
                                },
                                impactOnResult: {
                                    type: Type.NUMBER,
                                    description: "El impacto estimado en la cuota final. Positivo si reduce el pago (ahorro), negativo si lo aumenta (ej: ingresos no declarados)."
                                }
                            },
                            required: ["description", "amount", "impactOnResult"]
                        }
                    }
                },
                required: ["advice", "deductions"]
            }
        }
    });

    return JSON.parse(response.text) as { advice: string; deductions: TaxDeduction[] };

}, {
    advice: "No se pudo realizar el análisis fiscal. Revisa la configuración de la API Key de Gemini.",
    deductions: []
});


// --- AI Chat Assistant Service ---

export const getChatResponseWithTools = async (
  currentMessage: string, 
  chatHistory: { role: string, parts: { text: string }[] }[],
  categories: { income: string[], expense: string[]}
) => safeRun(async () => {
    const tools = [{
        functionDeclarations: [
            {
                name: "addTransaction",
                description: "Añade una nueva transacción de ingreso o gasto. La fecha por defecto es hoy si no se especifica. El tipo (type) debe ser 'income' o 'expense'.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        type: {
                            type: Type.STRING,
                            enum: ["income", "expense"],
                            description: "El tipo de transacción."
                        },
                        amount: {
                            type: Type.NUMBER,
                            description: "El importe de la transacción."
                        },
                        category: {
                            type: Type.STRING,
                            description: `La categoría de la transacción. Debe ser una de las siguientes: Ingresos: ${categories.income.join(', ')}. Gastos: ${categories.expense.join(', ')}.`,
                        },
                         description: {
                            type: Type.STRING,
                            description: "Una descripción opcional de la transacción."
                        },
                    },
                    required: ["type", "amount", "category"]
                }
            }
        ]
    }];

    const response = await ai!.models.generateContent({
        model,
        contents: [...chatHistory, { role: 'user', parts: [{ text: currentMessage }] }],
        config: {
            tools,
        }
    });
    
    return response;
}, null);