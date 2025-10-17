# 🔒 Lock In - Productivity & Wellness Tracker

A comprehensive productivity and wellness app with task management, habit tracking, and daily check-ins. Built with React and Tailwind CSS. Stay focused, stay locked in!

## ✨ Features

### 📅 Daily View

- ✅ Create and manage daily tasks with checkboxes
- 📊 Visual progress tracking for today
- 🎯 Focus on what matters today

### 📆 Weekly Planner

- **Week navigation** - Navigate between past, present, and future weeks
- **Drag & drop** - Move tasks between days intuitively
- **Multi-day tasks** - Click tasks to assign them to multiple days
- **Duplicate week** - Copy previous week's tasks with one click
- 🔄 **Recurring tasks** - Set tasks to repeat every week automatically

### 🗓️ Monthly View

- Full calendar overview
- See all tasks at a glance
- Plan ahead for the entire month

### 📊 Statistics & Analytics

- Track completion rates for all tasks
- Visual success rate indicators
- Historical completion data
- See your productivity trends over time

### 😊 Daily Check-in

- Mood tracking with emoji selector
- Energy level slider (1-10)
- Daily journal notes
- Track your wellness over time

### 💾 Data Management

- Local storage persistence (tasks saved in your browser)
- Automatic migration of old data
- No server required - complete privacy

### 🎨 Design

- Modern, gradient UI design
- **📱 Fully responsive** - Works perfectly on mobile, tablet, and desktop
- Mobile-optimized with horizontal scroll for weekly view
- Touch-friendly buttons and controls
- Smooth animations and transitions
- 🇳🇴 Norwegian interface

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## 📖 How to Use

### 📅 Daily View (I dag)

1. **Add a Task**: Type your task in the input field and click "Legg til" or press Enter
2. **Complete a Task**: Click the checkbox next to the task
3. **Delete a Task**: Click the trash icon (🗑️) next to the task
4. **Clear Completed**: Remove all completed tasks at once
5. **Reset All**: Uncheck all tasks to start a fresh day

### 📆 Weekly View (Ukeplan)

1. **Navigate Weeks**: Use "← Forrige uke" and "Neste uke →" buttons to browse different weeks
2. **Duplicate Week**: Click "📋 Dupliser forrige uke" to copy all tasks from the previous week
3. **Add Tasks**: Tasks you create are automatically assigned to today
4. **Multi-day Selection**: Click on any task to open a modal where you can:
   - Select/deselect multiple days for the task
   - Toggle 🔄 "Gjenta hver uke" to make it a recurring task
5. **Drag & Drop**: Drag tasks between days to add them to additional days
6. **Today Highlight**: Today's column is highlighted in purple
7. **Visual Indicators**:
   - 🔄 icon = Recurring task (appears every week)
   - (X dager) = Task assigned to multiple specific days

### 🗓️ Monthly View (Måned)

1. View all tasks for the current month in a calendar layout
2. Today is highlighted in purple
3. See up to 3 tasks per day (shows "+X mer" if more exist)
4. Completed tasks appear grayed out with strikethrough

### 📊 Statistics (Statistikk)

1. See all your tasks with completion rates
2. Green bar shows success percentage
3. Colored squares show recent completion history:
   - Green = Completed
   - Red = Not completed
4. Tasks sorted by most completions first

### 😊 Daily Check-in

1. Click the "😊 Check-in" button in the header
2. Select your feeling from emoji options
3. Set your energy level (1-10) with the slider
4. Optionally write a note about your day
5. Click "Lagre Check-in" to save
6. You can only check in once per day

## 🔄 Recurring Tasks

Recurring tasks automatically appear on the same days every week:

- Set a task as recurring in the multi-day modal
- Marked with a 🔄 icon
- Appears every week without manual copying
- Perfect for habits like "Exercise" or "Review goals"

All your data is automatically saved in your browser's local storage!

## Tech Stack

- **React** - UI framework with hooks
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **HTML5 Drag & Drop API** - Native drag-and-drop functionality
- **Local Storage** - Client-side data persistence
