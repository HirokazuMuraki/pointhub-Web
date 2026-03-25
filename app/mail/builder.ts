import { MAIL_TEMPLATES } from './templates';
import { MailType, MailData } from './types';

export const buildMail = (type: MailType, data: MailData) => {
  const template = MAIL_TEMPLATES[type];
  
  const replace = (str: string) => {
    let result = str;
    Object.entries(data).forEach(([key, value]) => {
      const displayValue = typeof value === 'number' ? value.toLocaleString() : String(value || '');
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), displayValue);
    });
    return result;
  };

  return {
    subject: replace(template.subject),
    text: replace(template.text),
    html: replace(template.html)
  };
};
