import { findPatientInText, extractCandidateName } from './dateResolvers';

/**
 * Evaluates patient registration, medical dossiers, allergies, and patient searches
 * @param {string} text 
 * @param {Object} state 
 * @returns {{ handled: boolean, result?: Object }}
 */
export function evaluatePatientDossierActions(text, state = {}) {
  // 1. REGISTER NEW PATIENT
  const isRegisterPatientIntent = (
    text.includes('سجل مريض جديد') ||
    text.includes('ضيف مريض جديد') ||
    text.includes('إضافة مريض جديد') ||
    text.includes('اضافة مريض جديد') ||
    text.includes('تسجيل مريض جديد') ||
    text.includes('افتح ملف لمريض جديد')
  );

  if (isRegisterPatientIntent) {
    const nameMatch = text.match(/(?:اسمه|اسم المريض|المريض)\s+([^\s,.:;]+(?:\s+[^\s,.:;]+){0,2})/);
    let patientName = 'مريض جديد';
    if (nameMatch) {
      patientName = nameMatch[1].replace(/(?:و\s*)?(?:تليفون|تليفونه|هاتف|موبايل|عمر|عمره|سن|سنة|ذكر|أنثى|انثى|عنده|حساسية|رقم).*/, '').trim();
      patientName = patientName.replace(/\s+و\s*$/, '').trim();
    }

    const phoneMatch = text.match(/01[0125][0-9]{8}/);
    const ageMatch = text.match(/(?:عمره|سن|عمر|سنة)\s*(\d+)/);
    const genderMatch = text.match(/(ذكر|أنثى|انثى)/);
    const allergyMatch = text.match(/حساسية\s+(?:من\s+|ضد\s+)?([^\s,.:;]+)/);
    const chronicMatch = text.match(/(سكر|ضغط|قلب|ربو|كلى)/);

    const patientPhone = phoneMatch ? phoneMatch[0] : '';
    const patientAge = ageMatch ? ageMatch[1] : '30';
    const patientGender = genderMatch ? (genderMatch[1].includes('أنثى') || genderMatch[1].includes('انثى') ? 'أنثى' : 'ذكر') : 'ذكر';
    const allergies = allergyMatch ? allergyMatch[1].replace(/(?:وعنده|عنده|مع).*/, '').trim() : 'لا يوجد';
    const chronic = chronicMatch ? chronicMatch[1].trim() : 'سليم طبياً';

    const newPatient = {
      id: 'pat-' + Date.now(),
      name: patientName,
      phone: patientPhone,
      age: patientAge,
      gender: patientGender,
      allergies,
      chronicDiseases: chronic,
      medicalAlerts: allergies !== 'لا يوجد' ? `حساسية من ${allergies}` : '',
      diagnosis: '',
      notes: 'تم التسجيل تلقائياً عبر المساعد الطبي الذكي',
      balance: 0,
      totalVisits: 0,
      createdAt: new Date().toISOString()
    };

    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'ADD_PATIENT',
        payload: newPatient,
        replyText: `تم تسجيل المريض الجديد (${patientName}) في سيستم العيادة بنجاح وفتح الملف الطبي الخاص به.\n` +
          `• الهاتف: ${patientPhone || 'غير محدد'}\n` +
          `• السن والنوع: ${patientAge} سنة | ${patientGender}\n` +
          `• الحساسيات: ${allergies}\n` +
          `• الأمراض المزمنة: ${chronic}`
      }
    };
  }

  // 2. UPDATE PATIENT DOSSIER
  const isUpdatePatientIntent = (
    text.includes('سجل حساسية') ||
    text.includes('ضيف حساسية') ||
    text.includes('عنده حساسية') ||
    text.includes('سجل تشخيص') ||
    text.includes('تشخيص المريض') ||
    text.includes('عدل تليفون') ||
    text.includes('تحديث هاتف')
  );

  if (isUpdatePatientIntent) {
    const matchedPatient = findPatientInText(text, state.patients);
    if (matchedPatient) {
      const updates = { ...matchedPatient };
      let changeDesc = [];

      const allergyMatch = text.match(/حساسية\s+([^\s,.:;]+)/);
      if (allergyMatch) {
        updates.allergies = allergyMatch[1].replace(/(?:للمريض|لمريض|لـ|عنده|من|في).*/, '').trim();
        updates.medicalAlerts = `حساسية من ${updates.allergies}`;
        changeDesc.push(`تسجيل حساسية: ${updates.allergies}`);
      }

      const phoneMatch = text.match(/01[0125][0-9]{8}/);
      if (phoneMatch) {
        updates.phone = phoneMatch[0];
        changeDesc.push(`تعديل الهاتف: ${updates.phone}`);
      }

      const diagMatch = text.match(/(?:تشخيص|تشخيصه|سجل تشخيص)\s+([^\n.]+)/);
      if (diagMatch) {
        updates.diagnosis = diagMatch[1].trim();
        changeDesc.push(`تسجيل تشخيص: ${updates.diagnosis}`);
      }

      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'UPDATE_PATIENT',
          payload: updates,
          replyText: `تم تحديث الملف الطبي للمريض (${matchedPatient.name}) بنجاح.\n• التعديلات: ${changeDesc.join(' | ')}.`
        }
      };
    }
  }

  // 3. PATIENT PROFILE & MEDICAL HISTORY
  const isPatientQueryIntent = (
    text.includes('ملف المريض') ||
    text.includes('بيانات المريض') ||
    text.includes('سجل المريض') ||
    text.includes('ملف مريض') ||
    text.includes('بيانات مريض') ||
    text.includes('تاريخ كشف') ||
    text.includes('حساسية المريض') ||
    text.includes('حساسية مريض') ||
    text.includes('معلومات المريض') ||
    text.includes('عايز ملف') ||
    text.includes('شوفلي مريض') ||
    (text.includes('مين عنده') && (text.includes('سكر') || text.includes('ضغط') || text.includes('حساسية') || text.includes('بنسلين')))
  );

  if (isPatientQueryIntent) {
    const patients = state.patients || [];
    
    // Chronic disease / allergy condition filter
    if (text.includes('مين عنده') || text.includes('المرضى اللي عندهم')) {
      const condition = text.includes('سكر') ? 'سكر' 
        : (text.includes('ضغط') ? 'ضغط' 
        : (text.includes('بنسلين') ? 'بنسلين' 
        : (text.includes('حساسية') ? 'حساسية' : '')));
      
      if (condition) {
        const matched = patients.filter(p => 
          (p.chronicDiseases && p.chronicDiseases.includes(condition)) ||
          (p.allergies && p.allergies.includes(condition)) ||
          (p.medicalHistory && p.medicalHistory.includes(condition)) ||
          (p.notes && p.notes.includes(condition))
        );

        if (matched.length === 0) {
          return {
            handled: true,
            result: {
              isAction: true,
              actionType: 'INFO',
              replyText: `لا يوجد مرضى مسجل لديهم حالة (${condition}) في السجلات الطبية الحالية.`
            }
          };
        }

        const list = matched.map(p => `• ${p.name} (هاتف: ${p.phone || 'غير مسجل'}${p.allergies ? ` - حساسية: ${p.allergies}` : ''})`).join('\n');
        return {
          handled: true,
          result: {
            isAction: true,
            actionType: 'INFO',
            replyText: `وجدت ${matched.length} مريض لديهم حالة (${condition}):\n\n${list}\n\nيمكنك طلب استعراض الملف الكامل لأي مريض منهم بالاسم مباشرة.`
          }
        };
      }
    }

    const matchedPatient = findPatientInText(text, state.patients || []);
    if (matchedPatient) {
      const patientAppts = (state.appointments || []).filter(a => a.patientId === matchedPatient.id || a.patientPhone === matchedPatient.phone);
      const lastAppt = patientAppts.length > 0 ? patientAppts[patientAppts.length - 1] : null;
      const balanceNum = Number(matchedPatient.balance) || 0;
      const balanceText = balanceNum > 0 ? `مديونية بقيمة ${balanceNum} ج.م` : (balanceNum < 0 ? `رصيد دائن ${Math.abs(balanceNum)} ج.م` : 'خالص ومسدد بالكامل');

      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'SHOW_PATIENT',
          payload: matchedPatient,
          replyText: `الملف الطبي للمريض: ${matchedPatient.name}\n\n` +
            `• الهاتف: ${matchedPatient.phone || 'غير مسجل'}\n` +
            `• العمر / فصيلة الدم: ${matchedPatient.age || 'غير محدد'} سنة | ${matchedPatient.bloodType || 'غير مسجل'}\n` +
            `• الحساسيات المعروفة: ${matchedPatient.allergies || 'لا توجد حساسية مسجلة'}\n` +
            `• الأمراض المزمنة: ${matchedPatient.chronicDiseases || 'سليم طبياً'}\n` +
            `• عدد الزيارات: ${patientAppts.length || matchedPatient.totalVisits || 1} زيارات\n` +
            `• آخر كشف: ${lastAppt ? `${lastAppt.date} (${lastAppt.type})` : (matchedPatient.lastVisit || 'لا توجد زيارة سابقة')}\n` +
            `• الموقف المالي: ${balanceText}\n\n` +
            `يمكنك النقر بالأسفل لفتح الملف الطبي الشامل أو التواصل معه عبر واتساب مباشرة.`
        }
      };
    } else {
      const candidate = extractCandidateName(text);
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'INFO',
          replyText: `لم أتمكن من العثور على مريض باسم ${candidate || text} في سجلات العيادة.\nيمكنك البحث برقم الهاتف أو التأكد من كتابة الاسم ثلاثياً.`
        }
      };
    }
  }

  return { handled: false };
}
