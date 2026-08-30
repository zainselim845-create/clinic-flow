import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Plus, Search, Building2, Phone, 
  CheckCircle2, DollarSign, Percent, FileText 
} from 'lucide-react';
import { DEFAULT_INSURANCE_COMPANIES, getInsuranceCompanies } from '../services/insuranceService';
import './Insurance.css';

const Insurance = () => {
  const [companies, setCompanies] = useState(DEFAULT_INSURANCE_COMPANIES);
  const [searchQuery, setSearchQuery] = useState('');
  const [testAmount, setTestAmount] = useState(1500);
  const [selectedPlan, setSelectedPlan] = useState(DEFAULT_INSURANCE_COMPANIES[0].plans[0]);

  useEffect(() => {
    async function load() {
      const { data } = await getInsuranceCompanies();
      if (data) setCompanies(data);
    }
    load();
  }, []);

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Coverage calculator
  const coveragePercent = selectedPlan?.coveragePct || 80;
  const insurancePays = (testAmount * (coveragePercent / 100));
  const patientPays = testAmount - insurancePays;

  return (
    <div className="insurance-page">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>إدارة التأمين الطبي والتعاقدات (Insurance & Third-Party)</h2>
          <p>إدارة شركات التأمين المتعاقدة، نسب التحمل، والحدود السنوية للتغطيات السنية</p>
        </div>
      </div>

      {/* Insurance Calculator Simulator */}
      <div className="insurance-calculator-card">
        <div className="calc-header">
          <ShieldCheck size={22} className="text-nebras-orange" />
          <div>
            <h4>حاسبة نسبة التحمل والمطالبات الفورية</h4>
            <p>اختر الخطة الطبية وأدخل تكلفة العلاج لحساب حصة شركة التأمين والمريض فوراً</p>
          </div>
        </div>

        <div className="calc-body-grid">
          <div className="calc-input-box">
            <label>تكلفة الإجراء السني الإجمالية (ج.م):</label>
            <input
              type="number"
              min="100"
              step="50"
              className="calc-num-input"
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
            />
          </div>

          <div className="calc-input-box">
            <label>الشركة والخطة التأمينية:</label>
            <select
              className="calc-select"
              onChange={(e) => {
                const [compId, planId] = e.target.value.split(':');
                const comp = companies.find(c => c.id === compId);
                const plan = comp?.plans.find(p => p.id === planId);
                if (plan) setSelectedPlan(plan);
              }}
            >
              {companies.map(c => (
                <optgroup key={c.id} label={c.name}>
                  {c.plans.map(p => (
                    <option key={p.id} value={`${c.id}:${p.id}`}>
                      {p.name} — تغطية {p.coveragePct}%
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="calc-result-box">
            <div className="res-item">
              <span>نسبة التغطية:</span>
              <strong>{coveragePercent}%</strong>
            </div>
            <div className="res-item">
              <span>حصة التأمين:</span>
              <strong className="text-success">{insurancePays.toFixed(0)} ج.م</strong>
            </div>
            <div className="res-item grand">
              <span>مطلوب من المريض:</span>
              <strong className="text-orange">{patientPays.toFixed(0)} ج.م</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Companies & Plans Directory */}
      <div className="companies-section">
        <h4 className="section-title">شركات التأمين والخطط المعتمدة ({companies.length})</h4>
        
        <div className="companies-grid">
          {filteredCompanies.map(comp => (
            <div key={comp.id} className="company-card">
              <div className="comp-card-top">
                <div className="comp-badge-icon"><Building2 size={22} /></div>
                <div>
                  <h5>{comp.name}</h5>
                  <span className="contact-person">{comp.contactPerson}</span>
                  <a href={`tel:${comp.phone}`} className="comp-phone"><Phone size={12} /> {comp.phone}</a>
                </div>
              </div>

              <div className="comp-plans-list">
                <label className="plans-lbl">الخطط والشرائح المتاحة:</label>
                {comp.plans.map(plan => (
                  <div key={plan.id} className="plan-chip">
                    <div className="plan-name-flex">
                      <Percent size={13} className="text-primary" />
                      <strong>{plan.name}</strong>
                    </div>
                    <span className="coverage-badge">تغطية {plan.coveragePct}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Insurance;
