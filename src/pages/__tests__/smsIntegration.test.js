import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../../context/AppContext';
import { AuthProvider } from '../../context/AuthContext';
import { TenantProvider } from '../../context/TenantContext';
import SmsIntegration from '../SmsIntegration';

describe('SmsIntegration Page Component', () => {
  it('renders SmsIntegration page cleanly without crashing', () => {
    const html = renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/sms-integration'] },
        React.createElement(
          AuthProvider,
          null,
          React.createElement(
            TenantProvider,
            null,
            React.createElement(
              AppProvider,
              null,
              React.createElement(SmsIntegration, null)
            )
          )
        )
      )
    );

    expect(html).toBeDefined();
    expect(typeof html).toBe('string');

    // Page title and status
    expect(html).toContain('بوابة الرسائل النصية والتكامل');
    expect(html).toContain('البوابة نشطة');

    // Metrics cards
    expect(html).toContain('رسائل مُرسلة');
    expect(html).toContain('معدل التوصيل');
    expect(html).toContain('الرصيد المتاح');
    expect(html).toContain('اسم المرسل المعتمد');

    // Providers
    expect(html).toContain('ClinicFlow Gateway');
    expect(html).toContain('EasySendSMS');
    expect(html).toContain('SMSMisr');
    expect(html).toContain('Cequens');
    expect(html).toContain('TextBee');
    expect(html).toContain('وضع المحاكاة');

    // Test simulator
    expect(html).toContain('محاكي الإرسال التجريبي');
    expect(html).toContain('إرسال رسالة اختبار');

    // Triggers
    expect(html).toContain('التذكيرات والرسائل الآلية');
    expect(html).toContain('تأكيد الحجز الفوري');
    expect(html).toContain('تذكير الموعد (قبل 24 ساعة)');
    expect(html).toContain('تذكير المتابعة الدورية');

    // Action button
    expect(html).toContain('حفظ إعدادات البوابة');
  });
});
