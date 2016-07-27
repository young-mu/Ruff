package com.young.ruff;

import android.content.Intent;
import android.net.Uri;
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

    private File ruffDir;
    private String ruffPath;
    private String ruffDPath;
    private String ruffSdkPath;
    private String ruffAppPath;

    private static final String ruffSdkUri = "file:///android_asset/";
    private static final String ruffMmUri = "file:///mnt/sdcard/";

    private String ruffBinPath;
    private String[] ruffEnvp;

    private File tmpDir;
    private String tmpPath;

    public native void mkfifo(String path);

    static {
        System.loadLibrary("ruff");
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        ruffDir = new File("/data/data/" + this.getPackageName() + "/ruff");
        ruffDir.mkdirs();
        ruffPath = ruffDir.toString();
        Log.i(TAG, "create direcotry [" + ruffPath + "]");

        tmpDir = new File("/data/data/" + this.getPackageName() + "/tmp");
        tmpDir.mkdirs();
        tmpPath = tmpDir.toString();
        Log.i(TAG, "create direcotry [" + tmpPath + "]");

        mkfifo(AddMidSlash(tmpPath, "app_start"));
        mkfifo(AddMidSlash(tmpPath, "ruffapp.log"));

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
                    webView.getSettings().setAllowUniversalAccessFromFileURLs(true);
                    webView.loadUrl(ruffSdkUri + path);
                } else if (msg.arg1 == 2) {
                    String path = (String)msg.obj;
                    Log.d(TAG, "Show picture [" + path + "]");
                    Intent intent = new Intent();
                    intent.setAction(Intent.ACTION_VIEW);
                    intent.setDataAndType(Uri.parse(ruffMmUri + path), "image/*");
                    startActivity(intent);
                } else if (msg.arg1 == 3) {
                    String path = (String) msg.obj;
                    Log.d(TAG, "Play audio [" + path + "]");
                    Intent intent = new Intent();
                    intent.setAction(Intent.ACTION_VIEW);
                    intent.setDataAndType(Uri.parse(ruffMmUri + path), "audio/*");
                    startActivity(intent);
                }  else if (msg.arg1 == 4) {
                    String path = (String) msg.obj;
                    Log.d(TAG, "Play video [" + path + "]");
                    Intent intent = new Intent();
                    intent.setAction(Intent.ACTION_VIEW);
                    intent.setDataAndType(Uri.parse(ruffMmUri + path), "video/*");
                    startActivity(intent);
                }
            }
        };

        ServerSocketThread serverSocketThread = new ServerSocketThread(handler);
        serverSocketThread.start();

        ruffDPath = AddMidSlash(ruffPath, "ruffd");
        copyAssetFiles("ruff/ruffd", ruffDPath);

        ruffSdkPath = AddMidSlash(ruffPath, "sdk");
        copyAssetFiles("ruff/sdk", ruffSdkPath);

        ruffBinPath = AddMidSlash(ruffSdkPath, "bin/ruff");
        new File(ruffBinPath).setExecutable(true);

        ruffAppPath = AddMidSlash(ruffPath, "app");
        copyAssetFiles("ruff/app", ruffAppPath);

        ruffEnvp = new String[] { "RUFF_PATH=" + ruffPath,
                                  "RUFFD_PATH=" + ruffDPath,
                                  "RUFF_SDK_PATH=" + ruffSdkPath,
                                  "RUFF_APP_PATH=" + ruffAppPath };
        RuffThread ruffThread = new RuffThread(ruffBinPath, AddMidSlash(ruffDPath, "src/ruffd.js"), ruffEnvp);
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
