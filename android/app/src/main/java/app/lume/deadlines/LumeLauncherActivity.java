package app.lume.deadlines;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import java.net.URISyntaxException;

/**
 * Lume itself: the web app in a WebView, with the intro animation ({@link IntroView}) on top. The page
 * loads behind the intro, and the intro only fades away once the page has drawn, so opening Lume never
 * shows a black or blank screen. (It used to hand the page to a browser, whose own startup showed black.)
 *
 * The launch URL tells the web app this app's version (so it can offer updates) and, until this phone
 * is paired, its device token, which the signed-in web app pairs with the student. The user agent ends
 * in "LumeApp/<version>", which is how the page knows it's inside the app.
 *
 * The WebView keeps its own session, so the first time it opens (moving here from a browser, or after
 * clearing data) nobody is signed in yet. A paired phone then signs its student in with a one-time
 * code, fetched while the intro plays (lib/alarm-devices.ts, "Phone sign-in"), so nobody has to paste
 * their LMS link again.
 */
public class LumeLauncherActivity extends Activity {
    private static final int PANEL = 0xFFF3F3F5;
    private static final int CARD = 0xFFFFFFFF;
    /** If the page still hasn't drawn this long after opening (very slow network), show it anyway. */
    private static final long REVEAL_ANYWAY_MS = 12_000;

    private final Handler main = new Handler(Looper.getMainLooper());
    private WebView web;
    private IntroView intro;
    private boolean introDone;
    private boolean pageDrawn;
    private Object backCallback;
    private boolean signInRetried;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Alarms.ensureChannel(this);
        Reminders.ensureChannel(this);
        SyncWorker.enqueue(this);
        PermissionActivity.askIfNeeded(this);
        UpdateActivity.opened(this);
        WindowCompat.enableEdgeToEdge(getWindow());

        // The page sits between the status bar and the navigation bar (and above the keyboard), on Lume's
        // grey, with white under it like the app's tab bar; the intro covers the whole screen.
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(PANEL);
        View navBar = new View(this);
        navBar.setBackgroundColor(CARD);
        root.addView(navBar, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, android.view.Gravity.BOTTOM));
        FrameLayout page = new FrameLayout(this);
        root.addView(page, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            page.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            navBar.getLayoutParams().height = bars.bottom;
            navBar.requestLayout();
            return WindowInsetsCompat.CONSUMED;
        });

        web = new WebView(this);
        web.setBackgroundColor(PANEL);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(settings.getUserAgentString() + " LumeApp/" + BuildConfig.VERSION_CODE);
        CookieManager.getInstance().setAcceptCookie(true);
        web.setWebViewClient(new PageClient());
        web.setWebChromeClient(new WebChromeClient()); // alerts and confirms from the page
        web.setDownloadListener((url, userAgent, disposition, mimeType, length) -> openOutside(Uri.parse(url)));
        page.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        if (savedInstanceState == null) {
            intro = new IntroView(this, () -> {
                introDone = true;
                revealWhenReady();
            });
            root.addView(intro, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            intro.play();
            main.postDelayed(() -> {
                pageDrawn = true;
                revealWhenReady();
            }, REVEAL_ANYWAY_MS);
        }
        setContentView(root);
        open(getIntent());
    }

    /** Loads the page: straight away if this WebView is signed in, else after a sign-in code (paired phones). */
    private void open(Intent intent) {
        if (hasSession() || !Device.isPaired(this)) web.loadUrl(launchUrl(intent, null));
        else signInThenLoad(intent);
    }

    private void signInThenLoad(Intent intent) {
        new Thread(() -> {
            String code = Api.signInCode(getApplicationContext(), 6000);
            runOnUiThread(() -> {
                if (!isDestroyed()) web.loadUrl(launchUrl(intent, code));
            });
        }).start();
    }

    /** This WebView has a Lume session cookie (whether it's still current is the site's call). */
    private static boolean hasSession() {
        String cookies = CookieManager.getInstance().getCookie(Api.ORIGIN);
        return cookies != null && cookies.contains("lume_user=");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // A link or a notification into a particular page; opening from the launcher just comes back.
        if (lumeUrl(intent.getData())) web.loadUrl(launchUrl(intent, null));
    }

    /** The page to open: the intent's own Lume link, or the dashboard; with a sign-in code if there is one. */
    private String launchUrl(Intent intent, String signInCode) {
        Uri data = intent.getData();
        Uri.Builder url = (lumeUrl(data) ? data : Uri.parse(Api.ORIGIN + "/dashboard")).buildUpon()
                .appendQueryParameter("lume_app", String.valueOf(BuildConfig.VERSION_CODE));
        if (!Device.isPaired(this)) url.appendQueryParameter("lume_device", Device.token(this));
        if (signInCode != null) url.appendQueryParameter("lume_signin", signInCode);
        return url.build().toString();
    }

    private static boolean lumeUrl(Uri uri) {
        if (uri == null) return false;
        Uri origin = Uri.parse(Api.ORIGIN);
        return origin.getScheme().equals(uri.getScheme()) && origin.getAuthority().equals(uri.getAuthority());
    }

    /** The intro fades out once it has played and the page has drawn underneath it. */
    private void revealWhenReady() {
        if (intro == null || !introDone || !pageDrawn) return;
        IntroView leaving = intro;
        intro = null;
        main.removeCallbacksAndMessages(null);
        leaving.animate().alpha(0f).setDuration(220).withEndAction(() -> {
            leaving.stop();
            ((ViewGroup) leaving.getParent()).removeView(leaving);
        });
    }

    private final class PageClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (lumeUrl(uri)) return false;
            if ("intent".equals(uri.getScheme())) openIntentLink(uri.toString());
            else openOutside(uri);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            updateBack();
            // On "Connect your LMS" though this phone is paired (the sign-in code didn't come in time, or this
            // session ended): sign in with a fresh code instead, once.
            Uri uri = Uri.parse(url);
            if (!signInRetried && lumeUrl(uri) && "/start".equals(uri.getPath()) && Device.isPaired(LumeLauncherActivity.this)) {
                signInRetried = true;
                view.stopLoading();
                signInThenLoad(getIntent());
            }
        }

        @Override
        public void onPageCommitVisible(WebView view, String url) {
            if (!pageDrawn) {
                pageDrawn = true;
                revealWhenReady();
            }
        }

        @Override
        public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
            updateBack();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (!request.isForMainFrame()) return;
            view.loadDataWithBaseURL(null, offlinePage(launchUrl(getIntent(), null)), "text/html", "utf-8", null);
        }
    }

    /** Lume's buttons for the app (lume://sync, lume://update...) come as Android intent links. */
    private void openIntentLink(String link) {
        try {
            Intent intent = Intent.parseUri(link, Intent.URI_INTENT_SCHEME);
            if (!getPackageName().equals(intent.getPackage())) {
                // Someone else's app: only as an ordinary link, never a direct component.
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setComponent(null);
                intent.setSelector(null);
            }
            try {
                startActivity(intent);
            } catch (ActivityNotFoundException e) {
                String fallback = intent.getStringExtra("browser_fallback_url");
                if (fallback != null) openOutside(Uri.parse(fallback));
            }
        } catch (URISyntaxException ignored) {
            // not a link Lume can open
        }
    }

    /** Anything that isn't Lume (an LMS or NPTEL page, a download, mail) opens in its own app. */
    private void openOutside(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
        } catch (ActivityNotFoundException ignored) {
            // nothing on the phone opens it
        }
    }

    private static String offlinePage(String retryUrl) {
        return "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>"
                + "<body style='margin:0;min-height:100vh;display:grid;place-items:center;background:#F3F3F5;"
                + "font:16px system-ui,sans-serif;color:#0E0E11;text-align:center'><div style='padding:24px'>"
                + "<p style='font-size:20px;font-weight:600;margin:0 0 6px'>Can’t reach Lume</p>"
                + "<p style='color:#62626B;margin:0 0 20px'>Check your connection. Your alarms still ring.</p>"
                + "<a href='" + retryUrl.replace("'", "%27") + "' style='display:inline-block;background:#1D6EF5;color:#fff;"
                + "text-decoration:none;font-weight:600;padding:12px 22px;border-radius:12px'>Try again</a></div>";
    }

    /** Back goes back in Lume's pages, and closes Lume from the first one. */
    private void updateBack() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        boolean canGoBack = web.canGoBack();
        if (canGoBack && backCallback == null) {
            OnBackInvokedCallback callback = () -> web.goBack();
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, callback);
            backCallback = callback;
        } else if (!canGoBack && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback((OnBackInvokedCallback) backCallback);
            backCallback = null;
        }
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        // Android 12 and older; newer versions use the callback in updateBack.
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        web.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        main.removeCallbacksAndMessages(null);
        if (intro != null) intro.stop();
        web.destroy();
        super.onDestroy();
    }
}
