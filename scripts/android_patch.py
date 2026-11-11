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
