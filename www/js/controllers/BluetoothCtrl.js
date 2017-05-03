/* 
bluetooth device object:

address : "E4:F8:EF:E7:25:27"
class   : 1028
id      : "E4:F8:EF:E7:25:27"
name    : "Samsung Headset Essential"

added fields


available:
connected:

 */

//function BluetoothCtrl($scope, $cordovaBLE)
function BluetoothCtrl($scope, $cordovaBluetoothSerial, $ionicPopup, $ionicPlatform, InitAppSrv)
{
    $scope.bluetoothEnabled = false;
    $scope.bluetoothLabel = "Bluetooth is OFF";
    
    $scope.unpaired_devices = [];
    $scope.paired_devices   = [];
    
    $scope.devices2ignore = ["tomtom2_cardio"];
    
    $scope.$on("onAppResume", function (event) {
        $scope.refreshDevices();
    });  
    
    $scope.$on("$ionicView.enter", function(event, data)
    {
        $scope.refreshDevices();
    });    
    
    $scope.refreshDevices = function()
    {
        $cordovaBluetoothSerial.isEnabled()
        .then(function(){
            $scope.bluetoothEnabled = true;
            $scope.bluetoothLabel = "Bluetooth is ON";
            return $scope.getPairedDevices();
        })
        .catch(function(error){ // BT is not enabled
            $scope.resetDevices();
        })
        .then(function(){
            $scope.getUnPairedDevices();
        })
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
    
    $scope.isConnected = function(device)
    {
        return $cordovaBluetoothSerial.isConnected(device.address)
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
            $cordovaBluetoothSerial.enable()   // I don't call here the update ...the onResume callback will do it.
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
                $cordovaBluetoothSerial.showBluetoothSettings()
                .catch(function(error){
                    alert(error + " - " + error.message); 
                });            
            });
        }
    };
    
    $scope.connectDevice = function(device, id)
    {
        $cordovaBluetoothSerial.connectInsecure(device.address)
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
        return $cordovaBluetoothSerial.list()
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
            
            
//            var promises = [promiseAlpha(), promiseBeta(), promiseGamma()];
//
//            $q.all(promises)
//            .then(function(values){
//                console.log(values[0]); // value alpha
//                console.log(values[1]); // value beta
//                console.log(values[2]); // value gamma
//
//                complete();
//            });            
//            
//            
            
            
            $scope.$apply();
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
controllers_module.controller('BluetoothCtrl', BluetoothCtrl)   
  