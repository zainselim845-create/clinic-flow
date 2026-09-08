import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeDomain,
  isValidDomain,
  isApexDomain,
  getRequiredDnsRecords,
  generateVerificationToken,
  queryDnsOverHttps,
  verifyDomainDnsAndSsl,
  DOMAIN_STATUS,
  DEFAULT_CNAME_TARGET,
  DEFAULT_A_TARGET
} from '../customDomainService';
import {
  mapPostgresChangeToDomainAction,
  createClinicRealtimeManager,
  REALTIME_STATUS,
  BROADCAST_EVENTS
} from '../realtimeSyncService';

describe('Custom Domain & SSL Provisioning Engine', () => {
  describe('Domain Sanitization and Validation', () => {
    it.each([
      ['https://dr-sara.com/', 'dr-sara.com'],
      ['http://www.clinic-flow.app', 'clinic-flow.app'],
      ['  WWW.MyClinic.EG:8080/booking?lang=ar  ', 'myclinic.eg'],
      ['sub.domain.dr-ahmed.com', 'sub.domain.dr-ahmed.com']
    ])('sanitizes input "%s" to "%s"', (raw, expected) => {
      expect(sanitizeDomain(raw)).toBe(expected);
    });

    it.each([
      ['dr-sara.com', true],
      ['booking.dr-ahmed.com', true],
      ['clinic.med.eg', true],
      ['localhost', false],
      ['internal.local', false],
      ['not-a-domain', false],
      ['', false],
      [null, false]
    ])('validates RFC domain syntax for "%s": %s', (domain, isValid) => {
      expect(isValidDomain(domain)).toBe(isValid);
    });

    it('identifies apex root domains vs subdomains accurately', () => {
      expect(isApexDomain('dr-sara.com')).toBe(true);
      expect(isApexDomain('dr-sara.com.eg')).toBe(true);
      expect(isApexDomain('booking.dr-sara.com')).toBe(false);
      expect(isApexDomain('dr-ahmed.clinicflow.app')).toBe(false);
    });
  });

  describe('DNS Records Generation', () => {
    const clinicId = 'clinic-12345';

    it('generates A, CNAME, and TXT verification records for apex domains', () => {
      const records = getRequiredDnsRecords('drsara.com', clinicId);
      expect(records).toHaveLength(3);

      const aRecord = records.find((r) => r.type === 'A');
      expect(aRecord).toBeDefined();
      expect(aRecord.name).toBe('@');
      expect(aRecord.value).toBe(DEFAULT_A_TARGET);

      const cnameRecord = records.find((r) => r.type === 'CNAME');
      expect(cnameRecord).toBeDefined();
      expect(cnameRecord.name).toBe('www');
      expect(cnameRecord.value).toBe(DEFAULT_CNAME_TARGET);

      const txtRecord = records.find((r) => r.type === 'TXT');
      expect(txtRecord).toBeDefined();
      expect(txtRecord.name).toBe('_clinicflow-challenge');
      expect(txtRecord.value).toContain('clinicflow-verify-');
    });

    it('generates CNAME and TXT challenge for subdomains', () => {
      const records = getRequiredDnsRecords('booking.dr-ahmed.com', clinicId);
      expect(records).toHaveLength(2);

      const cnameRecord = records.find((r) => r.type === 'CNAME');
      expect(cnameRecord.name).toBe('booking');
      expect(cnameRecord.value).toBe(DEFAULT_CNAME_TARGET);

      const txtRecord = records.find((r) => r.type === 'TXT');
      expect(txtRecord.name).toBe('_clinicflow-challenge.booking');
    });

    it('produces deterministic verification tokens per clinic and domain', () => {
      const token1 = generateVerificationToken('clinic-1', 'dr-sara.com');
      const token2 = generateVerificationToken('clinic-1', 'dr-sara.com');
      const token3 = generateVerificationToken('clinic-2', 'dr-sara.com');

      expect(token1).toBe(token2);
      expect(token1).not.toBe(token3);
    });
  });

  describe('Live DNS-over-HTTPS (DoH) & SSL Resolution', () => {
    it('queries Cloudflare DoH endpoint and parses answer correctly', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Status: 0,
          Answer: [
            { name: 'booking.dr-sara.com.', type: 5, data: 'cname.clinicflow.app.' }
          ]
        })
      });

      const result = await queryDnsOverHttps('booking.dr-sara.com', 'CNAME', mockFetch);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://cloudflare-dns.com/dns-query'),
        expect.objectContaining({ headers: { Accept: 'application/dns-json' } })
      );
      expect(result.answers[0].data).toBe('cname.clinicflow.app');
    });

    it('resolves SSL as ACTIVE when DoH answers match expected target', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Status: 0,
          Answer: [{ name: 'booking.dr-sara.com.', type: 5, data: 'cname.clinicflow.app.' }]
        })
      });

      const verification = await verifyDomainDnsAndSsl('booking.dr-sara.com', 'clinic-1', mockFetch);
      expect(verification.isValid).toBe(true);
      expect(verification.dnsConfigured).toBe(true);
      expect(verification.sslStatus).toBe(DOMAIN_STATUS.ACTIVE);
      expect(verification.sslIssuer).toContain('TLS 1.3');
    });

    it('resolves SSL as PENDING_DNS when DoH answers do not match', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Status: 0,
          Answer: []
        })
      });

      const verification = await verifyDomainDnsAndSsl('booking.dr-sara.com', 'clinic-1', mockFetch);
      expect(verification.isValid).toBe(true);
      expect(verification.dnsConfigured).toBe(false);
      expect(verification.sslStatus).toBe(DOMAIN_STATUS.PENDING_DNS);
    });

    it('handles network or fetch errors gracefully without throwing', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

      const verification = await verifyDomainDnsAndSsl('booking.dr-sara.com', 'clinic-1', mockFetch);
      expect(verification.isValid).toBe(true);
      expect(verification.sslStatus).toBe(DOMAIN_STATUS.PENDING_DNS);
    });
  });
});

describe('Supabase Realtime Synchronization Engine', () => {
  describe('Database Change Mapper (Postgres to Domain Action)', () => {
    it('maps appointment INSERT to ADD_APPOINTMENT action', () => {
      const row = {
        id: 'apt-101',
        clinic_id: 'clinic-1',
        patient_name: 'زياد محمود',
        date: '2026-09-10',
        time: '10:00 ص',
        status: 'booked'
      };
      const action = mapPostgresChangeToDomainAction('appointments', {
        eventType: 'INSERT',
        new: row
      });

      expect(action).toEqual({
        type: 'ADD_APPOINTMENT',
        payload: expect.objectContaining({
          id: 'apt-101',
          patientName: 'زياد محمود',
          date: '2026-09-10'
        })
      });
    });

    it('maps appointment UPDATE to UPDATE_APPOINTMENT action', () => {
      const row = {
        id: 'apt-101',
        clinic_id: 'clinic-1',
        patient_name: 'زياد محمود',
        status: 'waiting'
      };
      const action = mapPostgresChangeToDomainAction('appointments', {
        eventType: 'UPDATE',
        new: row
      });

      expect(action).toEqual({
        type: 'UPDATE_APPOINTMENT',
        payload: expect.objectContaining({
          id: 'apt-101',
          status: 'waiting'
        })
      });
    });

    it('maps appointment DELETE to DELETE_APPOINTMENT action', () => {
      const action = mapPostgresChangeToDomainAction('appointments', {
        eventType: 'DELETE',
        old: { id: 'apt-101' }
      });

      expect(action).toEqual({
        type: 'DELETE_APPOINTMENT',
        payload: 'apt-101'
      });
    });

    it('maps patient INSERT to ADD_PATIENT action', () => {
      const row = {
        id: 'pat-1',
        clinic_id: 'clinic-1',
        name: 'مريم طارق',
        phone: '01011112222'
      };
      const action = mapPostgresChangeToDomainAction('patients', {
        eventType: 'INSERT',
        new: row
      });

      expect(action).toEqual({
        type: 'ADD_PATIENT',
        payload: expect.objectContaining({
          id: 'pat-1',
          name: 'مريم طارق',
          phone: '01011112222'
        })
      });
    });

    it('returns null for unknown table or unhandled event', () => {
      expect(mapPostgresChangeToDomainAction('unknown_table', { eventType: 'INSERT' })).toBeNull();
    });
  });

  describe('Channel Manager Lifecycle & Broadcast Dispatch', () => {
    let mockChannel;
    let mockSupabaseClient;
    let capturedListeners;
    let capturedSubscribeCallback;

    beforeEach(() => {
      capturedListeners = {};
      mockChannel = {
        on: vi.fn((type, filterObj, callback) => {
          const key = type === 'postgres_changes' ? `postgres:${filterObj.table}` : `broadcast:${filterObj.event}`;
          capturedListeners[key] = callback;
          return mockChannel;
        }),
        subscribe: vi.fn((cb) => {
          capturedSubscribeCallback = cb;
          return mockChannel;
        }),
        send: vi.fn().mockResolvedValue('ok')
      };

      mockSupabaseClient = {
        channel: vi.fn(() => mockChannel),
        removeChannel: vi.fn()
      };
    });

    it('creates channel filtered by active clinic ID and tracks SUBSCRIBED status', () => {
      let currentStatus = null;
      const dispatchedActions = [];

      const manager = createClinicRealtimeManager({
        supabaseClient: mockSupabaseClient,
        clinicId: 'clinic-xyz',
        onDispatch: (action) => dispatchedActions.push(action),
        onStatusChange: (s) => {
          currentStatus = s;
        }
      });

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('clinic-realtime-clinic-xyz');
      expect(currentStatus).toBe(REALTIME_STATUS.CONNECTING);

      // Simulate channel connection success
      capturedSubscribeCallback('SUBSCRIBED');
      expect(currentStatus).toBe(REALTIME_STATUS.SUBSCRIBED);
      expect(manager.status).toBe(REALTIME_STATUS.SUBSCRIBED);
    });

    it('dispatches domain action when table postgres_change occurs', () => {
      const dispatchedActions = [];

      createClinicRealtimeManager({
        supabaseClient: mockSupabaseClient,
        clinicId: 'clinic-xyz',
        onDispatch: (action) => dispatchedActions.push(action)
      });

      // Trigger the appointments listener
      const appointmentListener = capturedListeners['postgres:appointments'];
      expect(appointmentListener).toBeDefined();

      appointmentListener({
        eventType: 'INSERT',
        new: { id: 'apt-50', clinic_id: 'clinic-xyz', patient_name: 'سارة خالد' }
      });

      expect(dispatchedActions).toHaveLength(1);
      expect(dispatchedActions[0].type).toBe('ADD_APPOINTMENT');
      expect(dispatchedActions[0].payload.patientName).toBe('سارة خالد');
    });

    it('broadcasts peer-to-peer cues (PATIENT_ARRIVED, DOCTOR_CALL_NEXT)', async () => {
      const receivedBroadcasts = [];

      const manager = createClinicRealtimeManager({
        supabaseClient: mockSupabaseClient,
        clinicId: 'clinic-xyz',
        onBroadcast: (msg) => receivedBroadcasts.push(msg)
      });

      // Test sending broadcast
      const sent = await manager.broadcast(BROADCAST_EVENTS.PATIENT_ARRIVED, {
        patientId: 'p-1',
        patientName: 'أحمد سعيد'
      });

      expect(sent).toBe(true);
      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'clinic_event',
        payload: expect.objectContaining({
          eventType: BROADCAST_EVENTS.PATIENT_ARRIVED,
          clinicId: 'clinic-xyz',
          patientName: 'أحمد سعيد'
        })
      });

      // Test receiving broadcast
      const broadcastListener = capturedListeners['broadcast:clinic_event'];
      expect(broadcastListener).toBeDefined();

      broadcastListener({
        payload: {
          eventType: BROADCAST_EVENTS.DOCTOR_CALL_NEXT,
          patientName: 'أحمد سعيد'
        }
      });

      expect(receivedBroadcasts).toHaveLength(1);
      expect(receivedBroadcasts[0].eventType).toBe(BROADCAST_EVENTS.DOCTOR_CALL_NEXT);
    });

    it('safely cleans up and unregisters channel on unsubscribe', () => {
      let currentStatus = null;
      const manager = createClinicRealtimeManager({
        supabaseClient: mockSupabaseClient,
        clinicId: 'clinic-xyz',
        onStatusChange: (s) => {
          currentStatus = s;
        }
      });

      manager.unsubscribe();
      expect(mockSupabaseClient.removeChannel).toHaveBeenCalledWith(mockChannel);
      expect(currentStatus).toBe(REALTIME_STATUS.DISCONNECTED);
      expect(manager.status).toBe(REALTIME_STATUS.DISCONNECTED);
    });
  });
});
