package com.young.ruff;

import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private String ruffApp;
    private static final String TAG = "Ruff";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = (WebView)findViewById(R.id.webview);
        webView.clearCache(true);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage cm) {
                Log.d(TAG, cm.message() + " -- From line " + cm.lineNumber() + " of " + cm.sourceId());
                return true;
            }
        });
        webView.loadUrl("file:///android_asset/webapp/index.html");

        String ruff = "ruff";
        String ruffPath = this.getFilesDir().toString() + "/ruff";
        storeAssetFile(ruff, ruffPath);
        new File(ruffPath).setExecutable(true);

        String ruffApp = "ruffapp/test.js";
        String ruffAppPath = this.getFilesDir().toString() + "/ruffapp";
        storeAssetFile(ruffApp, ruffAppPath);

        String ruffCmd = ruffPath + " " + ruffAppPath;
        Log.d(TAG, "ruffCmd: [" + ruffCmd + "]");

        try {
            Process process = Runtime.getRuntime().exec(ruffCmd);
            InputStreamReader inputStreamReader = new InputStreamReader(process.getInputStream());
            BufferedReader bufferedReader = new BufferedReader(inputStreamReader);
            String line = "";
            while ((line = bufferedReader.readLine()) != null) {
                Log.i(TAG, ">> " + line);
            }
        } catch (IOException e) {
            System.out.println(e.getMessage());
        }
    }

    public void storeAssetFile(String assetFile, String outPath) {
        InputStream inputStream = null;
        FileOutputStream fileOuputStream = null;
        try {
            Log.d(TAG, "FROM [" + assetFile + "] TO [" + outPath + "]");

            inputStream = getResources().getAssets().open(assetFile);
            fileOuputStream = new FileOutputStream(outPath);

            byte[] buffer = new byte[1024];
            int ret = 0;
            int sum = 0;
            while((ret = inputStream.read(buffer)) != -1){
                fileOuputStream.write(buffer, 0, ret);
                sum += ret;
            }

            Log.d(TAG, "storeAssetFile [" + assetFile + "] done (" + sum + " bytes)");
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            if (inputStream != null) {
                try {
                    inputStream.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
            if (fileOuputStream != null) {
                try {
                    fileOuputStream.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
