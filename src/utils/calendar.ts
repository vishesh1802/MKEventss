/**
 * Generate iCal format calendar file content
 */
export function generateICalendar(event: {
  title: string;
  date: string;
  description?: string;
  location?: string;
  price?: number;
}): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const eventDate = new Date(event.date);
  const endDate = new Date(eventDate);
  endDate.setHours(eventDate.getHours() + 2); // Default 2 hour duration

  const description = event.description || '';
  const location = event.location || '';
  const price = event.price ? `Price: $${event.price}` : 'Free Event';
  const fullDescription = `${description}\n\n${price}`.trim();

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MKEvents//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@mkevents.com`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(eventDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${fullDescription.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Download event as iCal file
 */
export function downloadCalendar(event: {
  title: string;
  date: string;
  description?: string;
  location?: string;
  price?: number;
}): void {
  const icalContent = generateICalendar(event);
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Generate Google Calendar URL
 */
export function getGoogleCalendarUrl(event: {
  title: string;
  date: string;
  description?: string;
  location?: string;
}): string {
  const eventDate = new Date(event.date);
  const endDate = new Date(eventDate);
  endDate.setHours(eventDate.getHours() + 2);

  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(eventDate)}/${formatDate(endDate)}`,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

