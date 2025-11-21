/**
 * Share utilities for events
 */

export function shareToFacebook(url: string, title: string): void {
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(shareUrl, '_blank', 'width=600,height=400');
}

export function shareToTwitter(url: string, title: string): void {
  const text = `Check out this event: ${title}`;
  const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  window.open(shareUrl, '_blank', 'width=600,height=400');
}

export function shareViaEmail(url: string, title: string): void {
  const subject = `Check out this event: ${title}`;
  const body = `I thought you might be interested in this event:\n\n${title}\n\n${url}\n\nCheck it out on MKEvents!`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  // Open mailto link - will open default email client if configured
  // This works on desktop if user has Mail/Outlook/Gmail desktop app
  window.location.href = mailtoUrl;
}

export function shareViaGmail(url: string, title: string): void {
  const subject = `Check out this event: ${title}`;
  const body = `I thought you might be interested in this event:\n\n${title}\n\n${url}\n\nCheck it out on MKEvents!`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(gmailUrl, '_blank');
}

export function shareViaOutlook(url: string, title: string): void {
  const subject = `Check out this event: ${title}`;
  const body = `I thought you might be interested in this event:\n\n${title}\n\n${url}\n\nCheck it out on MKEvents!`;
  const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(outlookUrl, '_blank');
}

export async function copyEmailTemplate(url: string, title: string): Promise<boolean> {
  const subject = `Check out this event: ${title}`;
  const body = `I thought you might be interested in this event:\n\n${title}\n\n${url}\n\nCheck it out on MKEvents!`;
  const emailTemplate = `Subject: ${subject}\n\n${body}`;
  return await copyToClipboard(emailTemplate);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

export function shareViaNativeShare(url: string, title: string, description?: string): void {
  if (navigator.share) {
    navigator.share({
      title,
      text: description || title,
      url,
    }).catch((err) => {
      console.error('Error sharing:', err);
    });
  } else {
    // Fallback to copy
    copyToClipboard(url);
  }
}

