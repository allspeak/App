package com.allspeak.audioprocessing.mfcc;

import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;  
import android.os.Message;

public class MFCCHaMRe 
{
    private static final String TAG     = "MFCCHaMRe";
    
    private final static int MSG_0 = 0;
    private final static int MSG_1 = 1;
    
    // Member variable
    private volatile Looper mBackgroundLooper;
    private volatile BackgroundHandler mBackgroundHandler;
    private volatile Handler mHandler;
    
    //================================================================================================================
    public MFCCHaMRe(String name)
    {
        HandlerThread thread = new HandlerThread("<Thread Name>");
        thread.start();

        mBackgroundLooper   = thread.getLooper();
        mBackgroundHandler  = new BackgroundHandler(mBackgroundLooper);
        
        mHandler = new Handler()
        {
            public void handleMessage(Message msg)
            {
                if (msg.what == MSG_0)
                {
                    Log.d(TAG, "UI Thread: received notification of sleep completed ");
                }
            }
        };        
    }
    
    // Send a message using the Handler was created.
    public void onYourMethod(Intent intent) 
    {
        Message msg = mBackgroundHandler.obtainMessage();
        msg.what = <What>;
        msg.obj = <Object>;
        mBackgroundHandler.sendMessage(msg);
    }  

    // Handler Class
    private final class BackgroundHandler extends Handler 
    {
        public BackgroundHandler(Looper looper) 
        {
            super(looper);
        }

        @Override
        public void handleMessage(Message msg)
        {
            switch (msg.what)
            {
                case MSG_0:
                    mHandler.sendEmptyMessage(MSG_0);
                    break;
                    
                case MSG_1:
                    mHandler.sendEmptyMessage(MSG_1);
                    break;
            }
        }
    }    
 
}
