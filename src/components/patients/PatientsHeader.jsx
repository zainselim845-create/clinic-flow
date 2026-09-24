import React from 'react';
import { Upload, Download, Plus } from 'lucide-react';

export default function PatientsHeader({
  onOpenImport,
  onExportCSV,
  onOpenNewPatient
}) {
  return (
    <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
      <h1 style={{ margin: 0 }}>إدارة المرضى</h1>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          type="button"
          className="btn btn-secondary" 
          onClick={onOpenImport} 
          title="استيراد المرضى من ملف إكسيل قديم أو CSV"
          style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)', fontWeight: 600 }}
        >
          <Upload size={18} />
          <span>استيراد من إكسيل (النظام القديم)</span>
        </button>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={onExportCSV} 
          title="تصدير قائمة المرضى لملف إكسيل"
        >
          <Download size={18} />
          <span>تصدير إكسيل (CSV)</span>
        </button>
        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={onOpenNewPatient}
        >
          <Plus size={20} />
          <span>إضافة مريض جديد</span>
        </button>
      </div>
    </div>
  );
}
