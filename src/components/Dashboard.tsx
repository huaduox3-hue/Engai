import React, { useState, useEffect } from 'react';
import { firestoreService } from '../services/firestoreService';
import { calculateTrialDays } from '../lib/utils';
import { User } from 'firebase/auth';
import { FileText, ChevronRight, Clock, CheckCircle2, AlertCircle, Calendar, PlusCircle, ShieldCheck, Trash2, Ban, Truck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardProps {
  user: User | null;
  userProfile?: any;
  onSelectQuote: (id: string) => void;
  onSelectPO: (id: string) => void;
}

export function Dashboard({ user, userProfile, onSelectQuote, onSelectPO }: DashboardProps) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quotes' | 'pos'>('quotes');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  const [confirmingVoid, setConfirmingVoid] = useState<string | null>(null);
  const [showContactPicker, setShowContactPicker] = useState<any>(null); // { type: 'quote' | 'po' }
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [hoursRemaining, setHoursRemaining] = useState<number | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      setTrialDaysRemaining(calculateTrialDays(userProfile?.trialExpiresAt));
      
      if (userProfile?.trialExpiresAt) {
        const expires = userProfile.trialExpiresAt.toMillis 
          ? userProfile.trialExpiresAt.toMillis() 
          : (userProfile.trialExpiresAt.seconds ? userProfile.trialExpiresAt.seconds * 1000 : new Date(userProfile.trialExpiresAt).getTime());
        const diff = expires - Date.now();
        setHoursRemaining(diff > 0 ? Math.floor(diff / (1000 * 60 * 60)) : 0);
      } else {
        setHoursRemaining(null);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 5 * 60 * 1000); // 5 mins
    return () => clearInterval(timer);
  }, [userProfile?.trialExpiresAt]);

  useEffect(() => {
    // Check if on mobile and not standalone
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (isMobile && !isStandalone) {
      setShowInstallPrompt(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const unsubQuotes = firestoreService.onQuotesUpdated(user.uid, (q) => {
        setQuotes(q || []);
        setLoading(false);
      });
      const unsubPOs = firestoreService.onPurchaseOrdersUpdated(user.uid, (p) => {
        setPurchaseOrders(p || []);
        setLoading(false);
      });

      return () => {
        unsubQuotes();
        unsubPOs();
      };
    }
  }, [user]);

  // Retroactive trial activation check & duration sync
  useEffect(() => {
    if (!user || !userProfile) return;

    // 1. Activate trial if missing but has docs
    if (userProfile.plan === 'free' && !userProfile.trialStartedAt) {
      if (quotes.length > 0 || purchaseOrders.length > 0) {
        firestoreService.activateTrial(user.uid);
      }
    }

    // 2. Sync trial duration if it's still the old 14-day policy (Legacy support)
    // Only run this once by checking a buffer
    if (userProfile.plan === 'pro_trial' && userProfile.trialStartedAt && userProfile.trialExpiresAt) {
      const start = userProfile.trialStartedAt.toMillis ? userProfile.trialStartedAt.toMillis() : new Date(userProfile.trialStartedAt).getTime();
      const expires = userProfile.trialExpiresAt.toMillis ? userProfile.trialExpiresAt.toMillis() : new Date(userProfile.trialExpiresAt).getTime();
      
      const durationDays = (expires - start) / (1000 * 60 * 60 * 24);
      
      // If duration is > 10 days, strictly snap it to 7. Use a clear gap to avoid precision issues.
      if (durationDays > 10) {
        const newExpires = new Date(start);
        newExpires.setDate(newExpires.getDate() + 7);
        firestoreService.updateUserProfile(user.uid, {
          trialExpiresAt: newExpires,
          updatedAt: new Date()
        });
      }
    }
  }, [user, userProfile, quotes.length, purchaseOrders.length]);

  async function loadData() {
    // Handled by onSnapshot now
  }

  const handleManualCreateQuote = async (contact?: any) => {
    if (!user) return;
    setLoading(true);
    try {
      const id = await firestoreService.createQuote({
        userId: user.uid,
        clientName: contact?.name || '新客戶',
        clientPhone: contact?.phone || '',
        clientTaxId: contact?.taxId || contact?.companyName || '',
        clientAddress: contact?.address || '',
        projectName: '手動新增項目',
        items: [{ name: '新工項', quantity: 1, unit: '式', unitPrice: 0, description: '' }],
        subtotal: 0,
        taxRate: 0.05,
        taxAmount: 0,
        totalAmount: 0,
        status: 'draft',
        receivedAmount: 0,
        includeTax: true,
        paymentTerms: ''
      });
      if (id) {
        // Automatically activate trial on first quote if not already started
        await firestoreService.activateTrial(user.uid);
        onSelectQuote(id);
      }
    } catch (e) {
      console.error(e);
      toast.error('建立失敗');
    } finally {
      setLoading(false);
      setShowContactPicker(null);
    }
  };

  const handleManualCreatePO = async (contact?: any) => {
    if (!user) return;
    setLoading(true);
    try {
      const id = await firestoreService.createPurchaseOrder({
        userId: user.uid,
        projectName: '手動採購項目',
        items: [{ name: '新材料', category: 'material', quantity: 1, unit: '個', unitPrice: 0, description: '' }],
        subtotal: 0,
        includeTax: true,
        totalAmount: 0,
        status: 'draft',
        supplierName: contact?.name || '',
        supplierPhone: contact?.phone || '',
        supplierAddress: contact?.address || '',
        notes: ''
      });
      if (id) {
        // Automatically activate trial on first PO if not already started
        await firestoreService.activateTrial(user.uid);
        onSelectPO(id);
      }
    } catch (e) {
      console.error(e);
      toast.error('建立失敗');
    } finally {
      setLoading(false);
      setShowContactPicker(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'accepted': 
      case 'ordered': return 'border-accent text-accent bg-accent/5';
      case 'sent': return 'border-blue-400/50 text-blue-400 bg-blue-400/5';
      case 'completed': return 'border-success/50 text-success bg-success/5';
      case 'cancelled': return 'border-red-400/50 text-red-400 bg-red-400/5';
      default: return 'border-border text-text-dim bg-white/5';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return '已成交';
      case 'sent': return '已發送';
      case 'completed': return '已完工';
      case 'cancelled': return '已取消';
      case 'ordered': return '已採購';
      default: return '草稿';
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <div className="w-20 h-20 bg-card border border-border rounded-full flex items-center justify-center mb-6">
          <FileText className="text-accent" size={32} />
        </div>
        <h3 className="text-2xl font-serif text-text-main">歡迎登入系統</h3>
        <p className="text-text-dim mt-3 max-w-sm text-sm leading-relaxed">
          登入以管理您的專業工程報價單，追蹤最新市場行情並管理收款進度。
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-20 text-center font-mono text-[10px] uppercase tracking-widest text-text-dim">系統資料讀取中...</div>;
  }

  const handleVoidItem = async (e: React.MouseEvent, type: 'quote' | 'po', id: string) => {
    e.stopPropagation();
    
    if (confirmingVoid !== id) {
      setConfirmingVoid(id);
      // Auto-reset after 3 seconds if not confirmed
      setTimeout(() => setConfirmingVoid(null), 3000);
      return;
    }

    try {
      if (type === 'quote') {
        await firestoreService.deleteQuote(id);
      } else {
        await firestoreService.deletePurchaseOrder(id);
      }
      toast.success('項目已刪除成功');
      setConfirmingVoid(null);
    } catch (error) {
      console.error(error);
      toast.error('刪除失敗，請檢查權限');
    }
  };

  const currentList = activeTab === 'quotes' ? quotes : purchaseOrders;

  return (
      <div className="space-y-6 md:space-y-12">
      {/* Trial Banner */}
      {showInstallPrompt && (
        <div className="no-print bg-gradient-to-r from-accent to-accent/80 p-4 md:p-6 rounded-lg shadow-xl mb-6 relative overflow-hidden group">
          <div className="absolute top-2 right-2 z-10">
            <button onClick={() => setShowInstallPrompt(false)} className="text-white/60 hover:text-white transition-colors p-1">
              <Ban size={16} />
            </button>
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-inner group-hover:scale-110 transition-transform shrink-0">
                <Sparkles size={24} className="md:w-7 md:h-7" />
              </div>
              <div className="text-white min-w-0">
                <h4 className="text-base md:text-lg font-black uppercase tracking-tighter mb-1 font-serif truncate">匠心估價：口袋工程助手</h4>
                <p className="text-[10px] md:text-xs text-white/90 font-medium leading-relaxed max-w-lg">將本平台加入手機桌面，即可享受完整體驗。</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 shrink-0 w-full sm:w-auto">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-2.5 md:p-3 rounded-lg flex items-center gap-3">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-200 border border-blue-500/30">
                  <span className="text-[8px] md:text-[10px] font-black">iOS</span>
                </div>
                <div className="text-[8px] md:text-[10px] font-bold text-white/90 uppercase tracking-widest leading-none">
                  分享 → 加入主畫面
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-2.5 md:p-3 rounded-lg flex items-center gap-3">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-200 border border-green-500/30">
                  <span className="text-[8px] md:text-[10px] font-black">ADB</span>
                </div>
                <div className="text-[8px] md:text-[10px] font-bold text-white/90 uppercase tracking-widest leading-none">
                  選選單 → 安裝
                </div>
              </div>
            </div>
          </div>
          {/* Background Decorative Element */}
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl opacity-50" />
        </div>
      )}

      {userProfile && userProfile.plan !== 'pro' && (
        <div className="no-print">
          {!userProfile.trialStartedAt ? (
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-main">開始您的 7 天專業版免費試用</h4>
                  <p className="text-xs text-text-dim mt-1">建立第一份報價單後即可自動開啟試用，體驗完整管理功能。</p>
                </div>
              </div>
              <button 
                onClick={handleManualCreateQuote}
                className="px-6 py-2 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-widest rounded transition-all hover:scale-105 shadow-lg shadow-accent/20 shrink-0"
              >
                立即建立第一份報價
              </button>
            </div>
          ) : trialDaysRemaining !== null && trialDaysRemaining > 0 ? (
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent ring-1 ring-accent/20 group-hover:scale-110 transition-transform">
                  <Clock size={28} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-black text-accent uppercase tracking-[0.2em]">專業試用版 / PRO TRIAL</span>
                    <span className="text-sm bg-accent text-accent-foreground px-4 py-1 rounded-full font-black shadow-lg shadow-accent/20 animate-pulse whitespace-nowrap">
                      {hoursRemaining !== null && hoursRemaining < 48 
                        ? `剩餘 ${hoursRemaining} 小時` 
                        : (trialDaysRemaining !== null ? `還剩 ${trialDaysRemaining} 天` : '有效期確認中')}
                    </span>
                  </div>
                  <p className="text-xs text-text-dim mt-2 max-w-md">這段期間您可以無限制建立報價單、同步客戶名錄、以及管理採購項目。好好把握專業工具帶來的便利！</p>
                </div>
              </div>
              <div className="hidden lg:block text-right">
                 <div className="text-[10px] text-text-dim uppercase tracking-widest font-mono">Current Status</div>
                 <div className="text-xl font-serif text-accent font-black mt-1 uppercase tracking-tighter">Unlimited Access</div>
              </div>
            </div>
          ) : (
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-red-500/10 flex items-center justify-center text-red-500">
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-red-400">試用期已結束</h4>
                <p className="text-[10px] text-text-dim mt-0.5">您的 7 天試用已到期，目前處於免費方案。如需繼續使用進階功能，請聯繫客服或升級。</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-end gap-6 md:gap-8">
        <div className="w-full md:w-auto">
          <h2 className="text-2xl md:text-3xl font-serif text-text-main shrink-0">{activeTab === 'quotes' ? '報價單管理' : '採購單管理'}</h2>
          <div className="flex gap-4 md:gap-6 mt-6 border-b border-border/30 overflow-x-auto no-scrollbar scroll-smooth">
            <button 
              onClick={() => setActiveTab('quotes')}
              className={`pb-4 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap min-h-[40px] ${activeTab === 'quotes' ? 'border-accent text-accent' : 'border-transparent text-text-dim hover:text-text-main'}`}
            >
              Proposals / 報價
            </button>
            <button 
              onClick={() => setActiveTab('pos')}
              className={`pb-4 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap min-h-[40px] ${activeTab === 'pos' ? 'border-accent text-accent' : 'border-transparent text-text-dim hover:text-text-main'}`}
            >
              Purchases / 採購
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-3 md:gap-4">
          <button 
            onClick={() => activeTab === 'quotes' ? handleManualCreateQuote() : handleManualCreatePO()}
            className="flex items-center justify-center gap-3 px-6 md:px-8 py-3 bg-accent text-accent-foreground font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] hover:brightness-110 shadow-lg ring-1 ring-accent/30 transition-all rounded-sm min-h-[48px]"
          >
            <PlusCircle size={16} />
            {activeTab === 'quotes' ? '手建報價' : '手建採購'}
          </button>
          <div className="px-6 py-3 bg-card rounded border border-border flex flex-col items-start md:items-end min-w-0 sm:min-w-[180px] justify-center">
            <span className="text-[9px] text-text-dim uppercase tracking-widest mb-1">{activeTab === 'quotes' ? '總預算 ESTIMATE' : '總支出 EXPENSE'}</span>
            <div className={`text-xl md:text-2xl font-serif ${activeTab === 'quotes' ? 'text-accent' : 'text-red-400'} truncate w-full md:text-right`}>
              NT$ {currentList.reduce((s, q) => s + q.totalAmount, 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {currentList.length === 0 ? (
        <div className="bg-card p-12 md:p-32 rounded border border-dashed border-border text-center">
          <p className="text-text-dim text-xs md:text-sm uppercase tracking-widest font-mono">
            {activeTab === 'quotes' ? 'No records found.' : 'No purchase orders yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:gap-4 pb-24 md:pb-0">
          {currentList.map((doc) => (
            <div
              key={doc.id}
              onClick={() => activeTab === 'quotes' ? onSelectQuote(doc.id) : onSelectPO(doc.id)}
              className="w-full bg-card p-4 md:p-6 border border-border hover:border-accent transition-all text-left flex flex-col sm:flex-row sm:items-center gap-3 md:gap-8 group rounded-sm cursor-pointer relative"
            >
              <div className={`hidden sm:block w-1 h-12 rounded-full ${
                doc.status === 'accepted' || doc.status === 'ordered' ? 'bg-accent' : 
                doc.status === 'cancelled' ? 'bg-red-500/50' : 'bg-border'
              }`} />
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1.5 md:mb-2">
                  <span className={`px-2 py-0.5 border text-[8px] md:text-[9px] font-bold uppercase tracking-wider ${getStatusStyle(doc.status)}`}>
                    {getStatusText(doc.status)}
                  </span>
                  <span className="text-[9px] md:text-[10px] text-text-dim flex items-center gap-1.5 font-mono uppercase tracking-tighter">
                    <Calendar size={10} className="text-accent" />
                    {doc.createdAt?.toDate().toLocaleDateString('zh-TW')}
                  </span>
                </div>
                <h4 className="text-sm md:text-lg font-serif text-text-main group-hover:text-accent transition-colors truncate pr-16 sm:pr-0">{doc.projectName}</h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 opacity-70">
                  <p className="text-[10px] md:text-xs text-text-dim font-sans truncate">
                    {activeTab === 'quotes' ? doc.clientName : (doc.supplierName || '專案採購')}
                  </p>
                  {activeTab === 'pos' && doc.estimatedDeliveryDate && (
                    <div className="flex items-center gap-1.5 text-[9px] text-accent font-mono uppercase tracking-widest">
                      <Truck size={10} />
                      {doc.estimatedDeliveryDate}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center border-t sm:border-t-0 border-border/10 pt-3 sm:pt-0">
                <div className="text-base md:text-xl font-serif text-text-main">
                  ${(doc.totalAmount || 0).toLocaleString()}
                </div>
                <div className="text-[8px] md:text-[9px] text-text-dim uppercase tracking-widest sm:mt-1">
                  {activeTab === 'quotes' ? 'Total (Tax Incl.)' : 'Est. Cost'}
                </div>
                {activeTab === 'quotes' && doc.receivedAmount > 0 && (
                  <div className="mt-2 w-full sm:w-24 space-y-1 hidden sm:block">
                    <div className="flex justify-between text-[8px] font-mono opacity-60">
                      <span>已收 {Math.round((doc.receivedAmount / doc.totalAmount) * 100)}%</span>
                    </div>
                    <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-success transition-all duration-500"
                        style={{ width: `${(doc.receivedAmount / doc.totalAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={(e) => handleVoidItem(e, activeTab === 'quotes' ? 'quote' : 'po', doc.id)}
                  className={`p-2 rounded transition-all no-print flex items-center gap-2 group/btn ${
                    confirmingVoid === doc.id 
                      ? 'bg-red-500 text-white scale-105' 
                      : 'text-text-dim hover:text-red-400 hover:bg-red-400/10'
                  }`}
                  title={confirmingVoid === doc.id ? "再按一次確認作廢" : "作廢項目"}
                >
                  {confirmingVoid === doc.id ? (
                    <span className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap">確認？</span>
                  ) : (
                    <Ban size={14} className="group-hover/btn:scale-110 transition-transform" />
                  )}
                </button>
                <div className="hidden sm:block p-2 text-text-dim group-hover:text-accent group-hover:translate-x-1 transition-all">
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
