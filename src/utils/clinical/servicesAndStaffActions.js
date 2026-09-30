import { findPatientInText } from './dateResolvers';
import { getTodayDateStr } from '../timeSlots';

/**
 * Evaluates clinic fees, service catalog, branch switching, secondary modules (Labs/Inventory), WhatsApp bot, navigation, and clinic summary
 * @param {string} text 
 * @param {Object} state 
 * @returns {{ handled: boolean, result?: Object }}
 */
export function evaluateServicesAndStaffActions(text, state = {}) {
  // 1. UPDATE CLINIC FEE & ADD SERVICE
  const isFeeUpdateIntent = (
    text.includes('خلي سعر الكشف') ||
    text.includes('عدل سعر الكشف') ||
    text.includes('سعر الاستشارة') ||
    text.includes('سعر الكشف بقى') ||
    text.includes('غير سعر الكشف')
  );

  if (isFeeUpdateIntent) {
    const amountMatch = text.match(/(\d+)\s*(?:جنيه|ج\.م|ج|egp)?/);
    const newFee = amountMatch ? parseInt(amountMatch[1], 10) : 350;
    const isConsultation = text.includes('استشارة') || text.includes('استشاره');
    const serviceType = isConsultation ? 'استشارة' : 'كشف عادي';

    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'UPDATE_CLINIC_FEE',
        payload: {
          fee: newFee,
          feeFormatted: `${newFee} ج.م`,
          price: newFee,
          type: serviceType
        },
        replyText: `تم تحديث سعر (${serviceType}) في إعدادات العيادة إلى ${newFee} ج.م بنجاح، وسيتم اعتماده تلقائياً في الكشوفات القادمة.`
      }
    };
  }

  if (text.includes('ضيف خدمة') || text.includes('إضافة خدمة') || text.includes('اضافة خدمة')) {
    const nameMatch = text.match(/(?:خدمة جديدة|خدمة)\s+([^\d]+?)(?:\s+بـ|\s+بسعر|\s+وسعرها|\s+سعرها|\s+\d|$)/);
    const priceMatch = text.match(/(\d+)\s*(?:جنيه|ج\.م|ج|egp)?/);
    const serviceName = nameMatch ? nameMatch[1].trim() : 'خدمة طبية';
    const servicePrice = priceMatch ? parseInt(priceMatch[1], 10) : 200;

    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'ADD_SERVICE',
        payload: {
          id: 'srv-' + Date.now(),
          name: serviceName,
          price: servicePrice,
          priceNumber: servicePrice,
          priceFormatted: `${servicePrice} ج.م`
        },
        replyText: `تمت إضافة خدمة (${serviceName}) بسعر ${servicePrice} ج.م إلى قائمة خدمات العيادة بنجاح.`
      }
    };
  }

  // 2. MULTI-CLINIC & BRANCH MANAGEMENT
  const isBranchQuery = (
    text.includes('ايه الفروع اللي عندي') ||
    text.includes('الفروع اللي عندي') ||
    text.includes('قائمة الفروع') ||
    text.includes('قائمة العيادات') ||
    text.includes('عياداتي') ||
    text.includes('فروعي')
  );

  if (isBranchQuery) {
    const tier = state.subscriptionTier || state.clinicInfo?.subscriptionTier;
    if (tier === 'starter' || state.hasMultiBranch === false) {
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'INFO',
          replyText: `أنت تعمل حالياً على: (${state.clinicInfo?.name || 'العيادة الحالية'}) باقة Starter (الأساسية).\nخاصية ربط وإدارة عدة فروع وعيادات معاً متاحة ابتداءً من باقة Pro (العيادة الذكية) فما فوق. يمكنك ترقية الاشتراك لإضافة فروع جديدة والتنقل بينها بسهولة.`
        }
      };
    }

    const clinics = state.allClinics || [];
    const currentName = state.clinicInfo?.name || 'العيادة الحالية';
    if (clinics.length <= 1) {
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'INFO',
          replyText: `أنت تعمل حالياً على: (${currentName}).\nالمنظومة تدعم ربط عدة فروع وعيادات معاً تحت حسابك مع عزل تام للمرضى والخزينة والمواعيد لكل فرع. يمكنك إضافة فرع جديد من تبويب إعدادات الفروع والعيادات.`
        }
      };
    }

    const branchList = clinics.map(c => `• ${c.name} [/${c.slug}] ${c.slug === state.clinicInfo?.slug ? '(الفرع النشط حالياً)' : ''}`).join('\n');
    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'INFO',
        replyText: `قائمة الفروع والعيادات المرتبطة بحسابك:\n\n${branchList}\n\nللتبديل بين الفروع يمكنك اختيار الفرع من القائمة بالأعلى أو أن تقول لي: (حولني لفرع ...) وسأنقلك فوراً.`
      }
    };
  }

  const isSwitchBranchIntent = (
    text.includes('حول') ||
    text.includes('بدل') ||
    text.includes('انقل') ||
    text.includes('افتح')
  ) && (
    text.includes('فرع') ||
    text.includes('عيادة')
  );

  if (isSwitchBranchIntent) {
    const tier = state.subscriptionTier || state.clinicInfo?.subscriptionTier;
    if (tier === 'starter' || state.hasMultiBranch === false) {
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'INFO',
          replyText: 'خاصية التبديل بين الفروع والعيادات متاحة ابتداءً من باقة Pro (العيادة الذكية) فما فوق. باقة عيادتكم الحالية (Starter) تدعم فرعاً واحداً فقط. يرجى ترقية الاشتراك لتفعيل الربط المتعدد.'
        }
      };
    }

    const clinics = state.allClinics || [];
    let matched = clinics.find(c => c.name && text.includes(c.name));
    if (!matched) {
      matched = clinics.find(c => c.slug && text.includes(c.slug));
    }
    if (!matched) {
      const stopWords = ['فرع', 'عيادة', 'عياده', 'مركز'];
      matched = clinics.find(c => 
        c.name && c.name.split(/\s+/).filter(w => !stopWords.includes(w)).some(w => w.length >= 3 && text.includes(w))
      );
    }

    if (matched) {
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'SWITCH_CLINIC',
          payload: {
            slug: matched.slug,
            name: matched.name
          },
          replyText: `تم تحويل المنظومة فوراً إلى: (${matched.name}). يتم الآن تحميل مواعيد وخزينة وسجلات هذا الفرع.`
        }
      };
    }
  }

  // 3. INVENTORY & PHARMACY STOCK ALERTS (وحدة اختيارية)
  const isInventoryQuery = (
    text.includes('نواقص المخزن') ||
    text.includes('الادوية الناقصة') ||
    text.includes('الأدوية الناقصة') ||
    text.includes('فحص المخزن') ||
    text.includes('مستلزمات ناقصة') ||
    text.includes('عجز مخزن') ||
    text.includes('مخزون الأدوية') ||
    text.includes('المخزون والمستلزمات') ||
    text.includes('المستلزمات والمخزون') ||
    text.includes('المخزون') ||
    text.includes('المستلزمات') ||
    text.includes('هل عندنا') ||
    text.includes('ناقص في المخزن')
  );

  if (isInventoryQuery) {
    const inventory = state.inventory || [];
    if (inventory.length === 0) {
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'INFO',
          replyText: '(وحدة اختيارية بالعيادة)\nلا توجد أصناف مسجلة في مخزن العيادة حالياً. يمكنك التوجه إلى شاشة المخزن والمستلزمات وإضافة الأصناف إذا رغبت في تفعيل إدارة المخزون.'
        }
      };
    }

    const specificItemMatch = inventory.find(i => text.includes(i.name));
    if (specificItemMatch) {
      const isLow = specificItemMatch.quantity <= (specificItemMatch.minQuantity || 5);
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'INFO',
          replyText: `(وحدة اختيارية بالعيادة)\nبيانات الصنف بالمخزن (${specificItemMatch.name}):\n\n` +
            `• الكمية المتوفرة: ${specificItemMatch.quantity} ${specificItemMatch.unit || ''}\n` +
            `• الحد الأدنى للأمان: ${specificItemMatch.minQuantity || 5}\n` +
            `• تاريخ الصلاحية: ${specificItemMatch.expiryDate || 'ساري'}\n` +
            `• الحالة: ${isLow ? 'نقص في المخزون (تحت الحد الأدنى)' : 'متوفر ومستقر'}`
        }
      };
    }

    const lowItems = inventory.filter(i => (i.quantity || 0) <= (i.minQuantity || 5));
    if (lowItems.length === 0) {
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'INFO',
          replyText: `(وحدة اختيارية بالعيادة)\nالمخزون الطبي في حالة ممتازة:\nكافة الأدوية والمستلزمات الطبية (${inventory.length} صنف) متوفرة بنسب أعلى من الحد الأدنى للأمان ولا يوجد أي عجز.`
        }
      };
    }

    const list = lowItems.map(i => `• ${i.name}: متوفر ${i.quantity} ${i.unit || ''} (الحد الأدنى: ${i.minQuantity})`).join('\n');
    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'INFO',
        replyText: `(وحدة اختيارية بالعيادة)\nتنبيه نواقص المخزن الطبي (${lowItems.length} صنف قارب على النفاد):\n\n${list}\n\nيُنصح بإصدار أمر شراء عاجل لتفادي انقطاع المستلزمات الطبية.`
      }
    };
  }

  // 4. LABS, RADIOLOGY & DENTAL LAB ORDERS (وحدة اختيارية)
  const isLabsQuery = (
    text.includes('تحاليل معلقة') ||
    text.includes('التحاليل المعلقة') ||
    text.includes('طلبات المعمل') ||
    text.includes('نتائج التحاليل') ||
    text.includes('فحوصات معلقة') ||
    text.includes('المعامل والتركيبات') ||
    text.includes('المعامل') ||
    text.includes('التركيبات') ||
    text.includes('التحاليل والأشعة') ||
    text.includes('التحاليل والاشعة') ||
    text.includes('الاشعة') ||
    text.includes('الأشعة') ||
    text.includes('شغل المعامل') ||
    text.includes('شغل المعمل')
  );

  if (isLabsQuery) {
    const labs = state.labs || [];
    const dentalLabs = state.dentalLabOrders || [];
    const pendingLabs = labs.filter(l => l.status === 'pending' || l.status === 'in_progress');
    const pendingDental = dentalLabs.filter(d => d.status === 'pending' || d.status === 'sent_to_lab' || d.status === 'in_progress');
    
    if (pendingLabs.length === 0 && pendingDental.length === 0) {
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'INFO',
          replyText: '(وحدة اختيارية بالعيادة)\nلا توجد أي تحاليل أو أشعة أو طلبيات تركيبات معلقة حالياً.\nكافة نتائج المختبر والمعامل مكتملة أو لم يتم تسجيل طلبيات بعد.'
        }
      };
    }

    const labList = pendingLabs.map(l => `• ${l.patientName}: فحص (${l.testName || l.test}) لدى معمل (${l.labName || 'المختبر'}) - التاريخ: ${l.dateRequested || l.date}`).join('\n');
    const dentalList = pendingDental.map(d => `• ${d.patientName}: تركيبة (${d.type || d.appliance || 'تركيبة سنية'}) لدى معمل (${d.labName || 'معمل التركيبات'}) - التسليم المتوقع: ${d.deliveryDate || d.expectedDate || 'قريباً'}`).join('\n');

    const combined = [
      labList ? `التحاليل والفحوصات المعلقة:\n${labList}` : '',
      dentalList ? `طلبيات المعامل والتركيبات المعلقة:\n${dentalList}` : ''
    ].filter(Boolean).join('\n\n');

    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'INFO',
        replyText: `(وحدة اختيارية بالعيادة)\nقائمة المعامل والتحاليل والتركيبات المعلقة (${pendingLabs.length + pendingDental.length}):\n\n${combined}\n\nيمكنك متابعة حالاتها واستلام التقارير من شاشات المعامل والمختبرات.`
      }
    };
  }

  // 5. SMART IN-APP NAVIGATION
  const isNavIntent = (
    text.includes('وديني') ||
    text.includes('افتح شاشة') ||
    text.includes('افتح صفحة') ||
    (text.startsWith('افتح ') && !text.includes('شغال') && !text.includes('حظر') && !text.includes('اجازة') && !text.includes('إجازة')) ||
    text.includes('روح لـ')
  );

  if (isNavIntent) {
    let targetPath = null;
    let pageLabel = '';

    if (text.includes('مخزن') || text.includes('ادوية') || text.includes('أدوية')) {
      targetPath = '/inventory';
      pageLabel = 'مخزون المستلزمات الطبية';
    } else if (text.includes('اعدادات') || text.includes('إعدادات') || text.includes('ضبط')) {
      targetPath = '/settings';
      pageLabel = 'مركز إعدادات العيادة';
    } else if (text.includes('موعد') || text.includes('مواعيد') || text.includes('جدول')) {
      targetPath = '/appointments';
      pageLabel = 'جدول وإدارة المواعيد';
    } else if (text.includes('مريض') || text.includes('مرضى') || text.includes('سجلات')) {
      targetPath = '/patients';
      pageLabel = 'السجلات الطبية للمرضى';
    } else if (text.includes('فاتورة') || text.includes('فواتير') || text.includes('حسابات') || text.includes('ماليات') || text.includes('خزنة')) {
      targetPath = '/invoices';
      pageLabel = 'الفوترة والتحصيلات المالية';
    } else if (text.includes('حضور') || text.includes('طاقم') || text.includes('موظفين')) {
      targetPath = '/attendance';
      pageLabel = 'حضور وانصراف الطاقم';
    }

    if (targetPath) {
      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'NAVIGATE',
          payload: { path: targetPath, label: pageLabel },
          replyText: `جاري نقلك فوراً إلى ${pageLabel}...`
        }
      };
    }
  }

  // 6. CLINIC WHATSAPP AI AGENT
  if (text.includes('وكيل واتساب') || text.includes('بوت واتساب') || text.includes('روبوت واتساب') || text.includes('واتساب الذكي') || text.includes('whatsapp bot') || text.includes('whatsapp agent')) {
    const clinicName = state.clinicInfo?.name || 'العيادة';
    const clinicPhone = state.clinicInfo?.phone || state.clinicInfo?.whatsappNumber || '';
    const cleanPhone = clinicPhone.replace(/\D/g, '');
    const waUrl = cleanPhone 
      ? `https://wa.me/20${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(`مرحباً، أود الاستفسار والحجز عبر وكيل واتساب الذكي لـ ${clinicName}`)}`
      : null;

    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'WHATSAPP_AGENT_STATUS',
        payload: { clinicName, clinicPhone, url: waUrl },
        replyText: `تم ربط وتفعيل وكيل واتساب الذكي لـ (${clinicName}).\n\n` +
          `• حالة الوكيل: متصل وجاهز للرد على مدار الساعة.\n` +
          (clinicPhone ? `• رقم واتساب العيادة: ${clinicPhone}\n` : '') +
          `• المهام التلقائية: الرد الفوري على استفسارات المرضى، توضيح أسعار الكشوفات والخدمات، وتسجيل المواعيد المؤكدة آلياً في جدول العيادة.\n\n` +
          (waUrl ? 'يمكنك تجربة محادثة وكيل واتساب الذكي مباشرة عبر الزر أدناه.' : 'يمكنك إضافة رقم هاتف العيادة من الإعدادات لربط المحادثات المباشرة.')
      }
    };
  }

  // 7. 1-CLICK WHATSAPP MESSAGING
  if (text.includes('واتساب') || text.includes('واتس اب') || text.includes('whatsapp')) {
    const matchedPatient = findPatientInText(text, state.patients);
    if (matchedPatient && matchedPatient.phone) {
      const cleanPhone = matchedPatient.phone.replace(/\D/g, '');
      const defaultMsg = `مرحباً أستاذ/ة ${matchedPatient.name}، معك ${state.clinicInfo?.name || 'عيادة كلينك فلو'}. نتمنى لك دوام الصحة والعافية.`;
      const waUrl = `https://wa.me/20${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(defaultMsg)}`;

      return {
        handled: true,
        result: {
          isAction: true,
          actionType: 'SEND_WHATSAPP',
          payload: { patient: matchedPatient, phone: cleanPhone, url: waUrl },
          replyText: `تم إعداد رسالة الواتساب للمريض: ${matchedPatient.name}\n\n` +
            `• الهاتف: ${matchedPatient.phone}\n` +
            `• الرابط: [فتح محادثة واتساب الآن](${waUrl})\n\n` +
            'يمكنك الضغط على الرابط بالأسفل لفتح المحادثة وإرسالها فوراً.'
        }
      };
    }
  }

  // 8. DAILY CLINIC SUMMARY
  if (text.includes('ملخص اليوم') || text.includes('احصائيات اليوم') || text.includes('تقرير اليوم') || text.includes('شغل النهاردة')) {
    const today = getTodayDateStr();
    const appts = (state.appointments || []).filter(a => a.date === today && a.status !== 'cancelled');
    const completed = appts.filter(a => a.status === 'completed');
    const waiting = appts.filter(a => a.status === 'waiting');
    const inProgress = appts.filter(a => a.status === 'in_progress');
    const revenue = completed.reduce((sum, a) => sum + (parseInt(String(a.fee || '0').replace(/\D/g, ''), 10) || 0), 0);

    return {
      handled: true,
      result: {
        isAction: true,
        actionType: 'INFO',
        replyText: `ملخص أداء العيادة لليوم (${today}):\n\n` +
          `• إجمالي مواعيد اليوم: ${appts.length} مريض\n` +
          `• الكشوفات المكتملة: ${completed.length}\n` +
          `• في صالة الانتظار: ${waiting.length}\n` +
          `• في غرفة الكشف حالياً: ${inProgress.length}\n` +
          `• إجمالي الإيرادات المحصلة: ${revenue} ج.م\n\n` +
          'هل ترغب في صياغة رسائل متابعة للمرضى الذين أتموا كشوفاتهم اليوم؟'
      }
    };
  }

  return { handled: false };
}
