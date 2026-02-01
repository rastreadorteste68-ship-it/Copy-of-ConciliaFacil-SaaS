
import { GoogleGenAI, Type } from "@google/genai";
import { Client, MonthStatus } from './types';
import { storage } from './storage';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function processReconciliation(billingText: string, bankText: string): Promise<Client[]> {
  const existingClients = storage.getClients();
  const clientsContext = existingClients.map(c => ({ id: c.id, name: c.name, startDate: c.startDate }));

  const prompt = `
    Atue como Especialista em Auditoria de Fluxo de Caixa para a CheckMaster Auto.
    
    CLIENTES ATUAIS (CONTEXTO): ${JSON.stringify(clientsContext)}

    TAREFA:
    Analise o faturamento esperado (vendas) e o extrato bancário (entradas reais) para identificar pagamentos recebidos para cada cliente.
    
    REGRAS CRÍTICAS:
    1. EXTRATO: Foque APENAS em CRÉDITOS/ENTRADAS (ignore débitos, taxas bancárias, etc).
    2. MATCH SEMÂNTICO: O nome no extrato pode ser abreviado ou variar levemente do nome no contexto.
    3. COMPETÊNCIA: Determine o mês e ano do pagamento baseado na data da transação.
    4. DATA DE INÍCIO: Ignore pagamentos com data anterior à 'startDate' de cada cliente.

    RETORNE UM ARRAY JSON COM ESTE FORMATO:
    [
      { 
        "clientId": "ID_DO_CLIENTE", 
        "months": [
          { "month": 1-12, "year": 2024-2026, "status": "PAID", "paymentDates": ["YYYY-MM-DD"], "amount": 0.0 }
        ] 
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { text: prompt }, 
          { text: `FATURAMENTO:\n${billingText}` },
          { text: `EXTRATO BANCÁRIO:\n${bankText}` }
        ] 
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              clientId: { type: Type.STRING },
              months: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    month: { type: Type.INTEGER },
                    year: { type: Type.INTEGER },
                    status: { type: Type.STRING },
                    paymentDates: { type: Type.ARRAY, items: { type: Type.STRING } },
                    amount: { type: Type.NUMBER }
                  },
                  required: ["month", "year", "status", "paymentDates"]
                }
              }
            },
            required: ["clientId", "months"]
          }
        }
      }
    });

    const aiMatches = JSON.parse(response.text || "[]");
    return existingClients.map(client => {
      const match = aiMatches.find((m: any) => m.clientId === client.id);
      if (match) {
        const newMonths = [...client.months];
        match.months.forEach((aiMonth: MonthStatus) => {
          const idx = newMonths.findIndex(m => m.month === aiMonth.month && m.year === aiMonth.year);
          if (idx !== -1) {
            // Do not overwrite manual markings with AI findings
            if (newMonths[idx].status !== 'MANUAL_PAID') {
              newMonths[idx] = { ...aiMonth, source: 'ai' };
            }
          } else {
            newMonths.push({ ...aiMonth, source: 'ai' });
          }
        });
        return { ...client, months: newMonths };
      }
      return client;
    });
  } catch (error) {
    console.error("Erro na conciliação IA:", error);
    throw error;
  }
}
