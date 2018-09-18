# App

App of the AllSpeak project. 
Is an hybrid App developed with Ionic v1, mailny relying on the cordova-plugin-speechrecognition plugin.

It interacts with the https://api.allspeak.eu server to access its tensorflow training routines.
User must be previously enabled (receiving an individual code) to access these features.

The App manages the following aspect:

- register device configuration on the server
- manage several vocabularies (list of commands to be recognized)
- prepare data for training
- records user voice while repeating the commands, both for playbacking them when are recognized and to train the neural net
- use smartphone microphone or a bluetooth headset

