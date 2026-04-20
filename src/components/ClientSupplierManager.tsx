import React, { useState, useEffect } from 'react';
import { firestoreService } from '../services/firestoreService';
import { 
  Users, 
  Truck, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Printer,
  Trash2,
  Building2,
  Tag,
  Star,
  StarOff,
  Edit2,
  X,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ClientSupplierManagerProps {
  userId: string;
}

export const ClientSupplierManager: React.FC<ClientSupplierManagerProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<'clients' | 'suppliers'>('clients');
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    companyName: '',
    taxId: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    contactPerson: '',
    fax: '',
    category: '',
    isFavorite: false
  });

  const [isEditingMode, setIsEditingMode] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [userId]);

  async function loadData() {
    setLoading(true);
    try {
      const [cDocs, sDocs] = await Promise.all([
        firestoreService.getClients(userId),
        firestoreService.getSuppliers(userId)
      ]);
      setClients(cDocs || []);
      setSuppliers(sDocs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error('請輸入名稱');
    
    try {
      const baseData = {
        userId,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        isFavorite: formData.isFavorite
      };

      if (activeTab === 'clients') {
        const clientData = {
          ...baseData,
          companyName: formData.companyName,
          taxId: formData.taxId,
          notes: formData.notes
        };
        if (isEditingMode && formData.id) {
          await firestoreService.updateClient(formData.id, clientData);
        } else {
          await firestoreService.createClient(clientData);
        }
      } else {
        const supplierData = {
          ...baseData,
          contactPerson: formData.contactPerson,
          fax: formData.fax,
          category: formData.category
        };
        if (isEditingMode && formData.id) {
          await firestoreService.updateSupplier(formData.id, supplierData);
        } else {
          await firestoreService.createSupplier(supplierData);
        }
      }
      toast.success(isEditingMode ? '修改成功' : '新增成功');
      handleCloseForm();
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('儲存失敗');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setIsEditingMode(false);
    setFormData({
      id: '', name: '', companyName: '', taxId: '', phone: '', email: '', 
      address: '', notes: '', contactPerson: '', fax: '', category: '', isFavorite: false
    });
  };

  const handleEdit = (item: any) => {
    setFormData({
      id: item.id,
      name: item.name || '',
      companyName: item.companyName || '',
      taxId: item.taxId || '',
      phone: item.phone || '',
      email: item.email || '',
      address: item.address || '',
      notes: item.notes || '',
      contactPerson: item.contactPerson || '',
      fax: item.fax || '',
      category: item.category || '',
      isFavorite: item.isFavorite || false
    });
    setIsEditingMode(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      if (activeTab === 'clients') {
        await firestoreService.deleteClient(id);
      } else {
        await firestoreService.deleteSupplier(id);
      }
      toast.success('刪除成功');
      setConfirmDeleteId(null);
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('刪除失敗');
    }
  };

  const toggleFavorite = async (item: any) => {
    try {
      const newStatus = !item.isFavorite;
      if (activeTab === 'clients') {
        await firestoreService.updateClient(item.id, { isFavorite: newStatus });
      } else {
        await firestoreService.updateSupplier(item.id, { isFavorite: newStatus });
      }
      loadData();
      toast.success(newStatus ? '已設為常用' : '已取消常用');
    } catch (e) {
      console.error(e);
    }
  };

  const filteredData = (activeTab === 'clients' ? clients : suppliers).filter(item => 
    item.name?.toLowerCase().includes(search.toLowerCase()) || 
    item.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    item.phone?.includes(search)
  );

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-xl md:text-2xl font-serif text-text-main font-black tracking-widest uppercase">
            {activeTab === 'clients' ? '客戶資料管理' : '供應商管理'}
          </h2>
          <p className="text-[10px] text-text-dim mt-1 uppercase tracking-widest">建立長期穩定的工程合作關係</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-accent text-white px-6 py-3 text-xs font-bold uppercase tracking-widest rounded shadow-lg hover:brightness-110 active:scale-95 transition-all min-h-[48px]"
        >
          <Plus size={16} /> 新增{activeTab === 'clients' ? '客戶' : '供應商'}
        </button>
      </div>

      <div className="flex border-b border-border/30 gap-6 md:gap-8 overflow-x-auto no-scrollbar scroll-smooth">
        <button 
          onClick={() => setActiveTab('clients')}
          className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap min-h-[40px] ${activeTab === 'clients' ? 'text-accent' : 'text-text-dim'}`}
        >
          客戶清單 / Clients
          {activeTab === 'clients' && <motion.div layoutId="csmTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        <button 
          onClick={() => setActiveTab('suppliers')}
          className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap min-h-[40px] ${activeTab === 'suppliers' ? 'text-accent' : 'text-text-dim'}`}
        >
          供應商清單 / Suppliers
          {activeTab === 'suppliers' && <motion.div layoutId="csmTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
        </button>
      </div>

      <div className="space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
          <input 
            placeholder="搜尋名稱、電話或公司..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border/50 rounded p-2 pl-12 text-xs focus:border-accent outline-none"
          />
        </div>

        {loading ? (
          <div className="text-center p-20 text-text-dim font-mono text-[10px] uppercase tracking-widest animate-pulse">資料讀取中 / Synchronizing...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredData.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)).map((item) => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`bg-card border p-6 rounded relative group transition-all ${item.isFavorite ? 'border-accent/40 shadow-lg shadow-accent/5' : 'border-border/30 hover:border-accent/50'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${item.isFavorite ? 'bg-accent text-white' : 'bg-accent/10 text-accent'}`}>
                        {activeTab === 'clients' ? <Users size={20} /> : <Truck size={20} />}
                      </div>
                      {item.isFavorite && (
                        <div className="bg-accent/10 text-accent text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star size={10} fill="currentColor" /> 常用常用
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-1 md:gap-2">
                      <button 
                        onClick={() => toggleFavorite(item)}
                        className={`p-1.5 rounded-full transition-all ${item.isFavorite ? 'text-accent bg-accent/10' : 'text-text-dim hover:bg-card-hover'}`}
                        title={item.isFavorite ? "取消常用" : "設為常用"}
                      >
                        <Star size={14} fill={item.isFavorite ? "currentColor" : "none"} />
                      </button>
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-1.5 rounded-full text-text-dim hover:text-accent hover:bg-accent/10 transition-all"
                        title="編輯"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => confirmDeleteId === item.id ? handleDelete(item.id) : setConfirmDeleteId(item.id)}
                        className={`p-1.5 rounded-full transition-all ${confirmDeleteId === item.id ? 'bg-red-500 text-white' : 'text-text-dim hover:text-red-400 hover:bg-red-400/10'}`}
                        title="刪除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {confirmDeleteId === item.id && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute inset-0 bg-red-500/90 backdrop-blur-sm rounded z-10 flex flex-col items-center justify-center p-6 text-center"
                    >
                      <Trash2 size={32} className="text-white mb-2" />
                      <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">確定要刪除此筆資料嗎？</p>
                      <div className="flex gap-4 w-full">
                        <button 
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 py-2 bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/30 rounded"
                        >
                          取消
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="flex-1 py-2 bg-white text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 rounded shadow-lg"
                        >
                          刪除
                        </button>
                      </div>
                    </motion.div>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-bold text-text-main group-hover:text-accent transition-colors flex items-center gap-2">
                        {item.name}
                        {item.isFavorite && <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />}
                      </h4>
                      {item.companyName && <p className="text-[10px] text-text-dim uppercase tracking-wider">{item.companyName}</p>}
                    </div>

                    <div className="space-y-1.5 border-t border-border/10 pt-3">
                      <div className="flex items-center gap-3 text-[10px] text-text-dim">
                        <Phone size={12} className="opacity-50" /> {item.phone || '無電話'}
                      </div>
                      {activeTab === 'suppliers' && item.fax && (
                        <div className="flex items-center gap-3 text-[10px] text-text-dim">
                          <Printer size={12} className="opacity-50" /> {item.fax}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-text-dim">
                        <Mail size={12} className="opacity-50" /> {item.email || '無 Email'}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-text-dim">
                        <MapPin size={12} className="opacity-50" /> {item.address || '無地址'}
                      </div>
                    </div>

                    {(item.notes || item.category) && (
                      <div className="mt-4 pt-3 border-t border-border/5 flex items-center justify-between">
                        <div className="text-[10px] italic text-text-dim truncate max-w-[70%]">
                          {item.notes ? `"${item.notes}"` : ''}
                        </div>
                        {item.category && (
                          <span className="text-[8px] font-bold uppercase tracking-widest bg-accent/5 text-accent border border-accent/20 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Slide-over Form Overlay */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="relative w-full md:max-w-md h-full bg-card border-l border-border shadow-2xl p-6 md:p-10 flex flex-col"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-serif text-accent font-black tracking-widest uppercase">
                  {isEditingMode ? '編輯' : '新增'}{activeTab === 'clients' ? '客戶' : '供應商'}
                </h3>
                <button 
                  onClick={handleCloseForm}
                  className="p-2 text-text-dim hover:text-accent transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto pr-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-6 p-4 bg-accent/5 border border-accent/20 rounded-sm">
                    <input 
                      type="checkbox"
                      id="isFavorite"
                      checked={formData.isFavorite}
                      onChange={e => setFormData({...formData, isFavorite: e.target.checked})}
                      className="w-4 h-4 accent-accent"
                    />
                    <label htmlFor="isFavorite" className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-2 cursor-pointer select-none">
                      <Star size={12} fill={formData.isFavorite ? "currentColor" : "none"} />
                      標記為常用{activeTab === 'clients' ? '客戶' : '供應商'}
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">名稱 / Name *</label>
                    <input 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-bg border border-border/50 rounded p-3 text-xs focus:border-accent outline-none"
                    />
                  </div>

                  {activeTab === 'clients' ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">公司名稱 / Company</label>
                        <input 
                          value={formData.companyName}
                          onChange={e => setFormData({...formData, companyName: e.target.value})}
                          className="w-full bg-bg border border-border/50 rounded p-3 text-xs focus:border-accent outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">統一編號 / Tax ID</label>
                        <input 
                          value={formData.taxId}
                          onChange={e => setFormData({...formData, taxId: e.target.value})}
                          className="w-full bg-bg border border-border/50 rounded p-3 text-xs focus:border-accent outline-none"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">聯繫人 / Contact Person</label>
                        <input 
                          value={formData.contactPerson}
                          onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                          className="w-full bg-bg border border-border/50 rounded p-3 text-xs focus:border-accent outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">服務類別 / Category</label>
                        <input 
                          placeholder="例如: 水電, 木工, 建材供應..."
                          value={formData.category}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                          className="w-full bg-bg border border-border/50 rounded p-3 text-xs focus:border-accent outline-none"
                        />
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">電話 / Phone</label>
                      <input 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-bg border border-border/50 rounded p-3 text-xs focus:border-accent outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Email</label>
                      <input 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-bg border border-border/50 rounded p-3 text-xs focus:border-accent outline-none"
                      />
                    </div>
                  </div>

                  {activeTab === 'suppliers' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">傳真號碼 / Fax Number</label>
                      <input 
                        value={formData.fax}
                        onChange={e => setFormData({...formData, fax: e.target.value})}
                        className="w-full bg-bg border border-border/50 rounded p-3 text-xs focus:border-accent outline-none"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">地址 / Address</label>
                    <input 
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full bg-bg border border-border/50 rounded p-3 text-xs focus:border-accent outline-none"
                    />
                  </div>

                  {activeTab === 'clients' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-dim">備註 / Notes</label>
                      <textarea 
                        rows={3}
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className="w-full bg-bg border border-border/50 rounded p-3 text-xs focus:border-accent outline-none resize-none"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-4 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-bg transition-all"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-accent text-white font-bold text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                  >
                    儲存資料
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
