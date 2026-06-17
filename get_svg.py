import urllib.request

url = 'https://upload.wikimedia.org/wikipedia/th/7/7b/Kalasin_University_Logo.svg'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    with urllib.request.urlopen(req) as response:
        with open('public/ksu-logo.svg', 'wb') as f:
            f.write(response.read())
    print("SVG downloaded successfully!")
except Exception as e:
    print("Error:", e)
