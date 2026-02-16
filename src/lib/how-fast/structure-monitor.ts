import type { CheerioAPI } from 'cheerio';
import { prisma } from '@/lib/db';

interface StructureCheck {
  passed: boolean;
  alertType: string;
  details: string;
  htmlSnippet?: string;
}

// Check parkrun HTML structure for expected elements
export function checkParkrunStructure($: CheerioAPI, html: string): void {
  const checks: StructureCheck[] = [];

  // Check for h2 heading (athlete name)
  const h2 = $('h2').first();
  if (!h2.length) {
    checks.push({
      passed: false,
      alertType: 'missing_heading',
      details: 'No <h2> heading found on parkrun athlete page. Name extraction may fail.',
      htmlSnippet: html.substring(0, 500),
    });
  }

  // Check for results table
  let hasResultsTable = false;
  $('table').each((_, table) => {
    const caption = $(table).find('caption').text().trim().toLowerCase();
    if (caption.includes('all') && caption.includes('result')) {
      hasResultsTable = true;
      return false;
    }
    const headers = $(table).find('thead th').map((_, el) => $(el).text().trim()).get();
    if (headers.includes('Event') && headers.includes('Time')) {
      hasResultsTable = true;
      return false;
    }
  });

  if (!hasResultsTable && !$('table.sortable').length) {
    checks.push({
      passed: false,
      alertType: 'missing_table',
      details: 'No results table found. Expected table with caption "All Results" or headers including Event + Time.',
      htmlSnippet: html.substring(0, 500),
    });
  }

  // Check table has 5+ columns per row
  const firstDataRow = $('table').first().find('tr').eq(1);
  if (firstDataRow.length) {
    const cellCount = firstDataRow.find('td').length;
    if (cellCount > 0 && cellCount < 5) {
      checks.push({
        passed: false,
        alertType: 'column_count_changed',
        details: `Results table has ${cellCount} columns, expected at least 5 (Event, Date, Run#, Position, Time).`,
        htmlSnippet: firstDataRow.html()?.substring(0, 300) || undefined,
      });
    }
  }

  // Check for DD/MM/YYYY date format in first result
  const dateCell = $('table').find('tr').eq(1).find('td').eq(1);
  if (dateCell.length) {
    const dateText = dateCell.text().trim();
    if (dateText && !/^\d{2}\/\d{2}\/\d{4}$/.test(dateText)) {
      checks.push({
        passed: false,
        alertType: 'date_format_changed',
        details: `Date format "${dateText}" does not match expected DD/MM/YYYY pattern.`,
        htmlSnippet: dateText,
      });
    }
  }

  // Fire off alerts for any failures (non-blocking)
  const failures = checks.filter(c => !c.passed);
  if (failures.length > 0) {
    for (const check of failures) {
      createStructureAlert('parkrun', check).catch(err =>
        console.error('Failed to create structure alert:', err)
      );
    }
  }
}

// Check PO10 HTML structure for expected elements
export function checkPo10Structure($: CheerioAPI, html: string): void {
  const checks: StructureCheck[] = [];

  // Check for name/surname divs
  const nameDiv = $('div.name').first();
  const surnameDiv = $('div.surname').first();
  if (!nameDiv.length && !surnameDiv.length) {
    checks.push({
      passed: false,
      alertType: 'missing_name_elements',
      details: 'No div.name or div.surname found on PO10 athlete page.',
      htmlSnippet: html.substring(0, 500),
    });
  }

  // Check for JavaScript dataEventName variables
  const hasEventNames = /var\s+dataEventName\d+\s*=/.test(html);
  if (!hasEventNames) {
    checks.push({
      passed: false,
      alertType: 'missing_event_data',
      details: 'No dataEventName JavaScript variables found. PO10 may have changed their data format.',
      htmlSnippet: html.substring(0, 200),
    });
  }

  // Check for JavaScript dataValues variables
  const hasDataValues = /var\s+dataValues\d+\s*=/.test(html);
  if (!hasDataValues) {
    checks.push({
      passed: false,
      alertType: 'missing_values_data',
      details: 'No dataValues JavaScript variables found. PO10 may have changed their data format.',
      htmlSnippet: html.substring(0, 200),
    });
  }

  // Fire off alerts for any failures (non-blocking)
  const failures = checks.filter(c => !c.passed);
  if (failures.length > 0) {
    for (const check of failures) {
      createStructureAlert('po10', check).catch(err =>
        console.error('Failed to create structure alert:', err)
      );
    }
  }
}

// Create a structure alert (deduplicated)
async function createStructureAlert(source: string, check: StructureCheck): Promise<void> {
  // Check for existing unresolved alert of same type
  const existing = await prisma.scraper_alerts.findFirst({
    where: {
      source,
      alert_type: check.alertType,
      resolved: false,
    },
  });

  if (existing) return; // Already have an unresolved alert for this

  const alert = await prisma.scraper_alerts.create({
    data: {
      source,
      alert_type: check.alertType,
      details: check.details,
      html_snippet: check.htmlSnippet?.substring(0, 1000) || null,
      resolved: false,
      notified: false,
    },
  });

  // Send email notification
  await sendScraperAlert(alert).catch(err =>
    console.error('Failed to send scraper alert email:', err)
  );
}

// Send alert email via Resend
async function sendScraperAlert(alert: {
  id: number;
  source: string;
  alert_type: string;
  details: string;
  html_snippet: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.NEWSLETTER_ADMIN_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Film My Run <onboarding@resend.dev>';

  if (!apiKey || !adminEmail) {
    console.warn('Scraper alert: Missing RESEND_API_KEY or NEWSLETTER_ADMIN_EMAIL, skipping email.');
    return;
  }

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);

  const recipients = adminEmail.split(',').map(e => e.trim());

  await resend.emails.send({
    from: fromEmail,
    to: recipients,
    subject: `[How Fast Am I] Scraper Alert: ${alert.source} - ${alert.alert_type}`,
    html: `
      <h2>Scraper Structure Alert</h2>
      <p><strong>Source:</strong> ${alert.source}</p>
      <p><strong>Alert Type:</strong> ${alert.alert_type}</p>
      <p><strong>Details:</strong> ${alert.details}</p>
      ${alert.html_snippet ? `<p><strong>HTML Snippet:</strong></p><pre style="background:#f5f5f5;padding:12px;border-radius:4px;overflow:auto;max-height:300px;font-size:12px;">${escapeHtml(alert.html_snippet)}</pre>` : ''}
      <p style="color:#999;font-size:12px;">Alert ID: ${alert.id}</p>
    `,
  });

  // Mark as notified
  await prisma.scraper_alerts.update({
    where: { id: alert.id },
    data: { notified: true },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
