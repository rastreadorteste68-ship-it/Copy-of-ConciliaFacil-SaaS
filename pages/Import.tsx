
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Building, Zap, Loader2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { processReconciliation } from '../conciliationService';
import { storage } from '../storage';

const Import: React.FC = () => {
  const navigate = useNavigate();
  const [billingFile, setBillingFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const billingInputRef = useRef<HTMLInputElement>(null);
  const bankInputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      if (file.name.match(/\.(xlsx|xls|ods)$/)) {
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          resolve(XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]));
        };
        reader.readAsArrayBuffer(file);
      } else {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsText(file);
      }
      reader.onerror = reject;
    });
  };

  const handleConciliate = async () => {
    if (!billingFile || !bankFile) return;
    setIsProcessing(true);
    setError(null);
    try {
      const billingTxt = await readFile(billingFile);
      const bankTxt = await readFile(bankFile);
      const result = await processReconciliation(billingTxt, bankTxt);
      storage.saveClients(result);
      navigate('/');
    } catch (err) {
      setError("Erro ao processar arquivos.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-12">
      <header className="text-center">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Conciliação IA</h2>
        <p className="text-slate-400 font-medium mt-2">Arraste seus extratos para análise automática.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div onClick={() => billingInputRef.current?.click()} className={`p-10 rounded-[3rem] border-2 border-dashed cursor-pointer text-center space-y-4 ${billingFile ? 'border-indigo-500 bg-white shadow-xl' : 'border-slate-200 bg-white/50 hover:bg-white'}`}>
          <div className={`p-6 rounded-[1.8rem] mx-auto w-fit ${billingFile ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-300'}`}><FileText size={40} /></div>
          <h3 className="font-black text-slate-800">{billingFile ? billingFile.name : 'Faturamento'}</h3>
          <input type="file" ref={billingInputRef} className="hidden" onChange={e => setBillingFile(e.target.files?.[0] || null)} accept=".xlsx,.xls,.csv,.txt" />
        </div>
        <div onClick={() => bankInputRef.current?.click()} className={`p-10 rounded-[3rem] border-2 border-dashed cursor-pointer text-center space-y-4 ${bankFile ? 'border-emerald-500 bg-white shadow-xl' : 'border-slate-200 bg-white/50 hover:bg-white'}`}>
          <div className={`p-6 rounded-[1.8rem] mx-auto w-fit ${bankFile ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-300'}`}><Building size={40} /></div>
          <h3 className="font-black text-slate-800">{bankFile ? bankFile.name : 'Extrato'}</h3>
          <input type="file" ref={bankInputRef} className="hidden" onChange={e => setBankFile(e.target.files?.[0] || null)} accept=".xlsx,.xls,.csv,.txt" />
        </div>
      </div>
      {error && <div className="bg-rose-50 text-rose-600 p-6 rounded-[2rem] flex items-center gap-4"><AlertCircle size={24} />{error}</div>}
      <div className="flex justify-center pt-10">
        <button onClick={handleConciliate} disabled={!billingFile || !bankFile || isProcessing} className="bg-slate-900 text-white px-16 py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] flex items-center gap-4 shadow-2xl disabled:opacity-40">
          {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} className="text-amber-400" />}
          {isProcessing ? 'Processando...' : 'Conciliar agora'}
        </button>
      </div>
    </div>
  );
};

export default Import;
