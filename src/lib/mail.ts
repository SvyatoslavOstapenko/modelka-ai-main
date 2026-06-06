import { Resend } from 'resend';

const resend = new Resend(process.env.AUTH_RESEND_KEY);

/**
 * Generate premium OTP email HTML template
 * @param email - User email
 * @param code - 6-digit OTP code
 */
function generateOtpEmailHtml(email: string, code: string): string {
  // Используем NEXTAUTH_URL для построения URL логотипа (уже есть в .env для auth)
  const baseUrl = process.env.NEXTAUTH_URL || 'https://modelka.ai';
  const logoUrl = `${baseUrl}/logo-email.png`;
  const supportEmail = 'modelka-ai@yandex.ru';

  return `
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Код для входа в Modelka AI</title>
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
  </head>
  <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

    <!-- Outer Container -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9;">
      <tr>
        <td align="center" style="padding: 40px 20px;">

          <!-- Main Card -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); overflow: hidden;">

            <!-- Header with Dark Gradient -->
            <tr>
              <td style="background: linear-gradient(to right, #0f172a, #312e81); padding: 32px 40px; text-align: center;">
                <img src="${logoUrl}" alt="Modelka AI" width="48" height="48" style="display: block; margin: 0 auto 12px auto; border: 0;">
                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                  Modelka AI
                </h1>
              </td>
            </tr>

            <!-- Body Content -->
            <tr>
              <td style="padding: 40px;">

                <!-- Headline -->
                <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #0f172a; text-align: center;">
                  Ваш код для входа
                </h2>

                <!-- Subhead -->
                <p style="margin: 0 0 32px 0; font-size: 16px; color: #475569; text-align: center; line-height: 1.5;">
                  Используйте этот код, чтобы войти в Modelka AI<br>с почтой <strong style="color: #312e81;">${email}</strong>
                </p>

                <!-- Code Block -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center" style="padding: 0 0 12px 0;">
                      <div style="display: inline-block; background-color: #eef2ff; border: 2px dashed #c7d2fe; border-radius: 12px; padding: 24px 40px;">
                        <div style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #4f46e5; font-family: 'SF Mono', Monaco, 'Courier New', monospace; user-select: all; -webkit-user-select: all; -moz-user-select: all;">
                          ${code}
                        </div>
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Copy Hint -->
                <p style="margin: 0 0 24px 0; font-size: 13px; color: #94a3b8; text-align: center;">
                  Нажмите на код, чтобы быстро скопировать его
                </p>

                <!-- Expiry Info -->
                <p style="margin: 0 0 32px 0; font-size: 15px; color: #475569; text-align: center; line-height: 1.5;">
                  Код действует <strong>10 минут</strong>, потом можно запросить новый.
                </p>

                <!-- Reward Banner -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 16px 20px; border-left: 4px solid #10b981;">
                      <p style="margin: 0; font-size: 15px; color: #065f46; line-height: 1.5;">
                        🎁 <strong>После входа вы получите 3 бесплатных фото</strong> на модели для своих товаров.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Divider -->
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 24px 0;">

                <!-- Security Footer -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td>
                      <p style="margin: 0 0 12px 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                        Если вы не запрашивали этот код, просто проигнорируйте письмо- войти без него нельзя.
                      </p>
                      <p style="margin: 0 0 12px 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                        Никогда не делитесь кодом с другими. Команда Modelka AI никогда не попросит прислать ваш код в ответ на письмо, в чате или по телефону.
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                        Возникли вопросы? Напишите нам в поддержку: <a href="mailto:${supportEmail}" style="color: #4f46e5; text-decoration: none;">${supportEmail}</a>
                      </p>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                  © ${new Date().getFullYear()} Modelka AI. Все права защищены.
                </p>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
</html>
  `.trim();
}

/**
 * Send OTP code via email
 * @param email - User email
 * @param code - 6-digit OTP code
 */
export async function sendOtpEmail(email: string, code: string) {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Modelka AI <onboarding@resend.dev>',
      to: email,
      subject: 'Ваш код для входа в Modelka AI',
      html: generateOtpEmailHtml(email, code),
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return { error: 'Failed to send email' };
  }
}
