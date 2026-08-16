import { KioskConfig, AndroidExportFile } from '../types';

export function generateAndroidProjectFiles(config: KioskConfig): AndroidExportFile[] {
  const allowedDomainsKotlin = config.security.allowedDomains
    .map((d) => `"${d.trim().replace(/^https?:\/\//, '')}"`)
    .join(', ');

  const mainActivityKotlin = `package com.kiosk.securebrowser

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/**
 * Dedicated Secure Browser - Android Native Implementation
 * 
 * Features Enforced:
 * 1. URL is NEVER shown to the user (only clean title or full kiosk screen).
 * 2. Strict Whitelist: Only allowed URLs/domains can load; outside links are intercepted.
 * 3. Ad & Tracker Blocker: shouldInterceptRequest drops ad network domains.
 * 4. Anti-Injection & Hardened Sandbox: File access, content access, and universal access disabled.
 * 5. Kiosk Lock Task: Disables status bar pull-down and system navigation when locked.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var titleBar: TextView
    private lateinit var securityBadge: View

    // Administrator Configuration
    private val targetUrl = "${config.targetUrl}"
    private val allowedDomains = hashSetOf(${allowedDomainsKotlin})
    private val isAdBlockEnabled = ${config.security.blockAds}
    private val isKioskLockEnabled = ${config.kioskLocked}

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Hide Android System Bars (Immersive Sticky Mode)
        hideSystemUI()

        webView = findViewById(R.id.kioskWebView)
        progressBar = findViewById(R.id.progressBar)
        titleBar = findViewById(R.id.pageTitle)
        securityBadge = findViewById(R.id.securityBadge)

        // Lock Android Task (Device Owner / Kiosk Pinning Mode)
        if (isKioskLockEnabled) {
            try {
                startLockTask()
            } catch (e: Exception) {
                // Requires Device Owner permission for silent lock task
            }
        }

        // Configure WebView with Hardened Security Settings
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            
            // SECURITY: Disable local file and content scheme access (Anti-Injection)
            allowFileAccess = false
            allowContentAccess = false
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            
            // SECURITY: Disable dangerous features & geolocation
            setGeolocationEnabled(false)
            mediaPlaybackRequiresUserGesture = true
            
            // Rendering Optimizations
            builtInZoomControls = false
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
            
            // Cache Policy
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        ${config.security.disableContextMenu ? `// Disable long-click context menu (prevents inspection & text extraction)
        webView.isLongClickable = false
        webView.setOnLongClickListener { true }` : ''}

        // Custom Security WebClient
        webView.webViewClient = object : WebViewClient() {

            // 1. STRICT DOMAIN & URL WHITELIST INTERCEPTOR
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return true
                val host = uri.host?.lowercase() ?: ""
                val scheme = uri.scheme?.lowercase() ?: ""

                // Block non-https schemes and dangerous protocols
                if (scheme != "http" && scheme != "https") {
                    Toast.makeText(this@MainActivity, "Blocked unsafe protocol: $scheme", Toast.LENGTH_SHORT).show()
                    return true
                }

                // Verify against allowed domains whitelist
                val isAllowed = allowedDomains.any { pattern ->
                    if (pattern.startsWith("*.")) {
                        val root = pattern.removePrefix("*.")
                        host == root || host.endsWith(".$root")
                    } else {
                        host == pattern || host.endsWith(".$pattern")
                    }
                }

                return if (isAllowed) {
                    false // Proceed with loading inside secure WebView
                } else {
                    // Deny navigation outside allowed boundaries
                    Toast.makeText(
                        this@MainActivity, 
                        "Navigation Blocked: External URL is not permitted", 
                        Toast.LENGTH_LONG
                    ).show()
                    true // Intercept and cancel navigation
                }
            }

            // 2. AD BLOCKER & TRACKER INTERCEPTOR
            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
                if (!isAdBlockEnabled) return super.shouldInterceptRequest(view, request)
                
                val urlString = request?.url?.toString()?.lowercase() ?: return null
                if (AdBlocker.isAdOrTracker(urlString)) {
                    // Drop the ad request by returning an empty dummy response
                    return WebResourceResponse("text/plain", "UTF-8", null)
                }
                return super.shouldInterceptRequest(view, request)
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                // Note: URL is NEVER set into UI - only page title is displayed
                titleBar.text = view?.title ?: "${config.appName}"
                
                // Inject Anti-Injection CSS and script hardening
                view?.evaluateJavascript(
                    """
                    (function() {
                        // Prevent unhandled popups & window.open breakouts
                        window.open = function() { return null; };
                        ${config.security.disableTextSelection ? `document.documentElement.style.userSelect = 'none';` : ''}
                    })();
                    """.trimIndent(), null
                )
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    progressBar.visibility = View.GONE
                }
            }
        }

        // WebChromeClient for page title updates and progress tracking
        webView.webChromeClient = object : WebChromeClient() {
            override fun onReceivedTitle(view: WebView?, title: String?) {
                super.onReceivedTitle(view, title)
                titleBar.text = title ?: "${config.appName}"
            }

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                if (newProgress == 100) {
                    progressBar.visibility = View.GONE
                }
            }
        }

        // Initial Load of the designated target page
        webView.loadUrl(targetUrl)
    }

    // Hardware Back Button: navigate web history within whitelist, or reset
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView.canGoBack()) {
                webView.goBack()
                return true
            }
            // In kiosk locked mode, prevent exiting to Android Home screen
            if (isKioskLockEnabled) {
                webView.loadUrl(targetUrl)
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
}
`;

  const adBlockerKotlin = `package com.kiosk.securebrowser

/**
 * Ad and Tracker Pattern Filter
 */
object AdBlocker {
    private val AD_KEYWORDS = hashSetOf(
        "doubleclick.net",
        "googlesyndication.com",
        "google-analytics.com",
        "adnxs.com",
        "facebook.net",
        "scorecardresearch.com",
        "taboola.com",
        "outbrain.com",
        "criteo.com",
        "amazon-adsystem.com",
        "popads.net",
        "adroll.com",
        "adskeeper.co.uk",
        "propellerads.com",
        "/ads/",
        "/advert/",
        "/banner/",
        "telemetry."
    )

    fun isAdOrTracker(url: String): Boolean {
        val lower = url.lowercase()
        return AD_KEYWORDS.any { keyword -> lower.contains(keyword) }
    }
}
`;

  const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.kiosk.securebrowser">

    <!-- Permissions required for dedicated web browser -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="${config.appName}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.SecureKioskBrowser"
        android:networkSecurityConfig="@xml/network_security_config"
        android:hardwareAccelerated="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:launchMode="singleTask"
            android:screenOrientation="unspecified">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
                <!-- Optional: Enable as Kiosk Device Home Launcher -->
                <!-- <category android:name="android.intent.category.HOME" /> -->
                <!-- <category android:name="android.intent.category.DEFAULT" /> -->
            </intent-filter>
        </activity>
    </application>

</manifest>
`;

  const activityMainXml = `<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#0F172A">

    <!-- Top Secure Header (URL is NOT displayed - only Title & Shield) -->
    <LinearLayout
        android:id="@+id/topBar"
        android:layout_width="match_parent"
        android:layout_height="48dp"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:background="#1E293B"
        android:paddingHorizontal="16dp">

        <ImageView
            android:id="@+id/securityBadge"
            android:layout_width="20dp"
            android:layout_height="20dp"
            android:src="@drawable/ic_shield_check"
            android:tint="#10B981"
            android:contentDescription="Secure Connection Badge" />

        <TextView
            android:id="@+id/pageTitle"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginStart="12dp"
            android:text="${config.appName}"
            android:textColor="#F8FAFC"
            android:textSize="14sp"
            android:textStyle="bold"
            android:singleLine="true"
            android:ellipsize="end" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="🔒 SECURE KIOSK"
            android:textColor="#94A3B8"
            android:textSize="11sp" />
    </LinearLayout>

    <ProgressBar
        android:id="@+id/progressBar"
        style="?android:attr/progressBarStyleHorizontal"
        android:layout_width="match_parent"
        android:layout_height="3dp"
        android:layout_below="@id/topBar"
        android:progressDrawable="@drawable/custom_progress"
        android:visibility="gone" />

    <!-- Isolated WebView Container -->
    <WebView
        android:id="@+id/kioskWebView"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_below="@id/progressBar" />

</RelativeLayout>
`;

  const networkSecurityConfigXml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Prevent insecure HTTP plain text traffic (Anti-Man-in-the-Middle) -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

  const buildGradleKts = `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.kiosk.securebrowser"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.kiosk.securebrowser"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.webkit:webkit:1.10.0")
}
`;

  const rootBuildGradleKts = `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
}
`;

  const settingsGradleKts = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "DedicatedKioskBrowser"
include(":app")
`;

  const githubWorkflowYml = `name: Build Android APK

on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Set up JDK 17
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'
        cache: gradle

    - name: Grant execute permission for gradlew
      run: chmod +x gradlew || true

    - name: Build with Gradle
      run: ./gradlew assembleRelease || ./gradlew assembleDebug

    - name: Upload APK Artifact
      uses: actions/upload-artifact@v4
      with:
        name: Dedicated-Kiosk-Browser-APK
        path: app/build/outputs/apk/**/*.apk
        retention-days: 30
`;

  return [
    {
      filename: 'MainActivity.kt',
      filepath: 'app/src/main/java/com/kiosk/securebrowser/MainActivity.kt',
      language: 'kotlin',
      content: mainActivityKotlin,
      description: 'Main Android activity enforcing hidden URL, WebView whitelist, lock-task, and hardware button restrictions.',
    },
    {
      filename: 'AdBlocker.kt',
      filepath: 'app/src/main/java/com/kiosk/securebrowser/AdBlocker.kt',
      language: 'kotlin',
      content: adBlockerKotlin,
      description: 'Interceptor module filtering ad networks, tracker beacons, and analytics scripts in Android WebView.',
    },
    {
      filename: 'AndroidManifest.xml',
      filepath: 'app/src/main/AndroidManifest.xml',
      language: 'xml',
      content: manifestXml,
      description: 'Android manifest configuring security permissions, Kiosk launcher mode, and network security policies.',
    },
    {
      filename: 'activity_main.xml',
      filepath: 'app/src/main/res/layout/activity_main.xml',
      language: 'xml',
      content: activityMainXml,
      description: 'UI layout with masked URL bar, title indicator, and hardened WebView container.',
    },
    {
      filename: 'network_security_config.xml',
      filepath: 'app/src/main/res/xml/network_security_config.xml',
      language: 'xml',
      content: networkSecurityConfigXml,
      description: 'Enforces HTTPS encryption and drops cleartext transmission.',
    },
    {
      filename: 'app/build.gradle.kts',
      filepath: 'app/build.gradle.kts',
      language: 'gradle',
      content: buildGradleKts,
      description: 'App-level Gradle build configuration with AndroidX WebKit dependencies.',
    },
    {
      filename: 'build-apk.yml',
      filepath: '.github/workflows/build-apk.yml',
      language: 'yaml',
      content: githubWorkflowYml,
      description: 'GitHub Actions workflow to automatically compile and generate the native APK in the cloud for free without Android Studio.',
    },
    {
      filename: 'settings.gradle.kts',
      filepath: 'settings.gradle.kts',
      language: 'gradle',
      content: settingsGradleKts,
      description: 'Project settings declaring module repositories.',
    },
    {
      filename: 'build.gradle.kts',
      filepath: 'build.gradle.kts',
      language: 'gradle',
      content: rootBuildGradleKts,
      description: 'Root Gradle configuration file.',
    },
  ];
}
