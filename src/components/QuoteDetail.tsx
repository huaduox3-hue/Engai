import { useState, useEffect, useRef } from 'react';
import { firestoreService } from '../services/firestoreService';
import { User } from 'firebase/auth';
import { toPng } from 'html-to-image';
import { 
  ArrowLeft, 
  Printer, 
  Send, 
  Save, 
  Trash2, 
  Plus, 
  PlusCircle,
  Minus, 
  User as UserIcon, 
  Phone, 
  MapPin, 
  Building2,
  DollarSign,
  History,
  CheckCircle2,
  Check,
  Circle,
  AlertCircle,
  FileText,
  Loader2,
  ShieldCheck,
  Lock,
  Stamp,
  MessageSquare,
  Ban,
  Image as ImageIcon,
  Info,
  Edit2,
  X,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { ContactSelectionModal } from './ContactSelectionModal';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { geminiService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface QuoteDetailProps {
  id: string;
  user: User | null;
  userProfile?: any;
  onBack: () => void;
}

export function QuoteDetail({ id, user, userProfile, onBack }: QuoteDetailProps) {
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentStage, setPaymentStage] = useState('deposit');
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentSchedule, setPaymentSchedule] = useState<any[]>([]);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [contractTheme, setContractTheme] = useState<'classic' | 'modern' | 'minimal'>('classic');
  const [saveToContacts, setSaveToContacts] = useState(true);

  const [confirmingAction, setConfirmingAction] = useState<'void' | 'complete' | null>(null);
  const [confirmingPaymentDelete, setConfirmingPaymentDelete] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [editPaymentData, setEditPaymentData] = useState({ amount: '', stage: '', date: '', note: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [isShowingWarrantySheet, setIsShowingWarrantySheet] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const warrantyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}?quoteId=${id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('分享連結已複製', {
      description: '您的朋友登入後即可直接查看此報價單。',
      icon: <Send className="text-accent" />
    });
  };

  const handleExportWarranty = async () => {
    if (!warrantyRef.current) return;
    
    const toastId = toast.loading('正在產生保固證明書...', { 
      description: '系統正在為您的客戶建立專屬保固文件。' 
    });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const dataUrl = await toPng(warrantyRef.current, { 
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });
      const link = document.createElement('a');
      link.download = `保固證明書-${quote.projectName}-${quote.clientName}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('保固證明書已儲存', { id: toastId });
    } catch (err) {
      console.error('Warranty export failed', err);
      toast.error('操作失敗', { id: toastId });
    }
  };

  const handleExportImage = async () => {
    if (!contentRef.current) return;
    
    setIsExporting(true);
    const toastId = toast.loading('正在產生報價單圖片...', { 
      description: '系統正在為您排版並轉換，請稍候。' 
    });
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const options = {
        cacheBust: true,
        backgroundColor: '#0a0a0a',
        pixelRatio: 2,
        filter: (node: Node) => {
          if (node instanceof HTMLElement) {
            return !node.classList.contains('no-print');
          }
          return true;
        },
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      };

      const dataUrl = await toPng(contentRef.current, { ...options });
      const link = document.createElement('a');
      link.download = `報價單-${quote.projectName}-${id.slice(-6)}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('報價圖片已儲存', { 
        id: toastId, 
        description: quote.status === 'draft' ? '報價單已同步轉為「已發送」正式狀態。' : '您現在可以透過通訊軟體傳送圖片給客戶。' 
      });

      // Mark as sent if it was a draft
      if (quote?.status === 'draft') {
        await firestoreService.updateQuote(id, { status: 'sent' });
        await loadData();
      }
    } catch (err) {
      console.error('Export failed', err);
      toast.error('操作失敗，請再試一次。', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  async function loadData() {
    try {
      const data: any = await firestoreService.getQuote(id);
      const p = await firestoreService.getPayments(id);
      if (data) {
        setQuote(data);
        if (data.contractTheme) setContractTheme(data.contractTheme);
        setPayments(p || []);
        const schedule = data.paymentSchedule || [
          { id: '1', stage: '開工訂金', percent: 30, note: '' },
          { id: '2', stage: '工程中期款', percent: 40, note: '' },
          { id: '3', stage: '完工尾款', percent: 30, note: '' }
        ];
        setPaymentSchedule(schedule);
        
        // Suggest next stage automatically
        if (schedule.length > 0) {
          const nextStage = schedule.find(s => !p?.some((pay: any) => pay.paymentStage === s.stage));
          if (nextStage) {
            setPaymentStage(nextStage.stage);
            setPaymentAmount(Math.round((data.totalAmount || 0) * (nextStage.percent / 100)).toString());
          } else {
            setPaymentStage('custom');
          }
        }
      }
    } catch (e) {
      console.error('Error loading data:', e);
      toast.error('讀取資料失敗');
    } finally {
      setLoading(false);
    }
  }

  const handleUpdate = async () => {
    if (!quote) return;
    setLoading(true);
    try {
      const subtotal = quote.items.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0);
      const taxAmount = quote.includeTax ? Math.round(subtotal * (quote.taxRate || 0.05)) : 0;
      const totalAmount = subtotal + taxAmount;
      
      // Clean data before sending to Firestore
      const { id: _, createdAt: __, updatedAt: ___, ...updateData } = quote;
      
      // Auto-save to contacts if enabled
      if (user && saveToContacts && quote.clientName) {
        const existing = await firestoreService.findContactByName(user.uid, quote.clientName, 'clients');
        if (!existing) {
          await firestoreService.createClient({
            userId: user.uid,
            name: quote.clientName,
            phone: quote.clientPhone || '',
            taxId: quote.clientTaxId || '',
            address: quote.clientAddress || ''
          });
        }
      }

      await firestoreService.updateQuote(id, {
        ...updateData,
        subtotal,
        taxAmount,
        totalAmount,
        paymentSchedule,
        contractTheme,
        warrantyDuration: quote.warrantyDuration || '1年',
        warrantyStartDate: quote.warrantyStartDate || new Date().toISOString().split('T')[0],
        warrantyTerms: quote.warrantyTerms || '＊保固範圍僅限於合約內所載之施工項目與材料品質。如人為使用不當、天然災害或不可抗力之因素導致損壞，不在保固範圍內。本證明書需配合正式合約文件始生效力。',
        hasWarranty: quote.hasWarranty ?? true
      });
      setIsEditing(false);
      // Wait for loadData to complete before turning off loading in finally
      await loadData();
      toast.success('變更已儲存');
    } catch (e) {
      console.error('Error updating quote:', e);
      toast.error('無法更新報價單。請檢查資料格式是否正確。');
      setLoading(false); // Immediate unlock if error
    } finally {
      // setLoading(false) is called inside loadData, but safe here too
      setLoading(false);
    }
  };

  const addScheduleStage = () => {
    setPaymentSchedule([...paymentSchedule, { id: Date.now().toString(), stage: '新進度款', percent: 0, note: '' }]);
  };

  const removeScheduleStage = (sid: string) => {
    setPaymentSchedule(paymentSchedule.filter(s => s.id !== sid));
  };

  const updateScheduleStage = (sid: string, field: string, value: any) => {
    setPaymentSchedule(paymentSchedule.map(s => s.id === sid ? { ...s, [field]: value } : s));
  };

  const handleVoidQuote = async () => {
    if (confirmingAction !== 'void') {
      setConfirmingAction('void');
      setTimeout(() => setConfirmingAction(null), 3000);
      return;
    }
    setLoading(true);
    try {
      await firestoreService.deleteQuote(id);
      toast.success('報價單已刪除');
      setConfirmingAction(null);
      onBack();
    } catch (e) {
      console.error(e);
      toast.error('操作失敗');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...quote.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setQuote({ ...quote, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = quote.items.filter((_: any, i: number) => i !== index);
    setQuote({ ...quote, items: newItems });
  };

  const addItem = (isVariation: boolean = false) => {
    const newItem = { 
      name: isVariation ? '追加工項' : '新工項', 
      quantity: 1, 
      unit: '式', 
      unitPrice: 0, 
      description: '',
      isVariation: isVariation 
    };
    setQuote({ ...quote, items: [...(quote.items || []), newItem] });
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    setLoading(true);
    try {
      await firestoreService.addPayment({
        userId: user?.uid,
        quoteId: id,
        amount,
        paymentStage,
        receivedDate: paymentDate,
        note: `收款紀錄: ${paymentStage}`
      });

      const newReceived = (quote.receivedAmount || 0) + amount;
      const subtotal = quote.items.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0);
      const tax = quote.includeTax ? Math.round(subtotal * (quote.taxRate || 0.05)) : 0;
      const currentGrandTotal = subtotal + tax;

      const isPaidFull = newReceived >= currentGrandTotal;
      
      // Update status logic:
      // - If first payment (deposit) and not full -> accepted (已成交)
      // - If full payment -> completed (已完工)
      let newStatus = quote.status;
      if (isPaidFull) {
        newStatus = 'completed';
      } else if (newReceived > 0 && (quote.status === 'draft' || quote.status === 'sent')) {
        newStatus = 'accepted';
      }
      
      await firestoreService.updateQuote(id, { 
        receivedAmount: newReceived,
        status: newStatus
      });
      
      toast.success(`成功記帳: NT$ ${amount.toLocaleString()}`, {
        description: isPaidFull ? '通知：款項已全數收訖，專案標記為已完工。' : `已收到訂金/分期款，目前報價單已轉為正式成交。`,
      });

      setPaymentAmount('');
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error('收款紀錄新增失敗。');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!editingPayment) return;
    const amount = parseFloat(editPaymentData.amount);
    if (isNaN(amount) || amount <= 0) return;

    setLoading(true);
    try {
      await firestoreService.updatePayment(editingPayment.id, {
        amount,
        paymentStage: editPaymentData.stage,
        receivedDate: editPaymentData.date,
        note: editPaymentData.note
      });

      // Recalculate quote receivedAmount
      const updatedPayments = payments.map(p => 
        p.id === editingPayment.id ? { ...p, amount } : p
      );
      const newTotalReceived = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      
      const subtotal = quote.items.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0);
      const tax = quote.includeTax ? Math.round(subtotal * (quote.taxRate || 0.05)) : 0;
      const currentGrandTotal = subtotal + tax;

      let newStatus = quote.status;
      if (newTotalReceived >= currentGrandTotal) {
        newStatus = 'completed';
      } else if (newTotalReceived > 0 && quote.status === 'completed') {
        newStatus = 'accepted';
      }

      await firestoreService.updateQuote(id, {
        receivedAmount: newTotalReceived,
        status: newStatus
      });

      toast.success('款項資訊已更新，報價單進度已重新同步');
      setEditingPayment(null);
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error('更新失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: string, amount: number) => {
    if (confirmingPaymentDelete !== paymentId) {
      setConfirmingPaymentDelete(paymentId);
      setTimeout(() => setConfirmingPaymentDelete(null), 3000);
      return;
    }

    setLoading(true);
    try {
      await firestoreService.deletePayment(paymentId);
      
      const newReceived = Math.max(0, (quote.receivedAmount || 0) - amount);
      
      // Auto-revert status if needed
      let newStatus = quote.status;
      const subtotal = quote.items.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0);
      const tax = quote.includeTax ? Math.round(subtotal * (quote.taxRate || 0.05)) : 0;
      const currentGrandTotal = subtotal + tax;

      if (newReceived < currentGrandTotal && quote.status === 'completed') {
        newStatus = 'accepted';
      }
      
      await firestoreService.updateQuote(id, { 
        receivedAmount: newReceived,
        status: newStatus
      });
      
      toast.success('款項已移除並重新同步報價單狀態');
      setConfirmingPaymentDelete(null);
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error('移除失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneQuote = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { id: _, createdAt: __, updatedAt: ___, status: ____, sealedAt: _____, receivedAmount: ______, ...cloneData } = quote;
      const newId = await firestoreService.createQuote({
        ...cloneData,
        userId: user.uid,
        projectName: `${quote.projectName} (追加/複製)`,
        status: 'draft',
        receivedAmount: 0
      });
      toast.success('報價單已複製', { description: '中途追加可從此副本繼續編輯。' });
      if (newId) onBack(); // Redirect to list or the new quote
    } catch (e) {
      console.error(e);
      toast.error('複製失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleManualComplete = async () => {
    if (confirmingAction !== 'complete') {
      setConfirmingAction('complete');
      setTimeout(() => setConfirmingAction(null), 3000);
      return;
    }
    setLoading(true);
    try {
      await firestoreService.updateQuote(id, { status: 'completed' });
      toast.success('專案已結案');
      setConfirmingAction(null);
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error('操作失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contact: any) => {
    setQuote({
      ...quote,
      clientName: contact.name || '',
      clientPhone: contact.phone || '',
      clientAddress: contact.address || '',
      clientTaxId: contact.taxId || contact.companyName || ''
    });
    setSaveToContacts(false); 
    setShowContactPicker(false);
    toast.success(`已成功帶入客戶: ${contact.name}`);
  };

  const handlePaymentReminder = () => {
    if (!quote) return;
    const balance = grandTotal - (quote.receivedAmount || 0);
    const message = `您好，我是 ${user?.displayName || '匠心工程'}。您委託的『${quote.projectName}』已順利完工，目前尚有尾款 ${balance.toLocaleString()} 元待收，再麻煩您核對金額，如有匯款請告知帳號末五碼，感謝！`;
    
    navigator.clipboard.writeText(message);
    toast.success('催款文字已複製', {
      description: '禮貌且專業的文字已就緒，您可以直接貼上傳送。',
      icon: <MessageSquare className="text-accent" />
    });
  };

  const getThemeClass = () => {
    switch (contractTheme) {
      case 'modern': return 'font-sans bg-bg border-accent/20';
      case 'minimal': return 'font-mono bg-white text-black border-black/10';
      default: return 'font-serif bg-card border-border';
    }
  };

  const accentColor = (userProfile?.hasBrandKit || userProfile?.plan === 'pro') && userProfile?.brandColor ? userProfile.brandColor : undefined;
  const brandDisplayName = userProfile?.displayName || user?.displayName || '匠心工程團隊';

  const handleAIAnalysis = null; // Removed for API cost reduction

  if (loading || !quote) return <div className="p-20 text-center font-mono text-[10px] uppercase tracking-widest text-text-dim animate-pulse">系統處理中 / Synchronizing Data...</div>;

  const subtotal = quote.items.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0);
  const tax = quote.includeTax ? Math.round(subtotal * (quote.taxRate || 0.05)) : 0;
  const grandTotal = subtotal + tax;

  const isOwner = user?.uid === quote.userId;

  return (
    <div className="space-y-10 pb-20">
      {/* Header Actions */}
      <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <button onClick={onBack} className="flex items-center gap-3 text-text-dim hover:text-accent transition-all text-xs uppercase tracking-widest font-mono min-h-[44px]">
          <ArrowLeft size={16} /> 返回列表 / Back
        </button>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto">
          <button 
            onClick={handleShareLink} 
            className="flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border text-accent text-[10px] font-bold uppercase tracking-widest hover:border-accent transition-all min-h-[44px]"
            title="分享報價單連結給朋友"
          >
            <Send size={14} /> 分享連結 / Share
          </button>
          <button 
            onClick={handleExportImage} 
            className="flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border text-accent text-[10px] font-bold uppercase tracking-widest hover:border-accent transition-all min-h-[44px]"
            title="下載報價單圖片"
          >
            <ImageIcon size={14} /> 儲存圖片 / Download
          </button>
          
          {quote.hasWarranty !== false && (
            <button 
              onClick={() => setIsShowingWarrantySheet(true)} 
              className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all min-h-[44px]"
              title="查看並儲存工程保固證明書"
            >
              <ShieldCheck size={14} /> 工程保固 / Warranty
            </button>
          )}
          
          {isOwner && (
            <>
              <button 
                onClick={handleVoidQuote}
                className={`flex items-center justify-center gap-2 px-4 py-3 border text-[10px] font-bold uppercase tracking-widest transition-all font-mono min-h-[44px] ${
                  confirmingAction === 'void' 
                    ? 'bg-red-500 text-white border-red-500 scale-105' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                }`}
              >
                <Ban size={14} /> {confirmingAction === 'void' ? '確定作廢？' : '作廢 / Void'}
              </button>
              
              <button 
                onClick={() => isEditing ? handleUpdate() : setIsEditing(true)} 
                disabled={quote.status === 'completed'}
                className={`flex items-center justify-center gap-3 px-6 py-3 border-2 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl rounded-sm min-h-[44px] ${
                  quote.status === 'completed' ? 'bg-border text-text-dim border-border cursor-not-allowed opacity-50' :
                  isEditing ? 'bg-success text-white border-success hover:brightness-110' : 'bg-accent text-accent-foreground border-accent hover:bg-transparent hover:text-accent'
                }`}
              >
                {isEditing ? <Save size={18} /> : (quote.status === 'completed' ? <Lock size={18} /> : <FileText size={18} />)}
                {isEditing ? '儲存 / Save' : (quote.status === 'completed' ? '已結案' : '編輯 / Edit')}
              </button>
              
              <button 
                onClick={() => {
                  if (!isEditing) setIsEditing(true);
                  addItem(true);
                }}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-purple-500/20 text-purple-400 border-2 border-purple-500/40 font-black text-xs uppercase tracking-[0.2em] hover:bg-purple-500 hover:text-white transition-all shadow-xl rounded-sm min-h-[44px]"
              >
                <Plus size={18} />
                追加項目 / Variation
              </button>

              {quote.status !== 'completed' && quote.receivedAmount >= quote.totalAmount && (
                <button 
                  onClick={handleManualComplete}
                  className={`flex items-center justify-center gap-3 px-6 py-3 border-2 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl rounded-sm min-h-[44px] ${
                    confirmingAction === 'complete' 
                      ? 'bg-success text-white border-success scale-105' 
                      : 'bg-success text-white border-success hover:brightness-110'
                  }`}
                >
                  <CheckCircle2 size={18} />
                  {confirmingAction === 'complete' ? '確認結案？' : '正式結案 / Close'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Quote Card */}
      <div 
        ref={contentRef}
        className={`${getThemeClass()} rounded shadow-2xl border overflow-hidden print-shadow-none print-p-0 print:border-none relative`}
      >
        {isExporting && (
          <div className="absolute inset-0 bg-bg/20 backdrop-blur-[1px] z-50 flex items-center justify-center no-print">
            <div className="bg-card/80 border border-accent/20 px-6 py-3 rounded shadow-2xl flex items-center gap-4">
              <Loader2 className="animate-spin text-accent" size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">渲染中 / Rendering...</span>
            </div>
          </div>
        )}
        {isEditing && (
          <div className="no-print p-4 md:p-6 bg-accent/5 border-b border-border flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <span className="text-[10px] font-bold text-accent uppercase tracking-widest">選擇合約樣式 / Style</span>
            <div className="flex gap-4 overflow-x-auto no-scrollbar w-full md:w-auto">
              {(['classic', 'modern', 'minimal'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setContractTheme(t)}
                  className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                    contractTheme === t ? 'bg-accent text-accent-foreground border-accent' : 'bg-transparent text-text-dim border-border hover:border-accent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Banner Section */}
        <div className="bg-[#111] p-6 md:p-16 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex flex-col gap-6">
            {(userProfile?.hasBrandKit || userProfile?.plan === 'pro') && userProfile?.brandLogo && (
              <div className="bg-white p-2 rounded inline-block self-start max-w-[200px]">
                <img src={userProfile.brandLogo} alt="Company Logo" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-serif text-text-main tracking-tight mb-3">
                工程報價單
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: accentColor || 'var(--color-accent)' }}>
                  Estimate ID: {id.slice(-12).toUpperCase()}
                </span>
                <div className="w-1 h-3 opacity-30" style={{ backgroundColor: accentColor || 'var(--color-accent)' }} />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-text-dim">
                    Provisional Quotation
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-left md:text-right border-l md:border-l-0 md:border-r border-accent/20 pl-6 md:pl-0 md:pr-6" style={{ borderColor: accentColor ? `${accentColor}33` : undefined }}>
            <h2 className="text-xl md:text-2xl font-serif" style={{ color: accentColor || 'var(--color-accent)' }}>{brandDisplayName}</h2>
            <p className="text-[10px] text-text-dim mt-2 tracking-widest font-mono uppercase">{user?.email}</p>
          </div>
        </div>

        {/* Client Info Section */}
        <div className="p-6 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
          <div className="space-y-8">
            <div className="flex justify-between items-center border-b border-border/50 pb-3">
              <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.3em]">客戶資訊 / Client Details</h3>
              {isEditing && (
                <button 
                  onClick={() => setShowContactPicker(true)}
                  className="flex items-center gap-1.5 text-[9px] font-black text-accent border border-accent/30 px-2 py-1 rounded hover:bg-accent/5 transition-all uppercase tracking-widest no-print"
                >
                  <UserCheck size={12} /> <span className="hidden sm:inline">快速帶入客戶 / Quick Load</span><span className="sm:hidden">匯入客戶</span>
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-text-dim uppercase tracking-widest">客戶名稱</label>
                  <input 
                    value={quote.clientName} 
                    onChange={e => setQuote({...quote, clientName: e.target.value})}
                    className="w-full bg-transparent border-b border-border p-2 text-text-main focus:border-accent outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-text-dim uppercase tracking-widest">統一編號</label>
                  <input 
                    value={quote.clientTaxId} 
                    onChange={e => setQuote({...quote, clientTaxId: e.target.value})}
                    className="w-full bg-transparent border-b border-border p-2 text-text-main focus:border-accent outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-text-dim uppercase tracking-widest">電話</label>
                  <input 
                    value={quote.clientPhone} 
                    onChange={e => setQuote({...quote, clientPhone: e.target.value})}
                    className="w-full bg-transparent border-b border-border p-2 text-text-main focus:border-accent outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-text-dim uppercase tracking-widest">施工地址</label>
                  <input 
                    value={quote.clientAddress} 
                    onChange={e => setQuote({...quote, clientAddress: e.target.value})}
                    className="w-full bg-transparent border-b border-border p-2 text-text-main focus:border-accent outline-none" 
                  />
                </div>
                {/* Sync to Directory Option */}
                <div className="mt-4 p-3 bg-accent/5 border border-accent/10 rounded items-center flex gap-3 group hover:bg-accent/10 transition-all cursor-pointer" onClick={() => setSaveToContacts(!saveToContacts)}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${saveToContacts ? 'bg-accent border-accent text-accent-foreground' : 'border-border bg-transparent text-transparent'}`}>
                    <CheckCircle2 size={10} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-accent uppercase tracking-widest leading-none">同步至客戶資料庫</div>
                    <p className="text-[8px] text-text-dim mt-1 uppercase tracking-tighter">Sync this client to your CRM database on save</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1">客戶名稱</div>
                  <div className="text-xl font-serif text-text-main">{quote.clientName}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1">統一編號</div>
                    <div className="text-sm font-mono text-text-main">{quote.clientTaxId || '---'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1">聯絡電話</div>
                    <div className="text-sm font-mono text-text-main">{quote.clientPhone || '---'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1">施工場址</div>
                  <div className="text-xs text-text-main leading-relaxed">{quote.clientAddress || '未填寫地址'}</div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.3em] border-b border-border/50 pb-3">工程細節 / Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-border/10 pb-2">
                <span className="text-[9px] text-text-dim uppercase tracking-widest">報價日期</span>
                <span className="font-mono text-sm">{quote.createdAt?.toDate().toLocaleDateString('zh-TW')}</span>
              </div>
              <div className="flex justify-between items-end border-b border-border/10 pb-2">
                <span className="text-[9px] text-text-dim uppercase tracking-widest">工程項目</span>
                <span className="font-serif text-text-main text-right">{quote.projectName}</span>
              </div>

              {!isEditing && quote.hasWarranty !== false && (
                <div className="space-y-1 mt-4">
                  <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1 flex items-center gap-2">
                    <ShieldCheck size={10} className="text-accent" />
                    本案享有工程保固服務
                  </div>
                  <div className="flex justify-between items-end border-b border-border/10 pb-2">
                    <span className="text-[9px] text-text-dim uppercase tracking-widest">保固期限 / Duration</span>
                    <span className="font-mono text-sm text-accent">{quote.warrantyDuration || '1年'}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-border/10 pb-2">
                    <span className="text-[9px] text-text-dim uppercase tracking-widest">保固起算 / From</span>
                    <span className="font-mono text-sm">{quote.warrantyStartDate || quote.createdAt?.toDate().toLocaleDateString('zh-TW')}</span>
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="hasWarranty"
                    checked={quote.hasWarranty ?? true}
                    onChange={e => setQuote({...quote, hasWarranty: e.target.checked})}
                    className="w-3 h-3 accent-accent"
                  />
                  <label htmlFor="hasWarranty" className="text-[9px] text-text-dim uppercase tracking-widest cursor-pointer select-none font-bold">
                    提供工程保固 / Project Warranty
                  </label>
                </div>

                {quote.hasWarranty !== false && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <label className="text-[8px] text-text-dim uppercase tracking-widest">保固時長</label>
                      <input 
                        value={quote.warrantyDuration || '1年'} 
                        onChange={e => setQuote({...quote, warrantyDuration: e.target.value})}
                        placeholder="例如: 1年, 24個月"
                        className="w-full bg-transparent border-b border-border py-1 text-[11px] text-text-main focus:border-accent outline-none font-mono" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-text-dim uppercase tracking-widest">起算日期</label>
                      <input 
                        type="date"
                        value={quote.warrantyStartDate || new Date().toISOString().split('T')[0]} 
                        onChange={e => setQuote({...quote, warrantyStartDate: e.target.value})}
                        className="w-full bg-transparent border-b border-border py-1 text-[11px] text-text-main focus:border-accent outline-none font-mono" 
                      />
                    </div>
                  </div>
                )}
                
                {quote.hasWarranty !== false && (
                  <div className="space-y-1">
                    <label className="text-[8px] text-text-dim uppercase tracking-widest">保固條款 / Terms</label>
                    <textarea 
                      value={quote.warrantyTerms || ''} 
                      onChange={e => setQuote({...quote, warrantyTerms: e.target.value})}
                      placeholder="輸入保固範圍與排除事項..."
                      rows={3}
                      className="w-full bg-[#111] border border-border/30 p-2 text-[10px] text-text-main outline-none focus:border-accent resize-none rounded-sm"
                    />
                  </div>
                )}
              </div>
              )}

              <div className="flex justify-between items-center py-2">
                <span className="text-[9px] text-text-dim uppercase tracking-widest">當前進度</span>
                <select 
                  className="no-print bg-bg border border-border text-[10px] font-bold uppercase tracking-widest px-3 py-1 text-accent outline-none focus:border-accent transition-all cursor-pointer"
                  value={quote.status}
                  onChange={e => setQuote({...quote, status: e.target.value})}
                >
                  <option value="draft">Draft / 草稿</option>
                  <option value="sent">Sent / 已發送</option>
                  <option value="accepted">Accepted / 已成交</option>
                  <option value="completed">Finished / 已完工</option>
                </select>
                <span className="print-only text-xs font-bold uppercase tracking-widest">{quote.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Item Table */}
        <div className="px-6 md:px-16 pb-16 overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-border">
                <th className="py-6 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium">工項規格與說明</th>
                <th className="py-6 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium text-center">數量</th>
                <th className="py-6 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium text-right">單位</th>
                <th className="py-6 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium text-right">單價</th>
                <th className="py-6 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium text-right">小計</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {/* Original Items */}
              {quote.items.filter((i: any) => !i.isVariation).map((item: any, idx: number) => {
                const originalIdx = quote.items.indexOf(item);
                return (
                  <tr key={`orig-${idx}`} className="group transition-all">
                    <td className="py-6 pr-12">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input 
                            value={item.name} 
                            onChange={e => updateItem(originalIdx, 'name', e.target.value)}
                            className="w-full bg-transparent border-b border-border/30 p-1 text-sm text-text-main outline-none focus:border-accent"
                          />
                          <textarea 
                            value={item.description} 
                            onChange={e => updateItem(originalIdx, 'description', e.target.value)}
                            className="w-full bg-transparent border border-border/30 p-1 text-[10px] text-text-dim outline-none focus:border-accent resize-none"
                            rows={1}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="text-sm font-serif text-text-main mb-1">{item.name}</div>
                          <div className="text-[10px] text-text-dim italic leading-relaxed opacity-60">{item.description}</div>
                        </>
                      )}
                    </td>
                    <td className="py-6 text-center">
                      {isEditing ? (
                        <input 
                          type="number"
                          value={item.quantity} 
                          onChange={e => updateItem(originalIdx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-[#111] border border-border/30 p-1 text-center text-sm outline-none focus:border-accent font-mono"
                        />
                      ) : (
                        <div className="font-mono text-sm text-text-dim">{item.quantity}</div>
                      )}
                    </td>
                    <td className="py-6 text-right">
                      {isEditing ? (
                        <input 
                          value={item.unit} 
                          onChange={e => updateItem(originalIdx, 'unit', e.target.value)}
                          className="w-12 bg-transparent border-b border-border/30 p-1 text-right text-[10px] outline-none focus:border-accent font-mono"
                        />
                      ) : (
                        <div className="text-right text-[10px] text-text-dim font-mono">{item.unit}</div>
                      )}
                    </td>
                    <td className="py-6 text-right">
                      {isEditing ? (
                        <input 
                          type="number"
                          value={item.unitPrice} 
                          onChange={e => updateItem(originalIdx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-24 bg-[#111] border border-border/30 p-1 text-right text-sm outline-none focus:border-accent font-mono text-success"
                        />
                      ) : (
                        <div className="font-mono text-sm text-text-dim">${item.unitPrice.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="py-6 text-right font-serif text-lg text-text-main relative">
                      ${(item.unitPrice * item.quantity).toLocaleString()}
                      {isEditing && (
                        <button 
                          onClick={() => removeItem(originalIdx)}
                          className="absolute -right-8 top-1/2 -translate-y-1/2 text-text-dim hover:text-red-400 p-1"
                        >
                          <Minus size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Variations Header */}
              {quote.items.some((i: any) => i.isVariation) && (
                <tr className="bg-purple-500/5">
                  <td colSpan={5} className="py-3 px-4 border-y border-purple-500/20">
                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       追加工程項目 / VARIATIONS & ADDITIONS
                    </div>
                  </td>
                </tr>
              )}

              {/* Variation Items */}
              {quote.items.filter((i: any) => i.isVariation).map((item: any, idx: number) => {
                const originalIdx = quote.items.indexOf(item);
                return (
                  <tr key={`var-${idx}`} className="group bg-purple-500/5 transition-all">
                    <td className="py-6 pr-12 pl-4">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input 
                            value={item.name} 
                            onChange={e => updateItem(originalIdx, 'name', e.target.value)}
                            className="w-full bg-transparent border-b border-purple-500/30 p-1 text-sm text-purple-200 outline-none focus:border-accent"
                          />
                          <textarea 
                            value={item.description} 
                            onChange={e => updateItem(originalIdx, 'description', e.target.value)}
                            className="w-full bg-transparent border border-purple-500/30 p-1 text-[10px] text-purple-300/70 outline-none focus:border-accent resize-none"
                            rows={1}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="text-sm font-serif text-purple-300 mb-1 flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-purple-500 text-white text-[8px] rounded-sm font-bold uppercase">追加</span>
                            {item.name}
                          </div>
                          <div className="text-[10px] text-purple-300/50 italic leading-relaxed">{item.description}</div>
                        </>
                      )}
                    </td>
                    <td className="py-6 text-center">
                      {isEditing ? (
                        <input 
                          type="number"
                          value={item.quantity} 
                          onChange={e => updateItem(originalIdx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-[#111] border border-purple-500/30 p-1 text-center text-sm outline-none focus:border-accent font-mono text-purple-300"
                        />
                      ) : (
                        <div className="font-mono text-sm text-purple-300">{item.quantity}</div>
                      )}
                    </td>
                    <td className="py-6 text-right">
                      {isEditing ? (
                        <input 
                          value={item.unit} 
                          onChange={e => updateItem(originalIdx, 'unit', e.target.value)}
                          className="w-12 bg-transparent border-b border-purple-500/30 p-1 text-right text-xs outline-none focus:border-accent font-mono text-purple-300"
                        />
                      ) : (
                        <div className="text-right text-xs text-purple-300 font-mono">{item.unit}</div>
                      )}
                    </td>
                    <td className="py-6 text-right">
                      {isEditing ? (
                        <input 
                          type="number"
                          value={item.unitPrice} 
                          onChange={e => updateItem(originalIdx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-24 bg-[#111] border border-purple-500/30 p-1 text-right text-sm outline-none focus:border-accent font-mono text-purple-300"
                        />
                      ) : (
                        <div className="font-mono text-sm text-purple-300">${item.unitPrice.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="py-6 text-right font-serif text-lg text-purple-400 relative">
                      ${(item.unitPrice * item.quantity).toLocaleString()}
                      {isEditing && (
                        <button 
                          onClick={() => removeItem(originalIdx)}
                          className="absolute -right-8 top-1/2 -translate-y-1/2 text-text-dim hover:text-red-400 p-1"
                        >
                          <Minus size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {isEditing && (
                <tr className="no-print">
                  <td colSpan={5} className="py-6 border-t border-border/20">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => addItem(false)}
                        className="flex items-center gap-2 text-[10px] text-text-dim hover:text-accent font-bold uppercase tracking-[0.2em] transition-all"
                      >
                        <Plus size={14} /> 新增原始項目
                      </button>
                      <button 
                        onClick={() => addItem(true)}
                        className="flex items-center gap-2 text-[10px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-[0.2em] transition-all"
                      >
                        <PlusCircle size={14} /> 新增追加項目
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Block */}
        <div className="p-12 md:p-16 bg-[#111] grid grid-cols-1 md:grid-cols-12 gap-16 border-t border-border">
          <div className="md:col-span-7 space-y-10">
            <div className="no-print">
              <h4 className="text-xs font-bold text-accent uppercase tracking-[0.3em] mb-6 flex items-center justify-between">
                <span>付款規則與進度 / Payment Schedule</span>
                {isEditing && (
                  <button 
                    onClick={addScheduleStage}
                    className="flex items-center gap-2 text-xs text-text-dim hover:text-accent transition-all"
                  >
                    <Plus size={14} /> 新增階段
                  </button>
                )}
              </h4>
              
              <div className="space-y-4">
                {paymentSchedule.map((s, idx) => {
                  const isPaid = payments.some(p => {
                    const pStage = p.paymentStage?.toLowerCase().trim() || '';
                    const sStage = s.stage?.toLowerCase().trim() || '';
                    return pStage === sStage || 
                           (sStage.includes('訂金') && pStage.includes('訂金')) ||
                           (sStage.includes('尾款') && pStage.includes('尾款'));
                  });
                  const stageAmount = Math.round(grandTotal * (s.percent / 100));

                  return (
                    <div 
                      key={s.id} 
                      className={`grid grid-cols-12 items-center gap-4 p-4 border rounded group transition-all ${isPaid ? 'bg-success/5 border-success/30' : 'bg-[#1A1A1A] border-border/30 hover:border-accent/40'}`}
                    >
                      <div className="col-span-1 flex justify-center">
                        {isPaid ? (
                          <div className="w-5 h-5 bg-success text-success-foreground rounded-full flex items-center justify-center shadow-lg shadow-success/20 animate-in zoom-in duration-300">
                            <Check size={12} strokeWidth={4} />
                          </div>
                        ) : (
                          !isEditing && (
                            <button 
                              onClick={() => {
                                setPaymentAmount(stageAmount.toString());
                                setPaymentStage(s.stage);
                                toast.info(`已準備好錄入「${s.stage}」款項`, { 
                                  description: `金額已自動帶入：NT$ ${stageAmount.toLocaleString()}`,
                                  icon: <DollarSign size={14} className="text-accent" />
                                });
                                document.getElementById('payment-ledger-anchor')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="w-5 h-5 rounded-full border border-border/50 flex items-center justify-center text-text-dim hover:border-accent hover:text-accent hover:bg-accent/10 transition-all group/check shadow-inner"
                              title="點擊以快速自動填寫此筆收款"
                            >
                              <Circle size={8} className="opacity-0 group-hover/check:opacity-100 transition-opacity fill-current scale-0 group-hover/check:scale-100 transition-transform duration-300" />
                            </button>
                          )
                        )}
                        {isEditing && (
                           <div className="w-5 h-5 rounded-full border border-border/30 border-dashed flex items-center justify-center opacity-50">
                             <Circle size={8} />
                           </div>
                        )}
                      </div>
                      <div className="col-span-5 flex items-center gap-3">
                        {isEditing ? (
                          <input 
                            value={s.stage}
                            onChange={e => updateScheduleStage(s.id, 'stage', e.target.value)}
                            className="w-full bg-transparent border-none text-xs text-text-main focus:ring-0 p-0 font-bold"
                            placeholder="進度名稱..."
                          />
                        ) : (
                          <span className={`text-xs font-serif ${isPaid ? 'text-success font-bold' : 'text-text-main'}`}>{s.stage}</span>
                        )}
                      </div>
                      <div className="col-span-3 flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="number"
                              value={s.percent}
                              onChange={e => updateScheduleStage(s.id, 'percent', parseInt(e.target.value) || 0)}
                              className="w-12 bg-[#0A0A0A] border border-border/50 rounded px-1 min-h-[32px] text-xs text-accent font-mono text-center focus:border-accent outline-none"
                            />
                            <span className="text-xs text-text-dim font-mono">%</span>
                          </div>
                        ) : (
                          <span className={`text-xs font-mono ${isPaid ? 'text-success' : 'text-accent'}`}>{s.percent}%</span>
                        )}
                      </div>
                      <div className="col-span-3 text-right">
                        <span className={`text-xs font-mono ${isPaid ? 'text-success opacity-80' : 'text-text-dim'}`}>
                          ${Math.round(grandTotal * (s.percent / 100)).toLocaleString()}
                        </span>
                      </div>
                      <div className="col-span-1 text-right">
                        {isEditing && (
                          <button 
                            onClick={() => removeScheduleStage(s.id)}
                            className="text-text-dim hover:text-red-400 p-2 transition-all"
                          >
                            <Minus size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                <div className="pt-2 flex justify-between items-center text-[10px] uppercase tracking-widest text-text-dim font-mono">
                  <span>分配比例總計: {paymentSchedule.reduce((sum, s) => sum + s.percent, 0)}%</span>
                  {paymentSchedule.reduce((sum, s) => sum + s.percent, 0) !== 100 && (
                    <span className="text-accent animate-pulse font-bold">需調整至 100%</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-border/20">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-bold text-accent uppercase tracking-[0.3em]">其他備註說明 / Terms</h4>
                {isEditing && (
                  <div className="flex gap-2 no-print">
                    <button 
                      onClick={() => setQuote({...quote, paymentTerms: "1. 本報價單有效期限為30天。\n2. 施工期間請提供水電以便作業。\n3. 完工後提供一年維修保固服務。"})}
                      className="text-[9px] px-2 py-1 bg-accent/10 text-accent border border-accent/20 rounded hover:bg-accent/20 transition-all"
                    >
                      標準條款
                    </button>
                    <button 
                      onClick={() => setQuote({...quote, paymentTerms: "1. 簽約金30%、工程中期款40%、完工尾款30%。\n2. 任何追加減項目需雙方簽名確認。\n3. 施工範圍外之項目另計。"})}
                      className="text-[9px] px-2 py-1 bg-accent/10 text-accent border border-accent/20 rounded hover:bg-accent/20 transition-all"
                    >
                      付款配套
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <textarea 
                  className="w-full bg-[#1A1A1A] border border-border p-4 rounded text-xs text-text-main focus:border-accent outline-none no-print"
                  rows={4}
                  value={quote.paymentTerms}
                  onChange={e => setQuote({...quote, paymentTerms: e.target.value})}
                  placeholder="編輯其他條約..."
                />
              ) : (
                <div className="text-[11px] text-text-dim leading-[1.8] font-sans whitespace-pre-wrap">
                  {quote.paymentTerms || "請於送貨前電話連繫。"}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-5 space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-xs text-text-dim uppercase tracking-widest">原始工程合計 Subtotal</span>
              <span className="font-mono text-sm text-text-dim">
                ${quote.items.filter((i: any) => !i.isVariation).reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0).toLocaleString()}
              </span>
            </div>
            {quote.items.some((i: any) => i.isVariation) && (
              <div className="flex justify-between items-end">
                <span className="text-xs text-purple-400 uppercase tracking-widest">追加工程合計 Variations</span>
                <span className="font-mono text-sm text-purple-400">
                  +${quote.items.filter((i: any) => i.isVariation).reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center border-b border-border/20 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-dim uppercase tracking-widest">營業稅率 VAT (5%)</span>
                {isEditing && (
                  <button 
                    onClick={() => setQuote({...quote, includeTax: !quote.includeTax})}
                    className={`no-print w-8 h-4 rounded-full p-0.5 transition-all ${quote.includeTax ? 'bg-accent' : 'bg-border'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-all ${quote.includeTax ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                )}
              </div>
              <span className="font-mono text-sm text-text-main">${tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-end py-6">
              <span className="text-[12px] font-serif uppercase tracking-[0.2em] text-accent">總計應收 Total</span>
              <span className="text-4xl font-serif text-text-main">NT$ {grandTotal.toLocaleString()}</span>
            </div>
            
            <div className="space-y-4 pt-6 border-t border-border/20 no-print">
              <div className="space-y-2">
                <div className="flex justify-between text-xs uppercase tracking-widest">
                  <span className="text-success font-bold">已實收 Received</span>
                  <span className="font-mono text-text-dim">
                    {Math.round(((quote.receivedAmount || 0) / grandTotal) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, ((quote.receivedAmount || 0) / grandTotal) * 100)}%` }}
                    className="h-full bg-success"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-success text-sm">-${(quote.receivedAmount || 0).toLocaleString()}</span>
                  <span className="text-[9px] text-text-dim">核對日期: {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex justify-between items-center px-4 py-3 bg-[#1A1A1A] border border-border rounded-sm">
                <span className="text-[10px] text-text-dim uppercase tracking-widest">目前待收餘額 Balance</span>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-serif text-accent">NT$ {(grandTotal - (quote.receivedAmount || 0)).toLocaleString()}</span>
                  {(grandTotal - (quote.receivedAmount || 0)) > 0 && (
                    <button 
                      onClick={handlePaymentReminder}
                      className="p-2 bg-accent/10 border border-accent/20 rounded text-accent hover:bg-accent hover:text-white transition-all no-print"
                      title="生成禮貌催款文字"
                    >
                      <MessageSquare size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Protection Watermark */}
        <div className="mt-auto p-12 border-t border-border/10 flex justify-between items-end opacity-20 hover:opacity-100 transition-opacity">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-accent" />
              <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-text-dim">
                Master Craft Digital Verification System
              </span>
            </div>
            <p className="text-[7px] font-mono text-text-dim/50 uppercase tracking-tighter">
              Doc Fingerprint: {id.slice(0, 8).toUpperCase()}-{user?.uid?.slice(-6).toUpperCase()}-{(quote.updatedAt?.toMillis ? quote.updatedAt.toMillis() : Date.now()).toString(36).toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-serif text-text-dim tracking-widest italic">
              © 2026 {user?.displayName || '匠心工程團隊'} All Rights Reserved.
            </p>
          </div>
        </div>

        {/* Near-invisible anti-counterfeit hash */}
        <div className="absolute bottom-1 right-1 opacity-[0.05] text-[5px] pointer-events-none font-mono tracking-tighter select-none">
          SYSTEM_DOC_VALIDATION_HASH_{id.slice(-12).toUpperCase()}
        </div>
      </div>

      {/* Payment Tracking (No Print) */}
      <div id="payment-ledger-anchor" className="no-print grid grid-cols-1 md:grid-cols-3 gap-10">
        <section className="col-span-1 bg-card p-10 rounded border border-border shadow-xl">
          <h3 className="text-[11px] font-bold text-accent uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
            <DollarSign size={16} />
            款項入帳程序
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] text-text-dim uppercase tracking-widest block">收款日期 / Date</label>
              <input 
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full bg-[#1A1A1A] border-b border-border py-3 text-text-main font-mono focus:border-accent outline-none text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-text-dim uppercase tracking-widest block">收款金額 / Amount</label>
              <input 
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder="例如: $50,000"
                className="w-full bg-[#1A1A1A] border-b border-border py-3 text-text-main font-mono focus:border-accent outline-none transition-all placeholder:text-text-dim/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-text-dim uppercase tracking-widest block">款項性質 / Category</label>
              <select 
                value={paymentStage}
                onChange={e => setPaymentStage(e.target.value)}
                className="w-full bg-[#1A1A1A] border-b border-border py-3 text-text-main focus:border-accent outline-none cursor-pointer text-xs"
              >
                {paymentSchedule.map(s => (
                  <option key={s.id} value={s.stage}>{s.stage} ({s.percent}%)</option>
                ))}
                <option value="custom">自定義項 / Custom</option>
              </select>
            </div>
            <button 
              onClick={handleAddPayment}
              className="w-full py-4 bg-accent text-accent-foreground font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all shadow-lg"
            >
              Confirm Transaction
            </button>
          </div>
        </section>

        <section className="col-span-2 bg-card p-10 rounded border border-border shadow-xl">
          <h3 className="text-[11px] font-bold text-text-main uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
            <History size={16} className="text-accent" />
            金流交易歷史清單 / Ledger
          </h3>
          {payments.length === 0 ? (
            <div className="h-48 flex items-center justify-center border border-dashed border-border/50 rounded">
              <p className="text-[10px] text-text-dim uppercase tracking-widest">No payment records found.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-auto pr-4">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-6 bg-[#1A1A1A]/50 border border-border rounded-sm group hover:border-accent/30 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="p-3 bg-accent/5 border border-accent/20 rounded text-accent">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <div className="text-lg font-serif text-text-main">${p.amount.toLocaleString()}</div>
                      <div className="text-[9px] text-text-dim font-mono uppercase tracking-widest mt-1">
                        {p.receivedDate instanceof Date ? p.receivedDate.toLocaleDateString() : p.receivedDate?.toDate().toLocaleDateString()} / {p.paymentStage}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-[11px] text-text-dim italic font-serif opacity-50">{p.note}</div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingPayment(p);
                          setEditPaymentData({
                            amount: p.amount.toString(),
                            stage: p.paymentStage,
                            date: p.receivedDate?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                            note: p.note || ''
                          });
                        }}
                        className="p-2 rounded text-text-dim hover:text-accent hover:bg-accent/10 transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeletePayment(p.id, p.amount)}
                        className={`p-2 rounded transition-all ${confirmingPaymentDelete === p.id ? 'bg-red-500 text-white' : 'text-text-dim hover:text-red-400 hover:bg-red-400/10'}`}
                      >
                        {confirmingPaymentDelete === p.id ? <span className="text-[8px] font-bold">確認？</span> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Floating Status Indicator */}
      {(grandTotal - (quote.receivedAmount || 0)) > 0 && quote.status === 'completed' && (
        <div className="no-print fixed bottom-10 right-10 bg-accent text-accent-foreground px-8 py-4 rounded shadow-2xl flex items-center gap-4 animate-bounce z-50">
          <AlertCircle size={24} />
          <span className="font-bold text-xs uppercase tracking-[0.1em]">Payment Reminder: Outstanding Balance Detected</span>
        </div>
      )}

      {/* Warranty Certificate Modal */}
      {isShowingWarrantySheet && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex flex-col items-center no-print overflow-y-auto px-4 py-8 md:p-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-4xl flex flex-col gap-6"
          >
            {/* Modal Controls - More prominent and responsive */}
            <div className="bg-card/50 backdrop-blur-md border border-white/10 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-[110] shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <ShieldCheck className="text-accent" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-serif text-white">保固證明書預覽</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Certificate Preview</p>
                </div>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={handleExportWarranty}
                  className="flex-1 sm:flex-none px-6 py-3 bg-accent text-accent-foreground rounded-lg text-[10px] font-bold uppercase tracking-widest hover:brightness-110 flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                >
                  <ImageIcon size={14} /> 儲存為映像 / Save
                </button>
                <button 
                  onClick={() => setIsShowingWarrantySheet(false)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white/70 transition-all active:scale-95"
                >
                  取消 / Cancel
                </button>
              </div>
            </div>

            {/* Certificate Layout */}
            <div 
              ref={warrantyRef}
              className="bg-white text-[#1a1a1a] p-16 md:p-32 rounded shadow-2xl relative overflow-hidden aspect-[1/1.414]"
              style={{ minHeight: '800px' }}
            >
              {/* Certificate Border Pattern */}
              <div className="absolute inset-8 border-[12px] border-double border-[#1a1a1a]/10 pointer-events-none" />
              <div className="absolute inset-4 border border-[#1a1a1a]/5 pointer-events-none" />
              
              {/* Corner Accents */}
              <div className="absolute top-8 left-8 w-24 h-24 border-t-2 border-l-2 border-[#1a1a1a]/40" />
              <div className="absolute top-8 right-8 w-24 h-24 border-t-2 border-r-2 border-[#1a1a1a]/40" />
              <div className="absolute bottom-8 left-8 w-24 h-24 border-b-2 border-l-2 border-[#1a1a1a]/40" />
              <div className="absolute bottom-8 right-8 w-24 h-24 border-b-2 border-r-2 border-[#1a1a1a]/40" />

              <div className="relative z-10 space-y-24 text-center">
                <div className="space-y-4">
                  <div className="flex justify-center mb-8">
                    <div className="w-20 h-20 border-2 border-[#1a1a1a] rounded-full flex items-center justify-center">
                      <ShieldCheck size={40} className="text-[#1a1a1a]" />
                    </div>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-serif tracking-widest uppercase">工程保固證明書</h1>
                  <p className="text-xs font-serif italic tracking-[0.3em] opacity-40">CERTIFICATE OF PERFORMANCE WARRANTY</p>
                </div>

                <div className="space-y-12 py-10">
                  <p className="text-lg font-serif leading-relaxed px-10">
                    本證明書特此確認位於 <span className="underline underline-offset-8 px-4 font-bold">{quote.clientAddress || '指定場址'}</span> 之工程項目
                    <br />
                    <span className="text-2xl font-serif block mt-6 mb-6 tracking-wide underline underline-offset-8">「{quote.projectName}」</span>
                    受本公司提供之專業工程品質保固服務。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-20 py-10 px-10 border-y border-[#1a1a1a]/10">
                  <div className="text-left space-y-6">
                    <div>
                      <span className="text-[10px] text-[#1a1a1a]/40 uppercase tracking-widest font-mono">保固對象 / Beneficiary</span>
                      <div className="text-xl font-serif border-b border-[#1a1a1a]/20 pb-2 mt-2">{quote.clientName}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#1a1a1a]/40 uppercase tracking-widest font-mono">保固期限 / Duration</span>
                      <div className="text-xl font-serif border-b border-[#1a1a1a]/20 pb-2 mt-2 text-accent">{quote.warrantyDuration || '1年'}</div>
                    </div>
                  </div>
                  <div className="text-left space-y-6">
                    <div>
                      <span className="text-[10px] text-[#1a1a1a]/40 uppercase tracking-widest font-mono">生效日期 / Effective Date</span>
                      <div className="text-xl font-serif border-b border-[#1a1a1a]/20 pb-2 mt-2">
                        {quote.warrantyStartDate || (quote.createdAt instanceof Date ? quote.createdAt.toLocaleDateString() : quote.createdAt?.toDate().toLocaleDateString())}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#1a1a1a]/40 uppercase tracking-widest font-mono">合約編號 / Record ID</span>
                      <div className="text-sm font-mono border-b border-[#1a1a1a]/20 pb-2 mt-2 opacity-50">{id.toUpperCase()}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-20 flex justify-between items-end px-10 text-left">
                  <div className="space-y-6">
                    <div className="text-[10px] text-[#1a1a1a]/40 uppercase tracking-widest font-mono">立書單位 / Issued By</div>
                    <div className="space-y-1">
                      <div className="text-2xl font-serif">{user?.displayName || '匠心工程團隊'}</div>
                      <div className="text-[10px] font-mono text-[#1a1a1a]/60 uppercase tracking-widest">Master Craft Engineering Co.</div>
                    </div>
                  </div>
                  <div className="w-40 h-40 border border-[#1a1a1a]/10 flex flex-col items-center justify-center relative">
                    <div className="absolute inset-0 opacity-5 pointer-events-none">
                      <Stamp className="w-full h-full p-4" />
                    </div>
                    <span className="text-[8px] text-[#1a1a1a]/30 uppercase tracking-widest font-bold">Official Seal</span>
                    <div className="w-24 h-24 rounded-full border-4 border-accent/20 flex items-center justify-center rotate-12">
                      <span className="text-[10px] text-accent font-black uppercase opacity-60">Verified</span>
                    </div>
                  </div>
                </div>

                <div className="pt-16 text-[9px] text-[#1a1a1a]/40 font-serif leading-relaxed px-10 whitespace-pre-wrap text-center">
                  {quote.warrantyTerms || '＊保固範圍僅限於合約內所載之施工項目與材料品質。如人為使用不當、天然災害或不可抗力之因素導致損壞，不在保固範圍內。\n本證明書需配合正式合約文件始生效力。'}
                </div>
              </div>

              {/* Decorative Subtle Stamp Overlay */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 opacity-[0.02] pointer-events-none">
                <Stamp className="w-full h-full" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 no-print">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-card border border-border shadow-2xl rounded-lg overflow-hidden"
          >
            <div className="p-8 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-serif text-text-main uppercase tracking-widest flex items-center gap-3">
                <Edit2 size={16} className="text-accent" />
                修改收款紀錄
              </h3>
              <button onClick={() => setEditingPayment(null)} className="text-text-dim hover:text-text-main">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] text-text-dim uppercase tracking-widest block">入帳金額 / Amount</label>
                <input 
                  type="number"
                  value={editPaymentData.amount}
                  onChange={e => setEditPaymentData({ ...editPaymentData, amount: e.target.value })}
                  className="w-full bg-[#1A1A1A] border-b border-border py-4 text-text-main font-mono text-xl focus:border-accent outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-text-dim uppercase tracking-widest block">收款日期 / Date</label>
                <input 
                  type="date"
                  value={editPaymentData.date}
                  onChange={e => setEditPaymentData({ ...editPaymentData, date: e.target.value })}
                  className="w-full bg-[#1A1A1A] border-b border-border py-3 text-text-main font-mono focus:border-accent outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-text-dim uppercase tracking-widest block">備註 / Note</label>
                <input 
                  type="text"
                  value={editPaymentData.note}
                  onChange={e => setEditPaymentData({ ...editPaymentData, note: e.target.value })}
                  placeholder="可選填例如: 現金收款、匯款..."
                  className="w-full bg-[#1A1A1A] border-b border-border py-3 text-text-main focus:border-accent outline-none placeholder:opacity-30"
                />
              </div>
            </div>

            <div className="p-8 bg-white/5 flex gap-4">
              <button 
                onClick={() => setEditingPayment(null)}
                className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest text-text-dim hover:text-text-main transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleUpdatePayment}
                className="flex-[2] py-4 bg-accent text-accent-foreground font-bold text-[10px] uppercase tracking-widest hover:brightness-110 shadow-lg"
              >
                確認更新紀錄
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Contact Selection Modal */}
      <ContactSelectionModal 
        userId={user?.uid || ''}
        type="clients"
        isOpen={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSelect={handleSelectContact}
      />
    </div>
  );
}
