package app.lume.deadlines;

import android.net.Uri;
import android.os.Bundle;

import androidx.annotation.Nullable;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

/**
 * Opens Lume full screen (a Trusted Web Activity) and keeps the alarms in sync. The launch URL tells
 * the web app this app's version (so it can offer updates) and, until this phone is paired, its
 * device token, which the unlocked web app approves.
 */
public class LumeLauncherActivity extends LauncherActivity {
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Alarms.ensureChannel(this);
        Reminders.ensureChannel(this);
        SyncWorker.enqueue(this);
        PermissionActivity.askIfNeeded(this);
    }

    @Override
    protected Uri getLaunchingUrl() {
        Uri.Builder url = super.getLaunchingUrl().buildUpon()
                .appendQueryParameter("lume_app", String.valueOf(BuildConfig.VERSION_CODE));
        if (!Device.isPaired(this)) url.appendQueryParameter("lume_device", Device.token(this));
        return url.build();
    }
}
