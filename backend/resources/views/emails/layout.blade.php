<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title') - Portal Asset</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; background-color: #f0f4f8; color: #333; }
        .wrapper { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background-color: #1a4731; padding: 22px 30px; }
        .header h1 { color: #ffffff; font-size: 20px; font-weight: bold; letter-spacing: 0.5px; }
        .header p { color: #86c49d; font-size: 12px; margin-top: 4px; }
        .banner { padding: 13px 30px; font-size: 14px; font-weight: bold; color: #fff; }
        .banner.created  { background-color: #2563eb; }
        .banner.pending  { background-color: #d97706; }
        .banner.approved { background-color: #16a34a; }
        .banner.rejected { background-color: #dc2626; }
        .content { padding: 26px 30px; }
        .greeting { font-size: 14px; margin-bottom: 14px; }
        .message { font-size: 14px; line-height: 1.7; color: #444; margin-bottom: 22px; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px 20px; margin-bottom: 20px; }
        .info-box table { width: 100%; border-collapse: collapse; }
        .info-box td { padding: 6px 0; font-size: 13px; vertical-align: top; }
        .info-box td:first-child { font-weight: bold; color: #555; width: 155px; }
        .info-box td:last-child { color: #222; }
        .divider { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
        .comment-box { background: #fff7ed; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 4px 4px 0; margin-bottom: 20px; }
        .comment-box .label { font-size: 12px; font-weight: bold; color: #92400e; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
        .comment-box .text { font-size: 13px; color: #333; line-height: 1.5; }
        .action-note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #1d4ed8; margin-bottom: 20px; }
        .footer { background: #f1f5f9; padding: 16px 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .footer p + p { margin-top: 4px; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="header">
            <h1>Portal Asset</h1>
            <p>Sistem Manajemen Asset &amp; Material Perkebunan</p>
        </div>

        @yield('banner')

        <div class="content">
            @yield('content')
        </div>

        <div class="footer">
            <p>Email ini dikirim secara otomatis oleh sistem Portal Asset. Mohon tidak membalas email ini.</p>
            <p>&copy; {{ date('Y') }} Portal Asset &mdash; Manajemen Asset Perkebunan</p>
        </div>
    </div>
</body>
</html>
