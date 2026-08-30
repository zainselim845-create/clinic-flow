import React, { useState, useEffect } from 'react';
import { 
  Wallet, ArrowDownLeft, ArrowUpRight, Plus, 
  DollarSign, Clock, RefreshCw, CheckCircle2 
} from 'lucide-react';
import { getPatientWalletHistory, addWalletTransaction } from '../services/walletService';
import './PatientWalletPanel.css';

const PatientWalletPanel = ({ patientId, patientName }) => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadWallet = async () => {
    if (!patientId) return;
    const res = await getPatientWalletHistory(patientId);
    if (res) {
      setBalance(res.balance || 0);
      setTransactions(res.transactions || []);
    }
  };

  useEffect(() => {
    loadWallet();
  }, [patientId]);

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0) return;
    setIsSubmitting(true);

    try {
      await addWalletTransaction(patientId, {
        type: 'deposit',
        amount: Number(depositAmount),
        notes: depositNotes || 'إيداع رصيد مقدم في المحفظة'
      });
      setDepositAmount('');
      setDepositNotes('');
      setShowDepositModal(false);
      await loadWallet();
    } catch (err) {
      console.error('Error depositing to wallet:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="patient-wallet-panel">
      
      {/* Wallet Card */}
      <div className="wallet-overview-card">
        <div className="wallet-card-left">
          <div className="wallet-icon-box">
            <Wallet size={26} />
          </div>
          <div>
            <span className="wallet-lbl">محفظة المريض (Patient Credit Wallet)</span>
            <h3 className="wallet-balance">{balance.toLocaleString()} ج.م</h3>
            <span className="wallet-sub">الرصيد المتاح للخصم الفوري من الفواتير والعلاجات</span>
          </div>
        </div>

        <button 
          type="button" 
          onClick={() => setShowDepositModal(true)} 
          className="btn-deposit-wallet"
        >
          <Plus size={16} />
          <span>شحن رصيد مقدماً</span>
        </button>
      </div>

      {/* Transactions History */}
      <div className="wallet-tx-history">
        <h5 className="history-title">سجل حركات الإيداع والخصم:</h5>
        {transactions.length === 0 ? (
          <div className="empty-tx-box">
            <Clock size={24} className="text-muted" />
            <p>لا توجد حركات مسجلة في المحفظة حتى الآن.</p>
          </div>
        ) : (
          <div className="tx-list">
            {transactions.map(tx => (
              <div key={tx.id} className="tx-row">
                <div className="tx-meta">
                  <div className={`tx-icon ${tx.transactionType}`}>
                    {tx.transactionType === 'deposit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div>
                    <strong>{tx.transactionType === 'deposit' ? 'إيداع رصيد' : 'خصم فاتورة'}</strong>
                    <span className="tx-notes">{tx.notes}</span>
                  </div>
                </div>

                <div className="tx-numbers">
                  <strong className={`tx-amount ${tx.transactionType}`}>
                    {tx.transactionType === 'deposit' ? `+${tx.amount}` : `-${tx.amount}`} ج.م
                  </strong>
                  <span className="tx-after">الرصيد بعدها: {tx.balanceAfter} ج.م</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="wallet-modal-overlay">
          <div className="wallet-modal-card">
            <div className="wallet-modal-header">
              <h5>إيداع رصيد في محفظة {patientName || 'المريض'}</h5>
              <button onClick={() => setShowDepositModal(false)} className="btn-close-sm">×</button>
            </div>

            <form onSubmit={handleDepositSubmit} className="wallet-modal-body">
              <div className="field-group">
                <label>المبلغ المراد شحنه (ج.م) *</label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  required
                  placeholder="مثال: 1000"
                  className="input-field"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label>ملاحظات السداد أو سند القبض</label>
                <input
                  type="text"
                  placeholder="مثال: دفعة مقدمة لخطة تقويم / تركيبات..."
                  className="input-field"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                />
              </div>

              <div className="wallet-modal-footer">
                <button type="button" onClick={() => setShowDepositModal(false)} className="btn-cancel">
                  إلغاء
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-save">
                  <CheckCircle2 size={16} />
                  <span>{isSubmitting ? 'جاري الإيداع...' : 'تأكيد شحن المحفظة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PatientWalletPanel;
