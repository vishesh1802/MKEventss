/**
 * Event reminder utilities
 */

export interface Reminder {
  eventId: number;
  eventTitle: string;
  eventDate: string;
  reminderTime: string; // ISO date string
  reminderType: '1day' | '1week' | 'custom';
}

const STORAGE_KEY = 'eventReminders';

export function getReminders(): Reminder[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveReminder(reminder: Reminder): void {
  const reminders = getReminders();
  const existingIndex = reminders.findIndex(r => r.eventId === reminder.eventId);
  
  if (existingIndex >= 0) {
    reminders[existingIndex] = reminder;
  } else {
    reminders.push(reminder);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  scheduleNotification(reminder);
}

export function removeReminder(eventId: number): void {
  const reminders = getReminders();
  const filtered = reminders.filter(r => r.eventId !== eventId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function getReminderForEvent(eventId: number): Reminder | null {
  const reminders = getReminders();
  return reminders.find(r => r.eventId === eventId) || null;
}

export function calculateReminderTime(eventDate: string, reminderType: '1day' | '1week' | 'custom', customHours?: number): string {
  const event = new Date(eventDate);
  let reminderDate: Date;

  switch (reminderType) {
    case '1day':
      reminderDate = new Date(event);
      reminderDate.setDate(reminderDate.getDate() - 1);
      reminderDate.setHours(9, 0, 0, 0); // 9 AM the day before
      break;
    case '1week':
      reminderDate = new Date(event);
      reminderDate.setDate(reminderDate.getDate() - 7);
      reminderDate.setHours(9, 0, 0, 0); // 9 AM a week before
      break;
    case 'custom':
      reminderDate = new Date(event);
      reminderDate.setHours(reminderDate.getHours() - (customHours || 24));
      break;
    default:
      reminderDate = new Date(event);
      reminderDate.setDate(reminderDate.getDate() - 1);
  }

  return reminderDate.toISOString();
}

function scheduleNotification(reminder: Reminder): void {
  // Check if browser supports notifications
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }

  // Request permission if not granted
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        scheduleNotificationAtTime(reminder);
      }
    });
  } else if (Notification.permission === 'granted') {
    scheduleNotificationAtTime(reminder);
  }
}

function scheduleNotificationAtTime(reminder: Reminder): void {
  const reminderTime = new Date(reminder.reminderTime).getTime();
  const now = Date.now();
  const delay = reminderTime - now;

  if (delay > 0) {
    setTimeout(() => {
      new Notification(`Event Reminder: ${reminder.eventTitle}`, {
        body: `Don't forget! ${reminder.eventTitle} is coming up soon.`,
        icon: '/favicon.ico',
        tag: `event-${reminder.eventId}`,
      });
    }, delay);
  }
}

// Check for reminders that should fire (for page load)
export function checkPendingReminders(): void {
  const reminders = getReminders();
  const now = new Date();

  reminders.forEach(reminder => {
    const reminderTime = new Date(reminder.reminderTime);
    const eventDate = new Date(reminder.eventDate);

    // If reminder time has passed but event hasn't happened yet
    if (reminderTime <= now && eventDate > now) {
      if (Notification.permission === 'granted') {
        new Notification(`Event Reminder: ${reminder.eventTitle}`, {
          body: `Don't forget! ${reminder.eventTitle} is coming up soon.`,
          icon: '/favicon.ico',
          tag: `event-${reminder.eventId}`,
        });
      }
    }
  });
}

