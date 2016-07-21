package com.young.ruff;

import android.os.Handler;
import android.os.Message;
import android.util.Log;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.ServerSocket;
import java.net.Socket;

public class ServerSocketThread extends Thread {

    private final static int port = 5678;
    private final static String TAG = "Ruff";

    ServerSocket serverSocket;
    Socket socket;
    Handler handler;

    public ServerSocketThread(Handler handler) {
        this.handler = handler;
    }

    @Override
    public void run() {
        try {
            serverSocket = new ServerSocket(port);
            while (true) {
                Log.d(TAG, "start to listen new socket ...");
                socket = serverSocket.accept();
                Log.d(TAG, "new socket is established");
                try {
                    BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                    String command = bufferedReader.readLine();
                    if (command.startsWith("Webview")) {
                        Message msg = handler.obtainMessage();
                        msg.arg1 = 1;
                        msg.obj = (Object)command.substring(command.indexOf('[') + 1, command.indexOf(']'));
                        handler.sendMessage(msg);
                    } else if (command.startsWith("Picture")) {
                        Message msg = handler.obtainMessage();
                        msg.arg1 = 2;
                        msg.obj = (Object)command.substring(command.indexOf('[') + 1, command.indexOf(']'));
                        handler.sendMessage(msg);
                    }
                } catch (IOException e) {
                    e.printStackTrace();
                } finally {
                    if (socket != null) {
                        try {
                            socket.close();
                            socket = null;
                        } catch (IOException e) {
                            e.printStackTrace();
                        }
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
