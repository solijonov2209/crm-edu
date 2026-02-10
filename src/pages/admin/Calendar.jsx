import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { trainingsAPI, matchesAPI, teamsAPI } from '../../utils/api';
import { Card, Loading, Select, Badge } from '../../components/common';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trophy, Dumbbell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Calendar = () => {
  const { t } = useTranslation();
  const { user, isCoach } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTeam, setSelectedTeam] = useState(() => {
    if (isCoach) {
      const coachTeams = user?.teams?.length > 0 ? user.teams : (user?.team ? [user.team] : []);
      return coachTeams[0]?._id || '';
    }
    return '';
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.getAll({ limit: 100 }),
    select: (res) => res.data.teams,
  });

  // Get first and last day of the month for querying
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const { data: trainingsData, isLoading: trainingsLoading } = useQuery({
    queryKey: ['trainings-calendar', currentDate.getFullYear(), currentDate.getMonth(), selectedTeam],
    queryFn: () => trainingsAPI.getAll({
      team: selectedTeam || undefined,
      startDate: monthStart.toISOString().split('T')[0],
      endDate: monthEnd.toISOString().split('T')[0],
      limit: 100
    }),
    select: (res) => res.data.trainings,
  });

  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches-calendar', currentDate.getFullYear(), currentDate.getMonth(), selectedTeam],
    queryFn: () => matchesAPI.getAll({
      team: selectedTeam || undefined,
      startDate: monthStart.toISOString().split('T')[0],
      endDate: monthEnd.toISOString().split('T')[0],
      limit: 100
    }),
    select: (res) => res.data.matches,
  });

  const teamOptions = isCoach
    ? (() => {
        const coachTeams = user?.teams?.length > 0 ? user.teams : (user?.team ? [user.team] : []);
        return coachTeams.map(team => ({
          value: team._id,
          label: `${team.name}${team.ageCategory ? ` (${team.ageCategory})` : ''}`
        }));
      })()
    : [
        { value: '', label: t('common.all') },
        ...(teamsData || []).map(team => ({
          value: team._id,
          label: team.name
        }))
      ];

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        day,
        isCurrentMonth: true,
        isToday: new Date().toDateString() === date.toDateString()
      });
    }

    // Add empty cells to complete the grid
    const remainingCells = 42 - days.length; // 6 rows * 7 days
    for (let i = 0; i < remainingCells; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const events = {};

    trainingsData?.forEach(training => {
      const dateKey = new Date(training.date).toDateString();
      if (!events[dateKey]) events[dateKey] = [];
      events[dateKey].push({
        type: 'training',
        data: training,
        time: training.startTime
      });
    });

    matchesData?.forEach(match => {
      const dateKey = new Date(match.matchDate).toDateString();
      if (!events[dateKey]) events[dateKey] = [];
      events[dateKey].push({
        type: 'match',
        data: match,
        time: match.kickoffTime
      });
    });

    // Sort events by time
    Object.keys(events).forEach(dateKey => {
      events[dateKey].sort((a, b) => {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
    });

    return events;
  }, [trainingsData, matchesData]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    t('months.january'), t('months.february'), t('months.march'),
    t('months.april'), t('months.may'), t('months.june'),
    t('months.july'), t('months.august'), t('months.september'),
    t('months.october'), t('months.november'), t('months.december')
  ];

  const dayNames = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

  const isLoading = trainingsLoading || matchesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
          <p className="text-gray-500">{t('calendar.description')}</p>
        </div>
        <Select
          options={teamOptions}
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="w-full sm:w-64"
        />
      </div>

      {/* Calendar Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            {t('calendar.today')}
          </button>
        </div>

        {isLoading ? (
          <Loading />
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((day, index) => (
                <div key={index} className="text-center py-2 text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const dateEvents = day.date ? eventsByDate[day.date.toDateString()] || [] : [];

                return (
                  <div
                    key={index}
                    className={`min-h-[100px] p-1 border rounded-lg ${
                      day.isCurrentMonth
                        ? day.isToday
                          ? 'bg-primary-50 border-primary-300'
                          : 'bg-white border-gray-200'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    {day.isCurrentMonth && (
                      <>
                        <div className={`text-sm font-medium mb-1 ${
                          day.isToday ? 'text-primary-600' : 'text-gray-700'
                        }`}>
                          {day.day}
                        </div>
                        <div className="space-y-1">
                          {dateEvents.slice(0, 3).map((event, eventIndex) => (
                            <div
                              key={eventIndex}
                              className={`text-xs p-1 rounded truncate ${
                                event.type === 'training'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                              title={event.type === 'training'
                                ? `${event.time} - ${t('trainings.title')}: ${event.data.team?.name}`
                                : `${event.time} - ${event.data.team?.name} vs ${event.data.opponent?.name}`
                              }
                            >
                              {event.type === 'training' ? (
                                <span className="flex items-center gap-1">
                                  <Dumbbell className="w-3 h-3" />
                                  {event.time}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Trophy className="w-3 h-3" />
                                  {event.time}
                                </span>
                              )}
                            </div>
                          ))}
                          {dateEvents.length > 3 && (
                            <div className="text-xs text-gray-500 pl-1">
                              +{dateEvents.length - 3} {t('calendar.more')}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 rounded" />
                <span className="text-sm text-gray-600">{t('trainings.title')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 rounded" />
                <span className="text-sm text-gray-600">{t('matches.title')}</span>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Upcoming Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Trainings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">{t('calendar.upcomingTrainings')}</h3>
          </div>
          <div className="space-y-3">
            {trainingsData?.filter(t => new Date(t.date) >= new Date()).slice(0, 5).map((training) => (
              <div key={training._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-center min-w-[50px]">
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(training.date).getDate()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {monthNames[new Date(training.date).getMonth()]?.slice(0, 3)}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{training.team?.name}</p>
                  <p className="text-sm text-gray-500">{training.startTime} - {training.endTime}</p>
                </div>
                <Badge className={
                  training.status === 'completed' ? 'bg-green-100 text-green-700' :
                  training.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }>
                  {t(`trainings.statuses.${training.status}`)}
                </Badge>
              </div>
            )) || (
              <p className="text-gray-500 text-sm text-center py-4">{t('common.noData')}</p>
            )}
          </div>
        </Card>

        {/* Upcoming Matches */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">{t('calendar.upcomingMatches')}</h3>
          </div>
          <div className="space-y-3">
            {matchesData?.filter(m => new Date(m.matchDate) >= new Date()).slice(0, 5).map((match) => (
              <div key={match._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="text-center min-w-[50px]">
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(match.matchDate).getDate()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {monthNames[new Date(match.matchDate).getMonth()]?.slice(0, 3)}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {match.team?.name} vs {match.opponent?.name}
                  </p>
                  <p className="text-sm text-gray-500">{match.kickoffTime} - {match.venue}</p>
                </div>
                <Badge className={
                  match.status === 'completed' ? 'bg-green-100 text-green-700' :
                  match.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }>
                  {t(`matches.statuses.${match.status}`)}
                </Badge>
              </div>
            )) || (
              <p className="text-gray-500 text-sm text-center py-4">{t('common.noData')}</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Calendar;
