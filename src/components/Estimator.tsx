import { useState } from 'react';
import { geminiService, EstimateResult, EstimateLineItem } from '../services/geminiService';
import { firestoreService } from '../services/firestoreService';
import { calculateTrialDays } from '../lib/utils';
import { User } from 'firebase/auth';
import { toast } from 'sonner';
import { Search, Sparkles, Plus, Minus, AlertCircle, Save, Loader2, Info, FileText, User as UserIcon, PlusCircle, UserCheck } from 'lucide-react';
import { ContactSelectionModal } from './ContactSelectionModal';

interface EstimatorProps {
  user: User | null;
  userProfile: any;
  onQuoteCreated: (id: string) => void;
  onPOCreated: (id: string) => void;
  onShowPricing: () => void;
}

export function Estimator({ user, userProfile, onQuoteCreated, onPOCreated, onShowPricing }: EstimatorProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [includeTax, setIncludeTax] = useState(true);
  const [saveToContacts, setSaveToContacts] = useState(true);
  const [clientInfo, setClientInfo] = useState({
    name: '',
    phone: '',
    taxId: '',
    address: ''
  });

  const isPro = userProfile?.plan === 'pro' || userProfile?.role === 'admin';
  
  const handleSelectContact = (contact: any) => {
    setClientInfo({
      name: contact.name || '',
      phone: contact.phone || '',
      taxId: contact.taxId || contact.companyName || '',
      address: contact.address || ''
    });
    setSaveToContacts(false);
    setShowContactPicker(false);
    toast.success(`已從資料庫帶入客戶: ${contact.name}`);
  };
  const trialDaysRemaining = calculateTrialDays(userProfile?.trialExpiresAt);

  const isInTrial = userProfile?.plan === 'pro_trial';

  const handleManualStart = () => {
    setResult({
      projectName: '自定義工程項目',
      items: [{
        name: '新工項',
        category: 'material',
        quantity: 1,
        unit: '式',
        unitPrice: 0,
        description: '請點擊此處輸入說明...'
      }],
      tips: ['您可以點擊表格直接修改金額與內容', '點擊「新增自定義工項」來擴充清單']
    });
  };

  const handleEstimate = async () => {
    if (!user) return;
    
    // 1. Check if user has access (Pro, Trial, or Points)
    // Pro Trial users should have full access during their trial period
    const pointsCost = 10;
    const canUsePoints = (userProfile?.points || 0) >= pointsCost;
    
    if (!isPro && !isInTrial && !canUsePoints) {
      onShowPricing();
      toast.info("點數不足", { description: `AI 智慧估價為專業版功能。每次估價需 10 點，您目前剩餘 ${userProfile?.points || 0} 點。` });
      return;
    }

    if (!input.trim()) return;
    setLoading(true);
    try {
      // 2. Check cache first (Cache is free)
      const cached = await firestoreService.findAIEstimate(input);
      if (cached) {
        setResult(cached);
        setLoading(false);
        return;
      }

      // 3. If not in cache and not Pro/Trial, deduct points
      if (!isPro && !isInTrial) {
        const deducted = await firestoreService.deductPoints(user.uid, pointsCost);
        if (!deducted) {
          toast.error("扣除點數失敗，請稍後再試。");
          setLoading(false);
          return;
        }
        toast.info(`已扣除 ${pointsCost} 點免費點數`);
      }

      // 4. Call API
      const data = await geminiService.estimateTask(input);
      setResult(data);
      
      // 5. Save to cache
      await firestoreService.saveAIEstimate(input, data);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "估價失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, field: keyof EstimateLineItem, value: any) => {
    if (!result) return;
    const newItems = [...result.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setResult({ ...result, items: newItems });
  };

  const removeItem = (index: number) => {
    if (!result) return;
    const newItems = result.items.filter((_, i) => i !== index);
    setResult({ ...result, items: newItems });
  };

  const addItem = () => {
    if (!result) return;
    const newItem: EstimateLineItem = {
      name: '新工項',
      category: 'material',
      quantity: 1,
      unit: '式',
      unitPrice: 0,
      description: ''
    };
    setResult({ ...result, items: [...result.items, newItem] });
  };

  const handleSaveAsQuote = async () => {
    if (!user || !result) return;
    if (!clientInfo.name) {
      toast.error("請輸入客戶名稱");
      return;
    }
    
    setSaving(true);
    try {
      // Auto-save to contacts if enabled
      if (saveToContacts) {
        const existing = await firestoreService.findContactByName(user.uid, clientInfo.name, 'clients');
        if (!existing) {
          await firestoreService.createClient({
            userId: user.uid,
            name: clientInfo.name,
            phone: clientInfo.phone,
            taxId: clientInfo.taxId,
            address: clientInfo.address
          });
        }
      }

      const subtotal = result.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const taxRate = 0.05;
      const taxAmount = includeTax ? Math.round(subtotal * taxRate) : 0;
      
      const quoteData = {
        userId: user.uid,
        clientName: clientInfo.name,
        clientPhone: clientInfo.phone,
        clientTaxId: clientInfo.taxId,
        clientAddress: clientInfo.address,
        projectName: result.projectName,
        items: result.items,
        subtotal,
        includeTax,
        taxRate,
        taxAmount,
        totalAmount: subtotal + taxAmount,
        status: 'draft',
        receivedAmount: 0
      };
      const id = await firestoreService.createQuote(quoteData);
      if (id) {
        // Automatically activate trial on first quote if not already started
        await firestoreService.activateTrial(user.uid);
        onQuoteCreated(id);
      }
    } catch (error) {
      console.error(error);
      toast.error("儲存報價單失敗。");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsPO = async () => {
    if (!user || !result) return;
    if (!clientInfo.name) {
      toast.error("請輸入供應商名稱");
      return;
    }

    setSaving(true);
    try {
      // Auto-save to contacts if enabled
      if (saveToContacts) {
        const existing = await firestoreService.findContactByName(user.uid, clientInfo.name, 'suppliers');
        if (!existing) {
          await firestoreService.createSupplier({
            userId: user.uid,
            name: clientInfo.name,
            phone: clientInfo.phone,
            address: clientInfo.address,
            category: '一般供應商'
          });
        }
      }

      const subtotal = result.items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
      const taxAmount = includeTax ? Math.round(subtotal * 0.05) : 0;
      
      const poId = await firestoreService.createPurchaseOrder({
        userId: user.uid,
        projectName: result.projectName,
        items: result.items,
        subtotal,
        includeTax,
        totalAmount: subtotal + taxAmount,
        status: 'draft',
        estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        supplierName: clientInfo.name, // Reuse for now
        supplierPhone: clientInfo.phone,
        supplierAddress: clientInfo.address,
        notes: ''
      });
      if (poId) {
        // Automatically activate trial on first PO if not already started
        await firestoreService.activateTrial(user.uid);
        onPOCreated(poId); 
      }
    } catch (e) {
      console.error(e);
      toast.error("儲存採購單失敗");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 md:space-y-10">
      {/* Search Header */}
      <section className="bg-card p-6 md:p-10 rounded-lg border border-border mt-4 md:mt-0">
        <div className="max-w-3xl">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
            <h2 className="text-2xl md:text-3xl font-serif font-medium text-text-main">工程預算分析</h2>
            <span className="w-fit text-[10px] px-2 py-0.5 bg-accent/10 border border-accent text-accent rounded-full uppercase tracking-tighter whitespace-nowrap">AI 即時連網中</span>
          </div>
          <p className="text-text-dim mb-8 text-xs md:text-sm max-w-xl font-sans leading-relaxed">
            您可以輸入工程描述，或直接貼上「現場丈量筆記」及「項目清單與數量」。AI 將自動辨識內容並帶入市場行情。
          </p>
          
          <div className="flex flex-col gap-4 relative group">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="在此貼上您的丈量清單或描述，例如：&#10;客廳油漆 30坪&#10;天花板矽酸鈣板 12坪&#10;插座移位 3個..."
                rows={4}
                className="w-full pl-12 pr-6 py-4 bg-[#1A1A1A] border border-border rounded focus:outline-none focus:border-accent transition-all text-text-main placeholder:text-text-dim/50 font-sans resize-none"
              />
              <FileText className="absolute left-4 top-5 text-text-dim w-5 h-5" />
            </div>
            <button
              onClick={handleEstimate}
              disabled={loading || !input.trim()}
              className="w-full min-h-[56px] px-10 py-5 bg-accent text-accent-foreground rounded font-bold text-sm uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles size={18} />}
              一鍵生成報價清單
            </button>
          </div>

          <div className="mt-4 flex justify-end">
            <button 
              onClick={handleManualStart}
              className="text-[10px] text-text-dim hover:text-accent font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <PlusCircle size={14} /> 或是您想跳過 AI，直接手點新增工項？
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            {['水管不通', '換熱水器', '牆壁油漆', '全室拉線'].map(tag => (
              <button
                key={tag}
                onClick={() => { setInput(tag); }}
                className="text-[11px] text-text-dim hover:text-accent transition-colors font-mono tracking-widest uppercase flex items-center gap-2"
              >
                <div className="w-1 h-1 bg-border rounded-full" />
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Result Display */}
      {result && (
        <section className="bg-card rounded-lg border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-2xl mb-24 md:mb-0">
          {/* Client Info Form BEFORE saving */}
          <div className="p-6 md:p-10 bg-success/5 border-b border-border">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h4 className="text-[10px] font-bold text-success uppercase tracking-[0.2em] flex items-center gap-2">
                <UserIcon size={14} /> 報價對象資訊 / Client Information
              </h4>
              <button 
                onClick={() => setShowContactPicker(true)}
                className="flex items-center gap-1.5 text-[9px] font-black text-success border border-success/30 px-2 py-2 rounded hover:bg-success/5 transition-all uppercase tracking-widest no-print"
              >
                <UserCheck size={12} /> <span className="hidden sm:inline">快速帶入客戶 / Quick Load</span><span className="sm:hidden">匯入客戶</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] text-text-dim uppercase tracking-widest">客戶名稱*</label>
                <input 
                  type="text"
                  value={clientInfo.name}
                  onChange={e => setClientInfo({...clientInfo, name: e.target.value})}
                  placeholder="例如：張先生"
                  className="w-full bg-[#1A1A1A] border-b border-border py-2 text-xs text-text-main focus:border-accent outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-text-dim uppercase tracking-widest">聯絡電話</label>
                <input 
                  type="text"
                  value={clientInfo.phone}
                  onChange={e => setClientInfo({...clientInfo, phone: e.target.value})}
                  placeholder="09xx-xxx-xxx"
                  className="w-full bg-[#1A1A1A] border-b border-border py-2 text-xs text-text-main focus:border-accent outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-text-dim uppercase tracking-widest">統一編號</label>
                <input 
                  type="text"
                  value={clientInfo.taxId}
                  onChange={e => setClientInfo({...clientInfo, taxId: e.target.value})}
                  placeholder="8位數字"
                  className="w-full bg-[#1A1A1A] border-b border-border py-2 text-xs text-text-main focus:border-accent outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-text-dim uppercase tracking-widest">施工地址</label>
                <input 
                  type="text"
                  value={clientInfo.address}
                  onChange={e => setClientInfo({...clientInfo, address: e.target.value})}
                  placeholder="施工場址完整路段"
                  className="w-full bg-[#1A1A1A] border-b border-border py-2 text-xs text-text-main focus:border-accent outline-none"
                />
              </div>
            </div>
            {/* Auto-save to contacts option */}
            <div className="mt-6 flex items-start gap-3">
              <input 
                type="checkbox" 
                id="saveToContacts"
                checked={saveToContacts}
                onChange={e => setSaveToContacts(e.target.checked)}
                className="w-4 h-4 accent-accent mt-0.5"
              />
              <label htmlFor="saveToContacts" className="text-[10px] text-text-dim uppercase tracking-widest cursor-pointer select-none leading-relaxed">
                同時將此資訊儲存至客戶與供應商中心 / Sync to Directory
              </label>
            </div>
          </div>

          <div className="p-6 md:p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="min-w-0">
              <h3 className="text-lg md:text-xl font-serif text-text-main truncate">{result.projectName}</h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] md:text-[10px] text-accent font-bold uppercase tracking-widest bg-accent/10 px-2 py-1 rounded inline-block truncate max-w-full">提示：點擊下方表格可直接修改內容與金額</span>
              </div>
            </div>
            {user ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSaveAsPO}
                  disabled={saving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border text-text-main rounded font-bold text-[10px] uppercase tracking-widest hover:border-accent transition-all shadow-lg disabled:opacity-50 min-h-[44px]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText size={14} />}
                  儲存為採購單
                </button>
                <button
                  onClick={handleSaveAsQuote}
                  disabled={saving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-accent text-accent-foreground rounded font-bold text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-lg disabled:opacity-50 min-h-[44px]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={14} />}
                  儲存為報價單
                </button>
              </div>
            ) : (
              <div className="text-[10px] text-accent border border-accent/30 bg-accent/5 px-4 py-2 rounded flex items-center gap-2 uppercase tracking-widest">
                <Info size={12} /> 登入後即可存檔管理
              </div>
            )}
          </div>

          <div className="overflow-x-auto overflow-y-hidden -mx-6 md:mx-0">
            <div className="min-w-[800px] px-6 md:px-0">
              <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-[#1A1A1A]/50 text-text-dim font-mono text-[10px] uppercase tracking-[0.2em] border-b border-border">
                  <th className="px-8 py-4 font-medium">項目名稱與說明</th>
                  <th className="px-8 py-4 font-medium text-center w-24">類別</th>
                  <th className="px-4 py-4 font-medium text-right w-24">數量</th>
                  <th className="px-1 py-4 font-medium text-center w-20">單位</th>
                  <th className="px-8 py-4 font-medium text-right w-32">行情單價</th>
                  <th className="px-8 py-4 font-medium text-right w-40">小計</th>
                  <th className="px-4 py-4 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]">
                {result.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-8 py-4">
                      <input 
                        className="w-full bg-transparent border-none text-text-main focus:ring-1 focus:ring-accent/30 p-1 rounded"
                        value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                      />
                      <textarea 
                        className="w-full bg-transparent border-none text-[11px] text-text-dim mt-1 leading-relaxed opacity-60 font-sans focus:ring-1 focus:ring-accent/30 p-1 rounded resize-none"
                        value={item.description}
                        rows={1}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                      />
                    </td>
                    <td className="px-8 py-4 text-center">
                      <select 
                        className="bg-transparent border border-border/20 text-[9px] uppercase tracking-widest p-1 rounded outline-none text-text-dim focus:border-accent"
                        value={item.category}
                        onChange={e => updateItem(idx, 'category', e.target.value)}
                      >
                        <option value="material">材料</option>
                        <option value="labor">工資</option>
                        <option value="other">其他</option>
                      </select>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <input 
                        type="number"
                        className="w-16 bg-[#1A1A1A] border border-border/30 text-right font-mono text-xs p-1 rounded focus:border-accent"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="px-1 py-4 text-center">
                      <input 
                        className="w-12 bg-transparent border border-border/30 text-center text-xs p-1 rounded font-mono"
                        value={item.unit}
                        onChange={e => updateItem(idx, 'unit', e.target.value)}
                      />
                    </td>
                    <td className="px-8 py-4 text-right">
                      <input 
                        type="number"
                        className="w-24 bg-[#1A1A1A] border border-border/30 text-right font-mono text-xs text-success p-1 rounded focus:border-accent"
                        value={item.unitPrice}
                        onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="px-8 py-4 text-right font-serif text-lg text-text-main">
                      $ {(item.unitPrice * item.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => removeItem(idx)}
                        className="text-text-dim hover:text-red-400 transition-colors p-2"
                      >
                        <Minus size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={7} className="px-8 py-4 border-t border-dashed border-border/30 bg-[#111]">
                    <button 
                      onClick={addItem}
                      className="flex items-center gap-2 text-[10px] text-accent font-bold uppercase tracking-[0.2em] hover:text-white transition-all"
                    >
                      <Plus size={14} /> 新增自定義工項
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-[#1A1A1A] text-text-main border-t border-border">
                  <td colSpan={4} className="px-4 md:px-8 py-6 text-right font-serif text-xs md:text-sm uppercase tracking-widest text-text-dim">
                    <div className="flex flex-col md:flex-row items-end md:items-center justify-end gap-3 md:gap-10">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] md:text-[10px] font-mono whitespace-nowrap">外加 5% 營業稅</span>
                        <button 
                          onClick={() => setIncludeTax(!includeTax)}
                          className={`w-10 h-5 rounded-full p-1 transition-all ${includeTax ? 'bg-accent' : 'bg-border'}`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition-all ${includeTax ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      <span className="hidden md:block">總計額</span>
                    </div>
                  </td>
                  <td colSpan={3} className="px-4 md:px-8 py-6 text-right font-serif text-2xl md:text-3xl text-accent">
                    <div className="md:hidden text-[9px] text-text-dim uppercase tracking-widest mb-1">Grand Total</div>
                    NT$ {
                      (result.items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0) * (includeTax ? 1.05 : 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    }
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

          {result.tips.length > 0 && (
            <div className="p-8 bg-accent/[0.03] border-t border-border">
              <h4 className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                <AlertCircle size={14} /> 專業工程建議案
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {result.tips.map((tip, idx) => (
                  <div key={idx} className="text-xs text-text-dim flex items-start gap-4 leading-relaxed group">
                    <span className="text-accent underline decoration-accent/30 font-serif">0{idx + 1}</span>
                    <span className="group-hover:text-text-main transition-colors">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-6 bg-red-500/5 border-t border-border flex items-center justify-center gap-4">
            <AlertCircle className="text-red-400" size={16} />
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-[0.1em]">此估價僅供參考，實際費用請依現場勘查後之正式報價單為準</p>
          </div>
        </section>
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
