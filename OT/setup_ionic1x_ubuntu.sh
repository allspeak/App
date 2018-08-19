# to emulate
sudo apt-get install mesa-utils


# to install nvm
sudo apt-get install build-essential checkinstall
sudo apt-get install libssl-dev
sudo apt-get install curl

# JDK 8

sudo add-apt-repository ppa:webupd8team/java
sudo apt-get update
sudo apt-get install oracle-java8-installer
sudo apt-get install oracle-java8-set-default


# EXTRA TOOLS

sudo apt-get install git
sudo apt-get install ant

# --------------- DEVICE & ANDROID SDK connetion ----------------------------------------------------

# If you are running a 64-bit version of Ubuntu, you'll need to install the 32-bit libraries since Android is only 32-bit at the moment. 
# Ubuntu 12.10 or less
# sudo apt-get install ia32-libs 
# Ubuntu 13.04 or greater
# `ia32-libs` has been removed. You can use the following packages instead: 
sudo apt-get install lib32z1 lib32ncurses5 lib32bz2-1.0 lib32stdc++6


# for android studio on ubuntu 64
sudo apt-get install libc6:i386 libncurses5:i386 libstdc++6:i386 lib32z1 libbz2-1.0:i386

# ANDROID SDK

# launch the SDK and AVD Manager (execute the android tool)
# and install "Android SDK Platform-tools"
# add the following to .bashrc file

# export PATH=$PATH:/media/data/CODE/android-sdk-linux/tools
# export PATH=$PATH:/media/data/CODE/android-sdk-linux/platform-tools


#make it visible from adb


# get vendor & product
lsusb   			# --> Bus 001 Device 006: ID 0b05:5601 ASUSTek Computer, Inc

# the fill them into this new text file, to be created in   /lib/udev/rules.d/10-adb.rules
# SUBSYSTEM=="usb", ATTR{idVendor}=="0b05", ATTR{idProduct}=="5600", MODE="0600", OWNER="YOUR_USER_NANE"


# then restart udev
sudo udevadm control --reload-rules
sudo service udev restart
sudo udevadm trigger


# check if os sees the attached devices
adb devices   #--> G1AZCY14P310	device


# create a new sdk ADV
android avd


# ---------------NODE & NPM WORLD ----------------------------------------------------

# NODEJS through NVM (the suggested one)
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash
#nvm ls-remote
#nvm install 0.12.1
nvm install 4.6.2


# NODEJS through ubuntu (not used)
# sudo apt-get install nodejs
# sudo apt-get install npm
# sudo ln -s /usr/bin/nodejs /usr/bin/node

node -v  # -->  v4.6.2
npm -v   # -->  2.5.11


npm install -g graceful-fs@^4.0.0
npm install -g lodash@^4.0.0
npm install -g minimatch@3.0.2

# extra tools
npm install -g grunt-cli bower gulp gulp-util



# CORDOVA

# list available cordova versions
npm view cordova versions

npm install -g cordova


# list installed cordova platforms
cordova platforms ls

# add a specific platform
ionic platform add android@6.1.0 

 
# IONIC
npm install -g ionic@2.2.1



Cordova CLI: 7.1.0 
Ionic CLI Version: 2.2.1
Ionic App Lib Version: 2.1.7
ios-deploy version: Not installed
ios-sim version: Not installed
OS: Linux 4.4
Node Version: v4.6.2
Xcode version: Not installed

# ====================================================================================================================
# ====================================================================================================================
# ====================================================================================================================
# ====================================================================================================================
# in A project 
# ====================================================================================================================
# ====================================================================================================================
# ====================================================================================================================
# ====================================================================================================================

ionic start myapp [template]
ionic setup sass

ionic serve [options]

#serve [options] ...........................  Start a local development server for app dev/testing
#      [--consolelogs|-c]  .................  Print app console logs to Ionic CLI
#      [--serverlogs|-s]  ..................  Print dev server logs to Ionic CLI
#      [--port|-p]  ........................  Dev server HTTP port (8100 default)
#      [--livereload-port|-r]  .............  Live Reload port (35729 default)
#      [--nobrowser|-b]  ...................  Disable launching a browser
#      [--nolivereload|-d]  ................  Do not start live reload
#      [--noproxy|-x]  .....................  Do not add proxies
#      [--address]  ........................  Use specific address or return with failure
#      [--all|-a]  .........................  Have the server listen on all addresses (0.0.0.0)
#      [--browser|-w]  .....................  Specifies the browser to use (safari, firefox, chrome)
#      [--browseroption|-o]  ...............  Specifies a path to open to (/#/tab/dash)
#      [--lab|-l]  .........................  Test your apps on multiple screen sizes and platform types
#      [--nogulp]  .........................  Disable running gulp during serve

# e.g. ionic serve --address 192.168.0.2

ionic plugin add cordova-plugin-device
ionic plugin add cordova-plugin-whitelist
ionic plugin add cordova-plugin-compat
ionic plugin add cordova-plugin-media
ionic plugin add ionic-plugin-keyboard    
ionic plugin add cordova-plugin-file
ionic plugin add cordova-plugin-network-information
ionic plugin remove cordova-plugin-speechrecognition && ionic plugin add /data/AllSpeak/CODE/cordova/cordova-plugin-speechrecognition



#Errore : Error: watch ENOSPC
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p


ionic platform rm android
ionic platform add android

# BUILD PLATFORMS

chmod +x hooks/after_prepare/010_add_platform_class.js   

ionic platform android
ionic build android

# EMULATE
ionic emulate android

# RUN ON DEVICE
ionic run android -l -c

# INSTALL ON DEVICE
ionic build android && adb install -r platforms/android/build/outputs/apk/android-debug.apk

# debug
#on chrome, type: chrome://inspect/#devices


# run [options] <PLATFORM> .................  Run an Ionic project on a connected device
#    [--livereload|-l]  ..rbenv.............  Live reload app dev files from the device (beta)
#    [--port|-p]  ..........................  Dev server HTTP port (8100 default, livereload req.)
#    [--livereload-port|-r]  ...............  Live Reload port (35729 default, livereload req.)
#    [--consolelogs|-c]  ...................  Print app console logs to Ionic CLI (livereload req.)
#    [--serverlogs|-s]  ....................  Print dev server logs to Ionic CLI (livereload req.)
#    [--debug|--release]  
#    [--device|--emulator|--target=FOO]  


#=============================================================================
# DEPLOYING


# in config.xml

  <preference name="android-minSdkVersion" value="23"/>
  <preference name="android-targetSdkVersion" value="23"/>

# in platforms/android/project.properties

target=android-23


adb -r install platforms/android/build/outputs/apk/android-debug.apk
#-r: replace existing application
#-d: allow code downgrade 
#-s: install application on sdcard

adb uninstall [-k] android-debug.apk # <package> - remove this app package from the device
                                 ('-k' means keep the data and cache directories)

#if appears : INSTALL_FAILED_PERMISSION_MODEL_DOWNGRADE
# The problem there, is that you are attempting to install a version of your APK that is LESS than what is already on your device.

# when you modify a plugin
ionic build android && ionic run android -l -c


/storage/emulated/0/Android/data/com.ionicframework.voicerecorder/files/audio_sentences
/storage/emulated/0/Android/data/com.ionicframework.allspeak/files/audio_sentences

# get/pull file from device
adb pull /storage/emulated/0/Android/data/com.ionicframework.voicerecorder/files/json/subjects.json /data/subjects.json

# push folder to device
adb push /data/training_18012017_094021 /storage/emulated/0/AllSpeakVoiceRecorder/audiofiles/alb


#==cordova plugin remove cordova-plugin-audioinput=================================================
# GIT

# Command line instructions
# Git global setup

git config --global user.name "Alberto Inuggi"
git config --global user.email "alberto.inuggi@iit.it"

# Create a new repository

git clone https://gitlab.iit.it/AllSpeak/App.git
cd App
touch README.md
git add README.md
git commit -m "add README"
git push -u origin master

# Existing folder or Git repository
cd .
cd existing_folder
git init
git remote add origin https://gitlab.iit.it/AllSpeak/App.git
git add .
git commit
git commit -m "Initial commit."
git push -u origin master



git add -A
git commit -a -m "My commit message"


git clone https://gitlab.iit.it/AllSpeak/cordova-plugin-audioinput.git

# NETBEANS

http://nbandroid.org/release81/updates/updates.xml 



# EDIT netbeansX/etc/netbeans.conf

netbeans_jdkhome="/usr/lib/jvm/java-8-openjdk-amd64"
export ANDROID_HOME=/data/CODE/android-sdk-linux
export NVM_DIR="/home/$USER/.nvm"
export NODEJS_VERSION=v4.6.2
export NODEJS_PATH=$NVM_DIR/versions/node/$NODEJS_VERSION
#export NODEJS_PATH=$NVM_DIR/$NODEJS_VERSION
export NODEJS_BIN_PATH=$NODEJS_PATH/bin
export CORDOVA_PATH=$NODEJS_PATH/lib/node_modules/cordova/bin
#export ANDROID_STUDIO_PATH=/usr/local/android-studio


PATH=$ANDROID_HOME:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools:${PATH}
PATH=${NODEJS_BIN_PATH}:${PATH}
PATH=${CORDOVA_PATH}:${PATH}

export PATH

#CHROME

sudo sh -c 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list'
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add - 	
sudo apt update
sudo apt install google-chrome-stable




#MEL-BASED cepstra

http://read.pudn.com/downloads81/sourcecode/java/315508/MFCC.java__.htm
https://github.com/dmcennis/jAudioGIT/blob/master/src/org/oc/ocvolume/dsp/featureExtraction.java
https://github.com/filipeuva/SoundBites/blob/master/src/uk/co/biogen/SoundBites/analysis/comirva/MFCC.java




