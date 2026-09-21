import React, { useState, useMemo } from 'react';
import { 
  Eye, Printer, Save, AlertTriangle, CheckCircle2, 
  RotateCcw, FileText, Activity
} from 'lucide-react';
import { 
  SNELLEN_ACUITY_VALUES, 
  assessIntraocularPressure,
  getPatientSpecialtyData,
  savePatientSpecialtyData
} from '../../services/specialtyClinicalService';
import './OphthalmologyRefractionChart.css';

/**
 * OphthalmologyRefractionChart
 * Clinical refraction, visual acuity, IOP tonometry, and prescription module for Ophthalmology & Optometry.
 */
export default function OphthalmologyRefractionChart({ 
  patientId, 
  clinicId, 
  patientName = 'المريض', 
  doctorName = 'طبيب العيون' 
}) {
  const initialData = useMemo(() => {
    return getPatientSpecialtyData(patientId, clinicId, 'ophthalmology') || {
      od: { sph: '-1.50', cyl: '-0.50', axis: '90', add: '+1.75', va_ucva: '6/18', va_bcva: '6/6', iop: '16' },
      os: { sph: '-1.75', cyl: '-0.75', axis: '85', add: '+1.75', va_ucva: '6/24', va_bcva: '6/6', iop: '17' },
      pd: '63',
      notes: 'قاع العين والشبكية طبيعيان، نسبة تقعر العصب البصري C/D 0.3 طبيعية.',
      lensType: 'single_vision', // 'single_vision' | 'bifocal' | 'progressive'
      prescriptionDate: new Date().toISOString().split('T')[0]
    };
  }, [patientId, clinicId]);

  const [formData, setFormData] = useState(initialData);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const handleEyeChange = (eye, field, value) => {
    setFormData(prev => ({
      ...prev,
      [eye]: {
        ...prev[eye],
        [field]: value
      }
    }));
    setSaveSuccess(false);
  };

  const handleGeneralChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setSaveSuccess(false);
  };

  const handleSave = () => {
    savePatientSpecialtyData(patientId, clinicId, 'ophthalmology', formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // IOP Clinical Assessments
  const odIopAssessment = assessIntraocularPressure(formData.od.iop);
  const osIopAssessment = assessIntraocularPressure(formData.os.iop);
  const hasGlaucomaAlert = odIopAssessment.alert || osIopAssessment.alert;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="ophthalmology-container" dir="rtl">
      {/* Header */}
      <div className="ophthalmology-header-card">
        <div className="oph-title-group">
          <div className="oph-icon-badge">
            <Eye size={22} />
          </div>
          <div>
            <h3>مخطط انكسار النظر وقياسات العيون (Refraction & Visual Acuity)</h3>
            <p>تسجيل قياسات النظارة الطبية، حدة الإبصار (Snellen)، وضغط العين (IOP)</p>
          </div>
        </div>

        <div className="oph-actions-bar">
          <button 
            type="button" 
            onClick={() => setShowPrintModal(true)} 
            className="oph-btn-outline"
          >
            <Printer size={15} />
            <span>معاينة وطباعة الروشتة</span>
          </button>
          <button 
            type="button" 
            onClick={handleSave} 
            className="oph-btn-primary"
          >
            <Save size={15} />
            <span>{saveSuccess ? 'تم الحفظ بنجاح' : 'حفظ الفحص'}</span>
          </button>
        </div>
      </div>

      {/* Glaucoma Alert if IOP is high */}
      {hasGlaucomaAlert && (
        <div className="oph-alert-banner">
          <AlertTriangle size={20} color="#DC2626" />
          <div>
            <strong>تنبيه سريري: ارتفاع ضغط العين (Intraocular Pressure Alert)</strong>
            <p>أحد القياسات المسجلة تجاوز 21 mmHg. يُرجى إجراء فحص قاع العين والمجال البصري (Visual Field) لتقييم خطر الجلوكوما.</p>
          </div>
        </div>
      )}

      {/* Refraction Matrix Table */}
      <div className="oph-card">
        <div className="oph-card-header">
          <h4>مصفوفة انكسار النظر والعدسات (Refraction Matrix)</h4>
          <span className="pd-badge">
            المسافة بين البؤبؤين (PD): 
            <input 
              type="number" 
              value={formData.pd} 
              onChange={e => handleGeneralChange('pd', e.target.value)} 
              className="pd-inline-input"
              placeholder="62"
            /> مم
          </span>
        </div>

        <div className="table-responsive">
          <table className="oph-matrix-table">
            <thead>
              <tr>
                <th>العين</th>
                <th>Sphere (SPH)</th>
                <th>Cylinder (CYL)</th>
                <th>Axis (المحور)</th>
                <th>Addition (ADD)</th>
                <th>حدة الإبصار دون تصحيح</th>
                <th>حدة الإبصار بعد التصحيح</th>
                <th>ضغط العين (IOP)</th>
              </tr>
            </thead>
            <tbody>
              {/* Right Eye (OD) */}
              <tr>
                <td className="eye-cell od-cell">
                  <strong>العين اليمنى (OD)</strong>
                  <span className="sub-tag">Oculus Dexter</span>
                </td>
                <td>
                  <input 
                    type="text" 
                    value={formData.od.sph} 
                    onChange={e => handleEyeChange('od', 'sph', e.target.value)} 
                    placeholder="-1.50" 
                    className="oph-input"
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={formData.od.cyl} 
                    onChange={e => handleEyeChange('od', 'cyl', e.target.value)} 
                    placeholder="-0.50" 
                    className="oph-input"
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="1" 
                    max="180" 
                    value={formData.od.axis} 
                    onChange={e => handleEyeChange('od', 'axis', e.target.value)} 
                    placeholder="90" 
                    className="oph-input"
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={formData.od.add} 
                    onChange={e => handleEyeChange('od', 'add', e.target.value)} 
                    placeholder="+1.75" 
                    className="oph-input"
                  />
                </td>
                <td>
                  <select 
                    value={formData.od.va_ucva} 
                    onChange={e => handleEyeChange('od', 'va_ucva', e.target.value)}
                    className="oph-select"
                  >
                    {SNELLEN_ACUITY_VALUES.map(v => (
                      <option key={v.snellen} value={v.snellen}>{v.snellen} ({v.decimal})</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select 
                    value={formData.od.va_bcva} 
                    onChange={e => handleEyeChange('od', 'va_bcva', e.target.value)}
                    className="oph-select"
                  >
                    {SNELLEN_ACUITY_VALUES.map(v => (
                      <option key={v.snellen} value={v.snellen}>{v.snellen} ({v.decimal})</option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="iop-input-group">
                    <input 
                      type="number" 
                      value={formData.od.iop} 
                      onChange={e => handleEyeChange('od', 'iop', e.target.value)} 
                      placeholder="16" 
                      className={`oph-input iop ${odIopAssessment.severity}`}
                    />
                    <span className="iop-unit">mmHg</span>
                  </div>
                </td>
              </tr>

              {/* Left Eye (OS) */}
              <tr>
                <td className="eye-cell os-cell">
                  <strong>العين اليسرى (OS)</strong>
                  <span className="sub-tag">Oculus Sinister</span>
                </td>
                <td>
                  <input 
                    type="text" 
                    value={formData.os.sph} 
                    onChange={e => handleEyeChange('os', 'sph', e.target.value)} 
                    placeholder="-1.75" 
                    className="oph-input"
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={formData.os.cyl} 
                    onChange={e => handleEyeChange('os', 'cyl', e.target.value)} 
                    placeholder="-0.75" 
                    className="oph-input"
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    min="1" 
                    max="180" 
                    value={formData.os.axis} 
                    onChange={e => handleEyeChange('os', 'axis', e.target.value)} 
                    placeholder="85" 
                    className="oph-input"
                  />
                </td>
                <td>
                  <input 
                    type="text" 
                    value={formData.os.add} 
                    onChange={e => handleEyeChange('os', 'add', e.target.value)} 
                    placeholder="+1.75" 
                    className="oph-input"
                  />
                </td>
                <td>
                  <select 
                    value={formData.os.va_ucva} 
                    onChange={e => handleEyeChange('os', 'va_ucva', e.target.value)}
                    className="oph-select"
                  >
                    {SNELLEN_ACUITY_VALUES.map(v => (
                      <option key={v.snellen} value={v.snellen}>{v.snellen} ({v.decimal})</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select 
                    value={formData.os.va_bcva} 
                    onChange={e => handleEyeChange('os', 'va_bcva', e.target.value)}
                    className="oph-select"
                  >
                    {SNELLEN_ACUITY_VALUES.map(v => (
                      <option key={v.snellen} value={v.snellen}>{v.snellen} ({v.decimal})</option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="iop-input-group">
                    <input 
                      type="number" 
                      value={formData.os.iop} 
                      onChange={e => handleEyeChange('os', 'iop', e.target.value)} 
                      placeholder="17" 
                      className={`oph-input iop ${osIopAssessment.severity}`}
                    />
                    <span className="iop-unit">mmHg</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Lens Type & Clinical Findings */}
      <div className="oph-dual-grid">
        <div className="oph-subcard">
          <h4>نوع العدسات الموصى به</h4>
          <div className="lens-options-group">
            {[
              { id: 'single_vision', title: 'عدسات مفردة الرؤية (Single Vision)', desc: 'للقراءة فقط أو للمسافات فقط' },
              { id: 'bifocal', title: 'عدسات ثنائية البؤرة (Bifocal)', desc: 'خط فاصل بين القريب والبعيد' },
              { id: 'progressive', title: 'عدسات متعددة البؤر (Progressive)', desc: 'انتقال تدريجي ناعم بدون خط فاصل' }
            ].map(opt => (
              <label key={opt.id} className={`lens-option-card ${formData.lensType === opt.id ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="lensType" 
                  value={opt.id} 
                  checked={formData.lensType === opt.id} 
                  onChange={e => handleGeneralChange('lensType', e.target.value)}
                />
                <div>
                  <strong>{opt.title}</strong>
                  <p>{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="oph-subcard">
          <h4>ملاحظات الفحص وقاع العين (Clinical Examination)</h4>
          <textarea 
            value={formData.notes} 
            onChange={e => handleGeneralChange('notes', e.target.value)}
            placeholder="ملاحظات القرنية، العدسة البلورية، شبكية العين، أو نسبة تقعر العصب البصري..."
            rows={5}
            className="oph-textarea"
          />
          <div className="findings-quick-tags">
            <span className="tag-label">إشارات سريعة:</span>
            <button 
              type="button" 
              onClick={() => handleGeneralChange('notes', `${formData.notes} - قاع العين طبيعي والقرنية شفافة.`)}
              className="quick-tag-btn"
            >
              + فحص سليم
            </button>
            <button 
              type="button" 
              onClick={() => handleGeneralChange('notes', `${formData.notes} - اشتباه عتامة أولية في العدسة (Early Cataract).`)}
              className="quick-tag-btn"
            >
              + مياه بيضاء أولية
            </button>
            <button 
              type="button" 
              onClick={() => handleGeneralChange('notes', `${formData.notes} - اعتلال شبكي سكري طفيف (Mild NPDR).`)}
              className="quick-tag-btn"
            >
              + شبكية سكرية
            </button>
          </div>
        </div>
      </div>

      {/* Eyeglass Prescription Printable Modal */}
      {showPrintModal && (
        <div className="oph-modal-overlay">
          <div className="oph-modal-card print-rx-card">
            <div className="rx-print-header">
              <div className="rx-clinic-info">
                <h3>روشتة نظارة طبية معتمدة</h3>
                <span>وصفة انكسار النظر السريرية</span>
              </div>
              <div className="rx-meta-info">
                <div>المريض: <strong>{patientName}</strong></div>
                <div>التاريخ: {formData.prescriptionDate}</div>
              </div>
            </div>

            <div className="rx-table-wrap">
              <table className="rx-table">
                <thead>
                  <tr>
                    <th>العين</th>
                    <th>SPH</th>
                    <th>CYL</th>
                    <th>AXIS</th>
                    <th>ADD</th>
                    <th>PD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Right (OD)</strong></td>
                    <td>{formData.od.sph || '0.00'}</td>
                    <td>{formData.od.cyl || '0.00'}</td>
                    <td>{formData.od.axis ? `${formData.od.axis}°` : '—'}</td>
                    <td>{formData.od.add || '—'}</td>
                    <td rowSpan={2} className="rx-pd-cell">{formData.pd} mm</td>
                  </tr>
                  <tr>
                    <td><strong>Left (OS)</strong></td>
                    <td>{formData.os.sph || '0.00'}</td>
                    <td>{formData.os.cyl || '0.00'}</td>
                    <td>{formData.os.axis ? `${formData.os.axis}°` : '—'}</td>
                    <td>{formData.os.add || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rx-details-row">
              <div>نوع العدسة الموصى به: <strong>{formData.lensType === 'progressive' ? 'عدسات تدريجية (Progressive)' : formData.lensType === 'bifocal' ? 'عدسات ثنائية (Bifocal)' : 'عدسات مفردة الرؤية (Single Vision)'}</strong></div>
            </div>

            {formData.notes && (
              <div className="rx-notes-row">
                <span>إرشادات الطبيب: </span>
                <p>{formData.notes}</p>
              </div>
            )}

            <div className="rx-footer">
              <div className="doctor-sig-box">
                <span>توقيع الطبيب المعالج: <strong>{doctorName}</strong></span>
                <div className="sig-line" />
              </div>
            </div>

            <div className="modal-actions no-print">
              <button type="button" onClick={handlePrint} className="oph-btn-primary">طباعة الوصفة (Print Rx)</button>
              <button type="button" onClick={() => setShowPrintModal(false)} className="oph-btn-outline">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
