// Builds the native Android app and its home-screen Rank Pulse widget.
plugins {
    id("com.android.application")
}

android {
    namespace = "com.dropzone.apextracker"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.dropzone.apextracker"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }
}
