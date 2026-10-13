package app.lume.deadlines;

import android.content.ComponentName;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.TrustedWebUtils;
import androidx.browser.trusted.splashscreens.SplashScreenVersion;

import com.google.androidbrowserhelper.trusted.LauncherActivity;
import com.google.androidbrowserhelper.trusted.SessionStore;
import com.google.androidbrowserhelper.trusted.SharedPreferencesTokenStore;
import com.google.androidbrowserhelper.trusted.TwaLauncher;
import com.google.androidbrowserhelper.trusted.TwaProviderPicker;
import com.google.androidbrowserhelper.trusted.TwaSharedPreferencesManager;

/**
 * Opens Lume full screen (a Trusted Web Activity) and keeps the alarms in sync. The launch URL tells
 * the web app this app's version (so it can offer updates) and, until this phone is paired, its
 * device token, which the signed-in web app pairs with the student.
 *
 * On a fresh start it plays the intro animation ({@link IntroView}) and opens the browser when it
 * ends, while the browser warms up. The browser then shows the same mark on the same grey until the
 * page is ready. Meanwhile a paired phone fetches a one-time sign-in code, so the student is signed
 * in even in a browser that has no session yet (like Chrome, when this app moves there).
 */
public class LumeLauncherActivity extends LauncherActivity {
    private static final String CHROME = "com.android.chrome";
    /** How long the browser waits for the sign-in code after the intro, before opening without it. */
    private static final long SIGN_IN_GRACE_MS = 1500;

    private final Handler main = new Handler(Looper.getMainLooper());
    private IntroView intro;
    private TwaProviderPicker.Action pick;
    private CustomTabsServiceConnection warmUp;
    private boolean introDone;
    private boolean signInDone = true;
    private String signInCode;
    private boolean launched;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Alarms.ensureChannel(this);
        Reminders.ensureChannel(this);
        SyncWorker.enqueue(this);
        PermissionActivity.askIfNeeded(this);

        if (!isFinishing() && playsIntro()) {
            if (Device.isPaired(this)) fetchSignInCode();
            intro = new IntroView(this, this::introFinished);
            setContentView(intro);
            intro.play();
            if (warmUpTarget() != null) warmUpBrowser();
        }
    }

    private void fetchSignInCode() {
        signInDone = false;
        new Thread(() -> {
            String code = Api.signInCode(getApplicationContext(), 4000);
            main.post(() -> {
                signInCode = code;
                signInDone = true;
                launchWhenReady();
            });
        }).start();
    }

    private void introFinished() {
        introDone = true;
        if (!signInDone) main.postDelayed(() -> {
            signInDone = true;
            launchWhenReady();
        }, SIGN_IN_GRACE_MS);
        launchWhenReady();
    }

    private void launchWhenReady() {
        if (!introDone || !signInDone || launched) return;
        launched = true;
        launchTwa();
    }

    /** Starts the browser during the intro, so the page is quicker to show after it. */
    private void warmUpBrowser() {
        CustomTabsServiceConnection connection = new CustomTabsServiceConnection() {
            @Override
            public void onCustomTabsServiceConnected(@NonNull ComponentName name, @NonNull CustomTabsClient client) {
                client.warmup(0);
            }

            @Override
            public void onServiceDisconnected(ComponentName name) {}
        };
        if (CustomTabsClient.bindCustomTabsService(this, warmUpTarget(), connection)) warmUp = connection;
    }

    /** Only when this starts Lume's task, not when it just passes a link to an open Lume. */
    private boolean playsIntro() {
        return isTaskRoot();
    }

    // With the intro, the browser opens when it ends (see launchWhenReady).
    @Override
    protected boolean shouldLaunchImmediately() {
        return !playsIntro();
    }

    @Override
    protected TwaLauncher createTwaLauncher() {
        return new TwaLauncher(this, browser(), SessionStore.makeSessionId(getTaskId()), new SharedPreferencesTokenStore(this));
    }

    /** The browser the TWA library picks by itself (the phone's default, if it can run Lume full screen). */
    private TwaProviderPicker.Action pick() {
        if (pick == null) pick = TwaProviderPicker.pickProvider(getPackageManager());
        return pick;
    }

    /** Chrome, when the phone's own pick can't show Lume's splash screen (the page then loads on black) and Chrome can. */
    private String chromeInstead() {
        boolean twa = pick().launchMode == TwaProviderPicker.LaunchMode.TRUSTED_WEB_ACTIVITY;
        return (!twa || !showsSplash(pick().provider)) && showsSplash(CHROME) ? CHROME : null;
    }

    /** The browser to warm up during the intro: the one Lume will most likely open in. */
    private String warmUpTarget() {
        String chrome = chromeInstead();
        if (chrome != null) return chrome;
        return pick().launchMode == TwaProviderPicker.LaunchMode.TRUSTED_WEB_ACTIVITY ? pick().provider : null;
    }

    /**
     * The browser to open Lume in now: null leaves it to the library, as before. Moving to Chrome from
     * the browser Lume used last time only happens with a sign-in code in hand, so the student arrives
     * signed in; without one (offline, or this phone isn't paired) Lume stays put and tries next time.
     */
    private String browser() {
        String chrome = chromeInstead();
        String last = new TwaSharedPreferencesManager(this).readLastLaunchedProviderPackageName();
        boolean moving = chrome != null && last != null && !chrome.equals(last);
        return moving && signInCode == null ? null : chrome;
    }

    private boolean showsSplash(String pkg) {
        return pkg != null && TrustedWebUtils.areSplashScreensSupported(this, pkg, SplashScreenVersion.V1);
    }

    @Override
    protected void onDestroy() {
        main.removeCallbacksAndMessages(null);
        if (intro != null) intro.stop();
        if (warmUp != null) unbindService(warmUp);
        super.onDestroy();
    }

    @Override
    protected Uri getLaunchingUrl() {
        Uri.Builder url = super.getLaunchingUrl().buildUpon()
                .appendQueryParameter("lume_app", String.valueOf(BuildConfig.VERSION_CODE));
        if (!Device.isPaired(this)) url.appendQueryParameter("lume_device", Device.token(this));
        if (signInCode != null) url.appendQueryParameter("lume_signin", signInCode);
        return url.build();
    }
}
