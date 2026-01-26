import { format, formatDistance, parseISO, isValid } from 'date-fns';
import { uz, ru, enUS } from 'date-fns/locale';

const locales = { uz, ru, en: enUS };

export const formatDate = (date, formatStr = 'dd.MM.yyyy', locale = 'uz') => {
  if (!date) return '-';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';
  return format(parsed, formatStr, { locale: locales[locale] || locales.uz });
};

export const formatDateTime = (date, locale = 'uz') => {
  return formatDate(date, 'dd.MM.yyyy HH:mm', locale);
};

export const formatRelativeTime = (date, locale = 'uz') => {
  if (!date) return '-';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';
  return formatDistance(parsed, new Date(), {
    addSuffix: true,
    locale: locales[locale] || locales.uz
  });
};

export const getPositionColor = (position) => {
  const colors = {
    GK: 'bg-yellow-500',
    CB: 'bg-blue-500',
    LB: 'bg-blue-400',
    RB: 'bg-blue-400',
    CDM: 'bg-green-600',
    CM: 'bg-green-500',
    CAM: 'bg-green-400',
    LM: 'bg-green-400',
    RM: 'bg-green-400',
    LW: 'bg-red-400',
    RW: 'bg-red-400',
    CF: 'bg-red-500',
    ST: 'bg-red-600',
  };
  return colors[position] || 'bg-gray-500';
};

export const getPositionGroup = (position) => {
  const groups = {
    GK: 'goalkeeper',
    CB: 'defender',
    LB: 'defender',
    RB: 'defender',
    CDM: 'midfielder',
    CM: 'midfielder',
    CAM: 'midfielder',
    LM: 'midfielder',
    RM: 'midfielder',
    LW: 'attacker',
    RW: 'attacker',
    CF: 'attacker',
    ST: 'attacker',
  };
  return groups[position] || 'unknown';
};

export const getStatusColor = (status) => {
  const colors = {
    scheduled: 'badge-primary',
    in_progress: 'badge-warning',
    completed: 'badge-success',
    cancelled: 'badge-danger',
    lineup_set: 'badge-primary',
    half_time: 'badge-warning',
    postponed: 'badge-gray',
    present: 'badge-success',
    absent: 'badge-danger',
    late: 'badge-warning',
    excused: 'badge-gray',
    injured: 'badge-danger',
  };
  return colors[status] || 'badge-gray';
};

export const getResultColor = (result) => {
  const colors = {
    win: 'text-green-600 bg-green-100',
    draw: 'text-yellow-600 bg-yellow-100',
    loss: 'text-red-600 bg-red-100',
  };
  return colors[result] || '';
};

export const getFormBadge = (result) => {
  const config = {
    W: { bg: 'bg-green-500', text: 'text-white' },
    D: { bg: 'bg-yellow-500', text: 'text-white' },
    L: { bg: 'bg-red-500', text: 'text-white' },
  };
  return config[result] || { bg: 'bg-gray-400', text: 'text-white' };
};

export const calculateAge = (birthDate) => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const getOverallRating = (ratings) => {
  if (!ratings) return 0;
  const { pace, shooting, passing, dribbling, defending, physical } = ratings;
  return Math.round((pace + shooting + passing + dribbling + defending + physical) / 6);
};

export const getRatingColor = (rating) => {
  if (rating >= 80) return 'text-green-600';
  if (rating >= 60) return 'text-yellow-600';
  if (rating >= 40) return 'text-orange-600';
  return 'text-red-600';
};

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const formations = [
  { value: '4-3-3', label: '4-3-3' },
  { value: '4-4-2', label: '4-4-2' },
  { value: '4-2-3-1', label: '4-2-3-1' },
  { value: '3-5-2', label: '3-5-2' },
  { value: '3-4-3', label: '3-4-3' },
  { value: '4-1-4-1', label: '4-1-4-1' },
  { value: '4-5-1', label: '4-5-1' },
  { value: '5-3-2', label: '5-3-2' },
  { value: '5-4-1', label: '5-4-1' },
];

export const formationPositions = {
  '4-3-3': [
    { position: 'GK', x: 50, y: 90 },
    { position: 'LB', x: 15, y: 70 },
    { position: 'CB', x: 35, y: 75 },
    { position: 'CB', x: 65, y: 75 },
    { position: 'RB', x: 85, y: 70 },
    { position: 'CM', x: 25, y: 50 },
    { position: 'CM', x: 50, y: 45 },
    { position: 'CM', x: 75, y: 50 },
    { position: 'LW', x: 15, y: 25 },
    { position: 'ST', x: 50, y: 15 },
    { position: 'RW', x: 85, y: 25 },
  ],
  '4-4-2': [
    { position: 'GK', x: 50, y: 90 },
    { position: 'LB', x: 15, y: 70 },
    { position: 'CB', x: 35, y: 75 },
    { position: 'CB', x: 65, y: 75 },
    { position: 'RB', x: 85, y: 70 },
    { position: 'LM', x: 15, y: 45 },
    { position: 'CM', x: 35, y: 50 },
    { position: 'CM', x: 65, y: 50 },
    { position: 'RM', x: 85, y: 45 },
    { position: 'ST', x: 35, y: 20 },
    { position: 'ST', x: 65, y: 20 },
  ],
  '4-2-3-1': [
    { position: 'GK', x: 50, y: 90 },
    { position: 'LB', x: 15, y: 70 },
    { position: 'CB', x: 35, y: 75 },
    { position: 'CB', x: 65, y: 75 },
    { position: 'RB', x: 85, y: 70 },
    { position: 'CDM', x: 35, y: 55 },
    { position: 'CDM', x: 65, y: 55 },
    { position: 'LW', x: 20, y: 35 },
    { position: 'CAM', x: 50, y: 35 },
    { position: 'RW', x: 80, y: 35 },
    { position: 'ST', x: 50, y: 15 },
  ],
};

export const positions = [
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'
];

export const trainingTypes = [
  'regular', 'tactical', 'physical', 'recovery', 'match_prep', 'friendly'
];

export const attendanceStatuses = [
  'present', 'absent', 'late', 'excused', 'injured'
];

export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const generateInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last;
};
