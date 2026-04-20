import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Palette, 
  Upload, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Image as ImageIcon
} from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { toast } from 'sonner';

interface BrandSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  userId: string;
  onUpdate: (data: any) => void;
}

export const BrandSettings: React.FC<BrandSettingsProps> = ({ 
  isOpen, 
  onClose, 
  userProfile, 
  userId,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [brandLogo, setBrandLogo] = useState(userProfile?.brandLogo || '');
  const [brandColor, setBrandColor] = useState(userProfile?.brandColor || '#ec4899'); // Default pink-500
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');

  const hasBrandKit = userProfile?.hasBrandKit || userProfile?.plan === 'pro';

  const handleSave = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await firestoreService.updateUserProfile(userId, {
        brandLogo,
        brandColor,
        displayName
      });
      onUpdate({ ...userProfile, brandLogo, brandColor, displayName });
      toast.success('品牌設定已儲存');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('儲存失敗');
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
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-bg border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                  <Palette size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-serif text-text-main">品牌視覺設定</h2>
                  <p className="text-[10px] text-text-dim uppercase tracking-widest font-mono">BRANDING SETTINGS</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-text-dim hover:text-accent">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
              {!hasBrandKit && (
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex items-start gap-4">
                  <AlertCircle className="text-accent shrink-0 mt-0.5" size={16} />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-accent uppercase tracking-widest">權限提示 / UNAUTHORIZED</p>
                    <p className="text-[11px] text-text-dim leading-relaxed">
                      品牌視覺包尚未解鎖。解鎖後您可上傳公司 Logo 並設定專屬配色，讓報價單更具專業感。
                    </p>
                    <button 
                      onClick={() => {
                        onClose();
                        // External trigger for point shop could be added here
                      }}
                      className="mt-2 text-[10px] font-bold text-accent hover:underline uppercase"
                    >
                      前往點數商店解鎖
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-text-dim uppercase tracking-widest flex items-center gap-2">
                    <Building2 size={12} /> 公司顯示名稱
                  </label>
                  <input 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="例如：匠心裝修工程網"
                    className="w-full bg-card border border-border p-3 rounded-lg text-sm text-text-main focus:border-accent outline-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-text-dim uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon size={12} /> 公司 Logo URL
                  </label>
                  <div className="flex gap-4">
                    <input 
                      value={brandLogo}
                      onChange={(e) => setBrandLogo(e.target.value)}
                      disabled={!hasBrandKit}
                      placeholder="請貼上圖片網址"
                      className={`flex-1 bg-card border border-border p-3 rounded-lg text-sm text-text-main focus:border-accent outline-none ${!hasBrandKit && 'opacity-50 cursor-not-allowed'}`}
                    />
                    {brandLogo && (
                      <div className="w-12 h-12 bg-white rounded border border-border overflow-hidden flex items-center justify-center p-1">
                        <img src={brandLogo} alt="Preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] text-text-dim leading-relaxed">
                    * 建議使用透明背景的 PNG 檔案。解鎖視覺包後即可使用。
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-text-dim uppercase tracking-widest flex items-center gap-2">
                    <Palette size={12} /> 品牌代表色
                  </label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      disabled={!hasBrandKit}
                      className={`w-12 h-12 rounded cursor-pointer border-none bg-transparent ${!hasBrandKit && 'opacity-50 cursor-not-allowed'}`}
                    />
                    <input 
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      disabled={!hasBrandKit}
                      className={`flex-1 bg-card border border-border p-3 rounded-lg text-sm font-mono text-text-main focus:border-accent outline-none ${!hasBrandKit && 'opacity-50 cursor-not-allowed'}`}
                    />
                  </div>
                  <div className="p-4 bg-bg rounded-xl border border-border">
                    <p className="text-[10px] text-text-dim mb-2 uppercase tracking-tight">預覽效果：</p>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: brandColor }} />
                      <span className="text-sm font-bold" style={{ color: brandColor }}>{displayName || '匠心工程'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-accent/5 border-t border-border flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-2 text-xs font-bold text-text-dim hover:text-text-main uppercase tracking-widest"
              >
                取消
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-2 bg-accent text-accent-foreground rounded-lg text-xs font-bold uppercase tracking-widest hover:brightness-110 shadow-lg shadow-accent/20 disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                儲存設定
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
