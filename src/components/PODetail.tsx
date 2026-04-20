import { useState, useEffect, useRef } from 'react';
import { firestoreService } from '../services/firestoreService';
import { User } from 'firebase/auth';
import { toPng } from 'html-to-image';
import { 
  ArrowLeft, 
  Printer, 
  Save, 
  Trash2,
  Plus,
  PlusCircle,
  Minus,
  Building2, 
  Phone, 
  MapPin, 
  User as UserIcon,
  Loader2,
  DollarSign,
  History,
  CheckCircle2,
  AlertCircle,
  FileText,
  Ban,
  Share2,
  Truck,
  ShieldCheck,
  UserCheck,
  Image as ImageIcon
} from 'lucide-react';
import { ContactSelectionModal } from './ContactSelectionModal';
import { toast } from 'sonner';

interface PODetailProps {
  id: string;
  user: User | null;
  userProfile?: any;
  onBack: () => void;
}

export function PODetail({ id, user, userProfile, onBack }: PODetailProps) {
  const [po, setPO] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingVoid, setConfirmingVoid] = useState(false);
  const [saveToContacts, setSaveToContacts] = useState(true);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}?poId=${id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('分享連結已複製', {
      description: '您的供應商或同事登入後即可直接查看此採購單。',
      icon: <Share2 className="text-accent" />
    });
  };

  const handleExportImage = async () => {
    if (!contentRef.current) return;
    
    setIsExporting(true);
    const toastId = toast.loading('正在產生採購單圖片...', { 
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
      link.download = `採購單-${po.projectName || '材料'}-${id.slice(-6)}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('採購圖片已儲存', { 
        id: toastId, 
        description: po.status === 'draft' ? '採購單已同步轉為「已發送」。' : '您現在可以透過通訊軟體傳送圖片給供應商。' 
      });

      // Auto-update status to 'sent' if it's currently draft
      if (po.status === 'draft') {
        await firestoreService.updatePurchaseOrder(id, { status: 'sent' });
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
    const data = await firestoreService.getPurchaseOrder(id);
    setPO(data);
    setLoading(false);
  }

  const handleSelectSupplier = (contact: any) => {
    setPO({
      ...po,
      supplierName: contact.name || '',
      supplierPhone: contact.phone || '',
      supplierFax: contact.fax || '',
      supplierAddress: contact.address || ''
    });
    setSaveToContacts(false);
    setShowContactPicker(false);
    toast.success(`已帶入供應商: ${contact.name}`);
  };

  const handleUpdate = async () => {
    if (!po) return;
    setLoading(true);
    try {
      const subtotal = po.items.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0);
      const taxAmount = po.includeTax ? Math.round(subtotal * 0.05) : 0;
      
      // Clean system fields
      const { id: _, createdAt: __, updatedAt: ___, ...updateData } = po;
      
      // Auto-save to contacts if enabled
      if (user && saveToContacts && po.supplierName) {
        const existing = await firestoreService.findContactByName(user.uid, po.supplierName, 'suppliers');
        if (!existing) {
          await firestoreService.createSupplier({
            userId: user.uid,
            name: po.supplierName,
            phone: po.supplierPhone || '',
            fax: po.supplierFax || '',
            address: po.supplierAddress || '',
            category: '一般供應商'
          });
        }
      }

      await firestoreService.updatePurchaseOrder(id, {
        ...updateData,
        subtotal,
        totalAmount: subtotal + taxAmount,
        warrantyDuration: po.warrantyDuration || '',
        warrantyProvider: po.warrantyProvider || po.supplierName || ''
      });
      setIsEditing(false);
      await loadData();
    } catch (e) {
      console.error(e);
      toast.error('採購單更新失敗。');
    } finally {
      setLoading(false);
    }
  };

  const handleVoidPO = async () => {
    if (!confirmingVoid) {
      setConfirmingVoid(true);
      setTimeout(() => setConfirmingVoid(false), 3000);
      return;
    }
    setLoading(true);
    try {
      await firestoreService.deletePurchaseOrder(id);
      toast.success('採購單已刪除');
      setConfirmingVoid(false);
      onBack();
    } catch (e) {
      console.error(e);
      toast.error('操作失敗');
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...po.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setPO({ ...po, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = po.items.filter((_: any, i: number) => i !== index);
    setPO({ ...po, items: newItems });
  };

  const addItem = (isVariation: boolean = false) => {
    const newItem = { 
      name: isVariation ? '追加採購材料' : '新材料', 
      category: 'material', 
      quantity: 1, 
      unit: '個', 
      unitPrice: 0, 
      description: '',
      isVariation: isVariation
    };
    setPO({ ...po, items: [...(po.items || []), newItem] });
  };

  if (loading || !po) return <div className="p-20 text-center font-mono text-[10px] uppercase tracking-widest text-text-dim animate-pulse">Synchronizing Procurement Data...</div>;

  const subtotal = po.items?.reduce((sum: number, i: any) => sum + (i.unitPrice * i.quantity), 0) || 0;
  const tax = po.includeTax ? Math.round(subtotal * 0.05) : 0;
  const grandTotal = subtotal + tax;

  const accentColor = (userProfile?.hasBrandKit || userProfile?.plan === 'pro') && userProfile?.brandColor ? userProfile.brandColor : undefined;
  const brandDisplayName = userProfile?.displayName || user?.displayName || '匠心工程團隊';

  const isOwner = user?.uid === po.userId;

  return (
    <div className="space-y-10 pb-20">
      {/* Header Actions */}
      <div className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <button onClick={onBack} className="flex items-center gap-3 text-text-dim hover:text-accent transition-all text-xs uppercase tracking-widest font-mono min-h-[44px]">
          <ArrowLeft size={16} /> 返回採購列表 / Back
        </button>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto">
          <button 
            onClick={() => window.print()} 
            className="flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border text-text-main text-[10px] font-bold uppercase tracking-widest hover:border-accent transition-all min-h-[44px]"
          >
            <Printer size={14} /> 列印 / Print
          </button>
          <button 
            onClick={handleShareLink} 
            className="flex items-center justify-center gap-2 px-4 py-3 bg-card border border-border text-accent text-[10px] font-bold uppercase tracking-widest hover:border-accent transition-all min-h-[44px]"
            title="分享採購單連結"
          >
            <Share2 size={14} /> 分享連結 / Share
          </button>
          <button 
            onClick={handleExportImage} 
            className="flex items-center justify-center gap-2 px-4 py-3 bg-accent/20 border border-accent/40 text-accent text-[10px] font-bold uppercase tracking-widest hover:bg-accent hover:text-white transition-all font-mono min-h-[44px]"
            title="下載採購單圖片"
          >
            <ImageIcon size={14} /> 儲存圖片 / Download
          </button>
          
          {isOwner && (
            <>
              <button 
                onClick={handleVoidPO}
                className={`flex items-center justify-center gap-2 px-4 py-3 border text-[10px] font-bold uppercase tracking-widest transition-all font-mono min-h-[44px] ${
                  confirmingVoid
                    ? 'bg-red-500 text-white border-red-500 scale-105' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                }`}
              >
                <Ban size={14} /> {confirmingVoid ? '確定作廢？' : '作廢 / Void'}
              </button>
              <button 
                onClick={() => isEditing ? handleUpdate() : setIsEditing(true)} 
                className={`flex items-center justify-center gap-3 px-6 py-3 border-2 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl rounded-sm min-h-[44px] ${
                  isEditing ? 'bg-success text-white border-success hover:brightness-110' : 'bg-accent text-accent-foreground border-accent hover:bg-transparent hover:text-accent'
                }`}
              >
                {isEditing ? <Save size={18} /> : <FileText size={18} />}
                {isEditing ? '儲存 / Save' : '編輯 / Edit'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main PO Card */}
      <div 
        ref={contentRef}
        className="bg-card rounded shadow-2xl border border-border overflow-hidden print:border-none relative"
      >
        {isExporting && (
          <div className="absolute inset-0 bg-bg/20 backdrop-blur-[1px] z-50 flex items-center justify-center no-print">
            <div className="bg-card/80 border border-accent/20 px-6 py-3 rounded shadow-2xl flex items-center gap-4">
              <Loader2 className="animate-spin text-accent" size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">渲染中 / Rendering...</span>
            </div>
          </div>
        )}
        {/* Banner Section */}
        <div className="bg-[#0A0A0A] p-6 md:p-16 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-6">
            {(userProfile?.hasBrandKit || userProfile?.plan === 'pro') && userProfile?.brandLogo && (
              <div className="bg-white p-2 rounded inline-block self-start max-w-[200px]">
                <img src={userProfile.brandLogo} alt="Company Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-serif text-text-main tracking-tight mb-3">材料採購單</h1>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: accentColor || 'var(--color-accent)' }}>
                  PO-NUMBER: {id.slice(-12).toUpperCase()}
                </span>
                <div className="w-1 h-3 opacity-30" style={{ backgroundColor: accentColor || 'var(--color-accent)' }} />
                <span className="text-[10px] font-mono text-text-dim uppercase tracking-widest">
                  {po.status === 'sent' ? 'Sent' : po.status === 'ordered' ? 'Ordered' : po.status === 'received' ? 'Received' : po.status === 'cancelled' ? 'Voided' : 'Draft'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-left md:text-right border-l md:border-l-0 md:border-r border-accent/20 pl-6 md:pl-0 md:pr-6" style={{ borderColor: accentColor ? `${accentColor}33` : undefined }}>
            <h2 className="text-xl md:text-2xl font-serif" style={{ color: accentColor || 'var(--color-accent)' }}>{brandDisplayName}</h2>
            <p className="text-[10px] text-text-dim mt-2 tracking-widest font-mono uppercase">{user?.email}</p>
          </div>
        </div>

        {/* Supplier Info Section */}
        <div className="p-6 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
          <div className="space-y-8">
            <div className="flex justify-between items-center border-b border-border/50 pb-3">
              <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.3em]">供應商資訊 / Supplier Details</h3>
              {isEditing && (
                <button 
                  onClick={() => setShowContactPicker(true)}
                  className="flex items-center gap-1.5 text-[9px] font-black text-accent border border-accent/30 px-2 py-1 rounded hover:bg-accent/5 transition-all uppercase tracking-widest no-print"
                >
                  <UserCheck size={12} /> <span className="hidden sm:inline">快速帶入 / Quick Load</span><span className="sm:hidden">匯入</span>
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] text-text-dim uppercase tracking-widest">供應商名稱</label>
                  <input 
                    value={po.supplierName} 
                    onChange={e => setPO({...po, supplierName: e.target.value})}
                    placeholder="請輸入公司名稱"
                    className="w-full bg-transparent border-b border-border p-2 text-text-main focus:border-accent outline-none" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] text-text-dim uppercase tracking-widest">聯絡電話</label>
                    <input 
                      value={po.supplierPhone || ''} 
                      onChange={e => setPO({...po, supplierPhone: e.target.value})}
                      placeholder="電話"
                      className="w-full bg-transparent border-b border-border p-2 text-text-main focus:border-accent outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] text-text-dim uppercase tracking-widest">傳真號碼</label>
                    <input 
                      value={po.supplierFax || ''} 
                      onChange={e => setPO({...po, supplierFax: e.target.value})}
                      placeholder="傳真"
                      className="w-full bg-transparent border-b border-border p-2 text-text-main focus:border-accent outline-none" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-text-dim uppercase tracking-widest">送貨 / 聯繫地址</label>
                  <input 
                    value={po.supplierAddress} 
                    onChange={e => setPO({...po, supplierAddress: e.target.value})}
                    className="w-full bg-transparent border-b border-border p-2 text-text-main focus:border-accent outline-none" 
                  />
                </div>
                {/* Sync to Directory Option */}
                <div className="mt-4 p-3 bg-accent/5 border border-accent/10 rounded items-center flex gap-3 group hover:bg-accent/10 transition-all cursor-pointer" onClick={() => setSaveToContacts(!saveToContacts)}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${saveToContacts ? 'bg-accent border-accent text-accent-foreground' : 'border-border bg-transparent text-transparent'}`}>
                    <CheckCircle2 size={10} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-accent uppercase tracking-widest leading-none">同步至供應商資料庫</div>
                    <p className="text-[8px] text-text-dim mt-1 uppercase tracking-tighter">Sync this supplier to your CRM database on save</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1">供應商</div>
                  <div className="text-xl font-serif text-text-main">{po.supplierName || '---'}</div>
                </div>
                <div>
                  <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1">聯繫資訊</div>
                  <div className="text-sm font-mono text-text-main">
                    {po.supplierPhone || '---'}
                    {po.supplierFax && <span className="text-text-dim ml-2">(Fax: {po.supplierFax})</span>}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1">指定地址</div>
                  <div className="text-xs text-text-main leading-relaxed">{po.supplierAddress || '---'}</div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.3em] border-b border-border/50 pb-3">採購摘要 / Order Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-border/10 pb-2">
                <span className="text-[9px] text-text-dim uppercase tracking-widest">下單日期</span>
                <span className="font-mono text-sm">{po.createdAt?.toDate().toLocaleDateString('zh-TW')}</span>
              </div>
              <div className="flex justify-between items-end border-b border-border/10 pb-2">
                <span className="text-[9px] text-text-dim uppercase tracking-widest">關聯專案</span>
                <span className="font-serif text-text-main text-right truncate ml-4">{po.projectName}</span>
              </div>
              <div className="flex justify-between items-end border-b border-border/10 pb-2">
                <span className="text-[9px] text-text-dim uppercase tracking-widest flex items-center gap-1">
                  <Truck size={10} className="text-accent" /> 預計到貨日期 / ETA
                </span>
                {isEditing ? (
                  <input 
                    type="date"
                    value={po.estimatedDeliveryDate || ''}
                    onChange={e => setPO({...po, estimatedDeliveryDate: e.target.value})}
                    className="bg-transparent border-b border-accent/30 p-0 text-right text-xs font-mono outline-none focus:border-accent text-accent"
                  />
                ) : (
                  <span className="font-mono text-sm text-accent">{po.estimatedDeliveryDate || '未設定'}</span>
                )}
              </div>

              {/* Warranty Section */}
              <div className="pt-4 space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[8px] text-text-dim uppercase tracking-widest flex items-center gap-1">
                        <ShieldCheck size={10} className="text-accent" /> 供應商提供的保固期限
                      </label>
                      <input 
                        value={po.warrantyDuration || ''} 
                        onChange={e => setPO({...po, warrantyDuration: e.target.value})}
                        placeholder="例如: 產品5年保固"
                        className="w-full bg-transparent border-b border-border py-1 text-[11px] text-text-main focus:border-accent outline-none font-mono" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-text-dim uppercase tracking-widest">保固提供者 / Provider</label>
                      <input 
                        value={po.warrantyProvider || po.supplierName || ''} 
                        onChange={e => setPO({...po, warrantyProvider: e.target.value})}
                        placeholder="預設為供應商名稱"
                        className="w-full bg-transparent border-b border-border py-1 text-[11px] text-text-main focus:border-accent outline-none font-mono" 
                      />
                    </div>
                  </div>
                ) : (
                  po.warrantyDuration && (
                    <div className="space-y-1 mt-4 animate-in fade-in slide-in-from-top-2">
                       <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1 flex items-center gap-2">
                        <ShieldCheck size={10} className="text-accent" />
                        本採購案包含產品保固
                      </div>
                      <div className="flex justify-between items-end border-b border-border/10 pb-2">
                        <span className="text-[9px] text-text-dim uppercase tracking-widest">保固期限 / Duration</span>
                        <span className="font-mono text-sm text-accent">{po.warrantyDuration}</span>
                      </div>
                      <div className="flex justify-between items-end border-b border-border/10 pb-2">
                        <span className="text-[9px] text-text-dim uppercase tracking-widest">提供者 / Provider</span>
                        <span className="font-serif text-sm">{po.warrantyProvider || po.supplierName}</span>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-[9px] text-text-dim uppercase tracking-widest">訂單狀態</span>
                <select 
                  className="bg-bg border border-border text-[10px] font-bold uppercase tracking-widest px-3 py-1 text-accent outline-none focus:border-accent transition-all cursor-pointer no-print"
                  value={po.status}
                  onChange={e => setPO({...po, status: e.target.value})}
                >
                  <option value="draft">Draft / 草稿</option>
                  <option value="sent">Sent / 已發送</option>
                  <option value="ordered">Ordered / 已下單</option>
                  <option value="received">Received / 已到貨</option>
                </select>
                <span className="print-only text-xs font-bold uppercase tracking-widest">{po.status}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Item Table */}
        <div className="px-6 md:px-16 pb-16 overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-border">
                <th className="py-6 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium">材料品名與規格</th>
                <th className="py-6 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium text-center">採購數量</th>
                <th className="py-6 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium text-right">單位</th>
                <th className="py-6 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium text-right">單價</th>
                <th className="py-6 text-[10px] text-text-dim uppercase tracking-[0.2em] font-medium text-right">金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {/* Original Items */}
              {po.items?.filter((i: any) => !i.isVariation).map((item: any, idx: number) => {
                const originalIdx = po.items.indexOf(item);
                return (
                  <tr key={`orig-${idx}`} className="group">
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
              {po.items?.some((i: any) => i.isVariation) && (
                <tr className="bg-orange-500/5">
                  <td colSpan={5} className="py-3 px-4 border-y border-orange-500/20">
                    <div className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       追加 / 補料項目 VARIATIONS & LATE ORDERS
                    </div>
                  </td>
                </tr>
              )}

              {/* Variation Items */}
              {po.items?.filter((i: any) => i.isVariation).map((item: any, idx: number) => {
                const originalIdx = po.items.indexOf(item);
                return (
                  <tr key={`var-${idx}`} className="group bg-orange-500/5 transition-all">
                    <td className="py-6 pr-12 pl-4">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input 
                            value={item.name} 
                            onChange={e => updateItem(originalIdx, 'name', e.target.value)}
                            className="w-full bg-transparent border-b border-orange-500/30 p-1 text-sm text-orange-200 outline-none focus:border-accent"
                          />
                          <textarea 
                            value={item.description} 
                            onChange={e => updateItem(originalIdx, 'description', e.target.value)}
                            className="w-full bg-transparent border border-orange-500/30 p-1 text-[10px] text-orange-300/70 outline-none focus:border-accent resize-none"
                            rows={1}
                          />
                        </div>
                      ) : (
                        <>
                          <div className="text-sm font-serif text-orange-300 mb-1 flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[8px] rounded-sm font-bold uppercase">追加</span>
                            {item.name}
                          </div>
                          <div className="text-[10px] text-orange-300/50 italic leading-relaxed">{item.description}</div>
                        </>
                      )}
                    </td>
                    <td className="py-6 text-center">
                      {isEditing ? (
                        <input 
                          type="number"
                          value={item.quantity} 
                          onChange={e => updateItem(originalIdx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-[#111] border border-orange-500/30 p-1 text-center text-sm outline-none focus:border-accent font-mono text-orange-300"
                        />
                      ) : (
                        <div className="font-mono text-sm text-orange-300">{item.quantity}</div>
                      )}
                    </td>
                    <td className="py-6 text-right">
                      {isEditing ? (
                        <input 
                          value={item.unit} 
                          onChange={e => updateItem(originalIdx, 'unit', e.target.value)}
                          className="w-12 bg-transparent border-b border-orange-500/30 p-1 text-right text-[10px] outline-none focus:border-accent font-mono text-orange-300"
                        />
                      ) : (
                        <div className="text-right text-[10px] text-orange-300 font-mono">{item.unit}</div>
                      )}
                    </td>
                    <td className="py-6 text-right">
                      {isEditing ? (
                        <input 
                          type="number"
                          value={item.unitPrice} 
                          onChange={e => updateItem(originalIdx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-24 bg-[#111] border border-orange-500/30 p-1 text-right text-sm outline-none focus:border-accent font-mono text-orange-300"
                        />
                      ) : (
                        <div className="font-mono text-sm text-orange-300">${item.unitPrice.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="py-6 text-right font-serif text-lg text-orange-400 relative">
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
                        <Plus size={14} /> 新增原始材料
                      </button>
                      <button 
                        onClick={() => addItem(true)}
                        className="flex items-center gap-2 text-[10px] text-orange-400 hover:text-orange-300 font-bold uppercase tracking-[0.2em] transition-all"
                      >
                        <PlusCircle size={14} /> 新增追加/補料
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Block */}
        <div className="p-12 md:p-16 bg-[#0A0A0A] grid grid-cols-1 md:grid-cols-12 gap-16 border-t border-border">
          <div className="md:col-span-8 space-y-6">
            <h4 className="text-[10px] font-bold text-accent uppercase tracking-[0.3em]">特別備註說明 / Special Instructions</h4>
            <div className="text-[11px] text-text-dim leading-[1.8] font-sans pb-4">
              {po.notes || "請於送貨前電話連繫，並開立二聯式發票。"}
            </div>
            {isEditing && (
              <textarea 
                className="w-full bg-[#1A1A1A] border border-border p-4 rounded text-xs text-text-main focus:border-accent outline-none no-print"
                rows={4}
                value={po.notes}
                onChange={e => setPO({...po, notes: e.target.value})}
                placeholder="編輯追加備註..."
              />
            )}
          </div>

          <div className="md:col-span-4 space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono">原始採購合計 Subtotal</span>
              <span className="font-mono text-xs text-text-dim">
                ${po.items?.filter((i: any) => !i.isVariation).reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0).toLocaleString() || 0}
              </span>
            </div>
            {po.items?.some((i: any) => i.isVariation) && (
              <div className="flex justify-between items-end">
                <span className="text-[9px] text-orange-400 uppercase tracking-widest font-mono">追加/補料合計 Variations</span>
                <span className="font-mono text-xs text-orange-400">
                  +${po.items?.filter((i: any) => i.isVariation).reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0).toLocaleString() || 0}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center border-b border-border/20 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-[9px] text-text-dim uppercase tracking-widest font-mono">VAT (5%)</span>
                {isEditing && (
                  <button 
                    onClick={() => setPO({...po, includeTax: !po.includeTax})}
                    className={`no-print w-8 h-4 rounded-full p-0.5 transition-all ${po.includeTax ? 'bg-orange-500' : 'bg-border'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full transition-all ${po.includeTax ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                )}
              </div>
              <span className="font-mono text-sm text-text-main">${tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-end py-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">總計支付應額 TOTAL</span>
              <span className="text-3xl font-serif text-text-main">NT$ {grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Brand Protection Watermark */}
        <div className="mt-auto p-12 border-t border-border/10 flex justify-between items-end opacity-20 hover:opacity-100 transition-opacity">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-accent" />
              <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-text-dim">
                Master Craft Procurement Auth
              </span>
            </div>
            <p className="text-[7px] font-mono text-text-dim/50 uppercase tracking-tighter">
              PO Auth Hash: {id.slice(0, 8).toUpperCase()}-{user?.uid?.slice(-6).toUpperCase()}-{(po.updatedAt?.toMillis ? po.updatedAt.toMillis() : Date.now()).toString(36).toUpperCase()}
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
          SYSTEM_PO_VALIDATION_HASH_{id.slice(-12).toUpperCase()}
        </div>
      </div>

      {/* Contact Selection Modal */}
      <ContactSelectionModal 
        userId={user?.uid || ''}
        type="suppliers"
        isOpen={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSelect={handleSelectSupplier}
      />
    </div>
  );
}
