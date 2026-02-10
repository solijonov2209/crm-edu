import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Menu, Bell, Calendar, Trophy, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { trainingsAPI, matchesAPI } from '../../utils/api';
import { formatDate } from '../../utils/helpers';
import { Modal, Badge } from '../common';

// Flag components
const FlagUZ = () => (
  <svg className="w-5 h-4 rounded-sm" viewBox="0 0 640 480">
    <path fill="#1eb53a" d="M0 320h640v160H0z"/>
    <path fill="#0099b5" d="M0 0h640v160H0z"/>
    <path fill="#ce1126" d="M0 153.6h640v172.8H0z"/>
    <path fill="#fff" d="M0 163.2h640v153.6H0z"/>
    <circle fill="#fff" cx="134" cy="80" r="40"/>
    <circle fill="#0099b5" cx="148" cy="80" r="32"/>
    <g fill="#fff" transform="translate(196 80)">
      {[...Array(12)].map((_, i) => (
        <circle key={i} r="6" cx={Math.cos(i * 30 * Math.PI / 180) * 48} cy={Math.sin(i * 30 * Math.PI / 180) * 48 - 48}/>
      ))}
    </g>
  </svg>
);

const FlagRU = () => (
  <svg className="w-5 h-4 rounded-sm" viewBox="0 0 640 480">
    <path fill="#fff" d="M0 0h640v160H0z"/>
    <path fill="#0039a6" d="M0 160h640v160H0z"/>
    <path fill="#d52b1e" d="M0 320h640v160H0z"/>
  </svg>
);

const FlagGB = () => (
  <svg className="w-5 h-4 rounded-sm" viewBox="0 0 640 480">
    <path fill="#012169" d="M0 0h640v480H0z"/>
    <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z"/>
    <path fill="#C8102E" d="m424 281 216 159v40L369 281h55zm-184 20 6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z"/>
    <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z"/>
    <path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z"/>
  </svg>
);

const Header = ({ onMenuClick }) => {
  const { t, i18n } = useTranslation();
  const { user, isCoach } = useAuth();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const languages = [
    { code: 'uz', name: "O'zbek", Flag: FlagUZ },
    { code: 'ru', name: 'Русский', Flag: FlagRU },
    { code: 'en', name: 'English', Flag: FlagGB },
  ];

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setLangMenuOpen(false);
  };

  // Memoize date calculations
  const { todayStr, twoDaysLaterStr, today } = useMemo(() => {
    const now = new Date();
    const later = new Date(now);
    later.setDate(later.getDate() + 2);
    return {
      today: now,
      todayStr: now.toISOString().split('T')[0],
      twoDaysLaterStr: later.toISOString().split('T')[0]
    };
  }, []);

  // Team IDs for queries - support multiple teams for coaches
  // For coaches with multiple teams, we fetch all notifications (no team filter)
  // so they see notifications for all their assigned teams
  const coachTeams = user?.teams?.length > 0 ? user.teams : (user?.team ? [user.team] : []);
  // If coach has only 1 team, filter by that team; otherwise fetch all their team notifications
  const teamId = isCoach ? (coachTeams.length === 1 ? coachTeams[0]._id : undefined) : undefined;

  // Fetch upcoming trainings (within 2 days)
  const { data: upcomingTrainings } = useQuery({
    queryKey: ['upcoming-trainings', teamId, todayStr],
    queryFn: () => trainingsAPI.getAll({
      team: teamId,
      startDate: todayStr,
      endDate: twoDaysLaterStr,
      status: 'scheduled',
      limit: 10
    }),
    select: (res) => res.data?.trainings || [],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch upcoming matches (within 2 days)
  const { data: upcomingMatches } = useQuery({
    queryKey: ['upcoming-matches', teamId, todayStr],
    queryFn: () => matchesAPI.getAll({
      team: teamId,
      startDate: todayStr,
      endDate: twoDaysLaterStr,
      status: 'scheduled',
      limit: 10
    }),
    select: (res) => res.data?.matches || [],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Memoize notifications to prevent recalculation on every render
  const notifications = useMemo(() => {
    const trainings = (upcomingTrainings || []).map(tr => ({
      id: tr._id,
      type: 'training',
      title: tr.team?.name,
      date: tr.date,
      time: tr.startTime,
      location: tr.location,
      data: tr
    }));

    const matches = (upcomingMatches || []).map(m => ({
      id: m._id,
      type: 'match',
      title: `${m.team?.name} vs ${m.opponent?.name}`,
      date: m.matchDate,
      time: m.kickoffTime,
      venue: m.venue,
      isHome: m.isHome,
      data: m
    }));

    return [...trainings, ...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [upcomingTrainings, upcomingMatches]);

  // Check if event is today
  const isToday = (dateStr) => {
    const eventDate = new Date(dateStr).toDateString();
    return eventDate === today.toDateString();
  };

  // Check if event is tomorrow
  const isTomorrow = (dateStr) => {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eventDate = new Date(dateStr).toDateString();
    return eventDate === tomorrow.toDateString();
  };

  // Get days until event
  const getDaysLabel = (dateStr) => {
    if (isToday(dateStr)) return t('notifications.today');
    if (isTomorrow(dateStr)) return t('notifications.tomorrow');
    return t('notifications.inDays', { days: 2 });
  };

  const notificationCount = notifications.length;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-full px-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <currentLang.Flag />
              <span className="hidden sm:inline">{currentLang.name}</span>
            </button>

            {langMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setLangMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 z-20 py-1">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 ${
                        i18n.language === lang.code ? 'text-primary-600 bg-primary-50' : 'text-gray-700'
                      }`}
                    >
                      <lang.Flag />
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                {notificationCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications Modal */}
      <Modal
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        title={t('notifications.title')}
        size="large"
      >
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('notifications.noUpcoming')}
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-lg border-l-4 ${
                  notif.type === 'match'
                    ? 'bg-orange-50 border-orange-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      notif.type === 'match' ? 'bg-orange-100' : 'bg-blue-100'
                    }`}>
                      {notif.type === 'match' ? (
                        <Trophy className="w-5 h-5 text-orange-600" />
                      ) : (
                        <Calendar className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{notif.title}</h4>
                        <Badge className={isToday(notif.date) ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                          {getDaysLabel(notif.date)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {notif.type === 'match' ? t('matches.title') : t('trainings.title')}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(notif.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {notif.time}
                        </span>
                      </div>
                      {(notif.location || notif.venue) && (
                        <p className="text-sm text-gray-500 mt-1">
                          📍 {notif.location || notif.venue}
                          {notif.type === 'match' && (
                            <span className="ml-2">
                              ({notif.isHome ? t('matches.home') : t('matches.away')})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </header>
  );
};

export default Header;
