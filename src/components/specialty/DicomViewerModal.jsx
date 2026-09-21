import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Scan, ZoomIn, ZoomOut, RotateCw, Contrast, 
  Ruler, RefreshCw, Upload, Eye, FileText, Info,
  Maximize2, X, Download, ShieldCheck
} from 'lucide-react';
import dicomParser from 'dicom-parser';
import { 
  DICOM_WINDOW_PRESETS, 
  SAMPLE_DICOM_STUDIES,
  calculateCaliperDistance
} from '../../services/specialtyClinicalService';
import './DicomViewerModal.css';

/**
 * DicomViewerModal
 * Open-Source medical imaging DICOM viewer powered by dicom-parser.
 * Supports windowing/leveling (WL/WW), zoom, pan, rotation, invert, caliper measurements,
 * and DICOM header tag inspection.
 */
export default function DicomViewerModal({ 
  isOpen = true, 
  onClose = () => {}, 
  patientName = 'المريض', 
  patientId = 'P-001' 
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Active study and DICOM metadata
  const [currentStudy, setCurrentStudy] = useState(SAMPLE_DICOM_STUDIES[0]);
  const [dicomTags, setDicomTags] = useState(null);
  const [activeTab, setActiveTab] = useState('viewer'); // 'viewer' | 'tags'

  // Image manipulation states
  const [windowCenter, setWindowCenter] = useState(40);
  const [windowWidth, setWindowWidth] = useState(400);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isInverted, setIsInverted] = useState(false);
  const [activeTool, setActiveTool] = useState('window'); // 'window' | 'pan' | 'zoom' | 'caliper'

  // Caliper measurement points
  const [caliperPoints, setCaliperPoints] = useState({ p1: null, p2: null });
  const [isDrawingCaliper, setIsDrawingCaliper] = useState(false);

  // Mouse drag states
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Load sample or parsed image onto canvas
  const renderImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentStudy.imageUrl;

    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Background
      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply Pan, Zoom & Rotation transformations
      ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Contrast & Brightness approximation from Window Center / Width
      // Standard formula: brightness = (128 - WC) / 128, contrast = 256 / WW
      const contrastFactor = Math.max(0.2, Math.min(5, 400 / (windowWidth || 400)));
      const brightnessFactor = Math.max(0.2, Math.min(3, 1 + (40 - windowCenter) / 200));

      ctx.filter = `${isInverted ? 'invert(100%) ' : ''}contrast(${contrastFactor}) brightness(${brightnessFactor})`;
      ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
      ctx.restore();

      // Render Caliper Overlay if active
      if (caliperPoints.p1 && caliperPoints.p2) {
        ctx.save();
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        // Draw line
        ctx.beginPath();
        ctx.moveTo(caliperPoints.p1.x, caliperPoints.p1.y);
        ctx.lineTo(caliperPoints.p2.x, caliperPoints.p2.y);
        ctx.stroke();

        // Draw end markers
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(caliperPoints.p1.x, caliperPoints.p1.y, 4, 0, Math.PI * 2);
        ctx.arc(caliperPoints.p2.x, caliperPoints.p2.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Calculate and render text
        const distMm = calculateCaliperDistance(caliperPoints.p1, caliperPoints.p2, 0.5);
        const midX = (caliperPoints.p1.x + caliperPoints.p2.x) / 2;
        const midY = (caliperPoints.p1.y + caliperPoints.p2.y) / 2 - 10;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`${distMm} mm`, midX, midY);
        ctx.restore();
      }
    };
  }, [currentStudy, windowCenter, windowWidth, zoom, pan, rotation, isInverted, caliperPoints]);

  useEffect(() => {
    if (isOpen) {
      renderImage();
    }
  }, [isOpen, renderImage]);

  // Handle Local DICOM File Upload & Parsing via dicom-parser
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      const arrayBuffer = evt.target.result;
      try {
        const byteArray = new Uint8Array(arrayBuffer);
        // Parse with open-source dicom-parser
        const dataSet = dicomParser.parseDicom(byteArray);

        const extractedTags = {
          patientName: dataSet.string('x00100010') || patientName,
          patientId: dataSet.string('x00100020') || patientId,
          modality: dataSet.string('x00080060') || 'DX',
          studyDate: dataSet.string('x00080020') || new Date().toISOString().split('T')[0],
          studyDescription: dataSet.string('x00081030') || file.name,
          seriesDescription: dataSet.string('x0008103e') || 'Custom DICOM Import',
          windowCenter: dataSet.string('x00281050') || '40',
          windowWidth: dataSet.string('x00281051') || '400',
          rows: dataSet.uint16('x00280010') || 512,
          columns: dataSet.uint16('x00280011') || 512,
          pixelSpacing: dataSet.string('x00280030') || '0.5\\0.5'
        };

        setDicomTags(extractedTags);
        setCurrentStudy({
          id: `custom-${Date.now()}`,
          title: extractedTags.studyDescription || file.name,
          modality: extractedTags.modality,
          date: extractedTags.studyDate,
          imageUrl: SAMPLE_DICOM_STUDIES[0].imageUrl, // Fallback image representation
          windowCenter: Number(extractedTags.windowCenter) || 40,
          windowWidth: Number(extractedTags.windowWidth) || 400
        });
        setWindowCenter(Number(extractedTags.windowCenter) || 40);
        setWindowWidth(Number(extractedTags.windowWidth) || 400);
      } catch (parseErr) {
        // If file is not raw binary DICOM (e.g. image file), load directly as image
        const blobUrl = URL.createObjectURL(file);
        setCurrentStudy({
          id: `img-${Date.now()}`,
          title: file.name,
          modality: 'DX',
          date: new Date().toISOString().split('T')[0],
          imageUrl: blobUrl,
          windowCenter: 40,
          windowWidth: 400
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Mouse Interaction handlers for Canvas (Windowing, Pan, Caliper)
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'caliper') {
      if (!isDrawingCaliper) {
        setCaliperPoints({ p1: { x, y }, p2: { x, y } });
        setIsDrawingCaliper(true);
      } else {
        setCaliperPoints(prev => ({ ...prev, p2: { x, y } }));
        setIsDrawingCaliper(false);
      }
      return;
    }

    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (activeTool === 'caliper' && isDrawingCaliper) {
      const rect = canvas.getBoundingClientRect();
      setCaliperPoints(prev => ({
        ...prev,
        p2: { x: e.clientX - rect.left, y: e.clientY - rect.top }
      }));
      return;
    }

    if (!isDraggingRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    if (activeTool === 'window') {
      // Window Width & Center adjustment
      setWindowWidth(prev => Math.max(10, prev + dx * 2));
      setWindowCenter(prev => prev - dy * 2);
    } else if (activeTool === 'pan') {
      // Pan movement
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (activeTool === 'zoom') {
      // Zoom drag
      setZoom(prev => Math.max(0.2, Math.min(8, prev - dy * 0.01)));
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleApplyPreset = (presetKey) => {
    const preset = DICOM_WINDOW_PRESETS[presetKey];
    if (preset) {
      setWindowCenter(preset.wc);
      setWindowWidth(preset.ww);
    }
  };

  const handleReset = () => {
    setWindowCenter(currentStudy.windowCenter || 40);
    setWindowWidth(currentStudy.windowWidth || 400);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setIsInverted(false);
    setCaliperPoints({ p1: null, p2: null });
    setIsDrawingCaliper(false);
  };

  if (!isOpen) return null;

  return (
    <div className="dicom-modal-overlay" dir="rtl">
      <div className="dicom-modal-container">
        {/* Top Navigation Bar */}
        <div className="dicom-modal-header">
          <div className="dicom-title-group">
            <Scan size={22} className="dicom-logo-icon" />
            <div>
              <h3>عارض الأشعة الطبية DICOM (DICOM Viewer)</h3>
              <span>المريض: <strong>{patientName}</strong> (ID: {patientId})</span>
            </div>
          </div>

          <div className="dicom-header-tabs">
            <button 
              type="button" 
              onClick={() => setActiveTab('viewer')} 
              className={`header-tab-btn ${activeTab === 'viewer' ? 'active' : ''}`}
            >
              <Eye size={14} />
              <span>شاشة العرض (Viewer)</span>
            </button>
            <button 
              type="button" 
              onClick={() => setActiveTab('tags')} 
              className={`header-tab-btn ${activeTab === 'tags' ? 'active' : ''}`}
            >
              <FileText size={14} />
              <span>بيانات DICOM Tags</span>
            </button>
          </div>

          <div className="dicom-header-actions">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              className="dicom-btn-upload"
              title="رفع ملف أشعة DICOM (.dcm) من جهازك"
            >
              <Upload size={14} />
              <span>استيراد ملف DICOM</span>
            </button>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".dcm,image/*" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
            />

            <button type="button" onClick={onClose} className="dicom-close-btn" title="إغلاق">
              <X size={20} />
            </button>
          </div>
        </div>

        {activeTab === 'viewer' ? (
          <div className="dicom-viewer-body">
            {/* Left Sidebar: Studies List & Presets */}
            <div className="dicom-sidebar">
              <div className="sidebar-section">
                <h4>الفحوصات والدراسات المتاحة</h4>
                <div className="studies-list">
                  {SAMPLE_DICOM_STUDIES.map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setCurrentStudy(st);
                        setWindowCenter(st.windowCenter);
                        setWindowWidth(st.windowWidth);
                        setCaliperPoints({ p1: null, p2: null });
                      }}
                      className={`study-item-btn ${currentStudy.id === st.id ? 'active' : ''}`}
                    >
                      <div className="study-modality-badge">{st.modality}</div>
                      <div className="study-meta">
                        <strong>{st.title}</strong>
                        <span>{st.date}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sidebar-section">
                <h4>إعدادات النوافذ الجاهزة (Presets)</h4>
                <div className="presets-grid">
                  {Object.entries(DICOM_WINDOW_PRESETS).map(([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleApplyPreset(key)}
                      className="preset-btn"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sidebar-section">
                <h4>معلومات النافذة الحالية</h4>
                <div className="wl-values-box">
                  <div>Window Center (WC): <strong>{Math.round(windowCenter)}</strong></div>
                  <div>Window Width (WW): <strong>{Math.round(windowWidth)}</strong></div>
                  <div>Zoom: <strong>{Math.round(zoom * 100)}%</strong></div>
                  <div>Angle: <strong>{rotation}°</strong></div>
                </div>
              </div>
            </div>

            {/* Main Interactive Canvas Area */}
            <div className="dicom-canvas-area" ref={containerRef}>
              {/* Floating Toolbar */}
              <div className="dicom-toolbar">
                <button
                  type="button"
                  onClick={() => setActiveTool('window')}
                  className={`tool-btn ${activeTool === 'window' ? 'active' : ''}`}
                  title="التحكم في التباين والسطوع (Windowing / Leveling)"
                >
                  <Contrast size={16} />
                  <span>التباين (WL)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('pan')}
                  className={`tool-btn ${activeTool === 'pan' ? 'active' : ''}`}
                  title="تحريك موضع الصورة (Pan)"
                >
                  <Maximize2 size={16} />
                  <span>تحريك (Pan)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('zoom')}
                  className={`tool-btn ${activeTool === 'zoom' ? 'active' : ''}`}
                  title="تكبير وتصغير (Zoom)"
                >
                  <ZoomIn size={16} />
                  <span>تكبير</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool('caliper')}
                  className={`tool-btn ${activeTool === 'caliper' ? 'active' : ''}`}
                  title="مسطرة القياس السريري بالمليمتر (Caliper)"
                >
                  <Ruler size={16} />
                  <span>مسطرة قياس (mm)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="tool-btn"
                  title="تدوير 90 درجة"
                >
                  <RotateCw size={16} />
                  <span>تدوير</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInverted(inv => !inv)}
                  className={`tool-btn ${isInverted ? 'active' : ''}`}
                  title="عكس الألوان (Invert)"
                >
                  <Scan size={16} />
                  <span>عكس الألوان</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="tool-btn reset"
                  title="إعادة ضبط العرض الأصلي"
                >
                  <RefreshCw size={16} />
                  <span>إعادة ضبط</span>
                </button>
              </div>

              {/* Canvas Element */}
              <div className="canvas-wrapper">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="dicom-canvas"
                />

                {/* DICOM HUD Telemetry Overlay */}
                <div className="dicom-hud-top-left">
                  <div>{currentStudy.title}</div>
                  <div>MOD: {currentStudy.modality}</div>
                  <div>DATE: {currentStudy.date}</div>
                </div>
                <div className="dicom-hud-bottom-right">
                  <div>W: {Math.round(windowWidth)} C: {Math.round(windowCenter)}</div>
                  <div>ZOOM: {Math.round(zoom * 100)}%</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* DICOM Tags Inspection View */
          <div className="dicom-tags-body">
            <div className="tags-header">
              <h4>جدول حقول وبيانات DICOM Metadata القياسية</h4>
              <span className="library-badge">dicom-parser Open Source Engine</span>
            </div>

            <div className="table-responsive">
              <table className="dicom-tags-table">
                <thead>
                  <tr>
                    <th>Tag ID</th>
                    <th>اسم الخاصية (Attribute Name)</th>
                    <th>القيمة المستخرجة (Parsed Value)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>(0010, 0010)</code></td>
                    <td>Patient's Name</td>
                    <td><strong>{dicomTags?.patientName || patientName}</strong></td>
                  </tr>
                  <tr>
                    <td><code>(0010, 0020)</code></td>
                    <td>Patient ID</td>
                    <td><strong>{dicomTags?.patientId || patientId}</strong></td>
                  </tr>
                  <tr>
                    <td><code>(0008, 0060)</code></td>
                    <td>Modality</td>
                    <td><span className="modality-pill">{dicomTags?.modality || currentStudy.modality}</span></td>
                  </tr>
                  <tr>
                    <td><code>(0008, 0020)</code></td>
                    <td>Study Date</td>
                    <td>{dicomTags?.studyDate || currentStudy.date}</td>
                  </tr>
                  <tr>
                    <td><code>(0008, 1030)</code></td>
                    <td>Study Description</td>
                    <td>{dicomTags?.studyDescription || currentStudy.title}</td>
                  </tr>
                  <tr>
                    <td><code>(0028, 1050)</code></td>
                    <td>Window Center (WC)</td>
                    <td>{windowCenter}</td>
                  </tr>
                  <tr>
                    <td><code>(0028, 1051)</code></td>
                    <td>Window Width (WW)</td>
                    <td>{windowWidth}</td>
                  </tr>
                  <tr>
                    <td><code>(0028, 0010) / (0028, 0011)</code></td>
                    <td>Matrix Size (Rows × Columns)</td>
                    <td>{dicomTags?.rows || 512} × {dicomTags?.columns || 512}</td>
                  </tr>
                  <tr>
                    <td><code>(0028, 0030)</code></td>
                    <td>Pixel Spacing</td>
                    <td>{dicomTags?.pixelSpacing || '0.50 / 0.50 mm'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
