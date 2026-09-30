package app.lume.deadlines;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

/**
 * Asks for notification permission (Android 13+). Alarms are notifications too, so without it
 * Android silently drops them. Shown over Lume on first launch, and before a test alarm.
 */
public class PermissionActivity extends Activity {
    static boolean needed(Context c) {
        return Build.VERSION.SDK_INT >= 33
                && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED;
    }

    /** At most twice on its own: after that, Android stops showing the prompt anyway. */
    static void askIfNeeded(Context c) {
        int asked = Device.prefs(c).getInt("notification_asks", 0);
        if (!needed(c) || asked >= 2) return;
        Device.prefs(c).edit().putInt("notification_asks", asked + 1).apply();
        c.startActivity(new Intent(c, PermissionActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (needed(this)) requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        else finish();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        finish();
    }
}
