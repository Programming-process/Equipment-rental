export type UserRole = 'admin' | 'manager' | 'fixer' | 'renter';

export type Session = {
  token: string;
  role: UserRole;
  expiresAt: string;
};

export type User = {
  id: string;
  role: UserRole;
  email: string;
  phone: string;
  name: string;
  company: string;
};

export type EquipmentItem = {
  id: string;
  name: string;
  model: string;
  status: string;
  meta: string;
  location: string;
  assignee: string;
  tenant: string;
  due: string;
  telemetry: {
    vibration: string;
    temperature: string;
    rpm: string;
  };
  live: boolean;
};

export type AlertItem = {
  id: string;
  title: string;
  equipmentId: string;
  risk: string;
  location: string;
  severity: 'high' | 'warning';
  description: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  meta: string;
  type: 'alert' | 'calendar' | 'success' | 'warning';
  createdAt: string;
};

export type DashboardResponse = {
  summary: {
    totalEquipment: number;
    rentedToday: number;
    alerts: number;
    syncSecondsAgo: string;
    siteName: string;
  };
  equipment: EquipmentItem[];
  alerts: AlertItem[];
  notifications: NotificationItem[];
  supportTeam: { name: string; role: string }[];
};

let sessionToken: string | null = null;

export const setSessionToken = (token: string | null) => {
  sessionToken = token;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'Хүсэлт амжилтгүй боллоо.');
  }

  return response.json() as Promise<T>;
};

type AuthResponse = { message: string; user: User; session: Session };

const saveSession = async (result: Promise<AuthResponse>) => {
  const auth = await result;
  setSessionToken(auth.session.token);
  return auth;
};

export const api = {
  health: () => request<{ status: string; service: string; time: string }>('/health'),
  login: (payload: { email: string; password: string }) =>
    saveSession(request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })),
  register: (payload: { email: string; name: string; company: string; password: string }) =>
    saveSession(request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })),
  logout: async () => {
    try {
      await request<{ message: string }>('/auth/logout', { method: 'POST' });
    } finally {
      setSessionToken(null);
    }
  },
  getDashboard: () => request<DashboardResponse>('/dashboard'),
  getEquipment: () => request<EquipmentItem[]>('/equipment'),
  getEquipmentById: (id: string) => request<EquipmentItem>(`/equipment/${id}`),
  getNotifications: () => request<NotificationItem[]>('/notifications'),
  getAlerts: () => request<AlertItem[]>('/alerts'),
  sendSupportRequest: (payload: { message: string; team: string }) =>
    request<{ ok: boolean; message: string; team: string; ticketId: string; updatedAt: string }>('/support', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export type TelemetryLevel = 'ok' | 'warn' | 'critical';

export type TelemetryReading = {
  equipmentId: string;
  recordedAt: string;
  temperature: number | null;
  vibration: number | null;
  rpm: number | null;
  pressure: number | null;
  source: 'simulator' | 'device';
  level: TelemetryLevel;
};

export type SiteMap = {
  width: number;
  height: number;
  zones: { id: string; label: string; x: number; y: number; w: number; h: number; kind: string }[];
  roads: { x: number; y: number; w: number; h: number }[];
  gate: { x: number; y: number; label: string };
};

export type TelemetrySnapshot = {
  siteMap: SiteMap;
  thresholds: Record<'temperature' | 'vibration' | 'pressure', { warn: number; critical: number }>;
  positions: Record<string, { x: number; y: number }>;
  history: Record<string, TelemetryReading[]>;
  serverTime: string;
};

export type TelemetryEvent =
  | { type: 'snapshot'; data: TelemetrySnapshot }
  | { type: 'telemetry'; data: TelemetryReading[] }
  | { type: 'expired' };

export class StreamAuthError extends Error {}

// EventSource нь Authorization толгой илгээж чадахгүй тул fetch-ээр SSE уншина.
export const streamTelemetry = async (
  onEvent: (event: TelemetryEvent) => void,
  signal: AbortSignal,
) => {
  const response = await fetch('/api/telemetry/stream', {
    headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
    signal,
  });
  if (response.status === 401 || response.status === 403) {
    const body = await response.json().catch(() => null);
    throw new StreamAuthError(body?.message ?? 'Нэвтрэх шаардлагатай.');
  }
  if (!response.ok || !response.body) {
    throw new Error('Телеметрийн холболт амжилтгүй.');
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value;
    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      let event = 'message';
      let data = '';
      for (const line of chunk.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7);
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      if (event === 'snapshot') onEvent({ type: 'snapshot', data: JSON.parse(data) });
      else if (event === 'telemetry') onEvent({ type: 'telemetry', data: JSON.parse(data) });
      else if (event === 'expired') onEvent({ type: 'expired' });
    }
  }
};
