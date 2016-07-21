package com.young.ruff;

import android.util.Log;

import java.io.BufferedReader;
import java.io.InputStreamReader;

public class RuffThread extends Thread {

    private final static String TAG = "RuffThread";

    String ruffBinPath = null;
    String ruffAppPath = null;
    String ruffCmd = null;

    public RuffThread(String ruffBinPath, String ruffAppPath) {
        this.ruffBinPath = ruffBinPath;
        this.ruffAppPath = ruffAppPath;
        ruffCmd = this.ruffBinPath + " " + this.ruffAppPath;
        Log.d(TAG, "ruffCmd [" + ruffCmd + "]");
    }

    @Override
    public void run() {
        try {
            Process process = Runtime.getRuntime().exec(this.ruffCmd);
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
