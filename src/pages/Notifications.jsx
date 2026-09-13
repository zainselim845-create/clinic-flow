import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CheckCheck, Trash2, Bell, Smartphone } from 'lucide-react';
import NotificationItem from '../components/NotificationItem';
import EmptyState from '../components/EmptyState';
import './Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { notifications = [] } = state;
  const [filter, setFilter] = useState('all'); // all, unread, appointment, reminder

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'appointment') return n.type === 'appointment';
    if (filter === 'reminder') return n.type === 'reminder';
    return true;
  });

  const handleMarkAllRead = () => {
    dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
  };

  const handleClearAll = () => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });
  };

  const handleMarkRead = (id) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  };

  return (
    <div className="notifications-page">
      <div className="page-header">
        <h2>الإشعارات</h2>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => navigate('/settings')} title="إعداد وتجربة إرسال رسائل SMS المفتوحة المصدر">
            <Smartphone size={18} />
            إعدادات بوابة SMS
          </button>
          <button className="btn-secondary" onClick={handleMarkAllRead}>
            <CheckCheck size={18} />
            تحديد الكل كمقروء
          </button>
          <button className="btn-danger" onClick={handleClearAll}>
            <Trash2 size={18} />
            مسح الكل
          </button>
        </div>
      </div>

      <div className="filters-bar glass-card">
        <div className="status-filters">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>الكل</button>
          <button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>غير مقروء</button>
          <button className={filter === 'appointment' ? 'active' : ''} onClick={() => setFilter('appointment')}>مواعيد</button>
          <button className={filter === 'reminder' ? 'active' : ''} onClick={() => setFilter('reminder')}>تذكيرات</button>
        </div>
      </div>

      <div className="notifications-list">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(notif => (
            <NotificationItem 
              key={notif.id} 
              notification={notif} 
              onRead={handleMarkRead} 
            />
          ))
        ) : (
          <EmptyState 
            icon={Bell} 
            title="لا توجد إشعارات حالياً" 
            description="ستظهر هنا إشعارات المواعيد، التحصيل، وتنبيهات العيادة فور حدوثها."
          />
        )}
      </div>
    </div>
  );
};

export default Notifications;
