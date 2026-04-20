/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { Estimator } from './components/Estimator';
import { Dashboard } from './components/Dashboard';
import { QuoteDetail } from './components/QuoteDetail';
import { Cashflow } from './components/Cashflow';
import { PODetail } from './components/PODetail';
import { AdminConsole } from './components/AdminConsole';
import { PricingModal } from './components/PricingModal';
import { ClientSupplierManager } from './components/ClientSupplierManager';
import { Documentation } from './components/Documentation';
import { BrandSettings } from './components/BrandSettings';
import { FeedbackModal } from './components/FeedbackModal';
import { LogIn, LogOut, Calculator, LayoutDashboard, Wallet, User as UserIcon, Loader2, Bell, ShieldCheck, Crown, Settings, PlusCircle, Users as UsersIcon, HelpCircle, Menu, X, Sparkles, MessageCircle, Zap, Gift, Palette, MessageSquare, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { firestoreService } from './services/firestoreService';
import { calculateTrialDays } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'estimator' | 'dashboard' | 'cashflow' | 'quote' | 'po' | 'admin' | 'contacts' | 'docs'>('estimator');
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [showBrandSettings, setShowBrandSettings] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);

  useEffect(() => {
    const updateTrial = () => {
      setTrialDaysRemaining(calculateTrialDays(userProfile?.trialExpiresAt));
    };
    updateTrial();
    
    // Refresh every 10 mins to keep the day count reasonably fresh if they keep the tab open
    const timer = setInterval(updateTrial, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [userProfile?.trialExpiresAt]);

  useEffect(() => {
    // Capture referral code from URL early
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      toast.info('推薦碼已偵測', { description: '註冊後將獲得額外獎勵點數。' });
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      const params = new URLSearchParams(window.location.search);
      const quoteId = params.get('quoteId');
      const poId = params.get('poId');

      if (u) {
        try {
          // Initialize default plans
          await firestoreService.ensureDefaultPlans();
          
          // Check for existing profile
          let profile = await firestoreService.getUserProfile(u.uid);
          
          if (!profile) {
            // First time logic
            const initial: any = { 
              uid: u.uid, 
              email: u.email, 
              displayName: u.displayName,
              role: u.email === 'qiuyuxin325@gmail.com' ? 'admin' : 'user',
              plan: 'free',
              points: 0,
              referralCode: u.uid.slice(0, 8),
              createdAt: new Date()
            };

            if (referralCode) {
              initial.referredBy = referralCode;
              initial.points = 50; 
              await firestoreService.awardReferralPoints(referralCode, 100);
              toast.success('推薦獎勵已生效', { description: '您獲得了 50 點 AI 智慧估價點數！' });
            }

            await firestoreService.createUserProfile(u.uid, initial);
          }
        } catch (e) {
          console.error(e);
        }
      }

      // Handle shared links
      if (quoteId) {
        setSelectedQuoteId(quoteId);
        setView('quote');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (poId) {
        setSelectedPOId(poId);
        setView('po');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      setLoading(false);
    });
    return () => unsubscribe();
  }, [referralCode]);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    const unsub = firestoreService.onUserProfileUpdated(user.uid, (profile) => {
      if (profile) {
        setUserProfile(profile);
      }
    });

    return () => unsub();
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const navigateToQuote = async (id: string) => {
    setSelectedQuoteId(id);
    setView('quote');
    window.scrollTo(0, 0);
  };

  const navigateToPO = async (id: string) => {
    setSelectedPOId(id);
    setView('po');
    window.scrollTo(0, 0);
  };

  const NavItem = ({ target, label, icon: Icon, activeColor = 'text-accent' }: { target: typeof view, label: string, icon: any, activeColor?: string }) => (
    <button
      onClick={() => {
        setView(target);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
        view === target ? `${activeColor} bg-accent/5` : 'text-text-dim hover:text-text-main'
      }`}
    >
      <Icon size={18} />
      <span className="text-sm font-medium tracking-wide">{label}</span>
    </button>
  );

  const SidebarAction = ({ onClick, label, icon: Icon, variant = 'default' }: { onClick: () => void, label: string, icon: any, variant?: 'default' | 'accent' }) => (
    <button
      onClick={() => {
        onClick();
        setMobileMenuOpen(false);
      }}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left w-full ${
        variant === 'accent' ? 'text-accent bg-accent/5 hover:bg-accent hover:text-white' : 'text-text-dim hover:text-accent hover:bg-accent/5'
      }`}
    >
      <Icon size={18} />
      <span className="text-sm font-medium tracking-wide">{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="w-10 h-10 animate-spin text-accent" />
      </div>
    );
  }

  const isAdmin = user?.email === 'qiuyuxin325@gmail.com';

  return (
    <div className="min-h-screen bg-bg flex flex-col md:flex-row overflow-hidden h-screen">
      <Toaster position="top-right" expand={true} richColors closeButton theme="dark" />
      
      <PricingModal 
        isOpen={showPricing} 
        onClose={() => setShowPricing(false)} 
        currentPlan={userProfile?.plan || 'free'}
        currentCycle={userProfile?.billingCycle}
        onUpgrade={async (plan, cycle) => {
          if (user) {
            await firestoreService.updateUserPlan(user.uid, plan, cycle);
            setUserProfile({ ...userProfile, plan, billingCycle: cycle });
            setShowPricing(false);
            const cycleName = cycle === 'annual' ? '年繳' : '月繳';
            toast.success('方案更新成功！', { description: `您現在是 Pro 專業版 (${cycleName}) 會員。` });
          }
        }}
        onCancel={async () => {
          if (user) {
            await firestoreService.cancelSubscription(user.uid);
            setUserProfile({ ...userProfile, plan: 'free', billingCycle: 'monthly' });
            setShowPricing(false);
            toast.success('方案已取消', { description: '您已回到免費版方案。' });
          }
        }}
      />

      <FeedbackModal 
        isOpen={showFeedback} 
        onClose={() => setShowFeedback(false)} 
        userProfile={userProfile}
        userId={user?.uid || ''}
      />

      <BrandSettings 
        isOpen={showBrandSettings} 
        onClose={() => setShowBrandSettings(false)} 
        userProfile={userProfile}
        userId={user?.uid || ''}
        onUpdate={(newProfile) => setUserProfile(newProfile)}
      />

      {/* Mobile Top Bar */}
      <div className="md:hidden no-print h-16 border-b border-border bg-card flex items-center justify-between px-6 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <Calculator className="w-6 h-6 text-accent" />
          <span className="font-serif font-bold text-accent tracking-widest text-lg">匠心估價</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-10 h-10 flex items-center justify-center text-text-dim hover:text-accent transition-colors"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Navigation Sidebar (Desktop) / Full Screen Overlay (Mobile) */}
      <nav className={`
        no-print bg-bg border-r border-border flex flex-col z-40 transition-all duration-300
        ${mobileMenuOpen ? 'fixed inset-0 pt-16 flex' : 'hidden md:flex md:w-64'}
      `}>
        <div className="hidden md:block p-8 border-b border-border">
          <h1 className="text-2xl font-serif font-bold text-accent tracking-wider flex items-center gap-3">
            <Calculator className="w-6 h-6" />
            匠心估價
          </h1>
          <p className="text-[10px] text-text-dim mt-2 uppercase tracking-widest font-sans">EngiQuote AI</p>
        </div>

        <div className="flex-1 p-6 space-y-2 overflow-y-auto">
          <NavItem target="estimator" label="智能估價系統" icon={Calculator} />
          <NavItem target="dashboard" label="報價與採購管理" icon={LayoutDashboard} />
          
          <div className="pt-6 my-2 border-t border-border/50 space-y-2">
            <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em] mb-4">專業工具 / PRO TOOLS</h3>
             <NavItem target="cashflow" label="金流收款管理" icon={Wallet} />
             <NavItem target="contacts" label="客戶與供應商" icon={UsersIcon} />
          </div>
          
          {isAdmin && (
            <NavItem target="admin" label="平台管理中心" icon={Settings} activeColor="text-purple-400" />
          )}

          <div className="pt-6 mt-6 border-t border-border/50 space-y-2">
            <h3 className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em] mb-4">系統服務</h3>
            <SidebarAction onClick={() => setShowPricing(true)} label={userProfile?.plan === 'pro' ? "方案與計費管理" : "方案升級與訂閱"} icon={Zap} variant={userProfile?.plan === 'pro' ? 'default' : 'accent'} />
            <SidebarAction onClick={() => setShowFeedback(true)} label="建議與回饋 / FEEDBACK" icon={MessageSquare} />
            <NavItem target="docs" label="法律與幫助" icon={HelpCircle} />
            
            <a 
              href="https://lin.ee/rJlRSTc" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded text-[10px] font-bold uppercase tracking-[0.2em] transition-all bg-[#06C755]/10 text-[#06C755] border border-[#06C755]/20 hover:bg-[#06C755] hover:text-white"
            >
              <MessageCircle size={14} />
              官方 LINE 客服
            </a>
          </div>
        </div>

        {/* User Profile / Status */}
        <div className="p-6 border-t border-border bg-card/30">
          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <div className="w-8 h-8 rounded bg-bg border border-border flex items-center justify-center overflow-hidden shrink-0">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon size={16} className="text-accent" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-main truncate font-serif">{user.displayName}</p>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-[8px] font-mono uppercase tracking-tighter ${userProfile?.plan === 'pro' || userProfile?.plan === 'pro_trial' ? 'text-accent font-bold' : 'text-text-dim'}`}>
                      {(userProfile?.plan === 'pro' || userProfile?.plan === 'pro_trial') && <Crown size={10} />}
                      {userProfile?.plan === 'pro' ? (
                        <span className="text-accent font-black">匠心專業版</span>
                      ) : userProfile?.plan === 'pro_trial' ? (
                        <span className="flex items-center gap-1.5 text-accent font-black animate-in fade-in slide-in-from-left-2 transition-all">
                          <Clock size={10} className="text-accent" /> {trialDaysRemaining > 0 ? `試用剩餘 ${trialDaysRemaining} 天` : '試用已到期'}
                        </span>
                      ) : (
                        '免費標準版'
                      )}
                    </span>
                    <span className="text-[8px] bg-accent/10 py-0.5 px-1.5 rounded text-accent font-mono font-bold">
                      {userProfile?.points || 0} PTS
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowPricing(true);
                    setMobileMenuOpen(false);
                  }}
                  className={`ml-3 px-2 py-1 rounded text-[9px] font-bold transition-all shrink-0 ${
                    userProfile?.plan === 'pro' 
                    ? 'border border-accent/30 text-accent hover:bg-accent hover:text-white' 
                    : 'bg-accent/20 text-accent hover:bg-accent hover:text-white'
                  }`}
                >
                  {userProfile?.plan === 'pro' ? '管理' : '升級'}
                </button>
                <button onClick={handleLogout} className="ml-auto text-text-dim hover:text-red-400 p-1" title="登出">
                  <LogOut size={14} />
                </button>
              </div>
              
              <button 
                onClick={() => {
                  const link = `${window.location.origin}?ref=${userProfile?.referralCode}`;
                  navigator.clipboard.writeText(link);
                  toast.success('連結已複製', { description: '分享給好友，雙方皆可獲得 AI 估價專用點數！' });
                }}
                className="w-full py-2 bg-accent/5 border border-accent/20 rounded text-[10px] font-bold text-accent uppercase tracking-widest hover:bg-accent/10 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={12} /> 賺 AI 估價點數
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent text-accent-foreground rounded font-bold text-xs uppercase tracking-widest hover:brightness-110 shadow-lg"
              >
                <LogIn size={14} /> 登入系統
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto relative bg-bg h-full">
        {/* Bottom Nav Bar (Mobile only) */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 no-print flex items-center bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 shadow-2xl gap-2">
          <button 
            onClick={() => setView('estimator')} 
            className={`p-3 rounded-full transition-all ${view === 'estimator' ? 'bg-accent text-accent-foreground scale-110' : 'text-text-dim'}`}
          >
            <Calculator size={20} />
          </button>
          <button 
            onClick={() => setView('dashboard')} 
            className={`p-3 rounded-full transition-all ${view === 'dashboard' ? 'bg-accent text-accent-foreground scale-110' : 'text-text-dim'}`}
          >
            <LayoutDashboard size={20} />
          </button>
          <button 
            onClick={() => setView('cashflow')} 
            className={`p-3 rounded-full transition-all ${view === 'cashflow' ? 'bg-accent text-accent-foreground scale-110' : 'text-text-dim'}`}
          >
            <Wallet size={20} />
          </button>
          <button 
            onClick={() => {
              setSelectedQuoteId(null);
              setSelectedPOId(null);
              setMobileMenuOpen(true);
            }} 
            className="p-3 rounded-full text-text-dim"
          >
            <Menu size={20} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={view + (selectedQuoteId || '') + (selectedPOId || '')}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className={`p-4 md:p-12 pb-24 md:pb-12 max-w-7xl mx-auto min-h-full ${view === 'estimator' ? 'flex flex-col' : ''}`}
          >
            {view === 'estimator' && (
              <Estimator 
                user={user} 
                userProfile={userProfile} 
                onQuoteCreated={navigateToQuote} 
                onPOCreated={navigateToPO}
                onShowPricing={() => setShowPricing(true)} 
              />
            )}
            {view === 'dashboard' && (
              <Dashboard 
                user={user} 
                userProfile={userProfile}
                onSelectQuote={navigateToQuote} 
                onSelectPO={navigateToPO} 
              />
            )}
            {view === 'cashflow' && <Cashflow user={user} onSelectQuote={navigateToQuote} />}
            {view === 'contacts' && user && <ClientSupplierManager userId={user.uid} />}
            {view === 'docs' && <Documentation onBack={() => setView('dashboard')} />}
            {view === 'admin' && <AdminConsole onBack={() => setView('dashboard')} />}
            {view === 'quote' && selectedQuoteId && (
              <QuoteDetail 
                id={selectedQuoteId} 
                user={user} 
                userProfile={userProfile}
                onBack={() => setView('dashboard')} 
              />
            )}
            {view === 'po' && selectedPOId && (
              <PODetail 
                id={selectedPOId} 
                user={user} 
                userProfile={userProfile}
                onBack={() => setView('dashboard')} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
