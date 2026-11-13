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
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.JSObject;
import androidx.activity.result.ActivityResult;
import android.speech.RecognizerIntent;
import java.util.ArrayList;

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

    // Voice search: opens the system's voice screen (on a TV it listens through the remote's microphone)
    // and returns what was said. No microphone permission is needed: the system voice app does the listening.
    @PluginMethod
    public void listen(PluginCall call) {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("lang", "pt-PT"));
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, call.getString("prompt", ""));
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        try { startActivityForResult(call, i, "voiceDone"); }
        catch (Exception e) { call.reject("no voice", e); }
    }

    @ActivityCallback
    private void voiceDone(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent d = result.getData();
        ArrayList<String> r = d == null ? null : d.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        JSObject o = new JSObject();
        o.put("text", r != null && !r.isEmpty() ? r.get(0) : "");
        call.resolve(o);
    }

    // Scheduled recordings (see Rec / RecService): saved on the device, run by an alarm even with the app closed
    @PluginMethod
    public void recSchedule(PluginCall call) {
        try {
            org.json.JSONObject r = new org.json.JSONObject();
            r.put("id", call.getString("id", "")); r.put("url", call.getString("url", "")); r.put("ua", call.getString("ua", ""));
            r.put("name", call.getString("name", "")); r.put("start", call.getData().optLong("start")); r.put("end", call.getData().optLong("end"));
            Rec.add(getContext(), r);
            if (android.os.Build.VERSION.SDK_INT >= 33 && getContext().checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED && getActivity() != null)
                getActivity().requestPermissions(new String[] { "android.permission.POST_NOTIFICATIONS" }, 77);
            call.resolve();
        } catch (Exception e) { call.reject("rec", e); }
    }

    @PluginMethod
    public void recCancel(PluginCall call) { Rec.cancel(getContext(), call.getString("id", "")); call.resolve(); }

    @PluginMethod
    public void recList(PluginCall call) {
        JSObject o = new JSObject();
        try { o.put("list", new com.getcapacitor.JSArray(Rec.all(getContext()).toString())); } catch (Exception e) { }
        call.resolve(o);
    }

    // Downloads (see Dl / DlService): films and episodes saved inside the app to watch offline
    @PluginMethod
    public void dlStart(PluginCall call) {
        try {
            org.json.JSONObject d = new org.json.JSONObject();
            for (String k : new String[] { "id", "key", "url", "ua", "name", "ext", "logo", "ser" }) d.put(k, call.getString(k, ""));
            Dl.start(getContext(), d);
            if (android.os.Build.VERSION.SDK_INT >= 33 && getContext().checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED && getActivity() != null)
                getActivity().requestPermissions(new String[] { "android.permission.POST_NOTIFICATIONS" }, 78);
            call.resolve();
        } catch (Exception e) { call.reject("dl", e); }
    }

    @PluginMethod
    public void dlList(PluginCall call) {
        JSObject o = new JSObject();
        try { o.put("list", new com.getcapacitor.JSArray(Dl.all(getContext()).toString())); } catch (Exception e) { }
        call.resolve(o);
    }

    @PluginMethod
    public void dlStop(PluginCall call) { DlService.STOP.add(call.getString("id", "")); call.resolve(); }

    @PluginMethod
    public void dlDelete(PluginCall call) { String id = call.getString("id", ""); DlService.STOP.add(id); Dl.delete(getContext(), id); call.resolve(); }

    // Built-in player with Dolby / DTS sound (see NativePlayer): used for films and episodes whose sound the WebView
    // cannot decode. Returns where it stopped, so "Continue watching" and the next episode keep working.
    @PluginMethod
    public void nativePlay(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) { call.reject("no url"); return; }
        Intent i = new Intent(getContext(), NativePlayer.class);
        i.putExtra("url", url); i.putExtra("title", call.getString("title", "")); i.putExtra("ua", call.getString("ua", ""));
        Integer pos = call.getInt("pos", 0); i.putExtra("pos", pos == null ? 0L : pos * 1000L);
        // online subtitles found by the app (WebVTT): written to a file, the player adds them as a subtitle track
        String vtt = call.getString("vtt", "");
        if (vtt != null && !vtt.isEmpty()) {
            try {
                java.io.File f = new java.io.File(getContext().getCacheDir(), "online-sub.vtt");
                java.io.FileOutputStream o = new java.io.FileOutputStream(f);
                o.write(vtt.getBytes(java.nio.charset.StandardCharsets.UTF_8)); o.close();
                i.putExtra("sub", f.getAbsolutePath()); i.putExtra("subLang", call.getString("subLang", "")); i.putExtra("subLabel", call.getString("subLabel", ""));
            } catch (Exception ignored) { }
        }
        try { startActivityForResult(call, i, "nativeDone"); }
        catch (Exception e) { call.reject("native player", e); }
    }

    @ActivityCallback
    private void nativeDone(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent d = result.getData();
        JSObject o = new JSObject();
        o.put("pos", d == null ? 0 : d.getLongExtra("pos", 0) / 1000.0);
        o.put("dur", d == null ? 0 : d.getLongExtra("dur", 0) / 1000.0);
        o.put("ended", d != null && d.getBooleanExtra("ended", false));
        o.put("err", d == null ? "" : d.getStringExtra("err"));
        call.resolve(o);
    }

    // Chromecast: the system's device picker, then the stream is played by the Chromecast itself
    @PluginMethod
    public void cast(final PluginCall call) {
        final android.app.Activity a = getActivity();
        if (a == null) { call.reject("no activity"); return; }
        a.runOnUiThread(new Runnable() { public void run() {
            try {
                final com.google.android.gms.cast.framework.CastContext cc = com.google.android.gms.cast.framework.CastContext.getSharedInstance(a);
                final com.google.android.gms.cast.framework.SessionManager sm = cc.getSessionManager();
                com.google.android.gms.cast.framework.CastSession cur = sm.getCurrentCastSession();
                if (cur != null && cur.isConnected()) { castLoad(cur, call); return; }
                final boolean[] settled = { false };
                final com.google.android.gms.cast.framework.SessionManagerListener<com.google.android.gms.cast.framework.CastSession>[] L = new com.google.android.gms.cast.framework.SessionManagerListener[1];
                L[0] = new com.google.android.gms.cast.framework.SessionManagerListener<com.google.android.gms.cast.framework.CastSession>() {
                    void end(com.google.android.gms.cast.framework.CastSession s, boolean ok) { if (settled[0]) return; settled[0] = true; sm.removeSessionManagerListener(L[0], com.google.android.gms.cast.framework.CastSession.class); if (ok) castLoad(s, call); else call.reject("cast failed"); }
                    @Override public void onSessionStarted(com.google.android.gms.cast.framework.CastSession s, String id) { end(s, true); }
                    @Override public void onSessionResumed(com.google.android.gms.cast.framework.CastSession s, boolean w) { end(s, true); }
                    @Override public void onSessionStartFailed(com.google.android.gms.cast.framework.CastSession s, int e) { end(s, false); }
                    @Override public void onSessionResumeFailed(com.google.android.gms.cast.framework.CastSession s, int e) { end(s, false); }
                    @Override public void onSessionStarting(com.google.android.gms.cast.framework.CastSession s) { }
                    @Override public void onSessionEnding(com.google.android.gms.cast.framework.CastSession s) { }
                    @Override public void onSessionEnded(com.google.android.gms.cast.framework.CastSession s, int e) { }
                    @Override public void onSessionResuming(com.google.android.gms.cast.framework.CastSession s, String id) { }
                    @Override public void onSessionSuspended(com.google.android.gms.cast.framework.CastSession s, int r) { }
                };
                sm.addSessionManagerListener(L[0], com.google.android.gms.cast.framework.CastSession.class);
                androidx.mediarouter.app.MediaRouteChooserDialog d = new androidx.mediarouter.app.MediaRouteChooserDialog(a);
                d.setRouteSelector(cc.getMergedSelector());
                d.setOnCancelListener(new android.content.DialogInterface.OnCancelListener() { public void onCancel(android.content.DialogInterface x) {
                    if (settled[0]) return; settled[0] = true; sm.removeSessionManagerListener(L[0], com.google.android.gms.cast.framework.CastSession.class); JSObject o = new JSObject(); o.put("ok", false); call.resolve(o); } });
                d.show();
            } catch (Exception e) { call.reject("cast", e); }
        } });
    }

    private void castLoad(com.google.android.gms.cast.framework.CastSession s, PluginCall call) {
        try {
            com.google.android.gms.cast.MediaMetadata md = new com.google.android.gms.cast.MediaMetadata(com.google.android.gms.cast.MediaMetadata.MEDIA_TYPE_MOVIE);
            md.putString(com.google.android.gms.cast.MediaMetadata.KEY_TITLE, call.getString("title", ""));
            String img = call.getString("image", ""); if (img != null && !img.isEmpty()) md.addImage(new com.google.android.gms.common.images.WebImage(Uri.parse(img)));
            boolean live = Boolean.TRUE.equals(call.getBoolean("live", false));
            com.google.android.gms.cast.MediaInfo mi = new com.google.android.gms.cast.MediaInfo.Builder(call.getString("url", ""))
                .setContentType(call.getString("type", "video/mp4"))
                .setStreamType(live ? com.google.android.gms.cast.MediaInfo.STREAM_TYPE_LIVE : com.google.android.gms.cast.MediaInfo.STREAM_TYPE_BUFFERED)
                .setMetadata(md).build();
            com.google.android.gms.cast.framework.media.RemoteMediaClient rm = s.getRemoteMediaClient();
            if (rm == null) { call.reject("no media client"); return; }
            Integer pos = call.getInt("pos", 0);
            rm.load(new com.google.android.gms.cast.MediaLoadRequestData.Builder().setMediaInfo(mi).setAutoplay(true).setCurrentTime(pos == null ? 0 : pos * 1000L).build());
            JSObject o = new JSObject(); o.put("ok", true); call.resolve(o);
        } catch (Exception e) { call.reject("cast load", e); }
    }
}
""")
print('external player plugin written')

# Scheduled recordings: an alarm starts RecService at the programme's start; it saves the stream to Movies/AntunesPlayer
s = open(m, encoding='utf-8').read()
if 'RecService' not in s:
    perms = ['android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_DATA_SYNC', 'android.permission.POST_NOTIFICATIONS',
             'android.permission.WAKE_LOCK', 'android.permission.RECEIVE_BOOT_COMPLETED', 'android.permission.USE_EXACT_ALARM', 'android.permission.ACCESS_WIFI_STATE']
    add = ''.join('    <uses-permission android:name="%s" />\n' % p for p in perms if p not in s)
    add += '    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />\n'
    s = s.replace('<application', add + '    <application', 1)
    s = s.replace('</application>', '        <receiver android:name=".RecReceiver" android:exported="true"><intent-filter><action android:name="android.intent.action.BOOT_COMPLETED" /></intent-filter></receiver>\n        <service android:name=".RecService" android:exported="false" android:foregroundServiceType="dataSync" />\n    </application>', 1)
    open(m, 'w', encoding='utf-8').write(s)
jd = 'android/app/src/main/java/com/antunes/player/'
open(jd + 'Rec.java', 'w', encoding='utf-8').write(r'''package com.antunes.player;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

/** Scheduled recordings: an alarm wakes RecReceiver a minute before the start; RecService saves the stream until the end. */
public class Rec {
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("rec", Context.MODE_PRIVATE); }
    static synchronized JSONArray all(Context c) { try { return new JSONArray(prefs(c).getString("list", "[]")); } catch (Exception e) { return new JSONArray(); } }
    static synchronized void save(Context c, JSONArray a) { prefs(c).edit().putString("list", a.toString()).apply(); }
    static JSONObject get(Context c, String id) { JSONArray a = all(c); for (int i = 0; i < a.length(); i++) { JSONObject r = a.optJSONObject(i); if (r != null && id.equals(r.optString("id"))) return r; } return null; }
    static synchronized void remove(Context c, String id) { JSONArray a = all(c), b = new JSONArray(); for (int i = 0; i < a.length(); i++) { JSONObject r = a.optJSONObject(i); if (r != null && !id.equals(r.optString("id"))) b.put(r); } save(c, b); }

    static PendingIntent pi(Context c, String id) {
        Intent i = new Intent(c, RecReceiver.class).setAction("com.antunes.player.REC").putExtra("id", id);
        return PendingIntent.getBroadcast(c, id.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
    }
    static void arm(Context c, JSONObject r) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE); if (am == null) return;
        long at = Math.max(System.currentTimeMillis() + 2000, r.optLong("start") - 60000);
        PendingIntent p = pi(c, r.optString("id"));
        try {
            if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
            else if (Build.VERSION.SDK_INT >= 23) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, p);
            else am.setExact(AlarmManager.RTC_WAKEUP, at, p);
        } catch (SecurityException e) { am.set(AlarmManager.RTC_WAKEUP, at, p); }
    }
    static synchronized void add(Context c, JSONObject r) { remove(c, r.optString("id")); JSONArray a = all(c); a.put(r); save(c, a); arm(c, r); }
    static void cancel(Context c, String id) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE); if (am != null) am.cancel(pi(c, id));
        RecService.STOP.add(id); remove(c, id);
    }
    /** After a reboot alarms are gone: set them again, dropping the ones that already ended. */
    static synchronized void armAll(Context c) {
        JSONArray a = all(c), keep = new JSONArray(); long now = System.currentTimeMillis();
        for (int i = 0; i < a.length(); i++) { JSONObject r = a.optJSONObject(i); if (r == null || r.optLong("end") < now) continue; keep.put(r); arm(c, r); }
        save(c, keep);
    }
}
''')
open(jd + 'RecReceiver.java', 'w', encoding='utf-8').write(r'''package com.antunes.player;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class RecReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(a)) { Rec.armAll(c); return; }
        String id = i.getStringExtra("id"); if (id == null) return;
        if ("com.antunes.player.REC_STOP".equals(a)) { RecService.STOP.add(id); Rec.remove(c, id); return; }
        Intent s = new Intent(c, RecService.class).putExtra("id", id);
        try { if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(s); else c.startService(s); } catch (Exception ignored) { }
    }
}
''')
open(jd + 'RecService.java', 'w', encoding='utf-8').write(r'''package com.antunes.player;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Environment;
import android.os.IBinder;
import android.os.PowerManager;
import android.provider.MediaStore;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONObject;

/** Saves a live stream to Movies/AntunesPlayer from its start to its end time, with the app closed. */
public class RecService extends Service {
    static final Set<String> STOP = Collections.synchronizedSet(new HashSet<String>());
    private int running = 0;
    private PowerManager.WakeLock wake;
    private WifiManager.WifiLock wifi;

    @Override public IBinder onBind(Intent i) { return null; }

    private Notification note(String text, String id) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) {
            if (nm != null && nm.getNotificationChannel("rec") == null) nm.createNotificationChannel(new NotificationChannel("rec", "Gravações", NotificationManager.IMPORTANCE_LOW));
            b = new Notification.Builder(this, "rec");
        } else b = new Notification.Builder(this);
        b.setSmallIcon(getApplicationInfo().icon).setContentTitle("AntunesPlayer · a gravar").setContentText(text).setOngoing(true);
        if (id != null) {
            Intent s = new Intent(this, RecReceiver.class).setAction("com.antunes.player.REC_STOP").putExtra("id", id);
            PendingIntent p = PendingIntent.getBroadcast(this, ("stop" + id).hashCode(), s, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
            b.addAction(new Notification.Action.Builder(null, "Parar", p).build());
        }
        return b.build();
    }

    @Override
    public int onStartCommand(Intent in, int flags, int startId) {
        String id = in == null ? null : in.getStringExtra("id");
        JSONObject r = id == null ? null : Rec.get(this, id);
        Notification n = note(r != null ? r.optString("name") : "", id);
        if (Build.VERSION.SDK_INT >= 29) startForeground(4242, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC); else startForeground(4242, n);
        if (r == null || r.optLong("end") < System.currentTimeMillis()) { if (id != null) Rec.remove(this, id); synchronized (this) { if (running == 0) { stopForeground(true); stopSelf(); } } return START_NOT_STICKY; }
        STOP.remove(id);
        synchronized (this) {
            if (running++ == 0) {
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                if (pm != null) { wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "antunes:rec"); wake.acquire(6 * 3600 * 1000L); }
                WifiManager wm = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
                if (wm != null) { wifi = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "antunes:rec"); wifi.acquire(); }
            }
        }
        final JSONObject job = r;
        new Thread(new Runnable() { public void run() { try { record(job); } finally { done(job.optString("id")); } } }).start();
        return START_NOT_STICKY;
    }

    private synchronized void done(String id) {
        Rec.remove(this, id); STOP.remove(id);
        if (--running <= 0) {
            try { if (wake != null && wake.isHeld()) wake.release(); } catch (Exception ignored) { }
            try { if (wifi != null && wifi.isHeld()) wifi.release(); } catch (Exception ignored) { }
            stopForeground(true); stopSelf();
        }
    }

    private boolean go(String id, long end) { return System.currentTimeMillis() < end && !STOP.contains(id); }

    private HttpURLConnection open(String u, String ua) throws IOException {
        for (int hop = 0; hop < 6; hop++) {
            HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
            c.setConnectTimeout(15000); c.setReadTimeout(20000); c.setInstanceFollowRedirects(false);
            if (ua != null && !ua.isEmpty()) c.setRequestProperty("User-Agent", ua);
            int code = c.getResponseCode();
            if (code >= 300 && code < 400 && c.getHeaderField("Location") != null) { u = new URL(new URL(u), c.getHeaderField("Location")).toString(); c.disconnect(); continue; }
            if (code >= 400) { c.disconnect(); throw new IOException("HTTP " + code); }
            return c;
        }
        throw new IOException("too many redirects");
    }

    private String text(String u, String ua) throws IOException {
        HttpURLConnection c = open(u, ua);
        try { InputStream in = c.getInputStream(); ByteArrayOutputStream b = new ByteArrayOutputStream(); byte[] buf = new byte[16384]; int n; while ((n = in.read(buf)) > 0) b.write(buf, 0, n); return b.toString("UTF-8"); }
        finally { c.disconnect(); }
    }

    private void record(JSONObject r) {
        String id = r.optString("id"), url = r.optString("url"), ua = r.optString("ua"); long end = r.optLong("end");
        String name = r.optString("name", "Gravação").replaceAll("[\\\\/:*?\"<>|]+", "_").trim();
        String file = name + " " + new SimpleDateFormat("yyyy-MM-dd HH-mm", Locale.getDefault()).format(new Date()) + ".ts";
        OutputStream out = null; Uri uri = null;
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues v = new ContentValues();
                v.put(MediaStore.Video.Media.DISPLAY_NAME, file); v.put(MediaStore.Video.Media.MIME_TYPE, "video/mp2t");
                v.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/AntunesPlayer"); v.put(MediaStore.Video.Media.IS_PENDING, 1);
                uri = getContentResolver().insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, v);
                if (uri == null) return; out = getContentResolver().openOutputStream(uri);
            } else {
                File d = new File(getExternalFilesDir(Environment.DIRECTORY_MOVIES), "AntunesPlayer"); d.mkdirs();
                out = new FileOutputStream(new File(d, file));
            }
            if (out == null) return;
            out = new BufferedOutputStream(out, 1 << 16);
            if (url.toLowerCase(Locale.ROOT).contains(".m3u8")) hls(url, ua, end, id, out); else direct(url, ua, end, id, out);
        } catch (Exception ignored) {
        } finally {
            try { if (out != null) out.close(); } catch (Exception ignored) { }
            if (uri != null && Build.VERSION.SDK_INT >= 29) { try { ContentValues v = new ContentValues(); v.put(MediaStore.Video.Media.IS_PENDING, 0); getContentResolver().update(uri, v, null, null); } catch (Exception ignored) { } }
        }
    }

    /** A continuous stream (Xtream .ts): copy it, reconnecting if the server drops the connection. */
    private void direct(String url, String ua, long end, String id, OutputStream out) {
        byte[] b = new byte[1 << 16]; int fails = 0;
        while (go(id, end) && fails < 40) {
            HttpURLConnection c = null; boolean got = false;
            try { c = open(url, ua); InputStream in = c.getInputStream(); int n; while (go(id, end) && (n = in.read(b)) > 0) { out.write(b, 0, n); got = true; } }
            catch (Exception e) { }
            finally { if (c != null) c.disconnect(); }
            if (got) fails = 0; else fails++;
            if (go(id, end)) { try { Thread.sleep(got ? 300 : 2000); } catch (InterruptedException e) { return; } }
        }
    }

    /** HLS: follow the playlist and append each new segment (best quality of a master playlist). */
    private void hls(String url, String ua, long end, String id, OutputStream out) {
        Set<String> seen = new LinkedHashSet<String>(); byte[] b = new byte[1 << 16]; int fails = 0; String media = url;
        Pattern bwp = Pattern.compile("BANDWIDTH=(\\d+)");
        while (go(id, end) && fails < 40) {
            try {
                String pl = text(media, ua); String[] L = pl.split("\n");
                if (pl.contains("#EXT-X-STREAM-INF")) {
                    String best = null; long bw = -1;
                    for (int i = 0; i < L.length; i++) {
                        if (!L[i].startsWith("#EXT-X-STREAM-INF")) continue;
                        long w = 0; Matcher m = bwp.matcher(L[i]); if (m.find()) w = Long.parseLong(m.group(1));
                        for (int j = i + 1; j < L.length; j++) { String u = L[j].trim(); if (u.isEmpty() || u.startsWith("#")) continue; if (w > bw) { bw = w; best = u; } break; }
                    }
                    if (best == null) throw new IOException("no variant");
                    media = new URL(new URL(media), best).toString(); continue;
                }
                double td = 6;
                for (String l : L) {
                    l = l.trim();
                    if (l.startsWith("#EXT-X-TARGETDURATION:")) { try { td = Double.parseDouble(l.substring(22)); } catch (Exception ignored) { } }
                    else if (!l.isEmpty() && !l.startsWith("#")) {
                        String su = new URL(new URL(media), l).toString();
                        if (seen.add(su)) { HttpURLConnection c = open(su, ua); try { InputStream in = c.getInputStream(); int n; while ((n = in.read(b)) > 0) out.write(b, 0, n); } finally { c.disconnect(); } }
                        if (!go(id, end)) break;
                    }
                }
                while (seen.size() > 600) { Iterator<String> it = seen.iterator(); it.next(); it.remove(); }
                fails = 0; Thread.sleep((long) Math.max(1000, td * 500));
            } catch (InterruptedException e) { return; }
            catch (Exception e) { fails++; try { Thread.sleep(2000); } catch (InterruptedException x) { return; } }
        }
    }
}
''')
print('scheduled recordings added')

# Chromecast: Google Cast framework + the media route picker
gs = open(g, encoding='utf-8').read()
if 'play-services-cast-framework' not in gs:
    gs = re.sub(r'dependencies\s*\{', "dependencies {\n    implementation 'com.google.android.gms:play-services-cast-framework:21.5.0'\n    implementation 'androidx.mediarouter:mediarouter:1.7.0'", gs, count=1)
    open(g, 'w', encoding='utf-8').write(gs)
open(jd + 'CastOpts.java', 'w', encoding='utf-8').write("""package com.antunes.player;

import android.content.Context;
import com.google.android.gms.cast.CastMediaControlIntent;
import com.google.android.gms.cast.framework.CastOptions;
import com.google.android.gms.cast.framework.OptionsProvider;
import com.google.android.gms.cast.framework.SessionProvider;
import java.util.List;

/** Chromecast: plays on Google's default media receiver. */
public class CastOpts implements OptionsProvider {
    @Override public CastOptions getCastOptions(Context c) { return new CastOptions.Builder().setReceiverApplicationId(CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID).build(); }
    @Override public List<SessionProvider> getAdditionalSessionProviders(Context c) { return null; }
}
""")
s2 = open(m, encoding='utf-8').read()
if 'OPTIONS_PROVIDER_CLASS_NAME' not in s2:
    s2 = s2.replace('</application>', '        <meta-data android:name="com.google.android.gms.cast.framework.OPTIONS_PROVIDER_CLASS_NAME" android:value="com.antunes.player.CastOpts" />\n        <service android:name=".DlService" android:exported="false" android:foregroundServiceType="dataSync" />\n    </application>', 1)
    open(m, 'w', encoding='utf-8').write(s2)
with open('android/app/proguard-rules.pro', 'a', encoding='utf-8') as f:
    f.write('\n-keep class com.antunes.player.CastOpts { *; }\n-keep class com.antunes.player.DlService { *; }\n')
print('chromecast added')

# Downloads: copied to the app's own Movies folder (resumable), shown in AntunesFlix -> Downloads, played offline
open(jd + 'Dl.java', 'w', encoding='utf-8').write(r"""package com.antunes.player;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Environment;
import java.io.File;
import java.util.Iterator;
import org.json.JSONArray;
import org.json.JSONObject;

/** The list of downloads (state, size, file), kept in SharedPreferences. */
public class Dl {
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("dl", Context.MODE_PRIVATE); }
    static File dir(Context c) { File d = new File(c.getExternalFilesDir(Environment.DIRECTORY_MOVIES), "Downloads"); d.mkdirs(); return d; }
    static synchronized JSONObject get(Context c, String id) { try { String s = prefs(c).getString(id, null); return s == null ? null : new JSONObject(s); } catch (Exception e) { return null; } }
    static synchronized void put(Context c, JSONObject d) { prefs(c).edit().putString(d.optString("id"), d.toString()).apply(); }
    static synchronized JSONArray all(Context c) {
        JSONArray a = new JSONArray();
        for (Object v : prefs(c).getAll().values()) { try { JSONObject d = new JSONObject(String.valueOf(v)); if ("run".equals(d.optString("state")) && !DlService.ACTIVE.contains(d.optString("id"))) d.put("state", "stop"); a.put(d); } catch (Exception ignored) { } }
        return a;
    }
    static void start(Context c, JSONObject d) throws Exception {
        String id = d.optString("id"); JSONObject old = get(c, id);
        String ext = d.optString("ext", "mp4").replaceAll("[^a-z0-9]", ""); if (ext.isEmpty()) ext = "mp4";
        d.put("path", new File(dir(c), id + "." + ext).getAbsolutePath()); d.put("state", "run"); d.put("at", System.currentTimeMillis());
        d.put("size", old != null ? old.optLong("size") : 0); d.put("total", old != null ? old.optLong("total") : 0);
        put(c, d); DlService.STOP.remove(id);
        Intent s = new Intent(c, DlService.class).putExtra("id", id);
        if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(s); else c.startService(s);
    }
    static synchronized void delete(Context c, String id) { JSONObject d = get(c, id); if (d != null) { try { new File(d.optString("path")).delete(); } catch (Exception ignored) { } } prefs(c).edit().remove(id).apply(); }
}
""")
open(jd + 'DlService.java', 'w', encoding='utf-8').write(r"""package com.antunes.player;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONObject;

/** Downloads a film or episode to the app's folder, resuming where it stopped if the connection drops. */
public class DlService extends Service {
    static final Set<String> STOP = Collections.synchronizedSet(new HashSet<String>());
    static final Set<String> ACTIVE = Collections.synchronizedSet(new HashSet<String>());
    private PowerManager.WakeLock wake; private WifiManager.WifiLock wifi;

    @Override public IBinder onBind(Intent i) { return null; }

    private Notification note(String title, String text, int pct, boolean ongoing) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= 26) { if (nm != null && nm.getNotificationChannel("dl") == null) nm.createNotificationChannel(new NotificationChannel("dl", "Downloads", NotificationManager.IMPORTANCE_LOW)); b = new Notification.Builder(this, "dl"); }
        else b = new Notification.Builder(this);
        b.setSmallIcon(getApplicationInfo().icon).setContentTitle(title).setContentText(text).setOngoing(ongoing).setOnlyAlertOnce(true);
        if (pct >= 0) b.setProgress(100, pct, false);
        return b.build();
    }

    @Override public int onStartCommand(Intent in, int flags, int startId) {
        Notification n = note("AntunesPlayer", "A descarregar…", 0, true);
        if (Build.VERSION.SDK_INT >= 29) startForeground(4343, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC); else startForeground(4343, n);
        final String id = in == null ? null : in.getStringExtra("id");
        final JSONObject d = id == null ? null : Dl.get(this, id);
        if (d == null || ACTIVE.contains(id)) { finishIfIdle(); return START_NOT_STICKY; }
        synchronized (this) {
            if (ACTIVE.isEmpty()) {
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE); if (pm != null) { wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "antunes:dl"); wake.acquire(8 * 3600 * 1000L); }
                WifiManager wm = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE); if (wm != null) { wifi = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "antunes:dl"); wifi.acquire(); }
            }
            ACTIVE.add(id);
        }
        new Thread(new Runnable() { public void run() { try { fetch(d); } finally { ACTIVE.remove(id); finishIfIdle(); } } }).start();
        return START_NOT_STICKY;
    }

    private synchronized void finishIfIdle() {
        if (!ACTIVE.isEmpty()) return;
        try { if (wake != null && wake.isHeld()) wake.release(); } catch (Exception ignored) { }
        try { if (wifi != null && wifi.isHeld()) wifi.release(); } catch (Exception ignored) { }
        stopForeground(true); stopSelf();
    }

    private void fetch(JSONObject d) {
        String id = d.optString("id"), name = d.optString("name"); File f = new File(d.optString("path"));
        long done = f.exists() ? f.length() : 0, total = d.optLong("total"); int fails = 0; long lastSave = 0; byte[] b = new byte[1 << 16];
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        while (!STOP.contains(id) && fails < 30 && (total == 0 || done < total)) {
            HttpURLConnection c = null; boolean got = false;
            try {
                String u = d.optString("url");
                for (int hop = 0; hop < 6; hop++) {
                    c = (HttpURLConnection) new URL(u).openConnection(); c.setConnectTimeout(15000); c.setReadTimeout(30000); c.setInstanceFollowRedirects(false);
                    String ua = d.optString("ua"); if (!ua.isEmpty()) c.setRequestProperty("User-Agent", ua);
                    if (done > 0) c.setRequestProperty("Range", "bytes=" + done + "-");
                    int code = c.getResponseCode();
                    if (code >= 300 && code < 400 && c.getHeaderField("Location") != null) { u = new URL(new URL(u), c.getHeaderField("Location")).toString(); c.disconnect(); continue; }
                    break;
                }
                int code = c.getResponseCode();
                if (code == 416) { break; }
                if (code >= 400) throw new Exception("HTTP " + code);
                boolean append = code == 206 && done > 0; if (!append) done = 0;
                long len = -1; try { len = Long.parseLong(c.getHeaderField("Content-Length")); } catch (Exception ignored) { } if (len > 0) total = done + len;
                d.put("total", total); d.put("state", "run"); Dl.put(this, d);
                InputStream in = c.getInputStream(); FileOutputStream out = new FileOutputStream(f, append);
                try {
                    int r; while (!STOP.contains(id) && (r = in.read(b)) > 0) {
                        out.write(b, 0, r); done += r; got = true;
                        long now = System.currentTimeMillis();
                        if (now - lastSave > 1500) { lastSave = now; d.put("size", done); Dl.put(this, d); if (nm != null) nm.notify(4343, note(name, (total > 0 ? (done * 100 / total) + "%" : (done >> 20) + " MB"), total > 0 ? (int) (done * 100 / total) : -1, true)); }
                    }
                } finally { try { out.close(); } catch (Exception ignored) { } try { in.close(); } catch (Exception ignored) { } }
                if (total == 0 && got && !STOP.contains(id)) { total = done; break; }
            } catch (Exception e) { }
            finally { if (c != null) c.disconnect(); }
            if (got) fails = 0; else fails++;
            if (!STOP.contains(id) && (total == 0 || done < total)) { try { Thread.sleep(got ? 500 : 3000); } catch (InterruptedException e) { break; } }
        }
        try {
            if (Dl.get(this, id) == null) { f.delete(); return; } // deleted meanwhile
            d.put("size", done); d.put("total", total);
            d.put("state", STOP.contains(id) ? "stop" : (total > 0 && done >= total) ? "ok" : "err"); Dl.put(this, d);
            if (nm != null && !STOP.contains(id)) nm.notify(id.hashCode(), note(name, "ok".equals(d.optString("state")) ? "Descarregado. Vê em AntunesFlix → Descarregados." : "Não foi possível descarregar.", -1, false));
        } catch (Exception ignored) { }
        STOP.remove(id);
    }
}
""")
print('downloads added')

# Built-in player for Dolby (AC3 / E-AC3 / TrueHD) and DTS sound: ExoPlayer (Media3) with Jellyfin's FFmpeg audio decoder.
# The WebView plays those films silently; app.js notices and opens them here instead, at the same point.
gs = open(g, encoding='utf-8').read()
if 'media3-exoplayer' not in gs:
    gs = re.sub(r'dependencies\s*\{', "dependencies {\n    implementation 'androidx.media3:media3-exoplayer:1.5.0'\n    implementation 'androidx.media3:media3-exoplayer-hls:1.5.0'\n    implementation 'androidx.media3:media3-ui:1.5.0'\n    implementation 'org.jellyfin.media3:media3-ffmpeg-decoder:1.5.0+1'", gs, count=1)
    open(g, 'w', encoding='utf-8').write(gs)
open(jd + 'NativePlayer.java', 'w', encoding='utf-8').write(r"""package com.antunes.player;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Toast;
import androidx.annotation.OptIn;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.audio.AudioCapabilities;
import androidx.media3.exoplayer.audio.AudioSink;
import androidx.media3.exoplayer.audio.DefaultAudioSink;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.CaptionStyleCompat;
import androidx.media3.ui.PlayerView;
import androidx.media3.ui.SubtitleView;

/** Full-screen player for films and episodes. Sound the device cannot decode (Dolby, DTS) goes through FFmpeg. */
@OptIn(markerClass = UnstableApi.class)
public class NativePlayer extends Activity {
    private ExoPlayer p;
    private PlayerView pv;
    private boolean ended, done;
    private String err = "";

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        Intent in = getIntent();
        String url = in.getStringExtra("url"), ua = in.getStringExtra("ua"), title = in.getStringExtra("title");
        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true).setConnectTimeoutMs(15000).setReadTimeoutMs(30000)
            .setUserAgent(ua != null && !ua.isEmpty() ? ua : "VLC/3.0.20 LibVLC/3.0.20");
        // Sound: FFmpeg first (AC3, E-AC3, TrueHD, DTS, AAC, MP3, FLAC…), turned into plain PCM. Many TV boxes list a Dolby
        // decoder that outputs silence (no licence), or pass Dolby to a TV that cannot play it: decoding here avoids both.
        DefaultRenderersFactory rf = new DefaultRenderersFactory(this) {
            @SuppressWarnings("deprecation")
            @Override protected AudioSink buildAudioSink(android.content.Context c, boolean floatOut, boolean params) {
                return new DefaultAudioSink.Builder().setAudioCapabilities(AudioCapabilities.DEFAULT_AUDIO_CAPABILITIES)
                    .setEnableFloatOutput(floatOut).setEnableAudioTrackPlaybackParams(params).build();
            }
        }
            .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
            .setEnableDecoderFallback(true);
        p = new ExoPlayer.Builder(this, rf)
            .setMediaSourceFactory(new DefaultMediaSourceFactory(new DefaultDataSource.Factory(this, http)))
            .setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(), true)
            .setHandleAudioBecomingNoisy(true)
            .setSeekBackIncrementMs(10000).setSeekForwardIncrementMs(10000)
            .build();
        if (in.getBooleanExtra("debug", false)) {
            p.addAnalyticsListener(new androidx.media3.exoplayer.util.EventLogger("NativePlayerTest"));
            p.addListener(new Player.Listener() { @Override public void onCues(androidx.media3.common.text.CueGroup g) {
                for (androidx.media3.common.text.Cue c : g.cues) android.util.Log.d("NativePlayerTest", "cues: " + c.text);
            } });
        }
        p.addListener(new Player.Listener() {
            @Override public void onPlaybackStateChanged(int st) { if (st == Player.STATE_ENDED) { ended = true; close(); } }
            @Override public void onPlayerError(PlaybackException e) {
                err = e.getErrorCodeName();
                Toast.makeText(NativePlayer.this, "Não foi possível reproduzir (" + err + ")", Toast.LENGTH_LONG).show();
                close();
            }
        });
        pv = new PlayerView(this);
        pv.setBackgroundColor(0xFF000000);
        pv.setShowSubtitleButton(true);
        pv.setShowNextButton(false);
        pv.setShowPreviousButton(false);
        pv.setControllerShowTimeoutMs(3500);
        pv.setKeepScreenOn(true);
        if (pv.getSubtitleView() != null) { // bigger, with an outline: readable on a TV from the sofa
            pv.getSubtitleView().setFractionalTextSize(SubtitleView.DEFAULT_TEXT_SIZE_FRACTION * 1.25f);
            pv.getSubtitleView().setStyle(new CaptionStyleCompat(0xFFFFFFFF, 0x00000000, 0x00000000, CaptionStyleCompat.EDGE_TYPE_OUTLINE, 0xFF000000, null));
        }
        pv.setPlayer(p);
        setContentView(pv);
        immersive();
        pv.requestFocus();
        MediaItem.Builder mb = new MediaItem.Builder().setUri(Uri.parse(url))
            .setMediaMetadata(new MediaMetadata.Builder().setTitle(title == null ? "" : title).build());
        String sub = in.getStringExtra("sub");
        if (sub != null && new java.io.File(sub).exists()) {
            String lang = in.getStringExtra("subLang"); if (lang == null) lang = "";
            String lang2 = lang.length() >= 2 ? lang.substring(0, 2) : lang;
            mb.setSubtitleConfigurations(java.util.Collections.singletonList(
                new MediaItem.SubtitleConfiguration.Builder(Uri.fromFile(new java.io.File(sub)))
                    .setMimeType(MimeTypes.TEXT_VTT).setLanguage(lang2).setLabel((in.getStringExtra("subLabel") == null ? lang : in.getStringExtra("subLabel")) + " · online")
                    .setSelectionFlags(C.SELECTION_FLAG_DEFAULT | C.SELECTION_FLAG_FORCED).build()));
            // show them from the start (the user can turn them off in the subtitles button)
            p.setTrackSelectionParameters(p.getTrackSelectionParameters().buildUpon().setPreferredTextLanguage(lang2).setSelectUndeterminedTextLanguage(true).build());
        }
        MediaItem item = mb.build();
        p.setMediaItem(item, Math.max(0, in.getLongExtra("pos", 0)));
        p.prepare();
        p.setPlayWhenReady(true);
    }

    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) immersive(); }

    // TV remote: with the controls hidden, left / right jump 10 s and OK pauses, like the app's own player
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int k = e.getKeyCode();
        if (p != null && pv != null && !pv.isControllerFullyVisible() && e.getAction() == KeyEvent.ACTION_DOWN) {
            if (k == KeyEvent.KEYCODE_DPAD_LEFT) { p.seekBack(); pv.showController(); return true; }
            if (k == KeyEvent.KEYCODE_DPAD_RIGHT) { p.seekForward(); pv.showController(); return true; }
            if (k == KeyEvent.KEYCODE_DPAD_CENTER || k == KeyEvent.KEYCODE_ENTER) { p.setPlayWhenReady(!p.getPlayWhenReady()); pv.showController(); return true; }
        }
        return super.dispatchKeyEvent(e);
    }

    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() { close(); }

    @Override protected void onPause() { super.onPause(); if (p != null && !isFinishing()) p.setPlayWhenReady(false); }

    private void close() {
        if (done) return;
        done = true;
        Intent d = new Intent();
        if (p != null) {
            long dur = p.getDuration();
            d.putExtra("pos", ended ? Math.max(0, dur) : p.getCurrentPosition());
            d.putExtra("dur", dur == C.TIME_UNSET ? 0 : dur);
        }
        d.putExtra("ended", ended);
        d.putExtra("err", err);
        setResult(RESULT_OK, d);
        finish();
    }

    @Override protected void onDestroy() { if (p != null) { p.release(); p = null; } super.onDestroy(); }
}
""")
s3 = open(m, encoding='utf-8').read()
if 'NativePlayer' not in s3:
    s3 = s3.replace('</application>', '        <activity android:name=".NativePlayer" android:exported="' + ('true' if os.environ.get('NATIVE_TEST') else 'false') + '" android:theme="@android:style/Theme.Black.NoTitleBar.Fullscreen" android:screenOrientation="sensorLandscape" android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize|keyboard|keyboardHidden|navigation|uiMode" />\n    </application>', 1)
    open(m, 'w', encoding='utf-8').write(s3)
with open('android/app/proguard-rules.pro', 'a', encoding='utf-8') as f:
    f.write('\n-keep class androidx.media3.decoder.ffmpeg.** { *; }\n-keep class com.antunes.player.NativePlayer { *; }\n')
# Media3 1.5 is compiled against Android 15 (API 35): compile with it too (targetSdk stays the same, so the app behaves the same)
if os.path.exists(v):
    t = open(v, encoding='utf-8').read()
    t = re.sub(r'compileSdkVersion\s*=\s*\d+', 'compileSdkVersion = 35', t)
    open(v, 'w', encoding='utf-8').write(t)
gp = 'android/gradle.properties'
if os.path.exists(gp) and 'suppressUnsupportedCompileSdk' not in open(gp, encoding='utf-8').read():
    open(gp, 'a', encoding='utf-8').write('\nandroid.suppressUnsupportedCompileSdk=35\n')
print('native player (Dolby / DTS sound) added')
