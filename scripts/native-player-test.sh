#!/bin/bash
# Run by .github/workflows/native-player-test.yml inside the Android emulator job.
# Plays each test video in the native player and checks: an audio track is playing, no playback error, frames shown.
set -u
mkdir -p out
cd media && python3 -m http.server 8000 </dev/null >/dev/null 2>&1 &
SRV=$!
cd ..
trap 'kill $SRV 2>/dev/null' EXIT
sleep 2
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell settings put system screen_off_timeout 600000
fail=0
for a in ac3 eac3 dca aac; do
  adb logcat -c
  adb shell am start -W -n com.antunes.player/.NativePlayer --es url "http://10.0.2.2:8000/test-$a.mkv" --es title test_$a --ez debug true
  sleep 12
  adb exec-out screencap -p > "out/$a.png"
  adb shell dumpsys audio > "out/$a-audio.txt"
  adb logcat -d > "out/$a-logcat.txt"
  started=$(grep -c "state:started" "out/$a-audio.txt")
  err=$(grep -c "playerFailed\|PlaybackException\|FATAL EXCEPTION" "out/$a-logcat.txt")
  dec=$(grep -o "audioDecoderInitialized[^]]*\]" "out/$a-logcat.txt" | head -1)
  vdec=$(grep -c "videoDecoderInitialized\|renderedFirstFrame" "out/$a-logcat.txt")
  echo "$a: audio playing=$started errors=$err video=$vdec decoder=$dec"
  grep "NativePlayerTest" "out/$a-logcat.txt" | grep -E "DecoderInitialized|tracks|playerFailed|state \[|renderedFirstFrame" | cut -c1-220 | head -14
  if [ "$started" -lt 1 ] || [ "$err" -gt 0 ] || [ -z "$dec" ]; then fail=1; echo "  FAILED $a"; grep -i "exception\|error" "out/$a-logcat.txt" | grep -i "media3\|exo\|NativePlayer\|antunes\|ffmpeg" | head -20; fi
  adb shell input keyevent KEYCODE_BACK
  sleep 2
done
exit $fail
