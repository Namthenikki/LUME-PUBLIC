package app.lume.deadlines;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.core.content.FileProvider;
import androidx.core.content.pm.PackageInfoCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Updates Lume from inside the app: downloads the latest APK from the site and hands it to Android's
 * installer, which puts it over this one. Same signing key, so the pairing and alarms stay.
 * Opened from "Install update" in the web app (lume://update).
 */
public class UpdateActivity extends Activity {
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
        setContentView(R.layout.activity_update);
        title = findViewById(R.id.title);
        status = findViewById(R.id.status);
        action = findViewById(R.id.action);
        close = findViewById(R.id.close);
        progress = findViewById(R.id.progress);
        close.setOnClickListener(v -> finish());
        begin();
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
        show("Update ready", "Tap Install when Android asks. Lume restarts on the new version, with your alarms still set.", "Install", v -> install(apk));
        install(apk);
    }

    private void install(File apk) {
        Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", apk);
        try {
            //noinspection deprecation: still the installer's entry point for a single APK, without a chooser
            startActivity(new Intent(Intent.ACTION_INSTALL_PACKAGE)
                    .setDataAndType(uri, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
        } catch (ActivityNotFoundException e) {
            startActivity(new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(uri, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
        }
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
