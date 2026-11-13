#!/bin/bash
# Run by .github/workflows/native-player-test.yml inside the Android emulator job.
# Opens the real app, adds a test playlist, plays films with AC3 / DTS / E-AC3 sound in the app's own player and checks:
# the native engine plays under the app's screen (picture visible), sound is decoded and playing, subtitles (the file's
# own and an online one) are shown, seek / pause / play work, and leaving the player stops it.
set -u
mkdir -p out media/movie
cp media/test-*.mkv media/movie/
python3 -m http.server 8000 --directory media </dev/null >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null; kill ${LIVE:-0} 2>/dev/null' EXIT
sleep 2
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell settings put system screen_off_timeout 600000
fail=0
check() { "$@" || fail=1; }

launch() {
  adb shell am force-stop com.antunes.player
  adb shell monkey -p com.antunes.player -c android.intent.category.LAUNCHER 1 >/dev/null
  sleep 10
  pid=$(adb shell pidof com.antunes.player | tr -d '\r')
  adb forward --remove-all
  adb forward tcp:9222 localabstract:webview_devtools_remote_$pid
  sleep 1
}

launch
node scripts/native-e2e.mjs setup
sleep 8

for f in AC3 DTS EAC3; do
  adb logcat -c
  check node scripts/native-e2e.mjs play "$f"
  adb exec-out screencap -p > "out/$f.png"
  adb shell dumpsys audio > "out/$f-audio.txt"
  adb logcat -d > "out/$f-logcat.txt"
  dec=$(grep -o "audioDecoderInitialized[^]]*\]" "out/$f-logcat.txt" | head -1 | sed 's/.*, //')
  playing=$(grep -c "state:started" "out/$f-audio.txt")
  subs=$(grep "NativeVideoTest: cues:" "out/$f-logcat.txt" | sed 's/.*cues: //' | sort -u | head -2 | tr '\n' '|')
  # the picture must show through the app's (transparent) page: the test video is coloured bars, not black
  pic=$(python3 -c "
from PIL import Image; im=Image.open('out/$f.png').convert('RGB'); w,h=im.size
px=[im.getpixel((int(w*x/10),int(h*y/10))) for x in range(2,9) for y in range(3,7)]
print(len(set(px)), max(max(p) for p in px))")
  grep "NativeVideoTest" "out/$f-logcat.txt" | grep -E "cues:|x-media3-cues" | cut -c1-200 | head -6
  echo "  $f: audio decoder=$dec, audio playing=$playing, subtitles shown=[$subs], picture colours/brightest=$pic"
  [ -n "$dec" ] && [ "$playing" -ge 1 ] && echo "$subs" | grep -q "Legenda de teste" || { echo "  FAILED $f (sound or subtitles)"; fail=1; }
  [ "$(echo $pic | cut -d' ' -f1)" -ge 6 ] || { echo "  FAILED $f (picture not visible under the app)"; fail=1; }
  if [ $f = AC3 ]; then
    adb logcat -c
    check node scripts/native-e2e.mjs sub
    adb logcat -d > out/sub-logcat.txt
    grep "NativeVideoTest" out/sub-logcat.txt | grep -E "cues|\[X\].*text|x-media3-cues|DecoderInit|playerFailed|loadError" | cut -c1-260 | head -12
    grep -q "cues: Legenda online de teste" out/sub-logcat.txt && echo "  online subtitle shown" || { echo "  FAILED online subtitle not shown"; fail=1; }
    check node scripts/native-e2e.mjs seek
    check node scripts/native-e2e.mjs pause
    check node scripts/native-e2e.mjs tracks
  fi
  check node scripts/native-e2e.mjs stop
  sleep 2
done
# ---- live channel (football on a busy server): a real-time HLS stream, then the server goes down and comes back
live() { ffmpeg -loglevel error -re -f lavfi -i testsrc=size=640x360:rate=25 -f lavfi -i "sine=f=440:sample_rate=48000" \
  -c:v libx264 -preset ultrafast -g 50 -c:a aac -ac 2 -f hls -hls_time 2 -hls_list_size 6 \
  -hls_flags delete_segments -hls_start_number_source epoch media/live/canal.m3u8 </dev/null >/dev/null 2>&1 & LIVE=$!; }
cpu() { # CPU used by the app and its WebView over 6 seconds (lower = less battery)
  adb shell top -b -n 2 -d 6 -o %CPU,ARGS | awk '/antunes|webview|sandboxed/ {s+=$1} /^Tasks/ {n++; if (n==2) s=0} END {print s}'
}
mkdir -p media/live
live
sleep 8
adb logcat -c
check node scripts/native-e2e.mjs live
echo "  CPU, live full screen (native engine): $(cpu)%"
kill $LIVE; echo "  server down for 12 s"; sleep 12
live; echo "  server back"; sleep 25
adb logcat -d > out/live-logcat.txt
grep "NativeVideoTest" out/live-logcat.txt | grep -E "playerFailed|loadError|state \[" | cut -c1-200 | tail -8
check node scripts/native-e2e.mjs check
check node scripts/native-e2e.mjs preview
echo "  CPU, live small preview (web player): $(cpu)%"
kill $LIVE
grep -h "AndroidRuntime\|FATAL" out/*-logcat.txt | head -20
exit $fail
