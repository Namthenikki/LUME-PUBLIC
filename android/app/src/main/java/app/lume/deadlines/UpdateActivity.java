package app.lume.deadlines;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.core.content.IntentCompat;
import androidx.core.content.pm.PackageInfoCompat;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Updates Lume from inside the app: downloads the latest APK from the site and installs it over this
 * one with Android's PackageInstaller. Same signing key, so the pairing and alarms stay. Android
 * reports back here when it's done (starting the new version to do so), and Lume reopens by itself
 * on the new version. Opened from "Install update" in the web app (lume://update).
 */
public class UpdateActivity extends Activity {
    static final String INSTALL_STATUS = "app.lume.deadlines.INSTALL_STATUS";

    private TextView title;
    private TextView status;
    private TextView action;
    private TextView close;
    private ProgressBar progress;
    private volatile boolean cancelled;
    /** Waiting to come back from Android's "Install unknown apps" setting. */
    private boolean askedToAllow;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (installStatus(getIntent()) == PackageInstaller.STATUS_SUCCESS) {
            restartLume();
            return;
        }
        setContentView(R.layout.activity_update);
        title = findViewById(R.id.title);
        status = findViewById(R.id.status);
        action = findViewById(R.id.action);
        close = findViewById(R.id.close);
        progress = findViewById(R.id.progress);
        close.setOnClickListener(v -> finish());
        if (INSTALL_STATUS.equals(getIntent().getAction())) onInstallStatus(getIntent());
        else begin();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (INSTALL_STATUS.equals(intent.getAction())) onInstallStatus(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (askedToAllow && getPackageManager().canRequestPackageInstalls()) {
            askedToAllow = false;
            begin();
        }
    }

    private void begin() {
        if (!getPackageManager().canRequestPackageInstalls()) {
            askedToAllow = true;
            show("Allow Lume to install updates", "Android asks once. Turn on Allow from this source, then come back here.", "Open settings",
                    v -> startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()))));
            return;
        }
        show("Downloading update", "Your alarms stay set while it updates.", null, null);
        close.setText("Cancel");
        progress.setIndeterminate(true);
        progress.setVisibility(View.VISIBLE);
        cancelled = false;
        new Thread(this::download).start();
    }

    private void download() {
        File apk = new File(new File(getCacheDir(), "updates"), "lume.apk");
        try {
            //noinspection ResultOfMethodCallIgnored
            apk.getParentFile().mkdirs();
            HttpURLConnection con = (HttpURLConnection) new URL(Api.ORIGIN + "/downloads/lume.apk").openConnection();
            con.setConnectTimeout(15_000);
            con.setReadTimeout(30_000);
            con.setUseCaches(false);
            try {
                if (con.getResponseCode() != 200) throw new IOException("Lume answered HTTP " + con.getResponseCode());
                long total = con.getContentLengthLong();
                try (InputStream in = con.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
                    byte[] buffer = new byte[64 * 1024];
                    long done = 0;
                    int shown = -1;
                    for (int n; (n = in.read(buffer)) != -1; ) {
                        if (cancelled) return;
                        out.write(buffer, 0, n);
                        done += n;
                        int percent = total > 0 ? (int) (done * 100 / total) : -1;
                        if (percent != shown) {
                            shown = percent;
                            runOnUiThread(() -> {
                                progress.setIndeterminate(false);
                                progress.setProgress(percent);
                            });
                        }
                    }
                }
            } finally {
                con.disconnect();
            }
            runOnUiThread(() -> downloaded(apk));
        } catch (IOException e) {
            if (!cancelled) runOnUiThread(this::failed);
        }
    }

    private void downloaded(File apk) {
        if (isFinishing()) return;
        progress.setVisibility(View.GONE);
        PackageInfo info = getPackageManager().getPackageArchiveInfo(apk.getPath(), 0);
        if (info == null || !getPackageName().equals(info.packageName)) {
            failed();
            return;
        }
        if (PackageInfoCompat.getLongVersionCode(info) <= BuildConfig.VERSION_CODE) {
            show("Lume is up to date", "You already have the latest version.", "Back to Lume", v -> backToLume());
            return;
        }
        install(apk);
    }

    private void install(File apk) {
        show("Installing update", "Lume reopens by itself on the new version, with your alarms still set.", null, null);
        progress.setIndeterminate(true);
        progress.setVisibility(View.VISIBLE);
        new Thread(() -> {
            try {
                PackageInstaller installer = getPackageManager().getPackageInstaller();
                PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
                params.setAppPackageName(getPackageName());
                // Android asks "Update this app?" until Lume has installed itself once; then it lets updates through.
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
                }
                int id = installer.createSession(params);
                try (PackageInstaller.Session session = installer.openSession(id)) {
                    try (InputStream in = new FileInputStream(apk); OutputStream out = session.openWrite("lume.apk", 0, apk.length())) {
                        byte[] buffer = new byte[64 * 1024];
                        for (int n; (n = in.read(buffer)) != -1; ) out.write(buffer, 0, n);
                        session.fsync(out);
                    }
                    // Android reports back by starting this screen: in the new version, once it's installed.
                    Intent status = new Intent(this, UpdateActivity.class).setAction(INSTALL_STATUS);
                    session.commit(PendingIntent.getActivity(this, id, status,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE).getIntentSender());
                }
            } catch (IOException | RuntimeException e) {
                runOnUiThread(() -> installFailed(null));
            }
        }).start();
    }

    private static int installStatus(Intent intent) {
        if (!INSTALL_STATUS.equals(intent.getAction())) return Integer.MIN_VALUE;
        return intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
    }

    private void onInstallStatus(Intent intent) {
        int status = installStatus(intent);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = IntentCompat.getParcelableExtra(intent, Intent.EXTRA_INTENT, Intent.class);
            if (confirm != null) startActivity(confirm);
            else installFailed(null);
        } else if (status == PackageInstaller.STATUS_SUCCESS) {
            restartLume();
        } else if (status == PackageInstaller.STATUS_FAILURE_ABORTED) {
            progress.setVisibility(View.GONE);
            show("Update not installed", "It was cancelled before it finished.", "Try again", v -> begin());
        } else {
            installFailed(intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE));
        }
    }

    private void installFailed(String reason) {
        progress.setVisibility(View.GONE);
        show("Couldn't install the update", reason != null ? "Android said: " + reason : "Try again in a moment.", "Try again", v -> begin());
    }

    /** The new version is in: start Lume afresh, in place of the old page that's still open. */
    private void restartLume() {
        startActivity(new Intent(this, LumeLauncherActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK));
        finish();
    }

    private void failed() {
        progress.setVisibility(View.GONE);
        show("Couldn't download the update", "Check your connection and try again.", "Try again", v -> begin());
    }

    /** Reopens Lume, which tells the web app its version again (so the update button goes away). */
    private void backToLume() {
        startActivity(new Intent(this, LumeLauncherActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        finish();
    }

    private void show(String heading, String text, String button, View.OnClickListener onClick) {
        title.setText(heading);
        status.setText(text);
        close.setText("Close");
        action.setVisibility(button == null ? View.GONE : View.VISIBLE);
        action.setText(button);
        action.setOnClickListener(onClick);
    }

    @Override
    protected void onDestroy() {
        cancelled = true;
        super.onDestroy();
    }
}
