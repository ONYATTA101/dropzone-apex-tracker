package com.dropzone.apextracker;

import android.app.Activity;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Native Android shell for the Dropzone dashboard.
 *
 * This keeps the experience inside the installed app instead of opening the user's browser.
 * Later, this screen can become fully native while the widget keeps using server summaries.
 */
public class MainActivity extends Activity {
    private static final String DASHBOARD_URL = "https://dropzone-apex-tracker.vercel.app";
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
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        dashboardWebView.setWebViewClient(new WebViewClient());
        dashboardWebView.loadUrl(DASHBOARD_URL);
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
}
