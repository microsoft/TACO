
# remotebuild

Secure build server to remotely build, run and debug apps. It sets up a webserver, and handles secure communication/authentication from the client. It loads other modules such as *taco-remote* to provide actual functionality.

***remotebuild*** is an extensible server implementation which can support different project types to build mobile apps. By default, it supports *taco-remote* agent which allows to remotely build, run, and debug iOS apps created using Visual Studio Tools for Apache Cordova.

## Requirements for iOS
To build and run iOS apps on the iOS Simulator or on an iOS device, you must install and configure the remote build, on a Mac computer that meets the following requirements -
1. Mac OS X Mavericks
1. Xcode 6
1. Xcode command-line tools (from Terminal app, use xcode-select --install)
1. Node.js 
1. Git command line tools, if you are using a CLI from a Git repository. If the CLI version is pointed to a Git location, Git is required to build the app for iOS.

You must also have the following:

1. An active iOS Developer Program account with Apple
1. An iOS provisioning profile configured in Xcode (download the provisioning profile and run the downloaded *.cer file). Please read [Maintaining your signing identities and certificates](https://developer.apple.com/library/ios/documentation/IDEs/Conceptual/AppDistributionGuide/MaintainingCertificates/MaintainingCertificates.html) for detailed information.
1. A signing identity configured in Xcode


## Download and install the remote build agent
From the Terminal app on your Mac, type:
```
sudo npm install -g remotebuild
```
The global installation (-g) switch is recommended but not required.

## Start remotebuild in secure mode (default)
```
remotebuild [start]
```

## Start remotebuild in non-secure mode (using simple HTTP based connections)
```
remotebuild --secure false
```

## Generate a new security PIN
```
remotebuild certificates generate
```

## Generate a new server certificate
```
remotebuild certificates reset
When prompted, type "Y" and then type Enter

remotebuild certificates generate
```

## List of all available commands
```
remotebuild --help
```

## Verify remotebuild configuration
1. With the remote build agent running, open a second Terminal app window (choose Shell, New Window).

1. From the second Terminal app window on your Mac, type:
```
remotebuild test [options as passed to first instance of remotebuild]
```
This command initiates a test build. The output from the command should show the build number and other information about the build, such as its progress.

1. To verify that your signing identity is set up correctly for device builds, type:
```
remotebuild test --device
```

## Configure remote build with VS Tools for Apache Cordova
Please refer to [User Documentation](http://aka.ms/Og7gl9) for instructions on how to configure the remote build with Visual Studio Tools for Apache Cordova.

## Known Issues
See [Known issues](http://aka.ms/remotebuildknownissues) for known issues and workarounds.