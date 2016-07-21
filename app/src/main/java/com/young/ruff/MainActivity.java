package com.young.ruff;

import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import android.os.Handler;
import android.os.Message;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private Handler handler;

    private static final String TAG = "Ruff";

    private String ruffSdkRootPath;
    private static final String ruffMmRootPath = Environment.getExternalStoragePublicDirectory("Ruff").toString();
    private static final String ruffSdkRootUri = "file:///android_asset/";
    private static final String ruffMmRootUri = "file:///mnt/sdcard/Ruff/";

    private static final String ruffSdk = "ruff_sdk";
    private static final String ruffApp = "ruff_app";
    private static final String ruffMm = "ruff_mm";

    private String ruffSdkPath;
    private String ruffAppPath;
    private String ruffMmPath;

    private String ruffBinPath;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        ruffSdkRootPath = this.getFilesDir().toString();

        handler = new Handler() {
            @Override
            public void handleMessage(Message msg) {
                if (msg.arg1 == 1) {
                    String path = (String)msg.obj;
                    Log.d(TAG, "Load url [" + path + "]");
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
                    webView.loadUrl(ruffSdkRootUri + path);
                } else if (msg.arg1 == 2) {
                    String path = (String)msg.obj;
                    Log.d(TAG, "Open picture [" + path + "]");
                    Intent intent = new Intent();
                    intent.setAction(Intent.ACTION_VIEW);
                    intent.setDataAndType(Uri.parse(ruffMmRootUri + path), "image/*");
                    startActivity(intent);
                } else if (msg.arg1 == 3) {
                    String path = (String) msg.obj;
                    Log.d(TAG, "Play audio [" + path + "]");
                    Intent intent = new Intent();
                    intent.setAction(Intent.ACTION_VIEW);
                    intent.setDataAndType(Uri.parse(ruffMmRootUri + path), "audio/*");
                    startActivity(intent);
                }  else if (msg.arg1 == 4) {
                    String path = (String) msg.obj;
                    Log.d(TAG, "Play video [" + path + "]");
                    Intent intent = new Intent();
                    intent.setAction(Intent.ACTION_VIEW);
                    intent.setDataAndType(Uri.parse(ruffMmRootUri + path), "video/*");
                    startActivity(intent);
                }
            }
        };

        ServerSocketThread serverSocketThread = new ServerSocketThread(handler);
        serverSocketThread.start();

        ruffSdkPath = AddMidSlash(ruffSdkRootPath, ruffSdk);
        ruffBinPath = AddMidSlash(ruffSdkPath, "ruff");
        copyAssetFiles(ruffSdk, ruffSdkPath);
        new File(ruffBinPath).setExecutable(true);

        // TODO: it's a workaround to put index.js in ruffSdk directory instead of ruffApp
        ruffAppPath = AddMidSlash(ruffSdkRootPath, ruffSdk);
        copyAssetFiles(ruffApp, ruffAppPath);

        ruffMmPath = AddMidSlash(ruffMmRootPath, ruffMm);
        copyAssetFiles(ruffMm, ruffMmPath);

        RuffThread ruffThread = new RuffThread(ruffBinPath, AddMidSlash(ruffAppPath, "index.js"));
        ruffThread.start();
    }

    public void copyAssetFile(String assetFile, String outPath) {

        InputStream inputStream = null;
        FileOutputStream fileOuputStream = null;

        //Log.d(TAG, "FROM [" + assetFile + "] TO [" + outPath + "]");

        try {
            inputStream = getResources().getAssets().open(assetFile);
            fileOuputStream = new FileOutputStream(outPath);

            byte[] buffer = new byte[1024];
            int ret = 0;
            int sum = 0;
            while((ret = inputStream.read(buffer)) != -1){
                fileOuputStream.write(buffer, 0, ret);
                sum += ret;
            }

            //Log.d(TAG, "copy " + assetFile + " done (" + sum + " bytes)");
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

    public String AddMidSlash(String prefix, String suffix) {
        return prefix + "/" + suffix;
    }

    public void createDirectory(File dirName)
    {
        if (dirName.exists())  {
            //Log.d(TAG, "the directory has been existed");
        } else {
            dirName.mkdirs();
            //Log.d(TAG, "createDirectory [" + dirName + "]");
        }
    }

    public void copyAssetFiles(String assetFiles, String outPath) {
        String[] assetSubFiles = null;

        try {
            assetSubFiles = getApplicationContext().getAssets().list(assetFiles);
        } catch (Exception e) {
            e.printStackTrace();
        }

        if (assetSubFiles.length == 0) {
            copyAssetFile(assetFiles, outPath);
        } else {
            for (int i = 0; i < assetSubFiles.length; i++) {
                createDirectory(new File(outPath));
                copyAssetFiles(AddMidSlash(assetFiles, assetSubFiles[i]), AddMidSlash(outPath, assetSubFiles[i]));
            }
        }
    }
}
