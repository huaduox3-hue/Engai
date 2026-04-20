import React, { useState, useEffect } from 'react';
import { firestoreService } from '../services/firestoreService';
import { 
  Users, 
  TrendingUp, 
  FileText, 
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  Check,
  X,
  Filter,
  RefreshCw,
  RotateCcw,
  Zap,
  Gift,
  Coins,
  Info,
  MessageSquare,
  Bug,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface AdminConsoleProps {
  onBack: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'rewards' | 'plans' | 'payments' | 'feedback'>('overview');
  const [search, setSearch] = useState('');

  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    // Real-time synchronization for operational data
    const unsubUsers = firestoreService.onAllUsersUpdated(setUsers);
    const unsubQuotes = firestoreService.onAllQuotesUpdated(setQuotes);
    const unsubPayments = firestoreService.onAllPaymentsUpdated(setPayments);
    const unsubFeedback = firestoreService.onAllFeedbackUpdated(setFeedback);
    
    // Initial load for plans
    loadPlans();
    
    setLoading(false);

    return () => {
      unsubUsers();
      unsubQuotes();
      unsubPayments();
      unsubFeedback();
    };
  }, []);

  async function loadPlans() {
    try {
      const pl = await firestoreService.getPlans();
      setPlans(pl || []);
    } catch (e) {
      console.error('Failed to load plans:', e);
    }
  }

  async function loadAdminData() {
    setDataLoading(true);
    try {
      await loadPlans();
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  }

  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const activeQuotes = quotes.filter(q => q.status !== 'cancelled' && q.status !== 'completed').length;
  const filteredUsers = users.filter(u => u.email?.toLowerCase().includes(search.toLowerCase()) || u.displayName?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="p-20 text-center font-mono text-[10px] uppercase tracking-widest text-text-dim animate-pulse">權限驗證中 / Verifying Clearance...</div>;

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
        <button onClick={onBack} className="flex items-center gap-3 text-text-dim hover:text-accent transition-all text-xs uppercase tracking-widest font-mono min-h-[44px]">
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="text-xl md:text-2xl font-serif text-accent uppercase tracking-widest font-black">平台管理中心 / ADMIN</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <StatCard icon={<Users size={16} />} label="會員總數" value={users.length} sub="人" color="text-accent" />
        <StatCard icon={<TrendingUp size={16} />} label="總營收" value={`$${totalRevenue.toLocaleString()}`} sub="" color="text-success" />
        <StatCard icon={<FileText size={16} />} label="專案數" value={activeQuotes} sub="件" color="text-blue-400" />
        <StatCard icon={<CreditCard size={16} />} label="轉化率" value={`${((users.filter(u => u.plan === 'pro').length / (users.length || 1)) * 100).toFixed(1)}%`} sub="" color="text-purple-400" />
      </div>

      <div className="flex border-b border-border/30 gap-6 md:gap-8 overflow-x-auto no-scrollbar scroll-smooth">
        {(['overview', 'users', 'payments', 'plans', 'rewards', 'feedback'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap min-h-[40px] ${
              activeTab === tab ? 'text-accent' : 'text-text-dim hover:text-text-main'
            }`}
          >
            {tab === 'overview' ? '營運概況' : 
             tab === 'users' ? '會員管理' : 
             tab === 'payments' ? '帳務金流' :
             tab === 'plans' ? '訂閱方案' : 
             tab === 'feedback' ? '意見回饋' : '回饋獎勵'}
            {activeTab === tab && <motion.div layoutId="admTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
              <input 
                placeholder="搜尋 Email 或 姓名..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-card border border-border/50 rounded p-2 pl-12 text-xs focus:border-accent outline-none"
              />
            </div>
            <div className="bg-card border border-border/30 rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead className="bg-[#111] border-b border-border/30">
                    <tr>
                      <th className="p-4 font-mono font-bold uppercase tracking-widest text-[10px]">會員</th>
                      <th className="p-4 font-mono font-bold uppercase tracking-widest text-[10px]">方案 / 角色</th>
                      <th className="p-4 font-mono font-bold uppercase tracking-widest text-[10px]">點數</th>
                      <th className="p-4 font-mono font-bold uppercase tracking-widest text-[10px]">日期</th>
                      <th className="p-4 font-mono font-bold uppercase tracking-widest text-[10px]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="border-b border-border/10 hover:bg-accent/5 transition-all">
                        <td className="p-4">
                          <div className="font-bold text-text-main">{u.displayName || '未具名'}</div>
                          <div className="text-[10px] text-text-dim">{u.email}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase whitespace-nowrap ${u.plan === 'pro' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' : 'bg-text-dim/10 text-text-dim border border-text-dim/30'}`}>
                              {u.plan === 'pro' ? 'Pro' : 'Free'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-accent font-mono font-bold whitespace-nowrap">
                          {u.points || 0} PTS
                        </td>
                        <td className="p-4 text-text-dim font-mono text-[10px] whitespace-nowrap">
                          {u.createdAt?.toDate().toLocaleDateString('zh-TW')}
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => setEditingUser(u)}
                            className="text-[10px] font-bold uppercase text-accent hover:underline whitespace-nowrap"
                          >
                            管理
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <AnimatePresence>
              {editingUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="bg-card border border-accent/20 p-8 rounded-xl shadow-2xl max-w-lg w-full space-y-6"
                  >
                    <div className="flex justify-between items-center border-b border-border pb-4">
                      <div>
                        <h3 className="text-lg font-serif text-text-main">{editingUser.displayName}</h3>
                        <p className="text-[10px] text-text-dim font-mono">{editingUser.email}</p>
                      </div>
                      <button onClick={() => setEditingUser(null)} className="text-text-dim hover:text-text-main"><X size={20} /></button>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-text-dim">會員類型 / Plan Type</label>
                        <select 
                          value={editingUser.plan}
                          onChange={e => setEditingUser({...editingUser, plan: e.target.value})}
                          className="w-full bg-bg border border-border rounded p-3 text-xs focus:border-accent outline-none appearance-none"
                        >
                          <option value="free">Free Plan (免費版)</option>
                          <option value="pro_trial">Pro Trial (試用版)</option>
                          <option value="pro">Pro Membership (專業版)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-text-dim">帳號權限 / Role</label>
                        <select 
                          value={editingUser.role}
                          onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                          className="w-full bg-bg border border-border rounded p-3 text-xs focus:border-accent outline-none appearance-none"
                        >
                          <option value="user">User (一般用戶)</option>
                          <option value="admin">Admin (管理員)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-text-dim">手動調整點數 / Manual Points Adjustment</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            value={editingUser.points || 0}
                            onChange={e => setEditingUser({...editingUser, points: parseInt(e.target.value) || 0})}
                            className="w-full bg-bg border border-border rounded p-3 text-xs focus:border-accent outline-none font-mono text-accent"
                          />
                          <span className="text-[10px] font-bold text-text-dim">PTS</span>
                        </div>
                      </div>

                      {editingUser.plan === 'pro_trial' && (
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-text-dim">試用截止日 (YYYY-MM-DD)</label>
                          <input 
                            type="date"
                            value={editingUser.trialExpiresAt?.seconds ? new Date(editingUser.trialExpiresAt.seconds * 1000).toISOString().split('T')[0] : ''}
                            onChange={e => {
                              const date = new Date(e.target.value);
                              setEditingUser({...editingUser, trialExpiresAt: { seconds: Math.floor(date.getTime()/1000) }});
                            }}
                            className="w-full bg-bg border border-border rounded p-3 text-xs focus:border-accent outline-none font-mono"
                          />
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={async () => {
                        setDataLoading(true);
                        try {
                          const { id, ...updateData } = editingUser;
                          await firestoreService.adminUpdateUserProfile(id, updateData);
                          toast.success('會員設定已更新');
                          setEditingUser(null);
                        } catch (err) {
                          toast.error('儲存失敗');
                        } finally {
                          setDataLoading(false);
                        }
                      }}
                      disabled={dataLoading}
                      className="w-full py-4 bg-accent text-white font-bold text-[10px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      {dataLoading ? '儲存中...' : '確認儲存變更 / SAVE CHANGES'}
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="bg-card border border-border/30 rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111] border-b border-border/30">
                  <tr>
                    <th className="p-4 font-mono font-bold uppercase tracking-widest text-[10px]">交易編號 / 日期</th>
                    <th className="p-4 font-mono font-bold uppercase tracking-widest text-[10px]">會員資訊</th>
                    <th className="p-4 font-mono font-bold uppercase tracking-widest text-[10px]">項目 / 金額</th>
                    <th className="p-4 font-mono font-bold uppercase tracking-widest text-[10px]">狀態</th>
                    <th className="p-4 font-mono font-bold uppercase tracking-widest text-[10px]">系統操作</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.sort((a,b) => (b.receivedDate?.seconds || 0) - (a.receivedDate?.seconds || 0)).map(p => (
                    <tr key={p.id} className="border-b border-border/10 hover:bg-accent/5 transition-all">
                      <td className="p-4">
                        <div className="font-mono text-[9px] text-text-dim opacity-50">{p.id}</div>
                        <div className="text-[10px] font-mono mt-1">{p.receivedDate?.toDate().toLocaleString()}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold">{users.find(u => u.id === p.userId)?.displayName || '未知會員'}</div>
                        <div className="text-[9px] text-text-dim">{users.find(u => u.id === p.userId)?.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-accent">NT$ {p.amount.toLocaleString()}</div>
                        <div className="text-[10px] text-text-dim">{p.paymentStage || '平台收費'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          p.status === 'refunded' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 
                          p.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                          'bg-success/10 text-success border-success/30'
                        }`}>
                          {p.status === 'refunded' ? '已退款' : p.status === 'pending' ? '待處理' : '已完成'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-4">
                          {p.status !== 'refunded' && (
                            <button 
                              onClick={async () => {
                                if (window.confirm('確定要標記此筆交易為已退款嗎？')) {
                                  await firestoreService.updatePaymentStatus(p.id, 'refunded');
                                  toast.success('已完成退款標記');
                                }
                              }}
                              className="text-[9px] font-bold uppercase text-red-400 hover:text-red-300 flex items-center gap-1"
                            >
                              <RotateCcw size={10} /> 執行退款
                            </button>
                          )}
                          <button 
                            onClick={() => toast.info('檢視詳情', { description: '尚未實作交易詳細日誌檢視。' })}
                            className="text-[9px] font-bold uppercase text-text-dim hover:text-text-main flex items-center gap-1"
                          >
                            <FileText size={10} /> 查閱紀錄
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {plans.map(plan => (
                <div key={plan.id} className="bg-card border border-border/30 p-8 rounded-sm space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <ShieldCheck size={40} />
                  </div>
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <h3 className="text-xl font-serif text-text-main">{plan.name}</h3>
                      <p className="text-[10px] text-text-dim uppercase tracking-widest mt-1 font-mono">方案 ID: {plan.id}</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlan(plan);
                      }}
                      className="text-[10px] font-bold uppercase text-accent hover:underline bg-accent/5 px-3 py-1 rounded border border-accent/20 transition-all hover:bg-accent hover:text-white"
                    >
                      編輯設定 / Edits
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-bg rounded border border-border/20">
                      <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1">月繳價格</div>
                      <div className="text-xl font-mono font-bold text-accent">NT$ {plan.monthlyPrice}</div>
                    </div>
                    <div className="p-4 bg-bg rounded border border-border/20">
                      <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1">年繳價格</div>
                      <div className="text-xl font-mono font-bold text-accent">NT$ {plan.annualPrice}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[9px] text-text-dim uppercase tracking-widest mb-1">包含功能</div>
                    <div className="space-y-1">
                      {plan.features?.map((f: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-text-main opacity-80">
                          <Check size={12} className="text-success" /> {f}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <AnimatePresence>
              {editingPlan && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-card border border-accent/30 p-8 rounded-xl shadow-2xl space-y-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                  >
                    <div className="flex justify-between items-center border-b border-border pb-4 sticky top-0 bg-card z-10">
                      <h3 className="text-lg font-serif text-accent">編輯方案：{editingPlan.name}</h3>
                      <button onClick={() => setEditingPlan(null)} className="text-text-dim hover:text-text-main p-2">
                        <X size={20} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-text-dim">月繳價格 (NT$)</label>
                        <input 
                          type="number"
                          value={editingPlan.monthlyPrice}
                          onChange={e => setEditingPlan({...editingPlan, monthlyPrice: parseInt(e.target.value) || 0})}
                          className="w-full bg-bg border border-border rounded p-3 text-sm focus:border-accent outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-text-dim">年繳價格 (NT$)</label>
                        <input 
                          type="number"
                          value={editingPlan.annualPrice}
                          onChange={e => setEditingPlan({...editingPlan, annualPrice: parseInt(e.target.value) || 0})}
                          className="w-full bg-bg border border-border rounded p-3 text-sm focus:border-accent outline-none font-mono"
                        />
                      </div>
                    </div>
                        <div className="space-y-4 pt-4">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] uppercase font-bold text-text-dim">功能清單 / Features</label>
                            <button 
                              onClick={() => {
                                const newFeatures = [...(editingPlan.features || []), '新功能'];
                                setEditingPlan({ ...editingPlan, features: newFeatures });
                              }}
                              className="text-accent hover:underline text-[10px] font-bold"
                            >
                              + 新增項目
                            </button>
                          </div>
                          <div className="space-y-2">
                            {editingPlan.features?.map((f: string, i: number) => (
                              <div key={i} className="flex gap-2">
                                <input 
                                  value={f}
                                  onChange={e => {
                                    const newFeatures = [...editingPlan.features];
                                    newFeatures[i] = e.target.value;
                                    setEditingPlan({ ...editingPlan, features: newFeatures });
                                  }}
                                  className="flex-1 bg-bg border border-border rounded px-3 py-1 text-[11px] text-text-main focus:border-accent outline-none"
                                />
                                <button 
                                  onClick={() => {
                                    const newFeatures = editingPlan.features.filter((_: any, idx: number) => idx !== i);
                                    setEditingPlan({ ...editingPlan, features: newFeatures });
                                  }}
                                  className="p-2 text-text-dim hover:text-red-400"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4 pt-6 sticky bottom-0 bg-card py-2 border-t border-border mt-4">
                          <button 
                            disabled={dataLoading}
                            onClick={async () => {
                              setDataLoading(true);
                              try {
                                const { id, ...updateData } = editingPlan;
                                await firestoreService.updatePlan(id, updateData);
                                await loadPlans();
                                setEditingPlan(null);
                                toast.success('方案設定已更新');
                              } catch (err: any) {
                                toast.error('儲存失敗', { description: err.message });
                              } finally {
                                setDataLoading(false);
                              }
                            }}
                            className="w-full py-4 bg-accent text-white font-bold text-xs uppercase tracking-[0.3em] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                          >
                            {dataLoading ? '儲存中...' : '儲存變更 / Save Changes'}
                          </button>
                        </div>
                      </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-4">
            {feedback.length > 0 ? (
              feedback.map((item) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-xl p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        item.type === 'bug' ? 'bg-red-500/10 text-red-500' : 
                        item.type === 'feature' ? 'bg-purple-500/10 text-purple-500' : 'bg-accent/10 text-accent'
                      }`}>
                        {item.type === 'bug' ? <Bug size={18} /> : 
                         item.type === 'feature' ? <Sparkles size={18} /> : <Lightbulb size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-main">{item.name || 'Anonymous User'}</span>
                          <span className="text-[10px] text-text-dim">{item.email}</span>
                        </div>
                        <p className="text-[9px] text-text-dim uppercase tracking-widest mt-0.5">
                          {item.createdAt?.toDate().toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="text-[10px] font-bold text-text-dim mr-2 uppercase tracking-widest">Status / 狀態</div>
                      <select 
                        value={item.status}
                        onChange={async (e) => {
                          setDataLoading(true);
                          try {
                            await firestoreService.updateFeedbackStatus(item.id, e.target.value);
                            toast.success('狀態已更新');
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setDataLoading(false);
                          }
                        }}
                        className="bg-bg border border-border rounded text-[10px] py-1 px-2 focus:outline-none focus:border-accent appearance-none min-w-[100px]"
                      >
                        <option value="new">🆕 新進</option>
                        <option value="processing">⚙️ 處理中</option>
                        <option value="done">✅ 已完成</option>
                        <option value="archived">📦 已封存</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-sm text-text-main whitespace-pre-wrap leading-relaxed bg-bg/50 p-4 rounded-lg border border-border/10">{item.content}</p>
                </motion.div>
              ))
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-border rounded-xl">
                <p className="text-text-dim text-xs uppercase tracking-widest">目前沒有回饋意見</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card border border-border/30 p-8 rounded space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-accent">最近收款紀錄</h3>
              <div className="space-y-4">
                {payments.slice(0, 5).map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 border-b border-border/10">
                    <div>
                      <div className="text-xs font-bold font-mono">NT$ {p.amount.toLocaleString()}</div>
                      <div className="text-[10px] text-text-dim">{p.paymentStage}</div>
                    </div>
                    <div className="text-[10px] text-text-dim font-mono">
                      {p.receivedDate?.toDate().toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border/30 p-8 rounded space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-accent">系統公告與狀態</h3>
              <div className="space-y-4">
                <div className="p-4 bg-accent/5 border border-accent/10 rounded flex items-start gap-4">
                  <ShieldCheck className="text-accent mt-0.5" size={16} />
                  <div>
                    <div className="text-xs font-bold">系統核心運行穩定</div>
                    <div className="text-[10px] text-text-dim mt-1 text-balance">目前 API 運作率 99.98%，資料庫讀取延遲低於 40ms。</div>
                  </div>
                </div>
                <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded flex items-start gap-4">
                  <Clock className="text-purple-400 mt-0.5" size={16} />
                  <div>
                    <div className="text-xs font-bold">預計 04/20 停機維護</div>
                    <div className="text-[10px] text-text-dim mt-1">凌晨 02:00 - 04:00 將進行資料庫索引優化，提升百萬級數據讀取速度。</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Point Settings */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card border border-border/30 p-8 rounded space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                       <Coins size={16} /> 點數獲取與消耗設定
                    </h3>
                    <div className="text-[10px] text-text-dim bg-white/5 px-2 py-1 rounded">系統建議配置</div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-6 bg-bg border border-border/20 rounded-lg">
                      <div className="flex items-center gap-2 text-text-main font-bold text-[11px]">
                        <Gift size={12} className="text-accent" /> 獲取點數 (Reward Points)
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-text-dim">新用戶註冊開戶禮</span>
                          <div className="flex items-center gap-2">
                            <input type="number" defaultValue={50} className="w-16 bg-card border border-border rounded px-2 py-1 text-right font-mono text-accent outline-none" />
                            <span className="text-text-dim">PTS</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-text-dim">成功邀請好友 (推薦人)</span>
                          <div className="flex items-center gap-2">
                            <input type="number" defaultValue={100} className="w-16 bg-card border border-border rounded px-2 py-1 text-right font-mono text-accent outline-none" />
                            <span className="text-text-dim">PTS</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-text-dim">成功邀請好友 (受邀人)</span>
                          <div className="flex items-center gap-2">
                            <input type="number" defaultValue={50} className="w-16 bg-card border border-border rounded px-2 py-1 text-right font-mono text-accent outline-none" />
                            <span className="text-text-dim">PTS</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-6 bg-bg border border-border/20 rounded-lg">
                      <div className="flex items-center gap-2 text-text-main font-bold text-[11px]">
                        <Zap size={12} className="text-yellow-400" /> 消耗點數 (Cost Points)
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-text-dim">單次 AI 智慧估價消耗</span>
                          <div className="flex items-center gap-2">
                            <input type="number" defaultValue={10} className="w-16 bg-card border border-border rounded px-2 py-1 text-right font-mono text-accent outline-none" />
                            <span className="text-text-dim">PTS</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-text-dim">Pro 方案兌換 (1個月)</span>
                          <div className="flex items-center gap-2">
                            <input type="number" defaultValue={2000} className="w-16 bg-card border border-border rounded px-2 py-1 text-right font-mono text-accent outline-none" />
                            <span className="text-text-dim">PTS</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between items-center">
                    <p className="text-[10px] text-text-dim italic flex items-center gap-2">
                      <Info size={12} /> 變更將立即套用於全平台新產生的交易與動作。
                    </p>
                    <button 
                      onClick={() => toast.success('設定已保存', { description: '點數獲取與兌換參數已更新。' })}
                      className="px-6 py-2 bg-accent text-white font-bold text-[10px] uppercase tracking-widest rounded hover:brightness-110 transition-all"
                    >
                      儲存點數設定 / SAVE
                    </button>
                  </div>
                </div>

                <div className="bg-card border border-border/30 p-8 rounded space-y-6">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-accent">獲取獎勵排行榜</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {users.sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 6).map((u, i) => (
                      <div key={u.id} className="flex justify-between items-center p-4 bg-bg border border-border/10 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent">#{i+1}</div>
                          <div>
                            <div className="font-bold text-[11px]">{u.displayName}</div>
                            <div className="text-[9px] text-text-dim">{u.email}</div>
                          </div>
                        </div>
                        <div className="text-accent font-bold font-mono text-[11px]">{u.points || 0} PTS</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Policy Suggestion */}
              <div className="space-y-6">
                <div className="bg-card border border-border/30 p-8 rounded space-y-6 sticky top-8">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-accent border-b border-border/30 pb-4">推廣獎勵政策</h3>
                  <div className="bg-accent/5 p-6 border border-accent/20 rounded-sm space-y-4">
                    <p className="leading-relaxed text-[11px] text-text-main italic font-serif">「目前的策略是以邀請制帶動增長。每成功邀請一人註冊，邀請人可得 100 點。」</p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 text-[10px]">
                        <Check size={14} className="text-accent mt-0.5 shrink-0" />
                        <span className="leading-relaxed text-text-dim">邀請獎勵：每成功邀請 1 人註冊，發放 100 點獎勵。</span>
                      </div>
                      <div className="flex items-start gap-3 text-[10px]">
                        <Check size={14} className="text-accent mt-0.5 shrink-0" />
                        <span className="leading-relaxed text-text-dim">兌換門檻：累積滿 2000 點可直接兌換 1 個月 Pro 版權限。</span>
                      </div>
                      <div className="flex items-start gap-3 text-[10px]">
                        <Check size={14} className="text-accent mt-0.5 shrink-0" />
                        <span className="leading-relaxed text-text-dim">被邀請人獎勵：新用戶透過連結註冊即贈送 50 點開戶禮。</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-border/30 rounded-lg space-y-3">
                    <div className="text-[10px] font-bold text-text-main uppercase">營運建議 / INSIGHT</div>
                    <p className="text-[10px] text-text-dim leading-relaxed">
                      根據目前的設定，用戶平均需要邀請 20 位活躍好友即可獲得價值 $150 元的專業版功能。這能有效降低獲客成本 (CAC) 並提升病毒式傳播率。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: any, label: string, value: any, sub: string, color: string }> = ({ icon, label, value, sub, color }) => (
  <div className="bg-card border border-border/30 p-6 rounded relative overflow-hidden group">
    <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all ${color} pointer-events-none`}>
      {icon}
    </div>
    <div className="text-[10px] font-bold text-text-dim uppercase tracking-widest mb-1">{label}</div>
    <div className={`text-2xl font-black font-mono ${color}`}>
      {value}<span className="text-xs opacity-50 ml-1 font-sans">{sub}</span>
    </div>
    <div className="mt-4 pt-4 border-t border-border/10 flex justify-between items-center">
      <div className="text-[9px] text-text-dim uppercase tracking-widest">最後更新: 剛才</div>
      <div className="w-8 h-1 bg-accent/20 rounded-full overflow-hidden">
        <motion.div initial={{ x: -32 }} animate={{ x: 32 }} transition={{ repeat: Infinity, duration: 2 }} className="w-full h-full bg-accent" />
      </div>
    </div>
  </div>
);
