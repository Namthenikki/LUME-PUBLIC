package app.lume.deadlines;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import java.security.SecureRandom;

/** This phone's identity for Lume: a random token the owner approves once, from the unlocked web app. */
final class Device {
    private Device() {}

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("lume", Context.MODE_PRIVATE);
    }

    static synchronized String token(Context c) {
        String token = prefs(c).getString("device_token", null);
        if (token == null) {
            byte[] bytes = new byte[32];
            new SecureRandom().nextBytes(bytes);
            token = Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
            prefs(c).edit().putString("device_token", token).apply();
        }
        return token;
    }

    /** True once Lume has accepted the token (the alarm feed answered). */
    static boolean isPaired(Context c) {
        return prefs(c).getBoolean("paired", false);
    }

    static void setPaired(Context c, boolean paired) {
        prefs(c).edit().putBoolean("paired", paired).apply();
    }
}
