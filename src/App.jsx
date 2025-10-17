import { useState, useEffect } from 'react'

function App() {
  // State for tasks - load from localStorage or start with empty array
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem('lockin-tasks')
    return savedTasks ? JSON.parse(savedTasks) : []
  })
  
  const [newTaskText, setNewTaskText] = useState('')
  const [view, setView] = useState('daily') // 'daily', 'weekly', 'monthly', 'stats', 'checkin'
  const [draggedTask, setDraggedTask] = useState(null)
  const [editingTask, setEditingTask] = useState(null) // Task being edited for multi-day selection
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0) // 0 = this week, -1 = last week, 1 = next week
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  
  // Check-ins state - load from localStorage
  const [checkIns, setCheckIns] = useState(() => {
    const savedCheckIns = localStorage.getItem('lockin-checkins')
    return savedCheckIns ? JSON.parse(savedCheckIns) : []
  })

  // Migrate old tasks to new structure
  useEffect(() => {
    const needsMigration = tasks.some(task => 
      !task.assignedDates || 
      task.assignedDate || 
      task.isRecurring === undefined ||
      !task.completionHistory
    )
    if (needsMigration) {
      const migratedTasks = tasks.map(task => {
        let migratedTask = { ...task }
        
        // Convert old assignedDate to array
        if (task.assignedDate && !task.assignedDates) {
          const { assignedDate, ...rest } = task
          migratedTask = { ...rest, assignedDates: [assignedDate] }
        }
        
        // Default to today if no dates
        if (!migratedTask.assignedDates) {
          migratedTask.assignedDates = [getTodayString()]
        }
        
        // Add recurring fields if missing
        if (migratedTask.isRecurring === undefined) {
          migratedTask.isRecurring = false
          migratedTask.recurringDays = []
        }
        
        // Add completion history if missing
        if (!migratedTask.completionHistory) {
          migratedTask.completionHistory = []
        }
        
        return migratedTask
      })
      setTasks(migratedTasks)
    }
  }, []) // Run once on mount

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('lockin-tasks', JSON.stringify(tasks))
  }, [tasks])

  // Save check-ins to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('lockin-checkins', JSON.stringify(checkIns))
  }, [checkIns])

  // Helper: Get date string in YYYY-MM-DD format
  const getDateString = (date) => {
    return date.toISOString().split('T')[0]
  }

  const getTodayString = () => getDateString(new Date())

  // Add a new task (defaults to today)
  const addTask = (e, assignedDates = null) => {
    if (e) e.preventDefault()
    if (newTaskText.trim() === '') return
    
    const newTask = {
      id: Date.now(),
      text: newTaskText,
      completed: false,
      createdAt: new Date().toISOString(),
      assignedDates: assignedDates || [getTodayString()],
      isRecurring: false,
      recurringDays: [],
      completionHistory: []
    }
    
    setTasks([...tasks, newTask])
    setNewTaskText('')
  }

  // Toggle task completion (with history tracking)
  const toggleTask = (id, date = getTodayString()) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const newCompleted = !task.completed
        const history = task.completionHistory || []
        
        // Update or add completion record for this date
        const existingIndex = history.findIndex(h => h.date === date)
        let newHistory = [...history]
        
        if (existingIndex >= 0) {
          newHistory[existingIndex] = { date, completed: newCompleted, timestamp: new Date().toISOString() }
        } else {
          newHistory.push({ date, completed: newCompleted, timestamp: new Date().toISOString() })
        }
        
        return { ...task, completed: newCompleted, completionHistory: newHistory }
      }
      return task
    }))
  }

  // Delete a task
  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id))
  }

  // Clear all completed tasks
  const clearCompleted = () => {
    setTasks(tasks.filter(task => !task.completed))
  }

  // Reset all tasks to incomplete
  const resetTasks = () => {
    setTasks(tasks.map(task => ({ ...task, completed: false })))
  }

  // Change task's assigned date (for drag and drop)
  const moveTaskToDate = (taskId, newDate) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        // If task doesn't have this date, add it
        if (!task.assignedDates.includes(newDate)) {
          return { ...task, assignedDates: [...task.assignedDates, newDate] }
        }
        return task
      }
      return task
    }))
  }

  // Toggle a date for a task
  const toggleTaskDate = (taskId, date) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        if (task.assignedDates.includes(date)) {
          // Remove date (but keep at least one)
          const newDates = task.assignedDates.filter(d => d !== date)
          return { ...task, assignedDates: newDates.length > 0 ? newDates : [getTodayString()] }
        } else {
          // Add date
          return { ...task, assignedDates: [...task.assignedDates, date] }
        }
      }
      return task
    }))
  }

  // Drag and drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, date) => {
    e.preventDefault()
    if (draggedTask) {
      moveTaskToDate(draggedTask.id, date)
      setDraggedTask(null)
    }
  }

  // Get week days starting from Monday (with week offset support)
  const getWeekDays = () => {
    const days = []
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(today)
    
    // Adjust to Monday (0 = Sunday, so subtract accordingly)
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1
    monday.setDate(today.getDate() - daysFromMonday)
    
    // Add week offset
    monday.setDate(monday.getDate() + (currentWeekOffset * 7))
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday)
      day.setDate(monday.getDate() + i)
      days.push({
        date: getDateString(day),
        name: day.toLocaleDateString('no-NO', { weekday: 'short' }),
        dayNum: day.getDate(),
        monthName: day.toLocaleDateString('no-NO', { month: 'short' }),
        isToday: getDateString(day) === getTodayString()
      })
    }
    return days
  }

  // Get month days for calendar view
  const getMonthDays = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // Get the Monday before or on the 1st
    const startDate = new Date(firstDay)
    const firstDayOfWeek = firstDay.getDay()
    const daysToMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
    startDate.setDate(firstDay.getDate() - daysToMonday)
    
    // Get enough weeks to cover the month
    const days = []
    const currentDate = new Date(startDate)
    
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const date = new Date(currentDate)
        days.push({
          date: getDateString(date),
          dayNum: date.getDate(),
          month: date.getMonth(),
          isCurrentMonth: date.getMonth() === month,
          isToday: getDateString(date) === getTodayString()
        })
        currentDate.setDate(currentDate.getDate() + 1)
      }
      // Stop if we've passed the last day of the month
      if (currentDate > lastDay && currentDate.getDay() === 1) break
    }
    
    return { days, monthName: today.toLocaleDateString('no-NO', { month: 'long', year: 'numeric' }) }
  }

  // Duplicate previous week's tasks to current week
  const duplicatePreviousWeek = () => {
    const prevWeekOffset = currentWeekOffset - 1
    const prevMonday = new Date()
    const currentDay = prevMonday.getDay()
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1
    prevMonday.setDate(prevMonday.getDate() - daysFromMonday + (prevWeekOffset * 7))
    
    const currentMonday = new Date(prevMonday)
    currentMonday.setDate(currentMonday.getDate() + 7)
    
    const prevWeekDates = []
    const currentWeekDates = []
    
    for (let i = 0; i < 7; i++) {
      const prevDate = new Date(prevMonday)
      prevDate.setDate(prevMonday.getDate() + i)
      prevWeekDates.push(getDateString(prevDate))
      
      const currDate = new Date(currentMonday)
      currDate.setDate(currentMonday.getDate() + i)
      currentWeekDates.push(getDateString(currDate))
    }
    
    // Create copies of tasks from previous week
    const newTasks = []
    tasks.forEach(task => {
      const taskPrevWeekDates = task.assignedDates.filter(d => prevWeekDates.includes(d))
      if (taskPrevWeekDates.length > 0) {
        // Map previous week dates to current week dates
        const newDates = taskPrevWeekDates.map(d => {
          const dayIndex = prevWeekDates.indexOf(d)
          return currentWeekDates[dayIndex]
        })
        
        // Check if task already exists with these dates
        const existingTask = tasks.find(t => t.text === task.text && t.id !== task.id)
        if (existingTask) {
          // Add dates to existing task
          const combinedDates = [...new Set([...existingTask.assignedDates, ...newDates])]
          setTasks(tasks.map(t => t.id === existingTask.id ? { ...t, assignedDates: combinedDates } : t))
        } else {
          // Create new task
          newTasks.push({
            ...task,
            id: Date.now() + newTasks.length,
            assignedDates: newDates,
            completed: false,
            createdAt: new Date().toISOString(),
            completionHistory: []
          })
        }
      }
    })
    
    if (newTasks.length > 0) {
      setTasks([...tasks, ...newTasks])
    }
  }

  // Filter tasks by date (including recurring tasks)
  const getTasksForDate = (date) => {
    const dateObj = new Date(date + 'T00:00:00')
    const dayOfWeek = dateObj.getDay() || 7 // Convert 0 (Sunday) to 7
    
    return tasks.filter(task => {
      // Check regular assigned dates
      if (task.assignedDates && task.assignedDates.includes(date)) {
        return true
      }
      
      // Check recurring tasks
      if (task.isRecurring && task.recurringDays && task.recurringDays.includes(dayOfWeek)) {
        return true
      }
      
      return false
    })
  }

  // Toggle recurring for a task
  const toggleRecurring = (taskId, isRecurring, recurringDays = []) => {
    setTasks(tasks.map(task =>
      task.id === taskId
        ? { ...task, isRecurring, recurringDays }
        : task
    ))
  }

  // Save a check-in
  const saveCheckIn = (checkInData) => {
    const newCheckIn = {
      id: Date.now(),
      date: getTodayString(),
      ...checkInData,
      timestamp: new Date().toISOString()
    }
    
    // Replace existing check-in for today if exists
    const filtered = checkIns.filter(c => c.date !== getTodayString())
    setCheckIns([...filtered, newCheckIn])
    setShowCheckInModal(false)
  }

  // Get today's check-in
  const getTodaysCheckIn = () => {
    return checkIns.find(c => c.date === getTodayString())
  }

  // Get statistics
  const getStats = () => {
    const stats = {}
    
    tasks.forEach(task => {
      if (!stats[task.id]) {
        stats[task.id] = {
          task: task.text,
          totalAssigned: 0,
          totalCompleted: 0,
          completionRate: 0,
          history: []
        }
      }
      
      // Count from completion history
      task.completionHistory.forEach(h => {
        stats[task.id].totalAssigned++
        if (h.completed) {
          stats[task.id].totalCompleted++
        }
        stats[task.id].history.push(h)
      })
      
      // Calculate completion rate
      if (stats[task.id].totalAssigned > 0) {
        stats[task.id].completionRate = Math.round(
          (stats[task.id].totalCompleted / stats[task.id].totalAssigned) * 100
        )
      }
    })
    
    return Object.values(stats).sort((a, b) => b.totalCompleted - a.totalCompleted)
  }

  const todaysTasks = getTasksForDate(getTodayString())
  const completedCount = todaysTasks.filter(task => task.completed).length
  const totalCount = todaysTasks.length

  const getMaxWidth = () => {
    if (view === 'weekly' || view === 'monthly') return '1400px'
    if (view === 'stats') return '1000px'
    return '700px'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8" style={{ maxWidth: getMaxWidth() }}>
        {/* Header */}
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            🔒 Lock In
          </h1>
          <p className="text-white text-sm sm:text-lg opacity-90">
            Hold deg fokusert og produktiv
          </p>
          
          {/* View Toggle */}
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mt-4">
            <button
              onClick={() => setView('daily')}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-base rounded-lg font-semibold transition-all ${
                view === 'daily' 
                  ? 'bg-white text-indigo-600 shadow-lg' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              📅 <span className="hidden xs:inline">I dag</span>
            </button>
            <button
              onClick={() => setView('weekly')}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-base rounded-lg font-semibold transition-all ${
                view === 'weekly' 
                  ? 'bg-white text-indigo-600 shadow-lg' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              📆 <span className="hidden xs:inline">Uke</span>
            </button>
            <button
              onClick={() => setView('monthly')}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-base rounded-lg font-semibold transition-all ${
                view === 'monthly' 
                  ? 'bg-white text-indigo-600 shadow-lg' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              🗓️ <span className="hidden xs:inline">Måned</span>
            </button>
            <button
              onClick={() => setView('stats')}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-base rounded-lg font-semibold transition-all ${
                view === 'stats' 
                  ? 'bg-white text-indigo-600 shadow-lg' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              📊 <span className="hidden sm:inline">Stats</span>
            </button>
            <button
              onClick={() => setShowCheckInModal(true)}
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-base rounded-lg font-semibold transition-all bg-white/20 text-white hover:bg-white/30"
            >
              😊 <span className="hidden sm:inline">Check-in</span>
            </button>
          </div>
        </div>

        {/* Daily View */}
        {view === 'daily' && (
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 mb-6">
            {/* Progress Bar */}
            {totalCount > 0 && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Dagens fremgang</span>
                  <span className="font-semibold">{completedCount} / {totalCount} oppgaver</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Add Task Form */}
            <form onSubmit={addTask} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Legg til ny oppgave..."
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Legg til
                </button>
              </div>
            </form>

            {/* Task List */}
            <div className="space-y-2">
              {todaysTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg">Ingen oppgaver for i dag! 🎉</p>
                  <p className="text-sm mt-2">Gå til ukeplanen for å legge til oppgaver</p>
                </div>
              ) : (
                todaysTasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                      task.completed 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                      className="w-5 h-5 text-indigo-500 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className={`flex-1 ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {task.text}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="px-3 py-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      aria-label="Slett oppgave"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Action Buttons */}
            {todaysTasks.length > 0 && (
              <div className="mt-6 flex gap-3 justify-end">
                {completedCount > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Fjern fullførte
                  </button>
                )}
                <button
                  onClick={resetTasks}
                  className="px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  Tilbakestill alle
                </button>
              </div>
            )}
          </div>
        )}

        {/* Weekly View */}
        {view === 'weekly' && (
          <div className="bg-white rounded-2xl shadow-2xl p-3 sm:p-6 mb-6">
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-gray-200 gap-2">
              <button
                onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-base bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-all"
              >
                <span className="hidden sm:inline">← Forrige</span>
                <span className="sm:hidden">←</span>
              </button>
              
              <div className="text-center flex-1 min-w-0">
                <div className="text-xs sm:text-lg font-bold text-gray-800 truncate">
                  {getWeekDays()[0]?.monthName} {getWeekDays()[0]?.dayNum} - {getWeekDays()[6]?.monthName} {getWeekDays()[6]?.dayNum}
                </div>
                {currentWeekOffset === 0 && (
                  <div className="text-xs sm:text-sm text-indigo-600 font-semibold">Denne uken</div>
                )}
                {currentWeekOffset < 0 && (
                  <div className="text-xs sm:text-sm text-gray-600">{Math.abs(currentWeekOffset)} {Math.abs(currentWeekOffset) === 1 ? 'uke' : 'uker'} siden</div>
                )}
                {currentWeekOffset > 0 && (
                  <div className="text-xs sm:text-sm text-gray-600">{currentWeekOffset} {currentWeekOffset === 1 ? 'uke' : 'uker'} frem</div>
                )}
              </div>
              
              <button
                onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-base bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-all"
              >
                <span className="hidden sm:inline">Neste →</span>
                <span className="sm:hidden">→</span>
              </button>
            </div>

            {/* Duplicate Previous Week Button */}
            <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
              <button
                onClick={duplicatePreviousWeek}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-base bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-semibold transition-all"
              >
                📋 <span className="hidden sm:inline">Dupliser forrige uke</span><span className="sm:hidden">Kopier uke</span>
              </button>
              {currentWeekOffset !== 0 && (
                <button
                  onClick={() => setCurrentWeekOffset(0)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-base bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-semibold transition-all"
                >
                  <span className="hidden sm:inline">Gå til denne uken</span><span className="sm:hidden">I dag</span>
                </button>
              )}
            </div>

            {/* Add Task Form for Week View */}
            <form onSubmit={addTask} className="mb-4 sm:mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Legg til oppgave..."
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  className="px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  <span className="hidden sm:inline">Legg til</span>
                  <span className="sm:hidden">+</span>
                </button>
              </div>
            </form>

            {/* Week Grid - Horizontal scroll on mobile */}
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <div className="grid grid-cols-7 gap-2 sm:gap-3 min-w-[640px] sm:min-w-0">
              {getWeekDays().map(day => {
                const dayTasks = getTasksForDate(day.date)
                return (
                  <div
                    key={day.date}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day.date)}
                    className={`rounded-lg border-2 p-2 sm:p-3 min-h-[250px] sm:min-h-[300px] transition-all ${
                      day.isToday 
                        ? 'bg-indigo-50 border-indigo-300 shadow-md' 
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Day Header */}
                    <div className="text-center mb-2 sm:mb-3 pb-2 border-b-2 border-gray-200">
                      <div className={`text-xs font-semibold uppercase ${day.isToday ? 'text-indigo-600' : 'text-gray-600'}`}>
                        {day.name}
                      </div>
                      <div className={`text-xl sm:text-2xl font-bold mt-1 ${day.isToday ? 'text-indigo-700' : 'text-gray-800'}`}>
                        {day.dayNum}
                      </div>
                      {day.isToday && (
                        <div className="text-xs text-indigo-600 font-semibold mt-1">I DAG</div>
                      )}
                    </div>

                    {/* Tasks for this day */}
                    <div className="space-y-2">
                      {dayTasks.map(task => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onClick={() => setEditingTask(task)}
                          className={`p-2 rounded border cursor-pointer transition-all hover:shadow-md ${
                            task.completed 
                              ? 'bg-gray-100 border-gray-300 opacity-60' 
                              : 'bg-white border-gray-300 hover:border-indigo-400'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={(e) => {
                                e.stopPropagation()
                                toggleTask(task.id)
                              }}
                              className="mt-0.5 w-4 h-4 text-indigo-500 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                            />
                            <span className={`text-sm flex-1 break-words ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                              {task.text}
                              {task.isRecurring && (
                                <span className="ml-1 text-xs text-purple-600 font-semibold">
                                  🔄
                                </span>
                              )}
                              {!task.isRecurring && task.assignedDates.length > 1 && (
                                <span className="ml-1 text-xs text-indigo-600 font-semibold">
                                  ({task.assignedDates.length} dager)
                                </span>
                              )}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteTask(task.id)
                              }}
                              className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                              aria-label="Slett"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-sm text-indigo-800">
                💡 <strong>Tips:</strong> Klikk på en oppgave for å velge flere dager. Dra og slipp for å legge til en dag. Oppgaver for dagens dato vises automatisk i "I dag"-visningen.
              </p>
            </div>
          </div>
        )}

        {/* Multi-day Selection Modal */}
        {editingTask && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setEditingTask(null)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1">Velg dager</h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{editingTask.text}</p>
                </div>
                <button
                  onClick={() => setEditingTask(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-2 flex-shrink-0"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 mb-3 sm:mb-4">
                {getWeekDays().map(day => (
                  <label
                    key={day.date}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      editingTask.assignedDates.includes(day.date)
                        ? 'bg-indigo-50 border-indigo-500'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editingTask.assignedDates.includes(day.date)}
                      onChange={() => {
                        toggleTaskDate(editingTask.id, day.date)
                        // Update local editingTask state to reflect changes
                        setEditingTask({
                          ...editingTask,
                          assignedDates: editingTask.assignedDates.includes(day.date)
                            ? editingTask.assignedDates.filter(d => d !== day.date).length > 0
                              ? editingTask.assignedDates.filter(d => d !== day.date)
                              : [getTodayString()]
                            : [...editingTask.assignedDates, day.date]
                        })
                      }}
                      className="w-5 h-5 text-indigo-500 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">
                        {day.name} {day.dayNum}
                      </div>
                      {day.isToday && (
                        <div className="text-xs text-indigo-600 font-semibold">I dag</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* Recurring Option */}
              <div className="p-3 sm:p-4 bg-purple-50 rounded-lg border-2 border-purple-200 mb-3 sm:mb-4">
                <label className="flex items-start gap-2 sm:gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTask.isRecurring}
                    onChange={(e) => {
                      const isRecurring = e.target.checked
                      const recurringDays = isRecurring ? [1, 2, 3, 4, 5, 6, 7] : []
                      toggleRecurring(editingTask.id, isRecurring, recurringDays)
                      setEditingTask({ ...editingTask, isRecurring, recurringDays })
                    }}
                    className="mt-1 w-4 h-4 sm:w-5 sm:h-5 text-purple-500 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm sm:text-base font-semibold text-purple-800">🔄 Gjenta hver uke</div>
                    <div className="text-xs sm:text-sm text-purple-600 mt-1">
                      {editingTask.isRecurring 
                        ? "Vises automatisk hver uke" 
                        : "Gjør til ukentlig oppgave"}
                    </div>
                  </div>
                </label>
              </div>

              <button
                onClick={() => setEditingTask(null)}
                className="w-full py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                Ferdig
              </button>
            </div>
          </div>
        )}

        {/* Monthly View */}
        {view === 'monthly' && (
          <div className="bg-white rounded-2xl shadow-2xl p-3 sm:p-6 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">
              {getMonthDays().monthName}
            </h2>
            
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map(day => (
                <div key={day} className="text-center font-semibold text-gray-600 text-xs sm:text-sm py-1 sm:py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {getMonthDays().days.map(day => {
                const dayTasks = getTasksForDate(day.date)
                return (
                  <div
                    key={day.date}
                    className={`min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 rounded-lg border-2 transition-all ${
                      day.isToday
                        ? 'bg-indigo-50 border-indigo-300 shadow-md'
                        : day.isCurrentMonth
                        ? 'bg-white border-gray-200 hover:border-gray-300'
                        : 'bg-gray-50 border-gray-100 opacity-50'
                    }`}
                  >
                    <div className={`text-right text-xs sm:text-sm font-semibold mb-1 ${
                      day.isToday ? 'text-indigo-600' : 'text-gray-600'
                    }`}>
                      {day.dayNum}
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      {dayTasks.slice(0, 2).map(task => (
                        <div
                          key={task.id}
                          className={`text-[10px] sm:text-xs p-0.5 sm:p-1 rounded truncate ${
                            task.completed
                              ? 'bg-gray-200 text-gray-500 line-through'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                          title={task.text}
                        >
                          {task.text}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-[10px] sm:text-xs text-gray-500 text-center">
                          +{dayTasks.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Statistics View */}
        {view === 'stats' && (
          <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">📊 Statistikk & Fremgang</h2>
            
            {getStats().length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">Ingen statistikk ennå</p>
                <p className="text-sm mt-2">Fullfør noen oppgaver for å se fremgangen din!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getStats().map((stat, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-800 text-lg">{stat.task}</h3>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-600">{stat.completionRate}%</div>
                        <div className="text-xs text-gray-500">Success rate</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-4 text-sm text-gray-600 mb-2">
                      <div>
                        <span className="font-semibold text-green-600">{stat.totalCompleted}</span> fullført
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">{stat.totalAssigned}</span> totalt
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-full rounded-full transition-all"
                        style={{ width: `${stat.completionRate}%` }}
                      ></div>
                    </div>
                    
                    {/* Recent history */}
                    {stat.history.length > 0 && (
                      <div className="mt-3 flex gap-1 flex-wrap">
                        {stat.history.slice(-14).map((h, i) => (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded ${
                              h.completed ? 'bg-green-400' : 'bg-red-300'
                            }`}
                            title={`${h.date}: ${h.completed ? 'Fullført' : 'Ikke fullført'}`}
                          ></div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Daily Check-in Modal */}
        {showCheckInModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCheckInModal(false)}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">😊 Dagens Check-in</h3>
              
              {getTodaysCheckIn() ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <p className="text-green-800 font-semibold mb-2">✓ Du har allerede sjekket inn i dag!</p>
                    <div className="text-sm text-gray-700">
                      <div><strong>Følelse:</strong> {getTodaysCheckIn().feeling}</div>
                      <div><strong>Energi:</strong> {getTodaysCheckIn().mood}/10</div>
                      {getTodaysCheckIn().note && (
                        <div className="mt-2">
                          <strong>Notat:</strong>
                          <p className="mt-1 italic">{getTodaysCheckIn().note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCheckInModal(false)}
                    className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-all"
                  >
                    Lukk
                  </button>
                </div>
              ) : (
                <CheckInForm onSave={saveCheckIn} onCancel={() => setShowCheckInModal(false)} />
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-white text-sm opacity-75">
          <p>Alle oppgaver lagres lokalt i nettleseren din</p>
        </div>
      </div>
    </div>
  )
}

// Check-in Form Component
function CheckInForm({ onSave, onCancel }) {
  const [feeling, setFeeling] = useState('😊')
  const [mood, setMood] = useState(5)
  const [note, setNote] = useState('')

  const feelings = ['😢', '😕', '😐', '🙂', '😊', '😄', '🤩']

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ feeling, mood, note })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Feeling selector */}
      <div>
        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
          Hvordan føler du deg?
        </label>
        <div className="flex justify-between gap-1 sm:gap-2">
          {feelings.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFeeling(f)}
              className={`text-2xl sm:text-4xl p-2 sm:p-3 rounded-lg transition-all ${
                feeling === f
                  ? 'bg-indigo-100 border-2 border-indigo-500 scale-110'
                  : 'bg-gray-100 border-2 border-transparent hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Mood slider */}
      <div>
        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
          Energinivå: <span className="text-indigo-600 text-lg sm:text-xl">{mood}/10</span>
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={mood}
          onChange={(e) => setMood(parseInt(e.target.value))}
          className="w-full h-2 sm:h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Lav</span>
          <span>Høy</span>
        </div>
      </div>

      {/* Note textarea */}
      <div>
        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
          Notat (valgfritt)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Skriv litt om dagen din..."
          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          rows="4"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 sm:py-3 text-sm sm:text-base bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-all"
        >
          Avbryt
        </button>
        <button
          type="submit"
          className="flex-1 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
        >
          Lagre
        </button>
      </div>
    </form>
  )
}

export default App

