import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { firestoreService } from '../services/firestoreService';
import { 
  TrendingUp, 
  Calendar,
  Search,
  AlertCircle,
  Wallet,
  History,
  Trash2,
  Edit2,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface CashflowProps {
  user: User | null;
  onSelectQuote: (id: string) => void;
}

export function Cashflow({ user, onSelectQuote }: CashflowProps) {
  const [payments, setPayments] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalReceived: 0, thisMonth: 0, pending: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'history' | 'projects'>('history');

  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [editPaymentData, setEditPaymentData] = useState({ amount: '', date: '', note: '' });

  useEffect(() => {
    if (user) {
      setLoading(true);
      const unsubPayments = firestoreService.onPaymentsUpdated(user.uid, (pData) => {
        const sorted = (pData || []).sort((a: any, b: any) => (b.receivedDate?.toMillis() || 0) - (a.receivedDate?.toMillis() || 0));
        setPayments(sorted);
        setLoading(false);
      });
      
      const unsubQuotes = firestoreService.onQuotesUpdated(user.uid, (qData) => {
        setQuotes(qData || []);
        setLoading(false);
      });

      return () => {
        unsubPayments();
        unsubQuotes();
      };
    }
  }, [user]);

  useEffect(() => {
    const totalReceived = (payments as any[]).reduce((sum, p) => sum + p.amount, 0);
    const totalPotential = (quotes as any[])
      .filter(q => q.status === 'accepted' || q.status === 'completed' || q.status === 'sent')
      .reduce((sum, q) => sum + q.totalAmount, 0);
    
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = (payments as any[])
      .filter(p => p.receivedDate?.toDate() >= firstDay)
      .reduce((sum, p) => sum + p.amount, 0);

    setStats({
      totalReceived,
      thisMonth,
      pending: Math.max(0, totalPotential - totalReceived)
    });
  }, [payments, quotes]);

  const handleDeletePayment = async (id: string, quoteId: string, amount: number) => {
    if (confirmingDelete !== id) {
      setConfirmingDelete(id);
      setTimeout(() => setConfirmingDelete(null), 3000);
      return;
    }

    try {
      await firestoreService.deletePayment(id);
      
      // Also update the quote's receivedAmount to stay in sync
      const q = quotes.find(q => q.id === quoteId);
      if (q) {
        const newReceived = Math.max(0, (q.receivedAmount || 0) - amount);
        await firestoreService.updateQuote(quoteId, { receivedAmount: newReceived });
      }
      
      toast.success('交易記錄已完成刪除');
      setConfirmingDelete(null);
    } catch (e) {
      console.error(e);
      toast.error('刪除失敗');
    }
  };

  const handleUpdatePayment = async () => {
    if (!editingPayment) return;
    const amount = parseFloat(editPaymentData.amount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      await firestoreService.updatePayment(editingPayment.id, {
        amount,
        receivedDate: editPaymentData.date,
        note: editPaymentData.note
      });

      // Update quote balance
      const q = quotes.find(q => q.id === editingPayment.quoteId);
      if (q) {
        const otherPayments = payments.filter(p => p.quoteId === q.id && p.id !== editingPayment.id);
        const newReceived = otherPayments.reduce((sum, p) => sum + p.amount, 0) + amount;
        await firestoreService.updateQuote(q.id, { receivedAmount: newReceived });
      }

      toast.success('收款記錄已更新');
      setEditingPayment(null);
    } catch (e) {
      console.error(e);
      toast.error('更新失敗');
    }
  };

  const getQuoteInfo = (quoteId: string) => {
    const q = quotes.find(q => q.id === quoteId);
    return q || { projectName: '未知專案', clientName: '未知客互' };
  };

  const projectSummaries = quotes
    .filter(q => q.status !== 'cancelled' && q.status !== 'draft')
    .map(q => {
      const received = payments
        .filter(p => p.quoteId === q.id)
        .reduce((sum, p) => sum + p.amount, 0);
      return {
        ...q,
        received,
        balance: Math.max(0, q.totalAmount - received),
        percent: Math.min(100, Math.round((received / q.totalAmount) * 100)) || 0
      };
    })
    .sort((a, b) => b.balance - a.balance);

  const filteredPayments = payments.filter(p => {
    const q = getQuoteInfo(p.quoteId);
    return q.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           q.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.paymentStage?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <div className="w-20 h-20 bg-card border border-border rounded-full flex items-center justify-center mb-6">
          <Wallet className="text-accent" size={32} />
        </div>
        <h3 className="text-2xl font-serif text-text-main">財務控管中心</h3>
        <p className="text-text-dim mt-3 max-w-sm text-sm leading-relaxed">
          請登入以查看您的工程開發金流、收款進度以及應收帳款統計。
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-20 text-center font-mono text-[10px] uppercase tracking-widest text-text-dim">金流數據分析中...</div>;
  }

  return (
    <div className="space-y-6 md:space-y-12 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="w-full">
          <h2 className="text-2xl md:text-3xl font-serif text-text-main">金流收款管理</h2>
          <div className="flex gap-4 md:gap-6 mt-6 border-b border-border/30 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setViewMode('history')}
              className={`pb-4 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${viewMode === 'history' ? 'border-accent text-accent' : 'border-transparent text-text-dim hover:text-text-main'}`}
            >
              Transaction History / 十筆收款
            </button>
            <button 
              onClick={() => setViewMode('projects')}
              className={`pb-4 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${viewMode === 'projects' ? 'border-accent text-accent' : 'border-transparent text-text-dim hover:text-text-main'}`}
            >
              Project Summary / 專案總計
            </button>
          </div>
        </div>
        <div className="relative w-full md:w-72">
          <input 
            type="text"
            placeholder="搜尋相關字..."
            className="w-full bg-[#1A1A1A] border-b border-border pl-10 pr-4 py-2 text-[10px] text-text-main focus:border-accent outline-none uppercase tracking-widest"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="bg-card p-6 md:p-10 border border-border rounded shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <span className="text-[10px] text-text-dim uppercase tracking-[0.2em] font-bold leading-relaxed">總實收金額 TOTAL RECEIVED</span>
          <div className="text-3xl md:text-4xl font-serif text-success mt-6 tracking-tighter">
            ${stats.totalReceived.toLocaleString()}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-success/70 font-mono uppercase">
            <TrendingUp size={12} /> Validated Transactions
          </div>
        </div>

        <div className="bg-card p-6 md:p-10 border border-border rounded shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <span className="text-[10px] text-text-dim uppercase tracking-[0.2em] font-bold leading-relaxed">本月收入 MONTHLY YIELD</span>
          <div className="text-3xl md:text-4xl font-serif text-text-main mt-6 tracking-tighter">
            ${stats.thisMonth.toLocaleString()}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-text-dim font-mono uppercase">
            <Calendar size={12} /> {new Date().toLocaleDateString('zh-TW', { month: 'long' })}
          </div>
        </div>

        <div className="bg-card p-6 md:p-10 border border-accent/20 rounded shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
          <span className="text-[10px] text-accent font-bold uppercase tracking-[0.2em] leading-relaxed">待收工程尾款合計 OUTSTANDING</span>
          <div className="text-3xl md:text-4xl font-serif text-accent mt-6 tracking-tighter">
            ${stats.pending.toLocaleString()}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-accent uppercase font-mono leading-relaxed">
            <AlertCircle size={12} /> 尚未收取之總餘額
          </div>
        </div>
      </div>

      <section className="bg-card border border-border rounded-lg overflow-hidden shadow-2xl">
        {viewMode === 'history' ? (
          <>
            <div className="p-8 border-b border-border">
              <h3 className="text-sm font-serif text-text-main uppercase tracking-widest flex items-center gap-3">
                <History size={16} className="text-accent" />
                最近收款記錄
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-[#1A1A1A]/50 border-b border-border">
                    <th className="px-6 md:px-10 py-5 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium">交易日期</th>
                    <th className="px-6 md:px-10 py-5 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium">項目內容</th>
                    <th className="px-6 md:px-10 py-5 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium">收款性質</th>
                    <th className="px-6 md:px-10 py-5 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium text-right">入帳金額</th>
                    <th className="px-6 md:px-10 py-5 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredPayments.map(p => {
                    const q = getQuoteInfo(p.quoteId);
                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 md:px-10 py-6 text-[10px] font-mono text-text-dim uppercase">{p.receivedDate?.toDate().toLocaleDateString('zh-TW')}</td>
                        <td className="px-6 md:px-10 py-6">
                          <div className="text-sm font-serif text-text-main truncate max-w-[200px]">{q.projectName}</div>
                          <div className="text-[10px] text-text-dim mt-1 font-mono uppercase tracking-tighter opacity-50 truncate max-w-[150px]">{q.clientName}</div>
                        </td>
                        <td className="px-6 md:px-10 py-6">
                          <span className="text-[9px] border border-accent/30 px-2 py-1 uppercase tracking-widest font-bold text-accent bg-accent/5 whitespace-nowrap">
                            {p.paymentStage}
                          </span>
                        </td>
                        <td className="px-6 md:px-10 py-6 text-right">
                          <span className="font-serif text-base md:text-lg text-success whitespace-nowrap">+ ${p.amount.toLocaleString()}</span>
                        </td>
                        <td className="px-6 md:px-10 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setEditingPayment(p);
                                setEditPaymentData({
                                  amount: p.amount.toString(),
                                  date: p.receivedDate?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                                  note: p.note || ''
                                });
                              }}
                              className="p-2 rounded text-text-dim hover:text-accent hover:bg-accent/10 transition-all"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={() => handleDeletePayment(p.id, p.quoteId, p.amount)}
                              className={`p-2 rounded transition-all ${confirmingDelete === p.id ? 'bg-red-500 text-white' : 'text-text-dim hover:text-red-400'}`}
                            >
                              {confirmingDelete === p.id ? <span className="text-[8px] font-bold">確認？</span> : <Trash2 size={12} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            {projectSummaries.map(q => (
              <div 
                key={q.id} 
                onClick={() => onSelectQuote(q.id)}
                className="bg-[#1A1A1A] p-6 md:p-8 border border-border/30 rounded relative overflow-hidden cursor-pointer hover:border-accent group transition-all"
              >
                <div className="absolute top-2 right-2 md:top-4 md:right-4">
                  <span className={`text-[8px] md:text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded ${q.balance <= 0 ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'}`}>
                    {q.balance <= 0 ? '已收全款' : `剩餘 NT$ ${q.balance.toLocaleString()}`}
                  </span>
                </div>
                <h4 className="text-base md:text-lg font-serif text-text-main mb-1 group-hover:text-accent transition-colors truncate pr-24">{q.projectName}</h4>
                <p className="text-[9px] md:text-[10px] text-text-dim uppercase tracking-widest font-mono mb-6 truncate">{q.clientName}</p>
                
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] md:text-[11px] font-mono">
                    <span className="text-text-dim">收款進度 / PROGRESS</span>
                    <span className="text-text-main font-bold">{q.percent}%</span>
                  </div>
                  <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${q.balance <= 0 ? 'bg-success' : 'bg-accent'}`}
                      style={{ width: `${q.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-end pt-2">
                    <div className="text-left">
                      <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1 underline decoration-success/30 decoration-2 underline-offset-4">已收金額</div>
                      <div className="text-sm md:text-base font-mono text-success font-bold">${q.received.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1">合約總額</div>
                      <div className="text-sm md:text-base font-mono text-text-main opacity-80">${q.totalAmount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#1A1A1A] border border-border rounded shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-xs font-serif text-text-main uppercase tracking-widest">修改收款紀錄</h3>
              <button onClick={() => setEditingPayment(null)} className="text-text-dim hover:text-text-main">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-1">
                <label className="text-[9px] text-text-dim uppercase tracking-widest">收款金額</label>
                <input 
                  type="number"
                  value={editPaymentData.amount}
                  onChange={e => setEditPaymentData({ ...editPaymentData, amount: e.target.value })}
                  className="w-full bg-black/30 border-b border-border py-3 text-text-main font-mono text-lg focus:border-accent outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-text-dim uppercase tracking-widest">收款日期</label>
                <input 
                  type="date"
                  value={editPaymentData.date}
                  onChange={e => setEditPaymentData({ ...editPaymentData, date: e.target.value })}
                  className="w-full bg-black/30 border-b border-border py-2 text-text-main font-mono focus:border-accent outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-text-dim uppercase tracking-widest">備註</label>
                <input 
                  type="text"
                  value={editPaymentData.note}
                  onChange={e => setEditPaymentData({ ...editPaymentData, note: e.target.value })}
                  className="w-full bg-black/30 border-b border-border py-2 text-text-main focus:border-accent outline-none"
                />
              </div>
            </div>

            <div className="p-6 bg-white/5 flex gap-3">
              <button 
                onClick={() => setEditingPayment(null)}
                className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-text-dim hover:text-text-main"
              >
                取消
              </button>
              <button 
                onClick={handleUpdatePayment}
                className="flex-[1.5] py-3 bg-accent text-accent-foreground font-bold text-[10px] uppercase tracking-widest hover:brightness-110"
              >
                確認修改
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
