#!/usr/bin/env python3
"""
Strava Embed Code Collector

A simple local web tool to quickly collect Strava embed codes for all race activities.

Usage:
    python strava-embed-collector.py

Then open http://localhost:8080 in your browser.
"""

import http.server
import json
import os
import re
import socketserver
import urllib.parse
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
RACES_JSON = PROJECT_DIR / "public" / "races-data.json"
EMBEDS_JSON = PROJECT_DIR / "data" / "strava-embeds.json"

# Ensure data directory exists
(PROJECT_DIR / "data").mkdir(exist_ok=True)

# Load existing embeds
def load_embeds():
    if EMBEDS_JSON.exists():
        with open(EMBEDS_JSON, 'r') as f:
            return json.load(f)
    return {}

# Save embeds
def save_embeds(embeds):
    with open(EMBEDS_JSON, 'w') as f:
        json.dump(embeds, f, indent=2)

# Load races
def load_races():
    with open(RACES_JSON, 'r') as f:
        data = json.load(f)

    # Filter to races with video but no report
    races = []
    for race in data['races']:
        has_video = race.get('video') and race['video'].strip()
        has_report = race.get('report') and race['report'].strip()
        if has_video and not has_report:
            races.append(race)
    return races

# Extract activity ID from Strava URL
def extract_activity_id(url):
    if not url:
        return None
    match = re.search(r'strava\.com/activities/(\d+)', url)
    return match.group(1) if match else None

# Generate HTML page
def generate_html(races, embeds):
    rows = []
    completed = 0

    for race in races:
        activity_id = extract_activity_id(race.get('strava', ''))
        if not activity_id:
            continue

        has_embed = activity_id in embeds
        if has_embed:
            completed += 1

        status_class = "completed" if has_embed else "pending"
        status_icon = "✅" if has_embed else "⏳"
        embed_value = embeds.get(activity_id, {}).get('embed_url', '')

        rows.append(f'''
        <tr class="{status_class}" data-activity-id="{activity_id}">
            <td class="status">{status_icon}</td>
            <td class="date">{race.get('date', 'N/A')}</td>
            <td class="name">{race.get('name', 'Unknown')}</td>
            <td class="distance">{race.get('distance', 'N/A')}mi</td>
            <td class="time">{race.get('time', 'N/A')}</td>
            <td class="actions">
                <a href="https://www.strava.com/activities/{activity_id}"
                   target="_blank"
                   class="btn btn-open"
                   onclick="markOpened('{activity_id}')">
                    Open Strava ↗
                </a>
            </td>
            <td class="embed-input">
                <textarea id="embed-{activity_id}"
                       placeholder="Paste embed code here..."
                       onpaste="handlePaste(event, '{activity_id}')"
                       onchange="saveEmbed('{activity_id}')">{embed_value}</textarea>
                <button onclick="saveEmbed('{activity_id}')" class="btn btn-save">Save</button>
            </td>
        </tr>
        ''')

    total = len(rows)
    progress_pct = (completed / total * 100) if total > 0 else 0

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Strava Embed Collector - Film My Run</title>
    <style>
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #fafafa;
            padding: 20px;
            line-height: 1.6;
        }}

        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}

        h1 {{
            color: #f88c00;
            margin-bottom: 10px;
        }}

        .subtitle {{
            color: #a1a1aa;
            margin-bottom: 20px;
        }}

        .progress-bar {{
            background: #27272a;
            border-radius: 10px;
            height: 20px;
            margin-bottom: 20px;
            overflow: hidden;
        }}

        .progress-fill {{
            background: linear-gradient(90deg, #f88c00, #ff9f1c);
            height: 100%;
            width: {progress_pct}%;
            transition: width 0.3s ease;
        }}

        .stats {{
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }}

        .stat {{
            background: #18181b;
            padding: 15px 25px;
            border-radius: 8px;
            border: 1px solid #27272a;
        }}

        .stat-value {{
            font-size: 24px;
            font-weight: bold;
            color: #f88c00;
        }}

        .stat-label {{
            color: #a1a1aa;
            font-size: 14px;
        }}

        .instructions {{
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }}

        .instructions h3 {{
            color: #f88c00;
            margin-bottom: 10px;
        }}

        .instructions ol {{
            margin-left: 20px;
            color: #a1a1aa;
        }}

        .instructions li {{
            margin-bottom: 8px;
        }}

        .instructions code {{
            background: #27272a;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            background: #18181b;
            border-radius: 8px;
            overflow: hidden;
        }}

        th {{
            background: #27272a;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #f88c00;
            position: sticky;
            top: 0;
        }}

        td {{
            padding: 10px 12px;
            border-bottom: 1px solid #27272a;
        }}

        tr.completed {{
            opacity: 0.6;
        }}

        tr.completed:hover {{
            opacity: 1;
        }}

        tr:hover {{
            background: #1f1f23;
        }}

        .btn {{
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            text-decoration: none;
            display: inline-block;
            transition: all 0.2s;
        }}

        .btn-open {{
            background: #3b82f6;
            color: white;
        }}

        .btn-open:hover {{
            background: #2563eb;
        }}

        .btn-save {{
            background: #22c55e;
            color: white;
        }}

        .btn-save:hover {{
            background: #16a34a;
        }}

        .embed-input {{
            display: flex;
            gap: 8px;
            min-width: 400px;
        }}

        .embed-input textarea {{
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #27272a;
            border-radius: 6px;
            background: #0a0a0a;
            color: #fafafa;
            font-size: 11px;
            font-family: monospace;
            height: 50px;
            resize: vertical;
        }}

        .embed-input textarea:focus {{
            outline: none;
            border-color: #f88c00;
        }}

        .embed-input textarea.saved {{
            border-color: #22c55e;
            background: #052e16;
        }}

        .filter-buttons {{
            margin-bottom: 15px;
            display: flex;
            gap: 10px;
        }}

        .filter-btn {{
            padding: 8px 16px;
            background: #27272a;
            border: 1px solid #3f3f46;
            color: #fafafa;
            border-radius: 6px;
            cursor: pointer;
        }}

        .filter-btn.active {{
            background: #f88c00;
            border-color: #f88c00;
            color: #0a0a0a;
        }}

        .notification {{
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #22c55e;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            display: none;
            animation: slideIn 0.3s ease;
        }}

        @keyframes slideIn {{
            from {{ transform: translateX(100%); opacity: 0; }}
            to {{ transform: translateX(0); opacity: 1; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🏃 Strava Embed Collector</h1>
        <p class="subtitle">Quickly collect embed codes for all race activities</p>

        <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
        </div>

        <div class="stats">
            <div class="stat">
                <div class="stat-value" id="completed-count">{completed}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="remaining-count">{total - completed}</div>
                <div class="stat-label">Remaining</div>
            </div>
            <div class="stat">
                <div class="stat-value">{total}</div>
                <div class="stat-label">Total Activities</div>
            </div>
        </div>

        <div class="instructions">
            <h3>How to use:</h3>
            <ol>
                <li>Click <strong>"Open Strava"</strong> to open the activity in a new tab</li>
                <li>On Strava, click the <strong>three dots (...)</strong> menu → <strong>"Embed Activity"</strong></li>
                <li>Click <strong>"Copy Embed Code"</strong></li>
                <li>Come back here and <strong>paste</strong> into the input field (it auto-saves!)</li>
                <li>The embed URL will be extracted automatically</li>
            </ol>
        </div>

        <div class="filter-buttons">
            <button class="filter-btn active" onclick="filterRows('all')">All ({total})</button>
            <button class="filter-btn" onclick="filterRows('pending')">Pending ({total - completed})</button>
            <button class="filter-btn" onclick="filterRows('completed')">Completed ({completed})</button>
        </div>

        <table>
            <thead>
                <tr>
                    <th width="40">✓</th>
                    <th width="100">Date</th>
                    <th>Race</th>
                    <th width="80">Distance</th>
                    <th width="90">Time</th>
                    <th width="120">Strava</th>
                    <th>Embed Code</th>
                </tr>
            </thead>
            <tbody>
                {''.join(rows)}
            </tbody>
        </table>
    </div>

    <div class="notification" id="notification">✅ Saved!</div>

    <script>
        function extractEmbedUrl(text) {{
            // New Strava format: <div class="strava-embed-placeholder" data-embed-id="123456" ...>
            const embedIdMatch = text.match(/data-embed-id=["'](\d+)["']/);
            if (embedIdMatch) {{
                // Return the full embed code (cleaned up)
                return text.trim();
            }}

            // Old iframe format: <iframe src="https://strava.com/activities/...">
            const iframeMatch = text.match(/src=["']([^"']+strava[^"']+)/);
            if (iframeMatch) return iframeMatch[1];

            // Check if it's already a URL
            if (text.includes('strava.com/activities')) return text.trim();

            // Check if it's just an activity ID
            if (/^\d+$/.test(text.trim())) return text.trim();

            return text.trim();
        }}

        function handlePaste(event, activityId) {{
            setTimeout(() => {{
                const input = document.getElementById('embed-' + activityId);
                const extracted = extractEmbedUrl(input.value);
                input.value = extracted;
                saveEmbed(activityId);
            }}, 10);
        }}

        function saveEmbed(activityId) {{
            const input = document.getElementById('embed-' + activityId);
            const embedUrl = input.value.trim();

            if (!embedUrl) return;

            fetch('/save', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ activity_id: activityId, embed_url: embedUrl }})
            }})
            .then(response => response.json())
            .then(data => {{
                if (data.success) {{
                    input.classList.add('saved');
                    const row = document.querySelector(`tr[data-activity-id="${{activityId}}"]`);
                    row.classList.add('completed');
                    row.querySelector('.status').textContent = '✅';

                    showNotification();
                    updateStats();
                }}
            }});
        }}

        function markOpened(activityId) {{
            const row = document.querySelector(`tr[data-activity-id="${{activityId}}"]`);
            row.style.background = '#1a1a2e';
        }}

        function showNotification() {{
            const notif = document.getElementById('notification');
            notif.style.display = 'block';
            setTimeout(() => {{ notif.style.display = 'none'; }}, 2000);
        }}

        function updateStats() {{
            const completed = document.querySelectorAll('tr.completed').length;
            const total = document.querySelectorAll('tbody tr').length;
            const remaining = total - completed;

            document.getElementById('completed-count').textContent = completed;
            document.getElementById('remaining-count').textContent = remaining;
            document.getElementById('progress-fill').style.width = (completed / total * 100) + '%';
        }}

        function filterRows(filter) {{
            const rows = document.querySelectorAll('tbody tr');
            const buttons = document.querySelectorAll('.filter-btn');

            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            rows.forEach(row => {{
                if (filter === 'all') {{
                    row.style.display = '';
                }} else if (filter === 'pending') {{
                    row.style.display = row.classList.contains('completed') ? 'none' : '';
                }} else if (filter === 'completed') {{
                    row.style.display = row.classList.contains('completed') ? '' : 'none';
                }}
            }});
        }}
    </script>
</body>
</html>
'''

class EmbedCollectorHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            races = load_races()
            embeds = load_embeds()
            html = generate_html(races, embeds)

            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(html.encode())
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/save':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            activity_id = data.get('activity_id')
            embed_url = data.get('embed_url')

            if activity_id and embed_url:
                embeds = load_embeds()
                embeds[activity_id] = {
                    'embed_url': embed_url,
                    'activity_id': activity_id
                }
                save_embeds(embeds)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode())
            else:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': 'Missing data'}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Suppress default logging
        pass

def main():
    PORT = 8080

    print(f"""
╔═══════════════════════════════════════════════════════════════╗
║           🏃 Strava Embed Collector for Film My Run           ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Server running at: http://localhost:{PORT}                    ║
║                                                               ║
║  Instructions:                                                ║
║  1. Open the URL above in your browser                        ║
║  2. Click "Open Strava" for each activity                     ║
║  3. On Strava: ... menu → Embed Activity → Copy Embed Code    ║
║  4. Paste into the input field (auto-saves!)                  ║
║                                                               ║
║  Embeds saved to: {EMBEDS_JSON.relative_to(PROJECT_DIR)}
║                                                               ║
║  Press Ctrl+C to stop the server                              ║
╚═══════════════════════════════════════════════════════════════╝
""")

    with socketserver.TCPServer(("", PORT), EmbedCollectorHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nServer stopped. Goodbye! 👋")

if __name__ == '__main__':
    main()
