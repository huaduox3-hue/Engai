import React, { useState } from 'react';
import { firestoreService } from '../services/firestoreService';
import { X, Send, MessageSquare, Sparkles, Bug, Lightbulb, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  userId: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, userProfile, userId }) => {
  const [type, setType] = useState<'suggestion' | 'bug' | 'feature'>('suggestion');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('請填寫內容');
      return;
    }

    setLoading(true);
    try {
      await firestoreService.submitFeedback(userId, {
        type,
        content,
        email: userProfile?.email,
        name: userProfile?.displayName
      });
      toast.success('感謝您的回饋！', { description: '您的建議已送達開發團隊。' });
      setContent('');
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('提交失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-border flex justify-between items-center bg-bg/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center">
                  <MessageSquare className="text-accent" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-accent tracking-wider">意見與回饋</h2>
                  <p className="text-[10px] text-text-dim uppercase tracking-widest">Help us improve the system</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-text-dim hover:text-text-main hover:bg-white/5 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => setType('suggestion')}
                  className={`py-3 px-4 rounded-lg border text-[10px] font-bold uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${type === 'suggestion' ? 'bg-accent/10 border-accent text-accent' : 'bg-bg/50 border-border text-text-dim hover:border-white/20'}`}
                >
                  <Lightbulb size={16} />
                  建議
                </button>
                <button 
                  onClick={() => setType('feature')}
                  className={`py-3 px-4 rounded-lg border text-[10px] font-bold uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${type === 'feature' ? 'bg-accent/10 border-accent text-accent' : 'bg-bg/50 border-border text-text-dim hover:border-white/20'}`}
                >
                  <Sparkles size={16} />
                  功能
                </button>
                <button 
                  onClick={() => setType('bug')}
                  className={`py-3 px-4 rounded-lg border text-[10px] font-bold uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${type === 'bug' ? 'bg-accent/10 border-accent text-accent' : 'bg-bg/50 border-border text-text-dim hover:border-white/20'}`}
                >
                  <Bug size={16} />
                  錯誤
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-widest">您的想法或建議</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="請在此輸入您的回饋內容..."
                  className="w-full h-40 bg-bg/50 border border-border rounded-xl p-4 text-sm text-text-main focus:border-accent focus:outline-none transition-all resize-none placeholder:text-text-dim/50"
                />
              </div>

              <div className="bg-accent/5 p-4 rounded-lg border border-accent/20">
                <p className="text-[10px] text-accent/80 leading-relaxed italic">
                  "您的每一個意見對我們都非常重要。我們致力於為水電工程打造最完美的數位化工具，感謝您的參與。"
                </p>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 bg-accent text-accent-foreground rounded-xl text-xs font-bold uppercase tracking-[0.2em] shadow-lg shadow-accent/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                提交回饋 / SUBMIT FEEDBACK
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
