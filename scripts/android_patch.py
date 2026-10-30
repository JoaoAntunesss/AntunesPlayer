"""Run after `npx cap add android`: Android TV launcher, cleartext traffic, app icons."""
import re, os, shutil
from PIL import Image
m = 'android/app/src/main/AndroidManifest.xml'; s = open(m, encoding='utf-8').read()
if 'leanback' not in s:
    s = s.replace('<application', '<uses-feature android:name="android.software.leanback" android:required="false" />\n    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n    <application', 1)
    s = s.replace('<application', '<application android:usesCleartextTraffic="true" android:banner="@drawable/banner"', 1)
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

# Full-screen (immersive) like TV apps, keep the screen on while the app is open
act = 'android/app/src/main/java/com/antunes/player/MainActivity.java'
os.makedirs(os.path.dirname(act), exist_ok=True)
open(act, 'w', encoding='utf-8').write("""package com.antunes.player;

import android.app.UiModeManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ExtPlayerPlugin.class);
        super.onCreate(savedInstanceState);
        sendAmbient(getIntent());
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideBars();
        UiModeManager ui = (UiModeManager) getSystemService(UI_MODE_SERVICE);
        final boolean tv = (ui != null && ui.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION)
            || getPackageManager().hasSystemFeature(PackageManager.FEATURE_LEANBACK);
        if (getBridge() != null) {
            getBridge().addWebViewListener(new WebViewListener() {
                @Override
                public void onPageLoaded(WebView webView) {
                    if (tv) webView.evaluateJavascript("window.AP_IS_TV=true;window.dispatchEvent(new Event('ap-tv'));", null);
                }
            });
        }
    }

    // The TV home screen starts the app with "ambient": last channel, full screen, muted.
    // Delivered to the page once app.js says it is ready (window.AP_AMB_READY); retried every second until then.
    private boolean ambientPending;
    private int ambientTries;

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        sendAmbient(intent);
    }

    // Tell the page when the app goes behind another one (ap-stop) and when it comes back (ap-resume).
    @Override
    public void onStop() {
        super.onStop();
        js("window.dispatchEvent(new Event('ap-stop'));");
    }

    @Override
    public void onResume() {
        super.onResume();
        js("window.dispatchEvent(new Event('ap-resume'));");
    }

    private void js(String code) {
        if (getBridge() != null && getBridge().getWebView() != null) getBridge().getWebView().evaluateJavascript(code, null);
    }

    private void sendAmbient(Intent intent) {
        if (intent == null || !intent.getBooleanExtra("ambient", false)) return;
        intent.removeExtra("ambient");
        ambientPending = true;
        ambientTries = 0;
        tryAmbient();
    }

    private void tryAmbient() {
        if (!ambientPending || getBridge() == null) return;
        final WebView w = getBridge().getWebView();
        w.evaluateJavascript("(function(){if(!window.AP_AMB_READY)return false;window.AP_AMBIENT=true;window.dispatchEvent(new Event('ap-ambient'));return true;})()", value -> {
            if ("true".equals(value)) {
                ambientPending = false;
                // Once the channel is playing, bring the home screen back on top: it is see-through
                // in this mode, so the muted channel stays behind it as the background.
                w.postDelayed(() -> w.evaluateJavascript("!!window.AP_AMB_ON", on -> {
                    if (!"true".equals(on)) return;
                    Intent home = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
                        .putExtra("ambient_bg", true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    try { startActivity(home); } catch (RuntimeException ignored) { }
                }), 3500);
            }
            else if (ambientTries++ < 40) w.postDelayed(this::tryAmbient, 1000);
        });
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    @SuppressWarnings("deprecation")
    private void hideBars() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN);
    }
}
""")
print('immersive activity written')

# Android TV / Google TV launcher banner (320x180)
for d in ('drawable', 'drawable-xhdpi'):
    os.makedirs(f'{res}/{d}', exist_ok=True)
    shutil.copy('android-res/banner.png', f'{res}/{d}/banner.png')
print('tv banner copied')

# Always sign with the keystore in the repo, so every new build installs over the previous one
g = 'android/app/build.gradle'
gs = open(g, encoding='utf-8').read()
if 'android-res/debug.keystore' not in gs:
    gs = gs.replace('android {', """android {
    signingConfigs {
        debug {
            storeFile file("../../android-res/debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }""", 1)
    open(g, 'w', encoding='utf-8').write(gs)
print('fixed signing key wired into gradle')

# Google sign-in (Firebase): config file + Google provider of @capacitor-firebase/authentication
shutil.copy('android-res/google-services.json', 'android/app/google-services.json')
v = 'android/variables.gradle'
if os.path.exists(v):
    t = open(v, encoding='utf-8').read()
    if 'rgcfaIncludeGoogle' not in t:
        open(v, 'a', encoding='utf-8').write('\next {\n    rgcfaIncludeGoogle = true\n}\n')
print('google sign-in configured')

# Lighter, faster APK: release build shrunk by R8 (unused code and resources removed), same signing key
gs = open(g, encoding='utf-8').read()
if 'shrinkResources true' not in gs:
    gs, n = re.subn(r'release\s*\{\s*minifyEnabled false\s*proguardFiles getDefaultProguardFile\(\'proguard-android\.txt\'\), \'proguard-rules\.pro\'\s*\}',
        """release {
            minifyEnabled true
            shrinkResources true
            signingConfig signingConfigs.debug
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }""", gs)
    assert n == 1, 'release block not found'
    gs = gs.replace('android {', 'android {\n    lint { checkReleaseBuilds false\n        abortOnError false }', 1)
    open(g, 'w', encoding='utf-8').write(gs)
with open('android/app/proguard-rules.pro', 'a', encoding='utf-8') as f:
    f.write(open('android-res/proguard-rules.pro', encoding='utf-8').read())
# only one copy of the TV banner is needed
shutil.rmtree(res + '/drawable-xhdpi', ignore_errors=True)
print('release shrinking configured')

# "Open in another player": hands the stream to VLC / MX Player / Just Player through the Android chooser
open('android/app/src/main/java/com/antunes/player/ExtPlayerPlugin.java', 'w', encoding='utf-8').write("""package com.antunes.player;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ExtPlayer")
public class ExtPlayerPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) { call.reject("no url"); return; }
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(Uri.parse(url), "video/*");
        i.putExtra("title", call.getString("title", ""));
        Intent chooser = Intent.createChooser(i, call.getString("title", "Video"));
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { getActivity().startActivity(chooser); call.resolve(); }
        catch (Exception e) { call.reject("no player", e); }
    }

    // Tells the TV home screen (com.mihir.tvhome) which live channel is playing, so it can show it
    // muted as the home screen background. Sent only to that one app.
    @PluginMethod
    public void share(PluginCall call) {
        Intent i = new Intent("com.antunes.player.NOW_PLAYING");
        i.setPackage("com.mihir.tvhome");
        i.putExtra("url", call.getString("url", ""));
        i.putExtra("name", call.getString("name", ""));
        i.putExtra("ua", call.getString("ua", ""));
        i.addFlags(Intent.FLAG_INCLUDE_STOPPED_PACKAGES);
        try { getContext().sendBroadcast(i); } catch (Exception ignored) { }
        call.resolve();
    }
}
""")
print('external player plugin written')
