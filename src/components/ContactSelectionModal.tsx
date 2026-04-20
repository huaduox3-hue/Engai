import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Truck, 
  Search, 
  X, 
  Star,
  CheckCircle2,
  Building2,
  Phone,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firestoreService } from '../services/firestoreService';

interface ContactSelectionModalProps {
  userId: string;
  type: 'clients' | 'suppliers';
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contact: any) => void;
}

export const ContactSelectionModal: React.FC<ContactSelectionModalProps> = ({ 
  userId, 
  type, 
  isOpen, 
  onClose, 
  onSelect 
}) => {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen, type, userId]);

  async function loadContacts() {
    setLoading(true);
    try {
      const data = type === 'clients' 
        ? await firestoreService.getClients(userId)
        : await firestoreService.getSuppliers(userId);
      setContacts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = contacts
    .filter(c => 
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    )
    .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-hidden">
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl pointer-events-auto" 
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[#111] border border-accent/20 overflow-hidden rounded shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh] z-[210] pointer-events-auto"
            >
        <div className="p-6 border-b border-border flex justify-between items-center bg-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 text-accent rounded">
              {type === 'clients' ? <Users size={18} /> : <Truck size={18} />}
            </div>
            <div>
              <h3 className="text-sm font-serif font-black uppercase tracking-widest text-text-main">
                選擇{type === 'clients' ? '客戶' : '供應商'} / Select {type === 'clients' ? 'Client' : 'Supplier'}
              </h3>
              <p className="text-[10px] text-text-dim uppercase tracking-widest">從現有資料庫中快速帶入資料</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-dim hover:text-accent transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 bg-bg/50 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
            <input 
              autoFocus
              placeholder="搜尋名稱、電話或公司..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-card border border-border/50 rounded p-2 pl-12 text-xs focus:border-accent outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center text-text-dim font-mono text-[10px] uppercase tracking-widest animate-pulse">
              讀取名單中...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-text-dim font-serif text-sm mb-2">未找到匹配的{type === 'clients' ? '客戶' : '供應商'}</div>
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="text-[10px] text-accent uppercase tracking-widest hover:underline"
                >
                  清除搜尋條件
                </button>
              )}
            </div>
          ) : (
            filtered.map(contact => (
              <button
                key={contact.id}
                onClick={() => onSelect(contact)}
                className="w-full text-left p-4 rounded bg-[#1A1A1A] border border-border/30 hover:border-accent hover:bg-accent/5 transition-all group relative overflow-hidden"
              >
                {contact.isFavorite && (
                  <div className="absolute top-2 right-2 text-accent">
                    <Star size={12} fill="currentColor" />
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${contact.isFavorite ? 'bg-accent text-white' : 'bg-border text-text-dim'}`}>
                      {contact.name?.substring(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-main group-hover:text-accent transition-colors">{contact.name}</span>
                        {contact.isFavorite && (
                          <span className="text-[8px] bg-accent/20 text-accent px-1.5 py-0.5 rounded-full uppercase tracking-tighter">常用</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-text-dim">
                          <Building2 size={10} className="opacity-50" />
                          {contact.companyName || contact.contactPerson || '---'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-text-dim">
                          <Phone size={10} className="opacity-50" />
                          {contact.phone || '---'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-text-dim opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-4 bg-[#1A1A1A] border-t border-border mt-auto">
          <p className="text-[9px] text-text-dim text-center uppercase tracking-widest">
            提示：標記為「常用」的聯繫人會自動排序在最上方
          </p>
        </div>
      </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
