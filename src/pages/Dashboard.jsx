import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { UserCheck, CalendarClock, Users, TrendingUp, Wallet } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import StatCard from '../components/StatCard';
import AppointmentCard from '../components/AppointmentCard';
import PatientCard from '../components/PatientCard';
import { weeklyStats, visitTypes } from '../data/demoData';
import './Dashboard.css';

const Dashboard = () => {
  const { state, dispatch } = useApp();
  const { role } = useAuth();
  const appointments = state.appointments || [];
  const patients = state.patients || [];

  const today = new Date().toISOString().split('T')[0];
  const todaysAppointments = appointments.filter((a) => a.date === today);
  const upcomingAppointments = appointments.filter((a) => a.date > today);

  const completedToday = todaysAppointments.filter(a => a.status === 'completed').length;
  const attendanceRate = todaysAppointments.length > 0
    ? Math.round((completedToday / todaysAppointments.length) * 100)
    : 0;

  // Calculate today's revenue (300 EGP per completed consultation)
  const todayRevenue = completedToday * 300;

  const handleUpdateStatus = (id, newStatus) => {
    dispatch({
      type: 'UPDATE_APPOINTMENT_STATUS',
      payload: { id, status: newStatus }
    });
  };

  const handleDeletePatient = (id) => {
    dispatch({ type: 'DELETE_PATIENT', payload: id });
  };

  const COLORS = ['#0ea5e9', '#14b8a6', '#8b5cf6', '#f43f5e', '#f59e0b'];

  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        <StatCard
          title="مرضى اليوم"
          value={todaysAppointments.length}
          icon={UserCheck}
          color="blue"
        />
        <StatCard
          title="المواعيد القادمة"
          value={upcomingAppointments.length}
          icon={CalendarClock}
          color="teal"
        />
        {role === 'doctor' ? (
          <StatCard
            title="إيرادات اليوم المحصلة"
            value={`${todayRevenue.toLocaleString()} ج.م`}
            icon={Wallet}
            color="green"
          />
        ) : (
          <StatCard
            title="إجمالي المرضى"
            value={patients.length}
            icon={Users}
            color="purple"
          />
        )}
        <StatCard
          title="نسبة الحضور"
          value={`${attendanceRate}%`}
          icon={TrendingUp}
          color="green"
        />
      </div>

      <div className="charts-grid">
        <div className="chart-container glass-card">
          <h3 className="chart-title">زيارات الأسبوع</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="day" stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
              <Line
                type="monotone"
                dataKey="visits"
                stroke="var(--primary-color)"
                strokeWidth={3}
                dot={{ r: 4, fill: 'var(--primary-color)' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container glass-card">
          <h3 className="chart-title">أنواع الزيارات</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={visitTypes}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {visitTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bottom-grid">
        <div className="bottom-section glass-card">
          <div className="section-header">
            <h3>مواعيد اليوم</h3>
          </div>
          <div className="items-list">
            {todaysAppointments.length > 0 ? (
              todaysAppointments.map(appt => {
                const patient = patients.find(p => p.id === appt.patientId);
                return (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    patient={patient}
                    onUpdateStatus={handleUpdateStatus}
                  />
                );
              })
            ) : (
              <p className="empty-text">لا توجد مواعيد اليوم.</p>
            )}
          </div>
        </div>

        <div className="bottom-section glass-card">
          <div className="section-header">
            <h3>أحدث المرضى</h3>
          </div>
          <div className="items-list">
            {patients.slice(0, 4).map(patient => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onDelete={() => handleDeletePatient(patient.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
