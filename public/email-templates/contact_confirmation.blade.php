<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Anfrage bestätigen</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr><td>

          <h1 style="margin:0 0 24px;font-size:22px;font-weight:600;color:#0f172a;">
            Guten Tag {{ $name }}
          </h1>

          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
            Vielen Dank für Ihre Anfrage bei <strong>DERM247</strong>.
          </p>

          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#334155;">
            Bitte bestätigen Sie Ihre E-Mail-Adresse mit einem Klick auf den folgenden Button:
          </p>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td style="border-radius:8px;background:#0284c7;">
              <a href="{{ $confirmUrl }}"
                 style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                Anfrage bestätigen
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:13px;color:#64748b;">
            Falls der Button nicht funktioniert, kopieren Sie bitte folgenden Link in Ihren Browser:
          </p>
          <p style="margin:0 0 28px;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all;">
            {{ $confirmUrl }}
          </p>

          <p style="margin:0 0 24px;font-size:13px;color:#64748b;line-height:1.5;">
            Der Link ist 24 Stunden gültig. Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail bitte.
          </p>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">

          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
            Freundliche Grüsse<br>
            Ihr DERM247-Team
          </p>

          <p style="margin:16px 0 0;font-size:11px;color:#cbd5e1;text-align:center;">
            © {{ date('Y') }} DERM247 — eine Marke von TechAssist.ch
          </p>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
