import React, { useState } from 'react';
import { 
  Baby, Eye, Heart, Scan, Layers, 
  ExternalLink, Sparkles
} from 'lucide-react';
import PediatricGrowthChart from './PediatricGrowthChart';
import OphthalmologyRefractionChart from './OphthalmologyRefractionChart';
import ObGynPregnancyTracker from './ObGynPregnancyTracker';
import DicomViewerModal from './DicomViewerModal';
import './SpecialtyClinicalHub.css';

/**
 * SpecialtyClinicalHub
 * Central container for specialized clinical charts and medical imaging.
 * Supports Pediatrics, Ophthalmology, OB/GYN, and Radiology DICOM.
 */
export default function SpecialtyClinicalHub({
  patientId,
  clinicId,
  patientName = 'المريض',
  patientAge = 25,
  clinicSpecialty = 'general',
  doctorName = 'الطبيب المعالج',
  initialTab,
  autoOpenDicom = false
}) {
  // Determine default tab based on clinic specialty or initialTab
  const getDefaultTab = () => {
    if (initialTab && ['pediatrics', 'ophthalmology', 'obgyn'].includes(initialTab)) {
      return initialTab;
    }
    const s = (clinicSpecialty || '').toLowerCase();
    if (s.includes('pediatric') || s.includes('طفل') || s.includes('أطفال')) return 'pediatrics';
    if (s.includes('ophthalm') || s.includes('عين') || s.includes('عيون') || s.includes('optom')) return 'ophthalmology';
    if (s.includes('obgyn') || s.includes('نساء') || s.includes('توليد') || s.includes('حمل')) return 'obgyn';
    return 'pediatrics';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [isDicomOpen, setIsDicomOpen] = useState(autoOpenDicom);

  React.useEffect(() => {
    if (initialTab && ['pediatrics', 'ophthalmology', 'obgyn'].includes(initialTab)) {
      setActiveTab(initialTab);
    }
    if (autoOpenDicom) {
      setIsDicomOpen(true);
    }
  }, [initialTab, autoOpenDicom]);

  return (
    <div className="specialty-hub-wrapper" dir="rtl">
      {/* Top Specialty Navigation Switcher */}
      <div className="specialty-nav-header">
        <div className="specialty-tabs-bar">
          <button
            type="button"
            onClick={() => setActiveTab('pediatrics')}
            className={`specialty-tab-btn ${activeTab === 'pediatrics' ? 'active' : ''}`}
          >
            <Baby size={16} />
            <span>جداول نمو الأطفال (Pediatrics)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ophthalmology')}
            className={`specialty-tab-btn ${activeTab === 'ophthalmology' ? 'active' : ''}`}
          >
            <Eye size={16} />
            <span>انكسار النظر والعيون (Ophthalmology)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('obgyn')}
            className={`specialty-tab-btn ${activeTab === 'obgyn' ? 'active' : ''}`}
          >
            <Heart size={16} />
            <span>الحمل والأجنة (OB/GYN)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsDicomOpen(true)}
          className="btn-open-dicom-viewer"
          title="فتح عارض الأشعة الطبية DICOM"
        >
          <Scan size={16} />
          <span>عارض الأشعة الطبية DICOM</span>
          <ExternalLink size={12} />
        </button>
      </div>

      {/* Active Specialty Module */}
      <div className="specialty-content-area">
        {activeTab === 'pediatrics' && (
          <PediatricGrowthChart
            patientId={patientId}
            clinicId={clinicId}
            patientName={patientName}
            patientAge={patientAge}
          />
        )}

        {activeTab === 'ophthalmology' && (
          <OphthalmologyRefractionChart
            patientId={patientId}
            clinicId={clinicId}
            patientName={patientName}
            doctorName={doctorName}
          />
        )}

        {activeTab === 'obgyn' && (
          <ObGynPregnancyTracker
            patientId={patientId}
            clinicId={clinicId}
            patientName={patientName}
          />
        )}
      </div>

      {/* Standalone DICOM Medical Imaging Viewer Modal */}
      {isDicomOpen && (
        <DicomViewerModal
          isOpen={isDicomOpen}
          onClose={() => setIsDicomOpen(false)}
          patientName={patientName}
          patientId={patientId}
        />
      )}
    </div>
  );
}
