import React, { useState } from 'react';
import { 
  ADULT_TEETH, PEDIATRIC_TEETH, TOOTH_SURFACES, CLINICAL_CONDITIONS,
  saveToothCondition, deleteToothCondition
} from '../services/dentalChartService';
import { 
  AlertCircle, CheckCircle2, Award, Activity, X, Trash2, 
  Sparkles, Layers, Anchor, Shield, Plus, Edit2, Info
} from 'lucide-react';
import './DentalChart.css';

const DentalChart = ({ patientId, chartEntries = [], onChartUpdate }) => {
  const [isPediatric, setIsPediatric] = useState(false);
  const [isPanoramic, setIsPanoramic] = useState(false);
  
  // Quick-Stamp Tool Palette ('select', 'caries', 'composite', 'rct', 'crown', 'missing', 'implant', 'veneer')
  const [activeTool, setActiveTool] = useState('select');
  const [stampFeedback, setStampFeedback] = useState(null);

  const [selectedTooth, setSelectedTooth] = useState(null);
  const [selectedSurface, setSelectedSurface] = useState('WHOLE');
  const [selectedCondition, setSelectedCondition] = useState('caries');
  const [selectedStatus, setSelectedStatus] = useState('planned');
  const [entryNotes, setEntryNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const teethArch = isPediatric ? PEDIATRIC_TEETH : ADULT_TEETH;

  // Show quick feedback banner
  const showFeedback = (msg) => {
    setStampFeedback(msg);
    setTimeout(() => setStampFeedback(null), 2500);
  };

  // Get conditions for a specific tooth
  const getToothEntries = (toothNum) => {
    return chartEntries.filter(e => Number(e.toothNumber) === Number(toothNum));
  };

  // Get primary display color and condition for a tooth
  const getToothVisualState = (toothNum) => {
    const entries = getToothEntries(toothNum);
    if (!entries.length) return null;

    // Check if missing
    if (entries.some(e => e.conditionCode === 'missing')) {
      return { color: '#1E293B', isMissing: true, label: 'مفقود' };
    }

    // Latest active entry
    const active = entries[entries.length - 1];
    const condition = CLINICAL_CONDITIONS.find(c => c.code === active.conditionCode);
    return {
      color: condition?.color || '#3B82F6',
      label: condition?.nameAr || active.conditionCode,
      status: active.status,
      count: entries.length
    };
  };

  // 1-Click Quick Stamp or Open Modal
  const handleToothClick = async (toothNum) => {
    // If a stamping tool is active, record immediately in 1 click!
    if (activeTool !== 'select') {
      const condition = CLINICAL_CONDITIONS.find(c => c.code === activeTool);
      const newEntry = {
        id: 'stamp_' + Date.now(),
        patientId,
        toothNumber: toothNum,
        surface: 'WHOLE',
        conditionCode: activeTool,
        status: 'planned',
        notes: `تسجيل سريع بالأداة: ${condition?.nameAr || activeTool}`,
        createdAt: new Date().toISOString()
      };

      try {
        await saveToothCondition(newEntry);
        if (onChartUpdate) {
          onChartUpdate([...chartEntries, newEntry]);
        }
        showFeedback(`تم تسجيل [${condition?.nameAr || activeTool}] فوراً على سن #${toothNum}`);
      } catch (err) {
        console.error('Error stamping tooth condition:', err);
      }
      return;
    }

    // Default 'select' mode: open full inspector modal
    setSelectedTooth(toothNum);
    const existing = getToothEntries(toothNum);
    if (existing.length > 0) {
      const last = existing[existing.length - 1];
      setSelectedSurface(last.surface || 'WHOLE');
      setSelectedCondition(last.conditionCode || 'caries');
      setSelectedStatus(last.status || 'planned');
      setEntryNotes(last.notes || '');
    } else {
      setSelectedSurface('WHOLE');
      setSelectedCondition('caries');
      setSelectedStatus('planned');
      setEntryNotes('');
    }
  };


  // Save condition
  const handleSaveCondition = async () => {
    if (!selectedTooth) return;
    setIsSaving(true);

    const newEntry = {
      id: Date.now().toString(),
      patientId,
      toothNumber: selectedTooth,
      surface: selectedSurface,
      conditionCode: selectedCondition,
      status: selectedStatus,
      notes: entryNotes,
      createdAt: new Date().toISOString()
    };

    try {
      await saveToothCondition(newEntry);
      if (onChartUpdate) {
        onChartUpdate([...chartEntries, newEntry]);
      }
      setSelectedTooth(null);
    } catch (err) {
      console.error('Error saving condition:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete an existing entry
  const handleDeleteEntry = async (entryId) => {
    try {
      await deleteToothCondition(entryId);
      if (onChartUpdate) {
        onChartUpdate(chartEntries.filter(e => e.id !== entryId));
      }
    } catch (err) {
      console.error('Error deleting condition:', err);
    }
  };

  // Render a single tooth button with anatomical surface dividers
  const renderToothCell = (toothNum) => {
    const visual = getToothVisualState(toothNum);
    const entries = getToothEntries(toothNum);
    const isSelected = selectedTooth === toothNum;

    return (
      <button
        key={toothNum}
        type="button"
        className={`tooth-cell ${visual?.isMissing ? 'is-missing' : ''} ${isSelected ? 'is-selected' : ''}`}
        onClick={() => handleToothClick(toothNum)}
        title={`سن رقم ${toothNum} ${visual ? `— ${visual.label}` : ''}`}
      >
        <span className="tooth-num-badge">{toothNum}</span>

        {/* Anatomical Tooth SVG Representation */}
        <div className="tooth-graphic-wrap">
          <svg viewBox="0 0 40 40" className="tooth-svg">
            {/* Outer Tooth Shape */}
            <rect 
              x="2" y="2" width="36" height="36" rx="6" 
              className="tooth-base-shape"
              style={{
                fill: visual?.color ? `${visual.color}15` : '#F8FAFC',
                stroke: visual?.color || '#CBD5E1',
                strokeWidth: visual ? '2.5' : '1.5'
              }}
            />
            {/* Surface Guides */}
            <polygon points="2,2 14,14 26,14 38,2" className="tooth-surface buccal" />
            <polygon points="38,2 26,14 26,26 38,38" className="tooth-surface distal" />
            <polygon points="38,38 26,26 14,26 2,38" className="tooth-surface lingual" />
            <polygon points="2,38 14,26 14,14 2,2" className="tooth-surface mesial" />
            <rect x="14" y="14" width="12" height="12" rx="2" className="tooth-surface occlusal" />

            {/* Condition Indicator */}
            {visual?.isMissing && (
              <line x1="6" y1="6" x2="34" y2="34" stroke="#EF4444" strokeWidth="3" />
            )}
          </svg>

          {entries.length > 0 && !visual?.isMissing && (
            <span 
              className="tooth-status-pill"
              style={{ backgroundColor: visual?.color || '#3B82F6' }}
            >
              {visual?.label}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className={`dental-chart-container ${isPanoramic ? 'is-panoramic' : ''}`}>
      
      {/* Chart Header & Controls */}
      <div className="chart-header-bar">
        <div className="chart-title-group">
          <div className="chart-title-flex">
            <h4>مخطط الأسنان التفاعلي (FDI Dental Charting)</h4>
            {stampFeedback && (
              <span className="stamp-feedback-pill">
                <CheckCircle2 size={13} />
                <span>{stampFeedback}</span>
              </span>
            )}
          </div>
          <p>اختر الأداة السريرية من الشريط واضغط على أي سن للتوثيق المباشر بنقرة واحدة</p>
        </div>

        <div className="chart-header-actions">
          <div className="chart-toggle-pills">
            <button
              type="button"
              className={`toggle-pill ${!isPediatric ? 'active' : ''}`}
              onClick={() => setIsPediatric(false)}
            >
              أسنان البالغين (32 سن)
            </button>
            <button
              type="button"
              className={`toggle-pill ${isPediatric ? 'active' : ''}`}
              onClick={() => setIsPediatric(true)}
            >
              أسنان الأطفال (20 سن)
            </button>
          </div>

          <button
            type="button"
            className="btn-panoramic-toggle"
            onClick={() => setIsPanoramic(!isPanoramic)}
            title={isPanoramic ? 'تصغير مساحة المخطط' : 'تكبير المخطط للوضع البانورامي الشامل'}
          >
            <span>{isPanoramic ? 'إغلاق الوضع البانورامي' : 'العرض البانورامي الشامل'}</span>
          </button>
        </div>
      </div>

      {/* QUICK-STAMP CLINICAL TOOL PALETTE (1-CLICK STAMPING) */}
      <div className="quick-stamp-palette">
        <span className="palette-label">شريط الختم السريع (1-Click Stamping):</span>
        <div className="palette-buttons-track">
          <button
            type="button"
            className={`stamp-tool-btn ${activeTool === 'select' ? 'active' : ''}`}
            onClick={() => setActiveTool('select')}
          >
            <span>تحديد وتفاصيل</span>
          </button>

          {CLINICAL_CONDITIONS.map(cond => (
            <button
              key={cond.code}
              type="button"
              className={`stamp-tool-btn ${activeTool === cond.code ? 'active' : ''}`}
              onClick={() => setActiveTool(cond.code)}
              style={{
                borderColor: activeTool === cond.code ? cond.color : 'transparent',
                backgroundColor: activeTool === cond.code ? `${cond.color}15` : 'transparent'
              }}
            >
              <span className="tool-indicator-dot" style={{ backgroundColor: cond.color }}></span>
              <span>{cond.nameAr}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Anatomical Dental Arches */}
      <div className="dental-arch-stage">

        
        {/* UPPER JAW (الفك العلوي) */}
        <div className="jaw-section upper-jaw">
          <span className="jaw-label">الفك العلوي (Maxilla)</span>
          <div className="jaw-teeth-row">
            {/* Right Quadrant (Q1 / Q5) */}
            <div className="quadrant-group right-quadrant">
              {teethArch.upperRight.map(renderToothCell)}
            </div>
            <div className="jaw-midline" title="خط المنتصف"></div>
            {/* Left Quadrant (Q2 / Q6) */}
            <div className="quadrant-group left-quadrant">
              {teethArch.upperLeft.map(renderToothCell)}
            </div>
          </div>
        </div>

        {/* Mid-Arch Divider */}
        <div className="arch-occlusal-plane">
          <span>مستوى الإطباق السني (Occlusal Plane)</span>
        </div>

        {/* LOWER JAW (الفك السفلي) */}
        <div className="jaw-section lower-jaw">
          <span className="jaw-label">الفك السفلي (Mandible)</span>
          <div className="jaw-teeth-row">
            {/* Right Quadrant (Q4 / Q8) */}
            <div className="quadrant-group right-quadrant">
              {teethArch.lowerRight.map(renderToothCell)}
            </div>
            <div className="jaw-midline" title="خط المنتصف"></div>
            {/* Left Quadrant (Q3 / Q7) */}
            <div className="quadrant-group left-quadrant">
              {teethArch.lowerLeft.map(renderToothCell)}
            </div>
          </div>
        </div>

      </div>

      {/* Clinical Legend */}
      <div className="chart-legend-box">
        <span className="legend-title">دليل الحالات السريرية:</span>
        <div className="legend-items-wrap">
          {CLINICAL_CONDITIONS.map(c => (
            <span key={c.code} className="legend-chip">
              <span className="chip-dot" style={{ backgroundColor: c.color }}></span>
              <span>{c.nameAr}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Tooth Details Modal / Inspector */}
      {selectedTooth && (
        <div className="tooth-inspector-overlay">
          <div className="tooth-inspector-card">
            
            <div className="inspector-header">
              <div>
                <h3>سن رقم #{selectedTooth}</h3>
                <span className="inspector-subtitle">
                  {selectedTooth <= 28 && selectedTooth >= 11 ? 'الفك العلوي' : 'الفك السفلي'} • ترقيم FDI
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedTooth(null)}
                className="btn-close-inspector"
              >
                <X size={18} />
              </button>
            </div>

            <div className="inspector-body">
              
              {/* Existing Recorded Conditions for this tooth */}
              {getToothEntries(selectedTooth).length > 0 && (
                <div className="recorded-entries-block">
                  <label className="field-lbl">الحالات المسجلة مسبقاً لهذا السن:</label>
                  <div className="entries-list">
                    {getToothEntries(selectedTooth).map(entry => {
                      const cond = CLINICAL_CONDITIONS.find(c => c.code === entry.conditionCode);
                      return (
                        <div key={entry.id} className="recorded-entry-item">
                          <div className="entry-meta">
                            <span className="entry-dot" style={{ backgroundColor: cond?.color || '#3B82F6' }}></span>
                            <strong>{cond?.nameAr || entry.conditionCode}</strong>
                            <span className="entry-surface-tag">سطح: {entry.surface}</span>
                            <span className={`entry-status-badge ${entry.status}`}>
                              {entry.status === 'completed' ? 'تم إنجازه' : entry.status === 'planned' ? 'مخطط' : 'موجود'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="btn-delete-entry"
                            title="حذف هذا التشخيص"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add New Finding / Procedure */}
              <div className="new-finding-form">
                <label className="field-lbl">تسجيل تشخيص أو إجراء سريري جديد:</label>

                {/* Condition Picker */}
                <div className="inspector-field">
                  <span className="sub-lbl">الحالة الطبية أو الإجراء:</span>
                  <select
                    className="inspector-select"
                    value={selectedCondition}
                    onChange={(e) => setSelectedCondition(e.target.value)}
                  >
                    {CLINICAL_CONDITIONS.map(c => (
                      <option key={c.code} value={c.code}>{c.nameAr} ({c.nameEn})</option>
                    ))}
                  </select>
                </div>

                {/* Surface Picker */}
                <div className="inspector-field">
                  <span className="sub-lbl">السطح المعني (Surface):</span>
                  <div className="surfaces-grid">
                    {TOOTH_SURFACES.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        className={`surface-btn ${selectedSurface === s.id ? 'active' : ''}`}
                        onClick={() => setSelectedSurface(s.id)}
                      >
                        {s.nameAr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Picker */}
                <div className="inspector-field">
                  <span className="sub-lbl">حالة الإجراء:</span>
                  <div className="status-radio-group">
                    <label className={`status-radio ${selectedStatus === 'existing' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="toothStatus" 
                        value="existing"
                        checked={selectedStatus === 'existing'}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                      />
                      <span>حالة قائمة مسبقاً (Existing)</span>
                    </label>
                    <label className={`status-radio ${selectedStatus === 'planned' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="toothStatus" 
                        value="planned"
                        checked={selectedStatus === 'planned'}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                      />
                      <span>مطلوب تنفيذه (Planned)</span>
                    </label>
                    <label className={`status-radio ${selectedStatus === 'completed' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="toothStatus" 
                        value="completed"
                        checked={selectedStatus === 'completed'}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                      />
                      <span>تم تنفيذه بالجلسة (Completed)</span>
                    </label>
                  </div>
                </div>

                {/* Clinical Notes */}
                <div className="inspector-field">
                  <span className="sub-lbl">ملاحظات الطبيب المعالج:</span>
                  <input
                    type="text"
                    className="inspector-input"
                    placeholder="مثال: تسوس عميق قريب من العصب، يحتاج بطانة..."
                    value={entryNotes}
                    onChange={(e) => setEntryNotes(e.target.value)}
                  />
                </div>

              </div>

            </div>

            <div className="inspector-footer">
              <button
                type="button"
                onClick={() => setSelectedTooth(null)}
                className="btn-cancel-inspector"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveCondition}
                disabled={isSaving}
                className="btn-save-inspector"
              >
                <CheckCircle2 size={16} />
                <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التشخيص في الملف'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DentalChart;
