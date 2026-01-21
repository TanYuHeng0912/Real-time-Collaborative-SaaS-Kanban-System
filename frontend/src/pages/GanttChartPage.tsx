import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { boardService } from '@/services/boardService';
import { CardDTO } from '@/types';
import Navigation from '@/components/Navigation';
import { useEffect, useMemo } from 'react';

export default function GanttChartPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();

  const { data: board, isLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => boardService.getBoardById(Number(boardId)),
    enabled: !!boardId,
  });

  // Collect all cards with due dates
  const cardsWithDueDates = useMemo(() => {
    if (!board) return [];
    const cards: (CardDTO & { listName: string })[] = [];
    board.lists.forEach(list => {
      list.cards
        .filter(card => card.dueDate)
        .forEach(card => {
          cards.push({ ...card, listName: list.name });
        });
    });
    return cards.sort((a, b) => {
      const dateA = new Date(a.dueDate!).getTime();
      const dateB = new Date(b.dueDate!).getTime();
      return dateA - dateB;
    });
  }, [board]);

  // Calculate date range
  const dateRange = useMemo(() => {
    if (cardsWithDueDates.length === 0) return { min: new Date(), max: new Date() };
    
    const dates = cardsWithDueDates.map(card => new Date(card.dueDate!));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add padding
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 7);
    
    return { min, max };
  }, [cardsWithDueDates]);

  const daysInRange = useMemo(() => {
    const diffTime = Math.abs(dateRange.max.getTime() - dateRange.min.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [dateRange]);

  // Determine view type based on date range
  type ViewType = 'daily' | 'weekly' | 'monthly' | 'yearly';
  const viewType: ViewType = useMemo(() => {
    if (daysInRange <= 30) return 'daily';
    if (daysInRange <= 90) return 'weekly';
    if (daysInRange <= 365) return 'monthly';
    return 'yearly';
  }, [daysInRange]);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'HIGH':
        return '#ef4444'; // red-500
      case 'LOW':
        return '#3b82f6'; // blue-500
      case 'DONE':
        return '#22c55e'; // green-500
      case 'MEDIUM':
      default:
        return '#eab308'; // yellow-500
    }
  };

  const getPositionForDate = (date: Date) => {
    const diffTime = date.getTime() - dateRange.min.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return (diffDays / daysInRange) * 100;
  };

  // Generate time labels based on view type (must be before early returns)
  const timeLabels = useMemo(() => {
    const labels: { date: Date; label: string; isWeekend?: boolean; isFirstOfPeriod?: boolean }[] = [];
    
    if (viewType === 'daily') {
      // Daily view: show each day
      const currentDate = new Date(dateRange.min);
      while (currentDate <= dateRange.max) {
        labels.push({
          date: new Date(currentDate),
          label: currentDate.getDate().toString(),
          isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
          isFirstOfPeriod: currentDate.getDate() === 1,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (viewType === 'weekly') {
      // Weekly view: show each week (start of week - Sunday)
      const currentDate = new Date(dateRange.min);
      // Move to start of week (Sunday)
      const dayOfWeek = currentDate.getDay();
      currentDate.setDate(currentDate.getDate() - dayOfWeek);
      
      // Adjust to ensure we don't go before min date
      if (currentDate < dateRange.min) {
        currentDate.setDate(currentDate.getDate() + 7);
      }
      
      while (currentDate <= dateRange.max) {
        labels.push({
          date: new Date(currentDate),
          label: `${currentDate.getMonth() + 1}/${currentDate.getDate()}`,
          isFirstOfPeriod: currentDate.getDate() <= 7 && currentDate.getMonth() === dateRange.min.getMonth(),
        });
        currentDate.setDate(currentDate.getDate() + 7);
      }
    } else if (viewType === 'monthly') {
      // Monthly view: show each month
      const currentDate = new Date(dateRange.min.getFullYear(), dateRange.min.getMonth(), 1);
      while (currentDate <= dateRange.max) {
        labels.push({
          date: new Date(currentDate),
          label: currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          isFirstOfPeriod: currentDate.getMonth() === 0, // January
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    } else {
      // Yearly view: show each year
      const currentYear = dateRange.min.getFullYear();
      const endYear = dateRange.max.getFullYear();
      for (let year = currentYear; year <= endYear; year++) {
        labels.push({
          date: new Date(year, 0, 1),
          label: year.toString(),
          isFirstOfPeriod: true,
        });
      }
    }
    
    return labels;
  }, [dateRange, viewType]);

  // Group by periods for header display (months/years) (must be before early returns)
  const periodGroups = useMemo(() => {
    if (viewType === 'yearly') {
      return timeLabels.map(label => ({
        label: label.label,
        startDate: label.date,
        endDate: new Date(label.date.getFullYear() + 1, 0, 1),
      }));
    } else if (viewType === 'monthly') {
      return timeLabels.map(label => ({
        label: label.label,
        startDate: label.date,
        endDate: new Date(label.date.getFullYear(), label.date.getMonth() + 1, 1),
      }));
    } else {
      // For daily/weekly, group by month
      const monthMap = new Map<string, Date[]>();
      const currentDate = new Date(dateRange.min);
      while (currentDate <= dateRange.max) {
        const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, []);
        }
        monthMap.get(monthKey)!.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return Array.from(monthMap.entries()).map(([key, days]) => {
        const [year, month] = key.split('-').map(Number);
        const monthName = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'short' });
        return {
          label: `${monthName} ${year}`,
          startDate: days[0],
          endDate: new Date(year, month + 1, 1),
        };
      });
    }
  }, [dateRange, viewType, timeLabels]);

  const formatDate = (date: Date) => {
    if (viewType === 'yearly') {
      return date.getFullYear().toString();
    } else if (viewType === 'monthly') {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Redirect if no boardId
  useEffect(() => {
    if (!boardId) {
      navigate('/dashboard');
    }
  }, [boardId, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Board not found</div>
        </div>
      </div>
    );
  }

  if (cardsWithDueDates.length === 0) {
    return (
      <div className="h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{board.name} - Gantt Chart</h1>
            <p className="text-gray-500 mt-1">No cards with due dates found</p>
          </div>
          <button
            onClick={() => navigate(`/dashboard/${boardId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Board
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Navigation />
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{board.name} - Gantt Chart</h1>
            <p className="text-gray-500 mt-1">
              {cardsWithDueDates.length} card{cardsWithDueDates.length !== 1 ? 's' : ''} with due dates
            </p>
          </div>
          <button
            onClick={() => navigate(`/dashboard/${boardId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Board
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Period Header Row (Month/Year) */}
          {periodGroups.length > 0 && (
            <div className="border-b-2 border-gray-300 bg-gray-100">
              <div className="relative h-10">
                {periodGroups.map((period, idx) => {
                  const startPos = getPositionForDate(period.startDate);
                  const endPos = getPositionForDate(new Date(Math.min(period.endDate.getTime() - 1, dateRange.max.getTime())));
                  const width = Math.max(0, endPos - startPos);
                  
                  return (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 border-r-2 border-gray-400 bg-gray-100 text-center flex items-center justify-center"
                      style={{
                        left: `${startPos}%`,
                        width: `${width}%`,
                      }}
                    >
                      <span className="font-semibold text-gray-800 text-sm">
                        {period.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time Label Row (Day/Week/Month/Year) */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="relative" style={{ minHeight: viewType === 'yearly' ? '40px' : '50px' }}>
              {timeLabels.map((label, idx) => {
                const position = getPositionForDate(label.date);
                const nextPosition = idx < timeLabels.length - 1 
                  ? getPositionForDate(timeLabels[idx + 1].date)
                  : 100;
                const width = Math.max(2, nextPosition - position); // Minimum 2% width
                
                return (
                  <div
                    key={idx}
                    className={`absolute top-0 bottom-0 border-r border-gray-300 text-xs text-center py-1 ${
                      label.isWeekend ? 'bg-gray-100' : 'bg-white'
                    } ${label.isFirstOfPeriod ? 'border-l-2 border-gray-400' : ''}`}
                    style={{
                      left: `${Math.max(0, position)}%`,
                      width: `${width}%`,
                      minWidth: viewType === 'daily' ? '20px' : viewType === 'yearly' ? '60px' : '40px',
                    }}
                  >
                    <div className="font-medium text-gray-700 truncate px-1">{label.label}</div>
                    {viewType === 'daily' && (
                      <div className="text-xs text-gray-500">
                        {label.date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 1)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cards */}
          <div className="relative" style={{ minHeight: `${cardsWithDueDates.length * 70}px` }}>
            {cardsWithDueDates.map((card, idx) => {
              const dueDate = new Date(card.dueDate!);
              const position = getPositionForDate(dueDate);
              const width = Math.max(3, (2 / daysInRange) * 100); // Wider bars for better visibility
              const priorityColor = getPriorityColor(card.priority);

              return (
                <div
                  key={card.id}
                  className="absolute border-t border-gray-200 hover:bg-gray-50 transition-colors"
                  style={{
                    top: `${idx * 70}px`,
                    height: '66px',
                    width: '100%',
                  }}
                >
                  {/* Left side - Card info */}
                  <div className="h-full flex items-center px-4 absolute left-0" style={{ width: '250px', backgroundColor: 'white', zIndex: 10 }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate mb-1">
                        {card.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {card.listName}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {card.assignedUserNames && card.assignedUserNames.length > 0 
                          ? card.assignedUserNames.join(', ') 
                          : 'Unassigned'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Gantt Bar Area */}
                  <div className="absolute left-64 right-0 top-0 bottom-0">
                    {/* Gantt Bar */}
                    <div
                      className="absolute top-3 rounded px-3 py-2 text-white text-xs font-medium shadow-md hover:shadow-lg transition-shadow cursor-pointer z-10"
                      style={{
                        left: `${Math.max(0, position)}%`,
                        width: `${Math.min(width, 100 - position)}%`,
                        backgroundColor: priorityColor,
                        minWidth: '100px',
                      }}
                      title={`${card.title} - Due: ${formatDate(dueDate)} - ${card.priority || 'MEDIUM'} Priority`}
                      onClick={() => navigate(`/dashboard/${boardId}`)}
                    >
                      <div className="font-semibold truncate mb-1">{card.title}</div>
                      <div className="text-xs opacity-95">{formatDate(dueDate)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Priority Legend</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
              <span className="text-sm text-gray-600">High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }}></div>
              <span className="text-sm text-gray-600">Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
              <span className="text-sm text-gray-600">Low Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
              <span className="text-sm text-gray-600">Done</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

