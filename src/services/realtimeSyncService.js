/**
 * Realtime Sync Service for ClinicFlow
 * Manages Supabase WebSockets channels, Postgres changes subscriptions,
 * and peer-to-peer broadcast events (patient arrival, doctor call, queue sync).
 */
import { fromDbAppointment } from './appointmentsService';
import { fromDbPatient } from './patientsService';
import { fromDbNotification } from './notificationsService';
import { fromDbStaff } from './staffService';
import { fromDbBlockedSlot } from './blockedSlotsService';

export const REALTIME_STATUS = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  SUBSCRIBED: 'SUBSCRIBED',
  ERROR: 'ERROR'
};

export const BROADCAST_EVENTS = {
  PATIENT_ARRIVED: 'PATIENT_ARRIVED',
  DOCTOR_CALL_NEXT: 'DOCTOR_CALL_NEXT',
  QUEUE_UPDATED: 'QUEUE_UPDATED',
  ALERT: 'ALERT'
};

/**
 * Synthesizes a pleasant audio chime using Web Audio API
 * Avoids heavy audio file dependencies and loads instantly.
 */
export function playChime(type = 'notification') {
  if (typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'patient_arrival') {
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'doctor_call') {
      osc.frequency.setValueAtTime(1046.50, now);
      osc.frequency.exponentialRampToValueAtTime(1567.98, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      osc.frequency.setValueAtTime(523.25, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Audio autoplay or permission restriction
  }
}

/**
 * Maps incoming Postgres change event payload to domain action
 */
export function mapPostgresChangeToDomainAction(table, payload) {
  if (!payload || !payload.eventType) return null;
  const { eventType, new: newRow, old: oldRow } = payload;

  switch (table) {
    case 'appointments': {
      if (eventType === 'INSERT') {
        return { type: 'ADD_APPOINTMENT', payload: fromDbAppointment(newRow) };
      }
      if (eventType === 'UPDATE') {
        return { type: 'UPDATE_APPOINTMENT', payload: fromDbAppointment(newRow) };
      }
      if (eventType === 'DELETE') {
        return { type: 'DELETE_APPOINTMENT', payload: oldRow?.id };
      }
      return null;
    }

    case 'patients': {
      if (eventType === 'INSERT') {
        return { type: 'ADD_PATIENT', payload: fromDbPatient(newRow) };
      }
      if (eventType === 'UPDATE') {
        return { type: 'UPDATE_PATIENT', payload: fromDbPatient(newRow) };
      }
      if (eventType === 'DELETE') {
        return { type: 'DELETE_PATIENT', payload: oldRow?.id };
      }
      return null;
    }

    case 'notifications': {
      if (eventType === 'INSERT') {
        return { type: 'ADD_NOTIFICATION', payload: fromDbNotification(newRow) };
      }
      return null;
    }

    case 'staff_members': {
      if (eventType === 'INSERT') {
        return { type: 'ADD_STAFF', payload: fromDbStaff(newRow) };
      }
      if (eventType === 'UPDATE') {
        return { type: 'UPDATE_STAFF', payload: fromDbStaff(newRow) };
      }
      if (eventType === 'DELETE') {
        return { type: 'DELETE_STAFF', payload: oldRow?.id };
      }
      return null;
    }

    case 'blocked_slots': {
      if (eventType === 'INSERT') {
        return { type: 'TOGGLE_BLOCK_SLOT', payload: fromDbBlockedSlot(newRow) };
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Creates and manages a tenant-scoped Realtime channel
 */
export function createClinicRealtimeManager({
  supabaseClient,
  clinicId,
  onDispatch,
  onStatusChange,
  onBroadcast
}) {
  if (!supabaseClient || !clinicId) {
    return {
      status: REALTIME_STATUS.DISCONNECTED,
      broadcast: () => Promise.resolve(false),
      unsubscribe: () => {}
    };
  }

  let status = REALTIME_STATUS.CONNECTING;
  onStatusChange?.(status);

  const channelName = `clinic-realtime-${clinicId}`;
  const channel = supabaseClient.channel(channelName);

  const handlePostgresChange = (table, payload) => {
    const action = mapPostgresChangeToDomainAction(table, payload);
    if (!action) return;

    if (table === 'appointments' && payload.eventType === 'INSERT') {
      playChime('notification');
    }
    onDispatch?.(action);
  };

  // Register table listeners with strict clinic_id scoping
  const tables = ['appointments', 'patients', 'notifications', 'staff_members', 'blocked_slots'];
  tables.forEach((tableName) => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: `clinic_id=eq.${clinicId}`
      },
      (payload) => handlePostgresChange(tableName, payload)
    );
  });

  // Listen to peer-to-peer broadcast events on this clinic channel
  channel.on('broadcast', { event: 'clinic_event' }, (msg) => {
    const payload = msg?.payload;
    if (!payload) return;

    if (payload.eventType === BROADCAST_EVENTS.PATIENT_ARRIVED) {
      playChime('patient_arrival');
    } else if (payload.eventType === BROADCAST_EVENTS.DOCTOR_CALL_NEXT) {
      playChime('doctor_call');
    }

    onBroadcast?.(payload);
  });

  // Subscribe and track status
  channel.subscribe((subStatus) => {
    if (subStatus === 'SUBSCRIBED') {
      status = REALTIME_STATUS.SUBSCRIBED;
    } else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') {
      status = REALTIME_STATUS.ERROR;
    } else if (subStatus === 'CLOSED') {
      status = REALTIME_STATUS.DISCONNECTED;
    }
    onStatusChange?.(status);
  });

  const broadcast = async (eventType, data = {}) => {
    try {
      const response = await channel.send({
        type: 'broadcast',
        event: 'clinic_event',
        payload: {
          eventType,
          clinicId,
          timestamp: new Date().toISOString(),
          ...data
        }
      });
      return response === 'ok';
    } catch (err) {
      console.warn('Realtime broadcast error:', err);
      return false;
    }
  };

  const unsubscribe = () => {
    status = REALTIME_STATUS.DISCONNECTED;
    onStatusChange?.(status);
    try {
      supabaseClient.removeChannel(channel);
    } catch {
      // Channel already removed or client destroyed
    }
  };

  return {
    get status() {
      return status;
    },
    broadcast,
    unsubscribe
  };
}
