/*
 * manage Bluetooth connection
 * ISSUE: I force autoconnect to be FALSE during initialization to prevent HS hangup
 * 
 */

function BluetoothSrv($q)
{
    pluginInterface         = null;
    plugin_enum             = null;
    initAppSrv              = null;    

    audio_devices           = {};
    
    isBluetoothAvailable    = false;
    
    mExistHeadsetConnected  = false;
    mIsOnHeadsetSco         = false;
    mAutoConnect            = false;
    mIsWiredConnected       = false;
    mHasWiredMic            = false;
    
    mActiveHeadSetName       = "";
    ctrl_callback           = null;
    
    //==========================================================================
    init = function(bluetooth_params, plugin, initappserv)
    {  
        pluginInterface     = plugin;
        plugin_enum         = pluginInterface.ENUM.PLUGIN;
        initAppSrv          = initappserv;   
        
        mAutoConnect        = bluetooth_params.autoconnect;
    };
    //=========================================================================
    // retrieve list of audio devices
    // register callback for onHeadset change
    // check whether activating headset retrieval    
    initBluetooth = function(ctrl_clb)
    {
        ctrl_callback = ctrl_clb;
        return pluginInterface.getAudioDevices()// returns : {input:[{"name": , "types":  , channels: }], output:[{"name": , "types":  , channels: }]}
        .then(function(ad)
        {
            audio_devices = ad;
            pluginInterface.initBluetooth(onInitBluetooth);
        })
        .catch(function(error){ 
            audio_devices = {};
            return $q.reject(error);              
        });
    };
    
    // called by plugin interface...inform InitCheckCtrl
    onInitBluetooth = function(res)
    {
        isBluetoothAvailable = res;
        ctrl_callback();
    };
    //=========================================================================
    // from controller to plugin
    // data are sent to the caller in the same format as cordova.fireWindowEvent("headsetstatus", {data: data});
    getBluetoothStatus = function()
    {
        return pluginInterface.getAudioIOStatus()
        .then(function(status)
        {
            mExistHeadsetConnected  = status.mExistHeadsetConnected;
            mIsOnHeadsetSco         = status.mIsOnHeadsetSco;
            mAutoConnect            = status.mAutoConnect;
            mActiveHeadSetName      = status.mActiveHeadSetName;    
            mActiveHeadSetAddress   = status.mActiveHeadSetAddress;    
            mIsWiredConnected       = status.mIsWiredConnected;    
            mHasWiredMic            = status.mHasWiredMic;    
            
            return {"data":{"mExistHeadsetConnected":mExistHeadsetConnected,
                            "mIsOnHeadsetSco"       :mIsOnHeadsetSco,
                            "mAutoConnect"          :mAutoConnect,
                            "mActiveHeadSetName"    :mActiveHeadSetName,
                            "mActiveHeadSetAddress" :mActiveHeadSetAddress,
                            "mIsWiredConnected"     :mIsWiredConnected,
                            "mHasWiredMic"          :mHasWiredMic
                   }};
        });     
    };

    enableHeadSet = function(enable)
    {
        mAutoConnect = enable;
        return pluginInterface.enableHeadSet(enable);
    };    
    //=========================================================================
    // PLUGIN => WL
    //=========================================================================
    onHSStatusChange = function(event)
    {
        mActiveHeadSetName = event.device_name;
        switch(event.type)
        {
//            case plugin_enum.HEADSET_CONNECTED:
            case plugin_enum.HEADSET_EXIST:
                mExistHeadsetConnected  = true;                
                break; 
            
            case plugin_enum.HEADSET_DISCONNECTED:
                mExistHeadsetConnected  = false;
                mIsOnHeadsetSco         = false;
                break;              
                
            case plugin_enum.HEADSET_CONNECTING:
                break;              
                
            case plugin_enum.AUDIOSCO_CONNECTED:
                mIsOnHeadsetSco         = true;                
                break;              
                
            case plugin_enum.AUDIOSCO_DISCONNECTED:
                mIsOnHeadsetSco         = false;                
                break;              
                
            case plugin_enum.WIREDMIC_CONNECTED:
                mIsWiredConnected   = true;
                mHasWiredMic        = true;                
                break;              
                
            case plugin_enum.WIREDMIC_DISCONNECTED:
                mIsWiredConnected   = false;
                mHasWiredMic        = false;                
                break;              
                
            case plugin_enum.WIREDEAR_CONNECTED:
                mIsWiredConnected   = true;
                mHasWiredMic        = false;                
                break;              
                
            case plugin_enum.WIREDMIC_DISCONNECTED:
                mIsWiredConnected   = false;
                mHasWiredMic        = false;                
                break;              
        }
    };    
    //=========================================================================
    // from controller to here
    //=========================================================================
    existHeadset = function(threshold)
    {
        return mExistHeadsetConnected;
    };
    //=========================================================================
    isHeadsetConnected = function(threshold)
    {
        return mIsOnHeadsetSco;
    };
    //==========================================================================
    // public interface
    //==========================================================================
    return {
        init                        : init,
        initBluetooth               : initBluetooth,
        getBluetoothStatus          : getBluetoothStatus,
        existHeadset                : existHeadset,
        isHeadsetConnected          : isHeadsetConnected,
        enableHeadSet               : enableHeadSet
    };    
    //==========================================================================
}
main_module.service('BluetoothSrv', BluetoothSrv);