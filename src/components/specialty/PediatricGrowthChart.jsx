import React, { useState, useMemo } from 'react';
import { 
  Baby, Plus, Trash2, CheckCircle2,
  Activity, ShieldCheck, Scale, Ruler
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  WHO_GROWTH_STANDARDS, 
  calculateBmi, 
  calculatePediatricPercentile, 
  VACCINATION_SCHEDULE,
  getPatientSpecialtyData,
  savePatientSpecialtyData
} from '../../services/specialtyClinicalService';
import './PediatricGrowthChart.css';

/**
 * PediatricGrowthChart
 * Open-Source clinical growth chart powered by Recharts & WHO Child Growth Standards.
 * Plots percentiles (P3 to P97) against patient historical measurements.
 */
export default function PediatricGrowthChart({ patientId, clinicId, patientName, patientAge }) {
  const [activeMetric, setActiveMetric] = useState('weightForAge'); // 'weightForAge' | 'heightForAge' | 'headCircumference'
  const [gender, setGender] = useState('boys'); // 'boys' | 'girls'
  const [isAddingVisit, setIsAddingVisit] = useState(false);

  // Load patient visits & vaccine records
  const initialData = useMemo(() => {
    return getPatientSpecialtyData(patientId, clinicId, 'pediatrics') || {
      visits: [
        { id: 'v-1', date: '2025-06-10', month: 0, weight: 3.4, height: 50.5, head: 34.8, notes: 'وزن ولادة طبيعي' },
        { id: 'v-2', date: '2025-09-12', month: 3, weight: 6.2, height: 61.0, head: 40.2, notes: 'رضاعة طبيعية منتظمة' },
        { id: 'v-3', date: '2025-12-15', month: 6, weight: 7.8, height: 67.2, head: 43.1, notes: 'بدء إدخال وجبات التغذية التكميلية' },
        { id: 'v-4', date: '2026-03-18', month: 9, weight: 8.9, height: 71.8, head: 44.8, notes: 'نمو حركي واستجابة ممتازة' }
      ],
      completedVaccines: ['v-birth', 'v-2m', 'v-4m', 'v-6m']
    };
  }, [patientId, clinicId]);

  const [visits, setVisits] = useState(initialData.visits || []);
  const [completedVaccines, setCompletedVaccines] = useState(initialData.completedVaccines || []);

  const [newVisit, setNewVisit] = useState({
    date: new Date().toISOString().split('T')[0],
    month: 12,
    weight: '',
    height: '',
    head: '',
    notes: ''
  });

  const handleSaveData = (updatedVisits, updatedVaccines) => {
    setVisits(updatedVisits);
    setCompletedVaccines(updatedVaccines);
    savePatientSpecialtyData(patientId, clinicId, 'pediatrics', {
      visits: updatedVisits,
      completedVaccines: updatedVaccines
    });
  };

  const handleAddVisit = (e) => {
    e.preventDefault();
    if (!newVisit.weight && !newVisit.height) return;

    const visitObj = {
      id: `vis-${Date.now()}`,
      date: newVisit.date,
      month: Number(newVisit.month) || 0,
      weight: Number(newVisit.weight) || 0,
      height: Number(newVisit.height) || 0,
      head: Number(newVisit.head) || 0,
      notes: newVisit.notes || ''
    };

    const updated = [...visits, visitObj].sort((a, b) => a.month - b.month);
    handleSaveData(updated, completedVaccines);
    setIsAddingVisit(false);
    setNewVisit({
      date: new Date().toISOString().split('T')[0],
      month: (updated[updated.length - 1]?.month || 0) + 3,
      weight: '',
      height: '',
      head: '',
      notes: ''
    });
  };

  const handleDeleteVisit = (id) => {
    const updated = visits.filter(v => v.id !== id);
    handleSaveData(updated, completedVaccines);
  };

  const handleToggleVaccine = (vacId) => {
    const next = completedVaccines.includes(vacId)
      ? completedVaccines.filter(id => id !== vacId)
      : [...completedVaccines, vacId];
    handleSaveData(visits, next);
  };

  // Current latest visit stats
  const latestVisit = visits[visits.length - 1] || null;
  const currentBmi = latestVisit ? calculateBmi(latestVisit.weight, latestVisit.height) : 0;
  const currentWeightAssessment = latestVisit ? calculatePediatricPercentile(latestVisit.weight, latestVisit.month, gender, 'weightForAge') : null;
  const currentHeightAssessment = latestVisit ? calculatePediatricPercentile(latestVisit.height, latestVisit.month, gender, 'heightForAge') : null;

  // Prepare Recharts dataset by combining WHO standards with patient visit measurements
  const chartData = useMemo(() => {
    const standards = WHO_GROWTH_STANDARDS[gender]?.[activeMetric] || WHO_GROWTH_STANDARDS.boys[activeMetric];
    
    // Map patient measurements indexed by month
    const patientMap = {};
    visits.forEach(v => {
      const val = activeMetric === 'weightForAge' ? v.weight : activeMetric === 'heightForAge' ? v.height : v.head;
      if (val !== undefined && val !== null && val > 0) {
        patientMap[v.month] = val;
      }
    });

    // Merge standard months with any additional patient months
    const allMonths = Array.from(new Set([...standards.map(s => s.month), ...Object.keys(patientMap).map(Number)])).sort((a, b) => a - b);

    return allMonths.map(month => {
      // Find exact or interpolated standard
      const exact = standards.find(s => s.month === month);
      let p3 = exact?.p3;
      let p15 = exact?.p15;
      let p50 = exact?.p50;
      let p85 = exact?.p85;
      let p97 = exact?.p97;

      if (!exact) {
        // Linear interpolation from nearest neighbors
        const prev = [...standards].reverse().find(s => s.month < month) || standards[0];
        const next = standards.find(s => s.month > month) || standards[standards.length - 1];
        const factor = next.month === prev.month ? 0 : (month - prev.month) / (next.month - prev.month);
        
        p3 = Number((prev.p3 + (next.p3 - prev.p3) * factor).toFixed(2));
        p15 = Number((prev.p15 + (next.p15 - prev.p15) * factor).toFixed(2));
        p50 = Number((prev.p50 + (next.p50 - prev.p50) * factor).toFixed(2));
        p85 = Number((prev.p85 + (next.p85 - prev.p85) * factor).toFixed(2));
        p97 = Number((prev.p97 + (next.p97 - prev.p97) * factor).toFixed(2));
      }

      return {
        month,
        p3,
        p15,
        p50,
        p85,
        p97,
        patientVal: patientMap[month] !== undefined ? patientMap[month] : null
      };
    });
  }, [gender, activeMetric, visits]);

  return (
    <div className="pediatric-growth-container" dir="rtl">
      {/* Header & Controls */}
      <div className="pediatric-header-card">
        <div className="pediatric-title-group">
          <div className="pediatric-icon-badge">
            <Baby size={22} />
          </div>
          <div>
            <h3>منحنيات وجداول نمو الأطفال (WHO Growth Standards)</h3>
            <p>متابعة دقيقة للأوزان، الأطوال، محيط الرأس، وحساب المئينات وجدول التطعيمات</p>
          </div>
        </div>

        <div className="pediatric-controls-bar">
          <div className="gender-selector">
            <button
              type="button"
              onClick={() => setGender('boys')}
              className={`gender-btn ${gender === 'boys' ? 'active-boy' : ''}`}
            >
              ذكور (Boys)
            </button>
            <button
              type="button"
              onClick={() => setGender('girls')}
              className={`gender-btn ${gender === 'girls' ? 'active-girl' : ''}`}
            >
              إناث (Girls)
            </button>
          </div>

          <div className="metric-tabs">
            <button
              type="button"
              onClick={() => setActiveMetric('weightForAge')}
              className={`metric-tab-btn ${activeMetric === 'weightForAge' ? 'active' : ''}`}
            >
              <Scale size={14} />
              <span>الوزن / العمر</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('heightForAge')}
              className={`metric-tab-btn ${activeMetric === 'heightForAge' ? 'active' : ''}`}
            >
              <Ruler size={14} />
              <span>الطول / العمر</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric('headCircumference')}
              className={`metric-tab-btn ${activeMetric === 'headCircumference' ? 'active' : ''}`}
            >
              <Activity size={14} />
              <span>محيط الرأس</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingVisit(true)}
            className="btn-add-visit"
          >
            <Plus size={16} />
            <span>تسجيل زيارة وقياسات جديدة</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Current Patient Status */}
      {latestVisit && (
        <div className="pediatric-kpi-grid">
          <div className="pediatric-kpi-card">
            <span className="kpi-label">عمر القياس الأخير</span>
            <div className="kpi-value">{latestVisit.month} شهر</div>
            <span className="kpi-subtext">تاريخ الزيارة: {latestVisit.date}</span>
          </div>

          <div className="pediatric-kpi-card">
            <span className="kpi-label">الوزن الحالي والمئين</span>
            <div className="kpi-value">{latestVisit.weight} كجم</div>
            {currentWeightAssessment && (
              <span className={`kpi-badge ${currentWeightAssessment.severity}`}>
                {currentWeightAssessment.percentile} ({currentWeightAssessment.status})
              </span>
            )}
          </div>

          <div className="pediatric-kpi-card">
            <span className="kpi-label">الطول الحالي والمئين</span>
            <div className="kpi-value">{latestVisit.height} سم</div>
            {currentHeightAssessment && (
              <span className={`kpi-badge ${currentHeightAssessment.severity}`}>
                {currentHeightAssessment.percentile} ({currentHeightAssessment.status})
              </span>
            )}
          </div>

          <div className="pediatric-kpi-card">
            <span className="kpi-label">مؤشر كتلة الجسم (BMI)</span>
            <div className="kpi-value">{currentBmi} kg/m²</div>
            <span className="kpi-subtext">محيط الرأس: {latestVisit.head || '--'} سم</span>
          </div>
        </div>
      )}

      {/* Open-Source Recharts Interactive Growth Curve */}
      <div className="growth-chart-card">
        <div className="chart-header-legend">
          <h4>
            منحنى {activeMetric === 'weightForAge' ? 'الوزن مقابل العمر (كجم)' : activeMetric === 'heightForAge' ? 'الطول مقابل العمر (سم)' : 'محيط الرأس (سم)'} — معايير WHO (Recharts)
          </h4>
        </div>

        <div className="recharts-chart-wrapper" style={{ width: '100%', height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 15, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, #E2E8F0)" />
              <XAxis 
                dataKey="month" 
                unit=" شهر" 
                tick={{ fontSize: 11, fill: 'var(--text-secondary, #64748B)' }} 
              />
              <YAxis 
                unit={activeMetric === 'weightForAge' ? ' كجم' : ' سم'} 
                tick={{ fontSize: 11, fill: 'var(--text-secondary, #64748B)' }} 
              />
              <Tooltip 
                formatter={(val, name) => [`${val} ${activeMetric === 'weightForAge' ? 'كجم' : 'سم'}`, name]}
                labelFormatter={(label) => `العمر: ${label} شهر`}
                contentStyle={{ borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12px', textAlign: 'right', direction: 'rtl' }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                formatter={(val) => <span style={{ fontSize: '11px', color: '#334155', fontWeight: 600 }}>{val}</span>} 
              />
              <Line type="monotone" dataKey="p97" name="المئين 97 (الحد الأعلى)" stroke="#EF4444" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="p85" name="المئين 85" stroke="#F59E0B" strokeDasharray="3 3" dot={false} strokeWidth={1} />
              <Line type="monotone" dataKey="p50" name="المئين 50 (المتوسط الطبيعي)" stroke="#10B981" dot={false} strokeWidth={2.5} />
              <Line type="monotone" dataKey="p15" name="المئين 15" stroke="#F59E0B" strokeDasharray="3 3" dot={false} strokeWidth={1} />
              <Line type="monotone" dataKey="p3" name="المئين 3 (الحد الأدنى)" stroke="#EF4444" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
              <Line 
                type="monotone" 
                dataKey="patientVal" 
                name="قياسات الطفل الفعلية" 
                stroke="var(--clinic-primary, #09090B)" 
                strokeWidth={3} 
                dot={{ r: 5, fill: 'var(--clinic-primary, #09090B)', stroke: '#FFFFFF', strokeWidth: 2 }} 
                activeDot={{ r: 7 }} 
                connectNulls 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dual Section: Visits Table & Vaccination Schedule */}
      <div className="pediatric-dual-grid">
        {/* Table of Recorded Visits */}
        <div className="section-subcard">
          <div className="subcard-header">
            <h4>سجل قياسات الزيارات الدورية ({visits.length})</h4>
          </div>
          {visits.length === 0 ? (
            <div className="empty-state-box">
              <p>لم يتم تسجيل قياسات نمو سابقة لهذا الطفل.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="clinical-data-table">
                <thead>
                  <tr>
                    <th>تاريخ الزيارة</th>
                    <th>العمر (شهر)</th>
                    <th>الوزن (كجم)</th>
                    <th>الطول (سم)</th>
                    <th>محيط الرأس</th>
                    <th>ملاحظات</th>
                    <th>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map(v => (
                    <tr key={v.id}>
                      <td>{v.date}</td>
                      <td>{v.month} م</td>
                      <td><strong>{v.weight}</strong></td>
                      <td>{v.height}</td>
                      <td>{v.head || '--'}</td>
                      <td>{v.notes || '—'}</td>
                      <td>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteVisit(v.id)}
                          className="btn-delete-row"
                          title="حذف هذا القياس"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mandatory & Optional Vaccination Schedule */}
        <div className="section-subcard">
          <div className="subcard-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} color="#10B981" />
              <h4>جدول التطعيمات واللقاحات السريرية</h4>
            </div>
            <span className="vaccine-progress-pill">
              {completedVaccines.length} من {VACCINATION_SCHEDULE.length} مكتمل
            </span>
          </div>

          <div className="vaccination-list">
            {VACCINATION_SCHEDULE.map(vac => {
              const isDone = completedVaccines.includes(vac.id);
              return (
                <div key={vac.id} className={`vaccine-item ${isDone ? 'is-done' : ''}`}>
                  <label className="vaccine-label">
                    <input 
                      type="checkbox" 
                      checked={isDone} 
                      onChange={() => handleToggleVaccine(vac.id)}
                      className="vaccine-checkbox"
                    />
                    <div>
                      <div className="vaccine-age-tag">{vac.age}</div>
                      <div className="vaccine-name">
                        {vac.name}
                        {!vac.mandatory && <span className="optional-tag">اختياري</span>}
                      </div>
                    </div>
                  </label>
                  {isDone && <CheckCircle2 size={16} color="#10B981" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Visit Modal Dialog */}
      {isAddingVisit && (
        <div className="pediatric-modal-overlay">
          <div className="pediatric-modal-card">
            <div className="pediatric-modal-header">
              <h4>تسجيل قياسات نمو جديدة للطفل</h4>
              <button type="button" onClick={() => setIsAddingVisit(false)} className="close-btn">×</button>
            </div>
            <form onSubmit={handleAddVisit} className="pediatric-modal-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label>تاريخ الفحص *</label>
                  <input 
                    type="date" 
                    value={newVisit.date} 
                    onChange={e => setNewVisit({ ...newVisit, date: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>العمر بالشهور (Months) *</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="120" 
                    value={newVisit.month} 
                    onChange={e => setNewVisit({ ...newVisit, month: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label>الوزن (كجم) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="مثال: 7.5" 
                    value={newVisit.weight} 
                    onChange={e => setNewVisit({ ...newVisit, weight: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>الطول (سم) *</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="مثال: 68.0" 
                    value={newVisit.height} 
                    onChange={e => setNewVisit({ ...newVisit, height: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>محيط الرأس (سم)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="مثال: 42.5" 
                    value={newVisit.head} 
                    onChange={e => setNewVisit({ ...newVisit, head: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>ملاحظات الطبيب السريرية</label>
                <input 
                  type="text" 
                  placeholder="ملاحظات حول التغذية، التسنين، أو التطعيمات..." 
                  value={newVisit.notes} 
                  onChange={e => setNewVisit({ ...newVisit, notes: e.target.value })} 
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-save-visit">حفظ القياس وإضافته للمنحنى</button>
                <button type="button" onClick={() => setIsAddingVisit(false)} className="btn-cancel">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
