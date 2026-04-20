import React from 'react';
import { 
  Check, 
  X, 
  Zap, 
  Crown, 
  Star,
  ShieldCheck,
  Cpu,
  Layout,
  MessageSquare,
  Gift
} from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { motion, AnimatePresence } from 'motion/react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (plan: 'pro', cycle: 'monthly' | 'annual') => void;
  onCancel: () => void;
  currentPlan: string;
  currentCycle?: 'monthly' | 'annual';
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onUpgrade, onCancel, currentPlan, currentCycle = 'annual' }) => {
  const [billingCycle, setBillingCycle] = React.useState<'annual' | 'monthly'>(currentCycle);
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (isOpen) {
      loadPlans();
      setBillingCycle(currentCycle);
    }
  }, [isOpen, currentCycle]);

  async function loadPlans() {
    setLoading(true);
    try {
      const p = await firestoreService.getPlans();
      setPlans(p || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const proPlan = plans.find(p => p.id?.toLowerCase() === 'pro') || plans[0];
  
  const annualPrice = proPlan?.annualPrice || 1200;
  const monthlyPrice = proPlan?.monthlyPrice || 150;
  const planName = proPlan?.name || "專業版方案 / THE PRO PLAN";
  const features = proPlan?.features || [
    "AI 智慧成本估算與材料推薦",
    "極致簡約、現代、古典多樣合約樣式",
    "數位存證合約與法律條款範本",
    "1對1 專員線上支援服務"
  ];
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            className="relative w-full max-w-4xl bg-bg border border-border shadow-2xl rounded-sm overflow-hidden flex flex-col md:flex-row"
          >
            {/* Left side info */}
            <div className="md:w-1/2 p-12 bg-accent/5 flex flex-col justify-between border-r border-border/30">
              <div>
                <motion.div 
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 4 }}
                  className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center mb-10"
                >
                  <Crown size={24} className="text-accent" />
                </motion.div>
                <h2 className="text-3xl font-serif text-text-main font-black leading-tight mb-4 lowercase tracking-tighter">
                  工欲善其事，<br/><span className="text-accent italic">必先利其器。</span>
                </h2>
                <div className="bg-accent/10 border border-accent/20 p-4 rounded-lg mb-8">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                    <Star size={12} fill="currentColor" /> 首筆單據後自動開啟 / Triggered on First Doc
                  </p>
                  <p className="text-sm font-serif text-text-main font-bold">7 天 專業版免費試用</p>
                  <p className="text-[11px] text-text-dim mt-1">我們不希望您在還沒準備好時就浪費試用期。建立第一份單據後，系統將自動為您開啟 1 週的完整權限體驗。</p>
                </div>
                <div className="space-y-4">
                  {features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3 group">
                      <div className="w-6 h-6 shrink-0 rounded bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300">
                        <Zap size={12} fill="currentColor" />
                      </div>
                      <p className="text-[11px] text-text-dim leading-relaxed group-hover:text-text-main transition-colors">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-12 text-[10px] text-text-dim font-mono uppercase tracking-widest bg-white/5 p-3 rounded text-center">
                全台超過 500 位工程團隊 專業首選
              </div>
            </div>

            <div className="md:w-1/2 p-12 flex flex-col justify-center bg-card/20 relative">
              <div className="absolute top-0 right-0 p-8">
                <button onClick={onClose} className="p-2 hover:bg-card rounded-full transition-colors">
                  <X size={24} className="text-text-dim" />
                </button>
              </div>

              <div className="mb-8 relative">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
                    {planName}
                  </h3>
                  {(currentPlan === 'pro' || currentPlan === 'pro_trial') && (
                    <span className="px-2 py-0.5 bg-success/20 text-success text-[10px] font-bold rounded uppercase tracking-widest border border-success/30">
                      目前方案 / CURRENT
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-text-dim">只需</span>
                  <span className="text-5xl font-black font-mono text-text-main tracking-tighter">
                    ${billingCycle === 'annual' ? Math.round(annualPrice/12) : monthlyPrice}
                  </span>
                  <span className="text-xs text-text-dim uppercase tracking-widest">/ 每月 (未稅)</span>
                </div>
              </div>

              <div className="space-y-4 mb-10">
                <div 
                  onClick={() => setBillingCycle('annual')}
                  className={`p-6 border rounded-lg relative cursor-pointer transition-all ${
                    billingCycle === 'annual' ? 'bg-accent/10 border-accent shadow-[0_0_20px_rgba(197,160,89,0.1)]' : 'bg-card/50 border-border/30 grayscale opacity-70 hover:opacity-100 hover:grayscale-0'
                  }`}
                >
                  <div className="absolute -top-3 left-6 px-4 py-1 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">現省 20% 年繳最划算</div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold tracking-wide">按年計費 (共 NT$ {annualPrice.toLocaleString()} / 年)</div>
                        {currentPlan === 'pro' && currentCycle === 'annual' && (
                          <span className="text-[9px] font-bold text-success uppercase tracking-widest bg-success/10 px-1.5 py-0.5 rounded">當前計費方案</span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-dim mt-1">相當於每天不到 $4 元，擁有無限報價與 AI 智慧估價。</div>
                    </div>
                    {billingCycle === 'annual' && <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center"><Check className="text-accent-foreground" size={14} strokeWidth={4} /></div>}
                  </div>
                </div>

                <div 
                  onClick={() => setBillingCycle('monthly')}
                  className={`p-6 border rounded-lg flex items-center gap-4 cursor-pointer transition-all ${
                    billingCycle === 'monthly' ? 'bg-accent/10 border-accent shadow-[0_0_20px_rgba(197,160,89,0.1)]' : 'bg-card/50 border-border/30 grayscale opacity-70 hover:opacity-100 hover:grayscale-0'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold tracking-wide">按月計費 (NT$ {monthlyPrice} / 月)</div>
                      {currentPlan === 'pro' && currentCycle === 'monthly' && (
                        <span className="text-[9px] font-bold text-success uppercase tracking-widest bg-success/10 px-1.5 py-0.5 rounded">當前計費方案</span>
                      )}
                    </div>
                    <div className="text-[11px] text-text-dim mt-1">彈性使用，無長期合約負擔。</div>
                  </div>
                  {billingCycle === 'monthly' && <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center"><Check className="text-accent-foreground" size={14} strokeWidth={4} /></div>}
                </div>
              </div>

              <button 
                onClick={() => onUpgrade('pro', billingCycle)}
                disabled={currentPlan === 'pro' && currentCycle === billingCycle}
                className={`w-full py-5 font-black text-sm uppercase tracking-[0.3em] transition-all rounded-lg shadow-2xl relative overflow-hidden group ${
                  currentPlan === 'pro' && currentCycle === billingCycle
                  ? 'bg-success text-white cursor-default' 
                  : 'bg-accent text-accent-foreground border-2 border-accent hover:bg-transparent hover:text-accent'
                }`}
              >
                <span className="relative z-10">
                  {currentPlan === 'pro' && currentCycle === billingCycle
                    ? '您目前已是此方案' 
                    : (currentPlan === 'pro' || currentPlan === 'pro_trial')
                      ? '變更計費週期或升級 / CHANGE OR UPGRADE'
                      : `立即線上付款 / PAY NOW ($${billingCycle === 'annual' ? annualPrice : monthlyPrice})`}
                </span>
                {!(currentPlan === 'pro' && currentCycle === billingCycle) && (
                  <motion.div 
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-white/20"
                  />
                )}
              </button>

              {(currentPlan === 'pro' || currentPlan === 'pro_trial') && (
                <button
                  onClick={() => {
                    const msg = currentPlan === 'pro_trial' 
                      ? '確定要結束試用並回到免費版嗎？'
                      : '確定要取消專業版訂閱嗎？取消後您將失去所有專業版特權。';
                    if (window.confirm(msg)) {
                      onCancel();
                    }
                  }}
                  className="w-full mt-4 py-3 text-red-400 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  取消訂閱或試用 / CANCEL PLAN
                </button>
              )}

              <div className="mt-8 pt-8 border-t border-border/30">
                <div className="bg-accent/5 p-4 rounded border border-accent/20 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                      <Gift size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-main uppercase">透過推薦好友獲得 AI 估價點數</p>
                      <p className="text-[9px] text-text-dim mt-0.5">每邀請一位好友註冊可得 100 點，每 10 點可執行一次智慧估價</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mt-8">
                <div className="flex justify-center gap-4 grayscale opacity-30">
                  <span className="text-[12px] font-black italic tracking-tighter uppercase">Visa</span>
                  <span className="text-[12px] font-black italic tracking-tighter uppercase">MasterCard</span>
                  <span className="text-[12px] font-black italic tracking-tighter uppercase">Line Pay</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const FeatureItem: React.FC<{ icon: any, title: string, desc: string }> = ({ icon, title, desc }) => (
  <div className="flex items-start gap-4 group">
    <div className="w-10 h-10 shrink-0 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300">
      {icon}
    </div>
    <div>
      <h4 className="text-xs font-bold text-text-main mb-1 tracking-wide">{title}</h4>
      <p className="text-[10px] text-text-dim leading-relaxed">{desc}</p>
    </div>
  </div>
);
