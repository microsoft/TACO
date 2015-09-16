# TACO CLI

The Tools for Apache Cordova (“TACO” for short) provide a set of command line utilities that make hybrid app development easier, friendlier, and faster.

## Getting Started
You need to first do an install of our package:

```sh
npm -g install taco-cli
```
**Note:** On OSX and Linux, you may need to prefix this command with `sudo` 

Once installed, run our executable:
```sh
taco
```
Follow these simple steps to start building your Apache Cordova app.

## Cool Features

 - **100% Cordova CLI Compatible:** If you know how to use the [Cordova CLI](http://cordova.apache.org/docs/en/5.0.0/guide_cli_index.md.html#The%20Command-Line%20Interface), you already know how to use us!
 - **Guided Help:** After each command, our *guided steps* will help show you where to go next
 - **Fast Dependency Acquisition for Android, iOS, and Windows Platforms:** We take care of installing and configuring everything properly for each platform so that you can have more time to build your app
 - **Validated Kits:** Take the guesswork out of determining whether your plugins, platforms, build tools, and other components work with a particular version of Cordova.

## Build an App in Seven Easy Steps
We are going to show you how to build an app for Android, but the steps for Windows and iOS are pretty darn close.

***1. Install the taco-cli package (in case you haven't already):***

```sh
npm -g install taco-cli
```
***2. Create a new app:***
```sh
taco create myAwesomeApp
```
***3. Navigate to the directory of your new project:***
```sh
cd myAwesomeApp
```
***4. Add the Android platform:***
```sh
taco platform add android
```
***5. Check for any missing Android dependencies:***
```sh
taco install-reqs android
```
***6. Build for Android:***
```sh
taco build android
```
***7. Run the app on the Android emulator:***
```sh
taco emulate android
```
After a few moments, your app will be running inside the Android emulator in all its awesomeness.

###For more information about using TACO, check out our [TACO Home Page](http://taco.tools/)

