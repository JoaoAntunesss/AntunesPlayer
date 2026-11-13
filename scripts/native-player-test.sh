#!/bin/bash
# Run by .github/workflows/native-player-test.yml inside the Android emulator job.
# Plays each test video in the native player and checks: an audio track is playing, no playback error, frames shown.
set -u
mkdir -p out
python3 -m http.server 8000 --directory media </dev/null >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 2
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell settings put system screen_off_timeout 600000
fail=0
# an online subtitle, as the app hands it over (a WebVTT file in the app's own folder)
printf 'WEBVTT\n\n00:00:01.000 --> 00:00:20.000\nLegenda online de teste\n' > media/online.vtt
for a in ac3 eac3 dca aac online; do
  adb logcat -c
  f=$a; extra=""
  if [ $a = online ]; then f=aac; extra="--es sub http://10.0.2.2:8000/online.vtt --es subLang pt-pt --es subLabel Portugues --es subLangs pt-pt,en"; else extra="--es subLangs pt-pt,en"; fi
  adb shell am start -W -n com.antunes.player/.NativePlayer --es url "http://10.0.2.2:8000/test-$f.mkv" --es title test_$a --ez debug true $extra
  sleep 12
  adb exec-out screencap -p > "out/$a.png"
  adb shell dumpsys audio > "out/$a-audio.txt"
  adb logcat -d > "out/$a-logcat.txt"
  started=$(grep -c "state:started" "out/$a-audio.txt")
  err=$(grep -c "playerFailed\|PlaybackException\|FATAL EXCEPTION" "out/$a-logcat.txt")
  dec=$(grep -o "audioDecoderInitialized[^]]*\]" "out/$a-logcat.txt" | head -1)
  vdec=$(grep -c "videoDecoderInitialized\|renderedFirstFrame" "out/$a-logcat.txt")
  echo "$a: audio playing=$started errors=$err video=$vdec decoder=$dec"
  grep "NativePlayerTest" "out/$a-logcat.txt" | grep -E "DecoderInitialized|playerFailed" | cut -c1-200
  echo "  selected tracks:"; grep "NativePlayerTest" "out/$a-logcat.txt" | grep "\[X\]" | sed 's/.*NativePlayerTest: *//' | cut -c1-200
  echo "  subtitle shown:"; grep "NativePlayerTest: cues:" "out/$a-logcat.txt" | sed 's/.*cues: //' | sort -u | head -3
  cues=$(grep -c "NativePlayerTest: cues: Legenda" "out/$a-logcat.txt")
  want="Legenda de teste"; [ $a = online ] && want="Legenda online de teste"
  grep -q "cues: $want" "out/$a-logcat.txt" || { echo "  subtitle '$want' NOT shown"; cues=0; }
  if [ "$started" -lt 1 ] || [ "$err" -gt 0 ] || [ -z "$dec" ] || [ "$cues" -lt 1 ]; then fail=1; echo "  FAILED $a"; grep -i "exception\|error" "out/$a-logcat.txt" | grep -i "media3\|exo\|NativePlayer\|antunes\|ffmpeg" | head -20; fi
  adb shell input keyevent KEYCODE_BACK
  sleep 2
done
exit $fail
