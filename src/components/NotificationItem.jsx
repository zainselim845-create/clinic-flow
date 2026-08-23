import React from 'react';
import { Bell, Clock, UserPlus, XCircle, CheckCircle } from 'lucide-react';
import './NotificationItem.css';

const getRelativeTime = (timestamp) => {
  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
  const daysDifference = Math.round((new Date(timestamp) - new Date()) / (1000 * 60 * 60 * 24));
  
  if (daysDifference === 0) {
    const hoursDifference = Math.round((new Date(timestamp) - new Date()) / (1000 * 60 * 60));
    if(hoursDifference === 0) {
        const minutesDifference = Math.round((new Date(timestamp) - new Date()) / (1000 * 60));
        return rtf.format(minutesDifference, 'minute');
    }
    return rtf.format(hoursDifference, 'hour');
  }
  
  return rtf.format(daysDifference, 'day');
};

const NotificationItem = ({ notification, onRead }) => {
  const getIconAndColor = (type) => {
    switch (type) {
      case 'appointment': return { Icon: Bell, color: 'var(--color-primary)' };
      case 'reminder': return { Icon: Clock, color: 'var(--color-warning)' };
      case 'new_patient': return { Icon: UserPlus, color: 'var(--color-success)' };
      case 'cancelled': return { Icon: XCircle, color: 'var(--color-error)' };
      case 'completed': return { Icon: CheckCircle, color: 'var(--color-success)' };
      default: return { Icon: Bell, color: 'var(--color-text)' };
    }
  };

  const { Icon, color } = getIconAndColor(notification.type);

  return (
    <div className={`notification-item ${!notification.read ? 'unread' : ''}`} onClick={() => !notification.read && onRead(notification.id)}>
      <div className="notification-icon" style={{ backgroundColor: `${color}20`, color }}>
        <Icon size={20} />
      </div>
      <div className="notification-content">
        <h4>{notification.title}</h4>
        <p>{notification.message}</p>
        <span className="notification-time">{getRelativeTime(notification.timestamp || new Date())}</span>
      </div>
      {!notification.read && <div className="unread-dot"></div>}
    </div>
  );
};

export default NotificationItem;
