"""Run after `npx cap add android`: Android TV launcher, cleartext traffic, app icons."""
import re, os, shutil
from PIL import Image
m = 'android/app/src/main/AndroidManifest.xml'; s = open(m, encoding='utf-8').read()
if 'leanback' not in s:
    s = s.replace('<application', '<uses-feature android:name="android.software.leanback" android:required="false" />\n    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n    <application', 1)
    s = s.replace('<application', '<application android:usesCleartextTraffic="true" android:banner="@mipmap/ic_launcher"', 1)
    s = re.sub(r'(<category android:name="android.intent.category.LAUNCHER" />)', r'\1\n                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />', s, count=1)
    open(m, 'w', encoding='utf-8').write(s)
res = 'android/app/src/main/res'
shutil.rmtree(res + '/mipmap-anydpi-v26', ignore_errors=True)
src = Image.open('icon-512.png').convert('RGBA')
for d, px in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    os.makedirs(f'{res}/mipmap-{d}', exist_ok=True)
    for n in ('ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'):
        src.resize((px, px), Image.LANCZOS).save(f'{res}/mipmap-{d}/{n}')
print('android patched')
