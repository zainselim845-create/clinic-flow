import React, { useState } from 'react';
import { 
  CheckCircle2, RefreshCw, Layers, ShieldAlert, Zap, 
  RotateCcw, Trash2, PlayCircle, PauseCircle 
} from 'lucide-react';
import { globalAsyncQueue } from '../../../../services/asyncQueueService';
import { circuitBreaker } from '../../../../utils/circuitBreaker';
import { multiTierCache } from '../../../../services/multiTierCacheService';

export function Resilience100MTab() {
  const [queueMetrics, setQueueMetrics] = useState(() => globalAsyncQueue.getMetrics());
  const [cacheMetrics, setCacheMetrics] = useState(() => multiTierCache.getDiagnostics());
  const [isQueuePaused, setIsQueuePaused] = useState(globalAsyncQueue.isPaused);
  const [resilienceNotice, setResilienceNotice] = useState(null);

  const refreshResilienceMetrics = () => {
    setQueueMetrics(globalAsyncQueue.getMetrics());
    setCacheMetrics(multiTierCache.getDiagnostics());
    setIsQueuePaused(globalAsyncQueue.isPaused);
  };

  const handleRetryDlq = () => {
    const retried = globalAsyncQueue.retryDlq();
    refreshResilienceMetrics();
    setResilienceNotice(`تمت إعادة جدولة ${retried} مهمة من طابور الرسائل الميتة (DLQ) بأولوية قصوى.`);
    setTimeout(() => setResilienceNotice(null), 3000);
  };

  const handlePruneQueue = () => {
    globalAsyncQueue.pruneCompleted(0);
    refreshResilienceMetrics();
    setResilienceNotice('تم تفريغ كافة سجلات المهام المكتملة من الذاكرة.');
    setTimeout(() => setResilienceNotice(null), 3000);
  };

  const handleToggleQueuePause = () => {
    globalAsyncQueue.isPaused = !globalAsyncQueue.isPaused;
    if (!globalAsyncQueue.isPaused) {
      globalAsyncQueue.drainSoon();
    }
    refreshResilienceMetrics();
  };

  const handleClearCache = () => {
    multiTierCache.clear();
    refreshResilienceMetrics();
    setResilienceNotice('تم تفريغ مستويات الذاكرة المؤقتة (L1 Memory & L2 Storage) بنجاح.');
    setTimeout(() => setResilienceNotice(null), 3000);
  };

  return (
    <div className="infra-content-pane">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.15rem' }}>مرونة المنظومة والتحكم بالحمولة العالية (100M-Scale & Resilience)</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            مراقبة حية لطوابير المهام غير المتزامنة (Background Async Queue)، طابور الرسائل الميتة (DLQ)، قواطع الدوائر (Circuit Breakers)، والذاكرة المؤقتة متعددة المستويات.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshResilienceMetrics}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={15} />
          <span>تحديث المقاييس اللحظية</span>
        </button>
      </div>

      {resilienceNotice && (
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          color: '#065F46',
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{resilienceNotice}</span>
        </div>
      )}

      {/* 1. Queue Metrics Grid */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.85rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="var(--primary)" />
          <span>طابور المهام الخلفية غير المتزامنة (Background Async Queue)</span>
          <span style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: '999px',
            background: isQueuePaused ? '#FEF2F2' : '#ECFDF5',
            color: isQueuePaused ? '#B91C1C' : '#047857',
            fontWeight: 700
          }}>
            {isQueuePaused ? 'متوقف مؤقتاً' : 'يعمل بنشاط'}
          </span>
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>المهام المعلقة (Pending)</span>
            <strong style={{ display: 'block', fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {queueMetrics.pending}
            </strong>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>قيد التنفيذ (Processing)</span>
            <strong style={{ display: 'block', fontSize: '1.4rem', color: '#2563EB', marginTop: '0.2rem' }}>
              {queueMetrics.processing}
            </strong>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>المكتملة بنجاح (Completed)</span>
            <strong style={{ display: 'block', fontSize: '1.4rem', color: '#059669', marginTop: '0.2rem' }}>
              {queueMetrics.completed}
            </strong>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>طابور الرسائل الميتة (DLQ)</span>
            <strong style={{ display: 'block', fontSize: '1.4rem', color: queueMetrics.dlqCount > 0 ? '#DC2626' : '#6B7280', marginTop: '0.2rem' }}>
              {queueMetrics.dlqCount}
            </strong>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>العمال النشطين (Active Workers)</span>
            <strong style={{ display: 'block', fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {queueMetrics.activeWorkers} / 4
            </strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleRetryDlq}
            disabled={queueMetrics.dlqCount === 0}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RotateCcw size={15} />
            <span>إعادة محاولة كافة مهام DLQ ({queueMetrics.dlqCount})</span>
          </button>

          <button
            type="button"
            onClick={handlePruneQueue}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Trash2 size={15} />
            <span>تفريغ سجلات المهام المكتملة</span>
          </button>

          <button
            type="button"
            onClick={handleToggleQueuePause}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {isQueuePaused ? <PlayCircle size={15} color="#059669" /> : <PauseCircle size={15} color="#DC2626" />}
            <span>{isQueuePaused ? 'استئناف تشغيل الطابور' : 'إيقاف الطابور مؤقتاً'}</span>
          </button>
        </div>
      </div>

      {/* 2. Circuit Breakers Status */}
      <div style={{ marginBottom: '1.75rem', background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.85rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={18} color="var(--primary)" />
          <span>حالة قواطع الدائرة للخدمات الخارجية (Circuit Breakers)</span>
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.85rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <strong style={{ fontSize: '0.88rem' }}>بوابات الرسائل القصيرة (SMS Gateway)</strong>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: circuitBreaker.isOpen('sms_gateway') ? '#FEE2E2' : '#ECFDF5',
                color: circuitBreaker.isOpen('sms_gateway') ? '#DC2626' : '#059669'
              }}>
                {circuitBreaker.isOpen('sms_gateway') ? 'قاطع مفعل (OPEN)' : 'سليم ونشط (CLOSED)'}
              </span>
            </div>
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              يحمي المنصة من بطء أو انقطاع مزودي الاتصالات عبر الفشل السريع والتراجع الآمن.
            </small>
          </div>

          <div style={{ padding: '0.85rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <strong style={{ fontSize: '0.88rem' }}>محرك الذكاء الاصطناعي (AI Core)</strong>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: circuitBreaker.isOpen('openrouter_ai') ? '#FEE2E2' : '#ECFDF5',
                color: circuitBreaker.isOpen('openrouter_ai') ? '#DC2626' : '#059669'
              }}>
                {circuitBreaker.isOpen('openrouter_ai') ? 'قاطع مفعل (OPEN)' : 'سليم ونشط (CLOSED)'}
              </span>
            </div>
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              يضمن استمرارية الردود السريرية والتحويل للنماذج الاحتياطية عند حدوث اختناقات.
            </small>
          </div>

          <div style={{ padding: '0.85rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <strong style={{ fontSize: '0.88rem' }}>المزامنة السحابية (Cloud Sync)</strong>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: circuitBreaker.isOpen('supabase_sync') ? '#FEE2E2' : '#ECFDF5',
                color: circuitBreaker.isOpen('supabase_sync') ? '#DC2626' : '#059669'
              }}>
                {circuitBreaker.isOpen('supabase_sync') ? 'قاطع مفعل (OPEN)' : 'سليم ونشط (CLOSED)'}
              </span>
            </div>
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              يحمي التزامن اللحظي للعيادات ويفعل وضع العمل دون اتصال (Offline-First) تلقائياً.
            </small>
          </div>
        </div>
      </div>

      {/* 3. Multi-Tier Cache Metrics */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} color="#D97706" />
            <span>الذاكرة المؤقتة متعددة المستويات (Multi-Tier Caching - L1 Memory & L2 Storage)</span>
          </h4>
          <button
            type="button"
            onClick={handleClearCache}
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
          >
            تفريغ الكاش المؤقت
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>إصابات ذاكرة L1 (Memory Hits)</span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {cacheMetrics.l1Hits || 0}
            </strong>
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>إصابات كاش L2 (Persistent Hits)</span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {cacheMetrics.l2Hits || 0}
            </strong>
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>نسبة نجاح الكاش (Hit Rate)</span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: '#059669', marginTop: '0.2rem' }}>
              {cacheMetrics.hitRate || '0%'}
            </strong>
          </div>
          <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>عناصر ذاكرة LRU النشطة</span>
            <strong style={{ display: 'block', fontSize: '1.2rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {cacheMetrics.l1Size || 0} عنصر
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
