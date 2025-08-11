





import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Card, Button, Input, ProgressBar } from './common/UIComponents.tsx';
import { IconAcademicCap, IconArrowDown, IconArrowUp, IconArrowLeft, IconGoals, IconBookOpen, IconDocumentText, IconScale } from '../constants.tsx';
import { EducationMilestone } from '../types.ts';
import { NavLink } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


// Type definitions for Education content
interface EducationSubsection {
    name: string;
    description: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    component: React.FC;
}

interface EducationSection {
    name: string;
    description: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    subsections: Record<string, EducationSubsection>;
}

// =================================================================
// START: Content for "Pirámide de la Riqueza"
// =================================================================

const LEVEL_DATA = [
    { 
        title: 'Nivel 1: El Conocimiento es Poder', 
        description: 'Aprende los fundamentos sobre finanzas, inversión y economía. Construye una base sólida para tu futuro. Marca las siguientes tareas una vez que hayas interiorizado los conceptos.',
        tasks: {
            checklist: [
                "Comprendo la diferencia fundamental entre un activo (pone dinero en mi bolsillo) y un pasivo (saca dinero de mi bolsillo).",
                "Entiendo el poder del interés compuesto y cómo puede hacer crecer mi dinero con el tiempo.",
                "He reflexionado sobre la importancia de la diversificación para reducir el riesgo en mis futuras inversiones.",
                "Tengo una idea clara de por qué es importante crear un presupuesto y controlar mis gastos.",
            ]
        }
    },
    { 
        title: 'Nivel 2: Desarrolla tus Habilidades', 
        description: 'Convierte el conocimiento teórico en habilidades prácticas y medibles. Aprende a analizar, decidir y ejecutar.',
        tasks: {
            checklist: [
                "Identifica 3 habilidades de alta demanda en tu sector y crea un plan para aprender una de ellas.",
                "Completa un curso online (gratuito o de pago) sobre una habilidad financiera (ej. análisis de datos, contabilidad básica).",
                "Utiliza la calculadora de Interés Compuesto para simular dos escenarios de inversión diferentes.",
                "Analiza una empresa que cotice en bolsa: lee su informe anual y escribe 3 pros y 3 contras para invertir en ella."
            ]
        }
    },
    { 
        title: 'Nivel 3: Construye tu Red de Contactos', 
        description: 'Tu red es tu mayor activo. Amplía y cuida tus relaciones estratégicas con mentores, socios y colaboradores.',
        tasks: {
             checklist: [
                "Asiste a un evento (online o presencial) relacionado con tu sector profesional o de inversión.",
                "Contacta a 3 personas en LinkedIn cuyo trabajo admires y pídeles un consejo de 5 minutos.",
                "Identifica a un posible mentor y envíale un correo presentándote y explicando por qué valoras su trabajo.",
                "Aporta valor en un grupo o comunidad online (ej. Reddit, foro especializado) respondiendo una pregunta."
            ]
        }
    },
    { 
        title: 'Nivel 4: Adquiere y Gestiona Recursos', 
        description: 'Aprende a conseguir y gestionar los recursos necesarios para crecer, como capital, herramientas y tiempo.',
        tasks: {
            checklist: [
                "Crea un presupuesto detallado de tus finanzas personales usando la sección 'Presupuestos' de la app.",
                "Define una meta de ahorro específica para inversión en la sección 'Metas'.",
                "Investiga 2 fuentes de financiación para un proyecto (ej. préstamos, business angels, subvenciones).",
                "Automatiza una parte de tus finanzas (ej. transferencia automática a cuenta de ahorro/inversión)."
            ]
        }
    },
    { 
        title: 'Nivel 5: Forja tu Reputación', 
        description: 'Mantén la confianza, la credibilidad y la integridad a largo plazo. Tu reputación te abrirá todas las puertas.',
        tasks: {
            milestones: {
                title: "Mis Hitos Financieros y Profesionales"
            }
        }
    },
];

const Checklist: React.FC<{ level: number }> = ({ level }) => {
    const { educationProgress, updateEducationProgress } = useApp();
    const checklistData = LEVEL_DATA[level - 1].tasks.checklist!;
    const checkedState = educationProgress.checklistStates[level] || Array(checklistData.length).fill(false);
    
    const handleToggle = (index: number) => {
        const newCheckedState = [...checkedState];
        newCheckedState[index] = !newCheckedState[index];
        updateEducationProgress({
            checklistStates: { ...educationProgress.checklistStates, [level]: newCheckedState }
        });
    };

    const isCompleted = checkedState.every(Boolean);

    useEffect(() => {
        if (isCompleted && educationProgress.completedLevel < level) {
            updateEducationProgress({ completedLevel: level });
        }
    }, [isCompleted, level, educationProgress.completedLevel, updateEducationProgress]);
    
    return (
        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
            <h4 className="font-bold text-lg mb-4">Ejercicios Prácticos</h4>
            <div className="space-y-3 mb-6">
                {checklistData.map((item, index) => (
                    <label key={index} className="flex items-start space-x-3 p-3 rounded-md bg-slate-800 hover:bg-slate-700 cursor-pointer transition-colors">
                        <input type="checkbox" checked={checkedState[index]} onChange={() => handleToggle(index)} className="h-5 w-5 mt-0.5 rounded border-slate-500 bg-slate-900 text-primary focus:ring-primary flex-shrink-0"/>
                        <span className={`text-slate-300 ${checkedState[index] ? 'line-through text-slate-500' : ''}`}>{item}</span>
                    </label>
                ))}
            </div>
            {educationProgress.completedLevel < level && (
                 <p className="text-sm text-slate-400">
                    {isCompleted ? '¡Nivel Completado! El siguiente nivel está desbloqueado.' : 'Completa todas las tareas para avanzar.'}
                </p>
            )}
             {educationProgress.completedLevel >= level && (
                <p className="text-secondary font-semibold">¡Felicidades! Has completado el Nivel {level}.</p>
            )}
        </div>
    );
};

const MilestoneTracker: React.FC<{ level: number }> = ({ level }) => {
    const { educationProgress, updateEducationProgress } = useApp();
    const [newMilestone, setNewMilestone] = useState('');

    const handleAddMilestone = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMilestone.trim()) return;
        const milestone: EducationMilestone = {
            id: crypto.randomUUID(),
            text: newMilestone.trim(),
            date: new Date().toISOString()
        };
        updateEducationProgress({
            milestones: [...educationProgress.milestones, milestone]
        });
        setNewMilestone('');
    };
    
    useEffect(() => {
        if (educationProgress.milestones.length > 0 && educationProgress.completedLevel < level) {
             updateEducationProgress({ completedLevel: level });
        }
    }, [educationProgress.milestones, level, educationProgress.completedLevel, updateEducationProgress]);

    return (
        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
            <h4 className="font-bold text-lg mb-4">{LEVEL_DATA[level-1].tasks.milestones!.title}</h4>
            <form onSubmit={handleAddMilestone} className="flex gap-2 mb-4">
                <Input label="" placeholder="Ej: He conseguido mi primer cliente freelance" value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} className="!mb-0 flex-grow"/>
                <Button type="submit">Añadir Hito</Button>
            </form>
            <div className="space-y-2">
                {educationProgress.milestones.length > 0 ? (
                    educationProgress.milestones.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => (
                        <div key={m.id} className="p-3 bg-slate-800 rounded-md">
                            <p className="text-slate-200">{m.text}</p>
                            <p className="text-xs text-slate-500 text-right">{new Date(m.date).toLocaleDateString()}</p>
                        </div>
                    ))
                ) : <p className="text-slate-400 text-center py-4">Añade tu primer hito para empezar.</p>}
            </div>
        </div>
    );
};

const LevelContent: React.FC<{level: number}> = ({ level }) => {
    const data = LEVEL_DATA[level - 1];
    if (!data) return null;
    return (
        <div className="mt-4">
            <p className="mb-4 text-slate-300">{data.description}</p>
            {data.tasks.checklist && <Checklist level={level} />}
            {data.tasks.milestones && <MilestoneTracker level={level} />}
        </div>
    );
};

const PiramideRiquezaContent: React.FC = () => {
    const { activeView, educationProgress } = useApp();
    const [expandedLevel, setExpandedLevel] = useState<number | null>(1);
    
    const canAccess = (level: number) => {
        if (activeView.type === 'group') return false;
        return level <= educationProgress.completedLevel + 1;
    }
    
    const isCompleted = (level: number) => {
         if (activeView.type === 'group') return false;
         return level <= educationProgress.completedLevel;
    }

    const toggleLevel = (level: number) => {
        if (!canAccess(level)) return;
        setExpandedLevel(prev => prev === level ? null : level);
    }
    
    const progressPercentage = (educationProgress.completedLevel / LEVEL_DATA.length) * 100;

    return (
        <div className="space-y-6">
            <Card>
                <h3 className="text-lg font-semibold mb-2">Progreso en la Pirámide</h3>
                <ProgressBar value={progressPercentage} colorClass="bg-primary" />
                <p className="text-right text-sm mt-1 text-slate-400">{educationProgress.completedLevel} de {LEVEL_DATA.length} niveles completados</p>
            </Card>

            {activeView.type === 'group' ? (
                <Card className="text-center py-10">
                    <p className="text-slate-400">La sección de Educación es un viaje personal y no está disponible en la vista de grupo.</p>
                     <p className="text-slate-400 mt-2">Por favor, cambia a un perfil individual para continuar tu formación.</p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {LEVEL_DATA.map((level, index) => {
                        const levelNum = index + 1;
                        const isAccessible = canAccess(levelNum);
                        const isDone = isCompleted(levelNum);

                        return (
                            <div key={levelNum} className={`rounded-lg transition-all duration-300 ${isAccessible ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
                                <button 
                                    onClick={() => toggleLevel(levelNum)}
                                    disabled={!isAccessible}
                                    className="w-full text-left p-4 flex items-center gap-4"
                                    aria-expanded={expandedLevel === levelNum}
                                    aria-controls={`level-content-${levelNum}`}
                                >
                                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-2xl
                                        ${isDone ? 'bg-secondary text-black' : isAccessible ? 'bg-primary text-black' : 'bg-slate-700 text-slate-500'}`}>
                                        {isAccessible ? levelNum : '🔒'}
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className={`font-bold text-lg ${isAccessible ? 'text-white' : 'text-slate-500'}`}>{level.title}</h3>
                                    </div>
                                    {isAccessible && (expandedLevel === levelNum ? <IconArrowUp className="w-6 h-6"/> : <IconArrowDown className="w-6 h-6"/>)}
                                </button>
                                {isAccessible && expandedLevel === levelNum && (
                                    <div id={`level-content-${levelNum}`} className="px-4 pb-4">
                                        <LevelContent level={levelNum} />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

// =================================================================
// END: Content for "Pirámide de la Riqueza"
// =================================================================


// =================================================================
// START: Content for "Seminario Fenix"
// =================================================================

const SEMINARIO_CONTENT = `I. Fundamentos del Éxito
• Instinto de Éxito: Los humanos poseen un instinto natural hacia el éxito, impulsado por el deseo de ser, tener y hacer más.
• Siete Ingredientes del Éxito:
    1. Paz Mental: La base más importante, que implica sentirse contento, en paz y libre de miedos, estrés y emociones negativas.
    2. Salud y Energía: Crucial para disfrutar la vida, con una fuerte correlación entre la paz mental y la salud física (psicosomática).
    3. Relaciones Amorosas: El 85% del éxito y los problemas en la vida están determinados por la calidad de las relaciones interpersonales. La risa es un indicador clave de una relación sana.
    4. Libertad Financiera: Tener suficiente dinero para no preocuparse por él, permitiendo enfocarse en aspectos superiores de la vida.
    5. Metas e Ideales Valiosos: Proporcionan un sentido de significado y propósito, siendo críticos para la felicidad.
    6. Autoconocimiento y Autocomprensión: Entenderse a sí mismo, sus motivaciones y ser honesto con sus fortalezas y debilidades.
    7. Sentido de Realización Personal: La sensación de actualizar el propio potencial, de convertirse en todo lo que uno es capaz de ser (autorrealización).
II. La Fórmula del Logro (C x E = R)
• Comprensión x Esfuerzo = Resultados: El éxito depende de comprender "cómo hacer bien las cosas" (Comprensión) y aplicar el esfuerzo necesario y correcto (Esfuerzo). Este curso es un "manual de instrucciones" para el éxito.
III. Leyes Mentales Clave Estas leyes rigen la vida y el éxito, siendo tan predecibles como las leyes físicas:
• Ley del Control: Uno se siente bien en la medida en que siente que controla su propia vida y sus pensamientos.
• Ley del Accidente: Al fallar en planear, se planea fallar. Describe cómo vive el 80% de la población, sin planes claros ni metas fijas, sintiendo que su vida es controlada por fuerzas externas.
• Ley de Causa y Efecto (Ley de Acero del Universo): Todo lo que sucede en el universo ocurre por una razón específica. Los pensamientos son causas y las condiciones son efectos. Para cambiar una condición, hay que cambiar el pensamiento que la causó.
• Ley de la Creencia: Lo que uno cree con fuerza, especialmente si se le añade emoción, se convierte en realidad. Las creencias actúan como un filtro, afectando la percepción de oportunidades.
• Ley de la Expectativa: Lo que se espera con confianza, tiende a hacerse realidad, incluso si la información es falsa. Las expectativas positivas son clave para el éxito (actitud del ganador). Las expectativas de padres, jefes y de uno mismo son muy influyentes.
• Ley de la Atracción: Uno es un "imán viviente" y atrae inevitablemente a su vida a personas y circunstancias que están en armonía con sus pensamientos dominantes.
• Ley de la Correspondencia: El mundo exterior de uno es un espejo que refleja lo que está ocurriendo en el mundo interior. Para cambiar lo externo, hay que cambiar lo interno.
• Ley de la Actividad Subconsciente: Lo que se planta en la mente subconsciente se pone a trabajar para convertirlo en realidad, haciendo que palabras y acciones encajen con el autoconcepto y las metas.
• Ley de la Concentración: Lo que se piensa una y otra vez crece en realidad.
• Ley de la Sustitución: La mente consciente solo puede tener un pensamiento a la vez (positivo o negativo). Se pueden reemplazar pensamientos negativos con positivos, debilitando los miedos y fomentando los deseos.
IV. Potencial Humano y Autoconcepto
• Fórmula del Potencial Humano: Atributos Innatos (Ai) x Atributos Adquiridos (Aa) x Actitud (At) = Potencial Humano Individual (PHI). La actitud es el factor más modificable y multiplicador.
• El Autoconcepto: Es el programa central de la mente, un grupo de creencias, valores y sentimientos sobre uno mismo. Determina la eficacia y el desempeño.
    ◦ Ideal Propio: La persona que uno más desearía ser.
    ◦ Autoimagen: Cómo se ve uno a sí mismo actualmente.
    ◦ Autoestima: Cuánto se agrada uno a sí mismo, siendo el motor del autoconcepto y determinante del desempeño. Se eleva repitiendo "Me agrada mi persona".
• Orígenes del Autoconcepto: Se forma desde la niñez, influenciado por el amor y la aprobación de los padres. La crítica destructiva y la falta de amor son las principales causas de los problemas de autoconcepto.
V. Eliminación de Emociones Negativas
• Raíces de las Emociones Negativas: La justificación y la identificación (tomar las cosas personalmente). El tronco que las sostiene es la culpa.
• Asumir Responsabilidad: La clave para eliminar las emociones negativas es dejar de culpar a otros y aceptar la responsabilidad total por la propia vida. Decir "Soy responsable" al instante libera las emociones negativas.
• Perdón: Es la clave para la salud mental. Perdonar a los padres, a otros y a uno mismo, y disculparse cuando se ha herido a alguien, libera la culpa y el resentimiento.
• Temores al Fracaso y al Rechazo: Son respuestas condicionadas de la niñez. Se superan haciendo lo que se teme ("Haz aquello que temes y la muerte del temor es segura") y afirmando "Puedo hacerlo".
• Imaginación Negativa (Preocupación): La preocupación es una "fantasía que se vuelve real".
    ◦ Antídotos: Vivir un día a la vez, obtener los hechos y usar el "Destructor de Preocupaciones".
    ◦ Destructor de Preocupaciones: 1) Definir claramente el problema. 2) Determinar el peor desenlace posible. 3) Prepararse para aceptar lo peor. 4) Comenzar a mejorar lo peor. El antídoto final es actuar con un propósito.
VI. Reprogramación de la Mente para el Éxito
• Poder de la Sugestión: Todo lo que entra en la mente (lectura, conversaciones, medios) afecta el subconsciente y el potencial. Todo cuenta.
• Ley del Hábito: El 95% de lo que hacemos es por costumbre. Los hábitos de éxito conducen al éxito.
• Ley de la Emoción: Todas las decisiones se basan en la emoción. La emoción más fuerte dominará la más débil.
• Ley de la Reversibilidad: Si se crea artificialmente el sentimiento de éxito (estado subjetivo), la Ley de Atracción y Correspondencia se activará para crear el éxito objetivo.
• Ley de la Práctica (Dieta Mental de 21 Días): Repetir algo una y otra vez (pensar, hablar, visualizar lo que se desea) por 21 días, convierte un nuevo comportamiento o pensamiento en un hábito.
• Cuatro Pilares para el Cambio:
    1. Deseo: La intensidad del deseo ardiente es clave para superar dificultades.
    2. Decisión: Tomar una decisión clara e inequívoca de comprometerse al 100%.
    3. Determinación: Persistir ante la adversidad y los obstáculos.
    4. Disciplina: La "llave maestra hacia la riqueza", la capacidad de hacer lo que se debe, cuando se debe, nos guste o no.
VII. Técnicas de Programación Mental
• Visualización: Crear imágenes mentales claras y vívidas de la persona deseada o del resultado ya logrado.
• Afirmación: Declaraciones personales, positivas y en tiempo presente ("Yo soy...", "Yo gano...") dichas con emoción.
• Verbalización: Decir las afirmaciones en voz alta para aumentar su impacto.
• Asumir el Papel: Actuar como si ya se tuviera la cualidad o el éxito deseado. La acción genera la emoción.
• Técnica de Programación por Escrito: Reescribir las metas cada mañana para programarlas en el subconsciente.
• Técnica de Afirmación Rápida: Visualizar el resultado perfecto y afirmarlo con emoción antes de un evento importante.
• Repaso Mental: Revivir experiencias pasadas de éxito o imaginar el desempeño perfecto antes de un evento.
• Ley de la Relajación: En trabajos mentales, menos esfuerzo produce mejores resultados.
• Afirmaciones en Cinta: Grabar metas con música relajante y escucharlas en un estado de relajación para programar el subconsciente.
VIII. Desarrollo de la Inteligencia y Superaprendizaje
• Inteligencia como Forma de Actuar: La inteligencia se desarrolla con el esfuerzo y la práctica, no solo el CI.
• Cuatro Claves de los Genios:
    1. Claridad: Saber exactamente lo que se quiere, cuáles son los problemas y los resultados deseados.
    2. Concentración: Enfocarse al 100% en una sola cosa importante a la vez.
    3. Mente Abierta: Estar dispuesto a considerar múltiples enfoques y cuestionar suposiciones.
    4. Método Sistemático: Usar metodologías organizadas para la resolución de problemas.
• Técnicas de Pensamiento Creativo:
    ◦ Tormenta Mental (Método de las 20 Ideas): Escribir 20 formas diferentes de lograr una meta o resolver un problema y actuar sobre una de ellas.
    ◦ Expectativas Confiables: Asumir una solución lógica y realizable.
    ◦ Lenguaje Positivo: Usar palabras como "situación", "desafío", "oportunidad" en lugar de "problema".
    ◦ Proceso de Resolución de Problemas: Definir, investigar, intentar resolver, pasarlo al superconsciente, actuar inmediatamente, identificar responsabilidades y límites, actuar, inspeccionar.
IX. Establecimiento y Logro de Metas (La Habilidad Maestra del Éxito)
• Importancia de las Metas: El éxito son las metas, todo lo demás son comentarios. Solo un 3% de la población tiene metas claras y escritas.
• Razones por las que no se Establecen Metas: No reconocer su importancia, no saber cómo hacerlo, miedo al rechazo, y el principal: miedo al fracaso.
• El Fracaso es Esencial: Es imposible lograr algo sin fracasar. El fracaso es parte indispensable del éxito. Las personas de éxito "duplican su tasa de fracasos".
• Proceso de 12 Pasos para el Logro de Metas:
    1. Deseo: Que sea ardiente y personal.
    2. Creer: Que la meta es posible y creíble para uno.
    3. Escribir: Claramente y en detalle.
    4. ¿Por qué?: Identificar las razones, que son el combustible para el logro.
    5. Analizar la Posición: Conocer las fortalezas, debilidades y punto de partida.
    6. Establecer un Límite: Con mini-límites y un horario de recompensas.
    7. Identificar Obstáculos: Reconocer que son parte del éxito y priorizar la "roca" (el mayor obstáculo).
    8. Identificar Conocimiento: Determinar qué información se necesita y cómo adquirirla.
    9. Identificar al Cliente: Saber de quién se necesita cooperación (clientes internos y externos). La Ley de Compensación y la Ley de Servicio son clave: "Siempre haz más de lo que te pagan".
    10. Hacer un Plan: Una lista de actividades organizada por prioridad y tiempo.
    11. Visualización: Crear una imagen mental clara del resultado final.
    12. Determinación y Persistencia: La cualidad del acero, la habilidad de aguantar más que nadie.
X. Administración del Tiempo
• Control de la Secuencia de Eventos: El estrés viene de no controlar el tiempo.
• Siete Claves:
    1. Metas Claras y Específicas: Definidas en términos de resultados deseados.
    2. Planes por Escrito: Listas de actividades para cada meta.
    3. Hacer una Lista: Pensar en papel y consolidar las tareas.
    4. Establecer Prioridades: Usar la regla 80/20 y el sistema ABCDE. Pregunta clave: "¿Cuál es el uso más valioso de mi tiempo ahora?".
    5. Concentración del Poder: Hacer "primero lo primero" y no soltar hasta terminarlo al 100%.
    6. Acabar con la Dilación: Usar la afirmación "Hazlo ahora" y desarrollar un sentido de urgencia.
    7. Equilibrio: Mantener la vida balanceada entre trabajo, relaciones y valores personales.
XI. La Mente Superconsciente
• Fuente de Genialidad: Es la fuente de toda inspiración, motivación, intuición y creatividad. Tiene acceso a todos los datos almacenados en el subconsciente y a datos externos.
• Funcionamiento: Opera 24/7 en segundo plano, resolviendo problemas automáticamente. Libera motivación orientada a metas. Responde a órdenes claras y autoritarias (afirmaciones, decisiones). Crece con el uso y la creencia.
• Activación: Se activa mejor bajo condiciones de concentración total en el problema y distracción total (alternando). Responde con mayor confianza bajo expectativas positivas.
• Soluciones Superconscientes: Llegan completas, simples ("un destello cegador de lo obvio"), acompañadas de gozo y energía. Requieren actuar de inmediato.
• Ley de la Actividad Superconsciente: Cualquier pensamiento, meta o idea que se mantenga continuamente en la mente consciente, con deseo intenso, debe hacerse realidad por la mente superconsciente.
• Método Maestro de Activación: La soledad activa (sentarse tranquilamente en silencio de 30 a 60 minutos).
XII. Salud y Energía
• El Cuerpo, una Máquina Duradera: Diseñado para vivir de 100 a 120 años. La salud es energía.
• Siete Claves para Alta Vitalidad:
    1. Peso Adecuado: Reduce la carga física y la depresión psicológica.
    2. Dieta Adecuada: Variada, con proteína de fuente de apoyo (15%) y carbohidratos con base de fibra (75%), y poca grasa (10%). Mucha agua (64 onzas/día). Comer poco pero nutritivo.
    3. Combinación Apropiada de Alimentos: Evitar almidones y proteínas al mismo tiempo para mejorar la digestión y aumentar la energía. Eliminar azúcares, harinas blancas y exceso de sal.
    4. No Fumar y Consumo Moderado de Alcohol: Fumar es la peor acción voluntaria para la salud.
    5. Ejercicio Apropiado (Aeróbicos): Aumenta el oxígeno en el cerebro, la inteligencia, la creatividad y los niveles de energía.
    6. Descanso Apropiado: De 7 a 8 horas de sueño son importantes. Es posible reducir la necesidad de sueño programando la mente.
    7. Suplementos Naturales de Vitaminas y Minerales: Compensan las deficiencias nutricionales de los alimentos modernos.
XIII. Desarrollo de una Personalidad de Éxito y Relaciones
• Importancia de las Relaciones: El 85% de la felicidad y los problemas en la vida provienen de la calidad de las relaciones.
• Medidas de una Personalidad Saludable: Buena opinión de uno mismo, aceptación de responsabilidad, facilidad para perdonar, expectativas positivas y buena relación con otros.
• Hacer Sentir Importantes a los Demás: Elevando la autoestima de otros, se eleva la propia.
• Siete Métodos para Hacer Sentir Importante a Otros:
    1. Eliminar la Crítica Destructiva: Nunca pisotear a otros, especialmente a los niños.
    2. Ser Accesible: No discutir, buscar entender primero.
    3. Aceptación: Sonreír y aceptar incondicionalmente a la otra persona.
    4. Reconocimiento (Apreciación): Usar la palabra "Gracias" y ser amable y cortés.
    5. Admiración: Reconocer y apreciar las virtudes o posesiones de otros.
    6. Aprobación: Elogiar de forma inmediata, específica y pública.
    7. Atención (Escuchar): Escuchar atentamente, hacer pausas y preguntar para aclarar.
• Regla de Oro: Tratar a los demás como uno desea ser tratado.
XIV. Relaciones Exitosas (Parejas)
• Seis Claves:
    1. Similitudes Atraen: Importante en valores, dinero, sexo, tiempo libre, ideas y temperamento.
    2. Opuestos Atraen (solo en Temperamento): Una persona extrovertida con una introvertida pueden ser compatibles.
    3. Entrega: Compromiso absoluto del 100% al desarrollo del potencial del otro.
    4. Conceptos Similares de Uno Mismo: Las personas con niveles similares de autoestima son más compatibles.
    5. Agrado y Respeto: Más duradero que solo el "estar enamorado".
    6. Comunicación: Alta calidad y cantidad de tiempo de conversación ininterrumpida. Los hombres no leen la mente y las mujeres tienden a ser indirectas; es crucial ser más directo y escuchar.
• Problemas Comunes y Soluciones:
    ◦ Falta de Entrega: Compromiso del 100%.
    ◦ Tratar de Cambiar al Otro: Aceptar a la persona tal como es. "Lo que uno ve es lo que tiene".
    ◦ Celos: Desarrollar el autoconcepto y la autoestima.
    ◦ Autocompasión: Mantenerse ocupado y fijar metas.
    ◦ Incompatibilidad: Aceptarla, recordar que nadie es culpable y buscar una resolución digna si no se puede reparar.
XV. Cómo Formar Superniños (Paternidad)
• Rol del Padre: Nutrir a los hijos para construir una alta autovaloración en ellos hasta la edad adulta.
• Siete Medidas Clave:
    1. Eliminar la Crítica Destructiva: Nunca pisar la autoestima del niño. No decir nada que no se quiera que sea parte de su personalidad.
    2. Amor Ininterrumpido: Los niños necesitan un flujo continuo de amor y aprobación. La privación de amor es causa de problemas psicológicos.
    3. Elogio, Aliento y Refuerzo: Necesitan ser elogiados, alentados, y que se refuercen sus logros con paciencia, dulzura y amabilidad.
    4. Decir "Te Amo": Expresar el amor verbalmente todos los días.
    5. Amor Incondicional: Que el niño sepa que es amado al 100% pase lo que pase.
    6. Contacto Físico: Abrazar, besar, tocar. Es vital para el bienestar emocional y físico.
    7. Atención Centrada: Pasar tiempo exclusivo con el niño diariamente.
    8. Expectativas Positivas: Creer en ellos y expresarlo ("Yo creo en ti, lo harás bien").
    9. Enseñar "Me Gusta lo que Soy": Los niños con alta autoestima son más populares, aprenden mejor y tienen mayor resistencia a la presión negativa.
• Corregir el Pasado: Pedir perdón a los hijos por la crítica destructiva pasada, asumir total responsabilidad y prometer no repetirlo. Esto puede transformar la personalidad del niño y la dinámica familiar.
XVI. El Propósito de la Vida
• Encontrar la Misión: El verdadero propósito es desarrollar el potencial para encontrar una misión que ennoblezca y beneficie a otros.
• Convertirse en una Persona Llena de Amor: Los grandes modelos de la humanidad (Jesús, Buda, Madre Teresa) se esforzaron por estar llenos de amor y servicio a otros.
• Siete Claves para Estar Lleno de Amor:
    1. Aceptarse a sí mismo incondicionalmente.
    2. Aceptar total responsabilidad por la vida.
    3. Aprender a perdonar.
    4. Llenar la mente de pensamientos de amor.
    5. Fijarse metas nobles y luchar por ellas.
    6. Cuidar bien el cuerpo.
    7. Practicar la Regla de Oro (bondad, paciencia, tolerancia, compasión).
• La Ley de la Compensación: "Mientras más des, más tendrás; nunca se da sin recibir". Lo que se hace con amor es lo único que perdura.
• Amor vs. Miedo: Si el miedo es el obstáculo para el potencial, el amor es la gran puerta que abre todas las posibilidades.
Este seminario proporciona un marco integral para el crecimiento personal y el logro, enfatizando la responsabilidad individual, el poder de la mente y la importancia de las relaciones y el servicio a los demás.`;

const parseSeminarioContent = (text: string) => {
    const sections = text.trim().split(/\n(?=[IVXLCDM]+\.\s)/);
    return sections.map(sectionText => {
        const lines = sectionText.trim().split('\n');
        const title = lines[0];
        const content = lines.slice(1).join('\n').trim()
            .replace(/•/g, '*')
            .replace(/◦/g, '  *');
        return { title, content };
    });
};

const SeminarioFenixResumenContent: React.FC = () => {
    const [openSection, setOpenSection] = useState<string | null>(null);
    const parsedContent = useMemo(() => parseSeminarioContent(SEMINARIO_CONTENT), []);

    const toggleSection = (title: string) => {
        setOpenSection(prev => prev === title ? null : title);
    };

    return (
        <div className="space-y-2">
            <p className="mb-4 text-slate-300">Este es un resumen estructurado del Seminario Fénix de Brian Tracy, enfocado en las leyes mentales y estrategias para reprogramar la mente hacia el éxito. Haz clic en cada sección para expandir y ver los detalles.</p>
            {parsedContent.map(({ title, content }) => (
                <div key={title} className="bg-slate-800 rounded-lg">
                    <button
                        onClick={() => toggleSection(title)}
                        className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-700/50"
                        aria-expanded={openSection === title}
                    >
                        <span className="font-bold text-lg text-primary">{title}</span>
                        {openSection === title ? <IconArrowUp className="w-6 h-6" /> : <IconArrowDown className="w-6 h-6" />}
                    </button>
                    {openSection === title && (
                        <div className="px-4 pb-4 border-t border-slate-700">
                            <div className="prose prose-sm prose-invert max-w-none text-slate-300 pt-3">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};


const LEYES_SEMINARIO_CONTENT = `Ley del control: Esta ley establece que uno se siente bien consigo mismo y positivo en la medida en que siente que está en control de su propia vida, y se siente negativo en la medida en que siente que no la está controlando. La clave del éxito es sentirse arquitecto de su propio destino y al mando de su vida, controlando sus pensamientos, que a su vez controlan sus sentimientos, acciones y, por ende, su éxito.
• Ley del accidente: Contraria a la ley del control, esta ley metafísica indica que al fallar en planear, se está planeando fallar. Las personas que viven bajo esta ley no tienen planes ni metas claras, y su vida parece ir a la deriva, lo que las lleva a sentirse con poco control e infelices.
• Ley de Causa y Efecto (también conocida como Ley de acero del universo o Ley de sembrar y cosechar): Para cada efecto en la vida, existe una causa específica; nada sucede por accidente. Los pensamientos son causas y las condiciones son efectos, lo que implica que para cambiar cualquier condición en su vida, debe cambiar los pensamientos que las originan.
• Ley de la Creencia: Lo que uno cree con fuerza se convierte en su realidad. Nuestras creencias actúan como un filtro, descartando información inconsistente y formando nuestras realidades.
• Ley de la Expectativa: Lo que uno espera, se consigue. Las expectativas, especialmente aquellas que se mantienen con confianza, tienden a hacerse realidad, incluso si la información en la que se basan es falsa.
• Ley de la Atracción: Somos un imán viviente y atraemos inevitablemente a nuestra vida a personas y circunstancias que están en armonía con nuestros pensamientos dominantes.
• Ley de la Correspondencia: El mundo exterior de una persona es un espejo que refleja lo que está sucediendo en su mundo interior. Para cambiar el mundo exterior, se debe cambiar el mundo interior.
• Ley del Hábito: En ausencia de una decisión específica para cambiar un aspecto de la vida, la tendencia natural es continuar en el mismo camino indefinidamente. Aproximadamente el 95% de lo que hacemos es por costumbre.
• Ley de la Emoción: Todas las decisiones que tomamos son emocionales, y la emoción más fuerte domina a la más débil.
• Ley de la Expresión: Lo que está impreso en la psique de una persona, mezclado con emoción y puesto en su autoconcepto, eventualmente se expresará como parte de su personalidad y realidad. Uno ve el mundo a través de su autoconcepto.
• Ley de Reversibilidad: Si se logra un cierto nivel de éxito, salud o calidad en una relación, esa calidad creará las circunstancias y oportunidades necesarias para que el objetivo sea congruente con lo subjetivo. Imaginar que ya se tiene algo que se desea crea el sentimiento, y al cultivarlo, cambia las cosas internamente y externamente, impulsando hacia la meta.
• Ley de la Práctica (o Ley de la Repetición): Lo que se hace una y otra vez a menudo se convierte en un nuevo hábito, el cual toma alrededor de 21 días en desarrollarse.
• Ley de la Actividad Subconsciente: Lo que se planta en la mente subconsciente se pone a trabajar para convertirlo en realidad, haciendo que todas las palabras y acciones encajen en un patrón consistente con el autoconcepto de uno.
• Ley de la Concentración: Aquello en lo que uno se concentra o piensa repetidamente crece en la realidad.
• Ley de la Sustitución: La mente consciente solo puede tener un pensamiento a la vez (positivo o negativo); para deshacerse de un pensamiento negativo, se debe reemplazar con uno positivo.
• Ley de Compensación: Para cualquier fuerza en la vida, existe una fuerza opuesta igual. Uno siempre es compensado en igual medida por lo que hace.
• Ley de Servicio: Siempre se será recompensado en vida en proporción exacta al valor del servicio hacia otras personas. La gran satisfacción y gozo en la vida provienen de servir a otros.
• Ley de Recuperación: Lo que se pone en términos de servicio, se recupera.
• Ley de Sobrecompensación: Siempre se debe hacer más de lo que se paga, caminar un kilómetro extra, dar más de lo que se recibe.
• Ley del Esfuerzo Indirecto: En las relaciones con otras personas, generalmente se obtiene lo que se quiere más rápido indirectamente que directamente.
• Ley de la Relajación: En todos los trabajos mentales, el esfuerzo se vence a sí mismo; es decir, cuanto menos se intente, mejor funciona.
• Ley del Perdón: Uno está mentalmente sano en la medida en que puede perdonar libremente y olvidar las ofensas.
• Ley de la Acumulación: Cada cosa que se hace, positiva o negativa, se acumula. Cada gran logro es resultado de miles de logros menores.
• Ley de la Actividad Superconsciente: Cualquier pensamiento, meta o idea que se mantenga continuamente en la mente consciente con intensidad, ya sea deseada o temida, debe hacerse realidad a través de la mente superconsciente`;

const parseLeyesContent = (text: string) => {
    const lawsRaw = text.trim().split(/\n•\s*/);
    return lawsRaw.map(law => {
        const parts = law.split(/:\s*/, 1);
        const title = parts[0];
        const content = law.substring(title.length + 1).trim();
        return { title, content };
    });
};

const SeminarioFenixLeyesContent: React.FC = () => {
    const [openSection, setOpenSection] = useState<string | null>(null);
    const parsedContent = useMemo(() => parseLeyesContent(LEYES_SEMINARIO_CONTENT), []);

    const toggleSection = (title: string) => {
        setOpenSection(prev => prev === title ? null : title);
    };

    return (
        <div className="space-y-2">
            <p className="mb-4 text-slate-300">Las leyes mentales son las que rigen nuestro universo interior y, por correspondencia, nuestro mundo exterior. Comprenderlas es el primer paso para dominar tu vida. Haz clic en cada ley para expandirla.</p>
            {parsedContent.map(({ title, content }) => (
                <div key={title} className="bg-slate-800 rounded-lg">
                    <button
                        onClick={() => toggleSection(title)}
                        className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-700/50"
                        aria-expanded={openSection === title}
                    >
                        <span className="font-bold text-lg text-primary">{title}</span>
                        {openSection === title ? <IconArrowUp className="w-6 h-6" /> : <IconArrowDown className="w-6 h-6" />}
                    </button>
                    {openSection === title && (
                        <div className="px-4 pb-4 border-t border-slate-700">
                            <p className="text-slate-300 pt-3">{content}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};


// =================================================================
// END: Content for "Seminario Fenix"
// =================================================================


// --- Main Education Page with new drill-down navigation ---

const EDUCATION_SECTIONS: Record<string, EducationSection> = {
    formacion: {
        name: "Formación & Mentalidad",
        description: "Construye la base de conocimiento y la mentalidad adecuada para alcanzar tus metas financieras.",
        icon: IconAcademicCap,
        subsections: {
            piramide: {
                name: "Pirámide de la Riqueza",
                description: "Un camino gamificado de 5 niveles para construir tu libertad financiera desde cero.",
                icon: IconGoals,
                component: PiramideRiquezaContent,
            },
        }
    },
    seminarioFenix: {
        name: "Seminario Fenix",
        description: "Un resumen del legendario seminario de Brian Tracy sobre el éxito, la psicología del logro y la autorrealización.",
        icon: IconBookOpen,
        subsections: {
            resumen: {
                name: "Resumen Seminario",
                description: "Los 16 puntos clave del seminario, desde los fundamentos hasta el propósito de la vida.",
                icon: IconDocumentText,
                component: SeminarioFenixResumenContent,
            },
            leyes: {
                name: "Leyes",
                description: "Un estudio detallado de las leyes mentales universales que gobiernan el éxito y el fracaso.",
                icon: IconScale,
                component: SeminarioFenixLeyesContent,
            }
        }
    }
};


const EducationPage: React.FC = () => {
    const [viewState, setViewState] = useState<{
        level: 'main' | 'category' | 'content';
        categoryKey: string | null;
        subCategoryKey: string | null;
    }>({
        level: 'main',
        categoryKey: null,
        subCategoryKey: null,
    });

    const handleSelectCategory = (key: string) => {
        setViewState({ level: 'category', categoryKey: key, subCategoryKey: null });
    };

    const handleSelectSubCategory = (subKey: string) => {
        setViewState(prev => ({ ...prev, level: 'content', subCategoryKey: subKey }));
    };

    const handleGoBack = () => {
        if (viewState.level === 'content') {
            setViewState(prev => ({ ...prev, level: 'category', subCategoryKey: null }));
        } else if (viewState.level === 'category') {
            setViewState({ level: 'main', categoryKey: null, subCategoryKey: null });
        }
    };

    const renderHeader = () => {
        let title = "Educación";
        let subtitle = "Recursos y guías para potenciar tu conocimiento financiero.";

        if (viewState.level === 'category' && viewState.categoryKey) {
            title = EDUCATION_SECTIONS[viewState.categoryKey].name;
            subtitle = "Selecciona un tema para empezar a aprender.";
        } else if (viewState.level === 'content' && viewState.categoryKey && viewState.subCategoryKey) {
            title = EDUCATION_SECTIONS[viewState.categoryKey].subsections[viewState.subCategoryKey].name;
            subtitle = EDUCATION_SECTIONS[viewState.categoryKey].subsections[viewState.subCategoryKey].description;
        }

        return (
            <div>
                 {viewState.level !== 'main' && (
                    <Button variant="ghost" onClick={handleGoBack} className="mb-4">
                        <IconArrowLeft className="w-5 h-5 mr-2" /> Volver
                    </Button>
                )}
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    {viewState.level === 'main' && <IconAcademicCap className="w-8 h-8"/>}
                    {title}
                </h1>
                <p className="text-slate-400 mt-1">{subtitle}</p>
            </div>
        );
    };
    
    const renderContent = () => {
        if (viewState.level === 'main') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {Object.entries(EDUCATION_SECTIONS).map(([key, section]) => (
                        <Card key={key} className="hover:bg-slate-700/50 hover:border-primary border-transparent border-2 transition-all cursor-pointer" onClick={() => handleSelectCategory(key)}>
                            <section.icon className="w-12 h-12 text-primary mb-4" />
                            <h2 className="text-xl font-bold text-white">{section.name}</h2>
                            <p className="text-slate-400 mt-2">{section.description}</p>
                        </Card>
                    ))}
                </div>
            );
        }
        
        if (viewState.level === 'category' && viewState.categoryKey) {
            const subsections = EDUCATION_SECTIONS[viewState.categoryKey].subsections;
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {Object.entries(subsections).map(([key, sub]) => (
                        <Card key={key} className="hover:bg-slate-700/50 hover:border-primary border-transparent border-2 transition-all cursor-pointer" onClick={() => handleSelectSubCategory(key)}>
                             <sub.icon className="w-12 h-12 text-primary mb-4" />
                             <h2 className="text-xl font-bold text-white">{sub.name}</h2>
                             <p className="text-slate-400 mt-2">{sub.description}</p>
                        </Card>
                    ))}
                </div>
            );
        }
        
        if (viewState.level === 'content' && viewState.categoryKey && viewState.subCategoryKey) {
            const ContentComponent = EDUCATION_SECTIONS[viewState.categoryKey].subsections[viewState.subCategoryKey].component;
            return <div className="mt-6"><ContentComponent /></div>;
        }

        return null; // Should not happen
    };

    return (
        <div className="space-y-6">
            {renderHeader()}
            {renderContent()}
        </div>
    );
};

export default EducationPage;