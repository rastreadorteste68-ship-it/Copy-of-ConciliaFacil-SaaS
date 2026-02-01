
import React, { useState, useEffect } from 'react';
import { FileDown, X, Check, UserPlus, Info } from 'lucide-react';
import { storage } from '../storage';
import { Client } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Dashboard: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', startDate: '2025-01', expectedAmount: 0 });

  useEffect(() => {
    setClients(storage.getClients());
  }, []);

  const BASE_DATE = new Date(2026, 1, 1);
  const WINDOW_MONTHS = 14;

  const getTimeline = (client: Client) => {
    const timeline = [];
    const clientStart = new Date(client.startDate + "-01");
    for (let i = 0; i < WINDOW_MONTHS; i++) {
      const d = new Date(BASE_DATE);
      d.setMonth(BASE_DATE.getMonth() - i);
      if (d < clientStart) continue;
      
      const mNum = d.getMonth() + 1;
      const yNum = d.getFullYear();
      const stored = client.months.find(m => m.month === mNum && m.year === yNum);
      const label = d.toLocaleString('pt-BR', { month: 'short' }).substring(0, 3).toUpperCase();
      
      timeline.push({ 
        label, 
        mNum, 
        yNum, 
        status: stored?.status || 'UNPAID', 
        dates: stored?.paymentDates || [],
        source: stored?.source
      });
    }
    return timeline;
  };

  const calculateProgress = (client: Client) => {
    const t = getTimeline(client);
    if (t.length === 0) return 0;
    const paidCount = t.filter(x => x.status !== 'UNPAID').length;
    return Math.round((paidCount / t.length) * 100);
  };

  const handleTogglePayment = (clientId: string, m: number, y: number) => {
    const updated = clients.map(c => {
      if (c.id === clientId) {
        const months = [...c.months];
        const idx = months.findIndex(x => x.month === m && x.year === y);
        if (idx !== -1) {
          const newStatus = months[idx].status === 'UNPAID' ? 'MANUAL_PAID' : 'UNPAID';
          months[idx] = { 
            ...months[idx], 
            status: newStatus as any, 
            paymentDates: newStatus === 'MANUAL_PAID' ? [new Date().toISOString().split('T')[0]] : [],
            source: 'manual'
          };
        } else {
          months.push({ 
            month: m, 
            year: y, 
            status: 'MANUAL_PAID', 
            paymentDates: [new Date().toISOString().split('T')[0]], 
            amount: c.expectedAmount, 
            source: 'manual' 
          });
        }
        const clientUpdated = { ...c, months, progress: calculateProgress({ ...c, months }) };
        if (selectedClient?.id === clientId) setSelectedClient(clientUpdated);
        return clientUpdated;
      }
      return c;
    });
    setClients(updated);
    storage.saveClients(updated);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Relatório de Auditoria Automotiva - CheckMaster Auto", 15, 20);
    autoTable(doc, {
      startY: 30,
      head: [['Cliente', 'Início', 'Progresso', 'Meses Pagos']],
      body: clients.map(c => [
        c.name, 
        c.startDate, 
        `${calculateProgress(c)}%`, 
        `${getTimeline(c).filter(x => x.status !== 'UNPAID').length}/${getTimeline(c).length}`
      ]),
    });
    doc.save("auditoria_checkmaster.pdf");
  };

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Clientes</span>
          <span className="text-5xl font-black text-slate-900 leading-none">{clients.length}</span>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recuperado (IA)</span>
          <span className="text-5xl font-black text-emerald-500 leading-none">
            R$ {clients.reduce((acc, c) => acc + c.months.filter(m => m.status !== 'UNPAID').length * c.expectedAmount, 0).toLocaleString('pt-BR')}
          </span>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Meses Pendentes</span>
          <span className="text-5xl font-black text-rose-500 leading-none">
            {clients.reduce((acc, c) => acc + getTimeline(c).filter(x => x.status === 'UNPAID').length, 0)}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Gestão de Auditoria</h2>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none bg-white border border-slate-200 px-6 py-4 rounded-2xl font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <UserPlus size={16}/> Novo Cliente
          </button>
          <button onClick={exportPDF} className="flex-1 sm:flex-none bg-indigo-600 text-white px-6 py-4 rounded-2xl font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <FileDown size={16}/> Exportar Relatório
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {clients.map(client => {
          const progress = calculateProgress(client);
          const timeline = getTimeline(client);
          
          return (
            <div key={client.id} onClick={() => setSelectedClient(client)} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">{client.name}</h3>
                <span className="bg-slate-50 text-slate-400 p-2 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Info size={16} />
                </span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Desde {client.startDate}</p>
              
              <div className="grid grid-cols-7 gap-2 mb-8">
                {timeline.slice(0, 14).map((t, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                      t.status === 'PAID' ? 'bg-emerald-500 text-white' : 
                      t.status === 'MANUAL_PAID' ? 'bg-amber-400 text-white' : 
                      'bg-slate-50 text-slate-300'
                    }`}>
                      {t.status === 'UNPAID' ? t.label : <Check size={12} strokeWidth={4}/>}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Progresso Auditoria</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-indigo-600 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            storage.addClient(formData.name, formData.startDate, formData.expectedAmount); 
            setClients(storage.getClients()); 
            setShowAddModal(false); 
          }} className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Novo Cliente</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome ou Razão Social</label>
                <input required placeholder="Ex: Oficina Mecânica Silva" className="w-full bg-slate-50 p-5 rounded-2xl font-bold border border-transparent focus:border-indigo-600 focus:bg-white transition-all outline-none" onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Data de Início</label>
                  <input type="month" required className="w-full bg-slate-50 p-5 rounded-2xl font-bold border border-transparent focus:border-indigo-600 focus:bg-white transition-all outline-none" onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Mensalidade (R$)</label>
                  <input type="number" step="0.01" required placeholder="0,00" className="w-full bg-slate-50 p-5 rounded-2xl font-bold border border-transparent focus:border-indigo-600 focus:bg-white transition-all outline-none" onChange={e => setFormData({...formData, expectedAmount: Number(e.target.value)})} />
                </div>
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">Registrar Cliente</button>
          </form>
        </div>
      )}

      {selectedClient && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
            <header className="p-10 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{selectedClient.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalhamento de Auditoria Mensal</p>
              </div>
              <button onClick={() => setSelectedClient(null)} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"><X size={24}/></button>
            </header>
            
            <div className="p-10 overflow-y-auto space-y-4 scrollbar-hide">
              {getTimeline(selectedClient).map((t, i) => {
                const isPaid = t.status !== 'UNPAID';
                return (
                  <div key={i} className={`p-6 rounded-[2.5rem] border flex items-center justify-between transition-all ${isPaid ? 'bg-emerald-50/30 border-emerald-100 shadow-sm' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                        t.status === 'PAID' ? 'bg-emerald-500 text-white' : 
                        t.status === 'MANUAL_PAID' ? 'bg-amber-400 text-white' : 
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {t.status === 'UNPAID' ? t.label : <Check size={20} strokeWidth={4}/>}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-lg leading-tight">{t.label} {t.yNum}</p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          {isPaid ? `Auditado: ${t.dates[0] || '-'}` : 'Pendente de Auditoria'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleTogglePayment(selectedClient.id, t.mNum, t.yNum)} 
                      className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        isPaid ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                      }`}
                    >
                      {isPaid ? 'Invalidar' : 'Conciliar'}
                    </button>
                  </div>
                );
              })}
            </div>
            
            <footer className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Eficiência Geral</span>
                <span className="text-2xl font-black text-indigo-600">{calculateProgress(selectedClient)}%</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Mensal</span>
                <span className="text-2xl font-black text-slate-900">R$ {selectedClient.expectedAmount.toLocaleString('pt-BR')}</span>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
