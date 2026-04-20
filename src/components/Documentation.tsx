import React from 'react';
import { motion } from 'motion/react';
import { Book, Shield, FileText, Lock, ArrowLeft } from 'lucide-react';

interface DocumentationProps {
  onBack: () => void;
}

export const Documentation: React.FC<DocumentationProps> = ({ onBack }) => {
  const [activeDoc, setActiveDoc] = React.useState<'manual' | 'install' | 'privacy' | 'terms'>('install');

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-3 text-text-dim hover:text-accent transition-all text-xs uppercase tracking-widest font-mono">
          <ArrowLeft size={14} /> 返回儀表板 / Back
        </button>
        <h1 className="text-xl font-serif text-accent uppercase tracking-widest font-black">Legal & Support / 法律與說明</h1>
      </div>

      <div className="flex border-b border-border/30 gap-8 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveDoc('install')}
          className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${activeDoc === 'install' ? 'text-accent' : 'text-text-dim'}`}
        >
          手機桌面設定 / Mobile App
          {activeDoc === 'install' && <motion.div layoutId="docTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        <button 
          onClick={() => setActiveDoc('manual')}
          className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${activeDoc === 'manual' ? 'text-accent' : 'text-text-dim'}`}
        >
          使用手冊 / Manual
          {activeDoc === 'manual' && <motion.div layoutId="docTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        <button 
          onClick={() => setActiveDoc('privacy')}
          className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${activeDoc === 'privacy' ? 'text-accent' : 'text-text-dim'}`}
        >
          隱私與安全 / Privacy
          {activeDoc === 'privacy' && <motion.div layoutId="docTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        <button 
          onClick={() => setActiveDoc('terms')}
          className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${activeDoc === 'terms' ? 'text-accent' : 'text-text-dim'}`}
        >
          法律協議 / Terms
          {activeDoc === 'terms' && <motion.div layoutId="docTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
        </button>
      </div>

      <motion.div 
        key={activeDoc}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/30 p-10 rounded shadow-2xl prose prose-invert max-w-none"
      >
        {activeDoc === 'install' && (
          <div className="space-y-12">
            <h2 className="text-2xl font-serif text-accent flex items-center gap-3"><Book /> 將「匠心估價」加入手機桌面</h2>
            
            <div className="bg-accent/5 border border-accent/20 p-6 rounded-sm">
              <p className="text-xs text-accent leading-relaxed font-bold uppercase tracking-widest mb-4">
                💡 提示：本平台是為手機操作設計的 Web App，無需透過 App Store 下載。只需按照以下步驟，即可像一般 App 一樣從桌面快速啟動，並獲得更大的操作空間！
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* iOS Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    <span className="text-xs font-bold">iOS</span>
                  </div>
                  <h3 className="text-text-main font-bold">iPhone / iPad (Safari 瀏覽器)</h3>
                </div>
                
                <ol className="list-decimal pl-5 space-y-4 text-xs text-text-dim">
                  <li>在 Safari 中開啟本網站：<strong className="text-accent">https://engi-quote.web.app</strong></li>
                  <li>點擊底部工具列中間的 <strong className="text-white">「分享」圖示</strong> (一個向上箭頭的方塊)。</li>
                  <li>向下滑動選單，找到並點擊 <strong className="text-white">「加入主畫面 / Add to Home Screen」</strong>。</li>
                  <li>確認名稱為「匠心估價」後，點擊右上角的 <strong className="text-white">「新增」</strong>。</li>
                  <li>大功告成！您現在可以從手機桌面像玩 App 一樣開啟。</li>
                </ol>
                
                <div className="pt-4 border-t border-border/10">
                  <p className="text-[10px] text-text-dim italic">註：若您是使用 LINE 開啟此連結，請點擊 LINE 右下角的齒輪或選單，「以其他瀏覽器開啟」(Safari) 後再操作。</p>
                </div>
              </div>

              {/* Android Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <span className="text-xs font-bold">Android</span>
                  </div>
                  <h3 className="text-text-main font-bold">安卓手機 (Chrome 瀏覽器)</h3>
                </div>
                
                <ol className="list-decimal pl-5 space-y-4 text-xs text-text-dim">
                  <li>在 Chrome 中開啟本網站：<strong className="text-accent">https://engi-quote.web.app</strong></li>
                  <li>點擊右上角的 <strong className="text-white">「三個點」選單</strong> (更多 / Menu)。</li>
                  <li>找到並點擊 <strong className="text-white">「安裝應用程式 / Install App」</strong> 或 <strong className="text-white">「加入主畫面」</strong>。</li>
                  <li>在跳出的確認視窗中點擊 <strong className="text-white">「安裝」</strong>。</li>
                  <li>稍等幾秒後，系統會將快捷圖示放入您的應用程式列表與桌面。</li>
                </ol>

                <div className="pt-4 border-t border-border/10">
                  <p className="text-[10px] text-text-dim italic">註：不同廠牌手機（如小米、三星）內建瀏覽器按鈕位置可能略有不同，建議統使用 Chrome 操作最穩定。</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDoc === 'manual' && (
          <div className="space-y-12">
            <h2 className="text-2xl font-serif text-accent flex items-center gap-3"><Book /> 匠心估價 系統操作手冊</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-sm leading-relaxed text-text-dim">
              <div className="space-y-6">
                <div>
                  <h3 className="text-text-main font-bold mb-2">1. 報價追加與變更 (Variations)</h3>
                  <p className="mb-2">現在您可以直接在同一張報價單中新增「追加項目」，而不需要重新建立一份新報價：</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>進入報價詳情頁面，點選「追加項目」。</li>
                    <li>系統會以紫色標註該項為「追加」，並在最後總計中自動區分原始工程款與追加款項。</li>
                    <li>這能讓客戶更清晰了解工程變更的內容與預算。</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-text-main font-bold mb-2">2. 收款進度追蹤</h3>
                  <p className="mb-2">整合式的收款管理工具：</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>即時顯示已收金額、剩餘餘額。</li>
                    <li>視覺化進度條反映專案回款比例。</li>
                    <li>一鍵生成「禮貌催款提醒」文字，方便透過通訊軟體發送。</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-text-main font-bold mb-2">3. 採購單 (PO) 同步</h3>
                  <p className="mb-2">讓採購流程透明化：</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>「已發送」標籤：當您分享連結給供應商時自動標註。</li>
                    <li>補料追蹤：同樣支援「追加採購」功能，區分主要備料與後期增補。</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-text-main font-bold mb-2">4. 推薦與點數</h3>
                  <p className="mb-2">共享利益機制：</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>分享推薦連結，被推薦人可得 50 點開戶禮。</li>
                    <li>推薦人成功邀請可得 100 點獎勵（好友需完成註冊）。</li>
                    <li>累積滿 2000 點即可在「點數商店」兌換 1 個月 Pro 專業版服務。</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-text-main font-bold mb-2">5. 圖片分享與正式化 (New)</h3>
                  <p className="mb-2">考量多數溝通發生在手機通訊軟體，我們簡化了發送流程：</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li><strong>儲存並轉正式：</strong> 點擊此按鈕會自動下載精美的報價/採購圖片（方便您直接傳送到 Line 群組），同時系統會將該單據自動標記為「已發送/正式成交」狀態，無需手動更改。</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-text-main font-bold mb-2">6. 方案升級與取消</h3>
                  <p className="mb-2">您可以隨時彈性調整您的訂閱狀態：</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-text-dim">
                    <li><strong>如何更換方案：</strong> 點擊側邊欄底部的「管理」或個人頭像旁的「管理」按鈕，即可開啟方案視窗進行年費/月費切換。</li>
                    <li><strong>如何取消方案：</strong> 在「方案管理」視窗中，點擊最下方的 <span className="text-red-400">「取消訂閱 / CANCEL SUBSCRIPTION」</span> 按鈕即可隨時回到免費版。</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-text-main font-bold mb-2">7. 官方 LINE 客服</h3>
                  <p className="mb-2">遇到技術問題或需要人工業務協助？</p>
                  <a 
                    href="https://lin.ee/rJlRSTc" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#06C755] text-white text-[10px] font-bold rounded uppercase tracking-widest hover:brightness-110 transition-all"
                  >
                    立即加入 LINE 官方帳號
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDoc === 'privacy' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-serif text-accent flex items-center gap-3"><Shield /> 隱私權保護政策</h2>
            <div className="text-sm leading-relaxed text-text-dim space-y-4">
              <p>本平台非常重視您的數據私隱。以下是有關我們如何處理數據的說明：</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>個人資料：</strong> 我們僅收集必要的登入資訊（Email、頭像）用於識別您的帳戶。</li>
                <li><strong>工程數據：</strong> 您輸入的報價項目與客戶清單完全屬於您個人所有。我們不會將您的特定工程價碼洩漏給其他競爭對手。</li>
                <li><strong>AI 訓練：</strong> 為了優化估價準確度，我們可能會使用去識別化後的工項統計數據，但絕對不會包含任何可識別您或您客戶的信息。</li>
                <li><strong>安全性：</strong> 所有數據皆儲存於加密的雲端伺服器 (Firebase)，並設有嚴格的多層安全防火牆。</li>
              </ul>
            </div>
          </div>
        )}

        {activeDoc === 'terms' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-serif text-accent flex items-center gap-3"><FileText /> 法律條款與服務協議</h2>
            <div className="text-sm leading-relaxed text-text-dim space-y-4">
              <h3 className="text-text-main font-bold">1. 服務免責聲明</h3>
              <p>本平台提供之 AI 估價結果僅供工程報價參考。實際工程執行時，應由使用者現場視察後自行擔綱最終決定，本平台不對任何報價盈虧負法律責任。</p>
              <h3 className="text-text-main font-bold">2. 付費與退款</h3>
              <p>訂閱費用一經扣除，將生效至該週期結束。7 天免費試用期結束後將恢復為免費版功能，除非使用者主動升級。我們提供完全的消費透明度。</p>
              <h3 className="text-text-main font-bold">3. 智慧財產權</h3>
              <p>平台之代碼、介面設計與 AI 演算法屬於 [匠心估價] 團隊。使用者產出之報價單文件與客戶數據則完全屬於使用者所有。</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
