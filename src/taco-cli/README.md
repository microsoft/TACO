#TACO CLI

The Tools for Apache Cordova – “TACO” to his friends – provide a set of command line utilities that make hybrid app development easier, friendlier, and faster.

## Getting Started
As with all great steps, you need to first do an install:

```sh
npm -g install taco-cli
```
**Note:** On OSX and Linux, you may need to prefix this command with `sudo` 

Once installed, run our executable:
```sh
taco
```
Follow the easy-to-follow instructions to start building your Apache Cordova app.

## Cool Features

 - **100% Cordova CLI Compatible** If you know how to use the Cordova CLI, you already know how to use us!
 - **Easy Guided Help** After each command, our *guided steps* will help show you where to go next
 - **Fast Dependency Acquisition for Android, iOS, and Windows Platforms** We take care of installing and configuring everything properly for each platform so that you can have more time to build your app
 - **Validated Kits** Take the guesswork out of determining whether your plugins, platforms, build tools, and other components work with a particular version of Cordova.

## Build an App in Five-ish Easy Steps
We are going to show you how to build an app for Android, but the steps for Windows and iOS are pretty darn close.

***1. Install the taco-cli executable (in case you haven't already):***

```sh
npm -g install taco-cli
```
***2. Create a new app:***
```sh
taco create myAwesomeApp
```
***2.5. Navigate to the directory of your new project:***
```sh
cd myAwesomeApp
```
***3. Add the Android platform:***
```sh
taco platform add android
```
***3.5. Check for any missing Android dependencies:***
```sh
taco install-reqs android
```
***4. Build for Android:***
```sh
taco build android
```
***5. Run the app on the Android emulator:***
```sh
taco emulate android
```
After a few moments, your app will be running inside the Android emulator in all its awesomeness.

## More Resources
For more information about using TACO, check out the following resources:

- [VS TACO Home Page](https://www.visualstudio.com/en-US/explore/cordova-vs)
- [Documentation](https://msdn.microsoft.com/en-us/library/dn771545.aspx)
- [Known Issues](https://github.com/Microsoft/cordova-docs/blob/master/known-issues/known-issues-general.md)
- [Get Help](http://stackoverflow.com/questions/tagged/visual-studio-cordova)
