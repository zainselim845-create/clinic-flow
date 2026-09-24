import { cleanEgyptianPhone } from '../utils/phoneValidation';

/**
 * Column matching dictionary for Arabic and English headers from old clinic software and Excel sheets
 */
const COLUMN_ALIASES = {
  name: ['الاسم', 'اسم', 'اسم المريض', 'الاسم بالكامل', 'اسم الحاله', 'المريض', 'name', 'patient_name', 'patient', 'full_name', 'fullname'],
  phone: ['الهاتف', 'رقم الهاتف', 'الموبايل', 'رقم الموبايل', 'المحمول', 'رقم المحمول', 'محمول', 'التليفون', 'رقم التليفون', 'الجوال', 'رقم الجوال', 'phone', 'mobile', 'tel', 'telephone', 'cell', 'phone_number'],
  age: ['السن', 'العمر', 'سن', 'تاريخ الميلاد', 'age', 'years', 'dob', 'birth_date'],
  gender: ['النوع', 'الجنس', 'gender', 'sex'],
  bloodType: ['فصيلة الدم', 'فصيلة', 'فصيله الدم', 'فصيله', 'blood', 'blood_type', 'bloodType'],
  diagnosis: ['التشخيص', 'التاريخ المرضي', 'المرض', 'الأمراض المزمنة', 'الشكوى', 'diagnosis', 'medical_history', 'history', 'condition', 'chronic'],
  notes: ['ملاحظات', 'ملاحظة', 'الملاحظات', 'العنوان', 'السكن', 'notes', 'note', 'address', 'comments']
};

/**
 * Normalizes header string for fuzzy matching
 */
const normalizeHeader = (header) => {
  if (!header || typeof header !== 'string') return '';
  return header.trim().toLowerCase().replace(/[\s_\-\.]+/g, '');
};

/**
 * Finds which field a header corresponds to
 */
const matchHeaderToField = (header) => {
  const norm = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some(alias => {
      const normAlias = normalizeHeader(alias);
      return norm === normAlias || norm.includes(normAlias) || normAlias.includes(norm);
    })) {
      return field;
    }
  }
  return null;
};

/**
 * Parses an Excel or CSV file buffer into structured patient records
 * @param {ArrayBuffer} fileBuffer
 * @param {string} clinicId
 * @param {Array} existingPatients
 */
export const parsePatientsExcelFile = async (fileBuffer, clinicId, existingPatients = []) => {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('ملف الإكسيل فارغ ولا يحتوي على أي صفحات بيانات.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('لم يتم العثور على أي صفوف أو بيانات مرضى داخل شيت الإكسيل.');
  }

  // Determine header mapping from the first row keys
  const firstRow = rawRows[0];
  const fieldMapping = {};
  Object.keys(firstRow).forEach(colName => {
    const matchedField = matchHeaderToField(colName);
    if (matchedField && !fieldMapping[matchedField]) {
      fieldMapping[matchedField] = colName;
    }
  });

  if (!fieldMapping.name && !fieldMapping.phone) {
    throw new Error('لم نتمكن من التعرف على أعمدة (الاسم) أو (رقم الهاتف) في شيت الإكسيل. يرجى التأكد من تسمية الأعمدة بوضوح أو استخدام النموذج الاسترشادي.');
  }

  const existingPhoneMap = new Set(
    (existingPatients || [])
      .map(p => (p.phone || '').replace(/\D/g, ''))
      .filter(p => p.length >= 7)
  );

  const parsedPatients = [];
  const duplicates = [];

  rawRows.forEach((row, index) => {
    const rawName = fieldMapping.name ? String(row[fieldMapping.name] || '').trim() : '';
    const rawPhone = fieldMapping.phone ? String(row[fieldMapping.phone] || '').trim() : '';

    // Skip completely blank rows
    if (!rawName && !rawPhone) return;

    const patientName = rawName || `مريض سابق #${index + 1}`;
    let cleanedPhone = cleanEgyptianPhone(rawPhone);
    if (!cleanedPhone && rawPhone) {
      cleanedPhone = rawPhone.replace(/[^\d+]/g, '');
    }

    const rawAge = fieldMapping.age ? String(row[fieldMapping.age] || '').trim() : '';
    const parsedAge = rawAge ? parseInt(rawAge.replace(/\D/g, '')) || '' : '';

    const rawGender = fieldMapping.gender ? String(row[fieldMapping.gender] || '').trim() : '';
    const gender = (rawGender.includes('أنثى') || rawGender.includes('انثى') || rawGender.toLowerCase().startsWith('f')) ? 'أنثى' : 'ذكر';

    const bloodType = fieldMapping.bloodType ? String(row[fieldMapping.bloodType] || '').trim() : '';
    const diagnosis = fieldMapping.diagnosis ? String(row[fieldMapping.diagnosis] || '').trim() : '';
    const notes = fieldMapping.notes ? String(row[fieldMapping.notes] || '').trim() : '';

    const patientRecord = {
      id: `pat-import-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
      clinicId: clinicId || null,
      clinic_id: clinicId || null,
      name: patientName,
      phone: cleanedPhone || '',
      age: parsedAge,
      gender,
      bloodType,
      diagnosis: diagnosis || 'سجل مستورد من النظام القديم',
      notes: notes || (diagnosis ? `التشخيص السابق: ${diagnosis}` : 'مستورد من شيت إكسيل النظام القديم'),
      visitsCount: 1,
      lastVisit: new Date().toISOString().split('T')[0],
      source: 'excel_import',
      importedAt: new Date().toISOString()
    };

    const cleanNum = (cleanedPhone || '').replace(/\D/g, '');
    if (cleanNum && existingPhoneMap.has(cleanNum)) {
      duplicates.push({ patient: patientRecord, rowNumber: index + 2, reason: 'رقم الهاتف مسجل بالفعل بالعيادة' });
    } else {
      parsedPatients.push(patientRecord);
      if (cleanNum) existingPhoneMap.add(cleanNum);
    }
  });

  return {
    totalRead: rawRows.length,
    validCount: parsedPatients.length,
    duplicateCount: duplicates.length,
    patients: parsedPatients,
    duplicates,
    fieldMapping
  };
};

/**
 * Creates and triggers a download of a ready-to-use sample Excel template
 */
export const downloadPatientImportTemplate = async () => {
  const XLSX = await import('xlsx');
  const sampleData = [
    {
      'اسم المريض': 'محمد محمود إبراهيم',
      'رقم الهاتف': '01012345678',
      'السن': 32,
      'النوع': 'ذكر',
      'فصيلة الدم': 'O+',
      'التشخيص / التاريخ المرضي': 'ضغط دم مرتفع، حساسية بنسلين',
      'العنوان والملاحظات': 'القاهرة — المعادي، متابعة دورية'
    },
    {
      'اسم المريض': 'سارة أحمد الشناوي',
      'رقم الهاتف': '01298765432',
      'السن': 27,
      'النوع': 'أنثى',
      'فصيلة الدم': 'A+',
      'التشخيص / التاريخ المرضي': 'كشف دوري ومتابعة',
      'العنوان والملاحظات': 'الجيزة — الدقي'
    },
    {
      'اسم المريض': 'طارق علي حسن',
      'رقم الهاتف': '01155443322',
      'السن': 45,
      'النوع': 'ذكر',
      'فصيلة الدم': 'B+',
      'التشخيص / التاريخ المرضي': 'فحص دوري وسكر خفيف',
      'العنوان والملاحظات': 'مصر الجديدة'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 26 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 32 },
    { wch: 34 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج بيانات المرضى');

  XLSX.writeFile(workbook, 'نموذج_استيراد_مرضى_العيادة_ClinicFlow.xlsx');
};
