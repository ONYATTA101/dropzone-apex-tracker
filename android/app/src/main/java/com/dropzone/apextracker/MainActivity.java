package com.dropzone.apextracker;

import android.app.Activity;
import android.content.Context;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.dropzone.apextracker.widget.RankPulseWidgetProvider;
import com.dropzone.apextracker.widget.RankPulseWidgetRosterStore;

/**
 * Native Android shell for the Dropzone dashboard.
 *
 * This keeps the experience inside the installed app instead of opening the user's browser.
 * Later, this screen can become fully native while the widget keeps using server summaries.
 */
public class MainActivity extends Activity {
    private static final String DASHBOARD_URL = "https://dropzone-apex-tracker.vercel.app";
    private static final String DEFAULT_PROFILE_JSON = "{\"name\":\"blumoat_onyatta\",\"platform\":\"PS4\"}";
    private static final String ROSTER_SYNC_SCRIPT =
        "(function(){"
            + "if(window.__dropzoneAndroidRosterSync){window.__dropzoneAndroidRosterSync();return;}"
            + "function sync(){try{"
            + "var profile=localStorage.getItem('dropzone-profile')||'" + DEFAULT_PROFILE_JSON + "';"
            + "var friends=localStorage.getItem('dropzone-friends')||'[]';"
            + "if(window.DropzoneAndroid){window.DropzoneAndroid.saveTrackedRoster(profile,friends);}"
            + "}catch(e){}}"
            + "window.__dropzoneAndroidRosterSync=sync;"
            + "var originalSetItem=localStorage.setItem;"
            + "localStorage.setItem=function(key,value){"
            + "var result=originalSetItem.apply(this,arguments);"
            + "if(key==='dropzone-profile'||key==='dropzone-friends'){setTimeout(sync,0);}"
            + "return result;"
            + "};"
            + "window.addEventListener('storage',sync);"
            + "setInterval(sync,10000);"
            + "sync();"
            + "})();";
    private WebView dashboardWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        applySystemBarPadding();

        dashboardWebView = findViewById(R.id.dashboard_web_view);
        WebSettings settings = dashboardWebView.getSettings();

        // The Next.js dashboard needs JavaScript and local storage for the roster UI.
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // Avoid showing an old cached dashboard after a production redeploy or RP refresh fix.
        dashboardWebView.clearCache(true);
        dashboardWebView.addJavascriptInterface(new DropzoneAndroidBridge(this), "DropzoneAndroid");
        dashboardWebView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(ROSTER_SYNC_SCRIPT, null);
            }
        });
        dashboardWebView.loadUrl(DASHBOARD_URL + "?refresh=" + System.currentTimeMillis());
    }

    private void applySystemBarPadding() {
        View root = findViewById(R.id.dashboard_root);
        root.setOnApplyWindowInsetsListener((view, windowInsets) -> {
            int left;
            int top;
            int right;
            int bottom;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets systemBars = windowInsets.getInsets(WindowInsets.Type.systemBars());
                left = systemBars.left;
                top = systemBars.top;
                right = systemBars.right;
                bottom = systemBars.bottom;
            } else {
                left = windowInsets.getSystemWindowInsetLeft();
                top = windowInsets.getSystemWindowInsetTop();
                right = windowInsets.getSystemWindowInsetRight();
                bottom = windowInsets.getSystemWindowInsetBottom();
            }

            // Android 15+ draws apps edge-to-edge, so the WebView needs safe-area padding.
            view.setPadding(left, top, right, bottom);
            return windowInsets;
        });
        root.requestApplyInsets();
    }

    @Override
    public void onBackPressed() {
        if (dashboardWebView != null && dashboardWebView.canGoBack()) {
            dashboardWebView.goBack();
            return;
        }

        super.onBackPressed();
    }

    private static final class DropzoneAndroidBridge {
        private final Context appContext;

        DropzoneAndroidBridge(Context context) {
            appContext = context.getApplicationContext();
        }

        @JavascriptInterface
        public void saveTrackedRoster(String profileJson, String friendsJson) {
            RankPulseWidgetRosterStore.saveTrackedRoster(appContext, profileJson, friendsJson);
            RankPulseWidgetProvider.refreshAllWidgets(appContext);
        }

        @JavascriptInterface
        public void tapHaptic() {
            try {
                Vibrator vibrator = (Vibrator) appContext.getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator == null || !vibrator.hasVibrator()) return;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    vibrator.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK));
                    return;
                }

                vibrator.vibrate(VibrationEffect.createOneShot(12, VibrationEffect.DEFAULT_AMPLITUDE));
            } catch (RuntimeException ignored) {
                // WebView keeps the visual tap animation even if the device blocks vibration.
            }
        }
    }
}
