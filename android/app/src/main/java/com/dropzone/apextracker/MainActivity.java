package com.dropzone.apextracker;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Button;

/**
 * Small native launcher screen for the Android app.
 *
 * The full tracker still lives in the Next.js web app. This activity keeps the Android build
 * simple for the first native milestone and gives the widget a real app to open when tapped.
 */
public class MainActivity extends Activity {
    private static final String DASHBOARD_URL = "https://dropzone-apex-tracker.vercel.app";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Button openDashboardButton = findViewById(R.id.open_dashboard_button);
        openDashboardButton.setOnClickListener(view -> openLiveDashboard());
    }

    private void openLiveDashboard() {
        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(DASHBOARD_URL));
        startActivity(browserIntent);
    }
}
