package com.young.ruff;

import android.util.Log;

import java.io.BufferedReader;
import java.io.InputStreamReader;

public class RuffThread extends Thread {

    private final static String TAG = "RuffThread";

    String ruffBinPath = null;
    String ruffAppPath = null;
    String[] ruffEnvp = null;
    String ruffCmd = null;

    public RuffThread(String ruffBinPath, String ruffAppPath, String[] ruffEnvp) {
        this.ruffBinPath = ruffBinPath;
        this.ruffAppPath = ruffAppPath;
        this.ruffEnvp = ruffEnvp;
        ruffCmd = this.ruffBinPath + " " + this.ruffAppPath;
        Log.d(TAG, "ruffCmd [" + ruffCmd + "]");
        for (int i = 0; i < ruffEnvp.length; i++) {
            Log.d(TAG, "ruffEnvp[" + i + "] = " + ruffEnvp[i]);
        }
    }

    @Override
    public void run() {
        try {
            Process process = Runtime.getRuntime().exec(this.ruffCmd, this.ruffEnvp);
            InputStreamReader inputStreamReader = new InputStreamReader(process.getInputStream());
            BufferedReader bufferedReader = new BufferedReader(inputStreamReader);
            String line = "";
            while ((line = bufferedReader.readLine()) != null) {
                Log.i(TAG, line);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
