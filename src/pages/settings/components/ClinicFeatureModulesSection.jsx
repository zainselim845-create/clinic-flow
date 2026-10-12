import React from 'react';
import { Layers, Package } from 'lucide-react';

export default function ClinicFeatureModulesSection({ clinicForm, setClinicForm }) {
  return (
    <div className="settings-card-block" style={{
      background: 'var(--bg-primary)',
      border: '1.5px solid var(--border-color)',
      borderRadius: 'var(--radius-xl)',
      padding: '1.5rem',
      marginBottom: '1rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.75rem',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            background: 'var(--clinic-primary, #09090B)',
            color: '#FFF',
            padding: '0.5rem',
            borderRadius: '8px'
          }}>
            <Layers size={20} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>تفعيل ميزات العيادة</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>تخصيص الميزات التشغيلية المفعّلة في عيادتك للتحكم فيما يظهر بالقائمة الرئيسية</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* Module 1: Labs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.15rem',
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          background: 'var(--surface, #FFF)',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Layers size={22} />
            </div>
            <div>
              <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--text-primary)' }}>معمل التركيبات والتحاليل</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                إدارة ومتابعة طلبات معامل الأسنان والتحاليل
              </span>
            </div>
          </div>
          <label className="switch-toggle" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', flexShrink: 0 }}>
            <input 
              type="checkbox"
              checked={Boolean(clinicForm.enableLabs ?? clinicForm.modules?.labs)}
              onChange={(e) => {
                const val = e.target.checked;
                setClinicForm(prev => ({
                  ...prev,
                  enableLabs: val,
                  modules: {
                    ...(prev.modules || {}),
                    labs: val
                  }
                }));
              }}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span className="slider round" style={{
              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: (clinicForm.enableLabs ?? clinicForm.modules?.labs) ? '#10B981' : '#CBD5E1',
              borderRadius: '34px', transition: '0.3s'
            }}>
              <span style={{
                position: 'absolute', content: '""', height: '20px', width: '20px', left: (clinicForm.enableLabs ?? clinicForm.modules?.labs) ? '25px' : '3px', bottom: '3px',
                backgroundColor: 'white', borderRadius: '50%', transition: '0.3s'
              }} />
            </span>
          </label>
        </div>

        {/* Module 2: Inventory */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.15rem',
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          background: 'var(--surface, #FFF)',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Package size={22} />
            </div>
            <div>
              <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--text-primary)' }}>المخزون والمستلزمات الطبية</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: 'block' }}>
                مراقبة أرصدة الخامات وتنبيهات النواقص
              </span>
            </div>
          </div>
          <label className="switch-toggle" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', flexShrink: 0 }}>
            <input 
              type="checkbox"
              checked={Boolean(clinicForm.enableInventory ?? clinicForm.modules?.inventory)}
              onChange={(e) => {
                const val = e.target.checked;
                setClinicForm(prev => ({
                  ...prev,
                  enableInventory: val,
                  modules: {
                    ...(prev.modules || {}),
                    inventory: val
                  }
                }));
              }}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span className="slider round" style={{
              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: (clinicForm.enableInventory ?? clinicForm.modules?.inventory) ? '#10B981' : '#CBD5E1',
              borderRadius: '34px', transition: '0.3s'
            }}>
              <span style={{
                position: 'absolute', content: '""', height: '20px', width: '20px', left: (clinicForm.enableInventory ?? clinicForm.modules?.inventory) ? '25px' : '3px', bottom: '3px',
                backgroundColor: 'white', borderRadius: '50%', transition: '0.3s'
              }} />
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
