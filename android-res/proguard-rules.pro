# Capacitor finds plugins and their methods by reflection: keep them
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,Exceptions
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keep class com.capacitorjs.plugins.** { *; }
-keep class io.capawesome.capacitorjs.plugins.** { *; }
-keep class com.antunes.player.** { *; }
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-dontwarn com.facebook.**
-dontwarn com.google.android.gms.games.**
