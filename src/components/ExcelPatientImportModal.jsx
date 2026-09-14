import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, 
  X, Users, FileText, Check, ArrowRight, Loader2, RefreshCw
} from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Portal } from '@ark-ui/react/portal';
import { parsePatientsExcelFile, downloadPatientImportTemplate } from '../services/excelImportService';
import './ExcelPatientImportModal.css';

export default function ExcelPatientImportModal({
  isOpen,
  onClose,
  clinicId,
  existingPatients = [],
  onImportComplete
}) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const resetState = () => {
    setSelectedFile(null);
    setIsParsing(false);
    setParseError('');
    setParseResult(null);
    setIncludeDuplicates(false);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    if (onClose) onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setParseError('يرجى اختيار ملف إكسيل صالح بصيغة (.xlsx أو .xls أو .csv)');
      return;
    }

    setSelectedFile(file);
    setParseError('');
    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = await parsePatientsExcelFile(buffer, clinicId, existingPatients);
      setParseResult(result);
    } catch (err) {
      console.error('Error parsing Excel:', err);
      setParseError(err.message || 'فشل في قراءة ملف الإكسيل.');
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || !parseResult.patients) return;
    setIsImporting(true);

    try {
      let finalPatients = [...parseResult.patients];
      if (includeDuplicates && parseResult.duplicates?.length > 0) {
        finalPatients = [
          ...finalPatients,
          ...parseResult.duplicates.map(d => d.patient)
        ];
      }

      if (onImportComplete) {
        await onImportComplete(finalPatients);
      }
      handleClose();
    } catch (err) {
      console.error('Import error:', err);
      setParseError(err.message || 'تعذر استكمال استيراد المرضى.');
    } finally {
      setIsImporting(false);
    }
  };

  const totalToImport = parseResult 
    ? parseResult.validCount + (includeDuplicates ? parseResult.duplicateCount : 0)
    : 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(details) => { if (!details.open) handleClose(); }} lazyMount unmountOnExit>
      <Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="modal-content excel-import-modal-card">
            <div className="sheet-modal-grabber" style={{ marginBottom: '8px' }} />
            
            {/* Modal Header */}
            <div className="modal-header">
              <div className="title-row">
                <FileSpreadsheet className="text-emerald" size={24} />
                <Dialog.Title asChild>
                  <h3>استيراد مرضى النظام القديم من ملف إكسيل (Excel)</h3>
                </Dialog.Title>
              </div>
              <Dialog.CloseTrigger asChild>
                <button type="button" onClick={handleClose} className="btn-close" aria-label="إغلاق النافذة">
                  <X size={18} />
                </button>
              </Dialog.CloseTrigger>
            </div>

            <div className="excel-import-body" dir="rtl">
              {/* Informative description & template download banner */}
              <div className="import-helper-banner">
                <div className="banner-text">
                  <strong>انقل كافة بيانات مرضاك وسجلاتهم من سيستمك القديم أو الإكسيل دفعة واحدة:</strong>
                  <span>يتعرف النظام بذكاء على أعمدة (الاسم، الهاتف، السن، الجنس، التاريخ المرضي، الملاحظات).</span>
                </div>
                <button
                  type="button"
                  onClick={downloadPatientImportTemplate}
                  className="btn-download-template"
                  title="تحميل شيت إكسيل فارغ كنموذج استرشادي"
                >
                  <Download size={14} />
                  <span>تحميل نموذج إكسيل جاهز (.xlsx)</span>
                </button>
              </div>

              {parseError && (
                <div className="import-error-banner">
                  <AlertTriangle size={18} />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Step 1: File Dropzone (if no result yet) */}
              {!parseResult && (
                <div 
                  className="excel-dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  {isParsing ? (
                    <div className="dropzone-loading">
                      <Loader2 size={36} className="animate-spin text-primary" />
                      <strong>جاري قراءة وتحليل شيت الإكسيل ومطابقة الأعمدة...</strong>
                    </div>
                  ) : (
                    <>
                      <div className="dropzone-icon-circle">
                        <Upload size={28} className="text-primary" />
                      </div>
                      <h4>اسحب ملف الإكسيل هنا، أو اضغط لاختيار ملف من جهازك</h4>
                      <p>يدعم ملفات: Excel (.xlsx, .xls) أو ملفات القيم المفصولة (.csv)</p>
                      <span className="dropzone-browse-badge">تصفح الملفات</span>
                    </>
                  )}
                </div>
              )}

              {/* Step 2: Parsed Preview & Verification */}
              {parseResult && (
                <div className="import-preview-section">
                  <div className="preview-metrics-row">
                    <div className="metric-chip success">
                      <CheckCircle2 size={16} />
                      <span>{parseResult.validCount} مريض جاهز للاستيراد</span>
                    </div>
                    {parseResult.duplicateCount > 0 && (
                      <div className="metric-chip warning">
                        <AlertTriangle size={16} />
                        <span>{parseResult.duplicateCount} مريض مسجل مسبقاً بنفس الهاتف</span>
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={() => { setParseResult(null); setSelectedFile(null); }}
                      className="btn-reupload"
                    >
                      <RefreshCw size={13} />
                      <span>اختيار ملف آخر</span>
                    </button>
                  </div>

                  {parseResult.duplicateCount > 0 && (
                    <label className="duplicate-toggle-label">
                      <input 
                        type="checkbox" 
                        checked={includeDuplicates}
                        onChange={(e) => setIncludeDuplicates(e.target.checked)}
                      />
                      <span>استيراد المرضى المكررين أيضاً وتحديث بياناتهم</span>
                    </label>
                  )}

                  {/* Preview Table of first parsed records */}
                  <div className="preview-table-container">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>اسم المريض</th>
                          <th>رقم الهاتف</th>
                          <th>السن</th>
                          <th>الجنس</th>
                          <th>التشخيص والملاحظات السابقة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.patients.slice(0, 8).map((p, idx) => (
                          <tr key={p.id}>
                            <td>{idx + 1}</td>
                            <td><strong>{p.name}</strong></td>
                            <td dir="ltr" style={{ textAlign: 'right' }}>{p.phone || '—'}</td>
                            <td>{p.age ? (p.age + ' سنة') : '—'}</td>
                            <td>
                              <span className={'gender-pill ' + (p.gender === 'أنثى' ? 'female' : 'male')}>
                                {p.gender}
                              </span>
                            </td>
                            <td>
                              <span className="cell-truncate">{p.notes || p.diagnosis || '—'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parseResult.validCount > 8 && (
                      <div className="preview-more-hint">
                        ... بالإضافة إلى {parseResult.validCount - 8} مريض آخرين تم تجهيزهم بنجاح
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" onClick={handleClose} className="btn btn-secondary" disabled={isImporting}>
                  إلغاء
                </button>
                {parseResult && (
                  <button 
                    type="button" 
                    onClick={handleConfirmImport} 
                    className="btn btn-primary btn-confirm-import"
                    disabled={isImporting || totalToImport === 0}
                  >
                    {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    <span>تأكيد واستيراد ({totalToImport}) مريض إلى المنظومة</span>
                  </button>
                )}
              </div>
            </div>

          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
