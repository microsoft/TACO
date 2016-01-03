
# taco-livereload
taco-livereload is a package intended to introduce the livereload functionality to TACO.
it enables developers to have a short feedback loop when editing HTML/CSS/Javascript in a Cordova-based app.

## Known Issues

- 'CTRL + C' does NOT work with cordova-ios (when deploying to a device)
When dealing with cordova-ios(on MAC OSX), it is impossible to use 'CTRL + C' to exit livereload mode, 
due to an issue with the [npm package 'ios-sim'](https://www.npmjs.com/package/ios-deploy) which cordova-ios uses to deploy to iOS-based devices.

