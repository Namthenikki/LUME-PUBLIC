package app.lume.deadlines;

import android.net.Uri;
import android.os.Bundle;

import androidx.annotation.Nullable;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

/**
 * Opens Lume full screen (a Trusted Web Activity) and keeps the alarms in sync. The launch URL tells
 * the web app this app's version (so it can offer updates) and, until this phone is paired, its
 * device token, which the unlocked web app approves.
 *
 * On a fresh start it plays the intro animation ({@link IntroView}) while Chrome connects and
 * preloads the page, then hands over to Chrome's splash, which shows the same mark in the same place.
 */
public class LumeLauncherActivity extends LauncherActivity {
    private IntroView intro;
    private boolean introPlaying;
    private boolean enterAnimationDone;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Alarms.ensureChannel(this);
        Reminders.ensureChannel(this);
        SyncWorker.enqueue(this);
        PermissionActivity.askIfNeeded(this);

        // Only when this starts Lume's task (not when it just passes a link to an open Lume).
        if (!isFinishing() && isTaskRoot()) {
            intro = new IntroView(this, this::introFinished);
            setContentView(intro); // over the library's static splash; the intro ends on the same image
            introPlaying = true;
            intro.play();
        }
    }

    // The TWA library opens Chrome once this screen's enter animation has finished (it preloads the
    // page meanwhile), so holding that back until the intro ends lets both happen at once.
    @Override
    public void onEnterAnimationComplete() {
        enterAnimationDone = true;
        if (!introPlaying) super.onEnterAnimationComplete();
    }

    private void introFinished() {
        introPlaying = false;
        if (enterAnimationDone) super.onEnterAnimationComplete();
    }

    @Override
    protected void onDestroy() {
        if (intro != null) intro.stop();
        super.onDestroy();
    }

    @Override
    protected Uri getLaunchingUrl() {
        Uri.Builder url = super.getLaunchingUrl().buildUpon()
                .appendQueryParameter("lume_app", String.valueOf(BuildConfig.VERSION_CODE));
        if (!Device.isPaired(this)) url.appendQueryParameter("lume_device", Device.token(this));
        return url.build();
    }
}
