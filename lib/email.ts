import nodemailer from 'nodemailer'
import type { Order, Booking } from '@/types'

// ── SMTP Transport ─────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER!,
    pass: process.env.GMAIL_APP_PASSWORD!,
  },
})

// ── Extended Order type ───────────────────────────────────────────────────────
type OrderWithInvoiceUrls = Order & {
  invoice_url?: string
  invoice_view_url?: string
  invoice_download_url?: string
}

// ══════════════════════════════════════════════════════════════════════════════
//  PALETTE & DESIGN TOKENS
//
//  bg-void:        #010308   deepest background
//  bg-card:        #040916   main card surface
//  bg-card-alt:    #060C1C   slightly lighter card section
//  bg-header:      #020714   header block
//  bg-banner:      #050C20   status banner
//  bg-infobox:     #030811
//  border-strong:  #1A2445   prominent borders
//  border-subtle:  #0E1628   fine hairlines
//  gold-bright:    #D4AA5A   headings, labels
//  gold-mid:       #A07D3A   mid-tone gold
//  gold-dim:       #5C4820   muted gold / ornaments
//  silver-hi:      #F2F5FB   primary text
//  silver-mid:     #B8C4D8   secondary text
//  silver-lo:      #7A8AA8   tertiary / muted
//  silver-faint:   #3A4868   very muted
//  shimmer-peak:   #E8EEF8   shimmer line centre
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
//  EMAIL-SAFE BASE TEMPLATE
//  Full table-based layout — no flexbox, no grid, no overflow:hidden,
//  no margin:auto on divs, no viewport units. Inline CSS throughout.
//  Compatible with: Gmail Web, Gmail Mobile, Outlook, Apple Mail.
// ══════════════════════════════════════════════════════════════════════════════
function baseTemplate(innerContent: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Icon Vision Care &amp; Opticals</title>
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600&family=Jost:wght@200;300;400;500;600;700&display=swap');
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; display:block; }
    body { margin:0!important; padding:0!important; width:100%!important; background-color:#010308; }
    a[x-apple-data-detectors] { color:inherit!important; text-decoration:none!important; }
    @media only screen and (max-width:620px) {
      .email-container { width:100%!important; }
      .body-padding { padding:28px 20px!important; }
      .field-pad { padding:24px 20px 0!important; }
      .stack-col { display:block!important; width:100%!important; padding-right:0!important; padding-left:0!important; border-left:none!important; margin-bottom:22px!important; }
      .items-pad { padding:0 20px 4px!important; }
      .info-pad { padding:0 20px 28px!important; }
      .divider-pad { padding:0 20px!important; }
      .btn-pad { padding:0 20px 10px!important; }
      .card-footer { padding:16px 20px!important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#010308;width:100%;">

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
  style="background-color:#010308;">
  <tr>
    <td align="center" valign="top" style="padding:32px 10px 56px;">

      <table role="presentation" cellspacing="0" cellpadding="0" border="0"
        class="email-container" width="600" style="width:600px;max-width:600px;">
        <tr>
          <td align="center" style="padding-bottom:16px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="height:1px;background:linear-gradient(90deg,transparent,#1A2445 40%,#1A2445 60%,transparent);font-size:0;line-height:0;"></td>
              </tr>
            </table>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin-top:12px;">
              <tr>
                <td style="font-family:'Jost',Arial,sans-serif;font-size:8px;font-weight:500;
                  letter-spacing:5px;text-transform:uppercase;color:#3A4868;
                  padding-right:14px;">PRECISION EYEWEAR</td>
                <td style="width:5px;height:5px;border:1px solid #3A4868;font-size:0;line-height:0;"
                  bgcolor="#010308"></td>
                <td style="font-family:'Jost',Arial,sans-serif;font-size:8px;font-weight:500;
                  letter-spacing:5px;text-transform:uppercase;color:#3A4868;
                  padding-left:14px;">ANANTHAPURAM</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0"
        class="email-container" width="600"
        style="width:600px;max-width:600px;background-color:#040916;
               border:1px solid #1A2445;border-radius:2px;">

        ${innerContent}

      </table><table role="presentation" cellspacing="0" cellpadding="0" border="0"
        class="email-container" width="600" style="width:600px;max-width:600px;">
        <tr>
          <td style="height:1px;font-size:0;line-height:0;
            background:linear-gradient(90deg,transparent,#1A2445 30%,#1A2445 70%,transparent);">
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:22px 0 6px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
              <tr>
                <td style="width:28px;height:1px;font-size:0;line-height:0;
                  background:linear-gradient(90deg,transparent,#2A3555);"></td>
                <td style="padding:0 8px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="width:12px;height:12px;border-radius:50%;
                        border:1px solid #2A3555;font-size:0;line-height:0;"></td>
                    </tr>
                  </table>
                </td>
                <td style="width:28px;height:1px;font-size:0;line-height:0;
                  background:linear-gradient(90deg,#2A3555,transparent);"></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:8px 0 4px;
            font-family:'Cormorant Garamond',Georgia,serif;
            font-size:12px;font-weight:600;letter-spacing:4px;
            text-transform:uppercase;color:#2A3555;">
            Icon Vision Care &amp; Opticals
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom:6px;
            font-family:'Jost',Arial,sans-serif;font-size:10px;
            font-weight:300;letter-spacing:1.5px;color:#2A3555;line-height:1.7;">
            Raju Road , Vaibhav Jewellers Opposite Road, Near Punjab National Bank , Kamala Nagar , Ananthapuram -515001<br/>
            <a href="tel:9676227094" style="color:#2A3555;text-decoration:none;">+91 96762 27094</a>
            &nbsp;&nbsp;&middot;&nbsp;&nbsp;
            <a href="tel:9154693939" style="color:#2A3555;text-decoration:none;">+91 91546 93939</a><br/>
            GST: 37BOFPM8364B1ZU
          </td>
        </tr>
        <tr>
          <td align="center" style="font-family:'Jost',Arial,sans-serif;
            font-size:9px;font-weight:300;letter-spacing:0.5px;color:#1A2240;">
            &copy; ${new Date().getFullYear()} Icon Vision Care &amp; Opticals &nbsp;&middot;&nbsp; All rights reserved
          </td>
        </tr>
      </table></td>
  </tr>
</table>
</body>
</html>`
}

// ══════════════════════════════════════════════════════════════════════════════
//  SHARED SECTION BLOCKS — fully table-based, no absolute/relative positioning
// ══════════════════════════════════════════════════════════════════════════════

function headerBlock(): string {
  return `
  <tr>
    <td style="background:#020714;border-radius:1px 1px 0 0;padding:0;">

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="height:1px;font-size:0;line-height:0;
            background:linear-gradient(90deg,transparent 0%,#3A4868 20%,#3A4868 80%,transparent 100%);">
          </td>
        </tr>
        <tr>
          <td style="height:2px;font-size:0;line-height:0;
            background:linear-gradient(90deg,
              transparent 0%,#4A5A80 8%,#8899BB 22%,
              #C8D4E8 38%,#E8EEF8 50%,
              #C8D4E8 62%,#8899BB 78%,#4A5A80 92%,transparent 100%);">
          </td>
        </tr>
        <tr>
          <td style="height:1px;font-size:0;line-height:0;
            background:linear-gradient(90deg,transparent 0%,#2A3555 25%,#2A3555 75%,transparent 100%);">
          </td>
        </tr>
      </table>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding:50px 40px 44px;">

            <p style="margin:0 0 20px;
              font-family:'Jost',Arial,sans-serif;
              font-size:7.5px;font-weight:600;letter-spacing:7px;
              text-transform:uppercase;color:#4A5A80;">
              ICON VISION CARE &amp; OPTICALS
            </p>

            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
              <tr>
                <td align="center">
                  <p style="margin:0;
                    font-family:'Cormorant Garamond',Georgia,serif;
                    font-size:52px;font-weight:700;letter-spacing:14px;
                    text-transform:uppercase;line-height:1;color:#F2F5FB;
                    text-shadow:0 0 40px rgba(180,200,240,0.15);">
                    ICON
                  </p>
                  <p style="margin:0;
                    font-family:'Cormorant Garamond',Georgia,serif;
                    font-style:italic;font-weight:300;font-size:19px;
                    letter-spacing:11px;color:#7A8AA8;line-height:1;
                    text-transform:uppercase;">
                    Vision &nbsp;Care
                  </p>
                </td>
              </tr>
            </table>

            <table role="presentation" cellspacing="0" cellpadding="0" border="0"
              align="center" style="margin:22px auto 0;">
              <tr>
                <td style="width:72px;height:1px;font-size:0;line-height:0;
                  background:linear-gradient(90deg,transparent,#2A3860);"></td>
                <td style="width:16px;height:1px;font-size:0;line-height:0;
                  background:linear-gradient(90deg,#2A3860,#6070A0);"></td>
                <td align="center" style="padding:0 12px;width:26px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0"
                    align="center">
                    <tr>
                      <td style="width:10px;height:10px;
                        border:1px solid rgba(212,170,90,0.55);
                        background:transparent;font-size:0;line-height:0;">
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="width:16px;height:1px;font-size:0;line-height:0;
                  background:linear-gradient(90deg,#6070A0,#2A3860);"></td>
                <td style="width:72px;height:1px;font-size:0;line-height:0;
                  background:linear-gradient(90deg,#2A3860,transparent);"></td>
              </tr>
            </table>

            <p style="margin:18px 0 0;
              font-family:'Jost',Arial,sans-serif;
              font-size:8px;font-weight:300;letter-spacing:5px;
              text-transform:uppercase;color:#3A4868;">
              ANANTHAPURAM &nbsp;&middot;&nbsp; EST. IN EXCELLENCE
            </p>

          </td>
        </tr>
      </table>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="height:1px;font-size:0;line-height:0;
            background:linear-gradient(90deg,transparent,#1A2445 25%,#1A2445 75%,transparent);">
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

function statusBannerBlock(eyelet: string, title: string, subtitle: string): string {
  return `
  <tr>
    <td style="padding:0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="height:1px;font-size:0;line-height:0;
            background:linear-gradient(90deg,transparent,rgba(212,170,90,0.3) 30%,rgba(212,170,90,0.3) 70%,transparent);">
          </td>
        </tr>
      </table>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
        style="background:linear-gradient(180deg,#05102A 0%,#030C1E 60%,#040916 100%);">
        <tr>
          <td style="width:3px;background:linear-gradient(180deg,transparent,#D4AA5A 30%,#D4AA5A 70%,transparent);font-size:0;line-height:0;"></td>
          <td align="center" style="padding:32px 40px 30px;">

            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
              <tr>
                <td style="width:30px;height:1px;font-size:0;line-height:0;
                  background:linear-gradient(90deg,transparent,#2A3555);"></td>
                <td style="padding:0 12px;font-family:'Cormorant Garamond',Georgia,serif;
                  font-style:italic;font-size:11px;color:#6070A0;letter-spacing:3.5px;
                  white-space:nowrap;">${eyelet}</td>
                <td style="width:30px;height:1px;font-size:0;line-height:0;
                  background:linear-gradient(90deg,#2A3555,transparent);"></td>
              </tr>
            </table>

            <p style="margin:10px 0 10px;
              font-family:'Cormorant Garamond',Georgia,serif;
              font-size:34px;font-weight:600;color:#F2F5FB;
              letter-spacing:1px;line-height:1.2;">${title}</p>

            <p style="margin:0;font-family:'Jost',Arial,sans-serif;
              font-size:9px;font-weight:400;color:#6070A0;
              letter-spacing:4.5px;text-transform:uppercase;">${subtitle}</p>

          </td>
          <td style="width:3px;background:linear-gradient(180deg,transparent,#D4AA5A 30%,#D4AA5A 70%,transparent);font-size:0;line-height:0;"></td>
        </tr>
      </table>

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="height:1px;font-size:0;line-height:0;
            background:linear-gradient(90deg,transparent,rgba(212,170,90,0.18) 30%,rgba(212,170,90,0.18) 70%,transparent);">
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

function dividerRow(padClass = 'divider-pad'): string {
  return `
  <tr>
    <td class="${padClass}" style="padding:0 40px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
        style="margin:28px 0;">
        <tr>
          <td style="height:1px;background:linear-gradient(90deg,transparent,#1A2445);font-size:0;line-height:0;"></td>
          <td style="padding:0 16px;white-space:nowrap;text-align:center;vertical-align:middle;">
            <span style="display:inline-block;width:2px;height:2px;border-radius:50%;
              background:#2A3555;vertical-align:middle;margin-right:6px;font-size:0;line-height:0;"></span><span style="display:inline-block;width:7px;height:7px;
              border:1px solid rgba(212,170,90,0.45);
              vertical-align:middle;font-size:0;line-height:0;"></span><span style="display:inline-block;width:2px;height:2px;border-radius:50%;
              background:#2A3555;vertical-align:middle;margin-left:6px;font-size:0;line-height:0;"></span>
          </td>
          <td style="height:1px;background:linear-gradient(90deg,#1A2445,transparent);font-size:0;line-height:0;"></td>
        </tr>
      </table>
    </td>
  </tr>`
}

function cardFooterRow(text: string): string {
  return `
  <tr>
    <td class="card-footer" style="padding:0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="height:1px;font-size:0;line-height:0;
            background:linear-gradient(90deg,transparent,#1A2445 30%,#1A2445 70%,transparent);">
          </td>
        </tr>
      </table>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
        style="background:#030811;">
        <tr>
          <td style="padding:20px 40px;text-align:center;
            font-family:'Jost',Arial,sans-serif;
            font-size:11px;font-weight:300;letter-spacing:0.8px;color:#4A5A80;">
            ${text}
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

// ══════════════════════════════════════════════════════════════════════════════
//  LABEL HELPER
// ══════════════════════════════════════════════════════════════════════════════
function goldLabel(text: string): string {
  return `<p style="margin:0 0 9px;
    font-family:'Jost',Arial,sans-serif;
    font-size:7.5px;font-weight:600;letter-spacing:4.5px;
    text-transform:uppercase;color:#D4AA5A;">${text}</p>`
}

function fieldValue(text: string, sub?: string): string {
  return `<p style="margin:0;font-family:'Jost',Arial,sans-serif;
    font-size:14px;font-weight:300;color:#F2F5FB;line-height:1.6;">
    ${text}
    ${sub ? `<span style="display:block;font-size:11px;font-weight:300;
      color:#6070A0;margin-top:4px;letter-spacing:0.3px;">${sub}</span>` : ''}
  </p>`
}

// ══════════════════════════════════════════════════════════════════════════════
//  ORDER CONFIRMATION
// ══════════════════════════════════════════════════════════════════════════════
export function buildOrderConfirmationEmail(order: Order, userName: string): string {
  const o            = order as OrderWithInvoiceUrls
  const viewHref     = o.invoice_view_url     || o.invoice_url || ''
  const downloadHref = o.invoice_download_url || o.invoice_url || ''

  const itemRows = (order.order_items || []).map((item, idx) => `
    <tr style="background:${idx % 2 === 0 ? 'transparent' : 'rgba(10,18,40,0.35)'};">
      <td style="padding:15px 0;font-family:'Jost',Arial,sans-serif;
        font-size:13px;font-weight:300;color:#C8D4E8;vertical-align:top;line-height:1.5;">
        ${item.product_snapshot.name}
        <span style="display:block;font-size:10.5px;color:#4A5A80;
          font-weight:400;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">
          ${item.product_snapshot.brand}
        </span>
      </td>
      <td style="padding:15px 0;text-align:center;
        font-family:'Jost',Arial,sans-serif;
        font-size:13px;font-weight:300;color:#6070A0;vertical-align:top;">
        ${item.quantity}
      </td>
      <td style="padding:15px 0;text-align:right;
        font-family:'Cormorant Garamond',Georgia,serif;
        font-size:15px;font-weight:600;color:#C8D4E8;vertical-align:top;">
        &#8377;${item.total_price.toLocaleString('en-IN')}
      </td>
    </tr>
    <tr>
      <td colspan="3" style="height:1px;font-size:0;line-height:0;
        background:linear-gradient(90deg,transparent,#0E1628 20%,#0E1628 80%,transparent);
        padding:0;"></td>
    </tr>`).join('')

  const discountRow = order.discount_amount > 0 ? `
    <tr>
      <td colspan="2" style="padding:13px 0 11px;
        font-family:'Jost',Arial,sans-serif;
        font-size:11.5px;font-weight:400;color:#5AAF7A;letter-spacing:0.5px;vertical-align:top;">
        Discount Applied
        <span style="font-size:9px;color:#3A7850;letter-spacing:2.5px;
          text-transform:uppercase;margin-left:10px;font-weight:500;">
          ${order.coupon_code}
        </span>
      </td>
      <td style="padding:13px 0 11px;text-align:right;
        font-family:'Cormorant Garamond',Georgia,serif;
        font-size:15px;font-weight:600;color:#5AAF7A;vertical-align:top;">
        &minus; &#8377;${order.discount_amount.toLocaleString('en-IN')}
      </td>
    </tr>` : ''

  const invoiceButtons = viewHref ? `
    ${dividerRow('btn-pad')}
    <tr>
      <td class="btn-pad" align="center" style="padding:0 40px 12px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center" style="border-radius:1px;
              background:linear-gradient(135deg,#8899BB 0%,#C8D4E8 30%,#E8EEF8 50%,#C8D4E8 70%,#8899BB 100%);">
              <a href="${viewHref}"
                style="display:inline-block;padding:15px 54px;
                  font-family:'Jost',Arial,sans-serif;
                  font-size:9px;font-weight:600;letter-spacing:5px;
                  text-transform:uppercase;color:#020714;text-decoration:none;">
                VIEW INVOICE
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${downloadHref ? `
    <tr>
      <td class="btn-pad" align="center" style="padding:6px 40px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center" style="border-radius:1px;
              border:1px solid #2A3555;">
              <a href="${downloadHref}"
                style="display:inline-block;padding:13px 54px;
                  font-family:'Jost',Arial,sans-serif;
                  font-size:9px;font-weight:500;letter-spacing:5px;
                  text-transform:uppercase;color:#7A8AA8;text-decoration:none;">
                DOWNLOAD PDF
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : ''}` : ''

  const inner = `
    ${headerBlock()}
    ${statusBannerBlock('&mdash;&ensp;confirmed&ensp;&mdash;', 'Order Received', 'Your selection is being prepared')}

    <tr>
      <td class="body-padding" style="padding:40px 40px 30px;">

        <p style="margin:0 0 32px;
          font-family:'Cormorant Garamond',Georgia,serif;
          font-size:17px;font-weight:400;font-style:italic;
          color:#7A8AA8;line-height:1.75;">
          Dear <span style="font-style:normal;font-weight:600;color:#F2F5FB;">${userName}</span>,<br/>
          We are delighted to confirm your order. Each piece is handled with the utmost care and precision by our team.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td class="stack-col" valign="top"
              style="width:50%;padding-right:28px;vertical-align:top;">
              ${goldLabel('Order Reference')}
              ${fieldValue(order.order_number)}
            </td>
            <td class="stack-col" valign="top"
              style="width:50%;padding-left:28px;vertical-align:top;
                border-left:1px solid #0E1628;">
              ${goldLabel('Collection Point')}
              ${fieldValue(
                order.store_id ? 'Icon Vision Care &amp; Opticals' : 'To be confirmed',
                order.store_id ? 'Ananthapuram &nbsp;&middot;&nbsp; In-store Pickup' : undefined
              )}
            </td>
          </tr>
        </table>

      </td>
    </tr>

    ${dividerRow()}

    <tr>
      <td class="items-pad" style="padding:0 40px 4px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
          style="border-collapse:collapse;table-layout:fixed;width:100%;">
          <colgroup>
            <col style="width:60%;" />
            <col style="width:12%;" />
            <col style="width:28%;" />
          </colgroup>
          <thead>
            <tr>
              <th style="text-align:left;padding-bottom:14px;
                font-family:'Jost',Arial,sans-serif;
                font-size:7.5px;font-weight:600;letter-spacing:4px;
                text-transform:uppercase;color:#4A5A80;border-bottom:1px solid #0E1628;">ITEM</th>
              <th style="text-align:center;padding-bottom:14px;
                font-family:'Jost',Arial,sans-serif;
                font-size:7.5px;font-weight:600;letter-spacing:4px;
                text-transform:uppercase;color:#4A5A80;border-bottom:1px solid #0E1628;">QTY</th>
              <th style="text-align:right;padding-bottom:14px;
                font-family:'Jost',Arial,sans-serif;
                font-size:7.5px;font-weight:600;letter-spacing:4px;
                text-transform:uppercase;color:#4A5A80;border-bottom:1px solid #0E1628;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            ${discountRow}
            <tr>
              <td colspan="3" style="height:1px;font-size:0;line-height:0;padding-top:6px;
                background:transparent;border-top:1px solid #1A2445;"></td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:20px;
                font-family:'Cormorant Garamond',Georgia,serif;
                font-size:24px;font-weight:600;color:#F2F5FB;letter-spacing:0.3px;">Total Paid</td>
              <td style="padding-top:20px;text-align:right;
                font-family:'Cormorant Garamond',Georgia,serif;
                font-size:24px;font-weight:700;color:#D4AA5A;">
                &#8377;${order.total_amount.toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        </table>
      </td>
    </tr>

    ${invoiceButtons}
    ${dividerRow()}

    <tr>
      <td class="info-pad" style="padding:0 40px 40px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="width:3px;background:linear-gradient(180deg,transparent,#D4AA5A 25%,#A07D3A 75%,transparent);font-size:0;line-height:0;border-radius:2px;"></td>
            <td style="background:#030811;border:1px solid #0E1628;border-left:none;
              border-radius:0 2px 2px 0;padding:20px 24px;
              font-family:'Jost',Arial,sans-serif;
              font-size:12.5px;font-weight:300;color:#6070A0;line-height:1.9;
              letter-spacing:0.2px;">
              Please bring a <strong style="color:#C8D4E8;font-weight:500;">valid ID</strong>
              and your <strong style="color:#C8D4E8;font-weight:500;">order reference number</strong>
              when collecting your eyewear. Our team will be on hand to assist with fitting,
              adjustments, and any queries upon your visit.
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${cardFooterRow(`Questions? Call us at <a href="tel:9676227094" style="color:#D4AA5A;text-decoration:none;">+91 96762 27094</a> or <a href="tel:9154693939" style="color:#D4AA5A;text-decoration:none;">+91 91546 93939</a>`)}
  `

  return baseTemplate(inner)
}

// ══════════════════════════════════════════════════════════════════════════════
//  BOOKING CONFIRMATION
// ══════════════════════════════════════════════════════════════════════════════
export function buildBookingConfirmationEmail(booking: Booking, userName: string): string {
  const purposeLabels: Record<string, string> = {
    eye_test:    'Comprehensive Eye Examination',
    frame_trial: 'Frame Selection &amp; Trial',
    pickup:      'Order Collection',
    repair:      'Eyewear Repair &amp; Servicing',
  }

  const formattedDate = new Date(booking.booking_date).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const inner = `
    ${headerBlock()}
    ${statusBannerBlock('&mdash;&ensp;reserved&ensp;&mdash;', 'Appointment Confirmed', 'Your visit has been secured')}

    <tr>
      <td class="body-padding" style="padding:40px 40px 30px;">

        <p style="margin:0 0 32px;
          font-family:'Cormorant Garamond',Georgia,serif;
          font-size:17px;font-weight:400;font-style:italic;
          color:#7A8AA8;line-height:1.75;">
          Dear <span style="font-style:normal;font-weight:600;color:#F2F5FB;">${userName}</span>,<br/>
          Your appointment has been confirmed. We look forward to welcoming you.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td class="stack-col" valign="top"
              style="width:50%;padding-right:28px;vertical-align:top;">
              ${goldLabel('Booking Reference')}
              ${fieldValue(booking.booking_number)}
            </td>
            <td class="stack-col" valign="top"
              style="width:50%;padding-left:28px;vertical-align:top;
                border-left:1px solid #0E1628;">
              ${goldLabel('Location')}
              ${fieldValue(
                booking.store?.name ?? '',
                `${booking.store?.address}, ${booking.store?.city}`
              )}
            </td>
          </tr>
        </table>

      </td>
    </tr>

    ${dividerRow()}

    <tr>
      <td class="field-pad" style="padding:0 40px 30px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td class="stack-col" valign="top"
              style="width:50%;padding-right:28px;vertical-align:top;">
              ${goldLabel('Date &amp; Time')}
              ${fieldValue(formattedDate, booking.time_slot)}
            </td>
            <td class="stack-col" valign="top"
              style="width:50%;padding-left:28px;vertical-align:top;
                border-left:1px solid #0E1628;">
              ${goldLabel('Purpose of Visit')}
              ${fieldValue(purposeLabels[booking.purpose] || booking.purpose)}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${booking.notes ? `
    <tr>
      <td class="field-pad" style="padding:0 40px 24px;">
        ${goldLabel('Notes')}
        <p style="margin:0;font-family:'Jost',Arial,sans-serif;
          font-size:13px;font-weight:300;color:#6070A0;line-height:1.75;
          letter-spacing:0.2px;">
          ${booking.notes}
        </p>
      </td>
    </tr>` : ''}

    ${dividerRow()}

    <tr>
      <td class="info-pad" style="padding:0 40px 40px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="width:3px;background:linear-gradient(180deg,transparent,#D4AA5A 25%,#A07D3A 75%,transparent);font-size:0;line-height:0;border-radius:2px;"></td>
            <td style="background:#030811;border:1px solid #0E1628;border-left:none;
              border-radius:0 2px 2px 0;padding:20px 24px;
              font-family:'Jost',Arial,sans-serif;
              font-size:12.5px;font-weight:300;color:#6070A0;line-height:1.9;
              letter-spacing:0.2px;">
              Kindly arrive <strong style="color:#C8D4E8;font-weight:500;">5&ndash;10 minutes</strong>
              before your scheduled time. If you need to reschedule, please call us at least
              2 hours in advance at
              <strong style="color:#C8D4E8;font-weight:500;">+91 96762 27094</strong> or <strong style="color:#C8D4E8;font-weight:500;">+91 91546 93939</strong>.
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${cardFooterRow('Icon Vision Care &amp; Opticals &nbsp;&middot;&nbsp; Ananthapuram')}
  `

  return baseTemplate(inner)
}

// ══════════════════════════════════════════════════════════════════════════════
//  MARKETING EMAIL
// ══════════════════════════════════════════════════════════════════════════════
export function buildMarketingEmail(
  subject: string,
  bodyContent: string,
  unsubscribeUrl: string,
): string {
  const inner = `
    ${headerBlock()}

    <tr>
      <td class="body-padding" style="padding:40px 40px 32px;
        font-family:'Jost',Arial,sans-serif;
        font-size:14px;font-weight:300;color:#C8D4E8;line-height:1.8;letter-spacing:0.2px;">
        ${bodyContent}
      </td>
    </tr>

    <tr>
      <td style="padding:0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="height:1px;font-size:0;line-height:0;
              background:linear-gradient(90deg,transparent,#0E1628 30%,#0E1628 70%,transparent);">
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
          style="background:#030811;">
          <tr>
            <td style="padding:22px 40px;text-align:center;">
              <p style="margin:0 0 10px;font-family:'Jost',Arial,sans-serif;
                font-size:10px;font-weight:300;letter-spacing:0.5px;color:#2A3555;">
                You&rsquo;re receiving this because you opted in to communications from
                Icon Vision Care &amp; Opticals.
              </p>
              <a href="${unsubscribeUrl}"
                style="font-family:'Jost',Arial,sans-serif;font-size:8.5px;font-weight:500;
                  color:#3A4868;letter-spacing:4px;text-transform:uppercase;
                  text-decoration:none;border-bottom:1px solid #1A2445;padding-bottom:3px;">
                UNSUBSCRIBE
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `

  return baseTemplate(inner)
}

// ══════════════════════════════════════════════════════════════════════════════
//  SEND
// ══════════════════════════════════════════════════════════════════════════════
export async function sendEmail({
  to, subject, html,
}: {
  to: string; subject: string; html: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const info = await transporter.sendMail({
      from: `"Icon Vision Care & Opticals" <${process.env.GMAIL_USER}>`,
      to, subject, html,
    })
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[Email] Send failed:', error)
    return { success: false, error: String(error) }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  BATCH SEND
// ══════════════════════════════════════════════════════════════════════════════
export async function sendEmailBatch(
  emails: Array<{ to: string; subject: string; html: string }>,
  batchSize = 50,
  delayMs   = 2000,
): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0

  for (let i = 0; i < emails.length; i += batchSize) {
    const results = await Promise.allSettled(
      emails.slice(i, i + batchSize).map(e => sendEmail(e))
    )
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value.success) sent++
      else failed++
    })
    if (i + batchSize < emails.length)
      await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  return { sent, failed }
}
// ══════════════════════════════════════════════════════════════════════════════
//  ORDER REJECTION EMAIL
// ══════════════════════════════════════════════════════════════════════════════

export function buildOrderRejectionEmail(
  order: Order,
  customerName: string,
  rejectionReason: string,
): string {
  const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const innerContent = `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">
    <tr>
      <td style="background-color:#040916;padding:40px 40px 0;text-align:center;border-top:3px solid #8B0000;">
        <p style="font-family:'Jost',Arial,sans-serif;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#A07D3A;margin:0 0 10px;">Icon Vision Care &amp; Opticals</p>
        <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#F2F5FB;font-weight:400;margin:0 0 8px;">Order Request Rejected</h1>
        <p style="font-family:'Jost',Arial,sans-serif;font-size:12px;color:#7A8AA8;margin:0 0 30px;">Ref: <strong style="color:#F2F5FB;">${order.order_number}</strong> &nbsp;|&nbsp; ${formattedDate}</p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#040916;padding:30px 40px;">
        <p style="font-family:'Jost',Arial,sans-serif;font-size:14px;color:#B8C4D8;line-height:1.7;margin:0 0 20px;">
          Dear ${customerName},
        </p>
        <p style="font-family:'Jost',Arial,sans-serif;font-size:14px;color:#B8C4D8;line-height:1.7;margin:0 0 20px;">
          We regret to inform you that your order request <strong style="color:#F2F5FB;">${order.order_number}</strong> could not be confirmed.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#030811;border:1px solid #1A2445;margin:0 0 24px;">
          <tr>
            <td style="padding:20px 24px;">
              <p style="font-family:'Jost',Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#A07D3A;margin:0 0 8px;">Reason for Rejection</p>
              <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;color:#F2F5FB;margin:0;">${rejectionReason}</p>
            </td>
          </tr>
        </table>

        <p style="font-family:'Jost',Arial,sans-serif;font-size:14px;color:#B8C4D8;line-height:1.7;margin:0 0 16px;">
          If you believe this is an error, or if you'd like to retry your payment and resubmit the order, please contact us or place a new order.
        </p>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#060C1C;border:1px solid #0E1628;margin:0 0 24px;">
          <tr>
            <td style="padding:20px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family:'Jost',Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#7A8AA8;padding:8px 0;border-bottom:1px solid #0E1628;">Order Number</td>
                  <td style="font-family:'Jost',Arial,sans-serif;font-size:11px;color:#F2F5FB;text-align:right;padding:8px 0;border-bottom:1px solid #0E1628;">${order.order_number}</td>
                </tr>
                <tr>
                  <td style="font-family:'Jost',Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#7A8AA8;padding:8px 0;border-bottom:1px solid #0E1628;">Order Amount</td>
                  <td style="font-family:'Jost',Arial,sans-serif;font-size:11px;color:#F2F5FB;text-align:right;padding:8px 0;border-bottom:1px solid #0E1628;">₹${order.total_amount?.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="font-family:'Jost',Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#7A8AA8;padding:8px 0;">Status</td>
                  <td style="font-family:'Jost',Arial,sans-serif;font-size:11px;color:#ef4444;text-align:right;padding:8px 0;font-weight:600;">REJECTED</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <p style="font-family:'Jost',Arial,sans-serif;font-size:13px;color:#7A8AA8;line-height:1.7;margin:0 0 30px;">
          We apologise for any inconvenience. Please don't hesitate to reach out if you need assistance.
        </p>

        <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:14px;color:#A07D3A;text-align:center;margin:0 0 40px;letter-spacing:0.1em;">
          — The Icon Opticals Team
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#020714;padding:20px 40px;text-align:center;border-top:1px solid #0E1628;">
        <p style="font-family:'Jost',Arial,sans-serif;font-size:10px;color:#3A4868;margin:0;letter-spacing:0.1em;">
          Icon Vision Care &amp; Opticals &nbsp;|&nbsp; This email was sent regarding your order request.
        </p>
      </td>
    </tr>
  </table>
  `
  return baseTemplate(innerContent)
}