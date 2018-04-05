/* 
bluetooth device object:

address : "E4:22:A5:4C:F6:AD"
class   : 1028
id      : "E4:22:A5:4C:F6:AD"
name    : "PLT_E500"

added fields


available:
connected:

 */

function SettingsBluetoothCtrl($scope, $state, $cordovaBLE, $ionicPopup, $ionicPlatform, InitAppSrv)
{
    $scope.bluetoothEnabled = false;
    $scope.BTOFF    = "Bluetooth spento, premi per attivare";
    $scope.BTON     = "Bluetooth è attivo";
    
    $scope.unpaired_devices = [];
    $scope.paired_devices   = [];
    
    $scope.devices2ignore = ["tomtom2_cardio"];
    
    $scope.$on("onAppResume", function (event) {
        $scope.refreshDevices();
    });  

    $scope.$on("$ionicView.enter", function(event, data)
    {
        // take control of BACK buttons
        $scope.deregisterFunc = $ionicPlatform.registerBackButtonAction(function()
        {
            $state.go("home");
        }, 100);  
        
        return $scope.isBTEnabled()
        .then(function(enabled)
        {
            if(enabled)
            {
                $scope.bluetoothEnabled = true;
                $scope.btDeviceLabel    = $scope.BTON;
                $scope.refreshDevices();
            }
            else
            {
                $scope.bluetoothEnabled = false;
                $scope.btDeviceLabel    = $scope.BTOFF;
            }
        });
    });    

    $scope.$on('$ionicView.leave', function(){
        if($scope.deregisterFunc)   $scope.deregisterFunc();
    }); 
    
    $scope.isBTEnabled = function()
    {
        $cordovaBLE.isEnabled()
        .then(function(){

            return 1;
        })
        .catch(function(){ 
            return 0;
        })       
    }
    
    $scope.refreshDevices = function()
    {
        return $scope.getPairedDevices()
//        .then(function(){
//            return $scope.getUnPairedDevices();
//        })
//        .then(function(){
//            $scope.$apply();
//        })
        .catch(function(error){ 
            alert(error + ", " + error.message);
            $scope.resetDevices();
        })
    };
    
    $scope.ignoreDevice = function(device, id)
    {
        $scope.devices2ignore.push(device.name);
        $scope.refreshDevices();
    };
    
    $scope.resetIgnoreList = function()
    {
        $scope.devices2ignore = [];
        $scope.refreshDevices();
    };
    
    $scope.isLogged = function(device)
    {
        return $cordovaBLE.isLogged(device.id)
    };
    
    $scope.resetDevices = function()
    {
        $scope.bluetoothEnabled = false;
        $scope.bluetoothLabel = "Bluetooth is OFF";
        $scope.unpaired_devices = [];
        $scope.paired_devices   = [];   
        $scope.$apply(); 
    };
    
    $scope.onBluetoothChange = function(event, value)
    {
        if (value){ // was off -> user asked to switch on
            $cordovaBLE.enable()   // I don't call here the update ...the onResume callback will do it.
            .catch(function(error){  // user did not enable BT....I get this : error = "User did not enable Bluetooth"
                event.preventDefault();  // IT DOESN'T WORK...toggle changes
                $scope.resetDevices();
            });
        }
        else {  // -> off, the App showBluetoothSettings 
            var alertPopup = $ionicPopup.alert({
                title: 'Hai chiesto di disattivare il bluetooth',
                template: 'Premi il pulsante back per tornare a AllSpeak'
            });

            alertPopup.then(function(res) {
                $cordovaBLE.showBluetoothSettings()
                .catch(function(error){
                    alert(error + " - " + error.message); 
                });            
            });
        }
    };
    
    $scope.connectDevice = function(device, id)
    {
        $cordovaBLE.connect(device.id)
        .subscribe(function(p) {
            $scope.$apply(function() {
                $scope.paired_devices[id].connected = 1;
            });
        }, function(err) {
            alert(err);
        });

    };
    
    $scope.disconnectDevice = function(device, id)
    {
        
    };
    
    $scope.getPairedDevices = function()
    {
        $scope.paired_devices = [];
//        return $cordovaBluetoothSerial.list()
        return $cordovaBLE.scan([],10)
        .then(function (devices) {
            for (device in devices){
                var addit=1;
                for (tobeignored in $scope.devices2ignore){
                    if ($scope.devices2ignore[tobeignored] == devices[device].name){
                        addit=0;
                        break;
                    }
                }
                if(addit)   $scope.paired_devices.push(devices[device])
            }
            return $scope.paired_devices;
        }, function(err) {
            return [];
        });
    };
    
    $scope.getUnPairedDevices = function()
    {
        $scope.unpaired_devices = [];
        return $cordovaBluetoothSerial.discoverUnpaired()
        .then(function (devices) {
            for (device in devices){
                var addit=1;
                for (tobeignored in $scope.devices2ignore){
                    if ($scope.devices2ignore[tobeignored] == devices[device].name){
                        addit=0;
                        break;
                    }
                }
                if(addit)   $scope.unpaired_devices.push(devices[device])
            }
             
            return $scope.unpaired_devices;
        }, function(err) {
            return [];
        });
    };
   
};
controllers_module.controller('SettingsBluetoothCtrl', SettingsBluetoothCtrl)   
  