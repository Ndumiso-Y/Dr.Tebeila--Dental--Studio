#!/usr/bin/env python3
"""
Update index.html with proper branding and SPA redirect handler
Gate S7 - Deployment & Mobile Validation
"""

content = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/logo.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#05984B" />
    <meta name="description" content="Professional invoicing and practice management system for Dr. Tebeila Dental Studio - Refodile Health Centre, Polokwane" />
    <meta name="author" content="Embark Digitals" />

    <!-- PWA Tags -->
    <link rel="apple-touch-icon" href="/logo.png" />
    <link rel="manifest" href="/manifest.json" />

    <title>Dr. Tebeila Dental Studio - Invoicing System</title>

    <!-- GitHub Pages SPA redirect handler -->
    <script>
      (function() {
        var redirect = sessionStorage.getItem('redirect');
        if (redirect) {
          sessionStorage.removeItem('redirect');
          history.replaceState(null, null, redirect);
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"""

file_path = r"apps\web\index.html"
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("index.html updated with branding and SPA redirect handler")
